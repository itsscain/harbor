---
name: harbor-operator-hq
description: Operator HQ (/admin) rework + public Founder Funnel — F1 funnel + O1 dashboard/CRM + O2 Fleet/Account Inspector + O3 procurement/Settings shipped 2026-06-29..07-01; Stripe billing + F2/F3 pending.
metadata:
  type: project
  originSessionId: 3cd03412-7647-4c62-ade9-5099b108cba8
---

Spec `HARBOR_OPERATOR_HQ_ADMIN.md` (Downloads) — turn /admin into a premium operator command center
(dashboard/CRM/accounts/fleet/billing/catalog/procurement) + a public **Founder Funnel** (§17, the inbound
growth engine). Phasing: O1 (dashboard+CRM+design system) + F1 (public funnel) first → O2 (account inspector
+ fleet, the "big ask") → O3 (Stripe billing + catalog/procurement). Build the funnel first — it's
publicly verifiable + lets the user advertise/reserve founders immediately.

**Existing /admin (don't rebuild):** shell `app/admin/(console)/layout.tsx` (`requireAdmin()`),
`components/admin/AdminNav.tsx` (the nav list), `PageHeader`. Console pages: Dashboard `(console)/page.tsx`
(KPIs, MRR hardcoded 3.99), My Family, Build Catalog `builds/`, Shopping List, Inventory, Customers
`customers/`. Data model (migration **0002**): `builds` (standard_price/founder_price/is_default),
`build_supplies` (NOT build_supply_lines), `inventory` (NOT inventory_parts), `customers` (the installs
records; status enum lead/scheduled/installed; `founder_number` CHECK 1-15 + partial-unique), `referrals`,
`plus_subscriptions`, `device_pairings`, `waitlist`. **Founder cap=15** was `FOUNDER_SPOTS` const in
`lib/types.ts` + the customers CHECK; **rate=$249** was per-build `builds.founder_price` (live DB: Harbor
Standard is_default @ $199 now; a real "Harbor Lantern (Kids)" build @ $119.99 exists). Stripe: coded but
**no keys** (subscription-only; no invoices/one-time). **No Turnstile/captcha** anywhere.

**F1 SHIPPED (2026-06-29) — the public Founder Funnel (§17):**
- Migration **0053_founder_funnel**: `founder_program` config (cap/rate/enrollment singleton), `founder_signups`
  (the quote/lead: contact + family_info/logistics/campaign/quote jsonb + status enum reserved/approved/
  scheduled/invoiced/active/released/waitlist + tentative founder_number). Anon SECURITY DEFINER RPCs:
  **`rpc_reserve_founder_spot(jsonb)`** — `pg_advisory_xact_lock` serialized → CANNOT oversell; full/paused →
  auto-captures as **waitlist** (link never dies); one active reservation per email (dedupe); founder# = lowest
  free 1..cap across founder_signups ∪ customers. **`rpc_founder_spots_remaining()`** → jsonb {remaining,cap,
  state} — a NUMBER only, never the list. **`rpc_public_builds()`** → safe build fields (no build_supplies
  costs). `founder_active_count()` = funnel-active + customers-with-founder# (honest count); EXECUTE revoked
  from anon/public (internal helper). Tables admin-only RLS. (get_advisors: the anon-executable warnings on
  these RPCs are BY DESIGN, same as rpc_kiosk_*.)
- Public **`/founders`** (warm brand, public — proxy doesn't block it): landing (hero+live scarcity, empathy,
  how-it-works, builds, why-different, trust, FAQ) + OG/Twitter meta + UTM capture; **5-step intake**
  (`components/marketing/FounderIntake.tsx`: You / Kids / Harbor+live multi-kid Lantern quote / Wall+mounting /
  last bit) + honeypot. Server action `lib/actions/founder.ts` (zod + the RPCs). Lantern pricing
  `lib/founder-pricing.ts` (base + accelerating discount curve 0/25/45/60/70%; uses the real "Lantern" build
  price; the Lantern is split out of the hub options). **PRIVACY: never reveal the tablet BRAND publicly** —
  `rpc_public_builds` (migration 0055) drops `tablet_model` (the real model, e.g. SVITOO, stays in the builds
  table for operator/admin procurement only); the public funnel shows the Harbor name + screen size only. Hub
  sizes are **10.1" (Standard) / 12.1" (Max) / 13.1" (Ultimate)**.
- **/admin Founder Signups** queue (`(console)/founders/`): KPIs (claimed/left/to-review/waitlist), per-signup
  detail, Approve + **Release** (frees the spot → public counter goes back up). New AdminNav item.
- VERIFIED LIVE: /founders renders real "14 of 15 left" (1 taken by an existing customer); a full multi-step
  submit reserved Founder #2 with build+kids+quote; race-safe/dedupe/count-only confirmed via SQL; test data
  cleaned. **Note: types regenerated via MCP `generate_typescript_types` (output is JSON-wrapped {types}); next
  migration after 0053.**

**O1 dashboard SHIPPED (2026-06-29) — the command center (§4):** rewrote `app/admin/(console)/page.tsx`
into a real "run the business at a glance" dashboard. New `components/admin/Kpi.tsx` (value + MoM trend
arrow + hint). **KPIs** (6, with month-over-month deltas from created_at/install_date): active installs, Plus
MRR (+net-new), one-time revenue, open pipeline, founder spots (from `getFounderStatus`), fleet (paired walls
+ stale-build/offline). **"Needs your attention"** triage panel (the headline) — founder signups to review,
payments past-due, walls on an old build (app_version != VERCEL_GIT_COMMIT_SHA, guarded) / offline 24h+, low
inventory, cold leads (7+ days), clock-suspect devices, founder spots ≤3 — each one-tap to the fix; "all
clear" empty state. **Live install pipeline** (lead→scheduled→installed; note customer_status has ONLY those
3 — "active"=plus_subscriptions) + **founder funnel** (reserved→approved→scheduled→active) + both waitlists.
**Revenue at a glance** (MRR/ARR/one-time) + **activity feed** (merged customers + signups) + quick actions.
All admin-only read queries (6 parallel), null-safe. VERIFIED via SQL (attention shows real "5 parts low on
stock", fleet=6, founder 14/15); admin-gated so build+data-verified, not screenshotted. Data caveats:
**no stored MRR** (plan-derived constants 3.99/3.25); **plus_subscriptions.status is a free-text Stripe
string** (bucket, don't assume enum); no `customers.last_activity_at` (cold lead = old updated_at).

**O1 CRM SHIPPED (2026-06-29) — Customers pipeline + the funnel→CRM bridge (§5 / §17.5):**
`app/admin/(console)/customers/page.tsx` is now a managed pipeline (not a flat list): stage filter chips
with live counts (All/Lead/Scheduled/Installed via `?stage=`), name/email search (`?q=`), a "N founder signups
waiting" banner → /admin/founders, add-lead form collapsed (<details>). The customer RECORD + provisioning
already existed (`customers/[id]` + `provisionCustomer` invites parent + creates household + pairing code;
`createCustomer`/`updateCustomer`/`nextFounderNumber`/referrals in customers/actions.ts). NEW
**`convertFounderToCustomer(signupId)`** (founders/actions.ts): Approve a signup → inserts a linked customer
(name/email/phone/build/founder_number/status=lead + an intake summary in notes), sets `founder_signups.
customer_id` + status='approved', redirects to the record. Idempotent (re-opens if `customer_id` set); handles
the founder# 23505 conflict; redirect is OUTSIDE the try/catch. Founders queue Approve → "Approve → CRM";
converted rows show "View customer". customer_status enum is still only lead/scheduled/installed (no
active/churned). **Closes the loop: advertised link → reserved founder → approve → CRM record → provision.**
Verified the conversion DB path via SQL (reserve→convert→link, no conflict, count restored). Build-verified
(admin-gated). `setFounderSignupStatus` still exported (unused by the page now; kept for F2 stage moves).

**O2 Fleet SHIPPED (2026-06-29) — the Device Fleet (§10):** `/admin/fleet` — operator-wide view of every
`device_pairings` row + household/customer, kind (Wall/Lantern), online/offline (last_synced_at > 24h),
stale-build (app_version != `process.env.VERCEL_GIT_COMMIT_SHA`, no-ops in dev), clock-suspect, paused,
version, last-seen. Filter chips (all/online/offline/stale/pending/paused) + counts. **device_pairings RLS
already grants is_admin SELECT (0007) + UPDATE (0050)** → request-scoped client, NO service role. Remote ops
reuse the proven one-shot queue: `fleetCommand(id,action)` sets `pending_command` ('refresh'=clear caches→
latest build = the stale-wall fix; 'identify'=flash/chime), popped by the device's `rpc_kiosk_device_state`
≤30s (same as parent `deviceCommand`); a header BULK "Refresh N stale walls" hits all old-build walls. New
"Fleet" nav item; dashboard stale/offline/clock attention items deep-link to `/admin/fleet?filter=…`.
Verified via SQL (6 paired, 5 offline/unknown-version). Build+data verified (admin-gated).

**O2 Account Inspector SHIPPED (2026-06-29) — the big ask (§6):** open + fix any account, audited.
Migration **0056_admin_audit_log** (append-only: select+insert is_admin, NO update/delete; actor +
actor_name snapshotted). `lib/admin/audit.ts` `logAudit({action,targetType,targetId,detail})` (actor from
requireAdmin's returned Profile). `/admin/accounts` (searchable household list) + `/admin/accounts/[id]` (the
inspector: computed **health** = Active/At-risk/Broken-device/Payment-issue/Churned; overview; **family data**
— children+points + counts of routines/chores/events/lists/rewards, all via the existing is_admin RLS on the
14 consumer tables; **devices** with per-device Refresh/Identify via `accountDeviceCommand` audited; **billing**
status/plan/period + plus_active-drift detector, Stripe actions deferred; **diagnostics** last-sync/stale/
offline/clock; **support timeline** = this account's audit rows + `addAccountNote`). "Accounts" nav item;
customer record gained an "Open account inspector" link. All request-scoped (admin RLS, no service role).
Verified via SQL (household reads + audit write/read/cleanup). **O2 complete (Fleet + Inspector).**

**DEFERRED:** **O1 remainder** per-customer timeline (customer_events) + install-day checklist + kanban DnD; operator
design system; **O2 remainder** **view-as** (gated/audited impersonation), **data repair/edit**, account
lifecycle (suspend/reset/delete), **RBAC roles**, bulk cross-account — all clearly labeled "coming next" in
the inspector UI.

**O3 procurement SHIPPED (2026-06-29) — forecasting tied to the pipeline (§8):** `lib/admin/forecast.ts`
`forecastFromScheduled()` — for each scheduled-install customer, sum their build's REQUIRED (non-optional)
`build_supplies.quantity` → demand per part (normalized `partKey` = lowercased/trimmed, matches
`inventory.part_name` ↔ `build_supplies.item` which are free-text, NOT FK-joined). Inventory page: per-part
scheduled-demand vs on-hand + an "Order N" shortfall badge (red) / Low (on_hand ≤ reorder) / OK; summary; an
"Also needed (not tracked)" list; a Reorder-list link. Shopping List: a "From scheduled installs"
(`?source=scheduled`) mode aggregating required parts across all scheduled installs into one batch list.
Catalog economics (§7 margins) already existed on the builds editor. Operator-facing → real part names show
(brand-hide is public-funnel-only). Verified the aggregation via SQL (2 scheduled → demand 2/line). Build
clean. **O3 Settings SHIPPED (2026-06-29) — configurable founder program (§9.4/§11):** `/admin/settings` (new
"Settings" nav item) — a Founder Program card editing **cap / rate / pause-enrollment** + live claimed/
remaining; `updateFounderProgram` updates the `founder_program` singleton (`.eq("id", true)`), audited, +
revalidates `/admin` and `/founders`. Pausing → `enrollment_state='paused'` → the reserve RPC routes new
signups to waitlist (funnel already honors it). Migration **0057** relaxed `customers.founder_number` CHECK
1..15 → `>= 1` so the cap is genuinely raisable (uniqueness still via the partial index; cap enforced at
reservation). `customers/actions.ts` now honors the live cap (nextFounderNumber reads founder_program.cap;
manual founder# validates >=1). Verified e2e via SQL (#16 allowed, cap=20 reflected, restored 15/14). The
`FOUNDER_SPOTS=15` const remains only as a fallback. Build clean.

**DEFERRED:** business profile / pricing-fees / team+RBAC roles / notifications (Settings §11 remainder);
suppliers/lead-times + PO ordered→received auto-decrement; **O3** Stripe billing/revenue + configurable
founder program + catalog economics + procurement/inventory forecasting + Settings/roles. **F2** review→approve→
schedule→**Stripe pay-later invoice**→provision/pair + the managed endpoint (pause/edit/analytics, waitlist
auto-transition UI). **F3** abuse hardening (**Cloudflare Turnstile** + email-verify + rate-limit), funnel
analytics. Related: [[harbor-project]], [[harbor-device-mgmt]], [[harbor-brand-identity]].
