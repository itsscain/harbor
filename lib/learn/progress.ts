import type { LearnResult, LessonProgress, SubjectId } from "./types";

// A kid's Learn progress, merged from what the server knows and what this screen finished but
// hasn't synced yet — so stars, streaks and stickers are right even offline.

/** What rpc_learn_sync returns. */
export type LearnSnapshot = {
  profiles: { child_id: string; grade: string; subjects: string[]; daily_goal: number; earn_stars: boolean }[];
  assignments: { id: string; child_id: string; lesson_id: string; note: string | null; created_at: string }[];
  kids: Record<string, { lessons: Record<string, [number, number, string]>; stickers: Record<string, number>; days: string[]; xp: number; today?: number }>;
  server_time?: string;
};

export type KidLearn = {
  lessons: Record<string, LessonProgress>;
  stickers: Record<string, number>;
  xp: number;
  level: number;
  levelName: string;
  xpInLevel: number;
  xpPerLevel: number;
  streak: number;
  todayCount: number;
  doneToday: boolean;
  days: string[];
};

const LEVEL_NAMES = ["Deckhand", "Sailor", "Navigator", "First Mate", "Captain", "Admiral", "Sea Legend"];
export const XP_PER_LEVEL = 150;
export const levelOf = (xp: number) => Math.floor(xp / XP_PER_LEVEL) + 1;
export const levelName = (level: number) => LEVEL_NAMES[Math.min(LEVEL_NAMES.length - 1, Math.max(0, level - 1))];
export const xpFor = (stars: number) => 10 + 5 * Math.max(0, Math.min(3, stars));

const addDays = (key: string, n: number) => {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Consecutive days with a lesson, ending today — or yesterday (a streak isn't lost until a full day is missed). */
export function streakFrom(days: string[], todayKey: string): number {
  const set = new Set(days);
  let cur = set.has(todayKey) ? todayKey : set.has(addDays(todayKey, -1)) ? addDays(todayKey, -1) : null;
  let n = 0;
  while (cur && set.has(cur)) {
    n++;
    cur = addDays(cur, -1);
  }
  return n;
}

export function mergeKid(
  snap: LearnSnapshot | null | undefined,
  childId: string,
  pending: LearnResult[],
  todayKey: string,
  dayOf: (iso: string) => string,
): KidLearn {
  const base = snap?.kids?.[childId];
  const lessons: Record<string, LessonProgress> = {};
  for (const [id, [stars, plays, last]] of Object.entries(base?.lessons ?? {})) lessons[id] = { stars, plays, last };
  const stickers: Record<string, number> = { ...(base?.stickers ?? {}) };
  const days = new Set(base?.days ?? []);
  let xp = base?.xp ?? 0;
  // Lessons finished today: the server's count (replays included), else estimated from each
  // lesson's last play — plus anything finished here that hasn't synced yet.
  const serverToday = base?.today !== undefined && snap?.server_time && dayOf(snap.server_time) === todayKey ? base.today : null;
  let todayCount = serverToday ?? Object.values(lessons).filter((l) => dayOf(l.last) === todayKey).length;

  for (const r of pending.filter((p) => p.child_id === childId)) {
    const cur = lessons[r.lesson_id];
    lessons[r.lesson_id] = { stars: Math.max(cur?.stars ?? 0, r.stars), plays: (cur?.plays ?? 0) + 1, last: r.completed_at };
    if (r.sticker) stickers[r.sticker] = (stickers[r.sticker] ?? 0) + 1;
    days.add(dayOf(r.completed_at));
    xp += xpFor(r.stars);
    if (dayOf(r.completed_at) === todayKey) todayCount++;
  }

  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const sorted = [...days].sort().reverse();
  return {
    lessons,
    stickers,
    xp,
    level,
    levelName: LEVEL_NAMES[Math.min(LEVEL_NAMES.length - 1, level - 1)],
    xpInLevel: xp % XP_PER_LEVEL,
    xpPerLevel: XP_PER_LEVEL,
    streak: streakFrom(sorted, todayKey),
    todayCount,
    doneToday: days.has(todayKey),
    days: sorted,
  };
}

/** Stars for an activity-based lesson from how many tries it took. */
export function lessonStars(mistakes: number, total: number): number {
  if (total <= 0) return 1;
  const rate = mistakes / total;
  return rate === 0 ? 3 : rate <= 0.34 ? 2 : 1;
}

export const subjectOfLesson = (id: string): SubjectId => (id.startsWith("code.") ? "code" : id.startsWith("math.") ? "math" : "reading");
