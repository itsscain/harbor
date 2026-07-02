// The Lantern's day logic (HARBOR_LANTERN_DEVICE.md) — pure composition over the shared
// lib/kiosk helpers so the Lantern's LIGHT, Buddy-style UI reuses the exact window / catch-up
// / progress logic the dark kiosk uses. Presentation differs; the rules never diverge.

import type { KioskState, KioskRoutine, KioskStep, KioskChore, KioskChild } from "@/lib/kiosk/types";
import { routineForChild, effectiveSchedule } from "@/lib/kiosk/schedule";
import { runsToday, withinWindow, windowCountdown, opensAtLabel, windowLabel } from "@/lib/kiosk/calendar";
import { serviceDay, trustedNow } from "@/lib/kiosk/time";
import { choreAssignee } from "@/lib/kiosk/chores";
import { sensoryOf, intensityOf } from "@/lib/kiosk/motion";

/** The child's accessibility/feedback settings (mirrors ChildView.readChildSettings) — kept
 *  here so the Lantern views don't import the heavy dark ChildView just for this. */
export function childSettings(child: KioskChild) {
  const s = (child.settings ?? {}) as Record<string, unknown>;
  const soundOn = s.sound !== false;
  return {
    readAloud: s.readAloud !== false && soundOn, // voice needs sound on (master mute)
    autoRead: s.autoRead === true,
    sound: soundOn,
    haptics: s.haptics !== false,
    reducedMotion: s.reducedMotion === true,
    sensory: sensoryOf(s.sensory),
    intensity: intensityOf(s.sensory),
    voiceChat: s.voiceChat === true,
  };
}

export type WindowState = {
  /** none = always available · open = do it now · catchup = window passed, still finishable
   *  (NOT locked — the missed-morning fix) · upcoming = not yet open (the only hard lock). */
  kind: "none" | "open" | "catchup" | "upcoming";
  untilOpenMin: number | null;
  untilCloseMin: number | null;
  opensAt: string | null; // "opens at 7:00 AM"
  label: string | null; // "6:30 – 9:00 AM"
};

function clockMin(t: string | null | undefined): number {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

/** The child's routines that run today (active, assigned, not per-child-disabled), sorted. */
export function childRoutinesToday(state: KioskState, childId: string, tz: string): KioskRoutine[] {
  return state.snapshot.routines
    .filter((r) => {
      if (!r.active || !routineForChild(r, childId)) return false;
      const eff = effectiveSchedule(r, childId, state.snapshot);
      return !eff.disabled && runsToday(eff.days_of_week, tz);
    })
    .sort((a, b) => a.sort_order - b.sort_order);
}

/** The routine's window state for this child right now (mirrors ChildView's lock model:
 *  a passed window is catch-up, never locked; only not-yet-open is a hard lock). */
export function routineWindow(state: KioskState, routine: KioskRoutine, childId: string, tz: string): WindowState {
  const w = effectiveSchedule(routine, childId, state.snapshot);
  const hasWindow = !!(w.start_time || w.end_time);
  if (!hasWindow) return { kind: "none", untilOpenMin: null, untilCloseMin: null, opensAt: null, label: null };
  const now = trustedNow(state);
  const wc = windowCountdown(w, now, tz);
  if (withinWindow(w, now, tz)) {
    return { kind: "open", untilOpenMin: null, untilCloseMin: wc.untilCloseMin, opensAt: null, label: windowLabel(w) };
  }
  if (wc.untilOpenMin != null) {
    return { kind: "upcoming", untilOpenMin: wc.untilOpenMin, untilCloseMin: null, opensAt: opensAtLabel(w), label: windowLabel(w) };
  }
  return { kind: "catchup", untilOpenMin: null, untilCloseMin: null, opensAt: null, label: windowLabel(w) };
}

/** Steps for a routine, ordered. */
export function stepsFor(state: KioskState, routineId: string): KioskStep[] {
  return state.snapshot.steps.filter((s) => s.routine_id === routineId).sort((a, b) => a.order_index - b.order_index);
}

/** Today's completed step/chore ids for the child (empty if the day rolled over). */
export function doneToday(state: KioskState, childId: string): string[] {
  const day = serviceDay(state);
  return state.progress[childId]?.date === day ? state.progress[childId].completed : [];
}

/** The chores assigned to this child today (honoring rotation), ordered. */
export function childChoresToday(state: KioskState, childId: string, tz: string): KioskChore[] {
  const ids = new Set(state.snapshot.children.map((c) => c.id));
  return (state.snapshot.chores ?? [])
    .filter((c) => c.active && runsToday(c.days_of_week, tz) && choreAssignee(c, ids) === childId)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export type RoutineProgress = {
  done: number;
  total: number;
  complete: boolean;
  steps: KioskStep[];
  isFirstThen: boolean;
  firstStep?: KioskStep;
  thenStep?: KioskStep;
  taskSteps: KioskStep[];
};

export function routineProgress(state: KioskState, routine: KioskRoutine, done: string[]): RoutineProgress {
  const steps = stepsFor(state, routine.id);
  const isFirstThen = routine.type === "first_then";
  const firstStep = steps.find((s) => s.step_type === "first");
  const thenStep = steps.find((s) => s.step_type === "then");
  const taskSteps = steps.filter((s) => s.step_type === "task");
  if (isFirstThen) {
    const list = [firstStep, thenStep].filter(Boolean) as KioskStep[];
    const d = list.filter((s) => done.includes(s.id)).length;
    return { done: d, total: list.length, complete: !!thenStep && done.includes(thenStep.id), steps, isFirstThen, firstStep, thenStep, taskSteps };
  }
  const d = taskSteps.filter((s) => done.includes(s.id)).length;
  return { done: d, total: taskSteps.length, complete: taskSteps.length > 0 && d === taskSteps.length, steps, isFirstThen, firstStep, thenStep, taskSteps };
}

/** Time-of-day "start here" pick: open+unfinished (windowed) > catch-up > windowless open >
 *  upcoming > done. Same priority the wall uses; used to gently highlight the now tile. */
export function pickNowRoutineId(state: KioskState, routines: KioskRoutine[], childId: string, tz: string): string | null {
  const done = doneToday(state, childId);
  let best: { id: string; rank: number; key: number } | null = null;
  for (const r of routines) {
    const w = routineWindow(state, r, childId, tz);
    const finished = routineProgress(state, r, done).complete;
    const startMin = clockMin(effectiveSchedule(r, childId, state.snapshot).start_time);
    let rank: number, key: number;
    if (w.kind === "open" && w.label && !finished) { rank = 0; key = startMin; }        // windowed, open now
    else if (w.kind === "catchup" && !finished) { rank = 1; key = 1440 - startMin; }     // most recently missed
    else if ((w.kind === "none" || w.kind === "open") && !finished) { rank = 2; key = startMin; } // anytime
    else if (w.kind === "upcoming") { rank = 3; key = w.untilOpenMin ?? 9999; }          // soonest
    else { rank = 4; key = startMin; }                                                   // done
    if (!best || rank < best.rank || (rank === best.rank && key < best.key)) best = { id: r.id, rank, key };
  }
  return best?.id ?? null;
}
