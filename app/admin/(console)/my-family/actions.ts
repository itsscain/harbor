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

    await supabase
      .from("plus_subscriptions")
      .insert({ household_id: household.id, status: "active" });

    await supabase.from("calm_tools").insert(
      RECOMMENDED_CALM.map((c) => ({
        household_id: household!.id,
        tool_type: c.tool_type,
        config: c.config as never,
        sort_order: c.sort_order,
        enabled: true,
      })),
    );
  }

  const code = generatePairingCode();
  await supabase
    .from("device_pairings")
    .insert({ household_id: household.id, code, status: "pending" });

  revalidatePath("/admin/my-family");
}

/** Mint another one-time pairing code (e.g. to pair a second wall). */
export async function newOwnerPairingCode(householdId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const code = generatePairingCode();
  const { error } = await supabase
    .from("device_pairings")
    .insert({ household_id: householdId, code, status: "pending" });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/my-family");
}
