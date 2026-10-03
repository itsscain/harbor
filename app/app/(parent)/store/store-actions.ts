"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getMyHousehold } from "@/lib/household";
import type { Json } from "@/lib/database.types";

// Rewards (what kids spend stars on) + the family goal. Every action RETURNS an honest result;
// removing a reward is soft (Undo), and switching the family goal off keeps it for next time.

export type StoreResult = { ok: true; message?: string } | { ok: false; error: string };

const KINDS = ["reward", "screen_time", "allowance", "goal"];
const clip = (v: unknown, max: number): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, max) : null;
};
const clampInt = (v: unknown, lo: number, hi: number, fb: number): number => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fb;
};

async function ctx() {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household found.");
  return { household, supabase: await createClient() };
}
const touch = () => {
  revalidatePath("/app/store");
  revalidatePath("/app");
};

export async function saveReward(id: string | null, formData: FormData): Promise<StoreResult> {
  const { household, supabase } = await ctx();
  const label = clip(formData.get("label"), 60);
  if (!label) return { ok: false, error: "What's the reward?" };
  const kind = clip(formData.get("kind"), 20) ?? "reward";
  const childRaw = clip(formData.get("child_id"), 64);
  let child_id: string | null = null;
  if (childRaw) {
    const { data } = await supabase.from("children").select("id").eq("id", childRaw).eq("household_id", household.id).maybeSingle();
    child_id = data?.id ?? null;
  }
  const row = {
    label,
    emoji: clip(formData.get("emoji"), 8) ?? "🎁",
    cost_points: clampInt(formData.get("cost_points"), 0, 10000, 20),
    kind: KINDS.includes(kind) ? kind : "reward",
    child_id,
    ...(id ? { enabled: formData.get("enabled") !== "" } : {}),
  };
  const { error } = id
    ? await supabase.from("store_items").update(row).eq("id", id).eq("household_id", household.id)
    : await supabase.from("store_items").insert({ ...row, household_id: household.id, sort_order: 50 });
  if (error) return { ok: false, error: "Couldn't save that reward." };
  touch();
  return { ok: true, message: id ? "Reward saved" : `${label} is in the store` };
}

export async function deleteRewardSoft(id: string): Promise<StoreResult> {
  const { household, supabase } = await ctx();
  const { error } = await supabase.from("store_items").update({ deleted_at: new Date().toISOString() }).eq("id", id).eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't remove that reward." };
  touch();
  return { ok: true, message: "Reward removed" };
}

export async function restoreReward(id: string): Promise<StoreResult> {
  const { household, supabase } = await ctx();
  const { error } = await supabase.from("store_items").update({ deleted_at: null }).eq("id", id).eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't bring it back." };
  touch();
  return { ok: true, message: "Restored" };
}

/** A few favorites so an empty store isn't a blank page. */
export async function addStarterRewards(): Promise<StoreResult> {
  const { household, supabase } = await ctx();
  const starters = [
    { emoji: "📺", label: "20 minutes of screen time", cost_points: 15, kind: "screen_time" },
    { emoji: "🍦", label: "Ice cream treat", cost_points: 25, kind: "reward" },
    { emoji: "🌙", label: "Stay up 15 minutes later", cost_points: 20, kind: "reward" },
    { emoji: "🎬", label: "Pick the family movie", cost_points: 30, kind: "reward" },
    { emoji: "🛝", label: "Trip to the park", cost_points: 40, kind: "reward" },
  ];
  const { error } = await supabase
    .from("store_items")
    .insert(starters.map((s, i) => ({ ...s, household_id: household.id, sort_order: 10 + i })));
  if (error) return { ok: false, error: "Couldn't add those. Try again." };
  touch();
  return { ok: true, message: "Added 5 favorites — change any of them" };
}

/** The family goal: a shared reward everyone's stars fill together. Off keeps it saved. */
export async function saveFamilyGoal(formData: FormData): Promise<StoreResult> {
  const { household, supabase } = await ctx();
  const label = clip(formData.get("label"), 60);
  if (!label) return { ok: false, error: "Name the goal, like “Family movie night”." };
  const current = (household.settings ?? {}) as Record<string, unknown>;
  const active = formData.get("active") !== "";
  const family_goal = {
    label,
    emoji: clip(formData.get("emoji"), 8) ?? "🎉",
    target: clampInt(formData.get("target"), 1, 100000, 100),
    reward: clip(formData.get("reward"), 80),
    active,
  };
  const { error } = await supabase
    .from("households")
    .update({ settings: { ...current, family_goal } as Json })
    .eq("id", household.id);
  if (error) return { ok: false, error: "Couldn't save the goal." };
  touch();
  return { ok: true, message: active ? "Family goal is on the wall" : "Saved — it's off the wall for now" };
}
