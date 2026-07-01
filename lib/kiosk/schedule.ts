// Family-wide scheduling (Routines & App P2 §2/§4) — the per-child resolution seam.
// A routine's schedule for a child resolves in order: per-child override (time offset /
// disable) → the referenced schedule template → the routine's own fields. Pure functions
// over the snapshot, so the kiosk and the hub can never disagree; the result is a plain
// { start_time, end_time, days_of_week } object every calendar.ts helper already accepts.

import type { KioskRoutine, KioskSnapshot } from "./types";

export type EffectiveSchedule = {
  start_time: string | null;
  end_time: string | null;
  days_of_week: number[] | null;
  /** The parent disabled this shared routine for this child (§2.3). */
  disabled: boolean;
};

/** Whether a routine belongs on `childId`'s wall — their own, or shared + assigned (§2.1). */
export function routineForChild(r: KioskRoutine, childId: string): boolean {
  if (r.scope === "shared") return (r.assigned_child_ids ?? []).includes(childId);
  return r.child_id === childId;
}

/** "HH:MM[:SS]" + offset minutes → "HH:MM", wrapped within the day. */
export function shiftClock(t: string, offsetMin: number): string {
  const [h, m] = t.split(":").map((n) => Number(n));
  const total =
    ((((Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0) + Math.round(offsetMin)) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** The child's effective window for a routine (§4: override → template → own schedule). */
export function effectiveSchedule(
  r: KioskRoutine,
  childId: string | null,
  snap: Pick<KioskSnapshot, "schedule_templates" | "routine_child_overrides">,
): EffectiveSchedule {
  const tpl = r.schedule_template_id
    ? (snap.schedule_templates ?? []).find((t) => t.id === r.schedule_template_id)
    : undefined;
  // A referenced template owns the whole window (start/end/days) — edit it once,
  // every routine pointing at it moves together (§2.2).
  let start = tpl ? tpl.start_time : r.start_time;
  let end = tpl ? tpl.end_time : r.end_time;
  const days = (tpl ? tpl.days_of_week : r.days_of_week) ?? null;
  const ov = childId
    ? (snap.routine_child_overrides ?? []).find((o) => o.routine_id === r.id && o.child_id === childId)
    : undefined;
  if (ov?.time_offset_min) {
    if (start) start = shiftClock(start, ov.time_offset_min);
    if (end) end = shiftClock(end, ov.time_offset_min);
  }
  return {
    start_time: start ?? null,
    end_time: end ?? null,
    days_of_week: days,
    disabled: ov ? !ov.enabled : false,
  };
}
