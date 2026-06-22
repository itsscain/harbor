import type { KioskChore } from "./types";

/** Stable week index since a fixed Monday epoch (1970-01-05 was a Monday).
 *  Built from LOCAL date parts, so it advances at local midnight (matching
 *  todayKey()), not UTC. */
export function weekIndex(d: Date = new Date()): number {
  const ref = Date.UTC(1970, 0, 5);
  const t = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor((t - ref) / (7 * 86_400_000));
}

function members(chore: KioskChore): string[] | null {
  return Array.isArray(chore.rotation_member_ids) && chore.rotation_member_ids.length >= 2
    ? chore.rotation_member_ids
    : null;
}

/** Which child a chore belongs to right now. Rotating chores cycle weekly through
 *  their (still-living) members; everything else is its fixed child_id. Pass the
 *  set of current child ids so a deleted member is skipped instead of leaving the
 *  chore assigned to nobody. */
export function choreAssignee(chore: KioskChore, validIds?: Set<string>, d: Date = new Date()): string {
  const m = members(chore);
  if (m) {
    const live = validIds ? m.filter((id) => validIds.has(id)) : m;
    if (live.length >= 2) return live[((weekIndex(d) % live.length) + live.length) % live.length];
    if (live.length === 1) return live[0];
  }
  return chore.child_id;
}

/** True when the chore rotates between (≥2) kids — for the wall's 🔄 hint. */
export function isRotating(chore: KioskChore): boolean {
  return members(chore) !== null;
}
