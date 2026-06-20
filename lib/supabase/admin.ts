import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env, serverEnv } from "@/lib/env";
import type { Database } from "@/lib/database.types";

/**
 * Service-role Supabase client — bypasses RLS. SERVER ONLY.
 * Use exclusively for privileged operations that cannot run under a user
 * session: admin bootstrap, parent invites, and Stripe webhook writes.
 *
 * Throws if the service role key is absent, so callers can surface a clear
 * "not configured yet" message rather than silently doing nothing.
 */
export function createAdminClient() {
  if (!serverEnv.serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to your environment " +
        "(Supabase Dashboard → Project Settings → API) to enable admin setup, " +
        "parent invites, and Stripe webhooks.",
    );
  }
  return createClient<Database>(env.supabaseUrl, serverEnv.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
