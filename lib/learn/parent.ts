import type { SubjectId, LearnProfile, GradeId, LevelKind } from "./types";
import { GRADES, isGrade } from "./types";
import { COURSES, SUBJECTS, SUBJECT_LOOK, courseMap, isPractice, lessonById, levelLabel } from "./curriculum";
import { levelName, levelOf, streakFrom, xpFor } from "./progress";
import { skillPicture, skillsFromResults, type SkillInsight } from "./skills";
import { isMastered, type Skills } from "./mastery";
import { dayKeyInTz } from "@/lib/tz";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// What a parent sees about a child's Harbor Learn: their settings, the missions they assigned,
// and a plain-English picture of progress built from the results the wall synced — where they
// are on each voyage, what's solid, and what needs a little practice.

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
  skills?: unknown;
  kind?: LevelKind | null;
  shells?: number;
};
export type LearnAssignRow = { id: string; lesson_id: string; note: string | null; status: "assigned" | "done"; created_at: string; completed_at: string | null };

export type KidLearnData = {
  profile: LearnProfile;
  /** False until a grown-up saves settings (the grade shown is then a guess from their age). */
  profileSaved: boolean;
  assignments: LearnAssignRow[];
  results: LearnResultRow[];
  skills: Skills;
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
  if (age <= 4) return "prek";
  const g: GradeId[] = ["k", "1", "2", "3", "4", "5"];
  return g[Math.min(g.length - 1, age - 5)];
}

/** A mission's lesson: a real level, a Practice Cove for a subject, or one that no longer exists. */
export function missionLesson(id: string): { kind: "lesson"; title: string; emoji: string; subject: SubjectId; label: string } | { kind: "practice"; title: string; emoji: string; subject: SubjectId; label: string } | null {
  const l = lessonById(id);
  if (l) return { kind: "lesson", title: l.title, emoji: l.emoji, subject: l.subject, label: levelLabel(l) };
  const m = /^practice:(reading|math|code|manners)$/.exec(id);
  if (m) return { kind: "practice", title: "Practice Cove", emoji: "🏝️", subject: m[1] as SubjectId, label: "Practice" };
  return null;
}

export async function loadKidLearn(db: SupabaseClient<Database>, kid: { id: string; birthday: string | null }, tz: string): Promise<KidLearnData> {
  const [p, a, r] = await Promise.all([
    db.from("learn_profiles").select("grade, subjects, daily_goal, earn_stars, daily_limit").eq("child_id", kid.id).maybeSingle(),
    db.from("learn_assignments").select("id, lesson_id, note, status, created_at, completed_at").eq("child_id", kid.id).is("deleted_at", null).order("created_at", { ascending: false }).limit(40),
    db.from("learn_results").select("id, lesson_id, subject, stars, correct, total, duration_sec, sticker, completed_at, skills, kind, shells").eq("child_id", kid.id).order("completed_at", { ascending: false }).limit(1000),
  ]);
  const row = p.data;
  const subjects = (row?.subjects ?? SUBJECTS).filter((s): s is SubjectId => (SUBJECTS as string[]).includes(s));
  const results = (r.data ?? []) as LearnResultRow[];
  return {
    profile: {
      child_id: kid.id,
      grade: row && isGrade(row.grade) ? row.grade : guessGrade(kid.birthday),
      subjects: subjects.length ? subjects : SUBJECTS,
      daily_goal: row?.daily_goal ?? 2,
      earn_stars: row?.earn_stars ?? true,
      daily_limit: row?.daily_limit ?? 0,
    },
    profileSaved: !!row,
    assignments: (a.data ?? []) as LearnAssignRow[],
    results,
    skills: skillsFromResults(results),
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
  /** "Island 3 · next 3-4: Shell sweep" */
  where: string | null;
  next: string | null;
  lessonsDone: number;
  stars: number;
  strong: SkillInsight[];
  shaky: SkillInsight[];
  mastered: number;
  practiced: number;
};

export type LearnSummary = {
  streak: number;
  todayCount: number;
  weekLessons: number;
  weekMinutes: number;
  weekPassed: number;
  level: number;
  levelName: string;
  totalLessons: number;
  shells: number;
  /** Letter sounds the child has down (mastered, or right 80%+ over 2+ tries). */
  lettersKnown: string[];
  bySubject: SubjectSummary[];
  recent: { id: string; title: string; label: string; emoji: string; subject: SubjectId; stars: number; passed: boolean; practice: boolean; at: string; minutes: number; score: string }[];
  lastActive: string | null;
};

export function summarize(d: KidLearnData, now = new Date()): LearnSummary {
  const dayOf = (iso: string) => dayKeyInTz(new Date(iso), d.tz);
  const todayKey = dayKeyInTz(now, d.tz);
  const weekAgo = now.getTime() - 7 * 86400_000;
  const bestMap = new Map<string, number>();
  for (const r of d.results) bestMap.set(r.lesson_id, Math.max(bestMap.get(r.lesson_id) ?? 0, r.stars));
  const best = (id: string) => (bestMap.has(id) ? bestMap.get(id)! : null);
  const passed = (id: string) => (bestMap.get(id) ?? 0) >= 1;
  const assigned = new Set(d.assignments.filter((a) => a.status === "assigned").map((a) => a.lesson_id));
  const xp = d.results.reduce((s, r) => s + xpFor(r.stars), 0);
  const week = d.results.filter((r) => new Date(r.completed_at).getTime() >= weekAgo);

  const bySubject: SubjectSummary[] = d.profile.subjects.map((subject) => {
    const map = courseMap(subject, d.profile.grade, best, assigned);
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
    const nextL = map.flatMap((u) => u.lessons).find((l) => l.state === "next");
    const curUnit = map.find((u) => u.lessons.some((l) => l.state === "next"));
    const ids = new Set(COURSES[subject].units.flatMap((u) => u.lessons.map((l) => l.id)));
    const pic = skillPicture(d.skills, subject);
    return {
      subject,
      title: COURSES[subject].title,
      emoji: SUBJECT_LOOK[subject].island,
      color: SUBJECT_LOOK[subject].to,
      units,
      current,
      where: curUnit && nextL ? `Island ${curUnit.unit.n} · next ${nextL.label}` : null,
      next: nextL ? `${nextL.label} ${nextL.lesson.title}` : null,
      lessonsDone: [...bestMap.keys()].filter((id) => ids.has(id) && passed(id)).length,
      stars: [...bestMap.entries()].filter(([id]) => ids.has(id)).reduce((s, [, v]) => s + v, 0),
      strong: pic.strong.slice(0, 8),
      shaky: pic.shaky.slice(0, 8),
      mastered: pic.mastered,
      practiced: pic.practiced,
    };
  });

  const lettersKnown = Object.entries(d.skills)
    .filter(([k, s]) => /^r:sound:[a-z]$/.test(k) && (isMastered(s) || (s.total >= 2 && s.right / s.total >= 0.8)))
    .map(([k]) => k.slice(8));

  return {
    streak: streakFrom([...new Set(d.results.map((r) => dayOf(r.completed_at)))].sort().reverse(), todayKey),
    todayCount: d.results.filter((r) => dayOf(r.completed_at) === todayKey).length,
    weekLessons: week.length,
    weekPassed: week.filter((r) => r.stars >= 1).length,
    weekMinutes: Math.round(week.reduce((s, r) => s + r.duration_sec, 0) / 60),
    level: levelOf(xp),
    levelName: levelName(levelOf(xp)),
    totalLessons: d.results.length,
    shells: d.results.reduce((s, r) => s + (r.shells ?? 0), 0),
    lettersKnown,
    bySubject,
    recent: d.results.slice(0, 10).map((r) => {
      const l = lessonById(r.lesson_id);
      const practice = isPractice(r.lesson_id);
      return {
        id: r.id,
        title: practice ? "Practice Cove" : l?.title ?? "Earlier lesson",
        label: l ? levelLabel(l) : practice ? "🏝️" : "",
        emoji: practice ? "🏝️" : l?.emoji ?? "📘",
        subject: r.subject,
        stars: r.stars,
        passed: r.stars >= 1,
        practice,
        at: r.completed_at,
        minutes: Math.max(1, Math.round(r.duration_sec / 60)),
        score: r.total ? `${r.correct}/${r.total}` : "",
      };
    }),
    lastActive: d.results[0]?.completed_at ?? null,
  };
}
