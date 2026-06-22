import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { haikuText, aiErrorMessage } from "@/lib/ai/anthropic";

type Meal = { title: string; emoji: string | null; meal_type: string };

/** Screensaver brief for the wall. The kiosk POSTs its device_secret + local
 *  date; we validate the device, return today's meals, and (if the household has
 *  AI on) a short cached daily brief. Generated at most once per household/day.
 *  The Anthropic key is read + used here server-side only — never sent to the wall. */
export async function POST(req: Request) {
  let body: { device_secret?: string; date?: string; tzOffsetMinutes?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const { device_secret, date } = body;
  if (!device_secret || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ brief: null, meals: [] as Meal[] });
  }

  const { data: pairing } = await admin
    .from("device_pairings")
    .select("household_id")
    .eq("device_secret", device_secret)
    .eq("status", "paired")
    .maybeSingle();
  if (!pairing) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const household_id = pairing.household_id;

  const { data: mealsRows } = await admin
    .from("meals")
    .select("title, emoji, meal_type")
    .eq("household_id", household_id)
    .eq("date", date)
    .is("deleted_at", null)
    .order("sort_order");
  const meals: Meal[] = (mealsRows ?? []).map((m) => ({ title: m.title, emoji: m.emoji, meal_type: m.meal_type }));

  // Already have today's brief (or a claim placeholder)? Serve it — never re-call.
  const { data: existing } = await admin
    .from("ai_briefs")
    .select("brief")
    .eq("household_id", household_id)
    .eq("date", date)
    .maybeSingle();
  if (existing) return NextResponse.json({ brief: existing.brief || null, meals });

  const { data: cfg } = await admin
    .from("ai_config")
    .select("anthropic_api_key, enabled")
    .eq("household_id", household_id)
    .maybeSingle();
  if (!cfg?.anthropic_api_key || !cfg.enabled) {
    return NextResponse.json({ brief: null, meals });
  }

  // Claim today's slot atomically so only ONE request generates (caps spend to
  // once/household/day even across devices, retries, or a failing key).
  const { data: claim } = await admin
    .from("ai_briefs")
    .upsert({ household_id, date, brief: "" }, { onConflict: "household_id,date", ignoreDuplicates: true })
    .select("household_id");
  if (!claim || claim.length === 0) {
    const { data: row } = await admin
      .from("ai_briefs")
      .select("brief")
      .eq("household_id", household_id)
      .eq("date", date)
      .maybeSingle();
    return NextResponse.json({ brief: row?.brief || null, meals });
  }

  // Same-day event window in the household's local timezone (kiosk sends offset).
  const offsetMin = Number.isFinite(body.tzOffsetMinutes) ? (body.tzOffsetMinutes as number) : 0;
  const startMs = new Date(`${date}T00:00:00Z`).getTime() + offsetMin * 60_000;
  const startIso = new Date(startMs).toISOString();
  const endIso = new Date(startMs + 86_400_000).toISOString();
  const [{ data: kids }, { data: events }] = await Promise.all([
    admin.from("children").select("name").eq("household_id", household_id).is("deleted_at", null),
    admin
      .from("events")
      .select("title, starts_at")
      .eq("household_id", household_id)
      .is("deleted_at", null)
      .gte("starts_at", startIso)
      .lt("starts_at", endIso)
      .order("starts_at"),
  ]);

  const kidNames = (kids ?? []).map((k) => k.name).join(", ") || "the family";
  const eventList = (events ?? []).map((e) => e.title).slice(0, 6).join("; ") || "nothing scheduled";
  const dinner = meals.find((m) => m.meal_type === "dinner")?.title ?? meals[0]?.title ?? "not set yet";

  try {
    const brief = await haikuText({
      key: cfg.anthropic_api_key,
      maxTokens: 150,
      system:
        "You are Harbor, a warm, upbeat family wall assistant. Write a short daily brief (max 40 words, 1–2 sentences) for a family's wall display. Be encouraging and concrete. Do NOT start with a greeting like 'Good morning' (the screen already shows one).",
      prompt: `Family kids: ${kidNames}. Today's plans: ${eventList}. Tonight's dinner: ${dinner}. Write today's brief.`,
    });
    // Fill the claimed row (leave it empty on a blank result — we won't re-call today).
    if (brief) {
      await admin.from("ai_briefs").update({ brief }).eq("household_id", household_id).eq("date", date);
    }
    return NextResponse.json({ brief: brief || null, meals });
  } catch (e) {
    // Leave the empty claim so we don't hammer the API today; just return meals.
    return NextResponse.json({ brief: null, meals, note: aiErrorMessage(e) });
  }
}
