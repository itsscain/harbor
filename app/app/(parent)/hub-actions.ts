"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getMyHousehold } from "@/lib/household";

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
  revalidatePath("/app/calendar");
}

export async function deleteEvent(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("events")
    .update({ deleted_at: nowIso() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/calendar");
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
    theme: str(formData.get("theme")) ?? "harbor",
  };
  const { error } = await supabase
    .from("children")
    .update({ settings: next as never })
    .eq("id", childId);
  if (error) throw new Error(error.message);
  revalidatePath(`/app/children/${childId}`);
}

// ── Kiosk / home settings (merge into households.settings jsonb) ──────────────
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
