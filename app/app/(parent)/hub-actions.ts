"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getMyHousehold } from "@/lib/household";
import { getHouseholdAi, haikuJson, haikuText, aiErrorMessage } from "@/lib/ai/anthropic";
import { planDinners } from "@/lib/ai/mealPlan";
import { buildCornerPlan, buildCornerReport, sanitizeCornerPlan, type CornerPlan } from "@/lib/ai/corner";
import { extractFromCapture, isCaptureImageType, type CaptureResult } from "@/lib/ai/capture";
import { pushToGoogle, deleteGoogleEvent } from "@/lib/google/sync";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/database.types";

/** Drop cached AI briefs for a household so the screensaver brief regenerates
 *  fresh — call after changing data the brief talks about (e.g. events), so a
 *  deleted event can't linger in today's summary. Best-effort (keyless-safe). */
async function invalidateBriefs(household_id: string) {
  try {
    await createAdminClient().from("ai_briefs").delete().eq("household_id", household_id);
  } catch {
    /* no service key / offline — the brief still refreshes next day */
  }
}

function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}
function int(v: FormDataEntryValue | null, fb = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fb;
}
function nowIso() {
  return new Date().toISOString();
}

async function myHouseholdId(): Promise<string> {
  const h = await getMyHousehold();
  if (!h) throw new Error("No household found.");
  return h.id;
}

// ── Calendar events ──────────────────────────────────────────────────────────
export async function addEvent(formData: FormData) {
  await requireUser();
  const household_id = await myHouseholdId();
  const supabase = await createClient();
  const allDay = formData.get("all_day") === "on";
  // Prefer the browser-computed absolute instant (correct timezone); fall back to
  // the raw datetime-local only if JS is off (parsed in the server's UTC zone).
  const dtIso = str(formData.get("starts_at_iso"));
  const dt = str(formData.get("starts_at"));
  const starts_at = dtIso || (dt ? new Date(dt).toISOString() : nowIso());
  const { error } = await supabase.from("events").insert({
    household_id,
    title: String(formData.get("title") || "Event"),
    emoji: str(formData.get("emoji")),
    location: str(formData.get("location")),
    starts_at,
    all_day: allDay,
    is_countdown: formData.get("is_countdown") === "on",
    person_label: str(formData.get("person_label")),
    color: str(formData.get("color")),
    recurrence_rule: str(formData.get("recurrence_rule")),
    child_id: str(formData.get("child_id")),
  });
  if (error) throw new Error(error.message);
  await invalidateBriefs(household_id);
  // Two-way sync: push the new event up to Google (best-effort; no-op if not connected).
  try {
    await pushToGoogle(supabase, household_id);
  } catch (e) {
    // Sync is additive — never block adding an event; log for visibility.
    console.error("Google push failed after addEvent:", e);
  }
  revalidatePath("/app/calendar");
}

export async function deleteEvent(id: string) {
  await requireUser();
  const supabase = await createClient();
  // Keep the core delete independent of the google_event_id column so it works
  // even before migration 0031 is applied.
  const { data: ev, error } = await supabase
    .from("events")
    .update({ deleted_at: nowIso() })
    .eq("id", id)
    .select("household_id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (ev?.household_id) await invalidateBriefs(ev.household_id);
  // Mirror the deletion to Google if this event was synced (tolerant of the
  // column/table not existing yet — never blocks the delete).
  if (ev?.household_id) {
    try {
      const { data: g } = await supabase.from("events").select("google_event_id").eq("id", id).maybeSingle();
      if (g?.google_event_id) await deleteGoogleEvent(supabase, ev.household_id, g.google_event_id);
    } catch {
      /* best-effort */
    }
  }
  revalidatePath("/app/calendar");
}

/** Disconnect Google Calendar — removes the stored tokens for this household. */
export async function disconnectGoogle() {
  await requireUser();
  const household_id = await myHouseholdId();
  const supabase = await createClient();
  // Clear the Google links so a future reconnect re-syncs cleanly (no orphan ids).
  try {
    await supabase.from("events").update({ google_event_id: null }).eq("household_id", household_id).not("google_event_id", "is", null);
  } catch {
    /* column may not exist pre-migration */
  }
  await supabase.from("google_calendar").delete().eq("household_id", household_id);
  revalidatePath("/app/settings");
}

// ── Reminders ────────────────────────────────────────────────────────────────
export async function addReminder(formData: FormData) {
  await requireUser();
  const household_id = await myHouseholdId();
  const supabase = await createClient();
  const { error } = await supabase.from("reminders").insert({
    household_id,
    title: String(formData.get("title") || "Reminder"),
    due_date: str(formData.get("due_date")) ?? new Date().toISOString().slice(0, 10),
    child_id: str(formData.get("child_id")),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/app/calendar");
}

export async function deleteReminder(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("reminders")
    .update({ deleted_at: nowIso() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/calendar");
}

// ── Shared lists ─────────────────────────────────────────────────────────────
export async function addListItemParent(formData: FormData) {
  await requireUser();
  const household_id = await myHouseholdId();
  const supabase = await createClient();
  const { error } = await supabase.from("list_items").insert({
    household_id,
    name: String(formData.get("name") || "Item"),
    category: str(formData.get("category")),
    list_kind: str(formData.get("list_kind")) ?? "grocery",
    added_by_label: "Phone",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/app/lists");
}

export async function toggleListItem(id: string, checked: boolean) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("list_items").update({ checked }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/lists");
}

export async function clearCheckedItems() {
  await requireUser();
  const household_id = await myHouseholdId();
  const supabase = await createClient();
  const { error } = await supabase
    .from("list_items")
    .update({ deleted_at: nowIso() })
    .eq("household_id", household_id)
    .eq("checked", true)
    .is("deleted_at", null);
  if (error) throw new Error(error.message);
  revalidatePath("/app/lists");
}

// ── Reward store ─────────────────────────────────────────────────────────────
export async function addStoreItem(formData: FormData) {
  await requireUser();
  const household_id = await myHouseholdId();
  const supabase = await createClient();
  const { error } = await supabase.from("store_items").insert({
    household_id,
    label: String(formData.get("label") || "Reward"),
    emoji: str(formData.get("emoji")),
    cost_points: Math.max(0, int(formData.get("cost_points"))),
    kind: str(formData.get("kind")) ?? "reward",
    child_id: str(formData.get("child_id")),
    sort_order: int(formData.get("sort_order"), 50),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/app/store");
}

export async function updateStoreItem(id: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("store_items")
    .update({
      label: String(formData.get("label") || ""),
      emoji: str(formData.get("emoji")),
      cost_points: Math.max(0, int(formData.get("cost_points"))),
      kind: str(formData.get("kind")) ?? "reward",
      enabled: formData.get("enabled") === "on",
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/store");
}

export async function deleteStoreItem(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("store_items")
    .update({ deleted_at: nowIso() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/store");
}

// ── Meals (weekly meal planner; read-only on the wall) ───────────────────────
export async function addMeal(formData: FormData) {
  await requireUser();
  const household_id = await myHouseholdId();
  const supabase = await createClient();
  const { error } = await supabase.from("meals").insert({
    household_id,
    date: str(formData.get("date")) ?? new Date().toISOString().slice(0, 10),
    meal_type: str(formData.get("meal_type")) ?? "dinner",
    title: String(formData.get("title") || "Dinner"),
    emoji: str(formData.get("emoji")),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/app/meals");
}

export async function deleteMeal(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("meals")
    .update({ deleted_at: nowIso() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/meals");
}

// ── Grounding / Reset days ───────────────────────────────────────────────────
/** Parse a JSON string[] from a form field into a clean, capped list (or null). */
function strList(v: FormDataEntryValue | null): string[] | null {
  if (typeof v !== "string" || !v) return null;
  try {
    const parsed: unknown = JSON.parse(v);
    if (!Array.isArray(parsed)) return null;
    const out = parsed
      .filter((x): x is string => typeof x === "string")
      .map((x) => x.trim().slice(0, 30))
      .filter(Boolean)
      .slice(0, 12);
    return out.length ? out : null;
  } catch {
    return null;
  }
}

/** Add days to a YYYY-MM-DD date string (UTC math → no timezone drift). */
function addDaysStr(startStr: string, n: number): string {
  const [y, m, d] = startStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}

export async function startGrounding(childId: string, formData: FormData) {
  await requireUser();
  const household_id = await myHouseholdId();
  const supabase = await createClient();
  const days = Math.min(60, Math.max(1, int(formData.get("days"), 3)));
  const started_on = str(formData.get("started_on")) ?? new Date().toISOString().slice(0, 10);
  const ends_on = addDaysStr(started_on, days - 1);
  // One active grounding per child — close any existing first.
  await supabase.from("groundings").update({ status: "ended" }).eq("child_id", childId).eq("status", "active");
  const { error } = await supabase.from("groundings").insert({
    household_id,
    child_id: childId,
    reason: str(formData.get("reason")),
    note: str(formData.get("note")),
    started_on,
    ends_on,
    pause_rewards: formData.get("pause_rewards") === "on",
    pause_screen_time: formData.get("pause_screen_time") === "on",
    privileges_lost: strList(formData.get("privileges")),
    status: "active",
  });
  // 23505 = the one-active-per-child unique index fired on a concurrent double-fire;
  // an active grounding already exists, so treat it as a successful no-op.
  if (error && error.code !== "23505") throw new Error(error.message);
  revalidatePath(`/app/children/${childId}`);
}

/** Shorten ("earn a day back", delta -1) or extend (+1). Ends it if it would go past the start. */
export async function adjustGrounding(id: string, childId: string, delta: number) {
  await requireUser();
  const supabase = await createClient();
  const { data: g } = await supabase
    .from("groundings")
    .select("started_on, ends_on")
    .eq("id", id)
    .maybeSingle();
  if (!g) return;
  const newEnd = addDaysStr(g.ends_on, delta);
  if (newEnd < g.started_on) {
    await supabase.from("groundings").update({ status: "ended" }).eq("id", id);
  } else {
    await supabase.from("groundings").update({ ends_on: newEnd }).eq("id", id);
  }
  revalidatePath(`/app/children/${childId}`);
}

export async function updateGrounding(id: string, childId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("groundings")
    .update({
      note: str(formData.get("note")),
      pause_rewards: formData.get("pause_rewards") === "on",
      pause_screen_time: formData.get("pause_screen_time") === "on",
      privileges_lost: strList(formData.get("privileges")),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/app/children/${childId}`);
}

export async function endGrounding(id: string, childId: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("groundings").update({ status: "ended" }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/app/children/${childId}`);
}

// ── Calm Corner (supportive timeout) ─────────────────────────────────────────
function ageFromBirthday(birthday: string | null | undefined): number | null {
  if (!birthday) return null;
  const b = new Date(`${birthday}T00:00:00`);
  const now = new Date();
  return (
    now.getFullYear() -
    b.getFullYear() -
    (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate()) ? 1 : 0)
  );
}

/** A calm, supportive default when there's no AI key (still kind, never shaming). */
const DEFAULT_CORNER_PLAN: CornerPlan = {
  steps: [
    "Take 5 slow belly breaths — in through your nose, out through your mouth.",
    "Let your body get calm and still.",
    "Think of one kinder thing you could try next time.",
  ],
  reminder: "When we have big feelings, we can take a break instead of yelling or hurting.",
  encouragement: "Everyone has hard moments. I know you can reset — and I love you.",
};

/** Start a calm-corner reset: asks-a-reason flow, age-based timer, an AI plan +
 *  encouragement shown (and read aloud) on the wall. Never shaming. */
export async function startCorner(childId: string, formData: FormData) {
  await requireUser();
  const household_id = await myHouseholdId();
  const supabase = await createClient();

  const { data: child } = await supabase
    .from("children")
    .select("name, birthday, ai_profile")
    .eq("id", childId)
    .maybeSingle();
  if (!child) throw new Error("Child not found.");

  const age = ageFromBirthday(child.birthday);
  const reason = str(formData.get("reason"));
  const feeling = str(formData.get("feeling"));
  // Duration: a parent override wins, else ~1 minute per year of age, clamped 2–12.
  const override = int(formData.get("minutes"), 0);
  const minutes = override > 0 ? Math.min(30, override) : Math.min(12, Math.max(2, age ?? 5));

  // Generate a gentle plan (best-effort; falls back to a kind default).
  let plan: CornerPlan = DEFAULT_CORNER_PLAN;
  const ai = await getHouseholdAi(household_id);
  if (ai?.enabled) {
    try {
      const profile = (child.ai_profile ?? null) as { interests?: string[] } | null;
      const recent = await supabase
        .from("corners")
        .select("id")
        .eq("child_id", childId)
        .gte("started_at", new Date(Date.now() - 30 * 86_400_000).toISOString());
      const cleaned = sanitizeCornerPlan(
        await buildCornerPlan({
          key: ai.key,
          childName: child.name,
          age,
          reason,
          feeling,
          interests: profile?.interests ?? [],
          recentCount: recent.data?.length ?? 0,
        }),
      );
      // If the model returned nothing usable, fall back to the kind default.
      plan = cleaned.steps.length ? cleaned : DEFAULT_CORNER_PLAN;
    } catch {
      plan = DEFAULT_CORNER_PLAN;
    }
  }

  // One active corner per child — close any existing first.
  await supabase.from("corners").update({ status: "ended", ended_at: nowIso() }).eq("child_id", childId).eq("status", "active");
  const { error } = await supabase.from("corners").insert({
    household_id,
    child_id: childId,
    reason,
    feeling,
    duration_minutes: minutes,
    plan: plan as unknown as Json,
    status: "active",
  });
  if (error && error.code !== "23505") throw new Error(error.message);
  revalidatePath(`/app/children/${childId}`);
}

/** End a corner (the parent closes it after the timer / a reflection). */
export async function endCorner(id: string, childId: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("corners")
    .update({ status: "done", ended_at: nowIso() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/app/children/${childId}`);
}

export type CornerReportResult = { ok: boolean; error?: string; text?: string };

/** Generate a private parent reflection for a corner, weaving in past corners. */
export async function generateCornerReport(id: string, childId: string): Promise<CornerReportResult> {
  await requireUser();
  const household_id = await myHouseholdId();
  const ai = await getHouseholdAi(household_id);
  if (!ai?.enabled) {
    return { ok: false, error: "Turn on the AI companion and add your Anthropic key in Settings first." };
  }
  const supabase = await createClient();
  const { data: corner } = await supabase
    .from("corners")
    .select("reason, duration_minutes, child_id")
    .eq("id", id)
    .maybeSingle();
  if (!corner) return { ok: false, error: "Corner not found." };
  const { data: child } = await supabase.from("children").select("name, birthday").eq("id", childId).maybeSingle();
  const { data: history } = await supabase
    .from("corners")
    .select("reason, started_at")
    .eq("child_id", childId)
    .neq("id", id)
    .order("started_at", { ascending: false })
    .limit(8);

  try {
    const raw = await buildCornerReport({
      key: ai.key,
      childName: child?.name ?? "your child",
      age: ageFromBirthday(child?.birthday),
      reason: corner.reason,
      durationMinutes: corner.duration_minutes,
      history: history ?? [],
    });
    const text = raw.trim().slice(0, 1000); // cap so a long reflection can't overflow the card
    if (!text) return { ok: false, error: "The AI didn't return a reflection — try again." };
    await supabase.from("corners").update({ report: text }).eq("id", id);
    revalidatePath(`/app/children/${childId}`);
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: aiErrorMessage(e) };
  }
}

// ── Quick Capture (flyer/email/photo → events, groceries, to-dos) ────────────
export type ScanResult = { ok: boolean; error?: string; result?: CaptureResult };

/** Read a pasted text and/or an uploaded photo and extract proposed items. The
 *  Anthropic key stays server-side; nothing is saved until the parent confirms. */
export async function scanCapture(formData: FormData): Promise<ScanResult> {
  await requireUser();
  const household_id = await myHouseholdId();
  const ai = await getHouseholdAi(household_id);
  if (!ai?.enabled) {
    return { ok: false, error: "Turn on the AI companion and add your Anthropic key in Settings first." };
  }
  const supabase = await createClient();
  const text = str(formData.get("text"));
  const file = formData.get("photo");
  let image: { data: string; mediaType: ReturnType<typeof imgType> } | null = null;
  function imgType(t: string) {
    return isCaptureImageType(t) ? t : "image/jpeg";
  }
  if (file instanceof File && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) return { ok: false, error: "That image is too large — please use one under 5MB." };
    if (!isCaptureImageType(file.type)) return { ok: false, error: "Please use a JPEG, PNG, GIF, or WebP image." };
    const buf = Buffer.from(await file.arrayBuffer());
    image = { data: buf.toString("base64"), mediaType: imgType(file.type) };
  }
  if (!text && !image) return { ok: false, error: "Add a photo or paste some text first." };

  const { data: kids } = await supabase
    .from("children")
    .select("name")
    .eq("household_id", household_id)
    .is("deleted_at", null);
  // The client passes its local date so "tomorrow"/"next Friday" resolve in the
  // family's timezone, not the server's UTC day.
  const clientToday = str(formData.get("today"));
  const todayISO = clientToday && /^\d{4}-\d{2}-\d{2}$/.test(clientToday) ? clientToday : new Date().toISOString().slice(0, 10);
  try {
    const result = await extractFromCapture({
      key: ai.key,
      text,
      image,
      todayISO,
      childNames: (kids ?? []).map((k) => k.name),
    });
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: aiErrorMessage(e) };
  }
}

/** Insert the items the parent confirmed from a capture. Household-scoped.
 *  tzOffsetMinutes is the browser's getTimezoneOffset() so a flyer's "3:00 PM"
 *  is stored as the correct instant for the family's timezone, not the server's. */
export async function applyCapture(
  items: CaptureResult,
  tzOffsetMinutes = 0,
): Promise<{ ok: boolean; added: number; error?: string }> {
  await requireUser();
  const household_id = await myHouseholdId();
  const supabase = await createClient();
  const off = Number.isFinite(tzOffsetMinutes) ? Math.trunc(tzOffsetMinutes) : 0;
  let added = 0;

  try {
    for (const e of (items.events ?? []).slice(0, 25)) {
      // Validate the date FORMAT and VALIDITY before any toISOString() (an invalid
      // date like "2024-13-45" would otherwise throw a RangeError and crash apply).
      if (!e?.title || !/^\d{4}-\d{2}-\d{2}$/.test(e.date ?? "")) continue;
      const time = e.time && /^\d{2}:\d{2}$/.test(e.time) ? e.time : null;
      const [hh, mm] = (time ?? "09:00").split(":").map(Number);
      const base = new Date(`${e.date}T00:00:00Z`); // midnight UTC of that calendar day
      if (Number.isNaN(base.getTime())) continue;
      // Wall-clock minutes in the family's zone, shifted to UTC (offset = UTC − local).
      base.setUTCMinutes(base.getUTCMinutes() + hh * 60 + mm + off);
      const starts_at = base.toISOString();
      await supabase.from("events").insert({
        household_id,
        title: String(e.title).slice(0, 120),
        emoji: e.emoji ? String(e.emoji).slice(0, 8) : null,
        location: e.location ? String(e.location).slice(0, 120) : null,
        starts_at,
        all_day: !time,
      });
      added++;
    }
    for (const g of (items.groceries ?? []).slice(0, 50)) {
      if (!g?.name) continue;
      await supabase.from("list_items").insert({
        household_id,
        list_kind: "grocery",
        name: String(g.name).slice(0, 80),
        category: g.category ? String(g.category).slice(0, 40) : null,
      });
      added++;
    }
    for (const t of (items.todos ?? []).slice(0, 25)) {
      if (!t?.title) continue;
      const due = t.due_date && /^\d{4}-\d{2}-\d{2}$/.test(t.due_date) ? t.due_date : new Date().toISOString().slice(0, 10);
      await supabase.from("reminders").insert({ household_id, title: String(t.title).slice(0, 120), due_date: due });
      added++;
    }
  } catch {
    return { ok: false, added, error: "Something went wrong adding those — please try again." };
  }

  if (added > 0) await invalidateBriefs(household_id);
  revalidatePath("/app/calendar");
  revalidatePath("/app/lists");
  return { ok: true, added };
}

// ── Wall messages (bonus points applied server-side, never by the kiosk) ─────
export async function addMessage(formData: FormData) {
  await requireUser();
  const household_id = await myHouseholdId();
  const supabase = await createClient();
  const childId = str(formData.get("child_id"));
  const bonus = Math.max(0, int(formData.get("bonus_points")));
  const expires = str(formData.get("expires_at"));

  const { error } = await supabase.from("wall_messages").insert({
    household_id,
    child_id: childId,
    body: String(formData.get("body") || ""),
    emoji: str(formData.get("emoji")),
    author_label: str(formData.get("author_label")),
    pinned: formData.get("pinned") === "on",
    bonus_points: bonus,
    expires_at: expires ? new Date(expires).toISOString() : null,
  });
  if (error) throw new Error(error.message);

  // Apply a star bonus authenticated, here — the anon kiosk never mints points.
  if (bonus > 0 && childId) {
    await supabase
      .from("reward_log")
      .insert({ child_id: childId, delta: bonus, reason: "bonus" });
    const { data: rw } = await supabase
      .from("rewards")
      .select("points_total")
      .eq("child_id", childId)
      .maybeSingle();
    await supabase
      .from("rewards")
      .upsert(
        { child_id: childId, points_total: (rw?.points_total ?? 0) + bonus },
        { onConflict: "child_id" },
      );
  }
  revalidatePath("/app/messages");
}

export async function deleteMessage(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("wall_messages")
    .update({ deleted_at: nowIso() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/messages");
}

// ── One-tap starter content ──────────────────────────────────────────────────
export async function seedCalmTools() {
  await requireUser();
  const household_id = await myHouseholdId();
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("calm_tools")
    .select("tool_type")
    .eq("household_id", household_id)
    .is("deleted_at", null);
  const have = new Set((existing ?? []).map((t) => t.tool_type));
  const recommended = [
    { tool_type: "breathing", config: { pattern: "4-7-8", rounds: 4 }, sort_order: 1 },
    { tool_type: "feelings", config: { options: ["happy", "calm", "sad", "angry", "worried", "tired"] }, sort_order: 2 },
    { tool_type: "break", config: { minutes: 5 }, sort_order: 3 },
    {
      tool_type: "social_story",
      config: { title: "Big feelings are okay", pages: ["Everyone has big feelings.", "I can take a slow breath.", "I can ask for help.", "The feeling gets smaller. I'm okay."] },
      sort_order: 4,
    },
  ].filter((r) => !have.has(r.tool_type as never));
  if (recommended.length) {
    await supabase.from("calm_tools").insert(
      recommended.map((r) => ({
        household_id,
        tool_type: r.tool_type as "breathing" | "feelings" | "break" | "social_story",
        config: r.config as never,
        sort_order: r.sort_order,
        enabled: true,
      })),
    );
  }
  revalidatePath("/app/calm");
}

export async function dismissOnboarding() {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) return;
  const supabase = await createClient();
  const current = (household.settings ?? {}) as Record<string, unknown>;
  await supabase
    .from("households")
    .update({ settings: { ...current, onboardingDismissed: true } as never })
    .eq("id", household.id);
  revalidatePath("/app");
}

// ── Per-child accessibility settings (merge into children.settings jsonb) ─────
export async function updateChildSettings(childId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const { data: child } = await supabase
    .from("children")
    .select("settings")
    .eq("id", childId)
    .maybeSingle();
  const current = (child?.settings ?? {}) as Record<string, unknown>;
  const next = {
    ...current,
    readAloud: formData.get("readAloud") === "on",
    autoRead: formData.get("autoRead") === "on",
    sound: formData.get("sound") === "on",
    haptics: formData.get("haptics") === "on",
    reducedMotion: formData.get("reducedMotion") === "on",
    sensory: ["calm", "standard", "vivid"].includes(str(formData.get("sensory")) ?? "")
      ? str(formData.get("sensory"))
      : "standard",
    theme: str(formData.get("theme")) ?? "harbor",
    bedtime: (() => {
      const b = str(formData.get("bedtime"));
      return b && /^\d{2}:\d{2}$/.test(b) ? b : null;
    })(),
  };
  const { error } = await supabase
    .from("children")
    .update({ settings: next as never })
    .eq("id", childId);
  if (error) throw new Error(error.message);
  revalidatePath(`/app/children/${childId}`);
}

// ── Kiosk / home settings (merge into households.settings jsonb) ──────────────
export type MealPlanResult = {
  ok: boolean;
  error?: string;
  added?: number;
  groceryAdded?: number;
  usedPantry?: boolean;
};

/** Add an on-hand ingredient to the pantry (reuses list_items, kind='pantry'). */
export async function addPantryItem(formData: FormData) {
  await requireUser();
  const household_id = await myHouseholdId();
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  const supabase = await createClient();
  const { error } = await supabase.from("list_items").insert({
    household_id,
    name: name.slice(0, 80),
    quantity: str(formData.get("quantity")),
    category: str(formData.get("category")),
    list_kind: "pantry",
    added_by_label: "Pantry",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/app/pantry");
}

export async function deletePantryItem(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("list_items").update({ deleted_at: nowIso() }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/pantry");
}

/** AI meal-plan generation: fills the next 7 days' open dinner slots with
 *  kid-friendly suggestions from Haiku. Cost-careful (one small structured call). */
export async function generateMealPlan(): Promise<MealPlanResult> {
  await requireUser();
  const household_id = await myHouseholdId();
  const ai = await getHouseholdAi(household_id);
  if (!ai || !ai.enabled) {
    return { ok: false, error: "Turn on the AI companion and add your Anthropic key in Settings first." };
  }
  const supabase = await createClient();
  const r = await planDinners(supabase, household_id, ai.key);
  if (r.error) return { ok: false, error: r.error };
  if (r.added === 0) return { ok: false, error: "You already have dinners planned for the next week." };
  revalidatePath("/app/meals");
  revalidatePath("/app/lists");
  return { ok: true, added: r.added, groceryAdded: r.groceryAdded, usedPantry: r.usedPantry };
}

export type SuggestChoresResult = { ok: boolean; error?: string; added?: number };

/** AI chore suggestions — age-aware (from the child's birthday). Inserts a handful
 *  of fresh, age-appropriate chores the parent can keep or remove. */
export async function suggestChores(childId: string): Promise<SuggestChoresResult> {
  await requireUser();
  const household_id = await myHouseholdId();
  const ai = await getHouseholdAi(household_id);
  if (!ai || !ai.enabled) {
    return { ok: false, error: "Turn on the AI companion and add your Anthropic key in Settings first." };
  }
  const supabase = await createClient();
  const { data: child } = await supabase
    .from("children")
    .select("name, birthday")
    .eq("id", childId)
    .maybeSingle();
  if (!child) return { ok: false, error: "Child not found." };

  let age: number | null = null;
  if (child.birthday) {
    const b = new Date(`${child.birthday}T00:00:00`);
    const now = new Date();
    age =
      now.getFullYear() -
      b.getFullYear() -
      (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate()) ? 1 : 0);
  }

  const { data: existing } = await supabase
    .from("chores")
    .select("title")
    .eq("child_id", childId)
    .is("deleted_at", null);
  const have = (existing ?? []).map((c) => c.title);
  const haveLower = new Set(have.map((h) => h.toLowerCase().trim()));

  try {
    const res = await haikuJson<{ chores: { title: string; icon: string; points: number }[] }>({
      key: ai.key,
      maxTokens: 600,
      system:
        "You suggest age-appropriate household chores for kids. Each chore: a short title, one fitting emoji icon, and a fair star value 2–15 based on effort. Keep them realistic, varied, and safe for the child's age.",
      prompt: `Suggest 5 chores for ${child.name}${age != null ? `, age ${age}` : ""}. Do NOT repeat any of these they already have: ${have.join(", ") || "none"}.`,
      toolName: "suggest_chores",
      schema: {
        type: "object",
        properties: {
          chores: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                icon: { type: "string" },
                points: { type: "number" },
              },
              required: ["title", "icon", "points"],
            },
          },
        },
        required: ["chores"],
      },
    });

    const fresh = (res.chores ?? [])
      .filter((c) => c.title?.trim() && !haveLower.has(c.title.toLowerCase().trim()))
      .slice(0, 6);
    if (!fresh.length) return { ok: false, error: "No fresh suggestions — try again." };

    const { data: ord } = await supabase
      .from("chores")
      .select("sort_order")
      .eq("child_id", childId)
      .order("sort_order", { ascending: false })
      .limit(1);
    let so = ((ord?.[0]?.sort_order as number) ?? -1) + 1;
    const { error } = await supabase.from("chores").insert(
      fresh.map((c) => ({
        household_id,
        child_id: childId,
        title: c.title.trim().slice(0, 60),
        icon: (c.icon || "✅").slice(0, 8),
        points: Math.max(0, Math.min(50, Math.round(c.points || 5))),
        sort_order: so++,
      })),
    );
    if (error) throw new Error(error.message);
    revalidatePath(`/app/children/${childId}`);
    return { ok: true, added: fresh.length };
  } catch (e) {
    return { ok: false, error: aiErrorMessage(e) };
  }
}

export type InsightResult = { ok: boolean; error?: string; text?: string };

/** AI family insight — a warm narrative over the last 2 weeks of completions +
 *  feelings, with gentle suggestions. On-demand (only spends when clicked). */
export async function generateInsight(): Promise<InsightResult> {
  await requireUser();
  const household_id = await myHouseholdId();
  const ai = await getHouseholdAi(household_id);
  if (!ai || !ai.enabled) {
    return { ok: false, error: "Turn on the AI companion and add your Anthropic key in Settings first." };
  }
  const supabase = await createClient();
  const { data: children } = await supabase
    .from("children")
    .select("id, name")
    .eq("household_id", household_id)
    .is("deleted_at", null);
  const ids = (children ?? []).map((c) => c.id);
  if (!ids.length) return { ok: false, error: "Add a child first." };

  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const [{ data: completions }, { data: checkins }] = await Promise.all([
    supabase.from("reward_log").select("created_at, delta, child_id").in("child_id", ids).gt("delta", 0).gte("created_at", since),
    supabase.from("check_ins").select("feeling, created_at, child_id").in("child_id", ids).gte("created_at", since),
  ]);

  const lines = (children ?? []).map((c) => {
    const comp = (completions ?? []).filter((x) => x.child_id === c.id).length;
    const feels = (checkins ?? []).filter((x) => x.child_id === c.id);
    const fc = new Map<string, number>();
    feels.forEach((f) => fc.set(f.feeling, (fc.get(f.feeling) ?? 0) + 1));
    const top =
      [...fc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([f, n]) => `${f}×${n}`).join(", ") ||
      "no check-ins";
    return `${c.name}: ${comp} tasks done in 2 weeks; feelings: ${top}`;
  });

  try {
    const text = await haikuText({
      key: ai.key,
      maxTokens: 320,
      system:
        "You are Harbor, a warm, supportive family insights assistant. From two weeks of data, write 3–4 short sentences: what's going well, any gentle rhythm/pattern, and 1–2 concrete kind suggestions. Frame everything as structure and encouragement — never labels or diagnosis.",
      prompt: `Family over the last 2 weeks:\n${lines.join("\n")}\n\nWrite the insight.`,
    });
    if (!text) return { ok: false, error: "The AI didn't return a summary — try again." };
    return { ok: true, text };
  } catch (e) {
    return { ok: false, error: aiErrorMessage(e) };
  }
}

export type ProfileResult = { ok: boolean; error?: string };

/** Build/refresh a child's AI profile from their data (+ an optional parent note).
 *  One Haiku call; the profile syncs to the wall and powers offline encouragement. */
export async function buildChildProfile(childId: string, note: string | null): Promise<ProfileResult> {
  await requireUser();
  const household_id = await myHouseholdId();
  const ai = await getHouseholdAi(household_id);
  if (!ai || !ai.enabled) {
    return { ok: false, error: "Turn on the AI companion and add your Anthropic key in Settings first." };
  }
  const supabase = await createClient();
  const { data: child } = await supabase.from("children").select("name, birthday").eq("id", childId).maybeSingle();
  if (!child) return { ok: false, error: "Child not found." };

  let age: number | null = null;
  if (child.birthday) {
    const b = new Date(`${child.birthday}T00:00:00`);
    const now = new Date();
    age =
      now.getFullYear() -
      b.getFullYear() -
      (now.getMonth() < b.getMonth() || (now.getMonth() === b.getMonth() && now.getDate() < b.getDate()) ? 1 : 0);
  }

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [{ data: checkins }, { data: completions }, { data: routines }, { data: chores }] = await Promise.all([
    supabase.from("check_ins").select("feeling").eq("child_id", childId).gte("created_at", since),
    supabase.from("reward_log").select("delta").eq("child_id", childId).gt("delta", 0).gte("created_at", since),
    supabase.from("routines").select("name").eq("child_id", childId).is("deleted_at", null),
    supabase.from("chores").select("title").eq("child_id", childId).is("deleted_at", null),
  ]);
  const fc = new Map<string, number>();
  (checkins ?? []).forEach((c) => fc.set(c.feeling, (fc.get(c.feeling) ?? 0) + 1));
  const feelings =
    [...fc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([f, n]) => `${f}×${n}`).join(", ") || "no check-ins";
  const routineNames = (routines ?? []).map((r) => r.name).join(", ") || "none";
  const choreNames = (chores ?? []).map((c) => c.title).join(", ") || "none";

  try {
    const res = await haikuJson<{
      summary: string;
      interests: string[];
      motivators: string[];
      encouragement: string[];
    }>({
      key: ai.key,
      maxTokens: 800,
      system:
        "You build a brief, warm profile of a child to help a family wall app personalize encouragement. Be positive, specific, and age-appropriate. interests = things they likely enjoy. motivators = what helps them follow through (e.g. 'clear steps', 'a visual timer', 'specific praise'). encouragement = 5 short, warm, kid-facing cheer lines (max ~12 words each), second person, varied — the kind a caring grown-up would say.",
      prompt: `Child: ${child.name}${age != null ? `, age ${age}` : ""}. Last 30 days — tasks finished: ${(completions ?? []).length}; feelings logged: ${feelings}. Their routines: ${routineNames}. Their chores: ${choreNames}.${note ? `\nParent note: ${note}` : ""}\nBuild the profile.`,
      toolName: "save_profile",
      schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          interests: { type: "array", items: { type: "string" } },
          motivators: { type: "array", items: { type: "string" } },
          encouragement: { type: "array", items: { type: "string" } },
        },
        required: ["summary", "interests", "motivators", "encouragement"],
      },
    });

    const profile = {
      summary: (res.summary || "").slice(0, 400),
      interests: (res.interests || []).map((s) => s.slice(0, 40)).slice(0, 8),
      motivators: (res.motivators || []).map((s) => s.slice(0, 60)).slice(0, 6),
      encouragement: (res.encouragement || []).map((s) => s.slice(0, 120)).filter(Boolean).slice(0, 6),
      note: note || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("children").update({ ai_profile: profile }).eq("id", childId);
    if (error) throw new Error(error.message);
    revalidatePath(`/app/children/${childId}`);
    revalidatePath("/app");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: aiErrorMessage(e) };
  }
}

/** Save the AI companion config (Anthropic key + enabled). The key is kept when
 *  the field is left blank, so toggling 'enabled' doesn't require re-entering it. */
export async function saveAiConfig(formData: FormData) {
  await requireUser();
  const household_id = await myHouseholdId();
  const supabase = await createClient();
  const enabled = formData.get("ai_enabled") === "on";
  const rawKey = str(formData.get("anthropic_api_key"));
  const row: {
    household_id: string;
    enabled: boolean;
    updated_at: string;
    anthropic_api_key?: string | null;
  } = { household_id, enabled, updated_at: new Date().toISOString() };
  if (formData.get("clear_key") === "on") row.anthropic_api_key = null;
  else if (rawKey) row.anthropic_api_key = rawKey;
  const { error } = await supabase.from("ai_config").upsert(row, { onConflict: "household_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/app/settings");
}

export async function updateKioskSettings(formData: FormData) {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household found.");
  const supabase = await createClient();
  const current = (household.settings ?? {}) as Record<string, unknown>;

  // Optional weather location: geocode a city to lat/lon once, here.
  let weather = current.weather as { lat: number; lon: number; label: string } | undefined;
  const city = str(formData.get("weatherCity"));
  const prevLabel = weather?.label ?? "";
  if (city === null) {
    weather = undefined;
  } else if (city.toLowerCase() !== prevLabel.toLowerCase()) {
    try {
      const r = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`,
      );
      const j = await r.json();
      const hit = j?.results?.[0];
      if (hit) {
        weather = {
          lat: hit.latitude,
          lon: hit.longitude,
          label: [hit.name, hit.admin1].filter(Boolean).join(", "),
        };
      }
    } catch {
      /* leave existing weather if geocoding fails */
    }
  }

  const photosRaw = formData.get("homePhotos");
  const homePhotos =
    photosRaw == null
      ? (current.homePhotos as string[] | undefined)
      : String(photosRaw)
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter((s) => /^https?:\/\//i.test(s));

  const next = {
    ...current,
    idleSeconds: Math.max(30, int(formData.get("idleSeconds"), 120)),
    screensaver: formData.get("screensaver") === "on",
    homePhotoUrl: str(formData.get("homePhotoUrl")),
    homePhotos,
    quietStart: str(formData.get("quietStart")),
    quietEnd: str(formData.get("quietEnd")),
    weather,
  };
  const { error } = await supabase
    .from("households")
    .update({ settings: next as never })
    .eq("id", household.id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/settings");
}
