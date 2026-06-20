<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

Notes for this repo: **Next.js 16** (App Router, Turbopack, React 19). Request APIs
are async (`await cookies()`, `params`/`searchParams` are Promises). The
middleware convention is **`proxy.ts`** (not `middleware.ts`).
<!-- END:nextjs-agent-rules -->

# Harbor — architecture for agents

Harbor is a wall-tablet family command center. One Next.js app, four surfaces:

- `/` — public marketing + Founding Family waitlist (anon insert to `waitlist`).
- `/kiosk` — the product. **Local-first PWA**, kiosk-locked, works fully offline.
- `/app` — parent companion (auth: `parent`).
- `/admin/(console)` — operator HQ (auth: `admin`); `/admin/setup` bootstraps the admin.

## Non-negotiable
The kiosk's daily core runs **local-first from IndexedDB** and must never be gated
behind the server or a subscription. Sync (push/pull) is Plus-only and additive;
canceling Plus degrades to local-only, never to a broken device.

## Key pieces
- **Supabase** (`lib/supabase/{server,client,admin,middleware}.ts`). RLS on every
  table; helpers `is_admin()` / `*_is_mine()` are `SECURITY DEFINER`. Kids never
  log in — the kiosk uses anon `SECURITY DEFINER` RPCs (`rpc_kiosk_pair/pull/push`)
  that validate a `device_secret`. See `supabase/migrations/` and `supabase/SECURITY_NOTES.md`.
- **Kiosk** (`components/kiosk/*`, `lib/kiosk/*`): `useKiosk` hook over an IndexedDB
  store (`lib/kiosk/db.ts`), sync engine (`lib/kiosk/sync.ts`), service worker
  (`public/sw.js`) + manifest. Parent PIN hashed locally (and adoptable from the
  account via the snapshot).
- **Stripe** (`lib/stripe/*`, `app/api/stripe/*`): guarded by `isStripeConfigured()`
  so the app runs keyless. Webhook → `plus_subscriptions` + `households.plus_active`.
- **Types**: `lib/database.types.ts` is generated from the live schema (Supabase MCP
  `generate_typescript_types`); convenience aliases in `lib/types.ts`.

## Conventions
- Server Components fetch with the request-scoped client (RLS applies). Mutations are
  Server Actions in `actions.ts` files, bound with `.bind(null, id)`.
- Shared UI in `components/ui/primitives.tsx`. Brand tokens in `app/globals.css`
  (`@theme`): `harbor`, `water`, `beacon`, `seafoam`, `seafog`, `ink`, `muted`.
- Run `get_advisors` after schema changes; keep `npm run build` clean.
