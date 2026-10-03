"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getMyHousehold } from "@/lib/household";
import { CHILD_PALETTE } from "@/lib/kiosk/colors";
import { inviteCoParent } from "@/app/app/(parent)/hub-actions";

// Grown-ups: who can use the app (co-parents) and who shows up on the wall (people + their
// own routines — no stars for grown-ups). Every action RETURNS an honest result; deletes on
// the wall side are soft (Undo). Removing a co-parent is confirmed in the UI first.

export type FamilyResult = { ok: true; message?: string; id?: string } | { ok: false; error: string };

const ROLES = ["parent", "caregiver", "sibling"];
const clip = (v: unknown, max: number): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, max) : null;
};

async function ctx() {
  const profile = await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household found.");
  return { profile, household, supabase: await createClient() };
}
const touch = () => {
  revalidatePath("/app/family");
  revalidatePath("/app/settings");
};

// ── Who has the app ──────────────────────────────────────────────────────────
export async function inviteGrownUp(formData: FormData): Promise<FamilyResult> {
  const r = await inviteCoParent({}, formData);
  touch();
  return r.error ? { ok: false, error: r.error } : { ok: true, message: r.success ?? "Invite sent" };
}

export async function removeGrownUp(profileId: string): Promise<FamilyResult> {
  const { profile, household, supabase } = await ctx();
  if (household.owner_id !== profile.id) return { ok: false, error: "Only the family's owner can remove someone." };
  if (profileId === household.owner_id) return { ok: false, error: "The owner can't be removed." };
  const { error } = await supabase.from("household_members").delete().eq("household_id", household.id).eq("profile_id", profileId);
  if (error) return { ok: false, error: "Couldn't remove them. Try again." };
  touch();
  return { ok: true, message: "Removed — they no longer have access" };
}

// ── People on the wall ───────────────────────────────────────────────────────
export async function savePerson(id: string | null, formData: FormData): Promise<FamilyResult> {
  const { household, supabase } = await ctx();
  const name = clip(formData.get("name"), 40);
  if (!name) return { ok: false, error: "What's their name?" };
  const role = clip(formData.get("role"), 20) ?? "parent";
  const fields = {
    name,
    avatar: clip(formData.get("avatar"), 8) ?? "💙",
    role: ROLES.includes(role) ? role : "parent",
    ...(clip(formData.get("color"), 9) ? { color: clip(formData.get("color"), 9) } : {}),
  };
  if (id) {
    const { error } = await supabase.from("people").update(fields).eq("id", id).eq("household_id", household.id);
    if (error) return { ok: false, error: "Couldn't save that." };
    touch();
    return { ok: true, message: "Saved" };
  }
  const { data: last } = await supabase.from("people").select("sort_order").eq("household_id", household.id).order("sort_order", { ascending: false }).limit(1);
  const order = ((last?.[0]?.sort_order as number) ?? -1) + 1;
  const { data, error } = await supabase
    .from("people")
    .insert({ ...fields, household_id: household.id, sort_order: order, color: fields.color ?? CHILD_PALETTE[order % CHILD_PALETTE.length].value })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "Couldn't add them. Try again." };
  touch();
  return { ok: true, id: data.id, message: `${name} is on the wall` };
}

export async function deletePersonSoft(id: string): Promise<FamilyResult> {
  const { household, supabase } = await ctx();
  const { error } = await supabase.from("people").update({ deleted_at: new Date().toISOString() }).eq("id", id).eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't remove them." };
  touch();
  return { ok: true, message: "Removed from the wall" };
}

export async function restorePerson(id: string): Promise<FamilyResult> {
  const { household, supabase } = await ctx();
  const { error } = await supabase.from("people").update({ deleted_at: null }).eq("id", id).eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't bring them back." };
  touch();
  return { ok: true, message: "Back on the wall" };
}

// ── A grown-up's routine ─────────────────────────────────────────────────────
async function personOf(supabase: Awaited<ReturnType<typeof createClient>>, householdId: string, personId: string) {
  const { data } = await supabase.from("people").select("id").eq("id", personId).eq("household_id", householdId).is("deleted_at", null).maybeSingle();
  return data?.id ?? null;
}

export async function savePersonRoutine(id: string | null, personId: string, formData: FormData): Promise<FamilyResult> {
  const { household, supabase } = await ctx();
  if (!(await personOf(supabase, household.id, personId))) return { ok: false, error: "That person isn't on your wall." };
  const name = clip(formData.get("name"), 60);
  if (!name) return { ok: false, error: "Name the routine." };
  const withRaw = clip(formData.get("with_child_id"), 64);
  let with_child_id: string | null = null;
  if (withRaw) {
    const { data } = await supabase.from("children").select("id").eq("id", withRaw).eq("household_id", household.id).maybeSingle();
    with_child_id = data?.id ?? null;
  }
  const days = Array.from(new Set(formData.getAll("days").map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))).sort();
  const fields = {
    name,
    together: !!with_child_id,
    with_child_id,
    days_of_week: days.length === 0 || days.length === 7 ? null : days,
    ...(id ? { active: formData.get("active") !== "" } : {}),
  };
  if (id) {
    const { error } = await supabase.from("routines").update(fields).eq("id", id).eq("person_id", personId);
    if (error) return { ok: false, error: "Couldn't save that." };
    touch();
    return { ok: true, message: "Routine saved" };
  }
  const { data: last } = await supabase.from("routines").select("sort_order").eq("person_id", personId).order("sort_order", { ascending: false }).limit(1);
  const { data, error } = await supabase
    .from("routines")
    .insert({ ...fields, person_id: personId, child_id: null, type: "schedule", sort_order: ((last?.[0]?.sort_order as number) ?? -1) + 1 })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "Couldn't add that routine." };
  touch();
  return { ok: true, id: data.id, message: `${name} added` };
}

export async function deletePersonRoutineSoft(id: string): Promise<FamilyResult> {
  const { household, supabase } = await ctx();
  const { error } = await supabase.from("routines").update({ deleted_at: new Date().toISOString() }).eq("id", id).eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't remove that routine." };
  touch();
  return { ok: true, message: "Routine removed" };
}

export async function restorePersonRoutine(id: string): Promise<FamilyResult> {
  const { household, supabase } = await ctx();
  const { error } = await supabase.from("routines").update({ deleted_at: null }).eq("id", id).eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't bring it back." };
  touch();
  return { ok: true, message: "Restored" };
}

export async function addPersonStepQuick(routineId: string, label: string, icon: string | null): Promise<FamilyResult> {
  const { household, supabase } = await ctx();
  const l = clip(label, 80);
  if (!l) return { ok: false, error: "Name the step." };
  const { data: r } = await supabase.from("routines").select("id").eq("id", routineId).eq("household_id", household.id).not("person_id", "is", null).maybeSingle();
  if (!r) return { ok: false, error: "That routine isn't available." };
  const { data: last } = await supabase.from("routine_steps").select("order_index").eq("routine_id", routineId).is("deleted_at", null).order("order_index", { ascending: false }).limit(1);
  const { data, error } = await supabase
    .from("routine_steps")
    .insert({ routine_id: routineId, label: l, icon: clip(icon, 8), step_type: "task", reward_points: 0, order_index: ((last?.[0]?.order_index as number) ?? -1) + 1 })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "Couldn't add that step." };
  touch();
  return { ok: true, id: data.id, message: `Added “${l}”` };
}

export async function deletePersonStepSoft(id: string): Promise<FamilyResult> {
  const { supabase } = await ctx();
  const { error } = await supabase.from("routine_steps").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: "Couldn't remove that step." };
  touch();
  return { ok: true, message: "Step removed" };
}

export async function restorePersonStep(id: string): Promise<FamilyResult> {
  const { supabase } = await ctx();
  const { error } = await supabase.from("routine_steps").update({ deleted_at: null }).eq("id", id);
  if (error) return { ok: false, error: "Couldn't bring it back." };
  touch();
  return { ok: true, message: "Restored" };
}
