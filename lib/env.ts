/**
 * Centralized environment access. Public values are inlined by Next at build
 * time; server-only secrets are read lazily so the app boots even when optional
 * ones (Stripe, service role) are absent.
 */

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  // `||` (not `??`) so an empty string also falls back; strip any trailing slash.
  siteUrl: (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : "") ||
    "http://localhost:3000"
  ).replace(/\/+$/, ""),
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
  // VAPID public key — safe to expose; the client needs it to subscribe to web push.
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
};

/** Server-only secrets. Never import into client components. */
export const serverEnv = {
  get serviceRoleKey() {
    return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  },
  get stripeSecretKey() {
    return process.env.STRIPE_SECRET_KEY ?? "";
  },
  get stripeWebhookSecret() {
    return process.env.STRIPE_WEBHOOK_SECRET ?? "";
  },
  get stripePriceMonthly() {
    return process.env.STRIPE_PRICE_MONTHLY ?? "";
  },
  get stripePriceAnnual() {
    return process.env.STRIPE_PRICE_ANNUAL ?? "";
  },
  get adminEmail() {
    return process.env.ADMIN_EMAIL ?? "";
  },
  get adminTempPassword() {
    return process.env.ADMIN_TEMP_PASSWORD ?? "";
  },
  get setupSecret() {
    return process.env.SETUP_SECRET ?? "";
  },
  // Web Push (VAPID). Private key stays server-side; subject is a mailto:/https: contact.
  get vapidPrivateKey() {
    return process.env.VAPID_PRIVATE_KEY ?? "";
  },
  get vapidSubject() {
    return process.env.VAPID_SUBJECT ?? "";
  },
};

/** True only when the VAPID keys needed to send web push are present. The app runs fine
 *  without them — notifications degrade to the in-app center + badge (no push). */
export function isPushConfigured(): boolean {
  return Boolean(env.vapidPublicKey && serverEnv.vapidPrivateKey && serverEnv.vapidSubject);
}

/** True only when every Stripe key needed to run billing is present. */
export function isStripeConfigured(): boolean {
  return Boolean(
    serverEnv.stripeSecretKey &&
      env.stripePublishableKey &&
      serverEnv.stripePriceMonthly &&
      serverEnv.stripePriceAnnual,
  );
}

/** Service role is required for admin bootstrap, invites, and webhooks. */
export function hasServiceRole(): boolean {
  return Boolean(serverEnv.serviceRoleKey);
}

export function assertSupabasePublicEnv() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment.",
    );
  }
}
