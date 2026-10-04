import type { LearnResult, LessonProgress, SubjectId } from "./types";
import { mergeSkills, type Skills } from "./mastery";
import { DEFAULT_LOOK, STARTER_ITEMS, TITLES, lookFrom, type BoatLook } from "./meta";

// A kid's Learn progress, merged from what the server knows and what this screen finished but
// hasn't synced yet — so stars, streaks, shells, stickers and skills are right even offline.

/** A shell/shop/chest event (the wall's Learn ledger). */
export type LearnEvent = {
  op_id: string;
  child_id: string;
  /** earn: chest/fish/set bonus · spend: shop purchase · look: boat change · daily: daily chest ·
   *  collect: an egg hatched ("hatch:<egg>", data {creature, xp}) or a reef buddy picked
   *  ("buddy:<creature>") · best: a Brain Gym record ("gym:<game>", amount = score). */
  type: "earn" | "spend" | "look" | "daily" | "collect" | "best";
  amount?: number;
  item?: string;
  reason?: string;
  look?: BoatLook;
  data?: { creature?: string; xp?: number };
  at: string;
};

/** A hatched egg: which creature came out, and the child's XP at that moment (it grows from there). */
export type Hatch = { egg: string; creature: string; xp: number; at: string };

/** What rpc_learn_sync returns. */
export type LearnSnapshot = {
  profiles: { child_id: string; grade: string; subjects: string[]; daily_goal: number; earn_stars: boolean; daily_limit?: number }[];
  assignments: { id: string; child_id: string; lesson_id: string; note: string | null; created_at: string }[];
  kids: Record<
    string,
    {
      lessons: Record<string, [number, number, string]>;
      stickers: Record<string, number>;
      days: string[];
      xp: number;
      today?: number;
      skills?: Record<string, [number, number, string | null, string]>;
      shells?: number;
      owned?: string[];
      look?: unknown;
      daily?: string | null;
      /** [item, data, at] for every "collect" event, oldest first. */
      collected?: [string, { creature?: string; xp?: number } | null, string][];
      bests?: Record<string, number>;
      /** Brain Gym rounds that paid shells today (family day). */
      gym_today?: number;
    }
  >;
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
  skills: Skills;
  shells: number;
  owned: Set<string>;
  look: BoatLook;
  /** The family-day the daily chest was last opened. */
  dailyChest: string | null;
  /** Eggs hatched into reef creatures. */
  hatched: Hatch[];
  /** The reef creature riding along in lessons. */
  buddy: string | null;
  /** Brain Gym personal bests by game. */
  bests: Record<string, number>;
  /** Brain Gym rounds that paid shells today. */
  gymToday: number;
};

export const XP_PER_LEVEL = 150;
export const xpFor = (stars: number) => 10 + 5 * Math.max(0, Math.min(3, stars));
export const levelOf = (xp: number) => Math.floor(xp / XP_PER_LEVEL) + 1;
export const levelName = (level: number) => TITLES[Math.min(TITLES.length - 1, Math.max(0, level - 1))];

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
  events: LearnEvent[] = [],
): KidLearn {
  const base = snap?.kids?.[childId];
  const lessons: Record<string, LessonProgress> = {};
  for (const [id, [stars, plays, last]] of Object.entries(base?.lessons ?? {})) lessons[id] = { stars, plays, last };
  const stickers: Record<string, number> = { ...(base?.stickers ?? {}) };
  const days = new Set(base?.days ?? []);
  let xp = base?.xp ?? 0;
  let shells = base?.shells ?? 0;
  const owned = new Set<string>([...STARTER_ITEMS, ...(base?.owned ?? [])]);
  let look = lookFrom(base?.look ?? DEFAULT_LOOK);
  let dailyChest = base?.daily ?? null;
  const hatched: Hatch[] = [];
  let buddy: string | null = null;
  const bests: Record<string, number> = { ...(base?.bests ?? {}) };
  const serverGym = base?.gym_today !== undefined && snap?.server_time && dayOf(snap.server_time) === todayKey ? base.gym_today : 0;
  let gymToday = serverGym ?? 0;
  const collect = (item: string, data: { creature?: string; xp?: number } | null | undefined, at: string) => {
    if (item.startsWith("hatch:") && data?.creature && !hatched.some((h) => h.egg === item.slice(6))) hatched.push({ egg: item.slice(6), creature: data.creature, xp: Math.max(0, Number(data.xp) || 0), at });
    if (item.startsWith("buddy:")) buddy = item.slice(6) || null;
  };
  for (const [item, data, at] of base?.collected ?? []) collect(item, data, at);
  const serverToday = base?.today !== undefined && snap?.server_time && dayOf(snap.server_time) === todayKey ? base.today : null;
  let todayCount = serverToday ?? Object.values(lessons).filter((l) => dayOf(l.last) === todayKey).length;

  const mine = pending.filter((p) => p.child_id === childId);
  for (const r of mine) {
    const cur = lessons[r.lesson_id];
    lessons[r.lesson_id] = { stars: Math.max(cur?.stars ?? 0, r.stars), plays: (cur?.plays ?? 0) + 1, last: r.completed_at };
    if (r.sticker) stickers[r.sticker] = (stickers[r.sticker] ?? 0) + 1;
    days.add(dayOf(r.completed_at));
    xp += xpFor(r.stars);
    shells += r.shells ?? 0;
    if (dayOf(r.completed_at) === todayKey) todayCount++;
  }
  for (const e of events.filter((x) => x.child_id === childId)) {
    if (e.type === "earn" || e.type === "daily") shells += e.amount ?? 0;
    if (e.type === "spend") {
      shells -= e.amount ?? 0;
      if (e.item) owned.add(e.item);
    }
    if (e.type === "look" && e.look) look = lookFrom(e.look);
    if (e.type === "daily") dailyChest = dayOf(e.at);
    if (e.type === "earn" && e.item?.startsWith("sticker:")) {
      const id = e.item.slice(8);
      stickers[id] = (stickers[id] ?? 0) + 1;
    }
    if (e.type === "collect" && e.item) collect(e.item, e.data, e.at);
    if (e.type === "best" && e.item?.startsWith("gym:")) bests[e.item.slice(4)] = Math.max(bests[e.item.slice(4)] ?? 0, e.amount ?? 0);
    if (e.type === "earn" && e.reason === "gym" && dayOf(e.at) === todayKey) gymToday++;
  }

  const level = levelOf(xp);
  const sorted = [...days].sort().reverse();
  return {
    lessons,
    stickers,
    xp,
    level,
    levelName: levelName(level),
    xpInLevel: xp % XP_PER_LEVEL,
    xpPerLevel: XP_PER_LEVEL,
    streak: streakFrom(sorted, todayKey),
    todayCount,
    doneToday: days.has(todayKey),
    days: sorted,
    skills: mergeSkills(base?.skills, mine),
    shells: Math.max(0, shells),
    owned,
    look,
    dailyChest,
    hatched,
    buddy,
    bests,
    gymToday,
  };
}

/** Stars from first-try accuracy. Below 60% the level isn't passed yet (0 stars). */
export function starsFor(right: number, total: number): number {
  if (total <= 0) return 1;
  const acc = right / total;
  return acc >= 0.9 ? 3 : acc >= 0.75 ? 2 : acc >= 0.6 ? 1 : 0;
}

export const subjectOfLesson = (id: string): SubjectId =>
  id.startsWith("code.") || id.startsWith("practice:code")
    ? "code"
    : id.startsWith("math.") || id.startsWith("practice:math")
      ? "math"
      : id.startsWith("char.") || id.startsWith("practice:manners")
        ? "manners"
        : id.startsWith("faith.") || id.startsWith("practice:faith")
          ? "faith"
          : "reading";
