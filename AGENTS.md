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
  in `ChildView`, `components/kiosk/learn/ModeSwitch.tsx`). Six courses, Pre-K–5th, all code
  bundled for offline: `lib/learn/{reading,math,code,science,manners,faith}.ts` (worlds of numbered
  levels, ids `read.*`/`math.*`/`code.*`/`sci.*`/`char.*`/`faith.*`; generated from topic defs with the
  seeded helpers in `gen.ts`) → `curriculum.ts` (`courseMap` = voyage map with pass gating ≥1★,
  `startUnitIndex` places a child a grade below theirs, `lessonsForGrade` for parents,
  `practiceLesson`/`spiralItems` = the "double back" review, `mixedPractice` = Brain Boost, an
  interleaved review of what's due across subjects). **Lighthouse** (`faith`) is on for every child
  by default (`DEFAULT_SUBJECTS`, the `learn_profiles.subjects` default and migration 0078; a parent
  can switch it off per child, and assigning a level switches its subject back on): KJV memory verses
  with kid meanings in `bible.ts` (vanishing-cue ladder `verseLadder`; skill `f:verse:<id>`),
  scene-by-scene Bible stories with tap/find/collect actions in `stories.ts` (`f:story:<id>`),
  hero cards in `heroes.ts`. Character content (rewind consequences + trust bridge, Truth
  Detective cases, repair-kit slots, reflections) is built by the shared factories in
  `behavior.ts` (Captain's Code uses `h:`, Lighthouse `f:`, Science `s:`, Code Lab `c:`). **Discovery**
  (`science`, on by default): content banks per grade band in `lib/learn/sci/{little,middle,big}.ts`,
  assembled with hands-on labs in `science.ts` (`LabSpec` in `types.ts`: float · magnet · circuit =
  predict → test → explain over `LabThing` banks; states · plant · shadow · ramp = small sims;
  UI `components/kiosk/learn/science/LabAct.tsx`). Every item carries a `skill`
  (`r:`/`m:`/`c:`/`h:`/`f:`/`s:`); `mastery.ts` keeps first-try stats + Leitner boxes (spaced review,
  "shaky" skills); `skills.ts` turns them into parent words. Units can carry `talk` (dinner
  questions shown on the parent tab) and a `challenge` (shown after a level). Coding: `program.ts` is the engine
  (repeat/if-else/until/functions over six worlds: sea, rover, dance, music, turtle, pixel),
  `code.ts` + `codeGen.ts` the levels (generated maps are solved by search before they're kept).
  Runs record loop passes (`Step.iters`) so the editor shows "pass 2 of 4", a step HUD and a
  "what your program did" recap. **The boat does every block**: there is no stop-at-the-goal —
  extra blocks sail past the island (or crash), and CodeAct explains the overshoot and turns the
  extra blocks red. Before a child's first boat level comes **Boat School** (`code/BoatSchool.tsx`),
  an unskippable hands-on tutorial; finishing it is a ledger `collect` event `tutorial:boat`
  (accepted by `rpc_learn_sync` since migration 0077) → `kid.tutorials` → `fx.tutorialDone`.
  **Adventure seas** (map legend in `program.ts`): keys + gates, buttons + drawbridges,
  whirlpools, currents, fish (Catch block, `if fish`), patrolling sharks (Wait block; one tick per
  acting block). `solveGrid` (codeGen) is a BFS over the engine itself, so hand maps (`chart()`)
  and generated seas (`makeAdventure`, which also proves the feature really matters) are right by
  construction. A world's `story` becomes its first lesson's `intro` (shown on the level card). **Code Lab** (teaching what's going on): activity kinds `concept`
  (animated explainers, `lab/ConceptAct.tsx`), `predict` (be the computer), `loopfind`, `recipe`
  (Robot Chef, dependency-ordered), `factory` (if/else-if/AND), `variable` (trace tables), `events`
  (Event Studio), `binary`, `search`, `swapsort`, `cipher`, `logic`, `machine`, `plot` — pure logic
  in `codelab.ts`, content + generators in `codeLabContent.ts`, UI in `components/kiosk/learn/lab/*`;
  a code lesson's items may be `CodeLevel`s or these activities. **Python Peek / Python Pro**
  (grades 4–5): `coderead` = read real Python and predict its output (`pythonSet`/`pythonRead`,
  skill `c:python`); with `fix` it's a bug hunt — the wrong output or real crash (IndexError,
  IndentationError, `=` vs `==`, an endless loop) is shown and the child taps the buggy line
  (`pythonBugSet`, `c:pydebug`). check-learn runs every program (and every fix) through a small
  Python interpreter (`scripts/learn-python.mjs`) — extend it if a lesson needs more Python.
  **After editing content run `node scripts/check-learn.mjs`** (every code answer wins, every
  bug really fails, answers are in their options, every skill is reviewable) — it catches real bugs.
  **No winning by tapping everything**: LessonPlayer holds taps while a non-reader's question is
  read, pauses them after a miss, and two quick misses bring the "stop and look" coach; answers
  that need checking (the net, binary lights) have a Check button instead of finishing themselves;
  arcade misses cost a point. **Hear buttons sit OUTSIDE answers** (`Hearable`/`HearButton` in
  `acts/common.tsx`; `useSpeaking` lights whatever is being said) — never put a speaker on or
  inside an answer tile.
  Kid UI: `LearnApp` → `LearnHome`/`VoyageMap`/`LessonPlayer`/`LessonDone`/`Aquarium`/`Treasures`
  (stickers · hero cards · trophies · verse vault)/`BrainGym` (the Game Arcade: brain games +
  subject games in `ArcadeGames.tsx`, records as `gym:<game>`)/`HarborShop`/`DailyChest`,
  the child's boat in `KidBoat.tsx`, activities in `components/kiosk/learn/acts/*` (one `Visual`
  renderer for all pictures; `StoryAct`, `VerseAct`, `CharacterActs` = spot/slots/reflect) and
  `code/*` (block editor + stages). Rewards: shells (`meta.ts`), sticker sets/rarity/shiny
  (`stickers.ts`), creatures (`reef.ts`: earned eggs are DERIVED from milestones, only hatches are
  stored; creatures grow with XP since hatching plus treats; one is the lesson "buddy"), badges
  (`badges.ts`, derived). **My Aquarium** (`components/kiosk/learn/Aquarium.tsx`, catalog +
  derivation in `lib/learn/aquarium.ts`) is where shells go: food packs (feeding = hearts + growth,
  3 treats per creature per day, never sickness or guilt), the Egg Shop + Mystery Egg machine (odds
  printed, every 10th roll Rare+; buying is never worse than rolling), decorations (try on in the
  tank, put away / bring back) and tank themes, and the Fish Book. Every buy is two taps ("tap
  again to buy it"). Purchases are ordinary `spend` events whose item carries a unique id
  (`food:<kind>:<id>`, `egg:<tier>:<id>`, `roll:<n>:<id>`, `decor:<id>`, `tank:<id>`) so the
  snapshot's distinct `owned` list still counts them; meals are `collect` `feed:<food>:<egg>`
  (summed per creature as `fed` in `learn_snapshot`, not in `collected`); tank and decoration
  choices are `collect` `aq:tank:<id>` / `aq:off:<id>` / `aq:on:<id>`. Sync: **`rpc_learn_sync(p_secret, p_results, p_events)`** — results (with per-skill
  stats, kind, shells) + a ledger (`earn`/`spend`/`look`/`daily`/`collect` = hatch, buddy,
  tutorial, meal or aquarium choice, `best` = Brain Gym record; spends balance-checked, gym shells
  capped at 3 rounds/day) in `learnOutbox`/`learnEvents`, `finishLesson`/`learnEvent` in `useKiosk`.
  Parent side: Learn tab (`KidLearnView`, `KidLearnParts`, `children/learn-actions.ts`,
  `lib/learn/parent.ts`; missions can be a level or `practice:<subject>`; the tab also shows
  memory verses and "talk about it" prompts); alerts via the `learn_notify` trigger →
  `/api/cron/notify-learn` (mission done, stuck 3×, goal, island, verse memorized, streak). Voice: pre-recorded clips in `public/learn-voice` (letter sounds = WAV cut from
  carrier syllables by `scripts/learn-voice/phonics.mjs`; words/lines = HLA 4-bit ADPCM,
  decoded by `lib/learn/hla.ts`); what gets recorded per grade band is `voiceLevelFor` in
  `script.ts` (unrecorded math is stitched from number words, the rest uses the device voice).
  After changing content or `script.ts`, run `node scripts/gen-learn-voice.mjs` (local Kokoro
  from node_modules — no download; incremental) and commit the clips + `index.json`.
  Preview: `/dev/learn` (`?lesson=<id>&grade=k` jumps into a level).
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
