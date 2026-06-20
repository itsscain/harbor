import "server-only";
import Stripe from "stripe";
import { serverEnv } from "@/lib/env";

/** Stripe server client, or null when not configured (app stays functional). */
export function getStripe(): Stripe | null {
  if (!serverEnv.stripeSecretKey) return null;
  return new Stripe(serverEnv.stripeSecretKey, {
    appInfo: { name: "Harbor" },
  });
}

export function priceIdForPlan(plan: string): string | null {
  if (plan === "annual") return serverEnv.stripePriceAnnual || null;
  if (plan === "monthly") return serverEnv.stripePriceMonthly || null;
  return null;
}

export function planForPriceId(priceId: string | undefined): "monthly" | "annual" {
  return priceId && priceId === serverEnv.stripePriceAnnual ? "annual" : "monthly";
}
