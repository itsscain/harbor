---
name: harbor-routines-app
description: Routines & Parent App spec (4 asks); P1 no-silent-no-op + P2 family-wide scheduling + P3 advanced builder shipped; P4 (senior /app) next. Routines = "catch-up not lockout".
metadata: 
  node_type: memory
  type: project
  originSessionId: 3cd03412-7647-4c62-ade9-5099b108cba8
---

HARBOR_ROUTINES_AND_APP.md (in Downloads) = four connected asks, one system:
1. **Family-wide scheduling** (§2-§4): shared routines + schedule templates + per-child overrides + bulk + Family Schedule view — "define once, apply to all" (fixes per-kid window setup pain).
2. **No-silent-no-op law + out-of-window feedback** (§5-§7) — the trust fix.
3. **Advanced routine builder** (§8-§10): progressive disclosure, step/template library, live "see it on the wall" preview.
4. **Senior-grade /app (Helm) redesign** (§11-§15): IA, component library, optimistic/live, mobile-first; builder = showcase.

**Phase 1 SHIPPED 2026-07-01** (spec says do first — the trust fix). The law: "Harbor never silently absorbs a tap. If an action can't happen, Harbor explains why — gently — and offers what to do instead." Repairs the incident where a child tapped a time-locked routine, nothing happened, trust was lost.

What shipped (kiosk):
- **Time-locked routine tap** → `feedback("soft-error")` + spoken reason in `ChildView.complete()` (§6.3, the exact incident).
- **First→Then guard made audible**: new `tapThen()` fires soft-error + "Let's do First first!". CRITICAL catch in review: `StepCard`'s `disabled={done || muted}` was swallowing the tap → dead code; changed to `disabled={done}` only (muted stays a visual dim, still tappable).
- **StoreView**: unaffordable reward tap now answers ("N more stars") instead of a dead disabled button (removed `disabled` on unaffordable, kept it only for `bought`); goal tiles made tappable too (`tapGoal`: celebrate if reached / stars-to-go).
- **Out-of-window "resting" banner** in ChildView: warm (Moon/amber), live countdown "Opens in 2h 15m" (recomputes on the existing 60s dayTick), + "Take a calm break" forward path (setAnchorOpen). Suppressed when `allDone` so the "all done" celebration owns the moment (§6.2).
- **"Closing soon" heads-up** (§7): calm "about 20 min left — no rush 🌊" (CLOSING_SOON_MIN=20), when window open + nearly up.
- **Hub/child cards** (§6.4): `childStatus.ts` gained `upcoming` state + `opensLabel`; `ChildAuraCard` shows "{routine} is resting" + "opens in 1h". Chores have no window so they keep the card `active`.
- New tz-aware helpers in `lib/kiosk/calendar.ts`: `windowCountdown(routine,nowMs,tz)`→{untilOpenMin,untilCloseMin}, `formatCountdown(min)`→"2h 15m"/"now", `opensAtLabel`. Verified 15/15 vs America/New_York incl. overnight + past-window. Builds on existing `withinWindow` (the [[harbor-edge-cases]] §routine-windows time-lock).

**Phase 2 SHIPPED 2026-07-01** (family-wide scheduling, §2-§4). Migrations 0058+0059 (ALWAYS rebuild kiosk_snapshot/rpc_kiosk_push/kiosk_broadcast from LIVE defs via pg_get_functiondef — repo 0042/0044 are note-only): `schedule_templates` + `routine_child_overrides` (household RLS/tombstones/broadcast); `routines` gained scope('child'|'shared'), assigned_child_ids uuid[], schedule_template_id, and a **household_id anchor** (backfilled + BEFORE-trigger `routines_set_household`) — without it shared routines (child_id null) are invisible to snapshot/broadcast/RLS. routines_all policy now `household_is_mine(household_id)` (also fixed pre-existing person-routine RLS hole). Push validates shared assignment + honors per-child `enabled=false` server-side. 0059: reset_household clears shared routines/templates/people; hard_delete_child array_removes from assigned_child_ids.

Kiosk resolution seam = `lib/kiosk/schedule.ts`: `routineForChild()` (legacy rows w/o scope fall back to child_id) + `effectiveSchedule()` (override → template → own; shiftClock wraps midnight) — used identically by ChildView, childStatus, AND /app/schedule so wall/hub/Helm never disagree. windowCountdown now overnight-aware. childStatus reads progress under serviceDay(s) + family tz (was todayKey — hub/wall disagreed across midnight).

Helm: `/app/schedule` (Family Schedule day-timeline grid + shared-routine manager + template manager + bulk copy/apply-template), SharedRoutineCard, FamilyScheduleGrid, RoutineCard template picker; nav ×3 (ParentRail, ParentNav MORE_ROUTES, more hub). Review lessons: `int(null,fallback)` footgun (Number(null)=0 → guard v==null first); disclosure-collapse fix = version key on inner form not the card; requireUser + assertMine(household) on every schedule action.

**Phase 3 SHIPPED 2026-07-02** (advanced builder + templates, §8-§10). Migration **0060** (additive):
`routine_steps.kind` (standard|timed|approval|together|choice|substep — **ORTHOGONAL** to step_type
task/first/then, so the enum is untouched) + read_aloud/hint/why_note/sensory_note/choice_options/
substeps; `routines.strict_order/celebration_style/sensory_intensity`; new `routine_templates` +
`step_library` tables (curated household_id=null + household-saved, RLS: curated readable by all
signed-in, write only own household). Snapshot carries new COLUMNS free via `to_jsonb()` — NO
snapshot/push rebuild; per-step completion already generic so new kinds award points unchanged.
Builder: `StepRow` kind selector + choice/substep options editors + Advanced tray (read-aloud/hint/
why/sensory) + "no stars" health toggle; `RoutineCard` routine options (advanced_present hidden marker
so schedule/person editors don't clobber) + step-library tap-to-add + "See it on the wall" preview
(`RoutinePreview`) + "Save as template". `TemplateGallery` (data-driven curated+saved). Kiosk kinds in
`ChildView` + `NowCard`: choice (pick one), substep (mini checklist), approval (ParentGate), together
badge, hint line, strict-order gate (spoken nudge), celebration_style, per-routine sensory_intensity.

**THE CATCH-UP LAW (user feedback 2026-07-02 — routines are CORE, refine to a tee, get in the kid's
head).** Incident: the wall LOCKED the kids out of their MORNING routine at 11am (window passed, they'd
forgotten) → felt punishing/inefficient. Fix, now in `ChildView`: a PASSED window is **catch-up, NOT a
lock** — steps stay tappable, warm framing ("Let's catch up on your morning! 💪"). The ONLY hard lock is
NOT-YET-OPENED (`windowCountdown().untilOpenMin != null`, e.g. bedtime at noon). Plus **time-of-day
auto-selection** (open+unfinished > catch-up[most-recent] > soonest upcoming), PINNED on first completion
so a minute-boundary never yanks a mid-task kid. **Why:** a care product for disorganized kids must guide
+ invite, never punish forgetfulness. User still wants the kid routine VIEW + builder even more visually
pleasing / motivating — keep pushing in P4.

**Phase 4 STARTED 2026-07-02 (IA foundation, §12/§15).** New unified **Routines hub** `/app/routines`
(`app/app/(parent)/routines/page.tsx` + `loading.tsx`): glance band (child routines · shared ·
templates) → per-child cards into each builder → Family Schedule link → "Start from a template"
(`TemplateApplyHub.tsx`: pick child once, apply any curated/saved template; server action
`applyTemplate` in actions.ts wraps addRoutineFromLibraryTemplate). Nav: "Routines" now a first-class
tab (ParentNav — Lists moved into MORE_ROUTES + /more hub) and prominent in ParentRail. Reused the
design system verbatim (PageHeader/Card/SectionHeader/StatChip/EntityAvatar/EmptyState/Skeleton) — no
new tokens. **P4 REMAINING:** the rest of §11-§15 — full component-library consolidation, all-states
polish across every Helm page, optimistic/live everywhere, the builder as the fully-realized showcase.

Composes with [[harbor-kiosk-rework]] (Feedback System), [[harbor-brand-true]] (anti-overload + Skill
Levels + no-points-for-health), [[harbor-helm-declutter]] (P4 pattern), [[harbor-realtime]],
[[harbor-device-mgmt]]. GOTCHA: parent `/app` is auth-gated → agent preview can't screenshot it; verify
via clean `npm run build` + review.
