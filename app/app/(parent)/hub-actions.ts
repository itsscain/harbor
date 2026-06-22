"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getMyHousehold } from "@/lib/household";
import { getHouseholdAi, haikuJson, haikuText, aiErrorMessage } from "@/lib/ai/anthropic";

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

  const base = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  const { data: existing } = await supabase
    .from("meals")
    .select("date")
    .eq("household_id", household_id)
    .eq("meal_type", "dinner")
    .is("deleted_at", null)
    .in("date", dates);
  const taken = new Set((existing ?? []).map((m) => m.date));
  const openDates = dates.filter((d) => !taken.has(d));
  if (openDates.length === 0) {
    return { ok: false, error: "You already have dinners planned for the next week." };
  }

  const { data: kids } = await supabase
    .from("children")
    .select("name")
    .eq("household_id", household_id)
    .is("deleted_at", null);
  const kidNames = (kids ?? []).map((k) => k.name).join(", ") || "the family";

  // Pantry / on-hand ingredients — build meals around these when present.
  const { data: pantryRows } = await supabase
    .from("list_items")
    .select("name, quantity")
    .eq("household_id", household_id)
    .eq("list_kind", "pantry")
    .is("deleted_at", null);
  const pantry = (pantryRows ?? []).map((p) => (p.quantity ? `${p.name} (${p.quantity})` : p.name));
  const usedPantry = pantry.length > 0;

  const system = usedPantry
    ? "You are a warm, practical family meal planner who cooks from what's on hand. Suggest simple, varied, kid-friendly dinners that PRIMARILY use the family's pantry/on-hand ingredients, adding only a few common extras. For each dinner give a short title, one fitting food emoji, the pantry items it uses, and any extra ingredients to buy. Never repeat a dish."
    : "You are a warm, practical family meal planner. Suggest simple, varied, kid-friendly weeknight dinners. For each dinner give a short title, one fitting food emoji, and any ingredients to buy. Never repeat a dish.";

  const prompt =
    `Plan one dinner for each of these dates for a family with kids named ${kidNames}: ${openDates.join(", ")}.` +
    (usedPantry
      ? `\n\nPantry / on-hand ingredients to build the meals around:\n- ${pantry.join("\n- ")}\n\nLean on these as much as possible and keep the extra shopping list short.`
      : "") +
    `\nReturn exactly one dinner per date, using the date strings exactly as given.`;

  try {
    const result = await haikuJson<{
      meals: { date: string; title: string; emoji: string; uses?: string[]; needs?: string[] }[];
    }>({
      key: ai.key,
      maxTokens: 1200,
      system,
      prompt,
      toolName: "save_meal_plan",
      schema: {
        type: "object",
        properties: {
          meals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string", description: "YYYY-MM-DD, one of the requested dates" },
                title: { type: "string" },
                emoji: { type: "string" },
                uses: { type: "array", items: { type: "string" }, description: "pantry items this meal uses" },
                needs: { type: "array", items: { type: "string" }, description: "extra ingredients to buy" },
              },
              required: ["date", "title", "emoji"],
            },
          },
        },
        required: ["meals"],
      },
    });

    const filtered = (result.meals ?? []).filter((m) => openDates.includes(m.date) && m.title?.trim());
    // Collapse to one dinner per date (the model can occasionally repeat a date).
    const byDate = new Map<string, (typeof filtered)[number]>();
    for (const m of filtered) if (!byDate.has(m.date)) byDate.set(m.date, m);
    const valid = [...byDate.values()];
    if (valid.length === 0) return { ok: false, error: "The AI didn't return usable meals — try again." };

    const noteFor = (m: { uses?: string[]; needs?: string[] }): string | null => {
      const u = (m.uses ?? []).filter(Boolean);
      const n = (m.needs ?? []).filter(Boolean);
      const parts: string[] = [];
      if (u.length) parts.push(`Uses ${u.join(", ")}`);
      if (n.length) parts.push(`Need ${n.join(", ")}`);
      const s = parts.join(" · ");
      return s ? s.slice(0, 200) : null;
    };

    const { error: mErr } = await supabase.from("meals").insert(
      valid.map((m) => ({
        household_id,
        date: m.date,
        meal_type: "dinner",
        title: m.title.trim().slice(0, 80),
        emoji: (m.emoji || "🍽️").slice(0, 8),
        notes: noteFor(m),
      })),
    );
    if (mErr) throw new Error(mErr.message);

    // Auto-add anything we need to buy to the grocery list (skipping what we
    // already have on the list or in the pantry).
    const { data: groc } = await supabase
      .from("list_items")
      .select("name")
      .eq("household_id", household_id)
      .eq("list_kind", "grocery")
      .is("deleted_at", null);
    const have = new Set<string>([
      ...(groc ?? []).map((g) => g.name.toLowerCase().trim()),
      ...pantry.map((p) => p.toLowerCase().replace(/\s*\(.*\)\s*/, "").trim()),
    ]);
    const needs = Array.from(
      new Set(valid.flatMap((m) => m.needs ?? []).map((s) => s.trim()).filter(Boolean)),
    ).filter((s) => !have.has(s.toLowerCase()));
    let groceryAdded = 0;
    if (needs.length) {
      const toAdd = needs.slice(0, 30);
      const { error: gErr } = await supabase.from("list_items").insert(
        toAdd.map((name) => ({
          household_id,
          name: name.slice(0, 80),
          list_kind: "grocery",
          added_by_label: "AI meal plan",
        })),
      );
      if (!gErr) groceryAdded = toAdd.length;
    }

    revalidatePath("/app/meals");
    revalidatePath("/app/lists");
    return { ok: true, added: valid.length, groceryAdded, usedPantry };
  } catch (e) {
    return { ok: false, error: aiErrorMessage(e) };
  }
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
