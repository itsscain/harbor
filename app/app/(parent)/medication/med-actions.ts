"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getMyHousehold } from "@/lib/household";

// Medicine add/edit/remove for the phone. Returns honest results; removal is soft (Undo).
// No stars, ever — health isn't a prize.

export type MedResult = { ok: true; message?: string } | { ok: false; error: string };

const clip = (v: unknown, max: number): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, max) : null;
};

async function ctx() {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household found.");
  return { household, supabase: await createClient() };
}

function touch() {
  revalidatePath("/app");
  revalidatePath("/app/medication");
}

/** Add (id = null) or update a medicine. Times come from the time pickers (one per dose). */
export async function saveMedication(id: string | null, childId: string, formData: FormData): Promise<MedResult> {
  const { household, supabase } = await ctx();
  const name = clip(formData.get("name"), 60);
  if (!name) return { ok: false, error: "What's the medicine called?" };
  const times = Array.from(
    new Set(
      formData
        .getAll("times")
        .map((v) => String(v).trim())
        .filter((t) => /^\d{1,2}:\d{2}$/.test(t))
        .map((t) => t.padStart(5, "0")),
    ),
  ).sort();
  if (!times.length) return { ok: false, error: "Add at least one time it's taken." };
  const days = Array.from(new Set(formData.getAll("days").map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))).sort();
  const row = {
    name,
    dose: clip(formData.get("dose"), 40),
    icon: clip(formData.get("icon"), 8) ?? "💊",
    helps_note: clip(formData.get("helps_note"), 140),
    schedule_times: times,
    days_of_week: days.length === 0 || days.length === 7 ? null : days,
    with_food: formData.get("with_food") === "on",
    parent_administered: formData.get("parent_administered") === "on",
  };

  if (id) {
    const { error } = await supabase
      .from("medications")
      .update({ ...row, active: formData.get("active") !== "" })
      .eq("id", id)
      .eq("household_id", household.id);
    if (error) return { ok: false, error: "Couldn't save that. Try again." };
    touch();
    return { ok: true, message: `${name} saved` };
  }

  const { data: kid } = await supabase.from("children").select("id").eq("id", childId).eq("household_id", household.id).maybeSingle();
  if (!kid) return { ok: false, error: "That child isn't in your family." };
  const { data: last } = await supabase.from("medications").select("sort_order").eq("child_id", childId).order("sort_order", { ascending: false }).limit(1);
  const { error } = await supabase
    .from("medications")
    .insert({ ...row, household_id: household.id, child_id: childId, sort_order: ((last?.[0]?.sort_order as number) ?? -1) + 1 });
  if (error) return { ok: false, error: "Couldn't add that. Try again." };
  touch();
  return { ok: true, message: `${name} added` };
}

export async function deleteMedicationSoft(id: string): Promise<MedResult> {
  const { household, supabase } = await ctx();
  const { error } = await supabase.from("medications").update({ deleted_at: new Date().toISOString() }).eq("id", id).eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't remove that." };
  touch();
  return { ok: true, message: "Medicine removed" };
}

export async function restoreMedication(id: string): Promise<MedResult> {
  const { household, supabase } = await ctx();
  const { error } = await supabase.from("medications").update({ deleted_at: null }).eq("id", id).eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't bring it back." };
  touch();
  return { ok: true, message: "Restored" };
}
