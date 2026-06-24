# Harbor — Complete Design Document

_Last updated: today. Living document — reflects the codebase as built._

## Executive Summary

Harbor is a wall-mounted tablet family command center for chaotic and neurodivergent households. It turns a tablet into a steady, calm home base where children follow visual routines, reach for self-regulation tools, and earn rewards — while parents keep the device completely locked down. The core promise is simple and uncompromising: **one payment, you own it, no required monthly fee.** The kiosk's daily core (routines, rewards, calm tools, calendar, lists, house rules) runs entirely local-first from IndexedDB and works fully offline. It must never be gated behind a server or a subscription. Harbor Plus (cloud sync, edit-from-phone, family insights, AI features) is optional and purely additive; canceling Plus degrades the device to local-only, never to a broken device.

Architecturally, Harbor is a single Next.js 16 application (App Router, React 19, Turbopack) serving four distinct surfaces — a public marketing site with a Founding Family waitlist (`/`), the offline-first kiosk PWA (`/kiosk`), the parent companion (`/app`), and the operator admin console (`/admin`). Supabase (PostgreSQL + Auth) provides the backend with Row-Level Security on every table; the kiosk authenticates not with user logins but with per-device secrets validated by anon-callable `SECURITY DEFINER` RPCs. Stripe powers optional Plus billing behind an `isStripeConfigured()` guard so the app boots keyless. An optional bring-your-own-key AI companion (Claude Haiku) adds meal planning, daily briefs, calm-corner support, age-aware chore suggestions, per-child encouragement profiles, family insights, and a "Hey Harbor" voice interface — all server-side, with the API key never reaching the wall. This document is the exhaustive reference for every surface, the full data model, the security model, the offline sync engine, the design system, the behavior/reward systems, and the known gaps and roadmap.

## Table of Contents

1. [Product Overview & Architecture](#1-product-overview--architecture)
2. [Data Model (Database Schema)](#2-data-model-database-schema)
3. [Security, RLS & Kiosk Authorization](#3-security-rls--kiosk-authorization)
4. [Kiosk — Offline-First Engine](#4-kiosk--offline-first-engine)
5. [Kiosk — Screens, Components & Interactions](#5-kiosk--screens-components--interactions)
6. [Parent Companion (/app)](#6-parent-companion-app)
7. [Admin Console, Public Site & Billing](#7-admin-console-public-site--billing)
8. [AI Companion Subsystem](#8-ai-companion-subsystem)
9. [Design System, Brand & Accessibility](#9-design-system-brand--accessibility)
10. [Behavior, Rewards & Motivation Systems](#10-behavior-rewards--motivation-systems)
11. [Known Gaps, Tech Debt & Improvement Opportunities](#11-known-gaps-tech-debt--improvement-opportunities)
12. [Appendix — Key File Map](#12-appendix--key-file-map)

---

## 1. Product Overview & Architecture

### What is Harbor?

Harbor is a **wall-mounted tablet family command center** for chaotic and neurodivergent households. It turns a tablet into a steady, calm home base that helps children follow visual routines, access self-regulation tools, and earn rewards—while parents keep the device completely locked down.

**Core promise: One payment, you own it. No required monthly fee.**

The kiosk's daily core (routines, rewards, calm tools) runs **local-first from IndexedDB** and works fully offline. It must never be gated behind a server or subscription. Harbor Plus (cloud sync, edit-from-phone, family insights) is optional and purely additive; canceling Plus degrades the device to local-only, never to broken functionality.

### Four Surfaces

Harbor is a single Next.js 16 application serving four distinct user contexts:

| Surface | Route | Audience | Purpose |
|---------|-------|----------|---------|
| **Public** | `/` | Prospective families | Marketing site + Founding Family waitlist signup |
| **Kiosk** | `/kiosk` | Children (on wall) | Local-first PWA; main product; no login required |
| **Parent App** | `/app` | Parents/guardians | Manage household, children, routines, calm tools, rewards, insights, Plus billing |
| **Admin Console** | `/admin` | Operator HQ | Catalog management, sourcing, customer/install tracking, provisioning, founder program |

Routing and auth are enforced in `proxy.ts` (Next.js 16 middleware convention):
- `proxy.ts` refreshes the Supabase session on every request
- `/admin/**` → role `"admin"` only (except `/admin/setup`, the one-time bootstrap)
- `/app/**` → any authenticated user
- `/kiosk` → intentionally **not gated** (local-first, device-secret based)
- `/` → public

### Technology Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| **Runtime** | Next.js | 16.2.9 | App Router, React 19, Turbopack bundler |
| **Framework** | React | 19.2.4 | Server Components default; `"use client"` for interactive features |
| **Language** | TypeScript | ^5 | Strict mode throughout |
| **Styling** | Tailwind CSS | v4 | PostCSS with `@theme` for design tokens |
| **Backend** | Supabase | v0.12.0 (SSR SDK) | PostgreSQL, Auth, RLS policies, custom RPCs |
| **Kiosk Storage** | IndexedDB (idb) | 8.0.3 | Single-origin, per-device, offline source of truth |
| **Sync** | Custom engine | — | Kiosk `lib/kiosk/sync.ts` handles pull/push lifecycle |
| **Payments** | Stripe | 22.2.2 | Optional; guards with `isStripeConfigured()` |
| **UI Icons** | lucide-react | 1.21.0 | Lightweight SVG icons |
| **Type Safety** | Zod | 4.4.3 | Runtime schema validation |

### Folder Structure

```
C:\Users\penda\HARBOR
├── app/                          # Next.js App Router pages
│   ├── (kiosk)/                  # PWA shell (intentionally ungated in proxy.ts)
│   │   ├── layout.tsx            # Registers service worker (RegisterSW)
│   │   └── page.tsx              # KioskApp entry point
│   ├── (admin)/                  # Admin console & bootstrap
│   │   ├── (console)/            # Main operator HQ (auth: admin)
│   │   │   ├── layout.tsx        # Sidebar nav + auth check
│   │   │   ├── page.tsx          # Dashboard
│   │   │   ├── customers/        # Customer management
│   │   │   ├── inventory/        # Build catalog & sourcing
│   │   │   ├── builds/           # Build definitions + supplies
│   │   │   ├── shopping-list/    # Sourcing spreadsheet
│   │   │   └── my-family/        # Demo household setup
│   │   └── setup/                # One-time bootstrap (no auth)
│   ├── (app)/                    # Parent companion (auth: any logged-in user)
│   │   ├── layout.tsx            # Header + bottom nav + auth check
│   │   ├── billing/              # Plus subscription & portal
│   │   ├── calendar/             # Family calendar (events, meals, countdowns)
│   │   ├── children/             # Child management & profiles
│   │   ├── calm/                 # Calm tool editor
│   │   ├── history/              # Activity log
│   │   ├── insights/             # Family analytics (Plus)
│   │   └── lists/                # Shared lists (grocery, chores, etc.)
│   ├── account/                  # User account management
│   │   └── password/             # Password reset flow
│   ├── login/                    # Auth entry point
│   ├── api/                      # Route handlers
│   │   ├── stripe/               # Webhook, checkout, portal links
│   │   └── ai/                   # AI integration (e.g., Claude API)
│   ├── layout.tsx                # Root layout (fonts, metadata, globals.css)
│   ├── globals.css               # Tailwind + design tokens (@theme)
│   ├── page.tsx                  # Landing page
│   └── not-found.tsx, global-error.tsx
├── lib/                          # Shared utilities & logic
│   ├── supabase/                 # Client/server/admin/middleware
│   ├── kiosk/                    # Local-first engine (db, types, sync, feedback, etc.)
│   ├── stripe/                   # Payment integration (server, sync)
│   ├── actions/                  # Server Actions (auth, waitlist)
│   ├── database.types.ts         # Generated from Supabase schema (1642 lines)
│   ├── types.ts                  # Convenience aliases + type helpers
│   ├── env.ts                    # Environment access + guards
│   ├── auth.ts                   # Role/session helpers
│   ├── household.ts              # getMyHousehold, plusActive
│   └── [cn, codes, format, pin, pairing-format].ts
├── components/                   # React components (kiosk/, app/, admin/, marketing/, brand/, ui/)
├── public/                       # Static assets (sw.js, manifest.webmanifest, icons/)
├── supabase/                     # Database & RLS (migrations/, SECURITY_NOTES.md)
├── proxy.ts                      # Middleware entry (Next.js 16 convention)
├── next.config.ts, tsconfig.json, postcss.config.mjs, eslint.config.mjs, package.json
├── AGENTS.md                     # Architecture notes (codebase guidelines)
└── CLAUDE.md                     # [stub file]
```

### Supabase Backend & Security

Harbor uses Supabase (PostgreSQL + Auth + RLS) with custom RPCs for kiosk communication. The architecture centers on RLS (Row-Level Security) policies and three distinct Supabase clients. The full schema is documented in [Section 2](#2-data-model-database-schema) and the security model in [Section 3](#3-security-rls--kiosk-authorization); the highlights below orient the rest of this document.

#### Supabase Clients (in `lib/supabase/`)

| Client | Purpose | API Key | Session |
|--------|---------|---------|---------|
| **client.ts** | Browser Supabase client | Anon (publishable) | Client-side session; safe for `"use client"` |
| **server.ts** | Server Supabase client | Anon (publishable) | Request-scoped from cookies; RLS applies (signed-in user context) |
| **admin.ts** | Service-role client | Service role (secret) | Bypasses RLS; used for bootstrap, parent invites, Stripe webhooks |
| **middleware.ts** | Session middleware | Anon key | Refreshes auth token on every request; enforces route guards |

#### Kiosk RPCs (Device-Secret Authentication)

The kiosk has no user login. Instead, it authenticates via `device_secret` (a UUID issued during pairing). Three RPCs handle all kiosk I/O:

1. **`rpc_kiosk_pair(code: text)`** — called once at setup; validates a single-use pairing code, marks it used, and returns `{ device_secret, household_id, snapshot }`. The device stores the secret in IndexedDB.
2. **`rpc_kiosk_pull(secret: uuid, since: timestamptz | null)`** — fetches the complete household snapshot (`since=null`) or deltas since a cursor; validates the `device_secret` server-side.
3. **`rpc_kiosk_push(secret: uuid, payload: jsonb)`** — submits mutations (`{ check_ins, completions, chore_dones, redemptions, list_ops }`), validates the secret, routes mutations to the correct household/children, and applies them transactionally.

All three are `anon`-callable by design (kids never authenticate). Table-level RLS prevents direct access; only the RPCs touch data, scoped to the device's household. Full detail in [Section 3](#3-security-rls--kiosk-authorization).

### Kiosk: Local-First Architecture

The kiosk is the core product—a PWA that runs **entirely offline from IndexedDB**. It must never break if the server is down or the subscription is cancelled.

#### Data Flow

```
User taps on wall tablet
  ↓
Browser loads /kiosk (cached by service worker if offline)
  ↓
KioskApp initializes; useKiosk hook boots
  ↓
loadState() reads IndexedDB harbor-kiosk store
  ↓
If no state: show PairingScreen (device_code entry)
  ↓
Call rpc_kiosk_pair(code) → returns device_secret
  ↓
Store state: { deviceSecret, householdId, snapshot, pinHash, points, progress, outbox }
  ↓
Render KioskShell (nav, screensaver, PIN gate)
  ↓
Child taps a routine → ChildView renders steps (offline)
  ↓
Child completes steps → mutations queued in outbox
  ↓
Service worker intercepts Supabase calls (cross-origin); sync layer handles offline
  ↓
When online + Plus active: sync.ts pushes outbox via rpc_kiosk_push
  ↓
If Plus cancelled: outbox is pruned; local state is untouched
```

The implementation of this engine is documented in depth in [Section 4](#4-kiosk--offline-first-engine) and the screen-level UX in [Section 5](#5-kiosk--screens-components--interactions).

#### Non-Negotiable: Local-First Core

The kiosk's daily core (routines, rewards, calm tools, calendar, lists, house rules) runs 100% from IndexedDB. **Nothing is gated behind the server or a subscription.**

- If Supabase is down: the kiosk works unchanged.
- If Plus is cancelled: the device degrades gracefully — the outbox is cleared (pending sync mutations pruned), local state is untouched, all features remain available, and the next pull fetches the updated snapshot (Plus features removed, core intact).

#### Parent PIN

- Stored in `households.parent_pin_hash` (SHA-256), also stored locally in `KioskState.pinHash` for offline verification.
- Adoptable from the account snapshot (parent can set it via `/app`).
- Gates parent settings, edit mode, factory reset, and device pairing changes; verified offline with `hashPin()` before any parent action.

### Parent Companion (`/app`)

The parent app is the control center for managing the household and monitoring progress. Parents must authenticate (email + password). It is documented exhaustively in [Section 6](#6-parent-companion-app); the orientation below summarizes its surface area.

- **`app/(parent)/layout.tsx`** — auth gate via `requireUser()`, sticky header (Wordmark + AccountMenu), centered main content, bottom navigation, animated route transitions.

| Route | Feature |
|-------|---------|
| `/app/children` | Child list; add/edit/delete children (with avatar, color, birthday) |
| `/app/children/[id]` | Individual child page (profile, color, AI context, motivators, routines, chores, grounding, calm corner) |
| `/app/calendar` | Family calendar (events, meals, countdowns, recurrence) |
| `/app/lists` | Shared lists (grocery, to-do, chores) |
| `/app/calm` | Calm tool builder (breathing, feelings, break, social stories) |
| `/app/history` | Activity log (completions, redemptions, check-ins) |
| `/app/insights` | Analytics & trends (Plus-only) |
| `/app/billing` | Plus subscription management (Stripe portal) |

### Admin Console (`/admin`)

The admin console is operator HQ—for business operations, customer management, and provisioning. Full detail in [Section 7](#7-admin-console-public-site--billing).

- **Bootstrap (`/admin/setup`)** — one-time setup, no auth; sets up the initial admin using `ADMIN_EMAIL`, `ADMIN_TEMP_PASSWORD`, `SETUP_SECRET`; requires `SUPABASE_SERVICE_ROLE_KEY`.
- **Main Console (`/admin/(console)`)** — requires `role: "admin"` (enforced by middleware + `requireAdmin()`): dashboard, customers, builds + supply BOM, inventory, shopping-list, my-family demo household.

### Stripe Integration (Harbor Plus)

Plus is optional. The app runs fully functional without it. Features gated by Plus: cloud sync (push/pull), edit-from-phone, family insights, and advanced calm tools. Full detail in [Section 7](#7-admin-console-public-site--billing).

#### Guarded by `isStripeConfigured()`

```typescript
function isStripeConfigured(): boolean {
  return Boolean(
    serverEnv.stripeSecretKey &&
      env.stripePublishableKey &&
      serverEnv.stripePriceMonthly &&
      serverEnv.stripePriceAnnual
  );
}
```

If any key is missing, Stripe endpoints 404/503; the app works normally.

### Environment & Deployment

#### Environment Variables (`.env.local`)

```
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...     # Required for bootstrap, invites, webhooks

# Admin bootstrap (one-time)
ADMIN_EMAIL=admin@example.com
ADMIN_TEMP_PASSWORD=TempPassword123!
SETUP_SECRET=random-secret-key           # Guards /admin/setup

# Stripe (optional; leave blank until ready)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_PRICE_MONTHLY=price_1A2B3C...
STRIPE_PRICE_ANNUAL=price_4D5E6F...

# Deployment
NEXT_PUBLIC_SITE_URL=https://harbor.example.com
# Or relies on NEXT_PUBLIC_VERCEL_URL if deployed to Vercel
```

#### Deployment (Vercel)

Harbor is deployed to Vercel (the default Next.js hosting). Production URL stored in `NEXT_PUBLIC_SITE_URL` (used for Stripe callback URLs, password reset links, etc.).

- Project ID: `prj_JtTfqmwTdz9oKn2Ma1W3CNEVMDvQ` (in `.vercel/project.json`)
- Organization: `team_ySgpPTs2yclt0MyGghsXgPX0`
- Builds with Turbopack (Next.js 16)
- Run `npm run build` locally to verify (must remain clean)

#### Keyless Boot

The app boots even when optional services (Stripe, service role key) are missing: `isStripeConfigured()` guards all Stripe endpoints, `hasServiceRole()` guards bootstrap (with clear alerts if missing), parent login works without Stripe, and the kiosk works entirely offline without Stripe or Supabase.

### Request APIs (Next.js 16 Async)

Next.js 16 App Router changes request APIs to async. Code must adapt:

```typescript
// Server Component
const cookieStore = await cookies();
const pathname = request.nextUrl.pathname;
const params = await props.params;
const searchParams = await props.searchParams;
```

`lib/supabase/middleware.ts` and `lib/supabase/server.ts` both use async/await for cookies. Middleware calls `updateSession(request)` on every routed request (via `proxy.ts`).

### Summary Table: Four Surfaces

| Surface | Route | Auth | Tech | Purpose |
|---------|-------|------|------|---------|
| **Public** | `/` | None | Static + Server Components | Marketing + waitlist |
| **Kiosk** | `/kiosk` | Device secret (IndexedDB) | React + IndexedDB + PWA | Core product; offline-first routines, rewards, calm tools |
| **Parent** | `/app` | Email/password (Supabase Auth) | React Server Components + Server Actions | Manage household, children, events, Plus billing |
| **Admin** | `/admin` | Supabase Auth (role: admin) | React Server Components + Server Actions | Operator HQ; catalog, customers, provisioning |

---

## 2. Data Model (Database Schema)

### Summary

Harbor's database contains **30 tables** organized across five logical domains: household/profile management, child-centric content (routines, chores, calm tools), rewards & commerce, family coordination (events, meals, reminders, messages), and operator/admin infrastructure. All tables use soft-delete (`deleted_at` tombstones) for delta-sync compatibility; most carry `updated_at` triggers for change tracking. The core RBAC model splits access into two roles: `admin` (platform operator) and `parent` (household owner); Row-Level Security policies enforce household scoping.

| **Table** | **Purpose** | **Scope** | **Key Columns** | **Soft-Delete** |
|-----------|-----------|----------|-----------------|-----------------|
| `profiles` | User accounts (1:1 with auth.users) | Global | `id (uuid, PK)`, `role`, `full_name`, `must_change_password` | No |
| `households` | Family groups | Per owner | `id`, `owner_id (FK)`, `name`, `plus_active`, `parent_pin_hash`, `settings (jsonb)` | No |
| `children` | Family members | Per household | `id`, `household_id (FK)`, `name`, `avatar`, `photo_url`, `color`, `birthday`, `ai_profile (jsonb)`, `settings (jsonb)`, `sort_order` | Yes |
| `routines` | Daily/weekly task sequences | Per child | `id`, `child_id (FK)`, `name`, `type (enum: schedule\|first_then)`, `active`, `start_time`, `end_time`, `days_of_week (int[])`, `sort_order` | Yes |
| `routine_steps` | Steps within a routine | Per routine | `id`, `routine_id (FK)`, `label`, `icon`, `photo_url`, `step_type (enum: task\|first\|then)`, `reward_points`, `start_time`, `duration_min`, `order_index` | Yes |
| `chores` | Reusable assigned tasks | Per child | `id`, `child_id (FK)`, `household_id (FK)`, `title`, `icon`, `points`, `days_of_week (int[])`, `active`, `requires_approval`, `rotation_member_ids (jsonb)`, `sort_order` | Yes |
| `rewards` | Running points balance | Per child (1:1) | `id`, `child_id (FK, unique)`, `points_total` | No |
| `reward_log` | Append-only earning/redemption history | Per child | `id`, `child_id (FK)`, `delta (int: +/-)`, `reason`, `step_id (FK)`, `chore_id (FK)`, `store_item_id (FK)`, `client_op_id (uuid)` | Yes |
| `calm_tools` | Emotion-regulation resources | Per household or per child | `id`, `household_id (FK)`, `child_id (FK, nullable)`, `tool_type (enum: breathing\|feelings\|break\|social_story)`, `config (jsonb)`, `enabled`, `sort_order` | Yes |
| `check_ins` | Emotion check-ins (feelings journal) | Per child | `id`, `child_id (FK)`, `feeling (text)`, `note (text, nullable)` | Yes |
| `groundings` | Time-out periods with paused privileges | Per child | `id`, `child_id (FK)`, `household_id (FK)`, `reason`, `note`, `started_on (date)`, `ends_on (date)`, `pause_rewards`, `pause_screen_time`, `status (text: active\|ended)`, `privileges_lost (jsonb)` | Yes |
| `corners` | Calm-corner support sessions | Per child | `id`, `child_id (FK)`, `household_id (FK)`, `reason`, `feeling`, `duration_minutes (1-60)`, `started_at (timestamptz)`, `ended_at`, `status (text: active\|done\|ended)`, `plan (jsonb)`, `report (text)` | Yes |
| `house_rules` | Household rules & consequence ladder | Per household | `id`, `household_id (FK)`, `kind (text: rule\|consequence)`, `title`, `detail`, `emoji`, `sort_order` | Yes |
| `events` | Family calendar entries | Per household | `id`, `household_id (FK)`, `child_id (FK, nullable)`, `title`, `emoji`, `location`, `starts_at (timestamptz)`, `ends_at`, `all_day`, `person_label`, `color`, `responsible_label`, `recurrence_rule`, `is_countdown` | Yes |
| `meals` | Weekly meal plan | Per household | `id`, `household_id (FK)`, `date`, `meal_type (breakfast\|lunch\|dinner\|snack)`, `title`, `emoji`, `notes`, `sort_order` | Yes |
| `reminders` | Due-date nudges | Per household | `id`, `household_id (FK)`, `child_id (FK, nullable)`, `title`, `due_date`, `repeat_rule`, `done`, `snoozed_until` | Yes |
| `store_items` | Reward catalog (points, screen time, goals) | Per household | `id`, `household_id (FK)`, `child_id (FK, nullable)`, `label`, `emoji`, `image_url`, `cost_points (≥0)`, `kind (reward\|screen_time\|allowance\|goal)`, `enabled`, `sort_order` | Yes |
| `wall_messages` | Parent notes to the household wall | Per household | `id`, `household_id (FK)`, `child_id (FK, nullable)`, `body`, `emoji`, `author_label`, `pinned`, `bonus_points`, `expires_at` | Yes |
| `list_items` | Shared grocery/task lists | Per household | `id`, `household_id (FK)`, `list_kind (grocery\|...)`, `name`, `category`, `quantity`, `checked`, `added_by_label`, `sort_order` | Yes |
| `ai_config` | Household AI companion settings | Per household (1:1) | `household_id (PK, FK)`, `anthropic_api_key (text, never in snapshot)`, `enabled`, `updated_at` | No |
| `ai_briefs` | Cached daily AI summaries | Per household per date | `household_id (FK)`, `date (PK)`, `brief (text)`, `created_at` | No |
| `device_pairings` | Kiosk device bindings | Per household | `id`, `household_id (FK)`, `code (unique, short string)`, `device_secret (uuid, unique when set)`, `device_label`, `status (enum: pending\|paired)`, `paired_at`, `last_synced_at` | No |
| `kiosk_deletions` | Soft-delete audit trail for delta sync | Per household | `id`, `household_id (FK)`, `entity (text: table name)`, `entity_id (uuid)`, `deleted_at` | No |
| `customers` | Sales/install records | Global (admin-only) | `id`, `household_id (FK, nullable)`, `name`, `email`, `phone`, `build_id (FK)`, `status (enum: lead\|scheduled\|installed)`, `install_date`, `install_fee`, `founder_number (1-15, unique when set)`, `notes` | No |
| `builds` | Product configurations (kiosk SKUs) | Global (admin-only) | `id`, `name`, `screen_size`, `tablet_model`, `standard_price`, `founder_price`, `is_default`, `sort_order` | No |
| `build_supplies` | Bill-of-materials per build | Per build | `id`, `build_id (FK)`, `item`, `vendor`, `url`, `unit_cost`, `quantity`, `optional`, `sort_order` | No |
| `inventory` | Parts tracking (optional) | Global (admin-only) | `id`, `part_name`, `on_hand_qty`, `reorder_threshold` | No |
| `referrals` | Founder referral pipeline | Per customer | `id`, `referring_customer_id (FK)`, `referred_name`, `referred_contact`, `status (enum: pending\|contacted\|converted\|declined)` | No |
| `plus_subscriptions` | Harbor Plus billing | Per household (1:1) | `household_id (FK, unique)`, `stripe_customer_id`, `stripe_subscription_id`, `status (text)`, `plan (enum: monthly\|annual)`, `current_period_end` | No |
| `waitlist` | Public Founding Family signups | Public | `id`, `name`, `email`, `town`, `kids_count` | No |

### Detailed Table Reference

#### Core Authentication & Households

**`profiles`** — Extends Supabase `auth.users` with role and metadata. Created automatically via trigger when a new auth user signs up; the first user globally becomes `admin`, the rest are `parent`.
- `id (uuid, PK)` references `auth.users(id)` with cascade delete; `role (enum: admin | parent)` default `parent`; `full_name (text, nullable)`; `must_change_password (boolean)` flag for forced reset; `created_at (timestamptz)`.
- **RLS:** user can read/write own row; admin can read/write all. No `deleted_at` (auth users immutable once created).

**`households`** — Aggregates all children, rules, and content for one family; owns all data in the system.
- `id (uuid, PK)` default `gen_random_uuid()`; `owner_id (uuid, FK → profiles.id)` cascade delete; `name (text)`; `plus_active (boolean)` denormalized flag (webhook syncs from `plus_subscriptions`); `parent_pin_hash (text, nullable)`; `settings (jsonb)` config blob; `created_at`, `updated_at`.
- **Indexes:** `households_owner_idx (owner_id)`. **RLS:** owner read/write; admin full access. **Triggers:** `set_updated_at`. Example settings: `{"idle_seconds": 300, "screensaver": "photo", "dark_mode": false}`.

#### Children & Core Routines

**`children`** — Each child in a household; anchor for all child-scoped data.
- `id`, `household_id (FK)` cascade delete, `name`, `avatar (text, nullable)` emoji, `photo_url (text, nullable)` (from `child-photos` bucket), `birthday (date, nullable)` (drives "X sleeps until birthday"), `color (text, nullable)` hex, `ai_profile (jsonb, nullable)` (`{"summary","motivators","encouragement_lines"}`), `settings (jsonb)`, `sort_order`, timestamps, `deleted_at`.
- **Indexes:** `children_household_idx`. **RLS:** `child_is_mine()` or admin. **Soft Delete:** yes. `photo_url` flows to kiosk via `to_jsonb(c)`; wall renders offline.

**`routines`** — Daily/weekly task sequences per child.
- `id`, `child_id (FK)` cascade delete, `name`, `type (enum: schedule | first_then)`, `active (boolean)` default true, `start_time (time, nullable)`, `end_time (time, nullable)`, `days_of_week (int[], nullable)` (0..6 Sun..Sat; null = every day), `sort_order`, timestamps, `deleted_at`.
- **Indexes:** `routines_child_idx`. **RLS:** `child_is_mine()` or admin. Rides to `kiosk_snapshot()` as `routines`; kiosk filters by `active` and `days_of_week`.

**`routine_steps`** — Individual steps within a routine; each has a reward and optional photo/icon.
- `id`, `routine_id (FK)` cascade delete, `label`, `icon (text, nullable)`, `photo_url (text, nullable)`, `step_type (enum: task | first | then)`, `reward_points (int)`, `start_time (time, nullable)`, `duration_min (int, nullable)`, `order_index (int)`, timestamps, `deleted_at`.
- **Indexes:** `routine_steps_routine_idx`. **RLS:** `routine_is_mine()` or admin. When completed, kiosk sends `completions` to `rpc_kiosk_push()`, which creates a `reward_log` entry with `reason='step'` and grants `reward_points`.

#### Chores & Rewards

**`chores`** — Standalone assigned tasks (distinct from routines) with weekly rotation support.
- `id`, `household_id (FK)`, `child_id (FK)` anchor child, `title`, `icon (text, nullable)`, `points (int)`, `days_of_week (int[], nullable)`, `active (boolean)`, `requires_approval (boolean)` (kiosk completion requires parent PIN), `rotation_member_ids (jsonb, nullable)` (array of child UUIDs; week-to-week rotation), `sort_order`, timestamps, `deleted_at`.
- **Indexes:** `chores_child_idx`. **RLS:** `child_is_mine()` or admin. `rpc_kiosk_push()` validates completions against both `child_id` and `rotation_member_ids`.

**`rewards`** — Running points balance per child (1:1); denormalized for fast access.
- `id`, `child_id (FK, UNIQUE)` cascade delete, `points_total (int)` ≥0, timestamps. **RLS:** `child_is_mine()` or admin. Updated server-side in `rpc_kiosk_push()`; never manually edited.

**`reward_log`** — Append-only audit trail of all earning and redemptions.
- `id`, `child_id (FK)`, `delta (int)` (+earned / -redeemed), `reason (text, nullable)` ('step','chore','bonus','redemption','reset',…), `step_id (FK, nullable)`, `chore_id (FK, nullable)`, `store_item_id (FK, nullable)`, `client_op_id (uuid, nullable)` idempotency key, `created_at`, `deleted_at`.
- **Indexes:** `reward_log_child_idx`, `reward_log_store_item_idx`. Idempotent insert via `on conflict (client_op_id) do nothing`.

#### Emotional Well-being & Behavior Support

**`check_ins`** — Child's daily emotional check-ins (feelings journal).
- `id`, `child_id (FK)`, `feeling (text)`, `note (text, nullable)`, timestamps, `deleted_at`. **Indexes:** `check_ins_child_idx`, `check_ins_created_idx`. Created via `rpc_kiosk_push()`.

**`calm_tools`** — Emotion-regulation resources (breathing, feelings chart, break timer, social story); household-wide or per-child.
- `id`, `household_id (FK)`, `child_id (FK, nullable)`, `tool_type (enum)`, `config (jsonb)` (e.g. `{"duration_seconds":120,"guide":"In for 4, hold 4, out for 4"}`), `enabled`, `sort_order`, timestamps, `deleted_at`. **RLS:** `household_is_mine()` or admin.

**`groundings`** — Time-out periods with optional privilege restrictions; parent-initiated, time-bounded.
- `id`, `household_id (FK)`, `child_id (FK)`, `reason (text, nullable)`, `note (text, nullable)`, `started_on (date)`, `ends_on (date)`, `pause_rewards (boolean)`, `pause_screen_time (boolean)`, `status (text: active | ended)`, `privileges_lost (jsonb, nullable)` (e.g. `["No TV","No tablet","Early bedtime"]`), timestamps, `deleted_at`.
- **Indexes:** `groundings_child_idx (deleted_at IS NULL)`. Unique constraint: at most one active per child. Shown on wall as countdown + privilege bubbles; snapshot filters `status='active'`.

**`corners`** — Tracked, supportive calm-down sessions.
- `id`, `household_id (FK)`, `child_id (FK)`, `reason`, `feeling`, `duration_minutes (int, check 1-60)`, `started_at`, `ended_at (nullable)`, `status (text: active | done | ended)`, `plan (jsonb, nullable)` (`{"steps":[...],"reminder":"...","encouragement":"..."}`), `report (text, nullable)` (AI reflection), timestamps, `deleted_at`.
- **Indexes:** `corners_child_idx (deleted_at IS NULL)`, unique `corners_one_active` per child when `status='active'`. Shown on wall for active corners (`status='active'` and `started_at + duration_minutes > now()`); framed as co-regulation, never shaming.

**`house_rules`** — Household's shared rules and consequence ladder.
- `id`, `household_id (FK)`, `kind (text: rule | consequence)`, `title`, `detail (text, nullable)`, `emoji (text, nullable)`, `sort_order`, timestamps, `deleted_at`. **Indexes:** `house_rules_household_idx (deleted_at IS NULL)`. Displayed on kiosk as a calm reference; purely educational.

#### Family Coordination (Calendar, Meals, Reminders, Messages, Lists)

**`events`** — Shared family calendar entries.
- `id`, `household_id (FK)`, `child_id (FK, nullable)`, `title`, `emoji (nullable)`, `location (nullable)`, `starts_at`, `ends_at (nullable)`, `all_day (boolean)`, `person_label (nullable)`, `color (nullable)`, `responsible_label (nullable)`, `recurrence_rule (nullable)` (kiosk expands offline), `is_countdown (boolean)`, timestamps, `deleted_at`. **Indexes:** `events_household_starts_idx (household_id, starts_at)`.

**`meals`** — Weekly meal plan (read-only on wall; parents edit in app).
- `id`, `household_id (FK)`, `date`, `meal_type (text: breakfast | lunch | dinner | snack)`, `title`, `emoji (nullable)`, `notes (nullable)`, `sort_order`, timestamps, `deleted_at`. **Indexes:** `meals_household_date_idx`.

**`reminders`** — Low-frequency due-date nudges.
- `id`, `household_id (FK)`, `child_id (FK, nullable)`, `title`, `due_date`, `repeat_rule (nullable)`, `done (boolean)`, `snoozed_until (date, nullable)`, timestamps, `deleted_at`. **Indexes:** `reminders_household_due_idx`.

**`wall_messages`** — Parent-to-wall notes, encouragement, bonus-point surprises.
- `id`, `household_id (FK)`, `child_id (FK, nullable)`, `body`, `emoji (nullable)`, `author_label (nullable)`, `pinned (boolean)`, `bonus_points (int, default 0)`, `expires_at (timestamptz, nullable)`, timestamps, `deleted_at`. **Indexes:** `wall_messages_household_idx (household_id, expires_at)`.

**`list_items`** — Shared grocery/quick lists. The **only write path from kiosk to server** besides reward mutations.
- `id (uuid, PK)` client-supplied for idempotency, `household_id (FK)`, `list_kind (text, default 'grocery')`, `name`, `category (nullable)`, `quantity (nullable)`, `checked (boolean)`, `added_by_label (nullable)`, `sort_order`, timestamps, `deleted_at`. **Indexes:** `list_items_household_idx (household_id, list_kind, checked)`. Kiosk sends `list_ops` with `op='add'|'check'`.

#### AI Companion & Configuration

**`ai_config`** — Per-household Anthropic API key and feature flag. **Never exposed to kiosk; security-critical.**
- `household_id (uuid, PK, FK)`, `anthropic_api_key (text, nullable)` (never returned by snapshot), `enabled (boolean, default false)`, `updated_at`. **RLS:** `household_is_mine()` only (no admin override). Companion app reads only a "key_is_set" boolean.

**`ai_briefs`** — Cached daily AI-generated family summary for the screensaver.
- `household_id (FK)` + `date (date)` composite PK, `brief (text)`, `created_at`. **RLS:** read-only for household owner; write-only from server (service role). Generated once per day max (cost control).

#### Operator & Commerce

**`customers`** — Sales lead/install records (admin-only).
- `id`, `household_id (FK, nullable)`, `name`, `email (nullable)`, `phone (nullable)`, `build_id (FK, nullable)`, `status (enum: lead | scheduled | installed)`, `install_date (nullable)`, `install_fee (numeric)`, `founder_number (int 1-15, nullable, unique when set)`, `notes (nullable)`, timestamps. **Indexes:** `customers_founder_number_uniq WHERE founder_number IS NOT NULL`. **RLS:** admin-only.

**`builds`** — Product configurations (SKUs for kiosk hardware).
- `id`, `name`, `screen_size (nullable)`, `tablet_model (nullable)`, `standard_price (numeric)`, `founder_price (numeric)`, `is_default (boolean)`, `sort_order`, timestamps. **RLS:** admin-only.

**`build_supplies`** — Bill-of-materials per build.
- `id`, `build_id (FK)`, `item`, `vendor (default 'Amazon')`, `url (nullable)`, `unit_cost (numeric)`, `quantity (int, default 1)`, `optional (boolean)`, `sort_order`, timestamps. **Indexes:** `build_supplies_build_idx`. **RLS:** admin-only.

**`inventory`** — Optional parts tracking (not actively used).
- `id`, `part_name`, `on_hand_qty (int, default 0)`, `reorder_threshold (int, default 0)`, timestamps. **RLS:** admin-only.

**`referrals`** — Founder referral program pipeline.
- `id`, `referring_customer_id (FK)`, `referred_name`, `referred_contact (nullable)`, `status (enum: pending | contacted | converted | declined)`, timestamps. **Indexes:** `referrals_referrer_idx`. **RLS:** admin-only.

**`plus_subscriptions`** — Harbor Plus billing (1:1 with household).
- `id`, `household_id (FK, UNIQUE)`, `stripe_customer_id (nullable)`, `stripe_subscription_id (nullable)`, `status (text, default 'inactive')`, `plan (enum: monthly | annual, nullable)`, `current_period_end (timestamptz, nullable)`, timestamps. **RLS:** admin full access; household owner read only. `households.plus_active` is denormalized from here; the webhook keeps it in sync.

**`device_pairings`** — Binds a kiosk device to a household.
- `id`, `household_id (FK)`, `code (text, UNIQUE)`, `device_secret (uuid, UNIQUE when set)`, `device_label (nullable)`, `status (enum: pending | paired)`, `paired_at (nullable)`, `last_synced_at (nullable)`, timestamps. **Indexes:** `device_pairings_household_idx`, `device_pairings_secret_uniq WHERE device_secret IS NOT NULL`. **RLS:** admin full; household owner read-only.

**`kiosk_deletions`** — Audit trail of soft-deleted entities for delta-sync.
- `id`, `household_id (FK)`, `entity (text)` table name, `entity_id (uuid)`, `deleted_at (default now())`. Immutable log. Populated server-side whenever a `deleted_at` is set; `kiosk_snapshot()` returns these in `deletions` when `p_since` is not null.

**`waitlist`** — Public Founding Family signup list.
- `id`, `name`, `email`, `town (nullable)`, `kids_count (int, nullable)`, `created_at`. **RLS:** public insert; admin read. No auth required to insert.

### Key Patterns & Conventions

#### Soft Delete & Delta Sync
All user-facing tables include `deleted_at timestamptz`. Rows are never hard-deleted; deletion sets `deleted_at` to trigger time. The `kiosk_snapshot(p_household, p_since)` function handles delta-sync:
- If `p_since IS NULL`: full snapshot, filters for `deleted_at IS NULL`.
- If `p_since IS NOT NULL`: only rows updated after `p_since` (regardless of `deleted_at`).
- `kiosk_deletions` provides a separate `deletions` array so the kiosk knows what to remove locally.

#### Updated-at Triggers
Most tables carry automatic `updated_at` triggers via the `set_updated_at()` function, created by migration 0003 in a loop:
```sql
create trigger set_updated_at before update on public.<table>
  for each row execute function public.set_updated_at();
```

#### JSONB Config Columns
- `households.settings`: idle timeout, screensaver mode, dark mode, weather location, quiet hours.
- `children.settings`: accessibility, theme, bedtime.
- `children.ai_profile`: summarized interests, motivators, encouragement lines.
- `calm_tools.config`: tool-specific parameters.
- `corners.plan`: steps, reminder, encouragement.
- `groundings.privileges_lost`: array of lost-privilege labels.
- `chores.rotation_member_ids`: array of child UUIDs for week-to-week rotation.

#### Enums
Defined in migrations 0001 and 0002: `user_role` (admin, parent); `routine_type` (schedule, first_then); `step_type` (task, first, then); `calm_tool_type` (breathing, feelings, break, social_story); `customer_status` (lead, scheduled, installed); `pairing_status` (pending, paired); `plus_plan` (monthly, annual); `referral_status` (pending, contacted, converted, declined).

#### RLS Functions
All access control via `SECURITY DEFINER` helper functions: `is_admin()`, `household_is_mine(hh uuid)`, `child_is_mine(c uuid)`, `routine_is_mine(r uuid)`. Each bypasses RLS recursion and checks only the current user (`auth.uid()`). Full detail in [Section 3](#3-security-rls--kiosk-authorization).

#### Idempotency & Conflict Handling
`reward_log` and `list_items` use `on conflict (client_op_id) do nothing` / `on conflict (id) do nothing` so the kiosk can safely replay offline payloads without duplication.

#### Kiosk Snapshot Function
`kiosk_snapshot(p_household uuid, p_since timestamptz)` is the primary read path for the wall. It returns a flat JSONB with keys: `household` (object), `children`, `routines`, `steps`, `chores`, `rewards`, `calm_tools`, `house_rules`, `events`, `store_items`, `list_items`, `wall_messages`, `reminders`, `meals`, `groundings`, `corners` (arrays), `deletions` (array, only if `p_since` is not null), and `server_time` (timestamp). All rows ride through `to_jsonb(row)`, preserving all columns and nested JSONB blobs.

### Storage & Media

The `child-photos` Supabase storage bucket (migration 0017) holds child profile photos. The bucket is **public** (read-only for all); insert/update/delete require auth. Photos are referenced by `children.photo_url` (public URL). The kiosk renders photos or falls back to emoji/initials offline.

---

## 3. Security, RLS & Kiosk Authorization

### Overview

Harbor implements a multi-layered security model combining Supabase Row-Level Security (RLS) on every table, `SECURITY DEFINER` helper functions to prevent recursion, and an entirely separate kiosk authentication flow via device secrets. The system enforces strict role-based access (admin vs. parent) at the middleware level (`proxy.ts`) and the database level; sensitive data like API keys are isolated from the kiosk via functional boundaries in the snapshot builder.

### A. Row-Level Security (RLS) Architecture

#### RLS Enablement

Every table has RLS enabled (`supabase/migrations/0004_rls.sql`):

| Table | Scope | Owner Check |
|-------|-------|------------|
| `profiles` | User's own profile or admin | `id = auth.uid()` or `is_admin()` |
| `households` | Household owner or admin | `owner_id = auth.uid()` or `is_admin()` |
| `children` | Own household's children or admin | `household_is_mine(household_id)` or `is_admin()` |
| `routines`, `routine_steps`, `rewards`, `reward_log` | Own child's data or admin | `child_is_mine(child_id)` or `is_admin()` |
| `calm_tools`, `check_ins` | Own household/child or admin | household/child ownership or `is_admin()` |
| `events`, `store_items`, `list_items`, `wall_messages`, `reminders` | Household-scoped or admin | `household_is_mine(household_id)` or `is_admin()` |
| `ai_config` | Household owner only | `household_is_mine(household_id)` (no admin override) |
| `builds`, `build_supplies`, `inventory`, `customers`, `referrals` | Admin only | `is_admin()` |
| `plus_subscriptions`, `device_pairings` | Read: admin or owner; Write: admin only | Read: `household_is_mine()` or `is_admin()`; Write: `is_admin()` only |
| `waitlist` | Public insert; admin read | `is_admin()` for select; `true` for insert |
| `kiosk_deletions` | Household owner or admin | `household_is_mine(household_id)` or `is_admin()` |

#### Performance Optimization in RLS

Early migration `0007_advisor_fixes.sql` wrapped all `auth.uid()` and `is_admin()` calls in subqueries to force evaluation once per query (prevents re-evaluation in each policy check):

```sql
-- OLD (evaluates twice): owner_id = auth.uid() or is_admin()
-- NEW (evaluates once):  owner_id = (select auth.uid()) or (select is_admin())
```

### B. SECURITY DEFINER Helper Functions

Four helper functions execute with superuser privileges to bypass RLS without recursion, since policies call them internally. Each checks **only the current user** (`auth.uid()`) — calling them via RPC reveals nothing a caller doesn't already know about themselves. All live in `supabase/migrations/0003_functions_triggers.sql`.

#### `is_admin() → boolean`
```sql
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;
```
Returns `true` if the current user's `profiles.role` is `'admin'`. Called in every RLS policy to grant admin full access.

#### `household_is_mine(hh uuid) → boolean`
```sql
create or replace function public.household_is_mine(hh uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.households h
    where h.id = hh and h.owner_id = auth.uid()
  );
$$;
```
Checks if the current user **owns** the given household.

#### `child_is_mine(c uuid) → boolean`
```sql
create or replace function public.child_is_mine(c uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.children ch
    join public.households h on h.id = ch.household_id
    where ch.id = c and h.owner_id = auth.uid()
  );
$$;
```
Verifies the child belongs to a household the caller owns.

#### `routine_is_mine(r uuid) → boolean`
```sql
create or replace function public.routine_is_mine(r uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.routines rt
    join public.children ch on ch.id = rt.child_id
    join public.households h on h.id = ch.household_id
    where rt.id = r and h.owner_id = auth.uid()
  );
$$;
```
Verifies the routine belongs to a child in a household the caller owns.

#### Grants & Advisor Warnings

All four helpers are usable by `authenticated` (required for RLS policies to run). The Supabase security linter (`get_advisors`) flags these as `SECURITY DEFINER` functions callable by `anon`/`authenticated`, but this is **expected and safe** (documented in `supabase/SECURITY_NOTES.md`): they cannot enumerate other users' data (each only reads based on `auth.uid()`), and revoking `EXECUTE` would break RLS evaluation. If zero advisor warnings are desired, they could be moved to a private schema while keeping the logical grants.

### C. Middleware Role Gating (`lib/supabase/middleware.ts`)

The Next.js proxy (`proxy.ts`) delegates to `lib/supabase/middleware.ts`, which enforces role-based route access before any database query:

| Path | Rule | Behavior |
|------|------|----------|
| `/admin/**` (except `/admin/setup`) | User must exist AND `role = 'admin'` | Unauthenticated → redirect to `/login`; non-admin → redirect to `/app` |
| `/app/**` | User must exist | Unauthenticated → redirect to `/login` |
| `/kiosk/**` | No gating (intentional) | Paired device authenticates via `device_secret` RPC, not user login |
| `/` (public) | No gating | Accessible to all |

**Bootstrap Exception:** `/admin/setup` is unprotected so the first admin can be created. **Token Revalidation:** every request calls `supabase.auth.getUser()` (not `getSession()`) to revalidate the JWT.

### D. Kiosk Authentication Model

**Key Principle:** Kids never log in. The kiosk authenticates using a hardware-bound `device_secret` issued at pairing, scoped to one household.

#### 1. Device Pairing Flow

**Table:** `device_pairings` (`supabase/migrations/0002_operator_tables.sql`):

```sql
create table public.device_pairings (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  code text not null unique,        -- short pairing code (e.g., "ABCD-1234")
  device_secret uuid,               -- issued once at pair time; kiosk credential
  device_label text,
  status public.pairing_status not null default 'pending',
  paired_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**States:** `'pending'` (code generated, waiting for kiosk to call `rpc_kiosk_pair`) → `'paired'` (`device_secret` set, `paired_at` recorded). **RLS:** admin can fully manage; household owners can only read.

#### 2. Pairing RPC: `rpc_kiosk_pair(code)`

**File:** `supabase/migrations/0005_kiosk_rpcs.sql`:

```sql
create or replace function public.rpc_kiosk_pair(p_code text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_pairing public.device_pairings;
  v_secret uuid;
begin
  select * into v_pairing from public.device_pairings
  where code = upper(trim(p_code)) and status = 'pending'
  limit 1;
  if not found then
    raise exception 'invalid_or_used_code' using errcode = 'P0001';
  end if;
  v_secret := gen_random_uuid();
  update public.device_pairings
    set device_secret = v_secret, status = 'paired',
        paired_at = now(), last_synced_at = now()
  where id = v_pairing.id;
  return jsonb_build_object(
    'device_secret', v_secret,
    'household_id', v_pairing.household_id,
    'snapshot', public.kiosk_snapshot(v_pairing.household_id, null)
  );
end;
$$;
grant execute on function public.rpc_kiosk_pair(text) to anon, authenticated;
```

**Process:** kiosk calls with the pairing code → RPC looks up a pending pairing (raises `'invalid_or_used_code'` if not found, preventing reuse) → generates a random `device_secret` UUID, marks `'paired'` → returns the secret and a **full snapshot** (`p_since = null`). Kiosk stores the secret in IndexedDB. Called by `lib/kiosk/sync.ts::pairDevice()`.

#### 3. Sync RPCs

##### `rpc_kiosk_pull(secret, since)`

```sql
create or replace function public.rpc_kiosk_pull(p_secret uuid, p_since timestamptz default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare v_household uuid;
begin
  select household_id into v_household from public.device_pairings
  where device_secret = p_secret and status = 'paired' limit 1;
  if not found then
    raise exception 'unauthorized_device' using errcode = 'P0001';
  end if;
  update public.device_pairings set last_synced_at = now() where device_secret = p_secret;
  return public.kiosk_snapshot(v_household, p_since);
end;
$$;
grant execute on function public.rpc_kiosk_pull(uuid, timestamptz) to anon, authenticated;
```

Validates the secret (raises `'unauthorized_device'` if not found/paired), updates `last_synced_at`, returns the snapshot (full if `since=null`, delta if a timestamp). The client does full pulls at boot and periodic reconciles; delta pulls otherwise.

##### `rpc_kiosk_push(secret, payload)`

The hardened version (migration `0010_kiosk_push_hardening.sql`) replaces the initial 0005 version. Full body:

```sql
create or replace function public.rpc_kiosk_push(p_secret uuid, p_payload jsonb)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_household uuid; v_item jsonb; v_child uuid; v_step uuid;
  v_opid uuid; v_points int; v_applied int := 0;
begin
  select household_id into v_household from public.device_pairings
  where device_secret = p_secret and status = 'paired' limit 1;
  if not found then
    raise exception 'unauthorized_device' using errcode = 'P0001';
  end if;

  -- FEELINGS CHECK-INS
  for v_item in select value from jsonb_array_elements(coalesce(p_payload -> 'check_ins', '[]'::jsonb)) loop
    v_child := (v_item ->> 'child_id')::uuid;
    if exists (select 1 from public.children c where c.id = v_child and c.household_id = v_household) then
      insert into public.check_ins (child_id, feeling, note, created_at)
      values (v_child, coalesce(v_item ->> 'feeling', 'unknown'), v_item ->> 'note',
              coalesce((v_item ->> 'created_at')::timestamptz, now()));
      v_applied := v_applied + 1;
    end if;
  end loop;

  -- STEP COMPLETIONS (reward points fetched from the STEP, never from payload)
  for v_item in select value from jsonb_array_elements(coalesce(p_payload -> 'completions', '[]'::jsonb)) loop
    v_child := (v_item ->> 'child_id')::uuid;
    v_step := nullif(v_item ->> 'step_id', '')::uuid;
    v_opid := nullif(v_item ->> 'op_id', '')::uuid;
    select s.reward_points into v_points
    from public.routine_steps s
    join public.routines r on r.id = s.routine_id
    join public.children c on c.id = r.child_id
    where s.id = v_step and c.id = v_child and c.household_id = v_household
      and s.deleted_at is null;
    if found then
      insert into public.reward_log (child_id, delta, reason, step_id, client_op_id, created_at)
      values (v_child, v_points, 'step', v_step, v_opid,
              coalesce((v_item ->> 'created_at')::timestamptz, now()))
      on conflict (client_op_id) do nothing;
      if found then
        insert into public.rewards (child_id, points_total) values (v_child, 0)
          on conflict (child_id) do nothing;
        update public.rewards set points_total = points_total + v_points where child_id = v_child;
        v_applied := v_applied + 1;
      end if;
    end if;
  end loop;

  -- REDEMPTIONS (decrement, floored at 0, idempotent)
  for v_item in select value from jsonb_array_elements(coalesce(p_payload -> 'redemptions', '[]'::jsonb)) loop
    v_child := (v_item ->> 'child_id')::uuid;
    v_opid := nullif(v_item ->> 'op_id', '')::uuid;
    v_points := abs(coalesce((v_item ->> 'points')::int, 0));
    if exists (select 1 from public.children c where c.id = v_child and c.household_id = v_household) then
      insert into public.reward_log (child_id, delta, reason, store_item_id, client_op_id, created_at)
      values (v_child, -v_points, coalesce(v_item ->> 'label', v_item ->> 'reason', 'reward'),
              nullif(v_item ->> 'store_item_id', '')::uuid, v_opid,
              coalesce((v_item ->> 'created_at')::timestamptz, now()))
      on conflict (client_op_id) do nothing;
      if found then
        insert into public.rewards (child_id, points_total) values (v_child, 0)
          on conflict (child_id) do nothing;
        update public.rewards set points_total = greatest(0, points_total - v_points)
        where child_id = v_child;
        v_applied := v_applied + 1;
      end if;
    end if;
  end loop;

  -- SHARED LISTS (household-scoped, idempotent add)
  for v_item in select value from jsonb_array_elements(coalesce(p_payload -> 'list_ops', '[]'::jsonb)) loop
    if (v_item ->> 'op') = 'add' then
      insert into public.list_items (id, household_id, list_kind, name, category, quantity, added_by_label, created_at)
      values (coalesce(nullif(v_item ->> 'client_id', '')::uuid, gen_random_uuid()), v_household,
        coalesce(v_item ->> 'list_kind', 'grocery'), coalesce(v_item ->> 'name', 'Item'),
        v_item ->> 'category', v_item ->> 'quantity', v_item ->> 'added_by_label',
        coalesce((v_item ->> 'created_at')::timestamptz, now()))
      on conflict (id) do nothing;
      v_applied := v_applied + 1;
    elsif (v_item ->> 'op') = 'check' then
      update public.list_items
        set checked = coalesce((v_item ->> 'checked')::boolean, true), updated_at = now()
      where id = (v_item ->> 'id')::uuid and household_id = v_household;
      v_applied := v_applied + 1;
    end if;
  end loop;

  update public.device_pairings set last_synced_at = now() where device_secret = p_secret;
  return jsonb_build_object('ok', true, 'applied', v_applied, 'server_time', now());
end;
$$;
grant execute on function public.rpc_kiosk_push(uuid, jsonb) to anon, authenticated;
```

**Key hardening details:**
1. **No client-provided points:** completions award the `reward_points` from the step definition (not the payload), preventing kids from minting arbitrary points.
2. **Idempotency keys:** `client_op_id` on completions and redemptions with `on conflict (client_op_id) do nothing` makes retries safe.
3. **Household scope:** every write validates the child belongs to the device's household.
4. **Flooring:** redemptions use `greatest(0, ...)` to prevent negative balances.
5. **Defense-in-depth RLS:** even with an RPC bug, RLS would catch writes to other families' data.

Called by `lib/kiosk/sync.ts::syncNow()`, only when Plus is active and the outbox has pending mutations.

##### `rpc_kiosk_reset_points(secret)`

**File:** `supabase/migrations/0026_kiosk_reset_points.sql`:

```sql
create or replace function public.rpc_kiosk_reset_points(p_secret uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_household uuid;
begin
  select household_id into v_household from public.device_pairings
  where device_secret = p_secret and status = 'paired' limit 1;
  if not found then
    raise exception 'unauthorized_device' using errcode = 'P0001';
  end if;
  insert into public.reward_log (child_id, delta, reason)
  select rw.child_id, -rw.points_total, 'reset'
  from public.rewards rw
  join public.children c on c.id = rw.child_id
  where c.household_id = v_household and rw.points_total <> 0;
  update public.rewards rw set points_total = 0, updated_at = now()
  from public.children c
  where c.id = rw.child_id and c.household_id = v_household and rw.points_total <> 0;
  return jsonb_build_object('ok', true);
end;
$$;
grant execute on function public.rpc_kiosk_reset_points(uuid) to anon, authenticated;
```

Called when a parent unlocks the PIN and taps "Reset All Points". Records a `'reset'` reason in `reward_log` (audit trail) and zeros all running totals for that household's children.

### E. The Kiosk Snapshot: Data Flow & Isolation

#### `kiosk_snapshot(household_id, since_timestamp)`

The snapshot builder (`supabase/migrations/0012_hard_delete_child.sql`, final version after all feature migrations) is the **sole data API** the kiosk uses. It is **not granted to client roles**:

```sql
revoke execute on function public.kiosk_snapshot(uuid, timestamptz) from public, anon, authenticated;
```

Only the three kiosk RPCs call it internally.

#### Full vs. Delta Pull
- **Full pull** (`since = null`): returns all non-deleted rows for the household.
- **Delta pull** (`since = timestamp`): returns only rows with `updated_at > since`, plus deleted tombstones.

Simplified structure:

```json
{
  "household": { "id": "hh-uuid", "name": "Smith Family", "plus_active": true,
    "parent_pin_set": true, "parent_pin_hash": "sha256_hash...",
    "settings": { "idle_timeout_min": 5 } },
  "children": [ { "id": "c-uuid", "name": "Emma", "avatar": "emoji", "settings": {} } ],
  "routines": [ { "id": "r-uuid", "child_id": "c-uuid", "name": "Morning" } ],
  "steps": [ { "id": "s-uuid", "routine_id": "r-uuid", "label": "Brush teeth", "reward_points": 10 } ],
  "rewards": [ { "child_id": "c-uuid", "points_total": 45 } ],
  "calm_tools": [], "events": [], "store_items": [], "list_items": [],
  "wall_messages": [], "reminders": [], "meals": [], "chores": [],
  "house_rules": [], "groundings": [], "corners": [],
  "deletions": [ { "entity": "child", "entity_id": "old-child-uuid" } ],
  "server_time": "2025-06-20T14:32:00Z"
}
```

#### Automatic Column Flow via `to_jsonb()`

The snapshot uses `to_jsonb(table_row)` to serialize rows directly. Any nullable column added to a source table **automatically flows into the snapshot** without code changes, as long as: (1) the column is on a snapshot-included table; (2) no explicit column filtering is applied; (3) the migration runs and the function is rebuilt. Examples: `children.color_id` (0011), `routines.start_time/end_time/days_of_week` (0009), `routine_steps.duration_min` all auto-flow. This keeps the kiosk on the latest schema without RPC changes.

#### Tombstones & Hard Deletions

When a child is hard-deleted (parent calls `hard_delete_child(id)`):
1. A row is inserted into `kiosk_deletions`: `insert into public.kiosk_deletions (household_id, entity, entity_id) values (v_household, 'child', p_child);`
2. The child is deleted from `children` (cascading to routines, steps, check_ins, etc.).
3. On the next delta pull, the snapshot includes `"deletions": [ { "entity": "child", "entity_id": "deleted-uuid" } ]`.
4. The kiosk (`lib/kiosk/sync.ts::applyPull()`) removes the child from IndexedDB and cascades removal of routines, steps, store items, etc.

`kiosk_deletions` is cleared on full pulls; the `deletions` key is always `[]` in full snapshots.

#### AI Key Isolation Invariant

The `ai_config` table (migration 0019) is **explicitly excluded** from the snapshot builder:

```sql
create policy ai_config_all on public.ai_config for all
  using (public.household_is_mine(household_id))
  with check (public.household_is_mine(household_id));
-- The snapshot builder does NOT include ai_config → the Anthropic API key never reaches the kiosk.
```

The parent app reads only a "key_is_set" boolean, never the raw key. This prevents accidental exposure of API credentials if the kiosk is compromised or inspected.

### F. Admin & Operator Separation

Operator tables (admin-only data for hardware sales, inventory, referrals) — `builds`, `build_supplies`, `inventory`, `customers`, `referrals` — are all enforced via:

```sql
create policy <table>_admin on public.<table> for all
  using ((select public.is_admin())) with check ((select public.is_admin()));
```

### G. Expected Advisor Warnings (`get_advisors` Posture)

Supabase's security linter reports three categories on Harbor; all are expected and documented in `supabase/SECURITY_NOTES.md`:

1. **RLS Helper Functions (SECURITY DEFINER):** `is_admin()`, `household_is_mine()`, `child_is_mine()`, `routine_is_mine()` are callable by `anon`/`authenticated`. Safe because each checks ownership for only the current user; calling them reveals nothing the caller doesn't already know; they cannot enumerate others' data; revoking `EXECUTE` would break RLS. Mitigation if zero-warning required: move to a private schema.
2. **Kiosk RPCs (SECURITY DEFINER, Anon-Callable):** `rpc_kiosk_pair/pull/push/reset_points` callable by `anon`. Safe because they are the entire kiosk API; each validates a `device_secret` before revealing data; the secret is per-pairing UUID stored in the device's IndexedDB; all writes are household-scoped and further validated by RLS. Reference: `supabase/SECURITY_NOTES.md`.
3. **Trigger-Only Functions (Locked Down):** `handle_new_user()` and `set_updated_at()` have `EXECUTE` revoked from all client roles:
```sql
revoke execute on function public.handle_new_user() from public, anon, authenticated;
alter function public.set_updated_at() set search_path = '';
```

### H. Data Flow Summary: Parent App → Kiosk

1. **Parent creates/edits content** via the parent app (authenticated). All writes go through RLS (`household_is_mine()` checks). The parent PIN hash is set in `households.parent_pin_hash` (SHA-256).
2. **Kiosk syncs** on boot and every 30 seconds: calls `rpc_kiosk_pull(device_secret, last_sync)` → snapshot includes `parent_pin_hash` so the wall can adopt the PIN without a server round-trip.
3. **Kiosk stores state** offline in IndexedDB: `snapshot`, `outbox` (pending mutations), `pinHash`.
4. **When online + Plus active**, the kiosk pushes via `rpc_kiosk_push(...)` — points are awarded from step definitions (not payload).
5. **Parent sees updated points** on next refresh (queries `rewards`, RLS enforced).

### I. Security Boundary: Kiosk Permission Model

The kiosk **cannot**: read or write `ai_config`; directly query any table; call any RPC outside the allow list; mint points; access other households' data; or modify/read `profiles`, operator tables, or subscription data.

The kiosk **can**: record feelings check-ins; complete steps (award server-defined points); redeem rewards (decrement, floored at 0); add/check list items; upload status/sync timestamps; reset all points (parent-PIN gated).

### J. Offline Capability & Sync Resilience

The kiosk works fully offline — no backend call is needed for daily use. `pairDevice()` (setup only) requires network; `syncNow()` (background sync) is optional and only when Plus is active. All mutations are enqueued in `outbox`, persisted to IndexedDB; on reconnect, pending mutations are pushed and the outbox is retained/retried on failure. Reconciliation: the kiosk pushes its outbox, then pulls server state (delta since `lastSync`); client-authored mutations are preserved, server arrays merged (delta) or replaced (full).

---

## 4. Kiosk — Offline-First Engine

The Kiosk is a React 19 PWA running on family wall tablets (portrait orientation) with **zero backend dependency for daily use**. All child interactions (step completions, chore marks, point redemptions, check-ins) happen purely offline via IndexedDB, persisting to a local mutation outbox that syncs only when the household has Plus active. The wall boots instantly even with no internet; it renders cached HTML/JS from the service worker and restores the last known household state.

### IndexedDB Store (`lib/kiosk/db.ts`)

A minimal IndexedDB wrapper manages persistent state with a single object store.

**Store Structure:**
- **Database:** `"harbor-kiosk"` (version 1)
- **Object Store:** `"kv"` (key-value, no schema)
- **State Key:** `"state"` — stores the entire `KioskState` blob under a single key

**Lifecycle Functions:**

| Function | Purpose |
|----------|---------|
| `getDb()` | Lazy-opens the IDB connection; returns a cached promise (reused across calls) to avoid multiple DB init sequences |
| `loadState()` → `KioskState \| null` | Retrieves the saved state on boot; returns `null` if unpaired |
| `persistState(state)` | Writes the entire state tree (snapshot + progress + points + outbox) after every mutation |
| `clearState()` | Wipes the kiosk memory (unpairing); used when a device is reset or reassigned |

**PIN Hashing:**
- `hashPin(pin: string)` uses Web Crypto's SHA-256 to hash PINs as `"harbor:{pin}"` and encodes as hex.
- PIN verification is **entirely offline**: the hashed PIN (`pinHash: string`) is stored in `KioskState` and compared locally in `verifyPin()`.
- No plaintext PIN ever touches the network.

**Day Boundary:**
- `todayKey()` returns `"YYYY-MM-DD"` in the device's local timezone (not UTC).
- Routine/chore completions are scoped to a calendar day and reset at local midnight.
- Progress objects store `DayProgress = { date: string; completed: string[] }` where `completed` is an array of step/chore IDs marked done.

### State Shape (`lib/kiosk/types.ts`)

**`KioskState`** — the root object stored in IndexedDB:

```typescript
{
  deviceSecret: string;              // UUID issued at pairing; auth token for RPCs
  householdId: string;               // UUID of the household
  snapshot: KioskSnapshot;           // Read-only server data (children, routines, steps, etc.)
  pinHash: string | null;            // SHA-256 hash of parent PIN (null if unset)
  lastSync: string | null;           // ISO timestamp of last successful pull (used for delta pulls)
  points: Record<string, number>;    // Points balance per child (child_id → total)
  progress: Record<string, DayProgress>;  // Per-child daily completion state
  outbox: Mutation[];                // Pending writes to push when online + Plus
}
```

**`KioskSnapshot`** — server-authored read-only snapshot pulled at pairing and on every sync:

| Field | Type | Notes |
|-------|------|-------|
| `household` | `KioskHousehold` | `plus_active: boolean` gates sync; `parent_pin_hash?: string` for pairing adoption |
| `children` | `KioskChild[]` | Sorted by `sort_order`; includes `avatar`, `photo_url`, `color`, `ai_profile` |
| `routines` | `KioskRoutine[]` | Schedule/first-then types; `days_of_week: number[]`; `active: boolean` gates display |
| `steps` | `KioskStep[]` | `reward_points` is server-authoritative |
| `chores` | `KioskChore[]` | `points` per chore; `rotation_member_ids?: string[]`; `requires_approval?: boolean` |
| `calm_tools` | `KioskCalmTool[]` | Breathing, feelings, break, social story; household + per-child scopes |
| `store_items` | `KioskStoreItem[]` | `cost_points` is the redemption price |
| `events` | `KioskEvent[]` | Calendar events (countdowns, all-day, recurring via `recurrence_rule`) |
| `list_items` | `KioskListItem[]` | Shared lists; `checked: boolean` |
| `wall_messages` | `KioskWallMessage[]` | Pinned messages; `expires_at: string \| null` |
| `reminders` | `KioskReminder[]` | `snoozed_until: string \| null` |
| `meals` | `KioskMeal[]` | `meal_type: string` |
| `house_rules` | `KioskHouseRule[]` | Kind: "rule" or "consequence" |
| `groundings` | `KioskGrounding[]` | `pause_rewards: boolean`, `pause_screen_time: boolean` |
| `corners` | `KioskCorner[]` | `status: "active" \| "completed"` |
| `deletions` | `{ entity: string; entity_id: string }[]` | Tombstones since the cursor; prune orphans locally |
| `server_time` | string | ISO timestamp; used as `p_since` for the next delta pull |

**`DayProgress`** — local-only daily completion tracking: `{ date: string; completed: string[] }`. One per child per day. Completions are one-way for the day: once a step/chore is in `completed`, it cannot be undone locally (parent must use the companion app's "reset day"). Resets when `todayKey()` changes.

**`Mutation`** — pending write operations:

| Kind | Payload Fields | Notes |
|------|----------------|-------|
| `"completion"` | `op_id, child_id, step_id, points, created_at` | Step done; `op_id` client UUID for idempotency |
| `"chore_done"` | `op_id, child_id, chore_id, points, created_at` | Chore done; same idempotency scheme |
| `"check_in"` | `child_id, feeling, note, created_at` | Feeling check; no `op_id` (non-idempotent on server) |
| `"redemption"` | `op_id, child_id, points, reason, store_item_id?, label?, created_at` | Points spent; idempotent on `op_id` |
| `"list_add"` | `client_id, name, category, list_kind, added_by_label, created_at` | Add grocery/task item; `client_id` optimistic UUID |
| `"list_check"` | `id, checked, created_at` | Toggle item checked state |

### The useKiosk Hook (`components/kiosk/useKiosk.ts`)

A client-side React hook managing offline state, syncing, and user actions. It wraps IndexedDB operations and provides a unified interface to the shell.

**State & Status:**
```typescript
const kiosk = useKiosk();
{
  state: KioskState | null,                    // null while loading
  status: "loading" | "unpaired" | "ready" | "error",
  online: boolean,                             // navigator.onLine
  syncStatus: "idle" | "syncing" | "ok" | "error" | "offline" | "no-plus",
  lastSync: string | null,
  // ... methods
}
```

**Boot & Initialization:**
1. **Mount:** `useEffect` on initial render calls `loadState()` with an 8-second watchdog timeout.
2. **Result:** state found → `status = "ready"` (KioskShell); `null` (never paired) → `status = "unpaired"` (PairingScreen); timeout/error → `status = "error"` (reload button).
3. **After PIN setup:** if `state.pinHash` is still `null`, show `PinSetup` (parent enters 4–6 digit PIN, hashed and stored).

**Persist Helper:**
```typescript
const update = useCallback((mutator: (s: KioskState) => KioskState) => {
  setState((prev) => {
    if (!prev) return prev;
    const next = mutator(prev);
    if (next !== prev) void persistState(next);  // async, fire-and-forget
    return next;
  });
}, []);
```
All mutations go through `update()` to ensure IndexedDB sync; render happens before persist completes (optimistic UI).

**Background Sync (`runSync`):** `runSync(full?: boolean): Promise<void>`, triggered on:
- **Boot:** `runSync(true)` immediately (full reconcile to heal stale cache).
- **Periodic:** every 30 seconds via `setInterval` (cheap delta pulls).
- **Full reconcile:** every 13 minutes (`setInterval(() => runSync(true), 13 * 60_000)`) — prunes orphans.
- **On wake:** `window.focus`, `document.visibilitychange`.
- **Online:** `window.online` event.

**Sync Logic:**
1. Early exits if offline or Plus not active (no-op; wall remains functional).
2. If `outbox.length > 0`: call `rpc_kiosk_push()`; on success clear the outbox; on error keep it and retry on next tick (no backoff; the periodic timer retries).
3. Pull via `rpc_kiosk_pull()`: if `full=true` fetch complete snapshot (apply `replace=true` to prune orphans); else delta since `lastSync` (merge additively).
4. **Reconciliation:** if mutations were enqueued during the network await, re-apply their effects (recalc points, re-insert list adds, re-update checks). A tap mid-sync is never lost.

**Child Actions:**

| Action | Behavior |
|--------|----------|
| `completeStep(childId, step)` | If step ID not in today's `progress[childId].completed`: add it, award `step.reward_points`, enqueue completion |
| `completeChore(childId, chore)` | Same; uses `chore.points` |
| `checkIn(childId, feeling)` | Enqueue a check-in (no local state change) |
| `resetDay(childId)` | Clear `progress[childId]` to `{ date: todayKey(), completed: [] }` (parent action) |
| `redeem(childId, points, reason)` | Decrement `state.points[childId]` (must be `≤ have`), enqueue redemption |
| `redeemStoreItem(childId, item)` | Like `redeem()` but uses `item.cost_points` and includes `store_item_id` |
| `addListItem(name, opts)` | Optimistically add to `snapshot.list_items` with client UUID, enqueue `list_add` |
| `checkListItem(id, checked)` | Update `checked`, enqueue `list_check` |

**PIN & Pairing:**

| Action | Purpose |
|--------|---------|
| `setPin(pin)` | Hash and store in `state.pinHash` (setup) |
| `verifyPin(pin) → boolean` | Compare hash to `state.pinHash`; always true if no PIN set yet |
| `pair(code) → Promise<void>` | Network-required: call `pairDevice()`, init fresh state, persist, `status = "ready"` |
| `unpair() → Promise<void>` | Clear state, reset to `"unpaired"` |
| `resetPoints() → Promise<boolean>` | PIN-gated; calls `rpc_kiosk_reset_points()` (writes a balancing row), then zeros locally; requires internet |

### Sync Engine (`lib/kiosk/sync.ts`)

Low-level functions that implement the offline-first sync protocol.

**`mergeById(existing, incoming) → merged`** — merges two arrays of identified objects (`id: string`, optional `deleted_at`): start with a map of existing by ID; for each incoming, if `deleted_at` is set (tombstone) delete from map, otherwise upsert; return all non-deleted items in map order. Ensures delta pulls are additive and tombstones prune deletions.

**`applyPull(state, snap, replace) → nextState`** — applies a server snapshot to local state:
- **Delta mode** (`replace=false`): use `mergeById()` for all server arrays (additive + tombstones).
- **Full mode** (`replace=true`): replace all server arrays wholesale, discarding stale cache. Used on boot and periodic full reconciles.
- **Child deletion cascade:** when `snap.deletions` includes a child UUID, remove the child plus all their routines, steps, chores, events, store items, messages, and zero out their points (from `snap.rewards`).
- **Hard-delete tombstones:** processed after arrays are merged/replaced, so deletion cascades override earlier merges.
- **PIN adoption:** if `snap.household.parent_pin_hash` is set and differs from local, adopt it (parent sets a PIN in the companion app; kiosk inherits on next sync).

**`buildPayload(outbox) → Json`** — serializes the outbox into RPC format:

```json
{
  "check_ins": [{ "child_id", "feeling", "note", "created_at" }],
  "completions": [{ "op_id", "child_id", "step_id", "points", "created_at" }],
  "chore_dones": [{ "op_id", "child_id", "chore_id", "points", "created_at" }],
  "redemptions": [{ "op_id", "child_id", "points", "reason", "label?", "store_item_id?", "created_at" }],
  "list_ops": [{ "op" ("add"|"check"), "client_id"?, "id"?, "name"?, "category"?, "list_kind"?, "added_by_label"?, "checked"?, "created_at" }]
}
```

**`pairDevice(code) → Promise<{ device_secret, household_id, snapshot }>`** — one-time network call: normalize the code (strip dashes/spaces, uppercase) → call `rpc_kiosk_pair()` → server validates pending+unused, generates `device_secret`, marks `'paired'`, returns secret + household_id + complete snapshot. Errors: `"invalid_or_used_code"` → friendly "code not found"; offline → "no internet"; otherwise generic network error.

**`syncNow(state, opts?: { full?: boolean }) → Promise<nextState>`** — push-then-pull sync. Early exits if offline or Plus not active (returns state unchanged). Push: if outbox non-empty call `rpc_kiosk_push()`; on success zero the outbox; on error keep it and continue to pull. Pull: call `rpc_kiosk_pull()` with `p_secret` and `p_since` (`null` if `full`, else `lastSync`); apply via `applyPull(state, snap, opts.full ?? false)`.

### Pairing Flow

1. **Setup email:** parent creates a household via companion app; the system generates an 8-character code and emails it.
2. **Tablet arrives:** parent/installer opens `/kiosk` on the wall tablet.
3. **PairingScreen** (`components/kiosk/PairingScreen.tsx`): large code input (placeholder `"ABCD-EFGH"`); checks URL for auto-pair (`?code=XXXX` prefills and auto-submits); normalizes input.
4. **`kiosk.pair(code)`:** calls `pairDevice(code)` (network-required); on success persists fresh state with `deviceSecret`, zeros outbox, `status = "ready"`; on error shows an alert.
5. **PinSetup** (`components/kiosk/PinSetup.tsx`): prompts for a 4–6 digit PIN, hashed via `hashPin()` and stored.
6. **KioskShell** activates: children can now see their routines.

### PWA & Service Worker (`public/sw.js`, `components/kiosk/RegisterSW.tsx`)

**Cache Strategy:**
```javascript
const CACHE = "harbor-kiosk-v3";
const PRECACHE = ["/kiosk", "/manifest.webmanifest", "/icons/icon.svg", "/icons/icon-maskable.svg"];
```

- **Install:** pre-cache the shell (`/kiosk` HTML) and app icons.
- **Activate:** delete old cache versions (keyed by semver in `CACHE`). On deploy, `sw.js` is fetched fresh and the version bumps, triggering cleanup.
- **Fetch:**

| Request Type | Strategy |
|--------------|----------|
| **Navigation** (`req.mode === "navigate"`) | Network-first: fetch live, cache on success, fall back to cached `/kiosk` |
| **Static assets** (incl. `/_next/*`) | Stale-while-revalidate: serve from cache, fetch in background, cache on success |
| **Same-origin non-GET** | Pass through (no caching) |
| **Cross-origin** (Supabase) | Pass through (untouched) |

**Asset Caching (`RegisterSW.tsx`):** after page load, read `performance.getEntriesByType("resource")` to collect loaded `/_next/*` chunks, post `{ type: "CACHE_ASSETS", urls }` to the SW, which caches each URL (misses silently ignored). Guarantees a cold offline boot.

**Auto-Update on Deploy:** every 30 minutes (or on tab visibility) `RegisterSW` calls `reg.update()`. If a new SW is found: install + `self.skipWaiting()` → `controllerchange` fires → if a controller already existed (not first install), reload after a 60-second debounce (prevents reload loops). The wall reloads, fetches new `/_next` chunks, re-caches them — so a 24/7 wall picks up deploys without manual intervention.

**Manifest** (`public/manifest.webmanifest`): `"start_url": "/kiosk"`, `"scope": "/kiosk"`, `"display": "standalone"`, maskable icon SVGs.

### Self-Healing & Full Reconcile

**Problem:** if a parent deletes a child or routine on their phone while the kiosk is offline, the kiosk cache can become stale (orphaned routines, steps, store items tied to deleted children).

**Solution:** periodic full reconcile. Trigger: boot (`runSync(true)`), every 13 minutes, or manual (parent gate menu "Refresh from cloud"). Flow:
1. Call `rpc_kiosk_pull(p_secret, p_since=null)` (complete snapshot).
2. Apply via `applyPull(state, snap, replace=true)`: replace all arrays wholesale, process deletion tombstones (cascade-delete orphans), adopt server points.
3. Result: stale cached rows are purged; child's points match server.

**Why 13 minutes?** cheap enough (~one RPC, ~100 rows) to run continuously on battery tablets; aggressive enough (7×/day) to catch most deletions promptly.

### State Invariants & Constraints

1. **One-way completions:** once a step/chore ID is in today's `completed`, it cannot be undone locally; only a parent's "reset day" clears it.
2. **Points are offline-authoritative for display:** `state.points` drives the UI. On sync, server-side points (from `rewards`) are adopted; between syncs, local mutations update the map. Points never go negative (floor at 0 on redemptions).
3. **Server points are authoritative for award value:** the kiosk cannot mint points; step rewards are re-fetched from `routine_steps` server-side in `rpc_kiosk_push`.
4. **Idempotent mutations:** completions and redemptions include a `client_op_id` (UUID); the server's unique constraint prevents double-counting on retry.
5. **No offline writes to server data:** snapshot arrays are read-only locally; mutations only enqueue to the outbox. Exception: list items are optimistically added to `snapshot.list_items` (re-applied during sync reconciliation).
6. **Household scoping:** every RPC validates the `device_secret`'s household; no cross-household access.
7. **PIN gates parent actions:** reset day, reset points, calm corner approval require `verifyPin()`. PIN is hashed locally; no plaintext transmission.

### Error Handling & Recovery

| Scenario | Kiosk Behavior |
|----------|---|
| **Offline on boot** | IndexedDB loads state (if previously paired); wall boots and functions fully; no sync attempted |
| **Network error during push** | Outbox is kept; next periodic sync (30 sec) retries |
| **Network error during pull** | State unchanged; next periodic sync retries; wall continues with cached data |
| **Outbox too large** | No size limit in code; mutations are small JSON |
| **IndexedDB quota exceeded** | `persistState()` throws silently (caught in update callback); not persisted; restart reloads old state |
| **Stale cached child** | Full reconcile (13 min or boot) prunes via `replace=true` |
| **SW fails to install** | App still works (daily use functions via snapshot cache) |
| **Corrupted IndexedDB state** | Boot shows error; user taps reload; if persists, `unpair()` and re-pair |

### Unresolved Gaps & Clarifications

1. **List item conflict resolution:** if a parent deletes a list item while the kiosk has a check mutation enqueued, the check arrives for a non-existent ID; the server silently ignores it (no retry for the orphan).
2. **Check-in mutations:** `check_in` lacks an `op_id`, so a retry may record it twice. Acceptable (duplicates rare; feelings are soft data).
3. **Quota handling:** no explicit handling if IndexedDB quota is exceeded; persist failures are silent, leading to stale state on next boot.
4. **Outbox ordering:** mutations are enqueued in order and pushed as a batch; the server processes them sequentially. No conflict detection.
5. **PIN recovery:** no in-kiosk reset if a parent forgets the PIN; they must unpair, re-pair, and set a new PIN (or set it via the companion app, which the kiosk adopts on sync).

---

## 5. Kiosk — Screens, Components & Interactions

### 5.1 Architecture Overview

The Harbor kiosk is a React 19 single-page app with offline-first IndexedDB storage, zero-network daily operation, and multi-sensory feedback. The core flow is:

1. **Loading** → **Unpaired** (via `PairingScreen`) → **PIN Setup** (via `PinSetup`) → **KioskShell** (main app)
2. **KioskShell** manages view state (home, calendar, lists, chores, or a child's screen), modal overlays (CalmCorner, ParentGate, Screensaver), and idle timeout.
3. **Per-child settings** include `readAloud`, `autoRead`, `sound`, `haptics`, `reducedMotion`, `bedtime` (HH:MM visual countdown), and `theme`.

All feedback is **local** and **gated by settings**: the `lib/kiosk/feedback.ts` module (`speak`, `chime`, `tone`, `haptic`, `cheer`) respects enabled flags per child, never requiring network.

### 5.2 Main Screens

#### 5.2.1 Home View (`HomeView.tsx`)

**Renders when:** user taps the Home tab or returns from a child's screen.

**Layout (top to bottom):**
1. **Header** — greeting (Good morning/afternoon/evening), date, time, optional weather widget, parent menu button (🔒).
2. **Highlight row** — next countdown event (emoji, days until, title) and/or tonight's dinner (emoji, title).
3. **Reminders alert** — due-today reminders in an amber banner with bell icon.
4. **Message cards** — top 3 wall messages (pinned first, newest next), each showing emoji, body, author label, pinned indicator.
5. **Chores section** — `<ChoresBoard variant="home" />` shows each child with chore rings and completions.
6. **Today agenda card** — tappable; up to 4 events with time, color dot, emoji, title; "Nothing scheduled. Enjoy the calm. 🌊" fallback.
7. **House Rules button** (if rules exist) — ScrollText icon, "Our rules & what happens" subtitle.

**Interactions:** tap child avatar ring → ChildView; tap chore chip → check off (requires PIN if `requires_approval`); tap today agenda → CalendarView; tap House Rules → HouseRules modal; tap lock → ParentGate → ParentMenu (reset days, reset points, refresh, unpair).

**Real-time updates:** time updates every 20 seconds; quiet-hours / screensaver check every 60 seconds.

#### 5.2.2 Child View (`ChildView.tsx`)

**Renders when:** user taps a child on Home or ChoresBoard.

**Core state per child (across midnight):** `progress[child.id].completed` (step/chore IDs done today); `points[child.id]`; grounding status (day counter + paused privileges); active calm corner (CornerTimer overlay).

**Layout:**
1. **Header** (color-tinted gradient) — Home button, star points, child avatar, routine name, progress message, progress bar.
2. **Routine tabs** (if multiple routines) — scroll-x; tap to switch.
3. **Calm Corner overlay** (if active) — countdown + plan steps over content.
4. **Main content:** Play Time unlock button (🎮) if day complete & game not played; bedtime countdown (if configured); encouragement line (teal sparkle badge); grounding status banner; **NowNext band** (current/next steps with 2-min transition warnings); All done badge; **Routine** (First/Then two big StepCards with arrow, Then muted until First done — OR Schedule 2–3 column grid of task StepCards); **Chores section** (2–4 column grid of chore buttons with icon, title, points, done checkmark, approval badge 🛡️).
5. **Footer actions** (sticky, 3-col): Store (🎁) → StoreView; Timer (⏱️) → TransitionTimer (120s default); Calm (❤️) → CalmCorner.

**Interactions — Step/Chore Taps:** whole card is one tap target. On complete (not done): `kiosk.completeStep/completeChore`, multi-sensory feedback (`chime()`, `haptic(20)`, `speak(cheer() + " {label} done!")`); if points > 0 celebrate modal (1.3s, +X floating); if step finishes the routine, big celebration modal (4.2s) with avatar, "You did it, [name]!", confetti (64 pieces). Chore with `requires_approval && pinHash` → ParentGate first. Read-aloud button (🔊, bottom-right) speaks `step.label` without completing.

**Opening behavior:** if `autoRead`, speak `"{child.name}'s {routine.name}"` once; if `readAloud`, speak daily encouragement line (rotated by date).

**Celebration flow:** small (step) 1.3s, centered +X stars, confetti 24 pieces, no backdrop; big (routine done) 4.2s, full-screen kbg2/97 backdrop with avatar, text, confetti 64 pieces, tap to dismiss.

**Game unlock:** renders if `dayComplete && !gamePlayed`; on tap sets `gamePlayed = true` (localStorage), opens MiniGame; MiniGame on close also sets the flag (idempotent).

#### 5.2.3 Calendar View (`CalendarView.tsx`)

**Four tabs:** Day, Week, Month, Agenda. **Per-child filter chips:** "Everyone" + one per child (tap to filter, tap again to clear).

- **Day:** full-day row at top; time grid (8 AM–6 PM or event bounds), scrollable, red "now" line on today; event blocks colored by child, sized by duration, overlapping side-by-side; tap event → EventDetail.
- **Week:** 7 day columns with DOW label + date circle (today = teal); same time grid; tap day header → Day view; tap event → EventDetail.
- **Month:** 7-column grid (6 rows); today highlighted teal; each cell shows date + up to 5 colored dots; tap cell → Day view.
- **Agenda:** vertical list of EventRow cards grouped by date (next 14 days); colored left border, emoji + title, time, person_label, location, responsible_label; empty state "Nothing scheduled. Enjoy the calm. 🌊".

**EventDetail modal** (bottom-sheet on wall, centered on desktop): header (emoji + title, date + time); detail rows (child avatar + name, person_label, MapPin + location, Flag + responsible_label, Repeat + recurrence); footer (Read aloud + Done). Opens with a spoken description; Esc/Done/X to close.

#### 5.2.4 Chores View (`ChoresBoard.tsx` with `ChoresView` wrapper)

**Renders when:** user taps Chores tab. **Layout:** header eyebrow + "Chores" title; one ChoresBoard row per child (always shown, even with no chores today).

**Per-child row:** avatar progress ring (conic gradient; green checkmark badge if all done); name + chore status ("No chores today" / "N of M done"); points badge (⭐); bedtime countdown chip (if configured); calm corner badge (if active "💜 In the calm corner"); reset/grounding banner (pause chips, privileges tags, info ℹ️ to speak reason); chore buttons (flex-wrap pills: icon + title + points, done coloring, rotation badge RotateCw, approval badge ShieldCheck; tap → complete + feedback + celebrate 1.1s).

#### 5.2.5 Lists View (`ListsView.tsx`)

**Renders when:** user taps Lists tab. **Layout:** header ("Shared lists" eyebrow + "Groceries"/"To-do" + "N left" badge); list switcher (Groceries 🛒 / To-do ✅, active = teal); add form (input + plus → `kiosk.addListItem(draft, { list_kind })`); item list (unchecked first, then sort_order; checkbox + name + category; tap toggles `checked`); empty state ("Nothing here yet").

**Interactions:** type + plus/Enter → adds (mutation recorded locally); tap checked → uncheck (fade); tap unchecked → check (emerald styling).

#### 5.2.6 Screensaver (`Screensaver.tsx` + `SleepMode`)

**Triggered when:** idle for `settings.idleSeconds` (default 120s) AND (`screensaver !== false` OR inside `quietStart`–`quietEnd` quiet hours — both 24-hour HH:MM, overnight wrap supported).

**Screensaver mode (idle + not quiet hours):** ambient drift background + optional photo backdrop (14s cross-fade); gradient overlay; header (lighthouse `animate-beacon` + large time, greeting + date + DOW, optional weather widget).

**Rotating flip panel (every 7 seconds, auto-cycle, tap to advance):**
1. **AI Brief** (if available) from `/api/ai/brief` (server-cached once/day) — bold **words** as `<strong>`.
2. **Tonight's dinner** — meal emoji + title (5xl bold).
3. **Today's agenda** — up to 4 events (time + color dot + emoji + title).
4. **Family notes** — top 2 wall messages (pinned first; emoji + body + author).
5. **Next countdown** — soonest event/birthday (emoji + days-until + "sleeps to go").
6. **Family teamwork** — cooperative view: total chores/total done for all kids + progress bar + avatars (no points, no ranking).
7. **Affirmation** — rotating daily affirmation (12 options, cycled by `Math.floor(now.getTime() / 60000) % count`).

**Panel indicators** — dots at bottom (active = wide white/85; tap to jump). **Unlock button** — "🔒 Tap to open Harbor → Chevron" (only way to wake).

**Sleep mode (in quiet hours):** near-black bg; tiny dim clock only (white/25, updates every 30s); tap anywhere to wake.

**Any activity wakes:** pointerdown/touchstart/keydown listeners on KioskShell reset `asleep = false`, close all modals, go to home.

### 5.3 Component Library & Interactive Elements

#### 5.3.1 Step Card (`ChildView.tsx` → `StepCard`)

Whole-card tap target. Props: `step` (label, icon, reward_points, photo_url); `done` (checkmark badge, grayed, struck-through if true); `onTap` (complete); `onSpeak` (read label); `big` (52px vs 40px min-height; 7xl vs 6xl icon); `label?` ("First"/"Then"); `muted` (opacity-50, disabled — Then before First). Styling: rounded-2xl, kpanel bg + shadow/ring, or emerald-500/15 if done. Layout: icon, label, points badge (if > 0), done checkmark (top-right emerald circle), read-aloud corner button (if not done/muted). Taps trigger `chime(settings.sound)`, `haptic(20, settings.haptics)`, `speak(cheer() + " {label} done!", settings.readAloud)`.

#### 5.3.2 Chore Button (Variants)

- **Home/ChoresBoard:** small pill (h-12): icon (1.25em), title, rotation icon (RotateCw h-3.5), approval icon (ShieldCheck h-3.5), done checkmark badge; kraise ring bg if not done, child color if done.
- **ChildView:** large card (min-h-32, 2–4 cols): icon (5xl), title (lg bold), points badge (⭐+N), approval icon (top-left), done badge (top-right); kpanel ring if not done, emerald-500/15 if done.

#### 5.3.3 Confetti (`Confetti.tsx`)

Props: `count` (default 26), `spread` (default 240 px). Generates `count` CSS particles, each with random angle + distance (spread × 0.35–1.0), size (6–14px), color (6 palette colors), rotation (0–360°), duration (750–1400ms), delay (0–90ms); animates outward + down + rotate. Respects `prefers-reduced-motion` (collapses to 0ms). Mounted keyed on celebrate event; parent is `fixed inset-0 z-30`.

#### 5.3.4 NowNext Band (`NowNext.tsx`)

Renders if steps have `start_time` and at least one is timed today. Two columns (or single): **Now** (current step icon + label or "Free time"); **Next** (arrow → next step, right-aligned muted); progress bar (teal gradient, fills between current and next times). Spoken transition warning when `next time – now < 2 minutes` and not yet warned: `tone()` (440Hz triangle, 0.5s) + speak "Two minutes until {next.label}". Checks the device clock every 15 seconds; warning fires exactly once per transition.

#### 5.3.5 Bedtime Countdown (`BedtimeCountdown.tsx`)

Props: `bedtime` ("HH:MM"); `variant` ("chip"/"full"); `color?`; `onSpeak?`. **Chip:** icon (sun/moon/night/sleep) + draining bar + short label. **Full:** icon + label + gradient bar (sun→moon→sleep) + slider dot; tap to speak. Logic window 240 min before bed: before 4h "Lots of time"; within 4h "N hours"; within 60m "N minutes"; within 15m "Almost bedtime!"; at/past "Bedtime!" (🌙); > 2h after "Sleep time" (😴, treat as asleep).

#### 5.3.6 Store Item Card (`StoreView.tsx`)

KCard with emoji (5xl) + content (title, points cost + "(goal)" label, progress bar `points / cost * 100`, "Get it" button — teal if affordable, grayed if not, green "Enjoy!" if bought). Affordability: button shows `cost - currentPoints` remaining stars if short. Goals: no button; "Goal reached! 🎉" or "N stars to go". On buy: mutation recorded, feedback, bought celebration modal (2.2s, item emoji + "You got it!"). Pause: if grounded + `pause_rewards`, shows "The store is taking a short break".

### 5.4 Modal Overlays

#### 5.4.1 ParentGate (`ParentGate.tsx`)

Full-screen modal (z-50): dark backdrop + centered KCard. Props: `verify` (async PIN check), `title?` ("Enter your PIN"), `subtitle?`, `onSuccess`, `onCancel`. Content: lock icon, "Parents only" eyebrow, title + subtitle, PinPad (4 digits), error "Wrong PIN — try again." PinPad: 4 filled/empty circles, 3×3 grid (1–9) + 0 + delete; calls `onComplete(pin)` at 4 digits, auto-clears after 250ms.

#### 5.4.2 Calm Corner (`CalmCorner.tsx`)

Full-screen modal (z-40). Main menu: 2-col grid of tool cards (icon + label + blurb). Tools (one active, back returns to menu):
- **Breathing:** configurable pattern (e.g. "4-4-4"), rounds (default 4); two concentric circles scale with breath phase ("Breathe in"/"Hold"/"Breathe out"); on complete "Great breathing! You took N slow breaths." + 🌬️ animate-reward.
- **Feelings:** 3×2 grid of emoji buttons; tap → "Thanks for sharing. It's okay to feel [feeling]. You're doing great." + animate-reward; calls `onCheckIn(feeling)`.
- **Break Timer:** configurable minutes (default 5); "M:SS" 5xl countdown; "Take your time, [name]. Calm body, calm mind."; on complete "Feeling better?" + 💛; animated beacon background.
- **Social Story:** configurable title + pages; one page at a time in a KCard; Back/Next; page counter.

Opening: ChildView Calm button → with active child; Home Calm tab → first child.

#### 5.4.3 Reward Store (`StoreView.tsx`)

Full-screen modal (z-40), slides up with close X. Header: "Reward Store" + star points badge + X. Content: store-paused banner if grounding + `pause_rewards`; "No rewards yet" if empty; else grid (2 cols tablet/desktop, 1 mobile). Redemption: tap "Get it" → `kiosk.redeemStoreItem(childId, item)`, `chime()`, `haptic([20,40,20])`, `speak("You got {item.label}!")`, small celebration (1.6s) then large (2.2s).

#### 5.4.4 Mini Game "Star Catch" (`MiniGame.tsx`)

Unlocks when day fully complete and not yet played today. Full-screen overlay (z-70), gradient bg. 35-second duration (capped). Tap floating emoji treats (⭐🌟✨🎈🫧🍪🦄🌈🍭🎉🐢🦊). Spawning: new treat every 600ms, max 10, fade after 3.2s; `chime()` + `haptic(15)` on tap. UI: top bar (⏱ countdown, ⭐ score, X); "Catch the stars! ✨" overlay on first render. End: 🎉 animate-pop, "Nice one, [name]!", "You caught N stars!", Done.

#### 5.4.5 Transition Timer (`TransitionTimer.tsx`)

Props: `seconds` (default 120), `label` (default "Get ready…"). Full-screen modal (z-50), dark kbg2. Label (3xl), circular SVG progress ring (130px radius; background kline, progress teal/beacon, animates), center timer or ✓, close X. On complete: "Done" button.

#### 5.4.6 Calm Corner Timer (`CornerTimer.tsx`)

Overlays ChildView content (not full-screen). Props: `corner` (started_at, duration_minutes, plan), `childName`, `readAloud`. Display: violet-400 gradient; "💜 Calm corner" header; while running "Take your time, [name]. Calm body, calm mind." + MM:SS (6xl) + progress bar; plan steps (numbered cards); reminder ("💡 ...") in violet box; encouragement (italic). On complete (msLeft ≤ 0): confetti (28 pieces, always shows), "All done 💚" + "Welcome back, [name]. Fresh start!" + encouragement. Reads aloud once on first render if `plan` exists and `readAloud`.

#### 5.4.7 House Rules (`HouseRules.tsx`)

Full-screen modal (z-40). Props: `rules` (kind "rule"/"consequence"). Header + close; two sections (Rules / Consequences) if both present; each card: emoji + title + detail.

### 5.5 Parent Menu (`KioskShell.tsx` → `ParentMenu`)

Accessible via lock button on HomeView → ParentGate PIN → ParentMenu (bottom-sheet on wall, centered on desktop). Header: "Parent menu" + sync status + last sync time. Actions (each two-tap-confirm where destructive):
1. **Reset all kids' checkmarks for today** (RotateCcw) → `kiosk.resetDay()` for all children.
2. **Reset all points to zero** (Star, danger) → `kiosk.resetPoints()` (async); error if offline ("Couldn't reset — connect to Wi-Fi and try again.").
3. **Refresh from cloud** (RefreshCw) → sync immediately ("Syncing…").
4. **Unpair this device** (LogOut, danger) → `kiosk.unpair()`; clears pinHash + state.

Footer: "Done". Sync status labels: idle ""; syncing "Syncing…"; ok "Backed up to the cloud"; error "Sync hiccup — will retry automatically"; offline "Offline — the wall keeps working"; no-plus "Local only · Harbor Plus adds cloud backup".

### 5.6 Voice Button ("Hey Harbor") (`VoiceButton.tsx`)

Fixed floating button (bottom-right, z-40). Props: `deviceSecret` (to `/api/ai/command`); `onActed?` (triggers sync). Status: idle (blue mic), listening (teal pulse), thinking (kraise + spinner), speaking (beacon + speaker). Features:
1. **Tap-to-talk:** tap mic → Web Speech Recognition (en-US, interim results); caption "You: [transcript]"; on end POST to `/api/ai/command` (device_secret + text); reply caption + TTS; status listening → thinking → speaking → idle.
2. **Always-listening (opt-in):** toggle "Hey Harbor" (localStorage); continuously listens for wake word `hey,?\s*harbor[\s,.!?]`; on detect speaks "Yes?" + waits 7s for command.
3. **Dismiss:** X stops speaking + resets. Keyboard: Esc in thinking aborts.

### 5.7 Multi-Sensory Feedback System (`lib/kiosk/feedback.ts`)

All functions are no-op safe (graceful fallback; gated by `enabled` per child).
- **`speak(text, enabled=true)`** — `SpeechSynthesisUtterance`, rate 0.95, pitch 1.05; cancels previous; used for encouragement, completion messages, transition warnings, event details.
- **`cheer(): string`** — random from 10-item array ("Awesome", "Way to go", "You did it", …).
- **`chime(enabled=true)`** — Web Audio two-note success chime (523.25 Hz + 783.99 Hz, staggered 120ms, ~350ms). Used on completion.
- **`tone(enabled=true)`** — single 440 Hz triangle wave (~500ms). Used for transition warnings.
- **`haptic(pattern=30, enabled=true)`** — `navigator.vibrate()`. Step completion 20ms; big celebration 60ms; store redemption `[20,40,20]`.
- **`stopSpeaking()`** — cancels pending speech (before voice commands, on modal close, on dismiss).

### 5.8 Per-Child Accessibility Settings

Stored in `child.settings` (JSON object).

| Key | Default | Effect |
|-----|---------|--------|
| `readAloud` | `true` | Speak all TTS feedback (chores, steps, encouragement, transitions) |
| `autoRead` | `false` | On open, speak routine name + progress (once, not per render) |
| `sound` | `true` | Chime on completion, tone on warnings, speak on voice commands |
| `haptics` | `true` | Vibrate on completion + celebrations |
| `reducedMotion` | `false` | Skip animations (confetti, pop, reward, bubble) via `!reducedMotion && <Confetti />` |
| `theme` | `"harbor"` | Color theme (from color identity system) |
| `bedtime` | `null` | HH:MM bedtime — enables countdown visual + chip |

Honored via `readChildSettings(child)` passed to all `speak()`/`chime()`/`tone()`/`haptic()` calls and conditional animation rendering. Example:
```typescript
const settings = readChildSettings(child);
complete(step) {
  chime(settings.sound);
  haptic(20, settings.haptics);
  speak(`${cheer()}! ${step.label} done!`, settings.readAloud);
}
```

### 5.9 Gap & Edge Cases

1. **Grounding + calm corner overlays:** both render (corner timer floats, grounding banner below); confirm no z-index collision.
2. **Multi-routine tab switching:** progress preserved per routine_id; no reset on switch.
3. **NowNext with no start_times:** bails out early; no blank card.
4. **Bedtime past midnight:** if bedtime 23:00 but now 02:00, treated as "already asleep" (😴, no draining).
5. **Screensaver photo loading:** if photos empty or fail, ambient bg + gradient still visible.
6. **AI brief fetch timeout:** panel renders without brief; other panels keep cycling.
7. **Parent PIN offline:** `verifyPin()` compares local SHA-256; if no hash, `verifyPin("anything")` auto-passes (no-PIN setups).
8. **Store cost > points:** button disabled, shows "N more stars".
9. **Celebration modals stacking:** only one renders at a time; state mutations clear the old before showing the new.

---

## 6. Parent Companion (/app)

### Overview

The Parent Companion (`/app/(parent)`) is a full-featured management dashboard where parents configure their household, manage children and routines, track activity, set expectations, and receive AI-powered insights. It enforces authentication (`requireUser()`) on every page (`force-dynamic`) and uses **Server Actions** (in `actions.ts` and `hub-actions.ts`) for all mutations. The parent is the source of truth: all data parents enter flows to the wall tablet (via Supabase sync) and shapes every child's experience.

### Server Action Pattern

Harbor uses a declarative, form-driven pattern for mutations:

1. **Server Action signature**: `async function actionName(formData: FormData)` (or with `.bind(null, id)` pre-filling the ID).
2. **Form binding**: `<form action={actionName.bind(null, id)}>` passes the ID as the first argument.
3. **SubmitButton** (`components/ui/SubmitButton.tsx`): in-flight latch prevents double-tap; shows "Working…" while pending, then flashes "Saved" for 1.8s; respects `confirmSaved` prop (default true; false for non-persisting actions like reorder).
4. **ConfirmSubmit** (`components/ui/ConfirmSubmit.tsx`): wraps destructive actions; modal asks for confirmation; focus trap (Cancel/Confirm), Escape closes; calls `form.requestSubmit()` to fire the action deterministically before closing (prevents silent cancellation in production).
5. **Cache invalidation**: most actions call `revalidatePath()`; calendar changes also call `invalidateBriefs()` to bust cached AI briefs.
6. **Soft-delete convention**: chores, routines, children are soft-deleted (mark `deleted_at`, filter out) except permanent deletes (`deleteChildPermanently()` via RPC `hard_delete_child`).

**Utility helpers in `actions.ts`:**
```typescript
function str(v): string | null      // trim → null if empty
function int(v, fallback): number    // parse number or fallback
function nextOrder(table, column, fkColumn, fkValue): number  // get next sort_order
```

### Dashboard & Home (`/app`)

**File**: `page.tsx`; render pattern `force-dynamic`. Content:
- **Setup Checklist** (if onboarding not dismissed + not all done): Add a child / Build a routine / Add a reward / Pair your wall. Dismiss via `dismissOnboarding()` (saves `settings.onboardingDismissed = true`).
- **Harbor Plus Promo** (if not active): link to billing; highlights cloud backup, sync, insights.
- **Children Grid**: non-deleted children by `sort_order`; each card links to detail, shows routine count + total points; "Add child" anchors to `#add`.
- **Wall Devices Card**: lists `device_pairings` by code + status; code formatted `XXXX-XXXX` via `formatPairingCode()`.

Data flow: `getMyHousehold()` → check subscription; query children, pairings, routines for checklist; "next color" from palette for new child.

### Children List (`/app/children`)

**File**: `page.tsx`. Grid of all children (avatar, name, color swatch) with routine count + points total; "Add child" card at bottom (one-tap form). Clicking a card → `/app/children/[id]`.

### Child Detail & Routines (`/app/children/[id]`)

**File**: `[id]/page.tsx` (350+ lines of form UI).

#### Profile Section
Hero (color background, avatar emoji, name, color name badge); photo upload via `ChildPhotoField` (browser uploads to Supabase Storage; server action persists URL); form fields (name, emoji avatar, birthday, color swatch picker — radio group, only updates when a swatch is clicked); submit → `updateChild(childId, formData)`.

#### Accessibility & Wall (`updateChildSettings`)
Toggles (read-aloud, auto-read, sounds, haptics, reduced motion); dropdowns (wall theme harbor/water/beacon/seafoam, bedtime time-picker). Merged into `children.settings` (JSONB).

#### Grounding Card (`GroundingCard`)
- **Active reset display**: progress bar (day N of total), days left & end date, badges (Store paused / Screen time paused / privileges lost); buttons "Earn a day back" (`adjustGrounding(id, childId, -1)`), "Extend 1 day" (`adjustGrounding(id, childId, +1)`), "End early" (`endGrounding(id, childId)`).
- **Start grounding form**: reason, note, duration (1–60), toggles for pause rewards/screen-time; privileges picker (preset bubbles + custom). `startGrounding(childId, formData)` closes any prior active grounding, inserts new one. Duplicate-safety: unique constraint on (child_id, status='active') catches concurrent double-fires (error code 23505 → no-op).

#### Calm Corner Card (`CornerCard`)
- **Active corner display**: live countdown (updates every 1s client-side), progress bar, reason & feeling, gentle plan steps + reminder + encouragement from AI (or defaults); buttons "End corner" (`endCorner(id, childId)`), "Generate reflection" (`generateCornerReport(id, childId)`).
- **Start corner form**: reason (required), feeling, minutes override; `startCorner(childId, formData)` generates AI plan (or defaults), inserts record; one per child (closes prior active; unique constraint enforces).
- **Recent corners** (past 8): collapsed list (date, reason, feeling).

#### Chores Section
List of non-deleted chores (by `sort_order`): inline edit (icon, title, points, day-of-week checkboxes, approval toggle, rotation toggle); autosave on blur + explicit submit; delete (ConfirmSubmit → `deleteChore(id, childId)`). Add chore form: icon, title (required), points (≥0), days (empty = every day), rotation toggle, approval toggle. Days serialize to `days_of_week: null | [0,1,2…]`; rotation ON fetches all kids and stores `rotation_member_ids`. `createChore(childId, formData)` calls `nextOrder()`.

#### Routines & Steps
One card per routine (by `sort_order`): routine header form (name, type badge read-only, active toggle, save; collapsible "Schedule & days" tray with start/end time, sort_order, day-of-week checkboxes). Steps list (`StepRow` per step): emoji icon button, label, badges (first/then, start time, points); expanded detail tray (emoji, label, step type, start time, duration, reward points; autosave on blur + Save; reorder up/down via `moveStep(id, childId, dir)`; delete ConfirmSubmit). Calls `updateStep`, `moveStep`, `deleteStep`. Add step form (inline 3-col): icon, label (required), step type dropdown (first_then); `addStep(routineId, childId, formData)` calls `nextOrder()`. Delete routine button (`deleteRoutine(id, childId)`).

#### Add Routine Section
- **Quick-start templates**: grade bundles (kindergarten, 2nd, 4th) → `addGradeRoutines(childId, formData)` inserts 3 routines (Morning, After school, Bedtime) + all steps; single templates (Morning, Summer day, Bedtime, After school, First/Then) → `addRoutineFromTemplate(childId, formData)`.
- **Custom routine**: name (required), type (schedule/first_then) → `addRoutine(childId, formData)`.

#### AI Profile Card (`AiProfileCard`)
Shows summary, interests (tags), motivators, encouragement lines; textarea for parent notes; button "Build profile with AI" / "Refresh profile" → `buildChildProfile(childId, note)` (calls Anthropic Haiku); error if AI key not set or call fails.

#### Danger Zone
- **Hide from wall**: `deleteChild(childId)` → soft-delete (data kept).
- **Delete permanently**: `deleteChildPermanently(childId)` → RPC `hard_delete_child` (cascades all data).

### Chores (Reorder & Auto-Order Details)

**Day-of-week encoding:** checkboxes 0–6 (Sun–Sat); empty/all 7 = `days_of_week: null` (every day); partial = sorted int array. **Rotation:** toggle "Rotate between all the kids each week"; fetches all non-deleted children, stores IDs in `rotation_member_ids`; wall picks current week's kid by week number; requires 2+ kids. **Requires approval:** "Needs a grown-up's OK to check off"; wall shows badge; child gets parent to confirm. **Auto-order:** up/down swaps `sort_order` with neighbors.

### Calendar (`/app/calendar`)

**File**: `calendar/page.tsx`. **Events:** add form (title required, emoji, datetime via `DateTimeField`, who, location, color, recurrence once/daily/weekdays/weekly, child selector optional, all-day toggle, countdown toggle); `addEvent(formData)` also calls `invalidateBriefs()`. Events list (by `starts_at`): card (emoji, title, time, repeats, person, location, delete); `deleteEvent(id)` also calls `invalidateBriefs()`. Legend: per-child color swatch + name. **Reminders:** add form (title required, due date); list (title + due date, delete); `addReminder(formData)`, `deleteReminder(id)`.

### Lists/Grocery (`/app/lists`)

**File**: `lists/page.tsx`. Add item (name required, category) → `addListItemParent(formData)` (`list_kind='grocery'`, `added_by_label='Phone'`). Items list: checked strikethrough, unchecked bold; toggle (`toggleListItem(id, checked)`); shows `added_by_label`; "Clear N checked" (`clearCheckedItems()` soft-deletes checked).

### Pantry (`/app/pantry`)

**File**: `pantry/page.tsx`. Add ingredient (name required, quantity, category) → `addPantryItem(formData)` (`list_kind='pantry'`, `added_by_label='Pantry'`). Items grid (2-col): name + quantity + category; delete (ConfirmSubmit). Purpose: feeds the AI meal planner (suggests dinners using on-hand ingredients, shops only for missing).

### Meals (`/app/meals`)

**File**: `meals/page.tsx`. **AI meal planner:** "Plan the week with AI" → `generateMealPlan()` (requires `ai_config.enabled`; calls `planDinners(supabase, household_id, aiKey)` in `lib/ai/mealPlan.ts`; fills next 7 days' open dinner slots; returns `{ ok, error, added, groceryAdded, usedPantry }`; revalidates `/app/meals` + `/app/lists`). Add meal: date (today), meal type, title, emoji → `addMeal(formData)`. Meals list grouped by date; delete (ConfirmSubmit → `deleteMeal(id)`).

### Messages (Wall Board) (`/app/messages`)

**File**: `messages/page.tsx`. Add message: body (required), emoji, author label, for (child), bonus stars, pinned toggle → `addMessage(formData)` (inserts `wall_messages` with optional expiry; **if bonus > 0 and child chosen, mints stars server-side** — reward_log entry + upserts `rewards`). Messages list (newest first): emoji, body, author (right), pinned badge, bonus badge, delete (`deleteMessage(id)`). Key detail: bonus stars applied immediately so the child sees them on the wall shortly after posting.

### Rules (House Rules & Consequence Ladder) (`/app/rules`)

**File**: `rules/page.tsx`. Split display: "The rules" (kind='rule', non-numbered, emoji + title + detail) and "If choices slip — the ladder" (kind='consequence', numbered bubbles). Empty state: "Add starter rules & ladder" → `seedHouseRules()` (5 rules + 4-step ladder, one-time). Per-rule card: inline edit (emoji, title, detail), Save, Up/Down (`moveHouseRule(id, dir)` swaps sort_order), Delete (ConfirmSubmit). Add at bottom: emoji, title (required), detail. Server actions: `addHouseRule(kind, formData)`, `updateHouseRule(id, formData)`, `deleteHouseRule(id)`, `moveHouseRule(id, dir)`.

### History (Activity Ledger) (`/app/history`)

**File**: `history/page.tsx`. Data: `reward_log` (completions, resets, bonuses, redeems — delta + reason + FKs) + `check_ins` (feeling + note). Entry rendering: icon (emoji from chore/step/store, or feeling emoji, or reset arrow), text, child name + color dot, timestamp (HH:MM), delta badge (green +N / amber −N / gray reset), feeling heart (if check-in). Grouped by day (Today/Yesterday/Date). Flow: query last 250 reward_log + 120 check_ins (desc), join chores/steps/store items for labels, merge chronologically, group.

### Insights (Gentle Analytics) (`/app/insights`)

**File**: `insights/page.tsx`. Gating: Harbor Plus only (promo if not active). Stats cards (3-col): "Steps this week", "Check-ins" (last 14 days), "Best day" (weekday with most completions). Steps bar chart (last 7 days). Feelings histogram (by frequency). Gentle pattern card: detects "tough feelings" (sad/angry/worried/tired/frustrated), finds peak hour, frames as rhythm not diagnosis. AI Insight Card (`AiInsightCard`): "Get insight" → `generateInsight()` (requires AI; queries last 14 days; calls Haiku; warm 3–4 sentence summary).

### Store (Reward Store Config) (`/app/store`)

**File**: `store/page.tsx`. Add reward: label (required), emoji, cost, kind (reward/screen_time/allowance/goal), for (child or all) → `addStoreItem(formData)`. Rewards grid: inline edit (emoji, label, cost, kind, enabled toggle), badge "Child · Kind", Save, Delete → `updateStoreItem(id, formData)`, `deleteStoreItem(id)`.

### Settings (`/app/settings`)

**File**: `settings/page.tsx`.
- **Household:** name → `updateHouseholdName(formData)`.
- **Wall Display:** idle timeout (≥30, default 120), home photo URL, weather location (geocoded once via Open-Meteo to lat/lon), quiet hours, photo slideshow URLs (one per line), screensaver toggle → `updateKioskSettings(formData)` (merges into `households.settings`).
- **AI Companion:** Anthropic API key (password field; "Remove saved key" to clear), Enable AI toggle → `saveAiConfig(formData)` (upserts `ai_config`); shows On/Off; key never sent to the tablet.
- **Wall PIN:** 4–8 digit PIN → `setParentPin(formData)` / `clearParentPin()` (hashed server-side via `hashPinServer()`); shows Set/Not set.
- **Wall Devices:** list paired devices by code + status (read-only).
- **Account:** link to `/account/password`.

### Billing (`/app/billing`)

**File**: `billing/page.tsx` + `BillingActions.tsx`. Pricing $3.99/mo or $39/yr (18% savings). Plus features: cloud backup, edit-from-phone, gentle insights, content library, early access. Subscription state (`plus_subscriptions`): active → "Active" + "Manage or cancel" (Stripe portal); inactive → two buttons (monthly + annual) → Stripe checkout; not configured → "Billing not switched on yet". Legal: "Cancel anytime" — wall keeps working free; only loses cloud backup + insights. `BillingActions` (client) POSTs `{ plan }` to `/api/stripe/checkout` or `/api/stripe/portal`, redirects to session URL.

### Delete & Soft-Delete Pattern (Production Fix)

In production, `.bind(null, id)` pre-fills IDs that must come through for RLS to work. For delete operations, the action receives `id` (from `.bind`) then `formData`:
```typescript
export async function deleteChore(id: string, childId: string) {
  // id from .bind; childId for revalidate path. Do NOT read from formData.
  await supabase.from("chores").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath(`/app/children/${childId}`);
}
```
This ensures RLS sees the parent's household context (auth) + the child's household via join; deletes only work if the parent owns the child.

### Cache Invalidation

Most mutations call `revalidatePath()` on affected pages. Calendar event changes also call `invalidateBriefs(household_id)`:
```typescript
async function invalidateBriefs(household_id: string) {
  try {
    await createAdminClient().from("ai_briefs").delete().eq("household_id", household_id);
  } catch { /* best-effort; brief refreshes next day */ }
}
```

### AI Integration Points

1. **AI Profile** (`AiProfileCard`) — `buildChildProfile(childId, note)`: Haiku builds summary, interests, motivators, encouragement; shown on wall during encouragement moments.
2. **Chore Suggestions** (`SuggestChoresButton`) — `suggestChores(childId)`: Haiku with child age + existing chores; inserts deduplicated suggestions.
3. **Meal Planning** (`GenerateMealsButton`) — `generateMealPlan()` → `planDinners()`: fills 7 days of dinners + grocery items.
4. **Calm Corner Plans** (`CornerCard`) — `startCorner(childId, formData)`: AI plan if enabled, kind defaults otherwise; stored in `corners.plan`.
5. **Corner Reflection** (`CornerCard` → `ReportButton`) — `generateCornerReport(id, childId)`: parent-facing narrative; stored in `corners.report`.
6. **Family Insights** (`AiInsightCard`) — `generateInsight()`: Haiku 2-week narrative; Plus-only.

### Key Flows

- **Adding a Child:** `createChild()` (celebratory) or `addChild()` (form) → next `sort_order` + palette color → create `rewards` row (points_total 0) → redirect/toast.
- **Configuring a Routine:** select template/grade bundle → `addRoutineFromTemplate()`/`addGradeRoutines()` inserts routine(s) + steps (by `order_index`); reorder via up/down; toggle active/inactive to pause.
- **Rotating Chores:** create chore + "Rotate between all the kids" → stores `rotation_member_ids` → wall calculates week's kid via week offset.
- **Starting a Calm Corner:** fill reason/feeling/minutes → `startCorner()` (fetch birthday → age, generate Haiku plan or default, insert active record, close prior) → wall shows timer + steps → end early or generate reflection.
- **Meal Planning:** "Plan the week with AI" → `generateMealPlan()` (finds gaps, fetches pantry, Haiku suggestions, inserts meals + grocery items) → edit manually → wall shows "Tonight's dinner".

### Summary Table

| Feature | File | Server Actions | Cache Invalidation |
|---------|------|-----------------|-------------------|
| **Children** | `/children`, `/children/[id]` | `addChild`, `updateChild`, `deleteChild`, `deleteChildPermanently` | `/app`, `/app/children`, `/app/children/[id]` |
| **Routines** | `/children/[id]` | `addRoutine`, `updateRoutine`, `deleteRoutine`, `addRoutineFromTemplate`, `addGradeRoutines` | `/app/children/[id]` |
| **Steps** | `/children/[id]` (inline) | `addStep`, `updateStep`, `moveStep`, `deleteStep` | `/app/children/[id]` |
| **Chores** | `/children/[id]` | `createChore`, `updateChore`, `deleteChore` | `/app/children/[id]` |
| **Events** | `/calendar` | `addEvent`, `deleteEvent` | `/app/calendar` + `invalidateBriefs()` |
| **Reminders** | `/calendar` | `addReminder`, `deleteReminder` | `/app/calendar` |
| **Messages** | `/messages` | `addMessage`, `deleteMessage` | `/app/messages` + mint stars server-side |
| **Rules** | `/rules` | `addHouseRule`, `updateHouseRule`, `deleteHouseRule`, `moveHouseRule`, `seedHouseRules` | `/app/rules` |
| **Lists** | `/lists` | `addListItemParent`, `toggleListItem`, `clearCheckedItems` | `/app/lists` |
| **Pantry** | `/pantry` | `addPantryItem`, `deletePantryItem` | `/app/pantry` |
| **Meals** | `/meals` | `addMeal`, `deleteMeal`, `generateMealPlan()` | `/app/meals`, `/app/lists` |
| **Store** | `/store` | `addStoreItem`, `updateStoreItem`, `deleteStoreItem` | `/app/store` |
| **Grounding** | `/children/[id]` | `startGrounding`, `adjustGrounding`, `updateGrounding`, `endGrounding` | `/app/children/[id]` |
| **Calm Corner** | `/children/[id]` | `startCorner`, `endCorner`, `generateCornerReport()` | `/app/children/[id]` |
| **AI Profile** | `/children/[id]` | `buildChildProfile()` | `/app/children/[id]`, `/app` |
| **Settings** | `/settings` | `setParentPin`, `clearParentPin`, `updateHouseholdName`, `updateChildSettings`, `updateKioskSettings`, `saveAiConfig` | `/app/settings` |
| **Insights** | `/insights` (Plus) | `generateInsight()` | None (read-only, on-demand) |
| **Billing** | `/billing` | (Client-side to Stripe API) | None (read-only) |

---

## 7. Admin Console, Public Site & Billing

### 7.1 Admin Console Overview

The admin console (`app/admin/(console)/**`) is the operator's command center for running the Harbor business—managing the product line, installs pipeline, and founder program. Access requires a bootstrapped admin profile (`role='admin'`), protected by `requireAdmin()` in `lib/auth.ts`.

#### First-Time Setup (`app/admin/setup/`)

The `/admin/setup` route initializes the sole admin account via `SetupForm.tsx` + `actions.ts`:
1. **Environment Guard**: `adminExists()` checks if any admin profile exists. If found, setup closes and redirects to login.
2. **Secret Verification**: form collects `setup_secret` (env `SETUP_SECRET`) + admin email, name, password → `bootstrapAdmin()`.
3. **Authentication**: validates the secret matches `serverEnv.setupSecret`; requires `SUPABASE_SERVICE_ROLE_KEY`; creates auth user via `admin.auth.admin.createUser()` with `email_confirm=true`; trigger `handle_new_user` auto-assigns `role='admin'`.
4. **Success**: returns confirmation; user signs in at `/login?next=/admin`.

Key files: `app/admin/setup/page.tsx`, `SetupForm.tsx`, `actions.ts`.

### 7.2 Dashboard & Metrics

**Route**: `app/admin/(console)/page.tsx`. Displays real-time business metrics and quick-access tiles.

| Metric | Source | Calculation |
|--------|--------|-------------|
| **Total installs** | `customers` where `status='installed'` | Count |
| **One-time revenue** | Installed customers | Sum of `install_fee` |
| **Plus MRR** | `plus_subscriptions` active | $3.99/mo or ($39/12)/mo for annual; only "active"/"trialing"/"past_due" |
| **Waitlist leads** | `waitlist` table | Count |
| **Install pipeline** | `customers` by status | Leads + Scheduled + Installed stacked bar |
| **Founder program** | `customers` where `founder_number IS NOT NULL` | `/15` capped counter + progress bar |

Quick Actions: Build Catalog → `/admin/builds`; Shopping List → `/admin/shopping-list`; Customers → `/admin/customers`.

### 7.3 Build Catalog & Hardware Margins

**Route**: `app/admin/(console)/builds/`. Defines the product line—tablet + accessories combinations with pricing and supply chain.

#### List View (`page.tsx`)
All builds by `sort_order` with columns: Name, Tablet model, Screen size, Hardware cost (sum of non-optional `build_supplies` `unit_cost × quantity` via `hardwareCost()` in `lib/types.ts`), Standard price, Standard margin (price − hardware cost), Founder price, Founder margin, Recommended badge (`is_default`).

#### Create New Build
Inline form at bottom inserts a new `builds` row (prices default to $0); redirects to detail for supply management.

#### Supply Management (`[id]/page.tsx`)
Per-build supplies table: add supply (item, vendor, unit cost, quantity, optional flag, sort order), edit, delete; `build_supplies.url` generates affiliate/tracking links via `amazonLink()`. Helpers: `hardwareCost(supplies)`, `margin(price, supplies)` in `lib/types.ts`.

### 7.4 Shopping List Generator

**Route**: `app/admin/(console)/shopping-list/`. Generates a batch parts list. Workflow: select build (dropdown), set quantity (default 1), toggle optional, generate (GET `?build=<id>&qty=<num>&optional=on/off`). Output table: Item, Vendor, Unit cost, Quantity (`qty × build_supplies.quantity`), Line total, Source (link via `amazonLink()`); grand total. Disclaimer: "Estimates only — confirm live Amazon pricing."

### 7.5 Customers & Provisioning Pipeline

**Route**: `app/admin/(console)/customers/`. Tracks every household install from lead to installed, plus the referral network.

#### Customer List
All `customers` by `created_at DESC`: Name, Status badge (lead/scheduled/installed), Founder badge (1–15), Provisioned badge (`household_id` not null), Plus active badge, Build + email.

#### Add Lead
Form at top (name, email, phone, intended build) creates `customers` with `status='lead'`.

#### Customer Detail (`[id]/page.tsx`)
**1. Record** (left, 2/3): `CustomerForm.tsx` fields (name, email, phone, build dropdown, status, install date, install fee, founder number 1–15 with uniqueness, notes); `updateCustomer()`; displays validation errors.

**2. Provisioning** (right, 1/3):
- **Unprovisioned** (no `household_id`): `ProvisionPanel` form (household name auto-filled `{customer.name}'s Home`). `provisionCustomer()`: (1) invite parent via `admin.auth.admin.inviteUserByEmail()`; (2) create `households` owned by new parent; (3) link `household_id` + status `scheduled`; (4) insert empty `plus_subscriptions` (inactive); (5) generate first device pairing code; (6) return code.
- **Provisioned**: Provisioned + Plus active/inactive badges; pairing codes list (formatted, status badge pending amber / paired green); "New pairing code" button → `generatePairingCodeForHousehold()`.

#### Referrals Section
Referral list (referred name + contact, status dropdown pending → contacted → converted/declined, delete) via `updateReferralStatus()` / `deleteReferral()`; add referral form via `addReferral()`.

#### Danger Zone
**Delete customer**: removes the `customers` row; does NOT delete the provisioned `households` (child data persists on wall).

### 7.6 Founder Tracker

Integrated into dashboard + customer detail. Cap: 15 spots (`FOUNDER_SPOTS` in `lib/types.ts`). Assignment: admin sets `customers.founder_number = 1..15`; uniqueness via RLS constraint + app validation in `updateCustomer()`. Dashboard shows `{count}/15` + progress bar. Founding rate: $249 installed (vs. standard). `nextFounderNumber()` returns next available (1–15) or null if full.

### 7.7 Admin's Own Family Setup

**Route**: `app/admin/(console)/my-family/`. Lets the operator use Harbor for their own family (free, Plus comped).
- **Unprovisioned**: form (family name default "My Family") → `setupMyFamily()`: creates `households` owned by admin; auto-activates Plus (`plus_active=true` + `plus_subscriptions` `status='active'`); seeds 4 calm tools (breathing 4-7-8, feelings, break, social story); generates first pairing code.
- **Provisioned**: Card 1 setup link (`${siteUrl}/kiosk?code={code}` + instructions); Card 2 Walls (paired devices, "generate another setup link" only if no pending code); Card 3 "Manage your family" (link to `/app`).
- **Reset Family** (`ResetFamily.tsx`): calls `reset_household()` RPC (deletes routines, rewards, logs, kids, calm tools; tombstones kids so walls clear; keeps account + pairing codes).

### 7.8 Public Site & Waitlist

#### Landing Page (`app/page.tsx`)
Route `/` (public). Header: Wordmark + Sign in + "Join waitlist". Hero: "Calm on the wall, every single day"; local-first one-payment subheading; "Become a Founding Family" + "See the wall app" (→ `/kiosk`); tagline "One payment. You own it. No required monthly fee. Founding rate · first 15 households · $249 installed"; mockup graphic. Trust strip (offline, one payment, private, kid-proof). Pillars: (1) Routines on the wall; (2) Calm-down corner; (3) Kid-proof lockdown. Local-First Promise (dark hero card): "It works forever — even with the internet unplugged" (WifiOff/Check bullets). FAQ (4 collapsible `<details>`). Founder Offer & Waitlist (`#waitlist`): "$249 installed — half off, for the first 15" + `WaitlistForm`. Footer: Wordmark + copyright.

#### Waitlist Form (`components/marketing/WaitlistForm.tsx`)
Client component using `useActionState()`. Fields: Name (required), Email (required), Town (optional), Number of kids (0–20). Validation (Zod in `lib/actions/waitlist.ts`): name 1–200, email valid/≤320, town ≤200, kids 0–20. `joinWaitlist()` inserts into `waitlist` (anon, no auth); success "You're on the list! We'll reach out as Founding Family spots open."

### 7.9 Billing System

#### Overview
Stripe powers optional recurring subscriptions (Plus), gated by `isStripeConfigured()`. The wall runs free and fully offline; Plus adds cloud backup, remote editing, and insights. Keyless guard (`lib/env.ts`) returns `true` only when `stripeSecretKey && stripePublishableKey && stripePriceMonthly && stripePriceAnnual` are all present; if any is missing, checkout/portal return 503 and the billing page shows "Harbor Plus checkout isn't switched on yet."

#### Pricing
| Plan | Monthly | Annual | Savings |
|------|---------|--------|---------|
| Monthly | $3.99/mo | — | — |
| Annual | — | $39/yr | 18% off |

Price IDs: `serverEnv.stripePriceMonthly`, `serverEnv.stripePriceAnnual`. Plus features: cloud backup of routines and progress; edit from phone and push to wall; gentle insights and trends; content & template library; early access.

#### Checkout Flow
**Route**: `POST /api/stripe/checkout`. `BillingActions` POSTs `{ plan: "monthly" | "annual" }`; on success redirects to `session.url`. Server (`app/api/stripe/checkout/route.ts`): (1) guard `isStripeConfigured()` (503); (2) auth (401); (3) household via `getMyHousehold()` (400); (4) price via `priceIdForPlan()` (400 if unknown); (5) reuse `plus_subscriptions.stripe_customer_id` if present; (6) `stripe.checkout.sessions.create()` with `mode: "subscription"`, `line_items`, `customer`/`customer_email`, `client_reference_id: household.id`, `metadata: { household_id }`, `subscription_data: { metadata: { household_id } }`, `allow_promotion_codes: true`, success/cancel URLs `/app/billing?status=success|cancel`; (7) return `{ url }`.

#### Customer Portal
**Route**: `POST /api/stripe/portal`. Only shown if `isActive=true`. Handler: guard (503); auth (401); household (400); `plus_subscriptions.stripe_customer_id` (400 if none); `stripe.billingPortal.sessions.create({ customer, return_url: /app/billing })`; return `{ url }`. In the portal users can view upcoming invoice, update payment method, cancel, view past invoices.

#### Webhook Handler
**Route**: `POST /api/stripe/webhook`. Events: `checkout.session.completed` (retrieve subscription, then sync), `customer.subscription.created|updated|deleted` (sync). Handler (`route.ts`): read raw body; verify signature via `stripe.webhooks.constructEvent(body, sig, serverEnv.stripeWebhookSecret)` (400 if invalid); route by `event.type`; call `syncSubscription()`; return 500 on error (Stripe retries within 3 days), 200 on success.

#### Subscription Sync
**Function**: `lib/stripe/sync.ts` → `syncSubscription(sub: Stripe.Subscription)`. Flow: extract `household_id` from `sub.metadata.household_id` or query by `stripe_customer_id`; get price → plan via `planForPriceId()`; extract `current_period_end`; **upsert** `plus_subscriptions` (household_id, stripe_customer_id, stripe_subscription_id, status, plan, current_period_end); **update** `households.plus_active` (true if status ∈ ["active","trialing","past_due"], else false).

**Critical guarantee:** canceling Plus only toggles Plus *features* (backup, edit-from-phone, insights, templates). The kiosk's core never reads `plus_active` — routines, rewards, and calm tools run entirely offline (see [Section 4](#4-kiosk--offline-first-engine)).

#### Billing Page (Parent View)
**Route**: `app/app/(parent)/billing/page.tsx`. When configured: pricing table; current status (plan, renewal from `current_period_end`, "Active" badge); feature list; action buttons (`BillingActions.tsx`) — not subscribed → monthly + annual; subscribed → "Manage or cancel"; cancel promise box. When not configured: gray box "Harbor Plus checkout isn't switched on yet. Your wall keeps working free in the meantime." (no buttons).

### 7.10 Data Model & RLS (Operator/Commerce)

| Table | Ownership | RLS Notes |
|-------|-----------|-----------|
| `customers`, `builds`, `build_supplies` | Admin only | Read/write restricted to admin |
| `households` | Owner (parent) | Parent reads own; admin reads all |
| `device_pairings` | Household | Parent reads own; kiosk pairing code is public (single-use) |
| `plus_subscriptions` | Household | Parent reads own; admin reads all |
| `waitlist` | Anon insert | Anyone can insert; no auth |
| `profiles` | Self | User reads own; admin reads all |

Admin provisioning and webhook processing use `createAdminClient()` (service role, bypasses RLS).

### 7.11 Key Interactions Summary

#### Admin Setup to First Install
1. Deploy with `SETUP_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, Stripe keys.
2. `/admin/setup` → enter secret + create first admin.
3. Sign in; dashboard at `/admin`.
4. Create first build + supplies (`/admin/builds`).
5. Add lead (`/admin/customers`).
6. Provision customer → invite parent, create household, mint pairing code.
7. Parent receives email invite, signs up, becomes owner.
8. Parent opens pairing link on the wall (`https://harbor.com/kiosk?code=1234-5678-9012`).
9. Wall pairs, asks parent to set PIN, household `paired`.
10. Parent builds routines, adds kids, configures rewards.
11. Admin marks `installed` + collects `install_fee`.
12. Parent opts into Plus on `/app/billing` → Stripe checkout.
13. Webhook syncs → `plus_subscriptions.status='active'` + `households.plus_active=true`.

#### Canceling Plus (No Wall Breakage)
1. Parent clicks "Manage or cancel" → Stripe portal → cancels.
2. Stripe sends `customer.subscription.deleted`.
3. App syncs `status='canceled'` + `plus_active=false`.
4. Wall notices `plus_active=false` on next cloud check; disables cloud backup, remote editing, insights.
5. **Wall does not break**: routines, rewards, calm tools, pairing — all still work from local storage. Re-activate any time.

### 7.12 Security & Safeguards

| Concern | Mitigation |
|---------|-----------|
| **Admin bootstrap** | Exact `SETUP_SECRET` match + `SUPABASE_SERVICE_ROLE_KEY`; setup route closes once admin exists |
| **Founder spot uniqueness** | DB constraint `UNIQUE(founder_number)` + app validation |
| **Pairing code security** | Single-use, re-generated as needed; public token but household owns the device |
| **Stripe webhook replay** | Signature verification via `constructEvent()` |
| **Billing guard** | `isStripeConfigured()` returns false if any key missing; routes 503 |
| **Plus-gated features** | Kiosk core never reads `plus_active`; only UI features check the flag |
| **Admin-only pages** | `requireAdmin()` on all `/admin/**`; redirect to login if not admin |
| **Parent invitation email** | Supabase Auth email verification (requires SMTP configured) |

### 7.13 Observations & Gaps

- **Inventory tracking** (`/admin/inventory/`): exists as a route; tracks spare parts / installation stock (not fully fleshed out).
- **Referral incentives**: tracking present but no automatic reward/commission logic.
- **Plus feature flags**: cloud backup, edit-from-phone, insights are documented; implementation lives in kiosk + parent app.

---

## 8. AI Companion Subsystem

The AI Companion augments Harbor with Claude Haiku-powered features across meal planning, family insights, chore suggestions, daily screensaver briefs, per-child profiles for offline encouragement, and the "Hey Harbor" voice interface. The system implements a **bring-your-own-key (BYOK) model**—households supply their own Anthropic API key—ensuring Harbor never charges for AI and never holds custody of API credentials server-side longer than needed.

### 8.1 Architecture & Security Invariant

#### Key Custody
- **Never on the wall device.** The kiosk is fully offline-first; it never sees or stores the API key.
- **Server-side only.** The key (`ai_config.anthropic_api_key`) is stored in Supabase under `public.ai_config` (RLS-protected, readable/writable only by the household owner via `household_is_mine()`).
- **Not sent to the client.** The parent web app (`app/app/(parent)/settings/page.tsx`) reads only a boolean (key is set) and displays `•••••••••••`; it never re-exposes the raw key.
- **Server actions & APIs use it.** All AI calls occur in server actions (`lib/ai/anthropic.ts` helpers, `app/api/ai/*` routes, `lib/ai/*.ts`) which instantiate Anthropic clients with the key server-side and return only results.

Rationale: even if a household grants an untrusted parent account read access to the kiosk snapshot, the key is not included — `kiosk_snapshot` excludes `ai_config` by design.

#### Cost Control
- **Haiku only.** All AI calls use `claude-haiku-4-5-20251001`.
- **Small `max_tokens` caps.** Free-text (briefs) 150–320; structured JSON (meal plans, chores, profiles) 600–1200; calm-corner plans 500, reports 320.
- **Ephemeral prompt caching.** System prompts marked `cache_control: { type: "ephemeral" }` in `haikuJson()` and `haikuText()` reuse the cached system prompt at 10% of prompt token cost within ~5 minutes.
- **Forced tool use (JSON calls).** The schema is the sole tool; Haiku must call it via `tool_choice: { type: "tool", name: toolName }`, preventing preamble waste.
- **One call per feature, per request.** No loops or retries; each feature makes a single Anthropic call.

### 8.2 Core Helpers (`lib/ai/anthropic.ts`)

```typescript
export const HAIKU = "claude-haiku-4-5-20251001";
export type HouseholdAi = { key: string; enabled: boolean };
export async function getHouseholdAi(householdId: string): Promise<HouseholdAi | null>
```
`getHouseholdAi` reads the `ai_config` row; returns `{ key, enabled }` or `null` if no key/disabled. Always used server-side to gate AI features.

```typescript
export async function haikuJson<T>({
  key, system, prompt, toolName, schema, maxTokens? = 1024
}): Promise<T>   // forced tool use; returns the parsed `input` of the tool call
export async function haikuText({
  key, system, prompt, maxTokens? = 200
}): Promise<string>   // free-text; concatenated .text blocks, trimmed; ephemeral caching
export function aiErrorMessage(e: unknown): string
```
`aiErrorMessage` maps status codes to friendly copy: 401 → "That Anthropic API key was rejected. Double-check it in Settings."; 429 → "Anthropic is rate-limiting right now — try again in a moment."; 529 → "Anthropic is busy right now — try again shortly."; default → "The AI couldn't finish that just now. Please try again."

### 8.3 Meal Planning (`lib/ai/mealPlan.ts`)

**Action:** `planDinners()` in `app/app/(parent)/hub-actions.ts` (server action) and `/api/ai/command` (voice).

**Flow:** user clicks "Generate dinners with AI" (`GenerateMealsButton`) or says "Hey Harbor, plan dinners" → `planDinners(supabase, household_id, anthropic_key)`:
- Queries the next 7 days (UTC); identifies which dinners are already planned (open days fed to Haiku).
- Fetches children's names and the pantry list (`list_kind = 'pantry'`).
- Builds a system prompt (pantry-first if non-empty, else generic kid-friendly).
- Calls `haikuJson()` with schema `{ meals: [{ date, title, emoji, uses, needs }] }`.
- Validates: filters by open dates, dedups by date, caps to 4 per date.
- Inserts meals (notes e.g. "Uses olive oil, spinach · Need milk, pasta"); dedups against existing grocery/pantry; adds new items to grocery (≤30).
- Returns `{ added, groceryAdded, usedPantry, error? }`.

System prompt example: *"You are a warm, practical family meal planner who cooks from what's on hand. Suggest simple, varied, kid-friendly dinners that PRIMARILY use the family's pantry/on-hand ingredients, adding only a few common extras."* Cost ~400–500 in / ~200 out. Edge cases: all 7 days planned → `{ added: 0 }` (not failure); malformed → filtered, error if none remain; grocery insert error → returns error. The wall reads meals from the `meals` table (does not call this directly).

### 8.4 Screensaver Daily Brief (`app/api/ai/brief/route.ts`)

**Endpoint:** `POST /api/ai/brief` (device-initiated). Flow: kiosk idles → screensaver → POSTs `{ device_secret, date, tzOffsetMinutes }`. Server: validates `device_secret` against `device_pairings` (must be `paired`); looks up household; fetches today's meals; **atomically claims today's brief slot** in `ai_briefs` via `upsert(..., ignoreDuplicates: true)` (if claim succeeds, generate; else return existing); fetches children + today's events (timezone-corrected via `tzOffsetMinutes`); calls `haikuText()`:
*"You are Harbor, a warm, upbeat family wall assistant. Write a short daily brief (max 40 words, 1–2 sentences) for a family's wall display. Be encouraging and concrete. Do NOT start with a greeting like 'Good morning'."*
Returns `{ brief: string | null, meals: [...], note? }`.

**Cost control:** once per household per day (atomic claim — even multiple kiosks/retries call Haiku at most once). Timezone-correct window prevents a 2nd brief after midnight UTC. **Invalidation:** `invalidateBriefs(household_id)` deletes cached briefs after adding/deleting events (so a deleted event doesn't linger).

### 8.5 Family Insights (`hub-actions.ts` → `generateInsight()`)

UI: `AiInsightCard` (Insights page). Flow: fetch children IDs; query last 14 days of completed tasks (`reward_log` `delta > 0`) and check-ins (feeling + timestamp); build per-child narrative (task count, top 3 feelings); `haikuText()`:
*"You are Harbor, a warm, supportive family insights assistant. From two weeks of data, write 3–4 short sentences: what's going well, any gentle rhythm/pattern, and 1–2 concrete kind suggestions."*
Returns `{ ok, text?, error? }`. Cost ~150 in / ~320 out. Known limitation: only sees task counts and feeling names (no deeper triggers or profile weaving yet).

### 8.6 Age-Aware Chore Suggestions (`hub-actions.ts` → `suggestChores()`)

UI: `SuggestChoresButton` (child detail). Flow: fetch child birthday + existing chores; calculate age (leap-year correct); `haikuJson()`:
*"You suggest age-appropriate household chores for kids. Each chore: a short title, one fitting emoji icon, and a fair star value 2–15 based on effort."*
Prompt includes name, age, existing chores (avoid duplication). Schema `{ chores: [{ title, icon, points }] }`; dedups (case-insensitive), inserts up to 6. Returns `{ ok, added?, error? }`. Haiku naturally scales complexity by age; output validated (points 0–50, titles ≤60 chars). Cost ~300 in / ~200 out.

### 8.7 Per-Child AI Profile (`hub-actions.ts` → `buildChildProfile()`)

UI: `AiProfileCard` (child detail). Flow: parent optionally writes a note ("Loves dinosaurs, struggles with transitions, motivated by soccer") → "Build profile with AI" → fetch birthday + last 30 days (check-ins, completed tasks, routines, chores) → `haikuJson()`:
*"You build a brief, warm profile of a child to help a family wall app personalize encouragement. interests = things they likely enjoy. motivators = what helps them follow through (e.g. 'clear steps', 'a visual timer', 'specific praise'). encouragement = 5 short, warm, kid-facing cheer lines (max ~12 words each), second person, varied — the kind a caring grown-up would say."*
Schema:
```json
{ "summary": "short paragraph", "interests": ["string"], "motivators": ["string"], "encouragement": ["string"] }
```
Sanitizes lengths (summary ≤400, interests 8 max, motivators 6 max, encouragement 6 max, each ≤120). Upserts into `children.ai_profile` (JSONB) with `updated_at` + the parent note.

**Wall integration (offline encouragement):** `children` (with `ai_profile`) rides the `kiosk_snapshot()`. On task complete/check-in, the wall shows a random line from `profile.encouragement` (e.g. "You've got this, Mia!") with no AI call — free at use time. Cost ~500 in / ~300 out.

### 8.8 Calm Corner Plan & Report (`lib/ai/corner.ts`)

Triggered by `startCorner()` and `generateCornerReport()` (hub-actions). Wall display: `CornerTimer`.

#### Calm Corner Plan (`buildCornerPlan()`)
When a parent starts a corner: fetch child name, age, `ai_profile.interests`; count recent corners (last 30 days); `haikuJson()`:
*"You are a warm, experienced child-development coach helping a family run a brief, supportive 'calm corner' reset — NOT a punishment. Ground everything in gentle, evidence-based practice: co-regulation, naming feelings, calming the body first, then a small repair and a fresh start. Be specific and kind. Never shame, label, threaten, or diagnose. Use language simple enough for the child's age. No markdown."*
Schema:
```json
{ "steps": ["string"], "reminder": "string", "encouragement": "string" }
```
`sanitizeCornerPlan()` caps shape (4 steps max, 120 chars each; reminder/encouragement ≤200). If AI disabled or call fails, falls back to `DEFAULT_CORNER_PLAN` (still kind). Stored in `corners.plan`. The wall reads steps/reminder/encouragement aloud once (if `readAloud`); after the timer ends, "All done 💚" + encouragement.

#### Calm Corner Report (`buildCornerReport()`)
After a corner ends, the parent can generate a reflection: fetch corner details + profile; query the last 8 corners (excluding this one) for patterns; `haikuText()` with `COACH_SYSTEM` and a prompt that names gentle patterns (time of day, trigger, feeling), suggests ONE concrete thing to try next time, and ONE way to reconnect now. Returns a private reflection (≤1000 chars) for the parent app. Cost: plan ~250, report ~300. Safety: length limits prevent UI overflow; the system prompt is evidence-based and explicitly forbids shaming/labeling/diagnosing.

### 8.9 Hey Harbor Voice Commands (`app/api/ai/command/route.ts`)

**Endpoint:** `POST /api/ai/command` (device-initiated). Trigger: child says "Hey Harbor". Flow: kiosk transcribes (Web Speech API) and POSTs `{ device_secret, text }` → server validates `device_secret` and AI config (enabled, key set); rejects text > 500 chars ("That was a bit long — try a shorter request."); fetches context (children id/name, today's meals, today's chores respecting day-of-week + rotation, completed chores). Calls Haiku with **4 whitelisted tools**:
- `reply` — answer or small talk. DEFAULT for any query or anything uncertain.
- `add_to_grocery` — add items (ONLY if explicitly "add X to the list").
- `add_chore` — create a chore for a named child (ONLY if explicitly asked).
- `plan_dinners` — call `planDinners()` server-side (ONLY if explicitly asked).

System prompt emphasizes "DEFAULT to reply() — use it for ANY question or anything you're unsure about." Haiku picks one tool via `tool_choice: { type: "auto" }`; server executes (if action) and returns a spoken reply.

**Examples:** "What's for dinner?" → `reply` "Spaghetti and meatballs."; "Add milk and eggs to the list" → `add_to_grocery`; "Create a chore for Leo: take out trash, worth 10 stars" → `add_chore`; "Plan this week's dinners" → `plan_dinners`. Cost ~250 in / ~100 out. Safety: whitelist only (no arbitrary functions); non-destructive inserts only (no deletions/role changes); household-scoped via `device_secret`. Accuracy limitation: Haiku sometimes misreads intent ("add pizza" parsed as grocery when "plan pizza dinners" meant) — mitigated by "DEFAULT to reply()"; future work: confidence score or explicit confirmation.

### 8.10 Configuration & Onboarding

**File:** `app/app/(parent)/settings/page.tsx` + `saveAiConfig()`. Setup: Settings → AI Companion → toggle "Enable the AI companion" (default off) + "Anthropic API key" field → create key at `console.anthropic.com` → paste `sk-ant-…` → enable → "Save AI settings". `saveAiConfig()` upserts `ai_config`: if `clear_key` checked, nulls the key; if a new key provided, uses it; if blank, keeps the existing key (toggling enabled doesn't require re-pasting); `onConflict: "household_id"`. Key security: raw key never returned; settings page reads only a "key is set" boolean; all calls use the key server-side only.

### 8.11 Data Model (AI tables)

```sql
-- ai_config
household_id uuid PRIMARY KEY REFERENCES households(id)
anthropic_api_key text  -- nullable, RLS-protected, never in snapshot
enabled boolean NOT NULL DEFAULT false
updated_at timestamptz NOT NULL DEFAULT now()
-- RLS: household_is_mine() for all ops. Never in kiosk_snapshot().

-- ai_briefs
household_id uuid NOT NULL REFERENCES households(id)
date date NOT NULL
brief text NOT NULL
created_at timestamptz NOT NULL DEFAULT now()
PRIMARY KEY (household_id, date)
-- Generated once/household/day. Read via /api/ai/brief (device-secret validated).
```

`children.ai_profile` (JSONB): `{ summary, interests[], motivators[], encouragement[], note|null, updated_at }` — synced to kiosk; offline encouragement; no secrets. `corners.plan` (JSONB): `{ steps[], reminder, encouragement }` — generated per corner start; shown on the wall.

### 8.12 Prompt Templates & System Prompts

All system prompts are warm and age-appropriate, cacheable (stored as-is with `cache_control: { type: "ephemeral" }`), and short (most under 150 tokens). Examples: meal planner ("You are a warm, practical family meal planner…"); chore suggester ("You suggest age-appropriate household chores…"); calm corner coach ("You are a warm, experienced child-development coach…"); insights assistant ("You are Harbor, a warm, supportive family insights assistant…"); brief writer ("You are Harbor, a warm, upbeat family wall assistant…").

### 8.13 Cost Practices Summary

| Feature | Model | Max Tokens | Caching | Frequency | Est. Cost |
|---------|-------|-----------|---------|-----------|-----------|
| Meal planning | Haiku | 1200 | System (ephemeral) | On-demand | ~300 tokens/call |
| Daily brief | Haiku | 150 | System (ephemeral) | Once/household/day | ~150 tokens/day |
| Chore suggestions | Haiku | 600 | System (ephemeral) | On-demand | ~250 tokens/call |
| Family insights | Haiku | 320 | System (ephemeral) | On-demand | ~250 tokens/call |
| Child profile | Haiku | 800 | System (ephemeral) | On-demand | ~400 tokens/call |
| Calm corner plan | Haiku | 500 | System (ephemeral) | Per corner start | ~250 tokens/call |
| Calm corner report | Haiku | 320 | System (ephemeral) | On-demand | ~300 tokens/call |
| Voice command (action) | Haiku | 400 | System (ephemeral) | Per request | ~200 tokens/call |
| Voice command (query) | Haiku | 400 | System (ephemeral) | Per request | ~100 tokens/call |

Example household monthly: ~14K tokens (~USD 0.70 at current Haiku pricing); with ~50% system prompt reuse, an effective ~20% reduction.

### 8.14 Known Limitations & Future Work

- **Hey Harbor Q&A accuracy:** the `reply` tool occasionally conflates a question with an action. Mitigation: "DEFAULT to reply()". Future: confidence score or explicit confirmation before mutations.
- **Limited pattern detection in insights:** `generateInsight()` summarizes counts/feelings but doesn't correlate with time of day, triggers, or profiles/motivators. Future: enrich with `corners` history, routine adherence, profiles.
- **No real-time feedback loop:** corners generate a static plan at start; daily briefs are cached for the day (events added after don't appear). Future: WebSocket/polling updates (cost-limited).
- **Manual key rotation:** parents must update the key in Settings; no expiry warnings or auto re-prompt. Future: background job to detect auth failures + a "test API key" button.

### 8.15 Testing & Observability

**Manual testing checklist:** (1) Settings — save/toggle/clear key; (2) Meal planning — with/without pantry, verify dedup; (3) Chore suggestions — different ages, no dupes; (4) Insights — over 2 weeks of varied data; (5) Child profile — verify encouragement on the wall; (6) Calm corner — start, plan displayed, end + report; (7) Voice — "what's for dinner?", "add milk to the list", "plan dinners". **Error monitoring:** failed calls caught and mapped via `aiErrorMessage()`; rate limits (429, 529) → friendly retry prompts. **No telemetry:** Harbor does not log token usage or model versions; parents manage their own Anthropic dashboard.

---

## 9. Design System, Brand & Accessibility

### Brand Palette & Color Tokens

Harbor uses a calibrated dual-palette system: a sophisticated light theme for the parent app and a premium dark theme (inspired by Linear/Skylight) for the kiosk wall display.

**Light Theme (Parent App & Default)** — all brand colors in `app/globals.css` via `@theme`:

| Token | Value | Usage |
|-------|-------|-------|
| `--color-harbor` | `#0c3b47` | Primary action, deep teal base for text and interactive elements |
| `--color-water` | `#18606f` | Mid-tone accent for secondary elements and hover states |
| `--color-beacon` | `#f6b23d` | Golden accent—rewards, positive feedback, rare alerts (sparingly) |
| `--color-seafoam` | `#cfe6e1` | Soft surface tint |
| `--color-seafog` | `#edf3f3` | Cool off-white background (root `--background`) |
| `--color-ink` | `#0f2a33` | Primary body text (root `--foreground`) |
| `--color-muted` | `#5c7178` | Secondary text, labels, hints |

**Tints & Surfaces:** `--color-harbor-50` `#f1f6f7`; `--color-harbor-100` `#dceaed`; `--color-harbor-700` `#134752`; `--color-harbor-900` `#0c3b47`; `--color-beacon-soft` `#fde9c6`; `--color-surface-sunken` `#f4f8f8`.

**Shadows (harbor-ink tinted, not neutral black):**

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-card` | `0 1px 2px rgba(12,59,71,.04), 0 4px 12px -4px rgba(12,59,71,.08)` | Rest cards/panels |
| `--shadow-card-hover` | `0 2px 4px rgba(12,59,71,.06), 0 12px 28px -8px rgba(12,59,71,.16)` | Interactive card hover |
| `--shadow-pop` | `0 8px 16px -4px rgba(12,59,71,.1), 0 24px 48px -12px rgba(12,59,71,.22)` | Modals/overlays |
| `--shadow-button` | `0 1px 2px rgba(12,59,71,.18), 0 2px 8px -2px rgba(24,96,111,.35)` | Buttons |

### Kiosk Dark Theme (The Wall)

The kiosk shell renders as `<div className="kiosk-root">`, applying a premium dark palette. All kiosk-bound UI uses tokens below; the light app theme does NOT leak to the wall.

| Token | Value | Purpose |
|-------|-------|---------|
| `--color-kbg` | `#0c1014` | App background |
| `--color-kbg2` | `#0a0e12` | Deepest layer (headers, nav, overlays) |
| `--color-kpanel` | `#161b22` | Cards, surfaces (primary in `KCard`) |
| `--color-kraise` | `#1c232c` | Elevated / hover state |
| `--color-kline` | `#2a323c` | Hairline borders (used at `/55`) |
| `--color-kline-soft` | `#1b212a` | Internal subtle hairlines |
| `--color-ktext` | `#eef2f6` | Primary text |
| `--color-kmute` | `#8a94a0` | Secondary text |
| `--color-kwater` | `#3cbcd9` | Accent (refined water blue for dark) |
| `--shadow-k` | `0 1px 2px rgba(0,0,0,.3), 0 8px 24px -16px rgba(0,0,0,.6)` | Dark card elevation |
| `--shadow-k-pop` | `0 16px 48px -16px rgba(0,0,0,.7)` | Max elevation (modals) |

```css
.kiosk-root { color-scheme: dark; background: var(--color-kbg); color: var(--color-ktext); }
```
Applies dark `color-scheme` so native UI (scrollbars, pickers) render dark; scrollbars styled with `--color-kline` thumb.

### Typography System

Fonts via `app/layout.tsx` using `next/font/google`:

| Font | CSS Variable | Weights | Usage |
|------|--------------|---------|-------|
| Bricolage Grotesque | `--font-bricolage` | 600, 700, 800 | Display headings, titles, accent text |
| DM Sans | `--font-dm-sans` | 400, 500, 600, 700 | Body, labels, UI text |

`h1`–`h4`, `.font-display` use `--font-display` (Bricolage); all other text inherits `--font-sans` (DM Sans).

**Type Ramp:** `.text-eyebrow` (0.6875rem, uppercase, 0.06em, 700); `.text-display` (clamp(1.75rem, 1.2rem + 2vw, 2.25rem), 800, -0.025em); `.text-display-sm` (1.375rem, 800, -0.02em); `.text-title` (1.0625rem, 700, -0.01em). Display fonts use tighter letter-spacing (≤ -0.02em); tracking loosens only in body text.

**Radii:** `--radius-xl` `1rem` (most cards/buttons); `--radius-2xl` `1.5rem` (larger cards, modals, hero).

### Shared UI Primitives (Light App)

All primitives in `components/ui/primitives.tsx`, inheriting light theme tokens.

- **Button** (`variant: primary|secondary|beacon|ghost|danger`, `size: sm|md|lg`): primary teal gradient (`#16586a`→`#0c3b47`) white text; secondary white bg + harbor border; beacon golden gradient (`#f8bf57`→`#f2a92f`) harbor text; ghost transparent harbor text; danger white bg + red border. Sizes sm (px-3 py-1.5), md (px-4 py-2.5), lg (px-6 py-3). All: `rounded-xl font-semibold transition-all duration-150 active:translate-y-px active:scale-[0.99]`, disabled opacity 60%.
- **Card** (`interactive?`): `rounded-2xl border border-harbor-100 bg-white p-5 shadow-card`; interactive → hover `-translate-y-0.5`, `shadow-card-hover`, border `water/40`.
- **Field/Input/Textarea/Select:** `w-full rounded-xl border border-harbor-100 bg-white px-3.5 py-2.5 text-ink outline-none transition placeholder:text-muted/60 focus:border-water focus:ring-4 focus:ring-water/15 hover:border-harbor-200`; Textarea `min-h-24`.
- **Badge** (`tone: neutral|beacon|green|blue|amber|red|gray`): `rounded-full px-2.5 py-0.5 text-xs font-semibold`.
- **Switch:** pure CSS toggle (44px, rounded-full, harbor-100 → water when checked; thumb `translate-x-5`); peer-checked/peer-focus-visible rings; submits as checkbox.
- **Stat** (`label, value, hint?, accent?`): big display text; accent → beacon-soft/40 bg + beacon/40 border.
- **SectionHeader** (`eyebrow?, action?`): flex header with eyebrow, title (text-title harbor), right action slot.
- **Skeleton:** `bg-harbor-100` with shimmer sweep (1.6s); respects reduced-motion.

### Kiosk UI Primitives (Dark Theme) — `components/kiosk/ui.tsx`

- **KCard:** `rounded-xl bg-kpanel ring-1 ring-kline/55 shadow-k`.
- **KEyebrow:** `text-xs font-bold uppercase tracking-[0.16em] text-kmute`.
- **KPill** (`tone: default|water|beacon|good|warn|danger`): `rounded-full px-3 py-1 text-sm font-semibold` with semi-transparent bg + ring (e.g. good = emerald-400/15 bg, emerald-300 text, emerald-400/30 ring).
- **KButton** (`variant: primary|beacon|tonal|ghost|danger`, `size: sm|md|lg`): base `inline-flex items-center select-none font-medium transition active:scale-[0.98]`, focus ring `ring-2 ring-kwater/70 ring-offset-2 ring-offset-kbg`. Sizes sm (h-10 rounded-lg px-3.5), md (h-12 rounded-xl px-5), lg (h-14 rounded-xl px-6). Variants: primary (kwater bg, harbor text), beacon (beacon bg, harbor text), tonal (kraise bg, ktext, kline/55 ring — default for nav), ghost (transparent, kmute), danger (red-500/15 bg, red-300 text).
- **KIconButton:** square (sm h-10 w-10, md h-12 w-12, lg h-14 w-14); requires `aria-label`.
- **KTabBar** (`items, current, onSelect`): fixed bottom nav `fixed inset-x-0 bottom-0 z-30 border-t border-kline/50 bg-kbg2/90 backdrop-blur-md`; per-tab flex-equal rounded-xl py-2; active bg-kraise + text-kwater + top dot; badge (top-right, bg-beacon, "99+" if >99).
- **KTopBar:** sticky `sticky top-0 border-b border-kline/50 bg-kbg2/90 backdrop-blur-md`; back button (KButton tonal sm) + title (text-lg font-bold display) + right slot.

### Touch & Accessibility (Kiosk)

**Touch Targets:**
```css
.kiosk-tap { min-height: 44px; touch-action: manipulation; user-select: none;
  -webkit-user-select: none; -webkit-tap-highlight-color: transparent; }
.kiosk-tap-xl { min-height: 88px; /* same flags */ }
```
`.kiosk-tap` on all standard interactive elements (never on parent chrome); `.kiosk-tap-xl` for big primary actions (task completion). `touch-action: manipulation` prevents double-tap zoom delays.

**Focus Visibility (global):**
```css
:where(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: 3px solid var(--color-beacon); outline-offset: 2px;
  box-shadow: 0 0 0 5px rgba(15, 42, 51, 0.45); border-radius: 4px;
}
```
Dual-layer ring (golden beacon + dark ink halo) works on both light and dark surfaces. Kiosk KButton overrides with a water-accent ring.

**Reduced Motion (global):**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important; animation-delay: 0ms !important;
    animation-iteration-count: 1 !important; transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}
```
Every animation collapses to near-instant. The kiosk also reads per-child `settings.reducedMotion` to conditionally skip confetti, animate-reward, animate-pop.

### Animation Catalog

All keyframes in `app/globals.css`; every animation respects the global reduced-motion rule.

| Animation | Duration | Easing | Behavior | Usage |
|-----------|----------|--------|----------|-------|
| `fade-rise` / `.animate-enter` | 320ms | `cubic-bezier(.22,1,.36,1)` | opacity 0→1, translateY 10px→0 | Page/view entry |
| `pop-in` / `.animate-pop` | 420ms | `cubic-bezier(.22,1,.36,1)` | scale 0.85→1.04→1, opacity 0→1 | Celebratory entry (modals, completion) |
| `reward-pop` / `.animate-reward` | 600ms | `cubic-bezier(.22,1,.36,1)` | scale 0.6→1.15→1, opacity 0→1 | Reward claim, big positive moments |
| `beacon-pulse` / `.animate-beacon` | 4s | ease-in-out infinite | opacity 0.45↔0.85, scale 1.0↔1.06 | Logo glow, hero accents, "now" markers |
| `k-stagger` / `.k-stagger > *` | 460ms | `cubic-bezier(.22,1,.36,1)` | each child fades+rises; delays increment 30/50ms | Dashboard cards cascade |
| `k-float` / `.k-float` | 6s | ease-in-out infinite | translateY 0→-4px→0 | Gentle hover float |
| `k-glow` / `.k-glow` | 3.4s | ease-in-out infinite | box-shadow pulse (kwater/12) | "Active now" items, live markers |
| `panel-flip-in` / `.animate-panel` | 720ms | `cubic-bezier(.22,1,.36,1)` | 3D rotateY 28→0, scale 0.97→1, translateY 10px→0 | Screensaver card entry |
| `ambient-drift` / `.animate-drift` | 26s | ease-in-out infinite | translate3d + scale(1.06) drift | Screensaver background depth |
| `confetti-fly` / `.confetti-bit` | 750–1400ms (random) | `cubic-bezier(.16,.84,.34,1)` | translate, rotate (CSS vars), scale 1→0.5, opacity 1→0 | Task completion burst |
| `float-up` / `.animate-floatup` | 1100ms | `cubic-bezier(.22,1,.36,1)` | opacity 0→1→0, translateY 8px→-46px, scale 0.8→1.1→1 | "+N points" bubble |
| `bubble-life` / `.animate-bubble` | 3.2s | ease-in-out | 3D scale, rotate-3d; opacity 0→1→0, floats up 70px | Minigame floating tappables |
| `shimmer` / `.skeleton::after` | 1.6s infinite | — | translateX -100%→+100% sweep | Loading skeleton |

**k-stagger delays:** child 1 → 30ms, 2 → 80ms, 3 → 130ms, 4 → 180ms, 5 → 230ms, 6 → 280ms, 7 → 330ms, 8+ → 370ms.

**Beacon Glow Motifs:**
```css
.beacon-glow { box-shadow: 0 0 0 0 rgba(246,178,61,.35), 0 18px 50px -20px rgba(12,59,71,.45); }
.beacon-ring { background: radial-gradient(circle at center, rgba(246,178,61,.28) 0%, rgba(246,178,61,0) 70%); }
```

### Kiosk Ambient Effects

```css
.kiosk-ambient {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background:
    radial-gradient(55% 45% at 80% 6%, rgba(60,188,217,.1), transparent 70%),
    radial-gradient(50% 45% at 10% 96%, rgba(246,178,61,.06), transparent 72%);
}
```
A calm fixed ambient glow behind the entire wall (upper-right kwater 10%, lower-left beacon 6%). Used in HomeView behind the `.k-stagger` content layer (`z-index: 0`, below main content).

### Responsiveness & Wall-to-Tablet Scaling

Harbor is wall-first (fixed, high-res, always-on), then scales down for tablets and handheld parents. Tailwind v4 (`@tailwindcss/postcss`) with default breakpoints; tokens in `app/globals.css` via `@theme` (not `tailwind.config.ts`). Patterns: light app uses `max-w-` containers; responsive text via `clamp()`; responsive padding (`sm:px-6`); grids (`sm:grid-cols-2`); modals (sm: centered, mobile: bottom sheet). Kiosk specifics: dark theme never responds to width; KTabBar fixed bottom on all sizes; KTopBar always sticky; HomeView k-stagger cascade width-independent.

### Visual Hierarchy & Depth

**Elevation via shadows:** light app — rest `shadow-card`, hover `shadow-card-hover`, modal `shadow-pop`; dark kiosk — rest `shadow-k`, pop `shadow-k-pop`. **Surface tiers:** primary `bg-white`/`bg-kpanel`; raised/hover `bg-harbor-50`/`bg-kraise`; deepest `bg-seafog`/`bg-kbg2`; sunken `bg-surface-sunken`. **Color contrast:** light ink on white meets WCAG AAA; dark ktext (#eef2f6) on kpanel (#161b22) ~15:1 (AAA); focus states use beacon + ink halo for bi-theme visibility.

### Interactive States

- **Buttons:** active `translate-y-px scale-[0.98]`; disabled `opacity-60 pointer-events-none`; hover variant-specific brightness/bg.
- **Form fields:** focus `border-water ring-4 ring-water/15`; hover `border-harbor-200`.
- **Cards (interactive):** hover `-translate-y-0.5 shadow-card-hover border-water/40`.
- **Switch:** unchecked `bg-harbor-100`; checked `bg-water` + thumb `translate-x-5`; focus `ring-4 ring-water/25`.

### Confetti & Reward Particles (`components/kiosk/Confetti.tsx`)

Generates 26–64 `<span>` particles with inline CSS variables: `cx`/`cy` (angle-based offsets, biased upward), `cr` (±420° rotation), `cd` (750–1400ms duration), `delay` (0–90ms), `size` 6–14px, `bg` (one of `#f6b23d, #3cbcd9, #4cc09a, #e8755a, #9b8cff, #fff`), `round` (circle vs square). Mounted keyed on task completion; respects `prefers-reduced-motion`; each particle animates via `.confetti-bit`.

### Login & Default Theme

```css
:root { --background: var(--color-seafog); --foreground: var(--color-ink); }
```
Inherited by `<body>` and parent app pages. Kiosk overrides with `.kiosk-root`. `app/layout.tsx` sets viewport `themeColor: "#0C3B47"` (harbor primary) for browser chrome / mobile status bar.

### Summary: Design Tokens & Conventions

| Aspect | Light App | Dark Kiosk |
|--------|-----------|-----------|
| **Primary Surface** | white | `bg-kpanel` (#161b22) |
| **Primary Text** | `text-ink` (#0f2a33) | `text-ktext` (#eef2f6) |
| **Primary Action** | `bg-harbor` gradient | `bg-kwater` (#3cbcd9) |
| **Accent** | `text-beacon` (#f6b23d) | `text-beacon` (same) |
| **Secondary Text** | `text-muted` (#5c7178) | `text-kmute` (#8a94a0) |
| **Borders** | `border-harbor-100` | `ring-1 ring-kline/55` |
| **Shadows** | harbor-tinted | black-based |
| **Root Background** | `--color-seafog` | `--color-kbg` |
| **Focus Ring** | beacon outline + ink halo | kwater ring (kiosk override) |
| **Min Touch Height** | 44px (inputs) | `.kiosk-tap` 44px, `.kiosk-tap-xl` 88px |

All values are documented in `app/globals.css` (the single source of truth for color and typography tokens).

---

## 10. Behavior, Rewards & Motivation Systems

Harbor shapes child behavior and parent-child dynamics through five interlocking systems: a **points-based reward economy**, **chore fairness mechanics**, a **supportive discipline ladder**, **dopamine-friendly feedback**, and **design philosophy rooted in cooperation rather than competition**.

### Points Economy: Earning, Storing, Resetting, and Spending

#### Data Model
The points system lives in two core tables (`supabase/migrations/0001_enums_and_core.sql`):
- **`rewards`**: one row per child, stores `points_total` (integer, ≥0). Created on first completion; updated via RPC.
- **`reward_log`**: append-only ledger. Columns: `child_id`, `delta` (+earned / -spent), `reason` ('step','chore','reset', or custom reward label), `step_id`, `chore_id`, `store_item_id` (nullable), `client_op_id` (idempotent dedup key for offline syncs).

#### Earning Points (On the Wall)
**From routine steps:** child taps a step with `reward_points > 0`. (1) Offline: a `completion` mutation is recorded locally (useKiosk outbox). (2) Visual feedback: confetti (24 particles, 750–1400ms), a `+N` floating reward badge (`animate-reward`), chime + haptic. (3) Audio: a random cheer spoken aloud (if read-aloud). (4) On sync: `rpc_kiosk_push()` inserts a `reward_log` row (`reason='step'`) and updates `rewards.points_total += reward_points`.

**From chores:** child checks off a chore. Same flow, `reason='chore'` and `chore_id` recorded. If `requires_approval`, the kiosk first gates behind a parent PIN (read from `household.parent_pin_hash`, SHA256 on-device in `ParentGate.tsx`, no network). **Rotation fairness:** `rotation_member_ids` determines the week's assignee via `choreAssignee()` in `lib/kiosk/chores.ts`; the RPC (migration `0025_chore_rotation_push.sql`) accepts completions from any rotation member or the anchor `child_id`, crediting the completing child.

**Bonus points (server-minted):** parents add notes to the wall with `bonus_points` (in `wall_messages`, migration `0009_family_command_center.sql`). These are read-only on the wall; bonus is a parent-facing way to plan incentives (and applied immediately server-side when a parent posts a message to a specific child, per Section 6).

#### Spending Points (The Reward Store)
The reward store (`StoreView.tsx`) displays `store_items` (`label`, `emoji`, `cost_points`, `kind`: reward/screen_time/allowance/goal). A child taps "Get it" if affordable: (1) offline `redemption` mutation queued; (2) celebration (chime, haptic `[20,40,20]`, "You got it!" + `animate-pop`); (3) on sync the RPC inserts `reward_log` (`reason=label`) and `points_total -= cost`. **Goals** (`kind='goal'`) are not buyable—milestones to chase; the "get it" button vanishes when `points >= cost_points`.

#### Pause & Reset
**During a grounding:** if active and `pause_rewards = true`, the store shows "The store is taking a short break" and disables purchases (`lib/kiosk/grounding.ts`, `activeGroundingFor()`). **Parent reset:** parent enters PIN, taps "Reset all stars" → `rpc_kiosk_reset_points()` (`0026_kiosk_reset_points.sql`) writes a balancing `reward_log` row (`reason='reset'`, `delta=-points_total`), zeroing each child's `points_total` (ledger stays truthful; history preserved).

### Chore Fairness & Verification

#### Assignment & Rotation
Each chore has `child_id` (anchor), `rotation_member_ids` (nullable; ≥2 members → weekly rotation via `weekIndex()` in `lib/kiosk/chores.ts`, computing weeks since a fixed Monday epoch 1970-01-05 and selecting `rotation_member_ids[weekIndex % live_count]`, skipping deleted children), `days_of_week` (0–6), and `requires_approval`. The parent view shows "🔄 Rotates between the kids each week" + a "Needs a grown-up's OK" toggle.

#### Crediting the Current Assignee
On completion: (1) wall validation — `choreAssignee()` displays the chore only for the current week's assignee (muted otherwise); (2) server validation (`0025`) — the RPC validates the completing child is the anchor `child_id` OR in `rotation_member_ids`, inserting `reward_log` with the completing child as `child_id`. This decouples display from eligibility (a child earns only if legitimately assigned this week).

#### The PIN Gate
For high-stakes chores, completing on the wall demands a parent PIN. Flow: `ParentGate.tsx` modal → offline PIN check (SHA256 hash compared to `parent_pin_hash` from the snapshot) → chore marked done + points awarded. No network needed. Prevents children claiming credit for tasks they didn't do.

### Discipline: Groundings v2 & the Consequence Ladder

#### Groundings: Reset Days
A grounding (`0014_groundings.sql`, `KioskGrounding` type) is a multi-day structured pause. Columns: `child_id`, `household_id`, `started_on`, `ends_on` (inclusive dates), `reason`, `note`, `pause_rewards`, `pause_screen_time` (displayed but not yet enforced), `privileges_lost` (JSON array, `0022_grounding_privileges.sql`, e.g. `["No TV","No tablet time","No video games"]`), `status` (active | ended).

**On the wall** (`ChildView.tsx`): a seedling 🌱 card "On a reset · Day N of M", real-time day countdown, `privileges_lost` as amber badges, "Last day — finish strong! 💪" on the final day. The child can still earn routine completion, but the **store is locked** if `pause_rewards`.

**Parent control** (`GroundingCard.tsx`): create (start/end dates, reason, pause flags, privileges), edit end date (shorten/extend "You earned a day back"), end early.

#### House Rules & the Consequence Ladder
House rules (`0023_house_rules.sql`) are household-scoped with two kinds: `kind='rule'` (expectations like "Be kind with words and hands") and `kind='consequence'` (a numbered ladder: "Step 1: Reminder", "Step 2: Loss of privilege", "Step 3: Reset day", "Step 4: Family meeting"). Displayed right on the wall (`HouseRules.tsx`) as a shared calm reference. The ladder is predictable and not shame-based — a structure for learning.

### Discipline: Calm Corner (Supportive Timeout)

The Calm Corner (`0029_corners.sql`) is a co-regulated timeout that tracks patterns. Columns: `child_id`, `household_id`, `reason` (parent), `feeling` (child), `duration_minutes` (1–60), `started_at`, `status` (active | done | ended), `plan` (JSON `{ steps?, reminder?, encouragement? }`), `report` (AI reflection for parent).

**On the wall** (`CornerTimer.tsx`, active while `started_at + duration_minutes > now()`): visual timer; the plan (step-by-step strategies like "Take 3 deep breaths", "Name one thing you see", "Remember: It's okay to feel big feelings"); supportive encouragement ("You're learning how to calm your body. That's hard and brave work."). **After:** an optional check-in ("How are you feeling now?" → `check_ins`) and an AI reflection that identifies triggers/rhythms ("Tough moments tend to happen around 3pm—maybe a snack helps"). Philosophy: never shaming; framed as co-regulation; the AI reflection helps the family understand the child, not label them.

### Dopamine Mechanics: Delightful Feedback

Harbor layers sensory rewards to create intrinsic motivation without being manipulative.

#### Visual Celebration
- **Confetti** (`Confetti.tsx`): 24–64 colored particles (yellow, teal, green, orange, purple, white) explode from center; random angle, distance (0.35–1.0 × spread), rotation (±420°), duration 750–1400ms, staggered 0–90ms; respects `prefers-reduced-motion`.
- **Progress ring** (`ChildView.tsx`): smooth colored bar grows as steps complete; ≥60% → "almost there!" nudge.
- **+N float**: a beacon circle with earned points pops and scales for 1.3s (`animate-reward`).
- **Big celebration**: on a full routine — full-screen overlay with the child's avatar (or 🎉), "You did it, [name]!" + "[routine name] complete", sparkle ring, up to 64 confetti, current star total in a glowing badge, tap to dismiss.

#### Audio & Haptic
- **Chime**: two synth notes (523.25 Hz → 783.99 Hz, ~350ms), Web Audio (no audio file).
- **Cheer**: random from `["Awesome","Way to go","You did it","Nice work","So proud of you","Great job","You're amazing","Boom","High five","Superstar"]` spoken aloud (if read-aloud).
- **Haptics**: step/chore 20ms; routine done 60ms; store redemption `[20,40,20]`. Each gated by per-child `haptics`.

#### Star Catch Minigame (`MiniGame.tsx`)
A once-per-day reward: after a child finishes all routines + chores, a button appears ("🎮 You finished everything — tap for Play Time!"). 35-second capped game; floating emoji treats spawn every 600ms; child taps to pop; sound & haptics on each pop. **No real points** — pure dopamine, can't be farmed. Persisted as "played today" in localStorage via `todayKey()` (resets at midnight). The 35-second cap keeps it a celebration, not a grind.

#### Personalized Encouragement
AI-generated affirmations (`KioskChildProfile.encouragement[]`): parent or AI writes 1–3 lines per child; on wall open a random line is spoken (`speak("Hi [name]! [affirmation]", readAloud)`), rotating daily via `new Date().getDate() % lines.length`.

### Design Philosophy: Cooperative, Not Competitive

Harbor deliberately avoids leaderboards, rankings, and comparison.

- **No leaderboard:** no public star count, no "winner", no "who has the most?" Each child sees only their own points. Prevents resentment, learned helplessness, and rivalry over chores.
- **Family teamwork framing:** rotating chores ("the family needs this done, and this week it's your turn"); chores as fairness ("everyone takes turns"); grounding & corner ("we're helping you learn, together").
- **The kiosk as neutral, kind:** never shames (no "you failed", no sad faces, no "X days missed"). Groundings are "resets". The Calm Corner is co-regulation.

### Integration: How Systems Reinforce Each Other

1. **Steps → Points → Store**: complete a step, hear encouragement, see confetti, earn points, spend them on meaningful chosen rewards.
2. **Chores + Fairness**: rotating chores ensure equitable opportunities; the PIN gate protects honesty.
3. **Grounding + Pause**: a reset pauses the store but doesn't erase history; the child can still do routines; earning resumes immediately after the grounding ends.
4. **Corner + AI**: a timeout is a reset moment; the AI report helps parents adjust routines/timing to prevent future escalations.
5. **Personalization**: each child has their own color, encouragement, theme, and accessibility settings — the wall speaks to *them*.

### Architecture: Offline-First, Bonus-Only-Server

- **Points are earned on-device** via local mutations (completions, chore_dones, redemptions).
- **On sync**, mutations are pushed to the RPC, which validates and writes `reward_log` + updates `rewards`.
- **No double-spend**: `client_op_id` deduplicates (`on conflict (client_op_id) do nothing`).
- **Bonus points** in wall messages are parent-authored server-side.
- **Pause/reset** happens server-side (parent RPC) and flows back in the next snapshot.

This keeps the wall always responsive (even offline) and ensures grounding pauses and resets are enforced by the server's authority, not the device.

---

## 11. Known Gaps, Tech Debt & Improvement Opportunities

### Explicitly Deferred & Unbuilt Features

#### "Hey Harbor" Conversational Brain Upgrade
The current voice-command system (`/app/api/ai/command/route.ts`) is deliberately constrained: Haiku picks from a whitelist of safe actions (reply, add-to-grocery, add-chore, plan-dinners, or default reply for Q&A). **Gap:** no multi-turn conversation, context retention across sessions, learning from corrections, or adaptive responses. A conversational brain would require persistent session state, semantic understanding of household goals, and higher token budgets. The Anthropic key is BYO and gated behind `/app/settings`; when absent or disabled all features gracefully degrade — intentional, but means advanced AI cannot be a core promise.

#### Streaks & Achievement Gamification ("🔥 N days")
Harbor tracks point totals and daily completion checkmarks but does not persist streaks or days-since-milestone metrics. The minigame (`MiniGame.tsx`) is a one-off celebration, not a persisted achievement engine. **Gap:** no "N-day streak" counter or streak-breaking notifications. Infrastructure exists (`progress: Record<string, DayProgress>`), but the schema doesn't store historical streaks. Adding this requires a `streaks` table, midnight streak logic, and per-child badges.

#### Visual "What Should I Do Now?" Time-Block Schedule Clock
The kiosk displays the current routine but has no visual clock tying it to wall-clock hours, nor predictive "Next up in 5 minutes". The `NowNext` component reads the routine but not its `start_time`/`duration_min`. **Gap:** no hourly grid overlay, color-coded "it's time" vs "waiting", or countdown to next scheduled activity — valuable for pre-readers and kids with time-blindness.

#### AI Teaching & Learning Mode
The calm-corner system (`/lib/ai/corner.ts`) generates one-time plans and reflections. **Gap:** no longitudinal analysis of what calming strategies work, what time a child struggles, or what repairs are most effective. A learning mode would track corner outcomes, surface patterns (time/trigger/duration/effectiveness), suggest proactive strategies, and recommend prevention tactics.

### Known Constraints & Architectural Watchers

#### PWA Service-Worker Stale-Bundle Gotcha + Auto-Update Mitigation
The service worker (`/public/sw.js`) caches the shell + `/_next` chunks (stale-while-revalidate for assets, network-first for navigations). The page posts loaded chunks via `CACHE_ASSETS` (`RegisterSW.tsx`); `controllerchange` triggers a reload (60-second anti-loop guard). **Constraint:** shipping new `/_next` chunks without redeploying the kiosk can serve a stale bundle. Mitigations: periodic SW update check (every 30 min + on visibility), aggressive asset re-caching, boot-time full sync. **Watch:** an always-on wall that never reloads (idle screensaver suppresses activity) won't pick up a deploy. **Improvement:** periodic forced reloads at low-activity hours (e.g. 3am) or on server heartbeat changes.

#### AI Features Gated on Bring-Your-Own Key
All AI features require a valid Anthropic key in settings; without it, every AI feature silently degrades (briefs fail silently, voice returns a friendly message, meal planning unavailable). **Constraint:** intentional (keeps the product lean, offline-first) but creates an uneven experience. **Implication:** making AI a "must have" would require charging for API costs, a server-side keyed system, or an on-device LLM.

#### Stripe Integration Is "Activation Deferred"
The Stripe integration syncs subscription status into `plus_subscriptions` and `households.plus_active`; checkout and customer portal are wired. **Constraint:** activation is voluntary — disable by not setting `STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY`. The product boots and runs fully without Stripe. **Watch:** `plus_active` gates the sync layer (`/lib/kiosk/sync.ts` only syncs if Plus active); a lapsed subscription flips `plus_active=false` on the next webhook and the kiosk degrades to local-only with no grace period or cached-status fallback.

#### Sync Delta vs Full-Reconcile Staleness Windows
Two sync modes: delta (`syncNow()`, cheap, every 30 seconds; merges via tombstones) and full (`syncNow(true)`, replaces arrays, self-heals; at boot and every ~13 minutes). **Constraint:** between delta syncs a child deleted on the server can still appear on the wall until the next full sync; a removed chore can linger up to 30 seconds; an expired message lingers until the next reconcile. **Mitigation:** client-side expiry filtering (`expires_at` in `HomeView`) + the 13-minute full reconcile. For critical removals (child deleted) there's a window of up to 13 minutes. **Improvement:** event-driven sync or more frequent full syncs on specific triggers.

#### Always-On Wall & Midnight Rollover Edge Case
"Today" is a date string (`todayKey()` in `/lib/kiosk/db.ts`); routines reset on date change; the wall re-renders every minute. **Constraint:** a wall powered on exactly at midnight briefly sees both days' progress; a routine in progress at midnight shifts "today" to "yesterday" (taps preserved in IndexedDB but invisible). **Mitigation:** day-change detection re-renders and resets the UI; old progress is never deleted. **Watch:** if offline at midnight, the server has no record of the old date's progress (client-only); a full sync after midnight fixes this with a brief window.

#### LocalStorage-Based Minigame "Played Once Per Day" Is Per-Device
The minigame is gated by `localStorage.getItem('harbor-game-${childId}') === todayKey()`. **Constraint:** each device has its own flag (a child can play on the bedroom tablet and again on the wall; clearing localStorage replays). Intentional for offline-first (the kiosk never submits "game played"). **Mitigation:** the game awards zero real points (no advantage); the parent PIN gates devtools access. **Improvement:** server-side idempotency on the next sync (low value — trust-based).

#### Corner Staleness Until Full Reconcile
A calm corner shows on the wall while active. If a parent marks it complete in the app, the server updates instantly but the wall won't know until the next sync pull. **Mitigation:** last-write-wins; if the parent completes first, the next sync closes it; if the child completes first, the outbox mutation syncs and the parent sees it. **Risk:** minimal — slightly jittery UX if a parent-initiated completion takes > 30 seconds to appear.

### Testing & Observability Gaps

#### No Automated Test Suite
No Jest, Vitest, or integration tests; all validation has been manual (Q1–Q7 cycles). No unit tests for sync logic, state merging, or mutation handling; no integration tests for AI/corner/meal planning; no E2E tests for the kiosk flow; no RPC edge-case tests. **Impact:** regressions in sync, state corruption, or timing bugs surface only via manual QA or user reports. **Opportunity:** start with snapshot tests of core kiosk state mutations, then E2E tests for critical flows; aim for 70%+ coverage of the sync layer.

#### No Error Logging or Observability Outside Sentry
Errors are caught and logged to console or returned as friendly messages, but there's no centralized error tracking (no Sentry/LogRocket/custom telemetry). Production errors are invisible unless reported. **Improvement:** add Sentry; instrument the sync layer, AI calls, and IDB operations. Budget ~$100–500/mo.

#### No Performance Monitoring
No monitoring of initial kiosk load, sync latency/success, AI generation time, or interaction latencies. A slow network or hanging IDB op could silently degrade the wall. **Improvement:** Web Vitals + custom metric reporting (Vercel Analytics, Datadog, or Sentry Metrics).

### Prioritized High-Leverage Improvement Opportunities

1. **Idempotent server-side event dedup for offline mutations** (Medium effort, high reliability): add `op_id` as a unique constraint on reward_log and related tables; have the RPC return successfully recorded op_ids for safe cleanup. ~1–2h. Eliminates accidental double-scoring.
2. **Streak tracking & daily motivation display** (Medium, high engagement): `streaks(child_id, activity_type, current_count, started_on)`; midnight check (>80% completion → increment/reset); "🔥 N-day streak" badge. ~8–10h.
3. **Server-side observability & error telemetry** (Low effort, high visibility): integrate Sentry; instrument AI/sync/IDB errors. ~3–4h, ~$50–100/mo.
4. **Periodic forced reload for always-on walls** (Low, high reliability): in `RegisterSW.tsx` trigger a reload between 2–4am if last reload > 24h. ~2–3h. Guarantees deploys ship within 24h.
5. **Full testing suite (unit + integration)** (High, foundational): Vitest; start with `lib/kiosk/sync.test.ts`, `app/api/ai/command.test.ts`, `components/kiosk/ChildView.test.tsx`. ~40–60h.
6. **Event-driven sync for critical state changes** (High, game-changing): lightweight event queue via Supabase Realtime broadcasting a "sync now" signal on critical mutations. ~20–30h. Sub-second propagation.
7. **Time-block schedule clock UI** (Medium, high UX value): a 6am–8pm grid with routine blocks, a moving "now" indicator, countdown to next item (tie to `KioskStep.start_time`). ~12–16h.
8. **Conversational multi-turn AI** (Very high effort, big feature): `ai_conversations` table, last-5-exchange context, conversational read-only queries (no mutations). ~30–40h, ~2× AI spend.
9. **Intelligent pattern detection for calm corners (learning mode)** (Medium–high, therapeutic): after 10+ corners, weekly async analysis grouping by time/trigger/duration/feeling; pattern report + one proactive intervention. ~24–32h, ~1–2¢/analysis.
10. **Extend AI to parent app (quick setup)** (High, strong direction): a questionnaire (ages, rhythm, pain points) → Haiku-generated starter routine, chores, store, meal week. ~20–28h. Lowers barrier for new families.

### Summary of Tech Debt by Category

| Category | Item | Severity | Effort | Priority |
|----------|------|----------|--------|----------|
| **Deferred Features** | Conversational brain; streaks; time-block clock; learning mode | Medium–High | 20–40h each | Product roadmap decision |
| **Architecture** | PWA stale-bundle gap; delta-sync staleness; always-on wall deploy lag | Low–Medium | 2–4h each | Fix in next sprint |
| **Reliability** | No idempotency on mutations; no observability; untested sync layer | High | 3–60h | Start observability now; testing roadmap |
| **UX** | No time-awareness; minigame siloed; AI invisible to parent app | Medium | 12–30h each | Plan for next quarter |
| **Operations** | No error telemetry; no performance monitoring; no deploy visibility | Medium | 3–8h | Implement this cycle |

### Explicit Non-Goals (By Design)

The following are intentional constraints, not bugs:
1. **No cloud-first design.** The wall is offline-first; cloud is optional (Plus) — keeps cost low and privacy tight.
2. **No real-time collaborative editing.** Multiple parents can edit a household, but changes are eventually-consistent (next sync) — acceptable for low-frequency edits.
3. **No voice identity.** The voice engine picks the same tool for all children; no child-specific voice.
4. **No app-store distribution.** The kiosk is a PWA, not an iOS/Android app — simplifies deployment but caps discoverability.
5. **No admin-side automation.** The admin console is for founder-program operations, not template libraries or auto-scaling.

---

## 12. Appendix — Key File Map

### Routing & Middleware
- `proxy.ts` — middleware entry (Next.js 16 convention); refreshes session, enforces route guards.
- `lib/supabase/middleware.ts` — session refresh + role gating (admin/app/kiosk/public).
- `app/layout.tsx` — root layout (fonts, metadata, `themeColor: #0C3B47`).
- `app/globals.css` — single source of truth for design tokens (`@theme`), animation keyframes, accessibility rules.

### Supabase Clients & Auth
- `lib/supabase/client.ts` — browser client (anon key).
- `lib/supabase/server.ts` — request-scoped server client (RLS applies).
- `lib/supabase/admin.ts` — service-role client (bypasses RLS; bootstrap, invites, webhooks).
- `lib/auth.ts` — `getProfile`, `requireAdmin`, `requireUser`.
- `lib/household.ts` — `getMyHousehold`, `plusActive`.
- `lib/env.ts` — env access + guards (`isStripeConfigured`, `hasServiceRole`).
- `lib/types.ts` — convenience aliases + helpers (`hardwareCost`, `margin`, `FOUNDER_SPOTS`, `nextFounderNumber`, `amazonLink`).
- `lib/database.types.ts` — generated from the live schema.

### Database & Migrations (`supabase/`)
- `migrations/0001_enums_and_core.sql` — profiles, households, children, routines, steps, rewards, reward_log, enums.
- `migrations/0002_operator_tables.sql` — builds, build_supplies, customers, referrals, device_pairings, pairing enums.
- `migrations/0003_functions_triggers.sql` — `is_admin`, `household_is_mine`, `child_is_mine`, `routine_is_mine`, `set_updated_at`, `handle_new_user`.
- `migrations/0004_rls.sql` — RLS policies for all tables.
- `migrations/0005_kiosk_rpcs.sql` — `rpc_kiosk_pair`, `rpc_kiosk_pull`, `rpc_kiosk_push` (initial).
- `migrations/0007_advisor_fixes.sql` — RLS subquery perf wrapping.
- `migrations/0008_snapshot_pin.sql` — parent PIN + `kiosk_snapshot`.
- `migrations/0009_family_command_center.sql` — chores, calm_tools, events, store_items, list_items, wall_messages, reminders, house concepts.
- `migrations/0010_kiosk_push_hardening.sql` — hardened `rpc_kiosk_push` (server-defined points, idempotency, scope).
- `migrations/0011_colors_meals_countdowns.sql` — color identity, meals, countdown events.
- `migrations/0012_hard_delete_child.sql` — `hard_delete_child` + final `kiosk_snapshot` (snapshot revoke from client roles).
- `migrations/0013_reset_household.sql` — `reset_household` admin helper.
- `migrations/0014_groundings.sql`, `0016_grounding_one_active.sql`, `0022_grounding_privileges.sql` — groundings + constraints + privileges.
- `migrations/0015_child_birthday.sql`, `0017_child_photo.sql` — birthday, photo URL + `child-photos` bucket.
- `migrations/0019_ai_config.sql` (ai_config), `ai_briefs`, `0023_house_rules.sql`, `0025_chore_rotation_push.sql`, `0026_kiosk_reset_points.sql`, `0029_corners.sql`.
- `supabase/SECURITY_NOTES.md` — explains expected `get_advisors` warnings.

### Kiosk Engine (`lib/kiosk/` + `components/kiosk/`)
- `lib/kiosk/db.ts` — IndexedDB wrapper (`loadState`, `persistState`, `clearState`, `hashPin`, `todayKey`).
- `lib/kiosk/types.ts` — `KioskState`, `KioskSnapshot`, `Mutation`, `DayProgress`, entity types.
- `lib/kiosk/sync.ts` — `mergeById`, `applyPull`, `buildPayload`, `pairDevice`, `syncNow`.
- `lib/kiosk/{chores,grounding,calendar,colors,birthday,weather,feedback}.ts` — domain helpers (`choreAssignee`, `weekIndex`, `activeGroundingFor`).
- `components/kiosk/useKiosk.ts` — main hook (boot, sync orchestration, child actions, PIN/pairing).
- `components/kiosk/{KioskApp,KioskShell,ChildView,HomeView,CalendarView,StoreView,ListsView,ChoresBoard,CalmCorner,CornerTimer,HouseRules,NowNext,BedtimeCountdown,Screensaver,ParentGate,PairingScreen,PinSetup,VoiceButton,Confetti,MiniGame,TransitionTimer,RegisterSW,ui}.tsx`.
- `public/sw.js`, `public/manifest.webmanifest`, `public/icons/` — PWA shell.

### Parent App (`app/app/(parent)/`)
- `layout.tsx`, `page.tsx` (dashboard), `actions.ts` + `hub-actions.ts` (server actions).
- Routes: `children/`, `children/[id]/`, `calendar/`, `lists/`, `pantry/`, `meals/`, `messages/`, `rules/`, `history/`, `insights/`, `store/`, `settings/`, `billing/`.
- Components: `GroundingCard`, `CornerCard`, `AiProfileCard`, `AiInsightCard`, `SuggestChoresButton`, `GenerateMealsButton`, `ChildPhotoField`, `BillingActions`.
- `components/ui/{primitives,SubmitButton,ConfirmSubmit}.tsx`.

### Admin & Public
- `app/admin/setup/` — bootstrap (`SetupForm.tsx`, `actions.ts`, `bootstrapAdmin`, `adminExists`).
- `app/admin/(console)/` — `page.tsx` (dashboard), `customers/`, `customers/[id]/` (`CustomerForm`, `ProvisionPanel`), `builds/`, `builds/[id]/`, `inventory/`, `shopping-list/`, `my-family/` (`ResetFamily`).
- `app/page.tsx` — landing page; `components/marketing/{WaitlistForm,KioskMockup}.tsx`; `lib/actions/waitlist.ts` (`joinWaitlist`).

### Stripe & AI
- `lib/stripe/server.ts` (client factory, `priceIdForPlan`, `planForPriceId`), `lib/stripe/sync.ts` (`syncSubscription`).
- `app/api/stripe/{checkout,portal,webhook}/route.ts`.
- `lib/ai/anthropic.ts` (`HAIKU`, `getHouseholdAi`, `haikuJson`, `haikuText`, `aiErrorMessage`), `lib/ai/mealPlan.ts` (`planDinners`), `lib/ai/corner.ts` (`buildCornerPlan`, `buildCornerReport`, `sanitizeCornerPlan`, `DEFAULT_CORNER_PLAN`).
- `app/api/ai/{brief,command}/route.ts`.

### Project Docs
- `AGENTS.md` — architecture notes for agents; `CLAUDE.md` — points to AGENTS.md; `supabase/SECURITY_NOTES.md` — advisor posture.
