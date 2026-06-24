import { todayKey } from "./db";

/** A per-child completion streak (local-first; lives in KioskState). */
export type Streak = { count: number; lastDate: string };

/** Whole days between two YYYY-MM-DD local date keys (b − a). */
function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

/** The streak's *display* value: alive only when the child completed today or
 *  yesterday. Older than that → the streak is broken (0) until they finish today
 *  again. This is computed (not stored) so a missed day quietly resets on its own. */
export function activeStreak(streaks: Record<string, Streak> | undefined, childId: string): number {
  const s = streaks?.[childId];
  if (!s) return 0;
  const diff = dayDiff(s.lastDate, todayKey());
  return diff >= 0 && diff <= 1 ? s.count : 0;
}

/** The streak record after the child completes their day today: +1 if yesterday
 *  was the last completion, reset to 1 on a gap, unchanged if already counted. */
export function nextStreak(cur: Streak | undefined): Streak {
  const today = todayKey();
  if (cur?.lastDate === today) return cur;
  const diff = cur ? dayDiff(cur.lastDate, today) : Infinity;
  return { count: diff === 1 ? cur!.count + 1 : 1, lastDate: today };
}
