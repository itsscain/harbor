import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { env, isStripeConfigured } from "@/lib/env";

export async function POST() {
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

  // Parents can read their own subscription row (RLS), so use the session client.
  const { data: sub } = await supabase
    .from("plus_subscriptions")
    .select("stripe_customer_id")
    .eq("household_id", household.id)
    .maybeSingle();

  if (!sub?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No subscription to manage yet." },
      { status: 400 },
    );
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${env.siteUrl}/app/billing`,
  });

  return NextResponse.json({ url: session.url });
}
