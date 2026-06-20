# Harbor

A family command center on a wall-mounted tablet — visual routines, a calm-down
corner kids control, and kid-proof lockdown — for chaotic and neurodivergent
households. **One payment, you own it, no required monthly fee.**

One Next.js app, four surfaces:

| Route | Who | What |
|---|---|---|
| `/` | public | Marketing + Founding Family waitlist |
| `/kiosk` | the wall | **Local-first PWA**, kiosk-locked, fully offline |
| `/app` | parents | Manage children/routines, calm tools, insights, billing |
| `/admin` | operator | Build catalog, sourcing, customers/installs, founder program, provisioning |

## Stack
Next.js 16 (App Router, React 19, Turbopack) · TypeScript · Tailwind v4 ·
Supabase (Postgres + Auth + RLS) · Stripe (optional Plus) · IndexedDB + service
worker for the offline kiosk.

## Local development
```bash
npm install
cp .env.example .env.local   # fill in the values below
npm run dev                  # http://localhost:3000
```

### Environment (`.env.local`)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — required.
- `SUPABASE_SERVICE_ROLE_KEY` — required for `/admin/setup`, parent invites, and
  the Stripe webhook (Dashboard → Project Settings → API).
- `ADMIN_EMAIL`, `ADMIN_TEMP_PASSWORD`, `SETUP_SECRET` — admin bootstrap.
- `STRIPE_*` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — optional; blank = Plus off,
  app still runs. See [docs/STRIPE_SETUP.md](docs/STRIPE_SETUP.md).
- `NEXT_PUBLIC_SITE_URL` — base URL for redirects.

## Database
Migrations live in [`supabase/migrations/`](supabase/migrations) and are applied via
the Supabase MCP. Regenerate types after schema changes (Supabase MCP
`generate_typescript_types` → `lib/database.types.ts`). RLS notes:
[`supabase/SECURITY_NOTES.md`](supabase/SECURITY_NOTES.md).

## First-run setup
1. Set env (incl. `SUPABASE_SERVICE_ROLE_KEY` and `SETUP_SECRET`).
2. Visit `/admin/setup`, enter the setup secret + your email/password. The first
   account becomes `admin`; the page then closes itself.
3. In Admin, add a customer → **Provision** to create the household, invite the
   parent, and mint a pairing code.
4. On the wall tablet, open `/kiosk`, enter the pairing code, set a parent PIN.

## How the offline kiosk works
The kiosk treats **IndexedDB on the device as the source of truth**. Daily use
(routines, tap-to-complete, points, calm corner) needs no network. Pairing is the
only step that requires the internet, once. When online **and** Plus is active, the
kiosk syncs to Supabase for backup and to receive routine edits pushed from the
parent app. Canceling Plus only disables those extras — the wall keeps working.

## Build & deploy
```bash
npm run build
```
Deploy on Vercel; set the same env vars in the Vercel project. The Supabase project
and (optional) Stripe webhook point at the deployed URL.
