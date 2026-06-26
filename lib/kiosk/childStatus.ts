// Per-child day status — the shared read behind the FAMILY hub's aura cards and the
// AMBIENT glance dots (Kiosk Overhaul §5.4 / §6.2). Pure; derives the same routine +
// chore progress ChildView shows, so the hub and the spoke never disagree.

import type { KioskState } from "./types";
import { todayKey } from "./db";
import { runsToday } from "./calendar";
import { choreAssignee } from "./chores";
import { activeGroundingFor } from "./grounding";

export type ChildDayStatus = {
  total: number;
  done: number;
  pct: number;
  /** Next undone step/chore label — the "next: brush teeth" hint. */
  nextLabel: string | null;
  routineName: string | null;
  /** Glanceable state: in Anchor, on a Reset Day, done, mid-day, or nothing due. */
  state: "anchor" | "reset" | "done" | "active" | "idle";
  hasTasks: boolean;
};

/** Household-wide chore progress for today — the cooperative teamwork meter
 *  (Kiosk Overhaul §8.2), never a leaderboard. */
export function familyChoreProgress(s: KioskState): { done: number; total: number; pct: number } {
  const snap = s.snapshot;
  const today = todayKey();
  const ids = new Set(snap.children.map((c) => c.id));
  let total = 0;
  let done = 0;
  for (const c of snap.children) {
    const prog = s.progress[c.id]?.date === today ? s.progress[c.id].completed : [];
    const chores = (snap.chores ?? []).filter(
      (ch) => ch.active && runsToday(ch.days_of_week) && choreAssignee(ch, ids) === c.id,
    );
    total += chores.length;
    done += chores.filter((ch) => prog.includes(ch.id)).length;
  }
  return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

export function childDayStatus(s: KioskState, childId: string): ChildDayStatus {
  const snap = s.snapshot;
  const today = todayKey();
  const prog = s.progress[childId]?.date === today ? s.progress[childId].completed : [];

  // The child's primary routine today (ChildView's default = first active, by order).
  const routine = snap.routines
    .filter((r) => r.child_id === childId && r.active && runsToday(r.days_of_week))
    .sort((a, b) => a.sort_order - b.sort_order)[0];

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
    .filter((c) => c.active && runsToday(c.days_of_week) && choreAssignee(c, ids) === childId)
    .sort((a, b) => a.sort_order - b.sort_order);

  const items = [
    ...stepList.map((st) => ({ id: st.id, label: st.label })),
    ...chores.map((c) => ({ id: c.id, label: c.title })),
  ];
  const total = items.length;
  const done = items.filter((it) => prog.includes(it.id)).length;
  const next = items.find((it) => !prog.includes(it.id));
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const inAnchor = (snap.corners ?? []).some((c) => c.child_id === childId && c.status === "active");
  const onReset = !!activeGroundingFor(snap.groundings, childId);

  let state: ChildDayStatus["state"];
  if (inAnchor) state = "anchor";
  else if (onReset) state = "reset";
  else if (total === 0) state = "idle";
  else if (done >= total) state = "done";
  else state = "active";

  return {
    total,
    done,
    pct,
    nextLabel: next?.label ?? null,
    routineName: routine?.name ?? null,
    state,
    hasTasks: total > 0,
  };
}
