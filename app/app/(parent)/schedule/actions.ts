"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getMyHousehold } from "@/lib/household";

// "Family times": named windows (School morning 7:00–7:45) that several routines can follow,
// so changing one moves them all. Every action RETURNS an honest result; delete has Undo
// (it remembers which routines were following the time so Undo can re-link them).

export type TimeResult = { ok: true; message?: string; ids?: string[] } | { ok: false; error: string };

const clip = (v: unknown, max: number): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, max) : null;
};
const hhmm = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return /^\d{2}:\d{2}$/.test(s) ? s : null;
};

async function ctx() {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household found.");
  return { household, supabase: await createClient() };
}

function touch() {
  revalidatePath("/app/schedule");
  revalidatePath("/app/children", "layout");
  revalidatePath("/app");
}

export async function saveFamilyTime(id: string | null, formData: FormData): Promise<TimeResult> {
  const { household, supabase } = await ctx();
  const name = clip(formData.get("name"), 40);
  if (!name) return { ok: false, error: "Give it a name, like “School morning”." };
  const start = hhmm(formData.get("start_time"));
  const end = hhmm(formData.get("end_time"));
  if (!start && !end) return { ok: false, error: "Pick when it starts." };
  const days = Array.from(new Set(formData.getAll("days").map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))).sort();
  const row = { name, start_time: start, end_time: end, days_of_week: days.length === 0 || days.length === 7 ? null : days };
  const { error } = id
    ? await supabase.from("schedule_templates").update(row).eq("id", id).eq("household_id", household.id)
    : await supabase.from("schedule_templates").insert({ ...row, household_id: household.id });
  if (error) return { ok: false, error: "Couldn't save that. Try again." };
  touch();
  return { ok: true, message: id ? "Saved — routines following it moved too" : `“${name}” added` };
}

export async function deleteFamilyTime(id: string): Promise<TimeResult> {
  const { household, supabase } = await ctx();
  const { data: following } = await supabase.from("routines").select("id").eq("household_id", household.id).eq("schedule_template_id", id);
  const ids = (following ?? []).map((r) => r.id);
  if (ids.length) {
    const { error } = await supabase.from("routines").update({ schedule_template_id: null }).in("id", ids);
    if (error) return { ok: false, error: "Couldn't remove that." };
  }
  const { error } = await supabase.from("schedule_templates").update({ deleted_at: new Date().toISOString() }).eq("id", id).eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't remove that." };
  touch();
  return { ok: true, ids, message: ids.length ? `Removed — ${ids.length} ${ids.length === 1 ? "routine keeps" : "routines keep"} their own times` : "Removed" };
}

export async function restoreFamilyTime(id: string, routineIds: string[]): Promise<TimeResult> {
  const { household, supabase } = await ctx();
  const { error } = await supabase.from("schedule_templates").update({ deleted_at: null }).eq("id", id).eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't bring it back." };
  if (routineIds.length) {
    await supabase.from("routines").update({ schedule_template_id: id }).in("id", routineIds.slice(0, 200)).eq("household_id", household.id);
  }
  touch();
  return { ok: true, message: "Restored" };
}
