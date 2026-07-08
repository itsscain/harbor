import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotifCategory } from "./prefs";

// Scheduled-notification helpers. Jobs are Vercel Cron → GET routes under /api/cron/*.
// On Hobby, cron runs at most daily, which fits the morning briefing + weekly digest.
// (Sub-hourly "30 min before" event pings need Vercel Pro or Supabase pg_cron — a follow-up.)

/** Vercel injects `Authorization: Bearer <CRON_SECRET>` when it invokes a cron path.
 *  If the secret is set we require it; if unset (local dev) we allow, so dev is frictionless
 *  while production (which always has CRON_SECRET) is protected. */
export function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/** Household-level idempotency: has a notification of this category been created for the
 *  household within the last `hours`? Cron can retry, and we never want a double-send. */
export async function sentWithin(
  admin: SupabaseClient,
  householdId: string,
  category: NotifCategory,
  hours: number,
): Promise<boolean> {
  const since = new Date(Date.now() - hours * 3_600_000).toISOString();
  const { data } = await admin
    .from("notifications")
    .select("id")
    .eq("household_id", householdId)
    .eq("category", category)
    .gte("created_at", since)
    .limit(1);
  return !!(data && data.length);
}
