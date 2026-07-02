"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getMyHousehold } from "@/lib/household";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications/dispatch";
import { mergePrefs, type NotifPrefs } from "@/lib/notifications/prefs";

/** Register (or refresh) this device's web-push subscription for the signed-in parent. */
export async function registerPushSubscription(sub: { endpoint: string; p256dh: string; auth: string; platform?: string }) {
  const profile = await requireUser();
  const household = await getMyHousehold();
  if (!household || !sub?.endpoint || !sub.p256dh || !sub.auth) return;
  const supabase = await createClient();
  await supabase.from("push_subscriptions").upsert(
    {
      parent_id: profile.id,
      household_id: household.id,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
      platform: sub.platform ?? null,
      active: true,
      last_success_at: null,
    },
    { onConflict: "parent_id,endpoint" },
  );
  // Shared-device safety: a browser has ONE push endpoint. If another parent had enrolled it, deactivate
  // their row so household-A notifications can't reach a device now used by parent B (service role bypasses
  // RLS to reach the other parent's row). The 404/410 prune path is a slower backstop.
  try {
    const admin = createAdminClient();
    await admin.from("push_subscriptions").update({ active: false }).eq("endpoint", sub.endpoint).neq("parent_id", profile.id);
  } catch {
    /* no service role — the dead-subscription prune path still self-heals */
  }
}

/** Deactivate this device's subscription (parent turned notifications off here). */
export async function unregisterPushSubscription(endpoint: string) {
  const profile = await requireUser();
  if (!endpoint) return;
  const supabase = await createClient();
  await supabase.from("push_subscriptions").update({ active: false }).eq("parent_id", profile.id).eq("endpoint", endpoint);
}

/** Save the parent's notification preferences (categories, quiet hours, detail level). */
export async function saveNotificationPrefs(prefs: NotifPrefs) {
  const profile = await requireUser();
  const supabase = await createClient();
  await supabase.from("notification_preferences").upsert(
    { parent_id: profile.id, prefs: mergePrefs(prefs), updated_at: new Date().toISOString() },
    { onConflict: "parent_id" },
  );
  revalidatePath("/app/settings");
}

/** Send a test notification to THIS parent only — writes the in-app record + pushes to their
 *  devices, so they can confirm the whole pipeline end-to-end. */
export async function sendTestNotification() {
  const profile = await requireUser();
  const household = await getMyHousehold();
  if (!household) return;
  await notify({
    householdId: household.id,
    parentIds: [profile.id],
    category: "moments",
    title: "Test from Harbor ⚓",
    body: "Your notifications are working — this is what a calm Harbor heads-up looks like.",
    route: "/app/notifications",
    test: true, // bypass category/quiet-hours so the test truly exercises the push pipeline
  });
  revalidatePath("/app/notifications");
  revalidatePath("/app");
}

export async function markNotificationRead(id: string) {
  const profile = await requireUser();
  const supabase = await createClient();
  await supabase.from("notifications").update({ status: "read" }).eq("id", id).eq("parent_id", profile.id);
  revalidatePath("/app/notifications");
  revalidatePath("/app");
}

export async function markAllNotificationsRead() {
  const profile = await requireUser();
  const supabase = await createClient();
  await supabase.from("notifications").update({ status: "read" }).eq("parent_id", profile.id).eq("status", "unread");
  revalidatePath("/app/notifications");
  revalidatePath("/app");
}
