"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getMyHousehold } from "@/lib/household";
import { pushToGoogle } from "@/lib/google/sync";
import { tzFromSettings, dayKeyInTz, wallTimeToUtcMs } from "@/lib/tz";

// The quick actions behind Today and the "+" menu. Every one RETURNS an honest result —
// `{ ok: true, message }` for the success toast or `{ ok: false, error }` in plain words — so
// ActionForm/useQuickAction can show exactly what happened and never wipe the page. Writes that
// the wall shows ride the <1s broadcast (reward_log / wall_commands / list_items / …).

export type QuickResult = { ok: true; message?: string } | { ok: false; error: string };

const clip = (v: unknown, max: number): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, max) : null;
};
const clampInt = (v: unknown, lo: number, hi: number): number => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : 0;
};
const fdStr = (fd: FormData, k: string, max = 200) => clip(fd.get(k), max);

async function ctx() {
  const profile = await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household found.");
  const supabase = await createClient();
  const tz = tzFromSettings((household.settings ?? {}) as Record<string, unknown>);
  return { profile, household, supabase, tz };
}

function touchToday(extra?: string) {
  revalidatePath("/app");
  if (extra) revalidatePath(extra);
}

// ── Stars ────────────────────────────────────────────────────────────────────
export async function giveStars(input: {
  childId: string;
  delta: number;
  reason?: string;
  celebrate?: boolean;
}): Promise<QuickResult> {
  const { household, supabase, profile } = await ctx();
  const delta = clampInt(input.delta, -100, 100);
  if (!input.childId || delta === 0) return { ok: false, error: "Pick how many stars to give." };
  const { data: kid } = await supabase
    .from("children")
    .select("name")
    .eq("id", input.childId)
    .eq("household_id", household.id)
    .maybeSingle();
  if (!kid) return { ok: false, error: "That child isn't in your family." };

  const reason = clip(input.reason, 80) ?? (delta > 0 ? "Grown-up bonus" : "Grown-up adjustment");
  const { error } = await supabase.rpc("rpc_parent_adjust_points", {
    p_child: input.childId,
    p_delta: delta,
    p_reason: `adjust:${reason}`,
  });
  if (error) return { ok: false, error: "Couldn't update stars. Try again." };

  if (delta > 0 && input.celebrate !== false) {
    await supabase.from("wall_commands").insert({
      household_id: household.id,
      child_id: input.childId,
      kind: "praise",
      body: reason,
      emoji: "⭐",
      payload: { stars: delta } as never,
      created_by: profile.id,
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    });
  }
  touchToday(`/app/children/${input.childId}`);
  const n = Math.abs(delta);
  return { ok: true, message: delta > 0 ? `+${n} ${n === 1 ? "star" : "stars"} for ${kid.name}` : `Took ${n} ${n === 1 ? "star" : "stars"} from ${kid.name}` };
}

// ── Send something to the wall ───────────────────────────────────────────────
/** One composer for both kinds of wall message: "pop" = shows up big right now (then goes),
 *  "pin" = stays on the wall's message board. child_id "" = the whole family. */
export async function sendToWall(formData: FormData): Promise<QuickResult> {
  const { household, supabase, profile } = await ctx();
  const body = fdStr(formData, "body", 200);
  if (!body) return { ok: false, error: "Write a message first." };
  const childId = fdStr(formData, "child_id", 64);
  const emoji = fdStr(formData, "emoji", 8) ?? "💬";
  const mode = formData.get("mode") === "pin" ? "pin" : "pop";

  if (mode === "pop") {
    const { error } = await supabase.from("wall_commands").insert({
      household_id: household.id,
      child_id: childId,
      kind: "note",
      body,
      emoji,
      created_by: profile.id,
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    });
    if (error) return { ok: false, error: "Couldn't send that. Try again." };
  } else {
    const { error } = await supabase.from("wall_messages").insert({
      household_id: household.id,
      child_id: childId,
      body,
      emoji,
      author_label: profile.full_name?.split(" ")[0] ?? null,
      pinned: true,
      bonus_points: 0,
    });
    if (error) return { ok: false, error: "Couldn't pin that. Try again." };
    revalidatePath("/app/messages");
  }
  touchToday();
  return { ok: true, message: mode === "pop" ? "Sent — it's on the wall now" : "Pinned to the wall" };
}

/** A gentle breathing moment on a child's wall/bedside screen, started from your phone. */
export async function calmBreath(input: { childId: string | null }): Promise<QuickResult> {
  const { household, supabase, profile } = await ctx();
  const { error } = await supabase.from("wall_commands").insert({
    household_id: household.id,
    child_id: input.childId,
    kind: "calm",
    body: "Let's take a calm breath together",
    emoji: "🌬️",
    created_by: profile.id,
    expires_at: new Date(Date.now() + 2 * 60_000).toISOString(),
  });
  if (error) return { ok: false, error: "Couldn't reach the wall. Try again." };
  return { ok: true, message: "Calm breath started on the wall" };
}

// ── Medicine ─────────────────────────────────────────────────────────────────
const doseOpId = (medicationId: string, day: string, time: string) => `med:${medicationId}:${day}:${time}`;

/** Log a dose as given from the phone. Uses the wall's own op id, so if the wall logged it
 *  too, it's one record — never a double dose. */
export async function markDoseGiven(input: { medicationId: string; childId: string; time: string }): Promise<QuickResult> {
  const { household, supabase, tz } = await ctx();
  const day = dayKeyInTz(new Date(), tz);
  const { error } = await supabase.from("medication_logs").upsert(
    {
      household_id: household.id,
      child_id: input.childId,
      medication_id: input.medicationId,
      dose_date: day,
      dose_time: input.time,
      status: "taken",
      confirmed_by: "parent",
      client_op_id: doseOpId(input.medicationId, day, input.time),
      taken_at: new Date().toISOString(),
    },
    { onConflict: "client_op_id", ignoreDuplicates: true },
  );
  if (error) return { ok: false, error: "Couldn't log that dose. Try again." };
  touchToday("/app/medication");
  return { ok: true, message: "Marked as given" };
}

export async function undoDoseGiven(input: { medicationId: string; time: string }): Promise<QuickResult> {
  const { supabase, tz } = await ctx();
  const day = dayKeyInTz(new Date(), tz);
  const { error } = await supabase
    .from("medication_logs")
    .delete()
    .eq("client_op_id", doseOpId(input.medicationId, day, input.time))
    .eq("confirmed_by", "parent");
  if (error) return { ok: false, error: "Couldn't undo that." };
  touchToday("/app/medication");
  return { ok: true, message: "Undone" };
}

// ── Reminders / to-dos ───────────────────────────────────────────────────────
export async function completeReminder(id: string): Promise<QuickResult> {
  const { supabase } = await ctx();
  const { error } = await supabase.from("reminders").update({ done: true }).eq("id", id);
  if (error) return { ok: false, error: "Couldn't check that off." };
  touchToday("/app/calendar");
  return { ok: true, message: "Done ✓" };
}

export async function reopenReminder(id: string): Promise<QuickResult> {
  const { supabase } = await ctx();
  const { error } = await supabase.from("reminders").update({ done: false }).eq("id", id);
  if (error) return { ok: false, error: "Couldn't undo that." };
  touchToday("/app/calendar");
  return { ok: true, message: "Undone" };
}

export async function snoozeReminder(id: string): Promise<QuickResult> {
  const { supabase, tz } = await ctx();
  const tomorrow = dayKeyInTz(new Date(Date.now() + 86_400_000), tz);
  const { error } = await supabase.from("reminders").update({ snoozed_until: tomorrow }).eq("id", id);
  if (error) return { ok: false, error: "Couldn't snooze that." };
  touchToday("/app/calendar");
  return { ok: true, message: "Moved to tomorrow" };
}

// ── "+" quick adds ───────────────────────────────────────────────────────────
export async function quickAddEvent(formData: FormData): Promise<QuickResult> {
  const { household, supabase, tz } = await ctx();
  const title = fdStr(formData, "title", 120);
  if (!title) return { ok: false, error: "Give the event a name." };
  const date = fdStr(formData, "date", 10) ?? dayKeyInTz(new Date(), tz);
  const time = fdStr(formData, "time", 5);
  const allDay = !time;
  const ms = wallTimeToUtcMs(`${date}T${time ?? "00:00"}`, tz);
  if (!Number.isFinite(ms)) return { ok: false, error: "That date doesn't look right." };
  const repeat = fdStr(formData, "repeat", 20);
  const { error } = await supabase.from("events").insert({
    household_id: household.id,
    title,
    emoji: fdStr(formData, "emoji", 8),
    starts_at: new Date(ms).toISOString(),
    all_day: allDay,
    child_id: fdStr(formData, "child_id", 64),
    recurrence_rule: repeat && ["daily", "weekdays", "weekly"].includes(repeat) ? repeat : null,
    location: fdStr(formData, "location", 120),
  });
  if (error) return { ok: false, error: "Couldn't add that event. Try again." };
  try {
    await pushToGoogle(supabase, household.id); // best-effort two-way sync
  } catch {
    /* calendar sync is additive — never block adding an event */
  }
  touchToday("/app/calendar");
  return { ok: true, message: "Added to the calendar" };
}

export async function quickAddTodo(formData: FormData): Promise<QuickResult> {
  const { household, supabase, tz } = await ctx();
  const title = fdStr(formData, "title", 120);
  if (!title) return { ok: false, error: "What do you need to remember?" };
  const { error } = await supabase.from("reminders").insert({
    household_id: household.id,
    title,
    due_date: fdStr(formData, "due_date", 10) ?? dayKeyInTz(new Date(), tz),
    child_id: fdStr(formData, "child_id", 64),
  });
  if (error) return { ok: false, error: "Couldn't add that to-do. Try again." };
  touchToday("/app/calendar");
  return { ok: true, message: "To-do added" };
}

export async function quickAddGrocery(formData: FormData): Promise<QuickResult> {
  const { household, supabase } = await ctx();
  const names = String(formData.get("name") ?? "")
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
  if (!names.length) return { ok: false, error: "Type what you need." };
  const { error } = await supabase.from("list_items").insert(
    names.map((name) => ({
      household_id: household.id,
      name: name.slice(0, 80),
      list_kind: "grocery",
      added_by_label: "Phone",
    })),
  );
  if (error) return { ok: false, error: "Couldn't add that. Try again." };
  touchToday("/app/lists");
  return { ok: true, message: names.length === 1 ? `Added ${names[0]}` : `Added ${names.length} items` };
}

/** A chore for one kid — or several (picking more than one makes it take turns weekly). */
export async function quickAddChore(formData: FormData): Promise<QuickResult> {
  const { household, supabase } = await ctx();
  const title = fdStr(formData, "title", 80);
  if (!title) return { ok: false, error: "Give the chore a name." };
  const ids = Array.from(new Set(formData.getAll("child_ids").map(String).filter(Boolean)));
  if (!ids.length) return { ok: false, error: "Pick who does it." };
  const { data: kids } = await supabase.from("children").select("id").eq("household_id", household.id).in("id", ids).is("deleted_at", null);
  const valid = (kids ?? []).map((k) => k.id);
  if (!valid.length) return { ok: false, error: "Pick who does it." };
  const days = formData
    .getAll("days")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  const days_of_week = days.length === 0 || days.length === 7 ? null : Array.from(new Set(days)).sort();
  const { data: last } = await supabase
    .from("chores")
    .select("sort_order")
    .eq("child_id", valid[0])
    .order("sort_order", { ascending: false })
    .limit(1);
  const { error } = await supabase.from("chores").insert({
    household_id: household.id,
    child_id: valid[0],
    title,
    icon: fdStr(formData, "icon", 8) ?? "✅",
    points: clampInt(formData.get("points"), 0, 100),
    days_of_week,
    rotation_member_ids: valid.length >= 2 ? valid : null,
    requires_approval: false,
    sort_order: ((last?.[0]?.sort_order as number) ?? -1) + 1,
  });
  if (error) return { ok: false, error: "Couldn't add that chore. Try again." };
  touchToday();
  for (const id of valid) revalidatePath(`/app/children/${id}`);
  return { ok: true, message: valid.length >= 2 ? "Chore added — they'll take turns" : "Chore added" };
}
