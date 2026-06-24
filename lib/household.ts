import { createClient } from "@/lib/supabase/server";
import type { Household } from "@/lib/types";

/** The current user's household — one they own, or (co-parent mode) one they're a
 *  member of. Owned takes precedence. */
export async function getMyHousehold(): Promise<Household | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: owned } = await supabase
    .from("households")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (owned) return owned as Household;
  // Co-parent: find a household they're a member of (RLS-scoped to their own rows).
  const { data: m } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("profile_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!m) return null;
  const { data: hh } = await supabase.from("households").select("*").eq("id", m.household_id).maybeSingle();
  return (hh as Household | null) ?? null;
}

/** True when the household's Plus subscription is in a usable state. */
export function plusActive(status?: string | null): boolean {
  return !!status && ["active", "trialing", "past_due"].includes(status);
}
