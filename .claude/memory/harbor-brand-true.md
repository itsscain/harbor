---
name: harbor-brand-true
description: Harbor Brand-True Feature Set — the disciplined "parent in the boat" feature pass; plan + progress.
metadata:
  type: project
  originSessionId: 3cd03412-7647-4c62-ade9-5099b108cba8
---

Spec: `C:\Users\penda\Downloads\HARBOR_BRAND_TRUE_FEATURES.md` — a deliberate NARROWING (brand-discipline
pass; this doc wins over the market-leading doc). Organizing idea: **the parent is IN the boat, not on the
shore** — Harbor is a family practicing life together, not an admin panel. Four gates (§1): serves THIS
family; feels like the lighthouse keeper; needed on a hard day; adds NO overload. **Child's wall stays
sacred/simple (§5)** — new depth lives in the parent app or a separate calm moment.

**HARD RULES baked in:** parent routines + medication = **NO stars/points** (gamifying adulthood/health is
off-brand). **NEVER fake "HIPAA-compliant"** — Briefings/Care Circle provider-sharing needs real compliance
counsel; build parent-side data + reports, flag the provider path. CUT/frozen (§2): TAM expansion, hardware,
UGC marketplace/forum, collective intelligence, predictive forecasting, virality/FOMO. When in doubt, leave
it out.

**Sequencing (§7):** 1) Family Profiles + Parent Routines + Together Time → 2) Medication Station →
3) Skill Levels (fading scaffolds) → 4) Harbor Briefing + Care Circle (compliance counsel) → 5) Social
Stories, SOS Mode, living harbor + growth story, Ask Harbor.

**STEP 1 SHIPPED + verified (2026-06-27):** migrations 0039 (people table; routines.child_id nullable +
person_id + together + with_child_id + XOR check; routine_is_mine handles person routines; person_completions
log — NO rewards) + 0040 (kiosk_snapshot carries people + person routines/steps; rpc_kiosk_push accepts
person_completions — recreated from LIVE defs). Verified E2E via SQL: snapshot returns person+together
routine+step; person_completion logs with ZERO reward_log rows (then cleaned up the test rows). Kiosk:
`components/kiosk/ParentView.tsx` (calm checklist, chime+haptic, no points, "Together with <child>" badge),
FamilyView participant strip (secondary to kids), KioskShell `{k:"parent"}` route, useKiosk.completePersonStep
+ personProgress + sync person_completions, types KioskPerson/snapshot.people/routine fields/Mutation
person_completion. Parent app: `app/app/(parent)/family/page.tsx` + family actions in actions.ts (addPerson/
updatePerson/deletePerson/addPersonRoutine/updatePersonRoutine/deletePersonRoutine/addPersonStep/
deletePersonStep) + nav (ParentRail "Family", ParentNav MORE_ROUTES, /more hub). GOTCHA: routines.child_id
now nullable → guard `r.child_id` before Map.set / Set.has (fixed children/page.tsx + sync.ts prune).

**STEP 2 SHIPPED + verified (2026-06-27):** Medication Station (§4.3). Migrations 0041 (medications +
medication_logs, NO rewards, RLS via child_is_mine) + 0042 (snapshot carries medications + today's logs;
rpc_kiosk_push accepts med_logs — recreated from LIVE). Verified E2E via SQL: med in snapshot, med_log
logs taken/confirmed_by with ZERO reward_log rows + appears in snapshot (cross-device taken-state); cleaned
up. Kiosk: `lib/kiosk/medication.ts` (dueDoses off TRUSTED clock), ChildView "Medicine time" card (separate
from steps, no points) → `components/kiosk/MedMoment.tsx` (calm full-screen ritual; PIN-gated confirm for
parent_administered meds; chime + "Nice — that's looking after yourself", NO confetti). useKiosk.takeMedication
+ medProgress + sync med_logs; types KioskMedication/KioskMedLog/snapshot fields/Mutation med_log. Voice:
added 3 med phrases → regenerated Kokoro library (now 93 af_bella phrases) so the moment stays Bella. Parent
app: `/app/medication` (per-child meds + "tracks/reminds, does NOT dispense/dose" banner) + nav. GOTCHA:
KioskMedLog.id must be REQUIRED (not optional) to satisfy the sync pull<Identified> generic.

**STEP 3 SHIPPED + verified (2026-06-27):** Skill Levels (§4.4). Migrations 0043 (routine_steps.support_level
1–4 baseline + skill_progress table: earned independence per child/step) + 0044 (snapshot carries
skill_progress; steps carry support_level via to_jsonb; push UPSERTS skill_progress with level_earned =
GREATEST so it never regresses — verified: a push lowering 1→0 kept it at 1). `lib/kiosk/skill.ts`
(effectiveLevel = min(4, support_level+earned); independenceSummary). useKiosk.completeStep advances a
per-step independence streak on the TRUSTED day → fades a level at SKILL_THRESHOLD(4) + sets lastLevelUp;
StepCard/NowCard fade scaffolding by effective level (read-aloud gone past L2, icon recedes, "🧭 On your
own"/"Just a reminder" tags); calm proud level-up banner (speaks library "Look at you go", NOT confetti);
sync pushes/merges skill_progress (state.skill local + snapshot, read takes max). Parent: StepRow Support-
level select; child page "Growing toward independence — N of M on their own · K prompts faded" readout.

**REMAINING:** Steps 4–5. Next = §4.6 Harbor Briefing + §4.7 Care Circle — the provider/coordination layer.
**HIPAA CAUTION (§6): build the parent-side data + the report GENERATION (medication adherence from
medication_logs + care/independence from skill_progress/groundings/corners) + parent review/PDF, but the
PROVIDER-SHARING path needs real compliance counsel — NEVER ship a "HIPAA-compliant" label without it.
Care Circle = co-parent first (scoped, revocable), providers later.** Then §4.5 social stories, §4.8 SOS +
living harbor + growth story, §4.9 Ask Harbor.

Related: [[harbor-kiosk-overhaul]], [[harbor-childview-visual]], [[harbor-edge-cases]], [[harbor-voice-tts]], [[harbor-project]].
