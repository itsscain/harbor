"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getMyHousehold } from "@/lib/household";
import { hashPinServer } from "@/lib/pin";
import { CHILD_PALETTE } from "@/lib/kiosk/colors";

function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}
function int(v: FormDataEntryValue | null, fb = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fb;
}

// ── Children ─────────────────────────────────────────────────────────────────
async function nextOrder(
  table: "children" | "routines" | "routine_steps",
  column: "sort_order" | "order_index",
  fkColumn: string,
  fkValue: string,
): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from(table)
    .select(column)
    .eq(fkColumn, fkValue)
    .order(column, { ascending: false })
    .limit(1);
  const top = (data?.[0] as Record<string, number> | undefined)?.[column];
  return (typeof top === "number" ? top : -1) + 1;
}

export async function addChild(formData: FormData) {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household found.");
  const supabase = await createClient();
  const order = await nextOrder("children", "sort_order", "household_id", household.id);
  const { data, error } = await supabase
    .from("children")
    .insert({
      household_id: household.id,
      name: String(formData.get("name") || "New child"),
      avatar: str(formData.get("avatar")),
      color: CHILD_PALETTE[order % CHILD_PALETTE.length].value,
      sort_order: order,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  // Seed a rewards row so the wall shows a points total immediately.
  await supabase.from("rewards").insert({ child_id: data.id, points_total: 0 });
  revalidatePath("/app");
  redirect(`/app/children/${data.id}`);
}

export type CreateChildState = {
  ok?: boolean;
  error?: string;
  child?: { id: string; name: string; avatar: string | null; color: string };
};

/** Client-driven add: returns state (for a live, celebratory flow) instead of
 *  redirecting. Used by the AddChildCard. */
export async function createChild(
  _prev: CreateChildState,
  formData: FormData,
): Promise<CreateChildState> {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) return { error: "No household found." };
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Give your child a name to continue." };

  const supabase = await createClient();
  const order = await nextOrder("children", "sort_order", "household_id", household.id);
  const color = str(formData.get("color")) ?? CHILD_PALETTE[order % CHILD_PALETTE.length].value;
  const { data, error } = await supabase
    .from("children")
    .insert({
      household_id: household.id,
      name,
      avatar: str(formData.get("avatar")),
      color,
      birthday: str(formData.get("birthday")),
      sort_order: order,
    })
    .select("id, name, avatar, color")
    .single();
  if (error) return { error: error.message };

  await supabase.from("rewards").insert({ child_id: data.id, points_total: 0 });
  revalidatePath("/app");
  revalidatePath("/app/children");
  return {
    ok: true,
    child: { id: data.id, name: data.name, avatar: data.avatar, color: data.color ?? color },
  };
}

export async function updateChild(id: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const color = str(formData.get("color"));
  const { error } = await supabase
    .from("children")
    .update({
      name: String(formData.get("name") || ""),
      avatar: str(formData.get("avatar")),
      // Only touch color when a swatch was actually chosen — a child with a
      // custom color (no matching radio) must not be wiped to null on save.
      ...(color ? { color } : {}),
      birthday: str(formData.get("birthday")),
      sort_order: int(formData.get("sort_order"), 0),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app");
  revalidatePath(`/app/children/${id}`);
}

/** Save (or clear) a child's photo avatar. The file is uploaded to Storage from
 *  the browser; this persists the resulting public URL. RLS scopes it to the
 *  parent's own household. */
export async function saveChildPhoto(id: string, url: string | null) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("children").update({ photo_url: url }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app");
  revalidatePath(`/app/children/${id}`);
}

// ── Chores ───────────────────────────────────────────────────────────────────
/** Create a chore assigned to a child (recurs daily by default; worth stars). */
export async function createChore(childId: string, formData: FormData) {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household found.");
  const title = String(formData.get("title") || "").trim();
  if (!title) return;
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("chores")
    .select("sort_order")
    .eq("child_id", childId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const sort_order = ((existing?.[0]?.sort_order as number) ?? -1) + 1;
  const { error } = await supabase.from("chores").insert({
    household_id: household.id,
    child_id: childId,
    title,
    icon: str(formData.get("icon")) ?? "✅",
    points: Math.max(0, int(formData.get("points"), 0)),
    sort_order,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/app/children/${childId}`);
}

/** Remove a chore (soft-delete → the wall drops it on next sync). */
export async function deleteChore(id: string, childId: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("chores")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/app/children/${childId}`);
}

/** Hide a child from the wall (reversible). Soft-delete → syncs as a tombstone. */
export async function deleteChild(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("children")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app");
  revalidatePath("/app/children");
  redirect("/app/children");
}

/** Permanently delete a child and ALL their data (cascade) + a tombstone the wall
 *  consumes to drop them. Irreversible. */
export async function deleteChildPermanently(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("hard_delete_child", { p_child: id });
  if (error) throw new Error(error.message);
  revalidatePath("/app");
  revalidatePath("/app/children");
  redirect("/app/children");
}

// ── Routines ─────────────────────────────────────────────────────────────────
export async function addRoutine(childId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("routines").insert({
    child_id: childId,
    name: String(formData.get("name") || "New routine"),
    type: (String(formData.get("type") || "schedule")) as "schedule" | "first_then",
    sort_order: await nextOrder("routines", "sort_order", "child_id", childId),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/app/children/${childId}`);
}

export async function updateRoutine(id: string, childId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const days = formData
    .getAll("days")
    .map((d) => Number(d))
    .filter((n) => Number.isFinite(n));
  const { error } = await supabase
    .from("routines")
    .update({
      name: String(formData.get("name") || ""),
      active: formData.get("active") === "on",
      sort_order: int(formData.get("sort_order"), 0),
      start_time: str(formData.get("start_time")),
      end_time: str(formData.get("end_time")),
      days_of_week: days.length ? days : null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/app/children/${childId}`);
}

type TemplateStep = { icon: string; label: string; points?: number; step_type?: "task" | "first" | "then" };
const ROUTINE_TEMPLATES: Record<string, { name: string; type: "schedule" | "first_then"; steps: TemplateStep[] }> = {
  morning: {
    name: "Morning",
    type: "schedule",
    steps: [
      { icon: "🌅", label: "Wake up" },
      { icon: "🚽", label: "Bathroom" },
      { icon: "👕", label: "Get dressed", points: 5 },
      { icon: "🪥", label: "Brush teeth", points: 5 },
      { icon: "🥣", label: "Breakfast", points: 5 },
      { icon: "🎒", label: "Shoes & bag", points: 5 },
    ],
  },
  bedtime: {
    name: "Bedtime",
    type: "schedule",
    steps: [
      { icon: "🛁", label: "Bath time" },
      { icon: "🌙", label: "Pajamas", points: 5 },
      { icon: "🪥", label: "Brush teeth", points: 5 },
      { icon: "📖", label: "Story", points: 10 },
      { icon: "💡", label: "Lights out" },
    ],
  },
  afterschool: {
    name: "After school",
    type: "schedule",
    steps: [
      { icon: "🍎", label: "Snack" },
      { icon: "🎒", label: "Unpack bag" },
      { icon: "✏️", label: "Homework", points: 10 },
      { icon: "🧸", label: "Free play" },
      { icon: "🧹", label: "Tidy up", points: 5 },
    ],
  },
  firstthen: {
    name: "First / Then",
    type: "first_then",
    steps: [
      { icon: "🧸", label: "Clean up", step_type: "first" },
      { icon: "📺", label: "Screen time", step_type: "then" },
    ],
  },
  midday: {
    name: "Summer Day",
    type: "schedule",
    steps: [
      { icon: "🥪", label: "Lunch", points: 5 },
      { icon: "💧", label: "Water break" },
      { icon: "😴", label: "Quiet / nap time", points: 5 },
      { icon: "📖", label: "Read or draw", points: 5 },
      { icon: "☀️", label: "Outside play" },
      { icon: "🧹", label: "Tidy up", points: 5 },
      { icon: "🍦", label: "Afternoon snack" },
      { icon: "🎨", label: "Free / creative time" },
    ],
  },
};

/** One-tap: create a routine pre-filled from a template (vs adding each step). */
export async function addRoutineFromTemplate(childId: string, formData: FormData) {
  await requireUser();
  const key = String(formData.get("template") || "");
  const tpl = ROUTINE_TEMPLATES[key];
  if (!tpl) return;
  const supabase = await createClient();

  // Double-tap is prevented at the source by SubmitButton's synchronous in-flight
  // latch; a name-based time-window guard here only produced false positives
  // (e.g. a grade bundle's "Morning" blocking a later single "Morning" template).
  const { data: existing } = await supabase
    .from("routines")
    .select("sort_order")
    .eq("child_id", childId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = ((existing?.[0]?.sort_order as number) ?? 0) + 1;

  const { data: routine, error } = await supabase
    .from("routines")
    .insert({ child_id: childId, name: tpl.name, type: tpl.type, sort_order: nextOrder })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const rows = tpl.steps.map((s, i) => ({
    routine_id: routine.id,
    label: s.label,
    icon: s.icon,
    step_type: s.step_type ?? ("task" as const),
    reward_points: s.points ?? 0,
    order_index: i,
  }));
  const { error: stepErr } = await supabase.from("routine_steps").insert(rows);
  if (stepErr) throw new Error(stepErr.message);
  revalidatePath(`/app/children/${childId}`);
}

// ── Grade bundles: a full age-tuned routine set in one tap ───────────────────
type GradeRoutine = { name: string; type: "schedule" | "first_then"; steps: TemplateStep[] };
const GRADE_BUNDLES: Record<string, { label: string; routines: GradeRoutine[] }> = {
  kindergarten: {
    label: "Kindergarten",
    routines: [
      { name: "Morning", type: "schedule", steps: [
        { icon: "🌅", label: "Wake up" }, { icon: "🚽", label: "Potty" },
        { icon: "👕", label: "Get dressed", points: 5 }, { icon: "🥣", label: "Breakfast", points: 5 },
        { icon: "🪥", label: "Brush teeth", points: 5 }, { icon: "👟", label: "Shoes on", points: 5 },
      ] },
      { name: "After school", type: "schedule", steps: [
        { icon: "🍎", label: "Snack" }, { icon: "🧸", label: "Free play" },
        { icon: "🧹", label: "Help tidy up", points: 5 }, { icon: "📚", label: "Story time", points: 5 },
      ] },
      { name: "Bedtime", type: "schedule", steps: [
        { icon: "🛁", label: "Bath" }, { icon: "🌙", label: "Pajamas", points: 5 },
        { icon: "🪥", label: "Brush teeth", points: 5 }, { icon: "📖", label: "One story", points: 5 }, { icon: "💡", label: "Lights out" },
      ] },
    ],
  },
  grade2: {
    label: "2nd grade",
    routines: [
      { name: "Morning", type: "schedule", steps: [
        { icon: "🌅", label: "Wake up" }, { icon: "👕", label: "Get dressed", points: 5 },
        { icon: "🥣", label: "Breakfast", points: 5 }, { icon: "🪥", label: "Brush teeth", points: 5 },
        { icon: "💇", label: "Hair" }, { icon: "🎒", label: "Pack backpack", points: 5 },
      ] },
      { name: "After school", type: "schedule", steps: [
        { icon: "🍎", label: "Snack" }, { icon: "📦", label: "Unpack bag", points: 5 },
        { icon: "✏️", label: "Homework", points: 10 }, { icon: "📖", label: "Read 15 min", points: 10 },
        { icon: "🧹", label: "Chore", points: 5 }, { icon: "🧸", label: "Free time" },
      ] },
      { name: "Bedtime", type: "schedule", steps: [
        { icon: "🚿", label: "Shower" }, { icon: "🌙", label: "Pajamas", points: 5 },
        { icon: "🪥", label: "Brush teeth", points: 5 }, { icon: "📖", label: "Read", points: 5 }, { icon: "💡", label: "Lights out" },
      ] },
    ],
  },
  grade4: {
    label: "4th grade",
    routines: [
      { name: "Morning", type: "schedule", steps: [
        { icon: "⏰", label: "Wake up" }, { icon: "🛏️", label: "Make bed", points: 5 },
        { icon: "👕", label: "Get dressed", points: 5 }, { icon: "🥣", label: "Breakfast", points: 5 },
        { icon: "🪥", label: "Brush teeth", points: 5 }, { icon: "🎒", label: "Pack & check homework", points: 5 },
      ] },
      { name: "After school", type: "schedule", steps: [
        { icon: "🍎", label: "Snack" }, { icon: "✏️", label: "Homework", points: 15 },
        { icon: "🧹", label: "Chores", points: 10 }, { icon: "📖", label: "Read 20 min", points: 10 },
        { icon: "📱", label: "Screen time" },
      ] },
      { name: "Bedtime", type: "schedule", steps: [
        { icon: "🚿", label: "Shower" }, { icon: "🪥", label: "Brush teeth", points: 5 },
        { icon: "👕", label: "Lay out clothes", points: 5 }, { icon: "📖", label: "Read", points: 5 }, { icon: "💡", label: "Lights out" },
      ] },
    ],
  },
};

/** One tap: create a full grade-tuned routine set (Morning + After school + Bedtime). */
export async function addGradeRoutines(childId: string, formData: FormData) {
  await requireUser();
  const key = String(formData.get("grade") || "");
  const bundle = GRADE_BUNDLES[key];
  if (!bundle) return;
  const supabase = await createClient();

  // Double-tap is prevented at the source by SubmitButton's synchronous in-flight
  // latch. The previous count-based window guard was bundle-agnostic and silently
  // dropped a legitimate *different* bundle added within 10s — removed.
  const { data: existing } = await supabase
    .from("routines")
    .select("sort_order")
    .eq("child_id", childId)
    .order("sort_order", { ascending: false })
    .limit(1);
  let order = ((existing?.[0]?.sort_order as number) ?? -1) + 1;
  for (const r of bundle.routines) {
    const { data: routine, error } = await supabase
      .from("routines")
      .insert({ child_id: childId, name: r.name, type: r.type, sort_order: order++ })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const rows = r.steps.map((s, i) => ({
      routine_id: routine.id,
      label: s.label,
      icon: s.icon,
      step_type: s.step_type ?? ("task" as const),
      reward_points: s.points ?? 0,
      order_index: i,
    }));
    const { error: stepErr } = await supabase.from("routine_steps").insert(rows);
    if (stepErr) throw new Error(stepErr.message);
  }
  revalidatePath(`/app/children/${childId}`);
}

export async function deleteRoutine(id: string, childId: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("routines")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/app/children/${childId}`);
}

// ── Steps ────────────────────────────────────────────────────────────────────
export async function addStep(routineId: string, childId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("routine_steps").insert({
    routine_id: routineId,
    label: String(formData.get("label") || "New step"),
    icon: str(formData.get("icon")),
    step_type: (String(formData.get("step_type") || "task")) as
      | "task"
      | "first"
      | "then",
    reward_points: int(formData.get("reward_points"), 0),
    order_index: await nextOrder("routine_steps", "order_index", "routine_id", routineId),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/app/children/${childId}`);
}

export async function updateStep(id: string, childId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const durationRaw = formData.get("duration_min");
  const { error } = await supabase
    .from("routine_steps")
    .update({
      label: String(formData.get("label") || ""),
      icon: str(formData.get("icon")),
      step_type: (String(formData.get("step_type") || "task")) as
        | "task"
        | "first"
        | "then",
      reward_points: int(formData.get("reward_points"), 0),
      start_time: str(formData.get("start_time")),
      duration_min: durationRaw ? int(durationRaw) : null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/app/children/${childId}`);
}

/** Move a step up/down by swapping order_index with its neighbor. */
export async function moveStep(id: string, childId: string, dir: "up" | "down") {
  await requireUser();
  const supabase = await createClient();
  const { data: step } = await supabase
    .from("routine_steps")
    .select("id, routine_id")
    .eq("id", id)
    .maybeSingle();
  if (!step) return;
  const { data: siblings } = await supabase
    .from("routine_steps")
    .select("id, order_index")
    .eq("routine_id", step.routine_id)
    .is("deleted_at", null)
    .order("order_index");
  const list = siblings ?? [];
  const idx = list.findIndex((s) => s.id === id);
  const swap = dir === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swap < 0 || swap >= list.length) return;
  const a = list[idx];
  const b = list[swap];
  await supabase.from("routine_steps").update({ order_index: b.order_index }).eq("id", a.id);
  await supabase.from("routine_steps").update({ order_index: a.order_index }).eq("id", b.id);
  revalidatePath(`/app/children/${childId}`);
}

export async function deleteStep(id: string, childId: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("routine_steps")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/app/children/${childId}`);
}

// ── Calm tools ───────────────────────────────────────────────────────────────
export async function addCalmTool(formData: FormData) {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household found.");
  const supabase = await createClient();
  const type = String(formData.get("tool_type") || "breathing");
  const defaults: Record<string, Record<string, unknown>> = {
    breathing: { pattern: "4-4-4", rounds: 4 },
    feelings: { options: ["happy", "calm", "sad", "angry", "worried", "tired"] },
    break: { minutes: 5 },
    social_story: { title: "A calm story", pages: ["Page one."] },
  };
  const { error } = await supabase.from("calm_tools").insert({
    household_id: household.id,
    tool_type: type as "breathing" | "feelings" | "break" | "social_story",
    config: (defaults[type] ?? {}) as never,
    enabled: true,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/app/calm");
}

export async function updateCalmTool(id: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  let config: unknown = {};
  try {
    config = JSON.parse(String(formData.get("config") || "{}"));
  } catch {
    // Surface the problem instead of silently no-op'ing (which looked like success).
    throw new Error("Those settings aren't valid JSON — check the format and try again.");
  }
  const { error } = await supabase
    .from("calm_tools")
    .update({ config: config as never, enabled: formData.get("enabled") === "on" })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/calm");
}

export async function deleteCalmTool(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("calm_tools")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/calm");
}

// ── Settings ─────────────────────────────────────────────────────────────────
export async function updateHouseholdName(formData: FormData) {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household found.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("households")
    .update({ name: String(formData.get("name") || household.name) })
    .eq("id", household.id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/settings");
}

export async function setParentPin(formData: FormData) {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household found.");
  const pin = String(formData.get("pin") || "");
  if (!/^\d{4,8}$/.test(pin)) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("households")
    .update({ parent_pin_hash: hashPinServer(pin) })
    .eq("id", household.id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/settings");
}

export async function clearParentPin() {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household found.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("households")
    .update({ parent_pin_hash: null })
    .eq("id", household.id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/settings");
}
