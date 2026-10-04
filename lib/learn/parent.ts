import type { SubjectId, LearnProfile, GradeId } from "./types";
import { GRADES, isGrade } from "./types";
import { COURSES, SUBJECTS, SUBJECT_LOOK, courseMap, lessonById } from "./curriculum";
import { levelName, levelOf, streakFrom, xpFor } from "./progress";
import { dayKeyInTz } from "@/lib/tz";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// What a parent sees about a child's Harbor Learn: their settings, the missions they assigned,
// and a plain-English picture of progress built from the lesson results the wall synced.

export type LearnResultRow = {
  id: string;
  lesson_id: string;
  subject: SubjectId;
  stars: number;
  correct: number;
  total: number;
  duration_sec: number;
  sticker: string | null;
  completed_at: string;
};
export type LearnAssignRow = { id: string; lesson_id: string; note: string | null; status: "assigned" | "done"; created_at: string; completed_at: string | null };

export type KidLearnData = {
  profile: LearnProfile;
  /** False until a grown-up saves settings (the grade shown is then a guess from their age). */
  profileSaved: boolean;
  assignments: LearnAssignRow[];
  results: LearnResultRow[];
  tz: string;
};

/** The current time (a helper, so server components can stamp "now" outside render purity rules). */
export const nowDate = () => new Date();

export function gradeLabel(g: GradeId) {
  return GRADES.find((x) => x.id === g)?.label ?? "Kindergarten";
}

/** Grade from age (as of Sept 1, US school year) until a parent picks one. */
export function guessGrade(birthday: string | null | undefined, now = new Date()): GradeId {
  if (!birthday) return "k";
  const b = new Date(`${birthday.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(b.getTime())) return "k";
  const schoolYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  const age = schoolYear - b.getFullYear() - (b.getMonth() > 8 || (b.getMonth() === 8 && b.getDate() > 1) ? 1 : 0);
  return age <= 4 ? "prek" : age === 5 ? "k" : age === 6 ? "1" : age === 7 ? "2" : "3";
}

export async function loadKidLearn(db: SupabaseClient<Database>, kid: { id: string; birthday: string | null }, tz: string): Promise<KidLearnData> {
  const [p, a, r] = await Promise.all([
    db.from("learn_profiles").select("grade, subjects, daily_goal, earn_stars").eq("child_id", kid.id).maybeSingle(),
    db.from("learn_assignments").select("id, lesson_id, note, status, created_at, completed_at").eq("child_id", kid.id).is("deleted_at", null).order("created_at", { ascending: false }).limit(40),
    db.from("learn_results").select("id, lesson_id, subject, stars, correct, total, duration_sec, sticker, completed_at").eq("child_id", kid.id).order("completed_at", { ascending: false }).limit(600),
  ]);
  const row = p.data;
  const subjects = (row?.subjects ?? SUBJECTS).filter((s): s is SubjectId => (SUBJECTS as string[]).includes(s));
  return {
    profile: {
      child_id: kid.id,
      grade: row && isGrade(row.grade) ? row.grade : guessGrade(kid.birthday),
      subjects: subjects.length ? subjects : SUBJECTS,
      daily_goal: row?.daily_goal ?? 2,
      earn_stars: row?.earn_stars ?? true,
    },
    profileSaved: !!row,
    assignments: ((a.data ?? []) as LearnAssignRow[]).filter((x) => lessonById(x.lesson_id)),
    results: (r.data ?? []) as LearnResultRow[],
    tz,
  };
}

export type UnitChip = { id: string; title: string; emoji: string; done: number; total: number; state: "done" | "doing" | "next" | "later" };
export type SubjectSummary = {
  subject: SubjectId;
  title: string;
  emoji: string;
  color: string;
  units: UnitChip[];
  current: UnitChip | null;
  next: string | null;
  lessonsDone: number;
  stars: number;
};

export type LearnSummary = {
  streak: number;
  todayCount: number;
  weekLessons: number;
  weekMinutes: number;
  level: number;
  levelName: string;
  totalLessons: number;
  /** Letter sounds with a finished letter lesson. */
  lettersKnown: string[];
  bySubject: SubjectSummary[];
  recent: { id: string; title: string; emoji: string; subject: SubjectId; stars: number; at: string; minutes: number }[];
  lastActive: string | null;
};

export function summarize(d: KidLearnData, now = new Date()): LearnSummary {
  const dayOf = (iso: string) => dayKeyInTz(new Date(iso), d.tz);
  const todayKey = dayKeyInTz(now, d.tz);
  const weekAgo = now.getTime() - 7 * 86400_000;
  const best = new Map<string, number>();
  for (const r of d.results) best.set(r.lesson_id, Math.max(best.get(r.lesson_id) ?? 0, r.stars));
  const done = (id: string) => (best.get(id) ?? 0) > 0;
  const assigned = new Set(d.assignments.filter((a) => a.status === "assigned").map((a) => a.lesson_id));
  const xp = d.results.reduce((s, r) => s + xpFor(r.stars), 0);
  const week = d.results.filter((r) => new Date(r.completed_at).getTime() >= weekAgo);

  const bySubject: SubjectSummary[] = d.profile.subjects.map((subject) => {
    const map = courseMap(subject, d.profile.grade, done, assigned);
    let sawCurrent = false;
    const units: UnitChip[] = map.map(({ unit, lessons }) => {
      const n = lessons.filter((l) => l.state === "done").length;
      const hasNext = lessons.some((l) => l.state === "next");
      let state: UnitChip["state"];
      if (n === lessons.length) state = "done";
      else if (hasNext && !sawCurrent) {
        state = n > 0 ? "doing" : "next";
        sawCurrent = true;
      } else state = n > 0 ? "doing" : "later";
      return { id: unit.id, title: unit.title, emoji: unit.emoji, done: n, total: lessons.length, state };
    });
    const current = units.find((u) => u.state === "doing" || u.state === "next") ?? null;
    const next = map.flatMap((u) => u.lessons).find((l) => l.state === "next")?.lesson.title ?? null;
    const ids = new Set(COURSES[subject].units.flatMap((u) => u.lessons.map((l) => l.id)));
    return {
      subject,
      title: COURSES[subject].title,
      emoji: SUBJECT_LOOK[subject].island,
      color: SUBJECT_LOOK[subject].to,
      units,
      current,
      next,
      lessonsDone: [...best.keys()].filter((id) => ids.has(id) && done(id)).length,
      stars: [...best.entries()].filter(([id]) => ids.has(id)).reduce((s, [, v]) => s + v, 0),
    };
  });

  const lettersKnown = new Set<string>();
  for (const [id, stars] of best) {
    const m = /^read\.ls\d\.([a-z])$/.exec(id);
    if (m && stars > 0) lettersKnown.add(m[1]);
  }

  return {
    streak: streakFrom([...new Set(d.results.map((r) => dayOf(r.completed_at)))].sort().reverse(), todayKey),
    todayCount: d.results.filter((r) => dayOf(r.completed_at) === todayKey).length,
    weekLessons: week.length,
    weekMinutes: Math.round(week.reduce((s, r) => s + r.duration_sec, 0) / 60),
    level: levelOf(xp),
    levelName: levelName(levelOf(xp)),
    totalLessons: d.results.length,
    lettersKnown: [...lettersKnown],
    bySubject,
    recent: d.results.slice(0, 8).map((r) => {
      const l = lessonById(r.lesson_id);
      return { id: r.id, title: l?.title ?? r.lesson_id, emoji: l?.emoji ?? "📘", subject: r.subject, stars: r.stars, at: r.completed_at, minutes: Math.max(1, Math.round(r.duration_sec / 60)) };
    }),
    lastActive: d.results[0]?.completed_at ?? null,
  };
}
