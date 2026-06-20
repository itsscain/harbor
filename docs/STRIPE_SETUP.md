# Activating Harbor Plus (Stripe)

The Plus billing code is fully built but **inert until these env vars are set**.
The kiosk and the free core work with or without Stripe.

## 1. Create the product + prices (test mode first)
In the Stripe Dashboard (or via the Stripe MCP once connected):
1. Product **"Harbor Plus"**.
2. Recurring price **$3.99 / month** → copy its `price_…` id.
3. Recurring price **$39 / year** → copy its `price_…` id.

## 2. Set environment variables
Local (`.env.local`) and on Vercel:
```
STRIPE_SECRET_KEY=sk_test_…
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…
STRIPE_PRICE_MONTHLY=price_…      # the $3.99/mo price id
STRIPE_PRICE_ANNUAL=price_…       # the $39/yr price id
STRIPE_WEBHOOK_SECRET=whsec_…     # from step 3
```
`isStripeConfigured()` flips on once the secret key, publishable key, and both
price ids are present — the billing page then shows real checkout buttons.

## 3. Add the webhook
- Endpoint URL: `https://<your-domain>/api/stripe/webhook`
- Events: `checkout.session.completed`, `customer.subscription.created`,
  `customer.subscription.updated`, `customer.subscription.deleted`
- Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
- Local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

## 4. Customer Portal
Enable the Customer Portal in Stripe (Settings → Billing → Customer portal) so
the "Manage or cancel subscription" button works.

## How it behaves
- Checkout (`/api/stripe/checkout`) creates a subscription session per household.
- The webhook upserts `plus_subscriptions` and toggles `households.plus_active`.
- **Canceling only disables Plus features** (cloud backup, remote edit, insights,
  new content). The kiosk keeps running from local IndexedDB data — core function
  is never gated behind subscription status.
