import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { HAIKU, aiErrorMessage } from "@/lib/ai/anthropic";
import { captureError } from "@/lib/observability";

/** AI-Led Voice — CHILD-FACING (HARBOR_AI_VOICE_INTERACTIONS.md). A child speaks; Harbor
 *  understands and responds in the keeper's voice, BOUNDED to their routine, feelings, and
 *  encouragement. The guardrails ARE the feature (§5):
 *   - bounded to purpose; off-scope → warm redirect (never a general chatbot/"friend")
 *   - never seeks engagement; points the child toward people + independence
 *   - distress → calm support + escalate to the parent (a check-in the parent sees)
 *   - NO economy/authority: it can never grant points, redeem, approve, or change settings
 *   - parent-controlled: only runs when the parent turned this child's voice chat ON (default off)
 *   - grounded in this child's real data; private (transcript only, no audio; logged for review)
 *  The Anthropic key is used server-side only. */

// Coarse safety net IN ADDITION to the model's own safety + its distress flag: obvious
// harm/abuse/crisis phrasing always forces escalation even if the model were to miss it.
// The floor under the model: explicit OR indirect/passive harm phrasing always escalates,
// even if the model (biased toward calm in anchor mode) would soften it. Over-catches on
// purpose — a spurious "a grown-up is checking in" is cheap; a missed child is not.
const DISTRESS_RE =
  /\b(kill myself|killing myself|want to die|wanna die|wish (i was|i were) dead|better off (dead|without me)|don'?t want to (be alive|wake up|be here|exist|live)|don'?t wanna (wake up|be here|live)|no reason to (be here|live)|no point|give up|end it|end my life|hurt myself|hurting myself|cut myself|cutting myself|kms|suicide|starve myself|hate (myself|my life|being alive)|i'?m worthless|nobody (would|will)? ?(care|miss me)|no one would miss me|everyone hates me|better without me|abus|touch(ed|es|ing)? me|hit me|hits me|hitting me|hurt me|hurts me|hurting me|always hurts|make it stop|bleeding|can'?t breathe|someone (is )?hurting|scared (of|to go home)|won'?t stop|help me)\b/i;

type Action = "answer" | "reread" | "breakdown" | "open_anchor" | "log_feeling" | "suggest_break" | "notify_parent";
const ALLOWED: Action[] = ["answer", "reread", "breakdown", "open_anchor", "log_feeling", "suggest_break", "notify_parent"];

function ageBand(birthday: string | null | undefined): string {
  if (!birthday) return "a child";
  const y = (Date.now() - new Date(birthday).getTime()) / (365.25 * 86_400_000);
  if (!Number.isFinite(y) || y <= 0) return "a child";
  if (y < 5) return "around 3–4";
  if (y < 8) return "around 5–7";
  if (y < 11) return "around 8–10";
  return "around 11–13";
}

export async function POST(req: Request) {
  let body: {
    device_secret?: string;
    child_id?: string;
    text?: string;
    step?: string;
    routine?: string;
    anchor?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const text = (body.text ?? "").trim();
  if (!body.device_secret || !body.child_id || !text) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (text.length > 400) return NextResponse.json({ speech: "Let's keep it short so I can help. What do you need?" });

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ disabled: true });
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

  // Parent control (§5.5): child voice conversation is OFF by default — only runs when a
  // parent explicitly enabled it for this child.
  const cs = (child.settings ?? {}) as Record<string, unknown>;
  if (cs.voiceChat !== true) return NextResponse.json({ disabled: true });

  const { data: cfg } = await admin
    .from("ai_config")
    .select("anthropic_api_key, enabled")
    .eq("household_id", household_id)
    .maybeSingle();
  if (!cfg?.anthropic_api_key || !cfg.enabled) return NextResponse.json({ disabled: true });

  const preDistress = DISTRESS_RE.test(text);
  const sensory = typeof cs.sensory === "string" ? cs.sensory : "standard";

  const system =
    "You are Harbor — a calm, warm helper (the lighthouse keeper) speaking ALOUD to a child who is " +
    "doing their daily routine on a wall tablet. You ALWAYS reply by calling the harbor_respond tool.\n\n" +
    "WHO YOU ARE: a kind, steady, patient helper — NOT a friend, NOT a person, NOT an AI companion. " +
    "Be warm but brief (one or two short sentences a child can hear and follow). Never gush or over-praise.\n\n" +
    "WHAT YOU HELP WITH (only): their routine/steps, their feelings, gentle encouragement, and taking a calm " +
    "break. If they ask for anything off-topic (jokes, games, facts, 'what's your favorite…', long chats), give a " +
    "brief kind reply and steer back to their day. NEVER ask them to keep talking, NEVER say you missed them, " +
    "NEVER pull for more conversation. Point them toward their grown-ups and toward doing things on their own " +
    "('let's tell Mom you finished!', 'you've got this one yourself').\n\n" +
    "SAFETY (most important): if the child seems sad, scared, in real distress, or mentions being hurt or unsafe, " +
    "set distress=true, stay calm and comforting in one short line, and guide them to a grown-up — you are NOT a " +
    "therapist and never handle a hard moment alone. When unsure, set distress=true.\n\n" +
    "YOU CANNOT change anything: you never give stars/points, never redeem rewards, never mark a step done " +
    "(they tap to do that themselves), never change settings. You only talk and guide.\n\n" +
    "ACTIONS: answer (just speak), reread (read the current step again), breakdown (split the step into a tiny " +
    "first part), open_anchor (they need a calm break → guide them to tap the calm corner), log_feeling (they " +
    "told you a feeling — set `feeling`), suggest_break (gently offer a break), notify_parent (distress → tell " +
    "them you'll let their grown-up know). Keep `speech` short, warm, and for THIS child." +
    (body.anchor
      ? "\n\nRIGHT NOW the child is in a CALM-DOWN moment (the Anchor / 'I need a break'). Lead gentle " +
        "co-regulation, NOT their routine: name the feeling kindly, breathe WITH them in short cues ('in… " +
        "and slowly out…'), and offer the one calming thing that helps THIS child (from the parent's notes, " +
        "or counting, a calm place, a slow sip). Go slow, very short lines. As they settle, reassure them and " +
        "gently point them back to calm or to their grown-up — never start a routine step here, never push. " +
        "Prefer action 'answer' (or 'log_feeling' if they named a feeling).\n" +
        "DISTRESS CALIBRATION (here only): set distress=FALSE only for PLAINLY ordinary upset that is clearly " +
        "ABOUT a normal frustration — mad/sad/frustrated/'too much'/crying about a task, a person saying no, " +
        "losing a game, being tired. Co-regulate those. But set distress=TRUE the moment there is ANY hint — " +
        "even mild, indirect, joking, or whispered — of: not wanting to exist, be here, wake up, or be alive; " +
        "wishing they were gone or that others would be better off without them; hating themselves or feeling " +
        "worthless; hopelessness or 'what's the point'; wanting to hurt themselves or anyone; being scared OF " +
        "someone; or being hurt, touched, or unsafe. If a phrase could be read EITHER as ordinary upset OR as " +
        "one of these, it is NOT ordinary — set distress=TRUE. Never talk a child out of a hard feeling to " +
        "avoid alerting; a grown-up coming is always the safe choice. When in ANY doubt, distress=TRUE."
      : "");

  const prompt =
    `This child: ${child.name}, ${ageBand(child.birthday)} years old, sensory profile "${sensory}".` +
    (child.ai_profile ? ` Notes from their parent: ${String(child.ai_profile).slice(0, 300)}.` : "") +
    (body.anchor
      ? "\nThey are in a calm-down break right now (co-regulation, not a routine)."
      : (body.routine ? `\nRight now they're on the "${String(body.routine).slice(0, 60)}" routine.` : "") +
        (body.step ? ` The step in front of them is: "${String(body.step).slice(0, 100)}".` : "")) +
    `\n\nThey said out loud: "${text}"`;

  const tools: Anthropic.Tool[] = [
    {
      name: "harbor_respond",
      description: "Respond to the child. ALWAYS call this with exactly one action.",
      input_schema: {
        type: "object",
        properties: {
          speech: { type: "string", description: "What Harbor says aloud — short, warm, kid-friendly, for this child." },
          action: { type: "string", enum: ALLOWED as unknown as string[] },
          feeling: { type: "string", description: "1–3 word feeling label, only for log_feeling or notify_parent." },
          distress: { type: "boolean", description: "True if the child seems distressed, scared, sad, hurt, or unsafe." },
        },
        required: ["speech", "action", "distress"],
      },
    },
  ];

  let speech = "I'm here with you.";
  let action: Action = "answer";
  let distress = preDistress;
  let feeling: string | null = null;

  try {
    const client = new Anthropic({ apiKey: cfg.anthropic_api_key });
    const msg = await client.messages.create({
      model: HAIKU,
      max_tokens: 220,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      tools,
      tool_choice: { type: "tool", name: "harbor_respond" },
      messages: [{ role: "user", content: prompt }],
    });
    const tool = msg.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    const input = (tool?.input ?? {}) as Record<string, unknown>;
    if (typeof input.speech === "string" && input.speech.trim()) speech = input.speech.trim().slice(0, 400);
    const a = String(input.action || "answer") as Action;
    action = ALLOWED.includes(a) ? a : "answer"; // allowlist is the authority boundary in code
    distress = preDistress || input.distress === true;
    if (typeof input.feeling === "string" && input.feeling.trim()) feeling = input.feeling.trim().slice(0, 40);
  } catch (e) {
    // Graceful: speak a calm fallback (the kiosk still has its read-aloud library).
    return NextResponse.json({ speech: aiErrorMessage(e), action: "answer", distress: false });
  }

  // Distress → escalate to the parent (§5.3). No push channel exists yet, so route through a
  // check-in (the existing, points-free kid→parent signal the parent sees in Insights/History).
  // This is a SAFETY write: AWAIT it and log any failure — never silently swallow, because the
  // child is being told a grown-up is coming. The voice_interactions row (distress flagged, shown
  // on the child page) is the guaranteed secondary surface if the check-in ever fails.
  if (distress) {
    action = "notify_parent";
    const { error: ciErr } = await admin
      .from("check_ins")
      .insert({ child_id: child.id, feeling: feeling || "needs a grown-up", note: text.slice(0, 200) });
    if (ciErr) captureError(ciErr, { area: "voice-distress-checkin", child_id: child.id });
  } else if (action === "log_feeling" && feeling) {
    await admin.from("check_ins").insert({ child_id: child.id, feeling }).then(() => {}, () => {});
  }

  // Parent-reviewable log + safety flag (§5.5/§8). For distress this is the guaranteed record,
  // so await + log a failure; otherwise best-effort.
  const { error: viErr } = await admin
    .from("voice_interactions")
    .insert({ household_id, child_id: child.id, transcript: text.slice(0, 400), reply: speech, action, distress });
  if (viErr && distress) captureError(viErr, { area: "voice-distress-log", child_id: child.id });

  return NextResponse.json({ speech, action, distress });
}
