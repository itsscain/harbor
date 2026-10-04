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
behind the server or a subscription. Sync (push/pull) is **free for every paired
device** (phone → wall editing is core, decided 2026-10); offline, the wall keeps
working from IndexedDB. Plus is extras only (insights, content, built-in AI later).
AI helpers are hidden behind `FEATURES.ai` in `lib/features.ts` until built-in AI ships.

## Key pieces
- **Supabase** (`lib/supabase/{server,client,admin,middleware}.ts`). RLS on every
  table; helpers `is_admin()` / `*_is_mine()` are `SECURITY DEFINER`. Kids never
  log in — the kiosk uses anon `SECURITY DEFINER` RPCs (`rpc_kiosk_pair/pull/push`)
  that validate a `device_secret`. See `supabase/migrations/` and `supabase/SECURITY_NOTES.md`.
- **Kiosk** (`components/kiosk/*`, `lib/kiosk/*`): `useKiosk` hook over an IndexedDB
  store (`lib/kiosk/db.ts`), sync engine (`lib/kiosk/sync.ts`), service worker
  (`public/sw.js`) + manifest. Parent PIN hashed locally (and adoptable from the
  account via the snapshot).
- **Harbor Learn** (`FEATURES.learn`): a child's second wall screen (the "My Day | Learn" switch
  in `ChildView`, `components/kiosk/learn/ModeSwitch.tsx`). Content is code, bundled for offline:
  `lib/learn/{reading,code,math}.ts` → `curriculum.ts` (lesson ids `read.*`/`code.*`/`math.*`,
  `courseMap`/`nextLessonFor`), phonics in `sounds.ts` (IPA per sound) + `words.ts`, code puzzles
  in `codeSim.ts`. Kid UI: `LearnApp` → `LearnHome`/`SubjectMap`/`LessonPlayer`/`LessonDone`/
  `StickerBook`, activities in `components/kiosk/learn/acts/*` (bright `.learn-root` theme +
  `l-*` animations in `globals.css`). Results sync through **`rpc_learn_sync`** (separate from the
  core push/pull; `learnOutbox`/`learn` in `KioskState`, `finishLesson` in `useKiosk`), which
  records results, marks assignments done and awards a few store stars. Parent side: the kid
  page's Learn tab (`KidLearnView`, `KidLearnParts`, `children/learn-actions.ts`,
  `lib/learn/parent.ts`); alerts via the `learn_notify` trigger → `/api/cron/notify-learn`
  ("learning" category). Every spoken line is a pre-recorded clip in `public/learn-voice`:
  after changing lesson content or `lib/learn/script.ts`, run `node scripts/gen-learn-voice.mjs`
  (local Kokoro from node_modules — no download) and commit the clips + `index.json`.
  Preview: `/dev/learn` (`?lesson=<id>` jumps into a lesson).
- **Stripe** (`lib/stripe/*`, `app/api/stripe/*`): guarded by `isStripeConfigured()`
  so the app runs keyless. Webhook → `plus_subscriptions` + `households.plus_active`.
- **Types**: `lib/database.types.ts` is generated from the live schema (Supabase MCP
  `generate_typescript_types`); convenience aliases in `lib/types.ts`.

## Conventions
- Server Components fetch with the request-scoped client (RLS applies). Mutations are
  Server Actions in `actions.ts` files, bound with `.bind(null, id)`.
- Shared UI in `components/ui/primitives.tsx`. Brand tokens in `app/globals.css`
  (`@theme`): `harbor`, `water`, `beacon`, `seafoam`, `seafog`, `ink`, `muted`.
- Parent app (`/app`) is dark by default: use the semantic tokens (`bg-bg/surface/surface-2`,
  `border-line`, `text-fg/fg-muted`, `accent`). Hand-written CSS must use the runtime `--c-*`
  vars — Tailwind's `@theme inline` never emits `--color-*` as CSS variables.
- Parent-app forms use `ActionForm` (`components/ui/ActionForm.tsx`): it calls the action, shows
  the real outcome in a toast, and never wipes the page. Actions **return**
  `{ ok: false, error: "plain words" }` for expected problems (thrown messages are hidden in
  production). Add/edit flows open a `Sheet`; pick values with `ChipGroup`/`ChildChips`,
  `Stepper`, `DayPicker`, `TimeList`, `EmojiPicker`, `ColorPicker`, `DateChips`/`TimeChips`
  (all in `components/ui`). One-tap buttons use `useQuickAction` (toast + Undo + optimistic).
- Each `/app` area keeps its result-returning actions next to its page
  (`children/kid-actions.ts`, `plan/plan-actions.ts`, `medication/med-actions.ts`,
  `devices/device-actions.ts`, `settings/settings-actions.ts`, `quick-actions.ts` for Today and
  the "+"), and its view model in `lib/` (`today.ts`, `kid.ts`, `plan.ts`, `meds.ts`) computed in
  the family time zone with the wall's own helpers (`lib/kiosk/schedule.ts`, `calendar.ts`).
  Deletes are soft so the toast can offer Undo.
- `/app` is auth-gated, so check UI with the dev-only mock pages (`/dev/today`, `/dev/kid`,
  `/dev/plan`, `/dev/settings`, `/dev/ui`, `/dev/learn` — they 404 in production).
- Run `get_advisors` after schema changes; keep `npm run build` clean.
