"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getMyHousehold } from "@/lib/household";

// House rules + what happens if one is broken (shown on the wall). Each action RETURNS an
// honest result; removing is soft (Undo); moving is one call.

export type RuleResult = { ok: true; message?: string } | { ok: false; error: string };

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
const touch = () => revalidatePath("/app/rules");

export async function saveRule(id: string | null, kind: "rule" | "consequence", formData: FormData): Promise<RuleResult> {
  const { household, supabase } = await ctx();
  const title = clip(formData.get("title"), 80);
  if (!title) return { ok: false, error: kind === "rule" ? "Write the rule first." : "Write what happens first." };
  const fields = { title, detail: clip(formData.get("detail"), 200), emoji: clip(formData.get("emoji"), 8) };
  if (id) {
    const { error } = await supabase.from("house_rules").update(fields).eq("id", id).eq("household_id", household.id);
    if (error) return { ok: false, error: "Couldn't save that." };
  } else {
    const { data: last } = await supabase
      .from("house_rules")
      .select("sort_order")
      .eq("household_id", household.id)
      .eq("kind", kind)
      .is("deleted_at", null)
      .order("sort_order", { ascending: false })
      .limit(1);
    const { error } = await supabase.from("house_rules").insert({ ...fields, household_id: household.id, kind, sort_order: ((last?.[0]?.sort_order as number) ?? -1) + 1 });
    if (error) return { ok: false, error: "Couldn't add that." };
  }
  touch();
  return { ok: true, message: id ? "Saved" : "Added to the wall" };
}

export async function moveRule(id: string, dir: "up" | "down"): Promise<RuleResult> {
  const { household, supabase } = await ctx();
  const { data: row } = await supabase.from("house_rules").select("kind").eq("id", id).eq("household_id", household.id).maybeSingle();
  if (!row) return { ok: false, error: "That isn't there anymore." };
  const { data: list } = await supabase
    .from("house_rules")
    .select("id")
    .eq("household_id", household.id)
    .eq("kind", row.kind)
    .is("deleted_at", null)
    .order("sort_order");
  const ids = (list ?? []).map((r) => r.id);
  const i = ids.indexOf(id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return { ok: true };
  [ids[i], ids[j]] = [ids[j], ids[i]];
  for (let k = 0; k < ids.length; k++) {
    const { error } = await supabase.from("house_rules").update({ sort_order: k }).eq("id", ids[k]);
    if (error) return { ok: false, error: "Couldn't move that." };
  }
  touch();
  return { ok: true, message: "Moved" };
}

export async function deleteRuleSoft(id: string): Promise<RuleResult> {
  const { household, supabase } = await ctx();
  const { error } = await supabase.from("house_rules").update({ deleted_at: new Date().toISOString() }).eq("id", id).eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't remove that." };
  touch();
  return { ok: true, message: "Removed" };
}

export async function restoreRule(id: string): Promise<RuleResult> {
  const { household, supabase } = await ctx();
  const { error } = await supabase.from("house_rules").update({ deleted_at: null }).eq("id", id).eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't bring it back." };
  touch();
  return { ok: true, message: "Restored" };
}

/** A calm starter set: five rules + four gentle steps for when one is broken. */
export async function addStarterRules(): Promise<RuleResult> {
  const { household, supabase } = await ctx();
  const { count } = await supabase.from("house_rules").select("id", { count: "exact", head: true }).eq("household_id", household.id).is("deleted_at", null);
  if ((count ?? 0) > 0) return { ok: true, message: "You already have rules" };
  const rules = [
    { emoji: "💛", title: "Be kind with words and hands" },
    { emoji: "👂", title: "Listen the first time" },
    { emoji: "🧹", title: "Clean up your own mess" },
    { emoji: "✅", title: "Chores and routines before screens" },
    { emoji: "🙏", title: "Tell the truth" },
  ];
  const steps = [
    { emoji: "💬", title: "Gentle reminder", detail: "A calm heads-up about the choice." },
    { emoji: "⏸️", title: "Warning", detail: "Last chance to turn it around." },
    { emoji: "📵", title: "Lose a privilege", detail: "Tablet or TV time for the day." },
    { emoji: "🌱", title: "Fresh start", detail: "A short reset to begin again." },
  ];
  const { error } = await supabase.from("house_rules").insert([
    ...rules.map((r, i) => ({ household_id: household.id, kind: "rule", title: r.title, emoji: r.emoji, detail: null, sort_order: i })),
    ...steps.map((r, i) => ({ household_id: household.id, kind: "consequence", title: r.title, emoji: r.emoji, detail: r.detail, sort_order: i })),
  ]);
  if (error) return { ok: false, error: "Couldn't add those. Try again." };
  touch();
  return { ok: true, message: "Added — change anything you like" };
}
