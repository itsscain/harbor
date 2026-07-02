---
name: harbor-ai-voice
description: AI-led child voice (natural understanding + guardrails) — V1 shipped; the safety design.
metadata:
  type: project
  originSessionId: 3cd03412-7647-4c62-ade9-5099b108cba8
---

Spec `HARBOR_AI_VOICE_INTERACTIONS.md` (Downloads). Make Harbor's voice AI-LED (understand + respond),
using the existing Claude/Haiku. **The guardrails ARE the feature** — child-facing voice is bounded to
Harbor's purpose, NOT a companion. **V1 shipped 2026-06-28** (the safety foundation + natural routine help).

**What already existed (don't rebuild):** voice I/O is fully built — `VoiceButton.tsx` does tap-to-talk
STT (Web Speech `SpeechRecognition`) + speaks DYNAMIC text through the Harbor Voice cascade (`voice.ts`
`playHarborVoice`: cache → static Bella library → OS-instant + Kokoro-background for novel text; the
"library-only" rule is just for the canned proactive helpers, NOT the engine). The shell `VoiceButton`
called the EXISTING household `/api/ai/command` ("Hey Harbor": reply/add_grocery/add_chore/plan_dinners).
AI path: `lib/ai/anthropic.ts` (`HAIKU="claude-haiku-4-5-20251001"`, `haikuJson` forced-tool, `aiErrorMessage`);
routes auth by `device_pairings.device_secret` via `createAdminClient()`, read BYO key from `ai_config`
(key + `enabled`), key server-side only.

**V1 SHIPPED — child-facing, guardrails-first:**
- **`/api/ai/voice`** (NEW, child-facing) — the bounded keeper. Forced tool `harbor_respond` with an action
  ENUM ALLOWLIST (`answer/reread/breakdown/open_anchor/log_feeling/suggest_break/notify_parent`) — the
  allowlist is the authority boundary IN CODE; economy actions (complete/redeem/approve/settings) are
  impossible. System prompt = the lighthouse-keeper spine + §5 (bounded, anti-engagement/never-a-friend,
  point to people+independence, distress→human, no economy, grounded, brief). Grounds on the child
  (name/age band from birthday/sensory/ai_profile) + the kiosk-sent routine+step.
- **Distress**: regex pre-check (`DISTRESS_RE`) OR the model's `distress` flag → force `notify_parent`,
  calm spoken support, and insert a `check_in` (the existing points-free kid→parent signal — NO real push
  channel exists yet) so the parent sees it. When unsure, escalate.
- **Parent control (§5.5)**: per-child `settings.voiceChat` toggle, **OFF by default**, in the child
  Accessibility section (`updateChildSettings` in hub-actions.ts). The endpoint refuses unless voiceChat ON
  AND ai_config key+enabled. **Reviewable log**: new `voice_interactions` table (migration **0052**; RLS
  select = household_is_mine, NO insert policy → service-role/server only) shown as a "Voice activity"
  disclosure on the child page, distress rows flagged red.
- **Kiosk**: `VoiceButton` gained `childId` prop — KioskShell passes the active child's id ONLY when a
  child's screen is open AND that child's voiceChat is on → routes to `/api/ai/voice`; else the household
  `/api/ai/command`. Speaks the `speech` via the Harbor Voice.

**VERIFIED LIVE (real Haiku calls, then test data deleted + child reset OFF):** gate (off→`{disabled:true}`);
resistance "I don't want to brush my teeth"→warm `breakdown` ("super quick version together"); off-scope
"be my best friend / long story"→redirect to the day + to Mom/Dad (NOT a companion ✓); distress "scared +
want to hurt myself"→`distress:true`+`notify_parent`+ a parent check_in. (To curl-test I created+deleted a
throwaway paired device for household 9a2ef16c, which has the only AI key.)

**V2 SHIPPED (2026-06-28) — AI-led Anchor co-regulation (the flagship §3.2):** `/api/ai/voice` gained an
`anchor` mode — a co-regulation system addendum (name the feeling, breathe WITH them in short cues, offer
this child's calming strategy, step back, never start a routine, point to calm/grown-up) + a **calibrated
distress threshold**: in anchor mode ordinary big feelings (mad/sad/too-much) are EXPECTED → distress=false
& co-regulate; reserve distress=true (→ parent check_in) for REAL concern (hopelessness, wanting to
disappear/be hurt, fear, being hurt). New reusable `lib/kiosk/useTapToTalk.ts` (one-shot on-device Web
Speech STT). `Anchor.tsx` has a voiceChat-gated "Talk to me" mic → /api/ai/voice {anchor:true} → speaks the
reply over the breathing ripple; distress shows amber + `onSoften`. `ChildView` passes deviceSecret/childId/
voiceChat. **Adversarial 2-lens safety review (run after build) caught a serious gap both ways — keep this
discipline for any child-distress feature:** (1) first cut OVER-escalated (plain "mad"→parent alert →
alarm-fatigue); (2) then the calibration UNDER-escalated — mild/indirect concern ("I hate myself", "nobody
would care if I wasn't here", "I don't want to wake up") was co-regulated, NOT alerted, because the anchor
"default ambiguous→false" beat the general "when unsure escalate." Final calibration: distress=FALSE only
for PLAINLY ordinary upset about a normal frustration; ANY hint (mild/indirect/whispered) of not-existing /
self-loathing / hopelessness / wanting-to-hurt / fear-of-someone / being-hurt → distress=TRUE; ambiguity
ESCALATES. `DISTRESS_RE` widened to passive/indirect ideation + self-loathing + fear-of-person (the floor;
over-catches by design). Distress check_in + voice_interactions inserts now AWAITED + `captureError` on
failure (a swallowed insert meant the child heard "I'll get a grown-up" but the parent was never told; the
flagged voice_interactions row on the child page is the guaranteed secondary surface). Anchor `stopSpeaking()`
before the AI reply (no talk-over). VERIFIED LIVE after the fix: the 3 indirect phrases escalate; "so mad I
lost my game" / "tired & sad about homework" co-regulate without alert. **KNOWN LIMITS (documented, not
shipped):** no real push channel (parent sees distress via check-in/Voice-activity log, not instantly); no
per-session anchor turn cap (engagement/cost); Chromium Web Speech routes audio to Google (true on-device
STT = V3). Lesson: ALWAYS adversarially review a child-safety AI both for over- AND under-escalation, and
never let a safety-write be fire-and-forget.

**V2b SHIPPED (2026-06-28) — the parent voice Copilot "Ask Harbor" (§3.4):** `askHarbor(question)` server
action (in `actions.ts`) — parent-session-authed, grounds in the household's children + last-2-weeks
check-in feelings + routines via the **request-scoped RLS client** (household-confined, no cross-household
leak), `haikuText` answer (warm + practical), DEFERS clinical/medical → provider, never invents, DRAFTS
(routine/social-story/summary) the parent applies. **Read/advise/draft ONLY — never mutates** (no PIN
action needed). Key stays server-side (`getHouseholdAi`); only the answer string returns. UI:
`/app/ask` (`components/app/AskHarbor.tsx`, text + voice via the reused `useTapToTalk` + suggested prompts
+ "not a doctor" disclaimer); in the desktop rail + mobile More hub. Adversarially reviewed → "sound"
(RLS-confined, read-only, injection-acceptable, empty-state safe). **The whole AI-Led Voice spec V1+V2 is
now shipped.** VERIFY: /app is auth-gated → build + review verified, not a live AI call (can't, without the
parent session; didn't extract the key).

**DEFERRED:** V3 = AAC
expansion, on-device STT hardening, the optional bounded "chat a little" (off by default). Also pending:
real push escalation (vs the check_in), AI actually driving the breathing pace (today the ripple runs
independently while the AI talks), step-grounding from ChildView, two-sided content moderation beyond the
model's own safety + the distress check. Related: [[harbor-ai-companion]],
[[harbor-voice-tts]], [[harbor-device-mgmt]], [[harbor-project]].
