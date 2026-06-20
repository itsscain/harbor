import "server-only";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { planForPriceId } from "@/lib/stripe/server";

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

/**
 * Reflect a Stripe subscription into plus_subscriptions + households.plus_active.
 * Critical: this only toggles Plus *features*. The kiosk's core never reads this
 * — canceling Plus degrades to local-only, never to a broken device.
 */
export async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  const admin = createAdminClient();

  let householdId: string | undefined = sub.metadata?.household_id;
  if (!householdId) {
    const { data } = await admin
      .from("plus_subscriptions")
      .select("household_id")
      .eq("stripe_customer_id", String(sub.customer))
      .maybeSingle();
    householdId = data?.household_id;
  }
  if (!householdId) return;

  const priceId = sub.items.data[0]?.price?.id;
  const periodEndUnix = (sub as unknown as { current_period_end?: number })
    .current_period_end;

  await admin.from("plus_subscriptions").upsert(
    {
      household_id: householdId,
      stripe_customer_id: String(sub.customer),
      stripe_subscription_id: sub.id,
      status: sub.status,
      plan: planForPriceId(priceId),
      current_period_end: periodEndUnix
        ? new Date(periodEndUnix * 1000).toISOString()
        : null,
    },
    { onConflict: "household_id" },
  );

  await admin
    .from("households")
    .update({ plus_active: ACTIVE_STATUSES.has(sub.status) })
    .eq("id", householdId);
}
