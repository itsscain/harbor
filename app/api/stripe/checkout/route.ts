import { NextResponse } from "next/server";
import { getStripe, priceIdForPlan } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMyHousehold } from "@/lib/household";
import { env, isStripeConfigured } from "@/lib/env";

export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Harbor Plus isn't enabled yet." }, { status: 503 });
  }
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Billing unavailable." }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const household = await getMyHousehold();
  if (!household) {
    return NextResponse.json({ error: "No household found." }, { status: 400 });
  }

  const { plan } = await req.json().catch(() => ({ plan: "monthly" }));
  const price = priceIdForPlan(String(plan));
  if (!price) return NextResponse.json({ error: "Unknown plan." }, { status: 400 });

  // Reuse an existing Stripe customer for this household if we have one.
  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("plus_subscriptions")
    .select("stripe_customer_id")
    .eq("household_id", household.id)
    .maybeSingle();
  const customerId = sub?.stripe_customer_id ?? undefined;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    customer: customerId,
    customer_email: customerId ? undefined : (user.email ?? undefined),
    client_reference_id: household.id,
    metadata: { household_id: household.id },
    subscription_data: { metadata: { household_id: household.id } },
    allow_promotion_codes: true,
    success_url: `${env.siteUrl}/app/billing?status=success`,
    cancel_url: `${env.siteUrl}/app/billing?status=cancel`,
  });

  return NextResponse.json({ url: session.url });
}
