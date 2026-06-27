// Medication Station helpers (§4.3). Pure functions over kiosk state + the TRUSTED
// clock (§1.2) so a child can't surface/skip a dose by changing the device time.

import type { KioskMedication, KioskState } from "./types";
import { trustedNow, serviceDay } from "./time";

export const doseId = (medId: string, time: string) => `${medId}:${time}`;

/** Dose ids already taken today for a child — merges local optimistic medProgress with
 *  the synced medication_logs from the snapshot (cross-device + post-refresh truth). */
export function takenDoseSet(state: KioskState, childId: string): Set<string> {
  const day = serviceDay(state);
  const set = new Set<string>();
  const mp = state.medProgress?.[childId];
  if (mp?.date === day) for (const d of mp.completed) set.add(d);
  for (const log of state.snapshot.medication_logs ?? []) {
    if (log.child_id === childId && log.dose_date === day && log.dose_time)
      set.add(doseId(log.medication_id, log.dose_time));
  }
  return set;
}

export type DueDose = { med: KioskMedication; time: string };

/** Doses that are due now for a child (scheduled time reached — with a gentle 15-min
 *  lead — and not yet taken today). Calm prompt, never an alarm. */
export function dueDoses(state: KioskState, childId: string): DueDose[] {
  const now = new Date(trustedNow(state));
  const dow = now.getDay();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const taken = takenDoseSet(state, childId);
  const meds = (state.snapshot.medications ?? []).filter((m) => m.child_id === childId && m.active);
  const out: DueDose[] = [];
  for (const m of meds) {
    if (m.days_of_week && m.days_of_week.length && !m.days_of_week.includes(dow)) continue;
    for (const t of m.schedule_times ?? []) {
      const [hh, mm] = t.split(":").map((n) => Number(n));
      if (!Number.isFinite(hh)) continue;
      const tMin = hh * 60 + (Number.isFinite(mm) ? mm : 0);
      if (nowMin >= tMin - 15 && !taken.has(doseId(m.id, t))) out.push({ med: m, time: t });
    }
  }
  // earliest due first
  return out.sort((a, b) => a.time.localeCompare(b.time));
}

/** True if a child has any medication configured (active) — gates the wall UI. */
export function hasMeds(state: KioskState, childId: string): boolean {
  return (state.snapshot.medications ?? []).some((m) => m.child_id === childId && m.active);
}
