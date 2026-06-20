"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getMyHousehold } from "@/lib/household";
import { hashPinServer } from "@/lib/pin";

function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}
function int(v: FormDataEntryValue | null, fb = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fb;
}

// ── Children ─────────────────────────────────────────────────────────────────
export async function addChild(formData: FormData) {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household found.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("children")
    .insert({
      household_id: household.id,
      name: String(formData.get("name") || "New child"),
      avatar: str(formData.get("avatar")),
      sort_order: int(formData.get("sort_order"), 0),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  // Seed a rewards row so the wall shows a points total immediately.
  await supabase.from("rewards").insert({ child_id: data.id, points_total: 0 });
  revalidatePath("/app");
  redirect(`/app/children/${data.id}`);
}

export async function updateChild(id: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("children")
    .update({
      name: String(formData.get("name") || ""),
      avatar: str(formData.get("avatar")),
      sort_order: int(formData.get("sort_order"), 0),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app");
  revalidatePath(`/app/children/${id}`);
}

export async function deleteChild(id: string) {
  await requireUser();
  const supabase = await createClient();
  // Soft-delete so the wall syncs the removal as a tombstone.
  const { error } = await supabase
    .from("children")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app");
  redirect("/app");
}

// ── Routines ─────────────────────────────────────────────────────────────────
export async function addRoutine(childId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("routines").insert({
    child_id: childId,
    name: String(formData.get("name") || "New routine"),
    type: (String(formData.get("type") || "schedule")) as "schedule" | "first_then",
    sort_order: int(formData.get("sort_order"), 0),
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
    order_index: int(formData.get("order_index"), 0),
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
      order_index: int(formData.get("order_index"), 0),
      start_time: str(formData.get("start_time")),
      duration_min: durationRaw ? int(durationRaw) : null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
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
    return; // ignore malformed JSON
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
