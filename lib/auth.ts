import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "parent";

export type Profile = {
  id: string;
  role: Role;
  full_name: string | null;
  must_change_password: boolean;
};

/** Returns the authenticated user's profile, or null if not signed in. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, role, full_name, must_change_password")
    .eq("id", user.id)
    .single();

  return (data as Profile | null) ?? null;
}

/** Redirects to /login unless signed in; returns the profile. */
export async function requireUser(next = "/app"): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (profile.must_change_password) redirect("/account/password");
  return profile;
}

/** Redirects non-admins away; returns the admin profile. */
export async function requireAdmin(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/admin");
  if (profile.must_change_password) redirect("/account/password");
  if (profile.role !== "admin") redirect("/app");
  return profile;
}
