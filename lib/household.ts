import { createClient } from "@/lib/supabase/server";
import type { Household } from "@/lib/types";

/** The current user's household (they own one as a provisioned parent). */
export async function getMyHousehold(): Promise<Household | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("households")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  return (data as Household | null) ?? null;
}

/** True when the household's Plus subscription is in a usable state. */
export function plusActive(status?: string | null): boolean {
  return !!status && ["active", "trialing", "past_due"].includes(status);
}
