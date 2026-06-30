"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

type Fam = { kids_count?: number; ages?: string | null; notes?: string | null };
type Logi = { wall_type?: string | null; mounting?: string | null; hub_room?: string | null; timing?: string | null };
type Quote = { total?: number };

/** Approve a founder signup → create a linked Customer in the CRM (§17.5: review→approve locks
 *  Founder #N + makes the install record). Carries contact, build, founder number, and an intake
 *  summary into notes; links the signup to the customer; advances it to "approved". Then opens the
 *  customer record so the operator can schedule + provision. Idempotent (re-opens if converted). */
export async function convertFounderToCustomer(signupId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: sig } = await supabase.from("founder_signups").select("*").eq("id", signupId).single();
  if (!sig) throw new Error("Signup not found.");
  if (sig.customer_id) redirect(`/admin/customers/${sig.customer_id}`);

  const fam = (sig.family_info ?? {}) as Fam;
  const log = (sig.logistics ?? {}) as Logi;
  const q = (sig.quote ?? {}) as Quote;
  const notes = [
    `Founder signup${sig.founder_number ? ` #${sig.founder_number}` : ""}.`,
    fam.kids_count ? `${fam.kids_count} kid${fam.kids_count === 1 ? "" : "s"}${fam.ages ? ` (ages ${fam.ages})` : ""}.` : "",
    fam.notes ? `Family notes: ${fam.notes}` : "",
    log.wall_type ? `Wall: ${log.wall_type}${log.mounting ? `, ${log.mounting}` : ""}${log.hub_room ? `, hub in ${log.hub_room}` : ""}.` : "",
    log.timing ? `Timing: ${log.timing}.` : "",
    q.total ? `Quote est. $${Number(q.total).toLocaleString()} (pay later).` : "",
    sig.heard_from ? `Heard via: ${sig.heard_from}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const { data: cust, error } = await supabase
    .from("customers")
    .insert({
      name: sig.name,
      email: sig.email,
      phone: sig.phone,
      build_id: sig.intended_build_id,
      founder_number: sig.founder_number,
      status: "lead",
      notes,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") throw new Error(`Founder #${sig.founder_number} is already assigned to a customer.`);
    throw new Error(error.message);
  }

  await supabase.from("founder_signups").update({ customer_id: cust.id, status: "approved" }).eq("id", signupId);
  revalidatePath("/admin/founders");
  redirect(`/admin/customers/${cust.id}`);
}

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
