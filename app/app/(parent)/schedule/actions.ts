"use server";

// Family Schedule actions (Routines & App P2 §2-§3): shared routines, schedule
// templates, per-child overrides, and bulk operations. All household-scoped via
// RLS; every mutation revalidates the schedule surface (and the child pages that
// render the same data).

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getMyHousehold } from "@/lib/household";

function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}
/** Missing/blank fields get the fallback (Number(null) is 0, NOT a miss — guard first). */
function int(v: FormDataEntryValue | null, fallback = 0): number {
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}
/** Checkbox-chip groups (days, children) → number[]/string[] via getAll. */
function days(formData: FormData): number[] | null {
  const d = formData
    .getAll("days")
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n));
  const uniq = [...new Set(d)].sort((a, b) => a - b);
  return uniq.length === 0 || uniq.length === 7 ? null : uniq;
}

function revalidate() {
  revalidatePath("/app/schedule");
  revalidatePath("/app/children");
  revalidatePath("/app");
}

/** RLS already scopes every write, but IDs arriving from the client (bound args,
 *  hidden fields) are still validated as belonging to MY household so a crafted
 *  POST can't store dangling cross-household references. */
async function assertMine(
  table: "schedule_templates" | "routines" | "children",
  id: string,
  householdId: string,
) {
  const supabase = await createClient();
  const { data } = await supabase
    .from(table)
    .select("id")
    .eq("id", id)
    .eq("household_id", householdId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) throw new Error("Not found in your household.");
}

// ── Schedule templates (§2.2) ────────────────────────────────────────────────
export async function createScheduleTemplate(formData: FormData) {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household.");
  const supabase = await createClient();
  const { error } = await supabase.from("schedule_templates").insert({
    household_id: household.id,
    name: String(formData.get("name") || "New window"),
    start_time: str(formData.get("start_time")),
    end_time: str(formData.get("end_time")),
    days_of_week: days(formData),
  });
  if (error) throw new Error(error.message);
  revalidate();
}

export async function updateScheduleTemplate(id: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("schedule_templates")
    .update({
      name: String(formData.get("name") || ""),
      start_time: str(formData.get("start_time")),
      end_time: str(formData.get("end_time")),
      days_of_week: days(formData),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteScheduleTemplate(id: string) {
  await requireUser();
  const supabase = await createClient();
  // Soft delete (tombstone rides the delta sync); routines referencing it fall back
  // to their own schedule via the FK "on delete set null" only on hard deletes, so
  // clear the references explicitly here.
  const { error } = await supabase
    .from("routines")
    .update({ schedule_template_id: null })
    .eq("schedule_template_id", id);
  if (error) throw new Error(error.message);
  const { error: e2 } = await supabase
    .from("schedule_templates")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (e2) throw new Error(e2.message);
  revalidate();
}

// ── Shared routines (§2.1) ───────────────────────────────────────────────────
/** Assigned ids + a template ref are client input — keep only MY children, and
 *  verify the template is mine before linking it. */
async function validateAssignment(householdId: string, formData: FormData) {
  const supabase = await createClient();
  const raw = formData.getAll("assigned").map(String).filter(Boolean);
  const { data: mine } = await supabase
    .from("children")
    .select("id")
    .eq("household_id", householdId)
    .is("deleted_at", null);
  const ok = new Set((mine ?? []).map((c) => c.id));
  const assigned = raw.filter((id) => ok.has(id));
  if (assigned.length === 0) throw new Error("Pick at least one child.");
  const templateId = str(formData.get("schedule_template_id"));
  if (templateId) await assertMine("schedule_templates", templateId, householdId);
  return { assigned, templateId };
}

export async function createSharedRoutine(formData: FormData) {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household.");
  const { assigned, templateId } = await validateAssignment(household.id, formData);
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("routines")
    .select("sort_order")
    .eq("household_id", household.id)
    .is("deleted_at", null)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("routines").insert({
    household_id: household.id,
    scope: "shared",
    child_id: null,
    assigned_child_ids: assigned,
    name: String(formData.get("name") || "Family routine"),
    type: (String(formData.get("type") || "schedule") === "first_then" ? "first_then" : "schedule") as
      | "schedule"
      | "first_then",
    start_time: str(formData.get("start_time")),
    end_time: str(formData.get("end_time")),
    days_of_week: days(formData),
    schedule_template_id: templateId,
    sort_order: (last?.sort_order ?? 0) + 1,
  });
  if (error) throw new Error(error.message);
  revalidate();
}

export async function updateSharedRoutine(id: string, formData: FormData) {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household.");
  const { assigned, templateId } = await validateAssignment(household.id, formData);
  const supabase = await createClient();
  const { error } = await supabase
    .from("routines")
    .update({
      name: String(formData.get("name") || ""),
      active: formData.get("active") === "on",
      assigned_child_ids: assigned,
      start_time: str(formData.get("start_time")),
      end_time: str(formData.get("end_time")),
      days_of_week: days(formData),
      schedule_template_id: templateId,
      sort_order: int(formData.get("sort_order"), 0),
    })
    .eq("id", id)
    .eq("scope", "shared");
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteSharedRoutine(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("routines")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("scope", "shared");
  if (error) throw new Error(error.message);
  revalidate();
}

// ── Steps on a shared routine ────────────────────────────────────────────────
export async function addSharedStep(routineId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("routine_steps")
    .select("order_index")
    .eq("routine_id", routineId)
    .is("deleted_at", null)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("routine_steps").insert({
    routine_id: routineId,
    label: String(formData.get("label") || "Step"),
    icon: str(formData.get("icon")),
    step_type: (String(formData.get("step_type") || "task") as "task" | "first" | "then"),
    reward_points: int(formData.get("reward_points"), 1),
    order_index: (last?.order_index ?? 0) + 1,
  });
  if (error) throw new Error(error.message);
  revalidate();
}

export async function deleteSharedStep(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("routine_steps")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidate();
}

// ── Per-child overrides (§2.3) ───────────────────────────────────────────────
export async function upsertOverride(routineId: string, childId: string, formData: FormData) {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household.");
  // Bound args are client-replayable — both ids must be this household's.
  await assertMine("routines", routineId, household.id);
  await assertMine("children", childId, household.id);
  // Clamp the shift to ±12h; the wall handles wrapped windows, but junk offsets
  // shouldn't be storable at all.
  const offset = Math.max(-720, Math.min(720, int(formData.get("time_offset_min"), 0)));
  const supabase = await createClient();
  const { error } = await supabase.from("routine_child_overrides").upsert(
    {
      household_id: household.id,
      routine_id: routineId,
      child_id: childId,
      time_offset_min: offset,
      enabled: formData.get("enabled") === "on",
      deleted_at: null, // re-creating after a soft delete revives the row
    },
    { onConflict: "routine_id,child_id" },
  );
  if (error) throw new Error(error.message);
  revalidate();
}

export async function clearOverride(routineId: string, childId: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("routine_child_overrides")
    .update({ deleted_at: new Date().toISOString(), time_offset_min: 0, enabled: true })
    .eq("routine_id", routineId)
    .eq("child_id", childId);
  if (error) throw new Error(error.message);
  revalidate();
}

// ── Bulk actions (§2.4) ──────────────────────────────────────────────────────
/** Clone every one of a child's own routines (and their steps) onto a sibling. */
export async function copyChildRoutines(formData: FormData) {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household.");
  const from = str(formData.get("from_child"));
  const to = str(formData.get("to_child"));
  if (!from || !to || from === to) throw new Error("Pick two different children.");
  await assertMine("children", from, household.id);
  await assertMine("children", to, household.id);
  const supabase = await createClient();
  const { data: routines, error } = await supabase
    .from("routines")
    .select("*")
    .eq("child_id", from)
    .eq("scope", "child")
    .is("deleted_at", null)
    .order("sort_order");
  if (error) throw new Error(error.message);
  for (const r of routines ?? []) {
    const { data: created, error: e1 } = await supabase
      .from("routines")
      .insert({
        child_id: to,
        name: r.name,
        type: r.type,
        active: r.active,
        sort_order: r.sort_order,
        start_time: r.start_time,
        end_time: r.end_time,
        days_of_week: r.days_of_week,
        schedule_template_id: r.schedule_template_id,
      })
      .select("id")
      .single();
    if (e1 || !created) throw new Error(e1?.message ?? "Copy failed.");
    const { data: steps } = await supabase
      .from("routine_steps")
      .select("label, icon, photo_url, step_type, reward_points, order_index, start_time, duration_min, support_level")
      .eq("routine_id", r.id)
      .is("deleted_at", null)
      .order("order_index");
    if (steps?.length) {
      const { error: e2 } = await supabase
        .from("routine_steps")
        .insert(steps.map((s) => ({ ...s, routine_id: created.id })));
      if (e2) throw new Error(e2.message);
    }
  }
  revalidate();
}

/** Point every one of a child's routines at a schedule template (window set once). */
export async function applyTemplateToChild(formData: FormData) {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household.");
  const childId = str(formData.get("child_id"));
  const templateId = str(formData.get("template_id"));
  if (!childId || !templateId) throw new Error("Pick a child and a template.");
  await assertMine("children", childId, household.id);
  await assertMine("schedule_templates", templateId, household.id);
  const supabase = await createClient();
  const { error } = await supabase
    .from("routines")
    .update({ schedule_template_id: templateId })
    .eq("child_id", childId)
    .is("deleted_at", null);
  if (error) throw new Error(error.message);
  revalidate();
}
