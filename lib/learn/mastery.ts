import type { LearnResult, SubjectId } from "./types";

// The learning engine's memory. For every skill a child practices (a letter sound, a sight word,
// 7 + 5, "loops", "saying sorry"…) it keeps how often they got it right on the FIRST try, when it
// was last seen, and the outcome of the last few sessions (newest first: "1" = all right,
// "0" = missed something). From that:
//   • a Leitner box 0–5 (how many sessions in a row it's been solid) → spaced repetition: a skill
//     comes back after 0, 1, 2, 4, 9, 20 days, so it's reviewed just as it starts to fade;
//   • "shaky" = missed last time, or right less than 70% of the time → the lesson player doubles
//     back on it (review items mixed into lessons, and a Practice Cove detour when it piles up);
//   • "mastered" = 3+ solid sessions in a row.
// Skill keys are namespaced by subject: "r:" reading, "m:" math, "c:" code, "h:" manners,
// "f:" Lighthouse (faith — memory verses are "f:verse:<id>", so they're spaced like any skill).

export type SkillStat = { right: number; total: number; last: string | null; recent: string };
export type Skills = Record<string, SkillStat>;

export const INTERVAL_DAYS = [0, 1, 2, 4, 9, 20];
const DAY = 86_400_000;

export const SKILL_PREFIX: Record<SubjectId, string> = { reading: "r:", math: "m:", code: "c:", manners: "h:", faith: "f:", science: "s:" };
export function skillSubject(skill: string): SubjectId | null {
  if (skill.startsWith("r:")) return "reading";
  if (skill.startsWith("m:")) return "math";
  if (skill.startsWith("c:")) return "code";
  if (skill.startsWith("h:")) return "manners";
  if (skill.startsWith("f:")) return "faith";
  if (skill.startsWith("s:")) return "science";
  return null;
}

export function boxOf(s: SkillStat): number {
  let n = 0;
  for (const c of s.recent) {
    if (c !== "1") break;
    n++;
  }
  return Math.min(5, n);
}

export function isShaky(s: SkillStat): boolean {
  if (!s.total) return false;
  if (s.recent.startsWith("0")) return true;
  return s.total >= 4 && s.right / s.total < 0.7;
}

export const isMastered = (s: SkillStat) => boxOf(s) >= 3 && s.total >= 3;

/** Days until this skill is due for review (≤ 0 = due now). */
export function dueIn(s: SkillStat, now: number): number {
  if (!s.last) return 0;
  const since = (now - new Date(s.last).getTime()) / DAY;
  return INTERVAL_DAYS[boxOf(s)] - since;
}

/** Server stats + lessons finished here that haven't synced, oldest first. */
export function mergeSkills(base: Record<string, [number, number, string | null, string]> | undefined, pending: LearnResult[]): Skills {
  const out: Skills = {};
  for (const [k, [right, total, last, recent]] of Object.entries(base ?? {})) out[k] = { right, total, last, recent: recent ?? "" };
  const sorted = [...pending].sort((a, b) => a.completed_at.localeCompare(b.completed_at));
  for (const r of sorted)
    for (const [k, [right, total]] of Object.entries(r.skills ?? {})) {
      const cur = out[k] ?? { right: 0, total: 0, last: null, recent: "" };
      out[k] = { right: cur.right + right, total: cur.total + total, last: r.completed_at, recent: ((right === total ? "1" : "0") + cur.recent).slice(0, 6) };
    }
  return out;
}

/** Skills to bring back now, most urgent first: shaky ones (missed most recently), then the
 *  most overdue. Only skills the child has actually met. */
export function pickReview(skills: Skills, opts: { subject: SubjectId; n: number; now: number; exclude?: Set<string> }): string[] {
  const prefix = SKILL_PREFIX[opts.subject];
  const cands = Object.entries(skills).filter(([k, s]) => k.startsWith(prefix) && s.total > 0 && !opts.exclude?.has(k));
  const scored = cands
    .map(([k, s]) => {
      const shaky = isShaky(s);
      const due = dueIn(s, opts.now);
      // shaky first; then how overdue; mastered-and-not-due last
      const score = (shaky ? 1000 : 0) + Math.max(-30, -due) * 10 - boxOf(s);
      return { k, score, eligible: shaky || due <= 0 };
    })
    .filter((c) => c.eligible)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, opts.n).map((c) => c.k);
}

/** How many shaky skills a subject has (drives the Practice Cove detour). */
export function shakyCount(skills: Skills, subject: SubjectId): number {
  const prefix = SKILL_PREFIX[subject];
  return Object.entries(skills).filter(([k, s]) => k.startsWith(prefix) && isShaky(s)).length;
}

/** 0–100 strength for parents. */
export function strength(s: SkillStat): number {
  if (!s.total) return 0;
  const acc = s.right / s.total;
  return Math.round(Math.min(1, acc * 0.6 + (boxOf(s) / 5) * 0.4) * 100);
}
