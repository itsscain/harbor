"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getMyHousehold } from "@/lib/household";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushToGoogle, deleteGoogleEvent } from "@/lib/google/sync";
import { tzFromSettings, wallTimeToUtcMs } from "@/lib/tz";

// Edit/delete/undo for the Plan tab (events, reminders, meals) and the shared lists. Every action
// RETURNS an honest result for the toast; deletes are soft so Undo can bring things back.

export type PlanResult = { ok: true; message?: string; ids?: string[] } | { ok: false; error: string };

const clip = (v: unknown, max: number): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, max) : null;
};
const dateKey = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};
const hhmm = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return /^\d{2}:\d{2}$/.test(s) ? s : null;
};
const REPEATS = ["daily", "weekdays", "weekly"];
const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"];
const LIST_KINDS = ["grocery", "todo"];

async function ctx() {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household found.");
  const supabase = await createClient();
  const tz = tzFromSettings((household.settings ?? {}) as Record<string, unknown>);
  return { household, supabase, tz };
}

function touch(...paths: string[]) {
  revalidatePath("/app");
  revalidatePath("/app/plan");
  for (const p of paths) revalidatePath(p);
}

/** Cached screensaver briefs mention events — drop them so an edit can't linger there. */
async function invalidateBriefs(householdId: string) {
  try {
    await createAdminClient().from("ai_briefs").delete().eq("household_id", householdId);
  } catch {
    /* keyless/offline — refreshes tomorrow */
  }
}

async function validKid(supabase: Awaited<ReturnType<typeof createClient>>, householdId: string, id: string | null) {
  if (!id) return null;
  const { data } = await supabase.from("children").select("id").eq("id", id).eq("household_id", householdId).maybeSingle();
  return data?.id ?? null;
}

// ── Events ───────────────────────────────────────────────────────────────────
export async function saveEvent(id: string, formData: FormData): Promise<PlanResult> {
  const { household, supabase, tz } = await ctx();
  const title = clip(formData.get("title"), 120);
  if (!title) return { ok: false, error: "Give the event a name." };
  const date = dateKey(formData.get("date"));
  if (!date) return { ok: false, error: "Pick a day." };
  const time = hhmm(formData.get("time"));
  const ms = wallTimeToUtcMs(`${date}T${time ?? "00:00"}`, tz);
  if (!Number.isFinite(ms)) return { ok: false, error: "That date doesn't look right." };
  const repeat = clip(formData.get("repeat"), 20);
  const { data: before } = await supabase
    .from("events")
    .select("title, starts_at, all_day, location, google_event_id")
    .eq("id", id)
    .eq("household_id", household.id)
    .maybeSingle();
  if (!before) return { ok: false, error: "That event isn't there anymore." };
  const next = {
    title,
    emoji: clip(formData.get("emoji"), 8),
    starts_at: new Date(ms).toISOString(),
    all_day: !time,
    child_id: await validKid(supabase, household.id, clip(formData.get("child_id"), 64)),
    recurrence_rule: repeat && REPEATS.includes(repeat) ? repeat : null,
    location: clip(formData.get("location"), 120),
    is_countdown: formData.get("countdown") === "on",
  };
  const { error } = await supabase.from("events").update(next).eq("id", id);
  if (error) return { ok: false, error: "Couldn't save that event. Try again." };

  // Google only learns about NEW events, so an edited linked event is replaced there.
  const changed =
    before.title !== next.title || before.starts_at !== next.starts_at || before.all_day !== next.all_day || before.location !== next.location;
  if (before.google_event_id && changed) {
    try {
      await deleteGoogleEvent(supabase, household.id, before.google_event_id);
      await supabase.from("events").update({ google_event_id: null }).eq("id", id);
      await pushToGoogle(supabase, household.id);
    } catch {
      /* calendar sync is best-effort */
    }
  }
  await invalidateBriefs(household.id);
  touch();
  return { ok: true, message: "Event saved" };
}

export async function deleteEventSoft(id: string): Promise<PlanResult> {
  const { household, supabase } = await ctx();
  const { data, error } = await supabase
    .from("events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("household_id", household.id)
    .select("google_event_id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Couldn't delete that event." };
  if (data.google_event_id) {
    try {
      await deleteGoogleEvent(supabase, household.id, data.google_event_id);
      await supabase.from("events").update({ google_event_id: null }).eq("id", id);
    } catch {
      /* best-effort */
    }
  }
  await invalidateBriefs(household.id);
  touch();
  return { ok: true, message: "Event deleted" };
}

export async function restoreEvent(id: string): Promise<PlanResult> {
  const { household, supabase } = await ctx();
  const { error } = await supabase.from("events").update({ deleted_at: null }).eq("id", id).eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't bring it back." };
  try {
    await pushToGoogle(supabase, household.id); // re-creates the Google copy if connected
  } catch {
    /* best-effort */
  }
  await invalidateBriefs(household.id);
  touch();
  return { ok: true, message: "Restored" };
}

// ── Reminders ────────────────────────────────────────────────────────────────
export async function saveReminder(id: string, formData: FormData): Promise<PlanResult> {
  const { household, supabase } = await ctx();
  const title = clip(formData.get("title"), 120);
  if (!title) return { ok: false, error: "What should we remind you about?" };
  const due = dateKey(formData.get("due_date"));
  if (!due) return { ok: false, error: "Pick a day." };
  const { error } = await supabase
    .from("reminders")
    .update({ title, due_date: due, snoozed_until: null, child_id: await validKid(supabase, household.id, clip(formData.get("child_id"), 64)) })
    .eq("id", id)
    .eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't save that reminder." };
  touch();
  return { ok: true, message: "Reminder saved" };
}

export async function deleteReminderSoft(id: string): Promise<PlanResult> {
  const { household, supabase } = await ctx();
  const { error } = await supabase.from("reminders").update({ deleted_at: new Date().toISOString() }).eq("id", id).eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't delete that reminder." };
  touch();
  return { ok: true, message: "Reminder deleted" };
}

export async function restoreReminder(id: string): Promise<PlanResult> {
  const { household, supabase } = await ctx();
  const { error } = await supabase.from("reminders").update({ deleted_at: null }).eq("id", id).eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't bring it back." };
  touch();
  return { ok: true, message: "Restored" };
}

// ── Meals ────────────────────────────────────────────────────────────────────
/** Add (no id) or update a meal. Dinner is the default — most families only plan dinners. */
export async function saveMeal(id: string | null, formData: FormData): Promise<PlanResult> {
  const { household, supabase } = await ctx();
  const title = clip(formData.get("title"), 80);
  if (!title) return { ok: false, error: "What's for dinner?" };
  const date = dateKey(formData.get("date"));
  if (!date) return { ok: false, error: "Pick a day." };
  const type = clip(formData.get("meal_type"), 12) ?? "dinner";
  const row = {
    title,
    date,
    emoji: clip(formData.get("emoji"), 8),
    meal_type: MEAL_TYPES.includes(type) ? type : "dinner",
    notes: clip(formData.get("notes"), 200),
  };
  const { error } = id
    ? await supabase.from("meals").update(row).eq("id", id).eq("household_id", household.id)
    : await supabase.from("meals").insert({ ...row, household_id: household.id });
  if (error) return { ok: false, error: "Couldn't save that meal." };
  touch();
  return { ok: true, message: id ? "Meal saved" : `${title} is on the menu` };
}

export async function deleteMealSoft(id: string): Promise<PlanResult> {
  const { household, supabase } = await ctx();
  const { error } = await supabase.from("meals").update({ deleted_at: new Date().toISOString() }).eq("id", id).eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't remove that meal." };
  touch();
  return { ok: true, message: "Meal removed" };
}

export async function restoreMeal(id: string): Promise<PlanResult> {
  const { household, supabase } = await ctx();
  const { error } = await supabase.from("meals").update({ deleted_at: null }).eq("id", id).eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't bring it back." };
  touch();
  return { ok: true, message: "Restored" };
}

// ── Shared lists (the wall's Groceries + To-do) ──────────────────────────────
export async function addListItems(kind: string, text: string): Promise<PlanResult> {
  const { household, supabase } = await ctx();
  const list_kind = LIST_KINDS.includes(kind) ? kind : "grocery";
  const names = text
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
  if (!names.length) return { ok: false, error: "Type something to add." };
  const { data, error } = await supabase
    .from("list_items")
    .insert(names.map((name) => ({ household_id: household.id, name: name.slice(0, 80), list_kind, added_by_label: "Phone" })))
    .select("id");
  if (error) return { ok: false, error: "Couldn't add that. Try again." };
  revalidatePath("/app/lists");
  return { ok: true, ids: (data ?? []).map((d) => d.id), message: names.length === 1 ? `Added ${names[0]}` : `Added ${names.length} items` };
}

export async function setListItemChecked(id: string, checked: boolean): Promise<PlanResult> {
  const { household, supabase } = await ctx();
  const { error } = await supabase.from("list_items").update({ checked }).eq("id", id).eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't update that." };
  revalidatePath("/app/lists");
  return { ok: true };
}

export async function renameListItem(id: string, name: string): Promise<PlanResult> {
  const { household, supabase } = await ctx();
  const n = clip(name, 80);
  if (!n) return { ok: false, error: "It needs a name." };
  const { error } = await supabase.from("list_items").update({ name: n }).eq("id", id).eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't rename that." };
  revalidatePath("/app/lists");
  return { ok: true, message: "Saved" };
}

export async function deleteListItems(ids: string[]): Promise<PlanResult> {
  const { household, supabase } = await ctx();
  if (!ids.length) return { ok: true };
  const { error } = await supabase
    .from("list_items")
    .update({ deleted_at: new Date().toISOString() })
    .in("id", ids.slice(0, 200))
    .eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't remove that." };
  revalidatePath("/app/lists");
  return { ok: true, message: ids.length === 1 ? "Removed" : `Removed ${ids.length} items` };
}

export async function restoreListItems(ids: string[]): Promise<PlanResult> {
  const { household, supabase } = await ctx();
  const { error } = await supabase.from("list_items").update({ deleted_at: null }).in("id", ids.slice(0, 200)).eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't bring them back." };
  revalidatePath("/app/lists");
  return { ok: true, message: "Restored" };
}
