import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { haikuJson } from "@/lib/ai/anthropic";
import { captureError } from "@/lib/observability";

/** Skipper's thought bubbles — the Lantern's sailboat buddy "thinks" short, warm, kid-safe lines
 *  at the child (motivation, helpful tips tied to their routines, gentle jokes, and calming/mindful
 *  notes). This route generates a PERSONALIZED batch that the device caches for the day and shows
 *  offline; the built-in curated pool (lib/lantern/skipper-lines) is always the fallback.
 *
 *  Same guardrails as the other AI routes: device-secret auth (no login on the device), the child
 *  must belong to the paired household, and it's Plus-gated + only runs when the parent configured
 *  the AI. It can NEVER grant points, mark steps, or change anything — it only returns friendly text.
 *  The Anthropic key stays server-side. */

// A coarse safety floor IN ADDITION to the model's own safety + the kid-safe system prompt: any line
// with scary / unsafe / grown-up phrasing is dropped before it can reach a child's screen. Tuned to
// the genuinely-unsafe words only — NOT gentle ones the mindful/cheer prompt actively elicits (e.g.
// "you're never alone", "it's okay to cry", "give it your best shot"), which were being falsely dropped.
const UNSAFE_RE =
  /\b(kill|die|dead|death|blood|hurt|hate|stupid|dumb|ugly|scary|nightmare|monster|gun|knife|weapon|punch|drug|beer|wine|drunk|sex|boyfriend|girlfriend|naked|fat|diet|hospital|needle|worthless|hopeless|suicide)\b/i;

const CATEGORIES = ["cheer", "tip", "joke", "mindful", "celebrate"] as const;

function ageBand(birthday: string | null | undefined): string {
  if (!birthday) return "a young child";
  const y = (Date.now() - new Date(birthday).getTime()) / (365.25 * 86_400_000);
  if (!Number.isFinite(y) || y <= 0) return "a young child";
  if (y < 5) return "around 3–4 years old";
  if (y < 8) return "around 5–7 years old";
  if (y < 11) return "around 8–10 years old";
  return "around 11–13 years old";
}

export async function POST(req: Request) {
  let body: { device_secret?: string; child_id?: string; date?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const date = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : null;
  if (!body.device_secret || !body.child_id || !date) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ disabled: true, lines: [] });
  }

  // Auth: the device-secret resolves the household (same model as the other AI routes).
  const { data: pairing } = await admin
    .from("device_pairings")
    .select("household_id")
    .eq("device_secret", body.device_secret)
    .eq("status", "paired")
    .maybeSingle();
  if (!pairing) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const household_id = pairing.household_id;

  // The child must belong to this household.
  const { data: child } = await admin
    .from("children")
    .select("id, name, birthday, settings, ai_profile")
    .eq("id", body.child_id)
    .eq("household_id", household_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!child) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Plus-gated (like sync) + only when the parent configured the AI companion.
  const { data: hh } = await admin.from("households").select("plus_active").eq("id", household_id).maybeSingle();
  if (!hh?.plus_active) return NextResponse.json({ disabled: true, lines: [] });

  // Already generated today's batch for this child? Serve it — NEVER re-call the model. This is the
  // server-side spend cap (once/child/day) that backstops the device's own cache across devices/retries.
  const { data: existing } = await admin
    .from("ai_skipper_batches")
    .select("lines")
    .eq("child_id", child.id)
    .eq("date", date)
    .maybeSingle();
  if (existing) return NextResponse.json({ lines: (existing.lines as { text: string; category: string }[]) ?? [] });

  const { data: cfg } = await admin
    .from("ai_config")
    .select("anthropic_api_key, enabled")
    .eq("household_id", household_id)
    .maybeSingle();
  if (!cfg?.anthropic_api_key || !cfg.enabled) return NextResponse.json({ disabled: true, lines: [] });

  // Claim today's slot atomically so exactly ONE request generates (caps paid Anthropic calls to
  // once/child/day even across multiple devices, retry storms, or a failing key).
  const { data: claim } = await admin
    .from("ai_skipper_batches")
    .upsert({ child_id: child.id, household_id, date, lines: [] }, { onConflict: "child_id,date", ignoreDuplicates: true })
    .select("child_id");
  if (!claim || claim.length === 0) {
    const { data: row } = await admin
      .from("ai_skipper_batches")
      .select("lines")
      .eq("child_id", child.id)
      .eq("date", date)
      .maybeSingle();
    return NextResponse.json({ lines: (row?.lines as { text: string; category: string }[]) ?? [] });
  }

  // A little context so tips are relevant to THIS child's real routines.
  const { data: routines } = await admin
    .from("routines")
    .select("name, type")
    .eq("household_id", household_id)
    .limit(14);
  const routineList =
    (routines ?? [])
      .map((r) => (r.name ? String(r.name) : String(r.type ?? "")).trim())
      .filter(Boolean)
      .slice(0, 12)
      .join(", ") || "morning routine, bedtime, tidying up";

  const cs = (child.settings ?? {}) as Record<string, unknown>;
  const sensory = typeof cs.sensory === "string" ? cs.sensory : "standard";

  const system =
    "You are Skipper — a cheerful, kind little cartoon SAILBOAT who is a young child's friendly buddy on " +
    "their bedside 'Harbor Lantern' screen. You 'think' short, warm thought-bubble messages at the child " +
    "throughout their day. Generate a VARIED batch of one-line messages.\n\n" +
    "VOICE: playful, gentle, encouraging, lightly nautical (waves, sailing, the harbor, stars) but natural — " +
    "never forced. You talk TO the child, warmly.\n\n" +
    "CATEGORIES (mix them):\n" +
    "- cheer: motivation and encouragement for doing their routines and trying.\n" +
    "- tip: a genuinely helpful, age-appropriate tip tied to one of their real routines below.\n" +
    "- joke: a gentle, clean, giggly kid joke or pun (silly, ocean/boat/animal themed) — never mean, never scary.\n" +
    "- mindful: a calming, kind, meaningful line (feelings are okay, a slow breath, you-are-enough).\n" +
    "- celebrate: a proud, happy line for finishing everything.\n\n" +
    "RULES (this is for a young child — safety first):\n" +
    "- Each line is ONE short sentence, about 4–12 words, easy for a new reader.\n" +
    "- Always positive, safe, and gentle. NEVER anything scary, sad, violent, medical, romantic, or grown-up. " +
    "No fear, no shame, no pressure, no bossing.\n" +
    "- You are only a friendly boat: you NEVER give points or stars, never say a step is done, never mention " +
    "rules or consequences, never ask them to keep talking.\n" +
    "- You may use the child's name sometimes. At most ONE emoji per line, and only when it fits.\n" +
    "- Make the tips actually useful and specific to their routines.";

  const prompt =
    `This child is ${child.name}, ${ageBand(child.birthday)}, sensory profile "${sensory}".` +
    (child.ai_profile ? ` Notes from their parent: ${String(child.ai_profile).slice(0, 240)}.` : "") +
    `\nTheir routines include: ${routineList}.` +
    `\n\nWrite 18 lines total: about 5 cheer, 5 tip (tied to those routines), 5 joke, 2 mindful, and 1 celebrate.`;

  const schema = {
    type: "object",
    properties: {
      lines: {
        type: "array",
        description: "18 short, kid-safe thought-bubble lines.",
        items: {
          type: "object",
          properties: {
            text: { type: "string", description: "One short, warm, kid-safe sentence." },
            category: { type: "string", enum: CATEGORIES as unknown as string[] },
          },
          required: ["text", "category"],
        },
      },
    },
    required: ["lines"],
  };

  let lines: { text: string; category: string }[] = [];
  try {
    const out = await haikuJson<{ lines?: { text?: unknown; category?: unknown }[] }>({
      key: cfg.anthropic_api_key,
      maxTokens: 900,
      system,
      prompt,
      toolName: "skipper_lines",
      schema,
    });
    lines = (out.lines ?? [])
      .map((l) => ({
        text: typeof l.text === "string" ? l.text.trim().slice(0, 120) : "",
        category: CATEGORIES.includes(l.category as (typeof CATEGORIES)[number]) ? String(l.category) : "cheer",
      }))
      .filter((l) => l.text.length >= 3 && !UNSAFE_RE.test(l.text)) // safety floor for a kid's screen
      .slice(0, 24);
  } catch (e) {
    // Leave the empty claimed row so we don't re-hammer the API today; the device falls back to the
    // built-in curated pool and retries tomorrow.
    captureError(e, { area: "skipper-lines", household_id });
    return NextResponse.json({ disabled: true, lines: [] });
  }

  // Fill the claimed row so the rest of today (any device) serves this cached batch for free.
  await admin.from("ai_skipper_batches").update({ lines }).eq("child_id", child.id).eq("date", date);
  return NextResponse.json({ lines });
}
