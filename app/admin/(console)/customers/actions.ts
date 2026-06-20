"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { hasServiceRole, env } from "@/lib/env";
import { generatePairingCode } from "@/lib/codes";
import { FOUNDER_SPOTS } from "@/lib/types";

export type ActionResult = { error?: string; success?: string };

function num(v: FormDataEntryValue | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

export async function createCustomer(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      name: String(formData.get("name") || "New lead"),
      email: str(formData.get("email")),
      phone: str(formData.get("phone")),
      build_id: str(formData.get("build_id")),
      status: "lead",
      notes: str(formData.get("notes")),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/customers");
  redirect(`/admin/customers/${data.id}`);
}

export async function updateCustomer(
  id: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();

  const founder = num(formData.get("founder_number"));
  if (founder != null && (founder < 1 || founder > FOUNDER_SPOTS)) {
    return { error: `Founder number must be between 1 and ${FOUNDER_SPOTS}.` };
  }

  const { error } = await supabase
    .from("customers")
    .update({
      name: String(formData.get("name") || ""),
      email: str(formData.get("email")),
      phone: str(formData.get("phone")),
      build_id: str(formData.get("build_id")),
      status: String(formData.get("status") || "lead") as
        | "lead"
        | "scheduled"
        | "installed",
      install_date: str(formData.get("install_date")),
      install_fee: num(formData.get("install_fee")),
      founder_number: founder,
      notes: str(formData.get("notes")),
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: `Founder #${founder} is already assigned to another customer.` };
    }
    return { error: error.message };
  }
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${id}`);
  return { success: "Saved." };
}

export async function deleteCustomer(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/customers");
  redirect("/admin/customers");
}

/** Smallest unused founder number in 1..15, or null if all are taken. */
export async function nextFounderNumber(): Promise<number | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("customers")
    .select("founder_number")
    .not("founder_number", "is", null);
  const used = new Set((data ?? []).map((r) => r.founder_number));
  for (let i = 1; i <= FOUNDER_SPOTS; i++) if (!used.has(i)) return i;
  return null;
}

/**
 * Provision a customer: invite the parent, create their household, link it, and
 * mint the first device pairing code. Requires the service role key.
 */
export async function provisionCustomer(
  id: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  if (!hasServiceRole()) {
    return {
      error:
        "SUPABASE_SERVICE_ROLE_KEY is required to invite parents. Add it to the environment and retry.",
    };
  }

  const supabase = await createClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("id, name, email, household_id")
    .eq("id", id)
    .single();
  if (!customer) return { error: "Customer not found." };
  if (customer.household_id) return { error: "This customer is already provisioned." };

  const email = customer.email;
  if (!email) return { error: "Add the customer's email before provisioning." };
  const householdName =
    str(formData.get("household_name")) || `${customer.name}'s Home`;

  const admin = createAdminClient();

  // 1. Invite the parent (creates the auth user; trigger makes a parent profile).
  const { data: invited, error: inviteErr } =
    await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${env.siteUrl}/login`,
    });
  if (inviteErr || !invited?.user) {
    return {
      error:
        (inviteErr?.message ?? "Invite failed.") +
        " (Email delivery requires SMTP configured in Supabase Auth settings.)",
    };
  }

  // 2. Create the household owned by the parent.
  const { data: household, error: hhErr } = await admin
    .from("households")
    .insert({ owner_id: invited.user.id, name: householdName })
    .select("id")
    .single();
  if (hhErr) return { error: hhErr.message };

  // 3. Link the customer + advance status; seed an empty Plus row (inactive).
  await admin
    .from("customers")
    .update({ household_id: household.id, status: "scheduled" })
    .eq("id", id);
  await admin
    .from("plus_subscriptions")
    .insert({ household_id: household.id, status: "inactive" });

  // 4. Mint the first pairing code.
  const code = generatePairingCode();
  await admin
    .from("device_pairings")
    .insert({ household_id: household.id, code, status: "pending" });

  revalidatePath(`/admin/customers/${id}`);
  return { success: `Provisioned. Pairing code: ${code}` };
}

/** Mint an additional pairing code for an already-provisioned household. */
export async function generatePairingCodeForHousehold(
  householdId: string,
  customerId: string,
) {
  await requireAdmin();
  const supabase = await createClient();
  const code = generatePairingCode();
  const { error } = await supabase
    .from("device_pairings")
    .insert({ household_id: householdId, code, status: "pending" });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/customers/${customerId}`);
}

// ── Referrals ────────────────────────────────────────────────────────────────
export async function addReferral(customerId: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("referrals").insert({
    referring_customer_id: customerId,
    referred_name: String(formData.get("referred_name") || "Referral"),
    referred_contact: str(formData.get("referred_contact")),
    status: "pending",
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/customers/${customerId}`);
}

export async function updateReferralStatus(
  id: string,
  customerId: string,
  formData: FormData,
) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from("referrals")
    .update({
      status: String(formData.get("status") || "pending") as
        | "pending"
        | "contacted"
        | "converted"
        | "declined",
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/customers/${customerId}`);
}

export async function deleteReferral(id: string, customerId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("referrals").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/customers/${customerId}`);
}
