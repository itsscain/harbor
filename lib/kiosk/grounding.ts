import type { KioskGrounding } from "./types";

export type ActiveGrounding = {
  g: KioskGrounding;
  dayNum: number; // 1-based day of the grounding (today)
  total: number; // total grounded days
  daysLeft: number; // days remaining incl. today
  lastDay: boolean;
};

function dateOnly(s: string): number {
  const x = new Date(`${s}T00:00:00`);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

const DAY = 86_400_000;

/** The child's active grounding (if any), with day-by-day progress derived from
 *  the local clock — so it counts down correctly on an always-on wall. */
export function activeGroundingFor(
  groundings: KioskGrounding[] | undefined,
  childId: string,
): ActiveGrounding | null {
  if (!groundings) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const t = today.getTime();
  for (const g of groundings) {
    if (g.child_id !== childId || g.status !== "active") continue;
    const start = dateOnly(g.started_on);
    const end = dateOnly(g.ends_on);
    if (t > end) continue; // fully served → not active anymore
    const total = Math.max(1, Math.round((end - start) / DAY) + 1);
    const dayNum = Math.min(total, Math.max(1, Math.round((t - start) / DAY) + 1));
    const daysLeft = Math.max(0, Math.round((end - t) / DAY) + 1);
    return { g, dayNum, total, daysLeft, lastDay: daysLeft <= 1 };
  }
  return null;
}
