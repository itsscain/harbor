"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

function num(v: FormDataEntryValue | null, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function createBuild(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("builds")
    .insert({
      name: String(formData.get("name") || "New build"),
      tablet_model: String(formData.get("tablet_model") || ""),
      screen_size: String(formData.get("screen_size") || ""),
      standard_price: num(formData.get("standard_price")),
      founder_price: num(formData.get("founder_price")),
      sort_order: num(formData.get("sort_order"), 99),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/builds");
  redirect(`/admin/builds/${data.id}`);
}

export async function updateBuild(id: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("builds")
    .update({
      name: String(formData.get("name") || ""),
      tablet_model: String(formData.get("tablet_model") || ""),
      screen_size: String(formData.get("screen_size") || ""),
      standard_price: num(formData.get("standard_price")),
      founder_price: num(formData.get("founder_price")),
      is_default: formData.get("is_default") === "on",
      sort_order: num(formData.get("sort_order"), 99),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/builds");
  revalidatePath(`/admin/builds/${id}`);
}

export async function deleteBuild(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("builds").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/builds");
  redirect("/admin/builds");
}

export async function addSupply(buildId: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("build_supplies").insert({
    build_id: buildId,
    item: String(formData.get("item") || "New item"),
    vendor: String(formData.get("vendor") || "Amazon"),
    url: String(formData.get("url") || ""),
    unit_cost: num(formData.get("unit_cost")),
    quantity: Math.max(1, num(formData.get("quantity"), 1)),
    optional: formData.get("optional") === "on",
    sort_order: num(formData.get("sort_order"), 50),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/builds/${buildId}`);
}

export async function updateSupply(
  id: string,
  buildId: string,
  formData: FormData,
) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("build_supplies")
    .update({
      item: String(formData.get("item") || ""),
      vendor: String(formData.get("vendor") || "Amazon"),
      url: String(formData.get("url") || ""),
      unit_cost: num(formData.get("unit_cost")),
      quantity: Math.max(1, num(formData.get("quantity"), 1)),
      optional: formData.get("optional") === "on",
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/builds/${buildId}`);
}

export async function deleteSupply(id: string, buildId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("build_supplies").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/builds/${buildId}`);
}
