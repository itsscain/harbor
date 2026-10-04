import type { Course, GradeId, Lesson, SubjectId, Unit } from "./types";
import { gradeIndex } from "./types";
import { READING } from "./reading";
import { CODE } from "./code";
import { MATH } from "./math";

// One index over every course: look lessons up by id, find a kid's starting point by grade,
// and decide what's unlocked.

export const COURSES: Record<SubjectId, Course> = { reading: READING, code: CODE, math: MATH };
export const SUBJECTS: SubjectId[] = ["reading", "code", "math"];

/** Kid-facing look for each subject (island colors on the Learn map). */
export const SUBJECT_LOOK: Record<SubjectId, { from: string; to: string; ink: string; island: string }> = {
  reading: { from: "#FFB86B", to: "#FF7A59", ink: "#7A2E12", island: "📖" },
  code: { from: "#7CE0C3", to: "#2BB3A3", ink: "#0B4A44", island: "🧩" },
  math: { from: "#A89BFF", to: "#6E5BFF", ink: "#2A1F7A", island: "🔢" },
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

/** Where a kid starts in a course: about one grade below theirs, so it begins easy. */
export function startUnitIndex(subject: SubjectId, grade: GradeId): number {
  const units = COURSES[subject].units;
  const g = gradeIndex(grade);
  if (g <= 1) return 0;
  const i = units.findIndex((u) => gradeIndex(u.grade) >= g - 1);
  // Past the end of a course (e.g. math for a 3rd grader): start at its last unit.
  return i < 0 ? units.length - 1 : i;
}

export type LessonState = "done" | "next" | "open" | "locked";

/** Lesson-by-lesson map state for one course: what's done, open, the very next one, locked. */
export function courseMap(
  subject: SubjectId,
  grade: GradeId,
  done: (lessonId: string) => boolean,
  assigned: Set<string>,
): { unit: Unit; unlocked: boolean; lessons: { lesson: Lesson; state: LessonState }[] }[] {
  const units = COURSES[subject].units;
  const start = startUnitIndex(subject, grade);
  let nextFound = false;
  let prevUnitDone = true;
  return units.map((unit, ui) => {
    const unitHasProgress = unit.lessons.some((l) => done(l.id) || assigned.has(l.id));
    const unlocked = ui <= start || prevUnitDone || unitHasProgress;
    let prevLessonDone = true;
    const lessons = unit.lessons.map((lesson, li) => {
      const isDone = done(lesson.id);
      let state: LessonState;
      if (isDone) state = "done";
      else if (unlocked && (ui < start || li === 0 || prevLessonDone || assigned.has(lesson.id))) state = "open";
      else state = "locked";
      if (state === "open" && !nextFound && ui >= start) {
        state = "next";
        nextFound = true;
      }
      prevLessonDone = isDone;
      return { lesson, state };
    });
    prevUnitDone = lessons.every((l) => l.state === "done");
    return { unit, unlocked, lessons };
  });
}

/** The single "play this next" lesson for a subject (assignments first). */
export function nextLessonFor(subject: SubjectId, grade: GradeId, done: (id: string) => boolean, assignedIds: string[]): Lesson | null {
  const assigned = assignedIds.map(lessonById).find((l) => l && l.subject === subject && !done(l.id));
  if (assigned) return assigned;
  for (const u of courseMap(subject, grade, done, new Set(assignedIds))) for (const l of u.lessons) if (l.state === "next") return l.lesson;
  return null;
}
