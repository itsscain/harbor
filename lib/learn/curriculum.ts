import type { Activity, Course, GradeId, Lesson, SubjectId, Unit } from "./types";
import { GRADES, gradeIndex } from "./types";
import { READING } from "./reading";
import { MATH } from "./math";
import { CODE } from "./code";
import { MANNERS } from "./manners";
import { FAITH } from "./faith";
import { SCIENCE } from "./science";
import { pickReview, SKILL_PREFIX, type Skills } from "./mastery";
import { rng, shuffle } from "./gen";

// One index over every course: look lessons up, place a child by grade, draw the voyage map
// (worlds of numbered levels, each unlocked by passing the one before), and build the "double
// back" practice that brings shaky skills around again.

export const COURSES: Record<SubjectId, Course> = { reading: READING, math: MATH, code: CODE, science: SCIENCE, manners: MANNERS, faith: FAITH };
export const SUBJECTS: SubjectId[] = ["reading", "math", "code", "science", "manners", "faith"];
/** What a child gets before a grown-up chooses: every course, Lighthouse (faith) included. A
 *  parent can still switch any course off for a child. */
export const DEFAULT_SUBJECTS: SubjectId[] = ["reading", "math", "code", "science", "manners", "faith"];
export const isSubject = (s: unknown): s is SubjectId => typeof s === "string" && (SUBJECTS as string[]).includes(s);

/** Kid-facing look for each subject. */
export const SUBJECT_LOOK: Record<SubjectId, { name: string; from: string; to: string; ink: string; island: string }> = {
  reading: { name: "Reading", from: "#FFB86B", to: "#FF7A59", ink: "#7A2E12", island: "📖" },
  math: { name: "Math", from: "#A89BFF", to: "#6E5BFF", ink: "#2A1F7A", island: "🔢" },
  code: { name: "Code", from: "#7CE0C3", to: "#2BB3A3", ink: "#0B4A44", island: "🧩" },
  science: { name: "Discovery", from: "#9BE15D", to: "#22A06B", ink: "#0E4429", island: "🔬" },
  manners: { name: "Captain's Code", from: "#FFD66B", to: "#F2A93B", ink: "#6B4206", island: "⚓" },
  faith: { name: "Lighthouse", from: "#8AD4FF", to: "#4A6CF7", ink: "#0E2A6B", island: "🕊️" },
};

const LESSON_BY_ID = new Map<string, Lesson>();
const UNIT_BY_ID = new Map<string, Unit>();
for (const course of Object.values(COURSES))
  for (const u of course.units) {
    UNIT_BY_ID.set(u.id, u);
    for (const l of u.lessons) LESSON_BY_ID.set(l.id, l);
  }

export const lessonById = (id: string) => LESSON_BY_ID.get(id) ?? null;
export const unitById = (id: string) => UNIT_BY_ID.get(id) ?? null;
export const allLessons = () => [...LESSON_BY_ID.values()];
/** "World-level", e.g. "3-4". */
export const levelLabel = (l: Lesson) => `${unitById(l.unit)?.n ?? 1}-${l.n}`;
export const isPractice = (id: string) => id.startsWith("practice:");
export const gradeLabel = (g: GradeId) => GRADES.find((x) => x.id === g)?.short ?? g;

/** Where a child starts in a course: one grade below theirs, so it begins with a win
 *  (Pre-K and K start at the very beginning). Earlier worlds stay open for review. */
export function startUnitIndex(subject: SubjectId, grade: GradeId): number {
  const units = COURSES[subject].units;
  const g = gradeIndex(grade);
  if (g <= 1) return 0;
  const i = units.findIndex((u) => gradeIndex(u.grade) >= g - 1);
  return i < 0 ? Math.max(0, units.length - 1) : i;
}

/** Lessons fit for a grade (for parents assigning): from a grade below to a grade above. */
export function lessonsForGrade(subject: SubjectId, grade: GradeId, spread = 1): Unit[] {
  const g = gradeIndex(grade);
  return COURSES[subject].units.filter((u) => Math.abs(gradeIndex(u.grade) - g) <= spread || (g <= 1 && gradeIndex(u.grade) <= 1));
}

/** A lesson is passed with at least 1 star (60%+ right on the first try). */
export const PASS_STARS = 1;

export type LessonState = "done" | "next" | "open" | "locked";
export type MapLesson = { lesson: Lesson; state: LessonState; stars: number; played: boolean; assigned: boolean; label: string };
export type MapUnit = { unit: Unit; unlocked: boolean; complete: boolean; stars: number; maxStars: number; review: boolean; lessons: MapLesson[] };

/**
 * The voyage map for one course. `best(id)` = best stars for a lesson, or null if never played.
 * Worlds before the child's starting point are open (review); from there on, each level opens
 * when the one before it is passed, and each world when the last one is complete — or when its
 * boss is beaten early ("testing out", for a child who already knows it). Assigned lessons are
 * always open.
 */
export function courseMap(subject: SubjectId, grade: GradeId, best: (lessonId: string) => number | null, assigned: Set<string>): MapUnit[] {
  const units = COURSES[subject].units;
  const start = startUnitIndex(subject, grade);
  let nextFound = false;
  let prevComplete = true;
  return units.map((unit, ui) => {
    const review = ui < start;
    const touched = unit.lessons.some((l) => best(l.id) !== null || assigned.has(l.id));
    const unlocked = review || ui === start || prevComplete || touched;
    // Testing out: beating an island's boss counts as finishing the island (the rest stay open).
    const testedOut = unit.lessons.some((l) => l.kind === "boss" && (best(l.id) ?? 0) >= PASS_STARS);
    let prevPassed = true;
    let stars = 0;
    const lessons = unit.lessons.map((lesson, li) => {
      const b = best(lesson.id);
      const passed = (b ?? 0) >= PASS_STARS;
      const isAssigned = assigned.has(lesson.id);
      let state: LessonState;
      if (passed) state = "done";
      else if (isAssigned || testedOut || (unlocked && (review || li === 0 || prevPassed))) state = "open";
      else state = "locked";
      if (state === "open" && !nextFound && !review && !testedOut) {
        state = "next";
        nextFound = true;
      }
      prevPassed = passed;
      stars += Math.max(0, b ?? 0);
      return { lesson, state, stars: Math.max(0, b ?? 0), played: b !== null, assigned: isAssigned, label: `${unit.n}-${lesson.n}` };
    });
    const complete = testedOut || lessons.every((l) => l.state === "done");
    if (!review) prevComplete = complete;
    return { unit, unlocked, complete, stars, maxStars: unit.lessons.length * 3, review, lessons };
  });
}

/** The one "play this next" lesson for a subject (an assignment first). */
export function nextLessonFor(subject: SubjectId, grade: GradeId, best: (id: string) => number | null, assignedIds: string[]): Lesson | null {
  const assigned = assignedIds.map(lessonById).find((l) => l && l.subject === subject && (best(l.id) ?? 0) < PASS_STARS);
  if (assigned) return assigned;
  for (const u of courseMap(subject, grade, best, new Set(assignedIds))) for (const l of u.lessons) if (l.state === "next") return l.lesson;
  return null;
}

/** How far along a course a child is: the world they're in and levels passed. */
export function courseProgress(subject: SubjectId, grade: GradeId, best: (id: string) => number | null) {
  const map = courseMap(subject, grade, best, new Set());
  const current = map.find((u) => u.lessons.some((l) => l.state === "next")) ?? map[map.length - 1];
  const fromStart = map.filter((u) => !u.review);
  const passed = fromStart.reduce((n, u) => n + u.lessons.filter((l) => l.state === "done").length, 0);
  const total = fromStart.reduce((n, u) => n + u.lessons.length, 0);
  return { current: current?.unit ?? null, passed, total, stars: map.reduce((n, u) => n + u.stars, 0) };
}

// ── Doubling back ────────────────────────────────────────────────────────────────────────────

/** Fresh items for a list of skills, a few per skill, mixed. */
export function itemsForSkills(subject: SubjectId, skills: string[], perSkill: number, seed: string, cap: number): Activity[] {
  const course = COURSES[subject];
  if (!course.itemsFor) return [];
  const out: Activity[] = [];
  const seen = new Set<string>();
  for (const s of skills)
    for (const a of course.itemsFor(s, perSkill, `${seed}:${s}`)) {
      const k = JSON.stringify(a);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ ...a, skill: a.skill ?? s });
    }
  return shuffle(rng(seed), out).slice(0, cap);
}

/**
 * A Practice Cove lesson: the skills a child just missed (focus) plus whatever is shaky or due
 * across the subject, a couple of fresh items each. Null when there's nothing worth practicing.
 */
export function practiceLesson(subject: SubjectId, skills: Skills, o: { focus?: string[]; seed: string; now: number; n?: number }): Lesson | null {
  const n = o.n ?? 6;
  const focus = (o.focus ?? []).filter((s) => s.startsWith(subjectPrefix(subject)));
  const more = pickReview(skills, { subject, n: Math.max(0, n - focus.length), now: o.now, exclude: new Set(focus) });
  const picked = [...new Set([...focus, ...more])];
  if (!picked.length) return null;
  const acts = itemsForSkills(subject, picked, focus.length ? 2 : 1, o.seed, n + 1);
  if (acts.length < 3) return null;
  return {
    id: `practice:${subject}:${o.seed}`,
    subject,
    unit: `practice:${subject}`,
    n: 1,
    kind: "practice",
    title: "Practice Cove",
    emoji: "🏝️",
    activities: acts,
    skills: [...new Set(acts.map((a) => a.skill!).filter(Boolean))],
  };
}

/** Skills due (or shaky) across a child's subjects — what a Brain Boost would bring back. Code is
 *  left out (its puzzles are long builds, not quick recall). */
export function boostSkills(subjects: SubjectId[], skills: Skills, now: number, per = 3): { subject: SubjectId; skill: string }[] {
  return subjects.filter((s) => s !== "code").flatMap((s) => pickReview(skills, { subject: s, n: per, now }).map((skill) => ({ subject: s, skill })));
}

/**
 * Brain Boost: a quick, mixed review of what's due or shaky in EVERY subject — a verse, a math
 * fact, a sight word, a story, a manners choice — shuffled together. Interleaving different kinds
 * of problems (instead of practicing one kind in a block) feels harder and works better: it's one
 * of the most reliable findings in learning science. Null when nothing is due.
 */
export function mixedPractice(subjects: SubjectId[], skills: Skills, o: { seed: string; now: number; n?: number }): Lesson | null {
  const n = o.n ?? 8;
  const picked = boostSkills(subjects, skills, o.now, Math.max(2, Math.ceil(n / Math.max(1, subjects.length)) + 1));
  const bySubject = new Map<SubjectId, Activity[]>();
  for (const p of picked) {
    const [item] = itemsForSkills(p.subject, [p.skill], 1, `${o.seed}:${p.skill}`, 1);
    if (item) bySubject.set(p.subject, [...(bySubject.get(p.subject) ?? []), item]);
  }
  // Round-robin across subjects so no two neighbors are the same kind of problem.
  const queues = [...bySubject.values()];
  const acts: Activity[] = [];
  for (let k = 0; acts.length < n && queues.some((q) => q.length); k++) {
    const q = queues[k % queues.length];
    const a = q.shift();
    if (a) acts.push(a);
  }
  if (acts.length < 3) return null;
  const counts = new Map<SubjectId, number>();
  for (const a of acts) {
    const s = picked.find((p) => p.skill === a.skill)?.subject;
    if (s) counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  const subject = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? subjects[0];
  return {
    id: `practice:mix:${o.seed}`,
    subject,
    unit: "practice:mix",
    n: 1,
    kind: "practice",
    title: "Brain Boost",
    emoji: "⚡",
    activities: acts,
    skills: [...new Set(acts.map((a) => a.skill!).filter(Boolean))],
  };
}

/** Review items to weave into a lesson ("treasure from before"): due or shaky skills the lesson
 *  doesn't already cover. */
export function spiralItems(lesson: Lesson, skills: Skills, now: number, n: number): Activity[] {
  if (lesson.kind === "practice" || lesson.subject === "code" || n <= 0) return [];
  const due = pickReview(skills, { subject: lesson.subject, n, now, exclude: new Set(lesson.skills) });
  if (!due.length) return [];
  return itemsForSkills(lesson.subject, due, 1, `spiral:${lesson.id}:${new Date(now).toISOString().slice(0, 10)}`, n);
}

const subjectPrefix = (s: SubjectId) => SKILL_PREFIX[s];

/** Lesson title for any id (practice lessons aren't in the index). */
export function lessonTitle(id: string): string {
  const l = lessonById(id);
  if (l) return `${levelLabel(l)} ${l.title}`;
  if (id.startsWith("practice:mix")) return "Brain Boost";
  if (isPractice(id)) return "Practice Cove";
  return "Lesson";
}
