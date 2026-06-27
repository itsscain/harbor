// Skill Levels (§4.4). A step's scaffolding FADES as the child earns independence:
//   1 full · 2 fewer prompts · 3 just a reminder · 4 on your own
// effective level = min(4, parent baseline support_level + earned independence). The wall
// computes "earned" locally and syncs it; reads take the max of local + synced so a fresh
// device still shows hard-won independence. Compassionate: a hard day never demotes.

import type { KioskState, KioskStep } from "./types";

/** Consecutive completion days at a level before the next prompt fades away. */
export const SKILL_THRESHOLD = 4;

/** Human labels, indexed by effective level (1–4). */
export const SUPPORT_LABELS = ["", "Full support", "Fewer prompts", "Just a reminder", "On your own"];

function snapEarned(state: KioskState, childId: string, stepId: string): number {
  const sp = (state.snapshot.skill_progress ?? []).find((x) => x.child_id === childId && x.step_id === stepId);
  return sp?.level_earned ?? 0;
}
function localEarned(state: KioskState, childId: string, stepId: string): number {
  return state.skill?.[`${childId}:${stepId}`]?.level ?? 0;
}

/** Levels of support the child has faded through on their own (local ∪ synced). */
export function earnedLevel(state: KioskState, childId: string, stepId: string): number {
  return Math.max(localEarned(state, childId, stepId), snapEarned(state, childId, stepId));
}

/** What the wall should actually show for this step right now (1–4). */
export function effectiveLevel(state: KioskState, childId: string, step: KioskStep): number {
  const baseline = step.support_level ?? 1;
  return Math.min(4, baseline + earnedLevel(state, childId, step.id));
}

/** A child's overall independence across their steps: how many are "on their own". */
export function independenceSummary(
  state: KioskState,
  childId: string,
  steps: KioskStep[],
): { onOwn: number; total: number } {
  let onOwn = 0;
  for (const s of steps) if (effectiveLevel(state, childId, s) >= 4) onOwn += 1;
  return { onOwn, total: steps.length };
}
