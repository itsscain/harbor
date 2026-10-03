"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getMyHousehold } from "@/lib/household";
import { CHILD_PALETTE } from "@/lib/kiosk/colors";
import { presetForName } from "@/lib/routine-presets";
import type { Json } from "@/lib/database.types";

// Kid + routine actions for the redesigned Kids area. Small, single-purpose, and every one RETURNS
// an honest result for the toast ({ ok, message?, id? } | { ok: false, error }). Deletes are soft so
// the toast's Undo can restore them. Routines/steps ride the <1s broadcast to every wall.

export type KidResult = { ok: true; message?: string; id?: string } | { ok: false; error: string };

const STEP_KINDS = ["standard", "approval", "together", "choice", "substep"] as const;
type StepKind = (typeof STEP_KINDS)[number];

const clip = (v: unknown, max: number): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, max) : null;
};
const clampInt = (v: unknown, lo: number, hi: number, fb = 0): number => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fb;
};
const hhmm = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return /^\d{2}:\d{2}$/.test(s) ? s : null;
};
const daysOrNull = (days: number[]): number[] | null => {
  const clean = Array.from(new Set(days.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))).sort();
  return clean.length === 0 || clean.length === 7 ? null : clean;
};

async function ctx() {
  const profile = await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household found.");
  const supabase = await createClient();
  return { profile, household, supabase };
}

type Db = Awaited<ReturnType<typeof createClient>>;

async function routineRow(supabase: Db, routineId: string) {
  const { data } = await supabase
    .from("routines")
    .select("id, child_id, scope, assigned_child_ids, household_id, name, type, start_time, end_time, days_of_week, strict_order, celebration_style, sensory_intensity, active")
    .eq("id", routineId)
    .is("deleted_at", null)
    .maybeSingle();
  return data;
}

const kidsOf = (r: { child_id: string | null; assigned_child_ids: string[] | null }) =>
  r.child_id ? [r.child_id] : (r.assigned_child_ids ?? []);

function touch(kidIds: string[], routineId?: string) {
  revalidatePath("/app");
  for (const id of kidIds) {
    revalidatePath(`/app/children/${id}`);
    if (routineId) revalidatePath(`/app/children/${id}/routines/${routineId}`);
  }
}

async function nextRoutineOrder(supabase: Db, childId: string): Promise<number> {
  const { data } = await supabase.from("routines").select("sort_order").eq("child_id", childId).order("sort_order", { ascending: false }).limit(1);
  return ((data?.[0]?.sort_order as number) ?? -1) + 1;
}

// ── Kids ─────────────────────────────────────────────────────────────────────
export async function quickAddChild(formData: FormData): Promise<KidResult> {
  const { household, supabase } = await ctx();
  const name = clip(formData.get("name"), 40);
  if (!name) return { ok: false, error: "What's their name?" };
  const { data: last } = await supabase
    .from("children")
    .select("sort_order")
    .eq("household_id", household.id)
    .order("sort_order", { ascending: false })
    .limit(1);
  const order = ((last?.[0]?.sort_order as number) ?? -1) + 1;
  const { data, error } = await supabase
    .from("children")
    .insert({
      household_id: household.id,
      name,
      avatar: clip(formData.get("avatar"), 8) ?? "🦊",
      color: clip(formData.get("color"), 9) ?? CHILD_PALETTE[order % CHILD_PALETTE.length].value,
      birthday: clip(formData.get("birthday"), 10),
      sort_order: order,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "Couldn't add them. Try again." };
  revalidatePath("/app");
  revalidatePath("/app/children");
  return { ok: true, id: data.id, message: `Welcome, ${name}!` };
}

export async function updateKidProfile(childId: string, formData: FormData): Promise<KidResult> {
  const { supabase } = await ctx();
  const name = clip(formData.get("name"), 40);
  if (!name) return { ok: false, error: "They need a name." };
  const color = clip(formData.get("color"), 9);
  const { error } = await supabase
    .from("children")
    .update({
      name,
      avatar: clip(formData.get("avatar"), 8),
      birthday: clip(formData.get("birthday"), 10),
      ...(color ? { color } : {}),
    })
    .eq("id", childId);
  if (error) return { ok: false, error: "Couldn't save that. Try again." };
  revalidatePath("/app");
  revalidatePath("/app/children");
  revalidatePath(`/app/children/${childId}`);
  return { ok: true, message: "Saved" };
}

/** Merge just the provided wall-feel settings (autosave-friendly; never clobbers the rest). */
export async function setKidSettings(
  childId: string,
  patch: { sensory?: "calm" | "standard" | "vivid"; readAloud?: boolean; sound?: boolean; reducedMotion?: boolean; bedtime?: string | null },
): Promise<KidResult> {
  const { supabase } = await ctx();
  const { data: kid } = await supabase.from("children").select("settings").eq("id", childId).maybeSingle();
  if (!kid) return { ok: false, error: "That child isn't in your family." };
  const next: Record<string, unknown> = { ...((kid.settings ?? {}) as Record<string, unknown>) };
  if (patch.sensory && ["calm", "standard", "vivid"].includes(patch.sensory)) next.sensory = patch.sensory;
  if (typeof patch.readAloud === "boolean") next.readAloud = patch.readAloud;
  if (typeof patch.sound === "boolean") next.sound = patch.sound;
  if (typeof patch.reducedMotion === "boolean") next.reducedMotion = patch.reducedMotion;
  if (patch.bedtime !== undefined) next.bedtime = patch.bedtime === null ? null : hhmm(patch.bedtime);
  const { error } = await supabase.from("children").update({ settings: next as Json }).eq("id", childId);
  if (error) return { ok: false, error: "Couldn't save that. Try again." };
  revalidatePath(`/app/children/${childId}`);
  return { ok: true, message: "Saved" };
}

export async function hideKid(childId: string): Promise<KidResult> {
  const { supabase } = await ctx();
  const { error } = await supabase.from("children").update({ deleted_at: new Date().toISOString() }).eq("id", childId);
  if (error) return { ok: false, error: "Couldn't do that. Try again." };
  revalidatePath("/app");
  revalidatePath("/app/children");
  return { ok: true, message: "Hidden from the wall" };
}

export async function restoreKid(childId: string): Promise<KidResult> {
  const { supabase } = await ctx();
  const { error } = await supabase.from("children").update({ deleted_at: null }).eq("id", childId);
  if (error) return { ok: false, error: "Couldn't bring them back." };
  revalidatePath("/app");
  revalidatePath("/app/children");
  return { ok: true, message: "Back on the wall" };
}

/** "Set stars to N" — writes the difference through the same atomic ledger RPC. */
export async function setStarsTo(childId: string, target: number): Promise<KidResult> {
  const { supabase } = await ctx();
  const t = clampInt(target, 0, 100000);
  const { data: rw } = await supabase.from("rewards").select("points_total").eq("child_id", childId).maybeSingle();
  const delta = t - (rw?.points_total ?? 0);
  if (delta === 0) return { ok: true, message: "No change" };
  const { error } = await supabase.rpc("rpc_parent_adjust_points", { p_child: childId, p_delta: delta, p_reason: "adjust:Set by a grown-up" });
  if (error) return { ok: false, error: "Couldn't update stars. Try again." };
  touch([childId]);
  return { ok: true, message: `Stars set to ${t}` };
}

// ── Routines ─────────────────────────────────────────────────────────────────
export async function createBlankRoutine(childId: string, name: string): Promise<KidResult> {
  const { supabase } = await ctx();
  const n = clip(name, 60) ?? "New routine";
  const when = presetForName(n);
  const { data, error } = await supabase
    .from("routines")
    .insert({
      child_id: childId,
      name: n,
      type: "schedule",
      start_time: when?.start ?? null,
      end_time: when?.end ?? null,
      sort_order: await nextRoutineOrder(supabase, childId),
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "Couldn't create the routine. Try again." };
  touch([childId]);
  return { ok: true, id: data.id, message: `${n} added` };
}

type TplStep = { icon?: string; label?: string; points?: number; kind?: string; step_type?: string };
type TplContent = { type?: string; strict_order?: boolean; steps?: TplStep[] };

async function insertFromTemplate(supabase: Db, childId: string, tpl: { name: string; content: unknown }, order: number) {
  const content = (tpl.content ?? {}) as TplContent;
  const when = presetForName(tpl.name);
  const { data: routine, error } = await supabase
    .from("routines")
    .insert({
      child_id: childId,
      name: tpl.name,
      type: content.type === "first_then" ? "first_then" : "schedule",
      strict_order: content.strict_order === true,
      start_time: when?.start ?? null,
      end_time: when?.end ?? null,
      sort_order: order,
    })
    .select("id")
    .single();
  if (error || !routine) return null;
  const steps = Array.isArray(content.steps) ? content.steps : [];
  if (steps.length) {
    await supabase.from("routine_steps").insert(
      steps.slice(0, 30).map((s, i) => ({
        routine_id: routine.id,
        label: String(s.label ?? "Step").slice(0, 80),
        icon: s.icon ? String(s.icon).slice(0, 8) : null,
        step_type: (s.step_type === "first" || s.step_type === "then" ? s.step_type : "task") as "task" | "first" | "then",
        kind: (STEP_KINDS as readonly string[]).includes(String(s.kind)) ? String(s.kind) : "standard",
        reward_points: Math.max(0, Math.trunc(Number(s.points ?? 0)) || 0),
        order_index: i,
      })),
    );
  }
  return routine.id as string;
}

export async function createRoutineFromTemplate(childId: string, templateId: string): Promise<KidResult> {
  const { supabase } = await ctx();
  const { data: tpl } = await supabase.from("routine_templates").select("name, content").eq("id", templateId).is("deleted_at", null).maybeSingle();
  if (!tpl) return { ok: false, error: "That template isn't available." };
  const id = await insertFromTemplate(supabase, childId, tpl, await nextRoutineOrder(supabase, childId));
  if (!id) return { ok: false, error: "Couldn't create the routine. Try again." };
  touch([childId]);
  return { ok: true, id, message: `${tpl.name} added` };
}

/** The one-tap starter set for a brand-new kid: Morning + After school + Bedtime. */
export async function addStarterRoutines(childId: string): Promise<KidResult> {
  const { supabase } = await ctx();
  const { data: tpls } = await supabase
    .from("routine_templates")
    .select("name, content")
    .is("household_id", null)
    .is("deleted_at", null)
    .in("name", ["Morning", "After school", "Bedtime"]);
  const ordered = ["Morning", "After school", "Bedtime"].map((n) => (tpls ?? []).find((t) => t.name === n)).filter(Boolean) as {
    name: string;
    content: unknown;
  }[];
  if (!ordered.length) return { ok: false, error: "Starter routines aren't available right now." };
  let order = await nextRoutineOrder(supabase, childId);
  const added: string[] = [];
  for (const t of ordered) if (await insertFromTemplate(supabase, childId, t, order++)) added.push(t.name);
  if (!added.length) return { ok: false, error: "Couldn't add the routines. Try again." };
  touch([childId]);
  return { ok: true, message: `Added ${added.join(", ")}` };
}

/** Copy a routine (and its steps) to another kid. */
export async function copyRoutineToKid(routineId: string, targetChildId: string): Promise<KidResult> {
  const { supabase } = await ctx();
  const r = await routineRow(supabase, routineId);
  if (!r) return { ok: false, error: "That routine isn't available." };
  const { data: copy, error } = await supabase
    .from("routines")
    .insert({
      child_id: targetChildId,
      name: r.name,
      type: r.type,
      start_time: r.start_time,
      end_time: r.end_time,
      days_of_week: r.days_of_week,
      strict_order: r.strict_order,
      celebration_style: r.celebration_style,
      sensory_intensity: r.sensory_intensity,
      sort_order: await nextRoutineOrder(supabase, targetChildId),
    })
    .select("id")
    .single();
  if (error || !copy) return { ok: false, error: "Couldn't copy that routine." };
  const { data: steps } = await supabase
    .from("routine_steps")
    .select("label, icon, photo_url, step_type, reward_points, start_time, duration_min, support_level, kind, read_aloud, hint, choice_options, substeps, order_index")
    .eq("routine_id", routineId)
    .is("deleted_at", null)
    .order("order_index");
  if (steps?.length) {
    await supabase.from("routine_steps").insert(steps.map((s) => ({ ...s, routine_id: copy.id })));
  }
  touch([targetChildId]);
  return { ok: true, id: copy.id, message: "Copied" };
}

/** Save a routine (and its steps) as one of your own templates — it shows up under
 *  "Add a routine" for every kid, marked "Yours". */
export async function saveAsTemplate(routineId: string): Promise<KidResult> {
  const { household, supabase } = await ctx();
  const r = await routineRow(supabase, routineId);
  if (!r) return { ok: false, error: "That routine isn't available." };
  const { data: steps } = await supabase
    .from("routine_steps")
    .select("label, icon, reward_points, kind, step_type")
    .eq("routine_id", routineId)
    .is("deleted_at", null)
    .order("order_index");
  const content = {
    type: r.type,
    strict_order: r.strict_order ?? false,
    steps: (steps ?? []).map((s) => ({ icon: s.icon ?? undefined, label: s.label, points: s.reward_points, kind: s.kind ?? "standard", step_type: s.step_type })),
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
  if (error) return { ok: false, error: "Couldn't save the template." };
  touch(kidsOf(r));
  return { ok: true, message: `Saved — “${r.name}” is now in Add a routine` };
}

/** Remove one of your own saved templates (curated ones can't be removed). Undo restores it. */
export async function deleteSavedTemplate(id: string): Promise<KidResult> {
  const { household, supabase } = await ctx();
  const { error } = await supabase.from("routine_templates").update({ deleted_at: new Date().toISOString() }).eq("id", id).eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't remove that template." };
  revalidatePath("/app/children", "layout");
  return { ok: true, message: "Template removed" };
}

export async function restoreSavedTemplate(id: string): Promise<KidResult> {
  const { household, supabase } = await ctx();
  const { error } = await supabase.from("routine_templates").update({ deleted_at: null }).eq("id", id).eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't bring it back." };
  revalidatePath("/app/children", "layout");
  return { ok: true, message: "Restored" };
}

export async function renameRoutine(routineId: string, name: string): Promise<KidResult> {
  const { supabase } = await ctx();
  const n = clip(name, 60);
  if (!n) return { ok: false, error: "Give it a name." };
  const r = await routineRow(supabase, routineId);
  if (!r) return { ok: false, error: "That routine isn't available." };
  const { error } = await supabase.from("routines").update({ name: n }).eq("id", routineId);
  if (error) return { ok: false, error: "Couldn't rename it." };
  touch(kidsOf(r), routineId);
  return { ok: true, message: "Renamed" };
}

/** Set the routine's own time window (null = any time). Detaches any shared time slot. */
export async function setRoutineWindow(routineId: string, start: string | null, end: string | null): Promise<KidResult> {
  const { supabase } = await ctx();
  const r = await routineRow(supabase, routineId);
  if (!r) return { ok: false, error: "That routine isn't available." };
  const { error } = await supabase
    .from("routines")
    .update({ start_time: hhmm(start), end_time: hhmm(end), schedule_template_id: null })
    .eq("id", routineId);
  if (error) return { ok: false, error: "Couldn't save the time." };
  touch(kidsOf(r), routineId);
  return { ok: true, message: "Time saved" };
}

export async function setRoutineDays(routineId: string, days: number[]): Promise<KidResult> {
  const { supabase } = await ctx();
  const r = await routineRow(supabase, routineId);
  if (!r) return { ok: false, error: "That routine isn't available." };
  const { error } = await supabase.from("routines").update({ days_of_week: daysOrNull(days) }).eq("id", routineId);
  if (error) return { ok: false, error: "Couldn't save the days." };
  touch(kidsOf(r), routineId);
  return { ok: true, message: "Days saved" };
}

export async function setRoutineFlag(routineId: string, flag: "active" | "strict_order", value: boolean): Promise<KidResult> {
  const { supabase } = await ctx();
  const r = await routineRow(supabase, routineId);
  if (!r) return { ok: false, error: "That routine isn't available." };
  const patch = flag === "active" ? { active: value } : { strict_order: value };
  const { error } = await supabase.from("routines").update(patch).eq("id", routineId);
  if (error) return { ok: false, error: "Couldn't save that." };
  touch(kidsOf(r), routineId);
  return {
    ok: true,
    message: flag === "active" ? (value ? "Showing on the wall" : "Hidden from the wall") : value ? "Steps go in order" : "Any order",
  };
}

/** "Who does this?" — one kid keeps it a kid's routine; two or more makes it a family routine
 *  everyone shares (same steps, each kid's own checkmarks). */
export async function setRoutineKids(routineId: string, kidIds: string[]): Promise<KidResult> {
  const { household, supabase } = await ctx();
  const r = await routineRow(supabase, routineId);
  if (!r) return { ok: false, error: "That routine isn't available." };
  const wanted = Array.from(new Set(kidIds.filter(Boolean)));
  if (wanted.length === 0) return { ok: false, error: "At least one kid needs to do it." };
  const { data: valid } = await supabase.from("children").select("id").eq("household_id", household.id).in("id", wanted).is("deleted_at", null);
  const ids = (valid ?? []).map((k) => k.id);
  if (ids.length === 0) return { ok: false, error: "At least one kid needs to do it." };
  const update =
    ids.length === 1
      ? { scope: "child", child_id: ids[0], assigned_child_ids: null, household_id: household.id }
      : { scope: "shared", child_id: null, assigned_child_ids: ids, household_id: household.id };
  const { error } = await supabase.from("routines").update(update).eq("id", routineId);
  if (error) return { ok: false, error: "Couldn't change who does it." };
  touch([...kidsOf(r), ...ids], routineId);
  return { ok: true, message: ids.length === 1 ? "Just one kid now" : `Shared by ${ids.length} kids` };
}

export async function deleteRoutineSoft(routineId: string): Promise<KidResult> {
  const { supabase } = await ctx();
  const r = await routineRow(supabase, routineId);
  if (!r) return { ok: false, error: "That routine isn't available." };
  const { error } = await supabase.from("routines").update({ deleted_at: new Date().toISOString() }).eq("id", routineId);
  if (error) return { ok: false, error: "Couldn't delete it." };
  touch(kidsOf(r));
  return { ok: true, message: `${r.name} deleted` };
}

export async function restoreRoutine(routineId: string): Promise<KidResult> {
  const { supabase } = await ctx();
  const { data, error } = await supabase
    .from("routines")
    .update({ deleted_at: null })
    .eq("id", routineId)
    .select("child_id, assigned_child_ids")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Couldn't bring it back." };
  touch(kidsOf(data), routineId);
  return { ok: true, message: "Restored" };
}

// ── Steps ────────────────────────────────────────────────────────────────────
async function stepRoutine(supabase: Db, stepId: string) {
  const { data } = await supabase.from("routine_steps").select("routine_id").eq("id", stepId).maybeSingle();
  if (!data) return null;
  return routineRow(supabase, data.routine_id);
}

export async function addStepQuick(routineId: string, input: { label: string; icon?: string | null; points?: number }): Promise<KidResult> {
  const { supabase } = await ctx();
  const r = await routineRow(supabase, routineId);
  if (!r) return { ok: false, error: "That routine isn't available." };
  const label = clip(input.label, 80);
  if (!label) return { ok: false, error: "Name the step first." };
  const { data: last } = await supabase
    .from("routine_steps")
    .select("order_index")
    .eq("routine_id", routineId)
    .is("deleted_at", null)
    .order("order_index", { ascending: false })
    .limit(1);
  const { data, error } = await supabase
    .from("routine_steps")
    .insert({
      routine_id: routineId,
      label,
      icon: clip(input.icon, 8),
      step_type: "task",
      kind: "standard",
      reward_points: clampInt(input.points ?? 0, 0, 50),
      order_index: ((last?.[0]?.order_index as number) ?? -1) + 1,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "Couldn't add that step." };
  touch(kidsOf(r), routineId);
  return { ok: true, id: data.id, message: `Added "${label}"` };
}

/** Save a step from the step sheet. Options/substeps are kept only for their own kind. */
export async function saveStep(stepId: string, formData: FormData): Promise<KidResult> {
  const { supabase } = await ctx();
  const r = await stepRoutine(supabase, stepId);
  if (!r) return { ok: false, error: "That step isn't available." };
  const label = clip(formData.get("label"), 80);
  if (!label) return { ok: false, error: "Name the step first." };
  const kindRaw = String(formData.get("kind") ?? "standard");
  const kind: StepKind = (STEP_KINDS as readonly string[]).includes(kindRaw) ? (kindRaw as StepKind) : "standard";
  // "🍎 Apple" keeps its picture: a leading emoji becomes the option's icon on the wall.
  const list = (key: string) =>
    formData
      .getAll(key)
      .map((v) => String(v).trim())
      .filter(Boolean)
      .slice(0, 8)
      .map((text) => {
        const m = text.match(/^(\p{Extended_Pictographic}[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]*)\s*(.*)$/u);
        const icon = m?.[1] ?? null;
        const label = (m ? m[2] : text).trim().slice(0, 40) || text.slice(0, 40);
        return icon && m?.[2]?.trim() ? { icon, label } : { label };
      });
  const { error } = await supabase
    .from("routine_steps")
    .update({
      label,
      icon: clip(formData.get("icon"), 8),
      reward_points: clampInt(formData.get("points"), 0, 50),
      kind,
      hint: clip(formData.get("hint"), 140),
      read_aloud: clip(formData.get("read_aloud"), 140),
      choice_options: kind === "choice" ? (list("option") as unknown as Json) : null,
      substeps: kind === "substep" ? (list("option") as unknown as Json) : null,
    })
    .eq("id", stepId);
  if (error) return { ok: false, error: "Couldn't save that step." };
  touch(kidsOf(r), r.id);
  return { ok: true, message: "Step saved" };
}

export async function deleteStepSoft(stepId: string): Promise<KidResult> {
  const { supabase } = await ctx();
  const r = await stepRoutine(supabase, stepId);
  if (!r) return { ok: false, error: "That step isn't available." };
  const { error } = await supabase.from("routine_steps").update({ deleted_at: new Date().toISOString() }).eq("id", stepId);
  if (error) return { ok: false, error: "Couldn't remove that step." };
  touch(kidsOf(r), r.id);
  return { ok: true, message: "Step removed" };
}

export async function restoreStep(stepId: string): Promise<KidResult> {
  const { supabase } = await ctx();
  const { data, error } = await supabase.from("routine_steps").update({ deleted_at: null }).eq("id", stepId).select("routine_id").maybeSingle();
  if (error || !data) return { ok: false, error: "Couldn't bring it back." };
  const r = await routineRow(supabase, data.routine_id);
  if (r) touch(kidsOf(r), r.id);
  return { ok: true, message: "Restored" };
}

/** Save a whole new step order in one go (the old way did one round trip per position). */
export async function reorderSteps(routineId: string, orderedIds: string[]): Promise<KidResult> {
  const { supabase } = await ctx();
  const r = await routineRow(supabase, routineId);
  if (!r) return { ok: false, error: "That routine isn't available." };
  const ids = orderedIds.slice(0, 60);
  for (let i = 0; i < ids.length; i++) {
    const { error } = await supabase.from("routine_steps").update({ order_index: i }).eq("id", ids[i]).eq("routine_id", routineId);
    if (error) return { ok: false, error: "Couldn't save the new order." };
  }
  touch(kidsOf(r), routineId);
  return { ok: true, message: "Order saved" };
}

// ── Chores ───────────────────────────────────────────────────────────────────
export async function saveChore(choreId: string, formData: FormData): Promise<KidResult> {
  const { household, supabase } = await ctx();
  const title = clip(formData.get("title"), 80);
  if (!title) return { ok: false, error: "Give the chore a name." };
  const ids = Array.from(new Set(formData.getAll("child_ids").map(String).filter(Boolean)));
  const { data: valid } = ids.length
    ? await supabase.from("children").select("id").eq("household_id", household.id).in("id", ids).is("deleted_at", null)
    : { data: [] as { id: string }[] };
  const kids = (valid ?? []).map((k) => k.id);
  if (!kids.length) return { ok: false, error: "Pick who does it." };
  const days = formData.getAll("days").map(Number);
  const { error } = await supabase
    .from("chores")
    .update({
      title,
      icon: clip(formData.get("icon"), 8) ?? "✅",
      points: clampInt(formData.get("points"), 0, 100),
      days_of_week: daysOrNull(days),
      child_id: kids[0],
      rotation_member_ids: kids.length >= 2 ? kids : null,
      requires_approval: formData.get("requires_approval") === "on",
    })
    .eq("id", choreId)
    .eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't save that chore." };
  touch(kids);
  return { ok: true, message: "Chore saved" };
}

export async function deleteChoreSoft(choreId: string): Promise<KidResult> {
  const { household, supabase } = await ctx();
  const { data, error } = await supabase
    .from("chores")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", choreId)
    .eq("household_id", household.id)
    .select("child_id, rotation_member_ids")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Couldn't remove that chore." };
  touch(Array.isArray(data.rotation_member_ids) ? (data.rotation_member_ids as string[]) : [data.child_id]);
  return { ok: true, message: "Chore removed" };
}

export async function restoreChore(choreId: string): Promise<KidResult> {
  const { household, supabase } = await ctx();
  const { data, error } = await supabase
    .from("chores")
    .update({ deleted_at: null })
    .eq("id", choreId)
    .eq("household_id", household.id)
    .select("child_id, rotation_member_ids")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Couldn't bring it back." };
  touch(Array.isArray(data.rotation_member_ids) ? (data.rotation_member_ids as string[]) : [data.child_id]);
  return { ok: true, message: "Restored" };
}
