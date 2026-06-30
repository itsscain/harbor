"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

/** Release a founder spot (spam / not a fit / backed out) — frees it; the public counter
 *  goes back up (§17.6). Clears the tentative founder number so it can be re-used. */
export async function releaseFounderSignup(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("founder_signups")
    .update({ status: "released", founder_number: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/founders");
}

const ALLOWED_STATUS = ["reserved", "approved", "scheduled", "invoiced", "active", "released", "waitlist"] as const;
type SignupStatus = (typeof ALLOWED_STATUS)[number];

/** Move a signup forward in the funnel (the full review→approve→schedule→invoice workflow
 *  is §17.5 / O2; F1 supports the basic stage moves + release). Status is validated against
 *  the enum set before the write (no blind cast). */
export async function setFounderSignupStatus(id: string, status: string) {
  await requireAdmin();
  if (!ALLOWED_STATUS.includes(status as SignupStatus)) throw new Error("Invalid status.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("founder_signups")
    .update({ status: status as SignupStatus })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/founders");
}
