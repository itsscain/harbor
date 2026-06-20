"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { getMyHousehold } from "@/lib/household";
import { generatePairingCode } from "@/lib/codes";

const RECOMMENDED_CALM = [
  { tool_type: "breathing", config: { pattern: "4-7-8", rounds: 4 }, sort_order: 1 },
  { tool_type: "feelings", config: { options: ["happy", "calm", "sad", "angry", "worried", "tired"] }, sort_order: 2 },
  { tool_type: "break", config: { minutes: 5 }, sort_order: 3 },
  {
    tool_type: "social_story",
    config: { title: "Big feelings are okay", pages: ["Everyone has big feelings.", "I can take a slow breath.", "I can ask for help.", "The feeling gets smaller. I'm okay."] },
    sort_order: 4,
  },
] as const;

/**
 * Owner self-setup: create the owner's OWN household (free, with Plus comped),
 * seed calm tools, and mint a fresh pairing code. The owner is the household
 * owner, so this runs entirely under their admin session — no invite/email needed.
 */
export async function setupMyFamily(formData: FormData) {
  const profile = await requireAdmin();
  const supabase = await createClient();

  let household = await getMyHousehold();
  if (!household) {
    const name = String(formData.get("name") || "").trim() || "My Family";
    const { data, error } = await supabase
      .from("households")
      .insert({ owner_id: profile.id, name, plus_active: true })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    household = data;

    const { error: subErr } = await supabase
      .from("plus_subscriptions")
      .insert({ household_id: household.id, status: "active" });
    if (subErr) throw new Error(subErr.message);

    const { error: calmErr } = await supabase.from("calm_tools").insert(
      RECOMMENDED_CALM.map((c) => ({
        household_id: household!.id,
        tool_type: c.tool_type,
        config: c.config as never,
        sort_order: c.sort_order,
        enabled: true,
      })),
    );
    if (calmErr) throw new Error(calmErr.message);
  }

  // Reuse an existing live pairing code rather than piling up new ones.
  const { data: pending } = await supabase
    .from("device_pairings")
    .select("code")
    .eq("household_id", household.id)
    .eq("status", "pending")
    .limit(1);
  if (!pending || pending.length === 0) {
    const { error } = await supabase
      .from("device_pairings")
      .insert({ household_id: household.id, code: generatePairingCode(), status: "pending" });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/my-family");
}

/** Mint another one-time pairing code (e.g. to pair a second wall). */
export async function newOwnerPairingCode(householdId: string) {
  await requireAdmin();
  // Don't trust the bound id — verify it's the caller's own household.
  const household = await getMyHousehold();
  if (!household || household.id !== householdId) {
    throw new Error("That isn't your household.");
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("device_pairings")
    .insert({ household_id: household.id, code: generatePairingCode(), status: "pending" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/my-family");
}
