---
name: harbor-timezone-pwa
description: Family-timezone fix (America/New_York + setting), routine time-lock enforcement, PWA app-feel — shipped 2026-06-28.
metadata:
  type: project
  originSessionId: 3cd03412-7647-4c62-ade9-5099b108cba8
---

User-reported bugs + asks (HARBOR_KIOSK_REWORK turn). All shipped 2026-06-28.

**TIMEZONE (the "wife added events at the wrong time" bug).** Events were always stored fine as
UTC `timestamptz`; the bug was that EVERY surface rendered with the DEVICE's zone, and entry was
anchored to the entering device's zone — so the wall and a phone disagreed. Fix = pin everything
to ONE family zone (default **America/New_York**), configurable in Settings:
- **`lib/tz.ts`** (NEW, pure, client+server): `tzFromSettings`, `dayKeyInTz`, `minutesIntoDayInTz`,
  `weekdayInTz`, `formatTimeInTz`, `formatInTz`, and `wallTimeToUtcMs(naive, tz)` = interpret a
  datetime-local wall entry IN the family zone → UTC instant. **wallTimeToUtcMs MUST be two-pass**
  (re-evaluate the offset at the candidate instant) or it's an hour off on the spring-forward day.
- **Write:** `addEvent` + AI `applyCapture` (hub-actions.ts) convert the naive entry via the family
  tz, NOT the browser offset. `DateTimeField` now submits the naive value under `name` (the legacy
  browser-tz `_iso` is only a fallback).
- **Display:** `lib/kiosk/calendar.ts` (occursOn/eventsForDay/runsToday/withinWindow/formatEventTime)
  + `lib/kiosk/time.ts` (serviceDay/dayKeyOf) DEFAULT to America/New_York → every existing caller is
  fixed automatically. Threaded the actual setting into the calendar surfaces: kiosk `CalendarView`
  (agenda/day/week/month + EventRow/EventDetail/TimeGrid sub-components all take a `tz` prop),
  `Screensaver` (agenda + clock), `FamilyView` (clock + RhythmStrip), parent `calendar/page.tsx`.
- **Setting:** Settings → Wall display gains a Time zone `<Select>` (US zones) → `households.settings.
  timezone` via `updateKioskSettings`; rides to the wall on the existing snapshot (NO migration). Kiosk
  reads `tzOf(state)` = `tzFromSettings(snapshot.household.settings)`.
- **Day-key consistency:** `serviceDay`/progress.date use the family tz; aligned `completeStep/
  completeChore/completePersonStep/resetDay` + ChildView's `prog` to `serviceDay(s)` (was device-local
  `todayKey()`) so on-screen checkmarks/reset match the tamper-proof ledger `op_id` (which already used
  serviceDay). Economy is safe regardless (deterministic op_id + on-conflict-do-nothing + future-guard).
  `todayKey()` still used for local UI flags (the per-day game localStorage key).

**ROUTINE TIME-LOCK (the other bug).** `routines.start_time/end_time/days_of_week` existed + the parent
saved them (RoutineCard → updateRoutine), but the kiosk only enforced day-of-week + once-per-day —
NEVER the time window. Added `withinWindow(routine, nowMs, tz)` (handles none/start-only/end-only/
overnight) in calendar.ts; `ChildView` computes `routineLocked` from `trustedNow(state)` (tamper-
resistant) + family tz → `complete()` early-returns with a `soft-error` (no completion, no points) and
shows a calm amber "🔒 {routine} opens {window}" banner. Chores have no window (intended). [[harbor-edge-cases]]

**PWA APP-FEEL (/app + /kiosk feel native installed).** Root viewport `viewportFit:"cover"` (makes
`env(safe-area-inset-*)` real); global `overscroll-behavior:none` + `-webkit-tap-highlight-color:
transparent` + `-webkit-touch-callout:none` + `text-size-adjust:100%` on html/body; **/app got its own
standalone manifest** (`public/manifest-app.webmanifest`, start_url/scope `/app`) linked from the parent
layout `metadata.manifest` so Add-to-Home-Screen installs it chrome-less (separate from `/kiosk`); parent
shell `min-h-screen`→`min-h-dvh` + `safe-area-inset-top` on the mobile header. (iOS standalone already
worked via the root `appleWebApp.capable`; this makes /app a real installable PWA + removes browser-y
feel. NOTE: /app still registers NO service worker — kiosk-only — so /app isn't offline; the kiosk SW
falls back to /kiosk so it must NOT be scoped to /app.)

Build stamp **v20**. Adversarial review verdict: timezone math + time-lock + PWA sound after the two-pass
DST fix + the display-surface threading. Related: [[harbor-kiosk-rework]], [[harbor-project]],
[[harbor-device-mgmt]].
