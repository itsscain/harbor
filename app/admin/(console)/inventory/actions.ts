"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

function num(v: FormDataEntryValue | null, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function addPart(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("inventory").insert({
    part_name: String(formData.get("part_name") || "New part"),
    on_hand_qty: num(formData.get("on_hand_qty")),
    reorder_threshold: num(formData.get("reorder_threshold")),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/inventory");
}

export async function updatePart(id: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory")
    .update({
      part_name: String(formData.get("part_name") || ""),
      on_hand_qty: num(formData.get("on_hand_qty")),
      reorder_threshold: num(formData.get("reorder_threshold")),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/inventory");
}

export async function deletePart(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("inventory").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/inventory");
}
