"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv, hasServiceRole } from "@/lib/env";

export type SetupState = { error?: string; success?: string };

/** True once any admin profile exists — the setup route then disables itself. */
export async function adminExists(): Promise<boolean> {
  if (!hasServiceRole()) return false;
  try {
    const admin = createAdminClient();
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function bootstrapAdmin(
  _prev: SetupState,
  formData: FormData,
): Promise<SetupState> {
  const secret = String(formData.get("setup_secret") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (!serverEnv.setupSecret) {
    return { error: "SETUP_SECRET is not configured on the server." };
  }
  if (secret !== serverEnv.setupSecret) {
    return { error: "That setup secret is incorrect." };
  }
  if (!hasServiceRole()) {
    return {
      error:
        "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to the environment, then retry.",
    };
  }
  if (!email || !password) {
    return { error: "Email and password are required." };
  }
  if (password.length < 8) {
    return { error: "Use a password of at least 8 characters." };
  }

  if (await adminExists()) {
    return { error: "An admin already exists. Setup is closed." };
  }

  try {
    const admin = createAdminClient();
    // First user ever → the handle_new_user trigger assigns role = 'admin'.
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName || null },
    });
    if (error) return { error: error.message };

    // Belt-and-suspenders: ensure the profile is admin even if seeded otherwise.
    if (data.user) {
      await admin
        .from("profiles")
        .update({ role: "admin", full_name: fullName || null, must_change_password: false })
        .eq("id", data.user.id);
    }
    return { success: "Admin account created. You can sign in now." };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Setup failed." };
  }
}
