"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getMyHousehold } from "@/lib/household";
import { hashPinServer } from "@/lib/pin";
import { CHILD_PALETTE } from "@/lib/kiosk/colors";
import { generatePairingCode } from "@/lib/codes";
import { getHouseholdAi, haikuText, aiErrorMessage } from "@/lib/ai/anthropic";
import type { Json } from "@/lib/database.types";

function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}
function int(v: FormDataEntryValue | null, fb = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fb;
}
/** Keep only an allowed value; anything else (incl. blank) → null. */
function pick(v: FormDataEntryValue | null, allowed: readonly string[]): string | null {
  const s = String(v ?? "").trim();
  return allowed.includes(s) ? s : null;
}
const STEP_KINDS = ["standard", "timed", "approval", "together", "choice", "substep"] as const;
/** Parse a builder options blob (choice_options / substeps) — a JSON array of
 *  {icon,label}. Bounded + sanitized; empty → null so the column stays clean. */
function optionsJson(v: FormDataEntryValue | null): { label: string; icon: string | null }[] | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  try {
    const arr: unknown = JSON.parse(s);
    if (!Array.isArray(arr)) return null;
    const clean = arr
      .map((o) => {
        const rec = (o ?? {}) as Record<string, unknown>;
        return {
          label: String(rec.label ?? "").trim().slice(0, 60),
          icon: rec.icon ? String(rec.icon).slice(0, 8) : null,
        };
      })
      .filter((o) => o.label.length > 0)
      .slice(0, 8);
    return clean.length ? clean : null;
  } catch {
    return null;
  }
}

// ── Children ─────────────────────────────────────────────────────────────────
async function nextOrder(
  table: "children" | "routines" | "routine_steps" | "people" | "medications",
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
  // Day-of-week selection: empty or all 7 == every day (stored as null).
  const days = formData
    .getAll("days")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  const days_of_week = days.length === 0 || days.length === 7 ? null : Array.from(new Set(days)).sort();

  // Rotation: when on, the chore cycles weekly through all the kids (this child
  // is the anchor used for storage; the wall picks the current week's kid).
  let rotation_member_ids: string[] | null = null;
  if (formData.get("rotate") === "on") {
    const { data: kids } = await supabase
      .from("children")
      .select("id")
      .eq("household_id", household.id)
      .is("deleted_at", null)
      .order("sort_order");
    const ids = (kids ?? []).map((k) => k.id);
    if (ids.length >= 2) rotation_member_ids = ids;
  }

  const { error } = await supabase.from("chores").insert({
    household_id: household.id,
    child_id: childId,
    title,
    icon: str(formData.get("icon")) ?? "✅",
    points: Math.max(0, int(formData.get("points"), 0)),
    days_of_week,
    rotation_member_ids,
    requires_approval: formData.get("approval") === "on",
    sort_order,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/app/children/${childId}`);
}

/** Remove a chore (soft-delete → the wall drops it on next sync). */
/** Edit an existing chore's icon, title, stars, and days. */
export async function updateChore(id: string, childId: string, formData: FormData) {
  await requireUser();
  const title = String(formData.get("title") || "").trim();
  if (!title) return;
  const days = formData
    .getAll("days")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);
  const days_of_week = days.length === 0 || days.length === 7 ? null : Array.from(new Set(days)).sort();
  const supabase = await createClient();
  const { error } = await supabase
    .from("chores")
    .update({
      title,
      icon: str(formData.get("icon")) ?? "✅",
      points: Math.max(0, int(formData.get("points"), 0)),
      days_of_week,
      requires_approval: formData.get("approval") === "on",
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/app/children/${childId}`);
}

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
      // Advanced builder (P3 §8.2) — routine-level power. Gated on a hidden marker the
      // builder form always sends (an unchecked checkbox is ABSENT from FormData, so we
      // can't detect the toggle by its own key). A form without the marker never touches
      // these — no clobbering from the schedule/person editors.
      ...(formData.get("advanced_present") === "1"
        ? {
            strict_order: formData.get("strict_order") === "on",
            celebration_style: pick(formData.get("celebration_style"), ["auto", "confetti", "calm", "voyage"]),
            sensory_intensity: pick(formData.get("sensory_intensity"), ["calm", "standard", "vivid"]),
          }
        : {}),
      // P2 §2.2: a routine may point at a household schedule template. Only write the
      // link when the form actually rendered the field — a save from a form without it
      // must not silently clear an existing template reference.
      ...(formData.get("schedule_template_id") !== null
        ? { schedule_template_id: str(formData.get("schedule_template_id")) }
        : {}),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/app/children/${childId}`);
  revalidatePath("/app/schedule");
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
  // ── Need-based templates (HARBOR_V2 §9.2.10) — designed around how kids work,
  //    not just grade level. Short, concrete, low-overwhelm. ─────────────────
  adhd_morning: {
    name: "ADHD-friendly morning",
    type: "schedule",
    steps: [
      { icon: "🌅", label: "Wake up + big stretch" },
      { icon: "💧", label: "Drink some water" },
      { icon: "👕", label: "Clothes (laid out)", points: 5 },
      { icon: "🥣", label: "Breakfast", points: 5 },
      { icon: "🪥", label: "Brush teeth", points: 5 },
      { icon: "🎒", label: "Bag by the door", points: 5 },
    ],
  },
  autism_bedtime: {
    name: "Autism-friendly bedtime",
    type: "schedule",
    steps: [
      { icon: "🔔", label: "5-minute warning" },
      { icon: "🛁", label: "Bath / wash up" },
      { icon: "🌙", label: "Pajamas", points: 5 },
      { icon: "🪥", label: "Brush teeth", points: 5 },
      { icon: "📖", label: "Same story", points: 5 },
      { icon: "💡", label: "Dim the lights" },
      { icon: "🧸", label: "Cozy in bed" },
    ],
  },
  anxiety_winddown: {
    name: "Anxiety wind-down",
    type: "schedule",
    steps: [
      { icon: "🫧", label: "Slow belly breaths" },
      { icon: "🍵", label: "Warm drink" },
      { icon: "🧩", label: "Quiet, easy activity" },
      { icon: "🗒️", label: "Look at tomorrow together" },
      { icon: "🛏️", label: "Cozy up" },
    ],
  },
  low_demand: {
    name: "Low-demand day",
    type: "schedule",
    steps: [
      { icon: "🍎", label: "Eat something" },
      { icon: "💧", label: "Drink water" },
      { icon: "👕", label: "Comfy clothes" },
      { icon: "💛", label: "One kind thing" },
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

// ── Template & step library (P3 §9) — data-driven, curated + save-your-own ────
type TplStep = { icon?: string; label?: string; points?: number; kind?: string; step_type?: string };
type TplContent = { type?: string; strict_order?: boolean; sensory_intensity?: string; celebration_style?: string; steps?: TplStep[] };

/** Create a routine from a library template (curated or a household-saved one). RLS on
 *  routine_templates returns curated (null household) + this household's own rows only. */
export async function addRoutineFromLibraryTemplate(childId: string, formData: FormData) {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household found.");
  const templateId = str(formData.get("template_id"));
  if (!templateId) throw new Error("Pick a template.");
  const supabase = await createClient();
  const { data: tpl } = await supabase
    .from("routine_templates")
    .select("id, name, content")
    .eq("id", templateId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!tpl) throw new Error("That template isn't available.");
  const content = (tpl.content ?? {}) as TplContent;
  const steps = Array.isArray(content.steps) ? content.steps : [];
  const order = await nextOrder("routines", "sort_order", "child_id", childId);
  const { data: routine, error } = await supabase
    .from("routines")
    .insert({
      child_id: childId,
      name: tpl.name,
      type: content.type === "first_then" ? "first_then" : "schedule",
      strict_order: content.strict_order === true,
      sensory_intensity: pick(content.sensory_intensity ?? null, ["calm", "standard", "vivid"]),
      celebration_style: pick(content.celebration_style ?? null, ["auto", "confetti", "calm", "voyage"]),
      sort_order: order,
    })
    .select("id")
    .single();
  if (error || !routine) throw new Error(error?.message ?? "Could not create the routine.");
  if (steps.length) {
    const rows = steps.slice(0, 30).map((s, i) => ({
      routine_id: routine.id,
      label: String(s.label ?? "Step").slice(0, 80),
      icon: s.icon ? String(s.icon).slice(0, 8) : null,
      step_type: (s.step_type === "first" || s.step_type === "then" ? s.step_type : "task") as "task" | "first" | "then",
      kind: (STEP_KINDS as readonly string[]).includes(String(s.kind)) ? String(s.kind) : "standard",
      reward_points: Math.max(0, Math.trunc(Number(s.points ?? 0)) || 0),
      order_index: i,
    }));
    const { error: e2 } = await supabase.from("routine_steps").insert(rows);
    if (e2) throw new Error(e2.message);
  }
  revalidatePath(`/app/children/${childId}`);
}

/** Save a child routine (and its steps) as a reusable household template (§9). */
export async function saveRoutineAsTemplate(routineId: string, childId: string) {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household found.");
  const supabase = await createClient();
  const { data: r } = await supabase
    .from("routines")
    .select("id, name, type, strict_order, sensory_intensity, celebration_style, child_id")
    .eq("id", routineId)
    .eq("child_id", childId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!r) throw new Error("Routine not found in your household.");
  const { data: steps } = await supabase
    .from("routine_steps")
    .select("label, icon, reward_points, kind, step_type, order_index")
    .eq("routine_id", routineId)
    .is("deleted_at", null)
    .order("order_index");
  const content = {
    type: r.type,
    strict_order: r.strict_order ?? false,
    sensory_intensity: r.sensory_intensity ?? undefined,
    celebration_style: r.celebration_style ?? undefined,
    steps: (steps ?? []).map((s) => ({
      icon: s.icon ?? undefined,
      label: s.label,
      points: s.reward_points,
      kind: s.kind ?? "standard",
      step_type: s.step_type,
    })),
  };
  const { data: last } = await supabase
    .from("routine_templates")
    .select("sort_order")
    .eq("household_id", household.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("routine_templates").insert({
    household_id: household.id,
    name: r.name,
    emoji: "⭐",
    description: "Saved from your routines",
    content: content as unknown as Json,
    sort_order: ((last?.sort_order as number) ?? -1) + 1,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/app/children/${childId}`);
  revalidatePath("/app/schedule");
}

/** Hub variant (§12 Routines section): apply a template to a child picked in the form.
 *  Reuses addRoutineFromLibraryTemplate (which validates + RLS-scopes the insert). */
export async function applyTemplate(formData: FormData) {
  const childId = str(formData.get("child_id"));
  if (!childId) throw new Error("Pick a child for this template.");
  await addRoutineFromLibraryTemplate(childId, formData);
  revalidatePath("/app/routines");
}

/** Delete a household-saved template (never a curated one — RLS blocks that anyway). */
export async function deleteRoutineTemplate(id: string, childId: string) {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household found.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("routine_templates")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("household_id", household.id);
  if (error) throw new Error(error.message);
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
  const kind = pick(formData.get("kind"), STEP_KINDS) ?? "standard";
  // The health rule (§4.3/§8.2): a self-care/health step carries NO stars.
  const noPoints = formData.get("no_points") === "on";
  const { error } = await supabase.from("routine_steps").insert({
    routine_id: routineId,
    label: String(formData.get("label") || "New step"),
    icon: str(formData.get("icon")),
    step_type: (String(formData.get("step_type") || "task")) as
      | "task"
      | "first"
      | "then",
    kind,
    reward_points: noPoints ? 0 : Math.max(0, int(formData.get("reward_points"), 0)),
    choice_options: kind === "choice" ? optionsJson(formData.get("choice_options")) : null,
    substeps: kind === "substep" ? optionsJson(formData.get("substeps")) : null,
    order_index: await nextOrder("routine_steps", "order_index", "routine_id", routineId),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/app/children/${childId}`);
}

export async function updateStep(id: string, childId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const durationRaw = formData.get("duration_min");
  const kind = pick(formData.get("kind"), STEP_KINDS) ?? "standard";
  const noPoints = formData.get("no_points") === "on";
  const { error } = await supabase
    .from("routine_steps")
    .update({
      label: String(formData.get("label") || ""),
      icon: str(formData.get("icon")),
      step_type: (String(formData.get("step_type") || "task")) as
        | "task"
        | "first"
        | "then",
      kind,
      reward_points: noPoints ? 0 : Math.max(0, int(formData.get("reward_points"), 0)),
      start_time: str(formData.get("start_time")),
      duration_min: durationRaw ? int(durationRaw) : null,
      // Advanced per-step fields (§8.2). choice_options/substeps are cleared unless the
      // step is that kind, so switching kind never leaves orphaned data behind.
      read_aloud: str(formData.get("read_aloud")),
      hint: str(formData.get("hint")),
      why_note: str(formData.get("why_note")),
      sensory_note: str(formData.get("sensory_note")),
      choice_options: kind === "choice" ? optionsJson(formData.get("choice_options")) : null,
      substeps: kind === "substep" ? optionsJson(formData.get("substeps")) : null,
      ...(formData.has("support_level")
        ? { support_level: Math.min(4, Math.max(1, int(formData.get("support_level"), 1))) }
        : {}),
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

// ── House rules + consequence ladder ──────────────────────────────────────────
export async function addHouseRule(kind: string, formData: FormData) {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household found.");
  const k = kind === "consequence" ? "consequence" : "rule";
  const title = String(formData.get("title") || "").trim().slice(0, 80);
  if (!title) return;
  const detail = String(formData.get("detail") || "").trim().slice(0, 200) || null;
  const emoji = String(formData.get("emoji") || "").trim().slice(0, 8) || null;
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("house_rules")
    .select("sort_order")
    .eq("household_id", household.id)
    .eq("kind", k)
    .is("deleted_at", null)
    .order("sort_order", { ascending: false })
    .limit(1);
  const sort_order = ((last?.[0]?.sort_order as number) ?? -1) + 1;
  const { error } = await supabase.from("house_rules").insert({
    household_id: household.id,
    kind: k,
    title,
    detail,
    emoji,
    sort_order,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/app/rules");
}

export async function updateHouseRule(id: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const title = String(formData.get("title") || "").trim().slice(0, 80);
  if (!title) return;
  const detail = String(formData.get("detail") || "").trim().slice(0, 200) || null;
  const emoji = String(formData.get("emoji") || "").trim().slice(0, 8) || null;
  const { error } = await supabase.from("house_rules").update({ title, detail, emoji }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/rules");
}

export async function deleteHouseRule(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("house_rules")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/rules");
}

/** Move a rule/consequence up or down within its kind by swapping sort_order. */
export async function moveHouseRule(id: string, dir: "up" | "down") {
  await requireUser();
  const supabase = await createClient();
  const { data: row } = await supabase.from("house_rules").select("id, household_id, kind").eq("id", id).maybeSingle();
  if (!row) return;
  const { data: siblings } = await supabase
    .from("house_rules")
    .select("id, sort_order")
    .eq("household_id", row.household_id)
    .eq("kind", row.kind)
    .is("deleted_at", null)
    .order("sort_order");
  const list = siblings ?? [];
  const idx = list.findIndex((s) => s.id === id);
  const swap = dir === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swap < 0 || swap >= list.length) return;
  const a = list[idx];
  const b = list[swap];
  await supabase.from("house_rules").update({ sort_order: b.sort_order }).eq("id", a.id);
  await supabase.from("house_rules").update({ sort_order: a.sort_order }).eq("id", b.id);
  revalidatePath("/app/rules");
}

/** One-tap starter set: a few calm rules + a gentle consequence ladder. */
export async function seedHouseRules() {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household found.");
  const supabase = await createClient();
  const { count } = await supabase
    .from("house_rules")
    .select("id", { count: "exact", head: true })
    .eq("household_id", household.id)
    .is("deleted_at", null);
  if ((count ?? 0) > 0) return; // never double-seed
  const rules = [
    { emoji: "💛", title: "Be kind with words and hands" },
    { emoji: "👂", title: "Listen the first time" },
    { emoji: "🧹", title: "Clean up your own mess" },
    { emoji: "✅", title: "Chores and routines before screens" },
    { emoji: "🙏", title: "Tell the truth" },
  ];
  const ladder = [
    { emoji: "💬", title: "Gentle reminder", detail: "A calm heads-up about the choice." },
    { emoji: "⏸️", title: "Warning", detail: "Last chance to turn it around." },
    { emoji: "📵", title: "Lose a privilege", detail: "Tablet or TV time for the day." },
    { emoji: "🌱", title: "Reset", detail: "A short reset to start fresh." },
  ];
  const rows = [
    ...rules.map((r, i) => ({ household_id: household.id, kind: "rule", title: r.title, emoji: r.emoji, detail: null, sort_order: i })),
    ...ladder.map((r, i) => ({ household_id: household.id, kind: "consequence", title: r.title, emoji: r.emoji, detail: r.detail, sort_order: i })),
  ];
  const { error } = await supabase.from("house_rules").insert(rows);
  if (error) throw new Error(error.message);
  revalidatePath("/app/rules");
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

// ── Family people (Brand-True §4.1–4.2): parents/caregivers/siblings on the wall ──
// People appear on the wall as PARTICIPANTS. Their routines earn NO points (health/
// adulthood isn't gamified) — modeling is the value. A routine can be "together".
const PERSON_ROLES = ["parent", "caregiver", "sibling"] as const;

export async function addPerson(formData: FormData) {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household found.");
  const supabase = await createClient();
  const order = await nextOrder("people", "sort_order", "household_id", household.id);
  const role = String(formData.get("role") || "parent");
  const { error } = await supabase.from("people").insert({
    household_id: household.id,
    name: String(formData.get("name") || "New person"),
    avatar: str(formData.get("avatar")) ?? "💙",
    role: (PERSON_ROLES as readonly string[]).includes(role) ? role : "parent",
    color: CHILD_PALETTE[order % CHILD_PALETTE.length].value,
    sort_order: order,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/app/family");
}

export async function updatePerson(id: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const color = str(formData.get("color"));
  const { error } = await supabase
    .from("people")
    .update({
      name: String(formData.get("name") || ""),
      avatar: str(formData.get("avatar")),
      role: String(formData.get("role") || "parent"),
      ...(color ? { color } : {}),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/family");
}

export async function deletePerson(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("people").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/family");
}

export async function addPersonRoutine(personId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("routines").insert({
    person_id: personId,
    child_id: null,
    name: String(formData.get("name") || "New routine"),
    type: "schedule",
    together: formData.get("together") === "on",
    with_child_id: str(formData.get("with_child_id")),
    sort_order: await nextOrder("routines", "sort_order", "person_id", personId),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/app/family");
}

export async function updatePersonRoutine(id: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const days = formData.getAll("days").map((d) => Number(d)).filter((n) => Number.isFinite(n));
  const { error } = await supabase
    .from("routines")
    .update({
      name: String(formData.get("name") || ""),
      active: formData.get("active") === "on",
      together: formData.get("together") === "on",
      with_child_id: str(formData.get("with_child_id")),
      days_of_week: days.length ? days : null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/family");
}

export async function deletePersonRoutine(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("routines").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/family");
}

export async function addPersonStep(routineId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("routine_steps").insert({
    routine_id: routineId,
    label: String(formData.get("label") || "New step"),
    icon: str(formData.get("icon")),
    step_type: "task",
    reward_points: 0, // people never earn points
    order_index: await nextOrder("routine_steps", "order_index", "routine_id", routineId),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/app/family");
}

export async function deletePersonStep(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("routine_steps").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/family");
}

// ── Medication Station (Brand-True §4.3) — a tracker + calm ritual, NO points ──
// Harbor does not dispense or dose; it tracks and gently reminds. The parent is in charge.
function parseTimes(v: FormDataEntryValue | null): string[] {
  return String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^\d{1,2}:\d{2}$/.test(s))
    .map((s) => s.padStart(5, "0"));
}

export async function addMedication(childId: string, formData: FormData) {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household found.");
  const supabase = await createClient();
  const { error } = await supabase.from("medications").insert({
    household_id: household.id,
    child_id: childId,
    name: String(formData.get("name") || "Medicine"),
    dose: str(formData.get("dose")),
    icon: str(formData.get("icon")) ?? "💊",
    helps_note: str(formData.get("helps_note")),
    schedule_times: parseTimes(formData.get("times")),
    with_food: formData.get("with_food") === "on",
    parent_administered: formData.get("parent_administered") === "on",
    sort_order: await nextOrder("medications", "sort_order", "child_id", childId),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/app/medication");
}

export async function updateMedication(id: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const days = formData.getAll("days").map((d) => Number(d)).filter((n) => Number.isFinite(n));
  const { error } = await supabase
    .from("medications")
    .update({
      name: String(formData.get("name") || ""),
      dose: str(formData.get("dose")),
      icon: str(formData.get("icon")),
      helps_note: str(formData.get("helps_note")),
      schedule_times: parseTimes(formData.get("times")),
      days_of_week: days.length ? days : null,
      with_food: formData.get("with_food") === "on",
      parent_administered: formData.get("parent_administered") === "on",
      active: formData.get("active") === "on",
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/medication");
}

export async function deleteMedication(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("medications").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/medication");
}

// ── Devices (Wall & Device Management D1) ─────────────────────────────────────
// Identity + lifecycle for paired devices. PIN-gated in the app; RLS scopes every
// row to the parent's household (migration 0050). Type/child binding is set when a
// device is added; live reassignment of an already-paired device waits for D3 (it
// needs the snapshot to carry device identity, or the device re-pairs).

/** Mint a new pairing code with identity, ready for the parent to enter on the device. */
export async function addDevice(formData: FormData) {
  const me = await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household.");
  const supabase = await createClient();

  const kind = formData.get("kind") === "outpost" ? "outpost" : "wall";
  const child_id = kind === "outpost" ? str(formData.get("child_id")) : null;
  if (kind === "outpost") {
    if (!child_id) throw new Error("Pick a child for the room device.");
    const { data: ok } = await supabase
      .from("children")
      .select("id")
      .eq("id", child_id)
      .eq("household_id", household.id)
      .maybeSingle();
    if (!ok) throw new Error("That child isn't in your household.");
  }

  const { error } = await supabase.from("device_pairings").insert({
    household_id: household.id,
    code: generatePairingCode(),
    status: "pending",
    kind,
    child_id,
    device_label: str(formData.get("device_label")),
    icon: str(formData.get("icon")),
    color: str(formData.get("color")),
    paired_by: me.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/app/devices");
}

/** Rename / re-icon / re-color a device (parent-side identity). */
export async function updateDevice(id: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("device_pairings")
    .update({
      device_label: str(formData.get("device_label")),
      icon: str(formData.get("icon")),
      color: str(formData.get("color")),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/devices");
}

/** Per-device settings (Device Management D2) — merged into settings_json so the device
 *  overrides household defaults (e.g. a bedroom Outpost sleeps earlier). Blank = inherit. */
export async function updateDeviceSettings(id: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const { data: cur } = await supabase.from("device_pairings").select("settings_json").eq("id", id).maybeSingle();
  const next: Record<string, unknown> = { ...((cur?.settings_json as Record<string, unknown>) ?? {}) };

  next.screensaver = formData.get("screensaver") === "on";
  const idle = str(formData.get("idleSeconds"));
  if (idle && Number(idle) > 0) next.idleSeconds = Math.trunc(Number(idle));
  else delete next.idleSeconds;
  const qs = str(formData.get("quietStart"));
  if (qs) next.quietStart = qs; else delete next.quietStart;
  const qe = str(formData.get("quietEnd"));
  if (qe) next.quietEnd = qe; else delete next.quietEnd;

  const { error } = await supabase
    .from("device_pairings")
    .update({ settings_json: next as unknown as Json })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/devices");
}

/** Queue a remote command for a device (Device Management D3). The device pops it on its
 *  next check-in (≤30s) and acts: "refresh" clears caches + reloads to the latest build
 *  (the remote fix for a stale wall); "identify" makes it flash + chime + show its name. */
export async function deviceCommand(id: string, action: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("device_pairings").update({ pending_command: action }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/devices");
}

/** Remove a device — revokes its access (the row is deleted, so its device-secret no
 *  longer matches a paired row and rpc_kiosk_pull/push reject it). The device falls
 *  back to the pairing screen on its next connect. (Remote wipe is D3.) */
export async function unpairDevice(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("device_pairings").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/devices");
}

// ── Ask Harbor — the parent voice Copilot (AI-Led Voice §3.4) ─────────────────
// A parent asks naturally about their kids or for gentle, practical help. Grounded in
// their REAL household data (request-scoped → RLS-confined to their household); warm +
// concrete; DEFERS clinical/medical questions to a provider; never invents; drafts things
// the parent then applies via the normal editors. Adult-facing (no child-safety bounds),
// read/advise/draft only — it never mutates the household on its own.
export async function askHarbor(question: string): Promise<{ answer: string }> {
  await requireUser();
  const q = (question || "").trim();
  if (!q) return { answer: "" };
  if (q.length > 800) return { answer: "Could you ask that in a sentence or two? It helps me give a focused answer." };

  const household = await getMyHousehold();
  if (!household) return { answer: "No household yet." };
  const ai = await getHouseholdAi(household.id);
  if (!ai || !ai.enabled) {
    return {
      answer:
        "Ask Harbor needs the AI companion turned on — add your Anthropic key and enable it in Settings → AI Companion.",
    };
  }

  const supabase = await createClient();
  const { data: kids } = await supabase
    .from("children")
    .select("id, name, birthday, settings, ai_profile")
    .eq("household_id", household.id)
    .is("deleted_at", null)
    .order("sort_order");
  const kidList = kids ?? [];
  const ids = kidList.map((k) => k.id);

  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const [{ data: checks }, { data: routines }] = await Promise.all([
    supabase.from("check_ins").select("child_id, feeling").in("child_id", ids).gte("created_at", since),
    supabase.from("routines").select("child_id, name").in("child_id", ids).is("deleted_at", null),
  ]);

  const ageOf = (b: string | null) => {
    if (!b) return null;
    const y = Math.floor((Date.now() - new Date(b).getTime()) / (365.25 * 86_400_000));
    return Number.isFinite(y) && y > 0 && y < 25 ? y : null;
  };
  const context =
    kidList
      .map((k) => {
        const cs = (k.settings ?? {}) as Record<string, unknown>;
        const age = ageOf(k.birthday as string | null);
        const fcount: Record<string, number> = {};
        for (const c of checks ?? []) if (c.child_id === k.id) fcount[c.feeling] = (fcount[c.feeling] ?? 0) + 1;
        const topFeelings = Object.entries(fcount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([f, n]) => `${f}×${n}`)
          .join(", ");
        const rnames = (routines ?? []).filter((r) => r.child_id === k.id).map((r) => r.name).join(", ");
        return (
          `- ${k.name}${age ? `, ${age}y` : ""}${cs.sensory ? `, ${cs.sensory} sensory` : ""}. ` +
          `Routines: ${rnames || "none"}. Last 2 weeks of feelings: ${topFeelings || "none logged"}.` +
          (k.ai_profile ? ` Parent notes: ${String(k.ai_profile).slice(0, 200)}` : "")
        );
      })
      .join("\n") || "(no children set up yet)";

  const system =
    "You are Harbor's Copilot for a PARENT of neurodivergent / high-needs kids. Be warm, calm, and " +
    "PRACTICAL — concrete, doable suggestions, never platitudes. Ground every answer in the household " +
    "data provided; never invent facts about a child. If they ask you to make something (a calmer " +
    "routine, a social story, a week summary), draft it clearly so they can use it in Harbor. " +
    "You are NOT a clinician: for medical, diagnostic, medication, or safety questions, say plainly that " +
    "you can't give medical advice and point them to their pediatrician or therapist. Keep answers " +
    "focused and kind — a few short paragraphs at most.";

  const prompt = `The family:\n${context}\n\nThe parent asks: "${q}"`;

  try {
    const answer = await haikuText({ key: ai.key, system, prompt, maxTokens: 600 });
    return { answer: answer || "I couldn't find an answer for that — try rephrasing?" };
  } catch (e) {
    return { answer: aiErrorMessage(e) };
  }
}
