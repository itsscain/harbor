// Per-child day status — the shared read behind the FAMILY hub's aura cards and the
// AMBIENT glance dots (Kiosk Overhaul §5.4 / §6.2). Pure; derives the same routine +
// chore progress ChildView shows, so the hub and the spoke never disagree.

import type { KioskState } from "./types";
import { runsToday, withinWindow, windowCountdown, formatCountdown, opensAtLabel } from "./calendar";
import { routineForChild, effectiveSchedule } from "./schedule";
import { trustedNow, tzOf, serviceDay } from "./time";
import { choreAssignee } from "./chores";
import { activeGroundingFor } from "./grounding";

export type ChildDayStatus = {
  total: number;
  done: number;
  pct: number;
  /** Next undone step/chore label — the "next: brush teeth" hint. */
  nextLabel: string | null;
  routineName: string | null;
  /** Glanceable state: in Anchor, on a Reset Day, done, mid-day, waiting for a routine
   *  window to open ("upcoming"), or nothing due. */
  state: "anchor" | "reset" | "done" | "active" | "upcoming" | "idle";
  hasTasks: boolean;
  /** When the day's routine is time-locked and nothing else is doable yet, a friendly
   *  "opens in 1h 20m" / "opens at 7:00 AM" hint for the hub card (§6.4). */
  opensLabel: string | null;
};

/** Household-wide chore progress for today — the cooperative teamwork meter
 *  (Kiosk Overhaul §8.2), never a leaderboard. */
export function familyChoreProgress(s: KioskState): { done: number; total: number; pct: number } {
  const snap = s.snapshot;
  // Progress is WRITTEN under the trusted family-tz service day (useKiosk) — read the
  // same key, and evaluate chore days in the family tz, so hub and spoke agree.
  const today = serviceDay(s);
  const tz = tzOf(s);
  const ids = new Set(snap.children.map((c) => c.id));
  let total = 0;
  let done = 0;
  for (const c of snap.children) {
    const prog = s.progress[c.id]?.date === today ? s.progress[c.id].completed : [];
    const chores = (snap.chores ?? []).filter(
      (ch) => ch.active && runsToday(ch.days_of_week, tz) && choreAssignee(ch, ids) === c.id,
    );
    total += chores.length;
    done += chores.filter((ch) => prog.includes(ch.id)).length;
  }
  return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

export function childDayStatus(s: KioskState, childId: string): ChildDayStatus {
  const snap = s.snapshot;
  // Same service-day key completions are written under — hub cards match the wall.
  const today = serviceDay(s);
  const prog = s.progress[childId]?.date === today ? s.progress[childId].completed : [];
  const tz = tzOf(s);
  const now = trustedNow(s);

  // The child's primary routine today (ChildView's default = first active, by order) —
  // own OR shared+assigned, through the per-child effective window (P2 §2/§4).
  const routine = snap.routines
    .filter((r) => r.active && routineForChild(r, childId))
    .map((r) => ({ r, eff: effectiveSchedule(r, childId, snap) }))
    .filter(({ eff }) => !eff.disabled && runsToday(eff.days_of_week, tz))
    .sort((a, b) => a.r.sort_order - b.r.sort_order)[0]?.r;
  const routineWindow = routine ? effectiveSchedule(routine, childId, snap) : null;

  const routineSteps = routine
    ? snap.steps
        .filter((st) => st.routine_id === routine.id)
        .sort((a, b) => a.order_index - b.order_index)
    : [];
  const stepList =
    routine?.type === "first_then"
      ? routineSteps.filter((st) => st.step_type === "first" || st.step_type === "then")
      : routineSteps.filter((st) => st.step_type === "task");

  const ids = new Set(snap.children.map((c) => c.id));
  const chores = (snap.chores ?? [])
    .filter((c) => c.active && runsToday(c.days_of_week, tz) && choreAssignee(c, ids) === childId)
    .sort((a, b) => a.sort_order - b.sort_order);

  // Routine time-lock (§6.4): steps behind a closed window aren't doable yet. Chores have
  // no window, so they stay available and keep the card "active".
  const routineLocked = !!routineWindow && !withinWindow(routineWindow, now, tz);

  const items = [
    ...stepList.map((st) => ({ id: st.id, label: st.label, locked: routineLocked })),
    ...chores.map((c) => ({ id: c.id, label: c.title, locked: false })),
  ];
  const total = items.length;
  const done = items.filter((it) => prog.includes(it.id)).length;
  const undone = items.filter((it) => !prog.includes(it.id));
  // Prefer an available-now next; fall back to any undone so the label stays meaningful.
  const nextAvailable = undone.find((it) => !it.locked);
  const next = nextAvailable ?? undone[0];
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const inAnchor = (snap.corners ?? []).some((c) => c.child_id === childId && c.status === "active");
  const onReset = !!activeGroundingFor(snap.groundings, childId);

  // "Everything left is behind a closed window" → the day hasn't started yet, not idle.
  const waiting = routineLocked && undone.length > 0 && !nextAvailable;
  const cw = waiting && routineWindow ? windowCountdown(routineWindow, now, tz) : null;
  const opensLabel = waiting
    ? cw?.untilOpenMin != null
      ? `opens in ${formatCountdown(cw.untilOpenMin)}`
      : routineWindow
        ? opensAtLabel(routineWindow)
        : null
    : null;

  let state: ChildDayStatus["state"];
  if (inAnchor) state = "anchor";
  else if (onReset) state = "reset";
  else if (total === 0) state = "idle";
  else if (done >= total) state = "done";
  else if (waiting) state = "upcoming";
  else state = "active";

  return {
    total,
    done,
    pct,
    nextLabel: next?.label ?? null,
    routineName: routine?.name ?? null,
    state,
    hasTasks: total > 0,
    opensLabel,
  };
}
