import type { KioskChild, KioskState } from "@/lib/kiosk/types";
import { serviceDay, tzOf } from "@/lib/kiosk/time";
import { dayKeyInTz } from "@/lib/tz";
import { isGrade, type GradeId, type LearnAssignment, type LearnProfile, type SubjectId } from "@/lib/learn/types";
import { mergeKid, type KidLearn } from "@/lib/learn/progress";
import { lessonById } from "@/lib/learn/curriculum";

// What the wall knows about one child's Learn: their settings (or sensible defaults from their
// age until a parent sets a grade), progress merged with lessons not yet synced, and the lessons
// a grown-up assigned.

export function gradeForAge(birthday: string | null | undefined): GradeId {
  if (!birthday) return "k";
  const b = new Date(`${birthday.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(b.getTime())) return "k";
  const now = new Date();
  // Grade by age at the start of the US school year (Sept 1).
  const schoolYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  const ageSept = schoolYear - b.getFullYear() - (b.getMonth() > 8 || (b.getMonth() === 8 && b.getDate() > 1) ? 1 : 0);
  if (ageSept <= 4) return "prek";
  if (ageSept === 5) return "k";
  if (ageSept === 6) return "1";
  if (ageSept === 7) return "2";
  return "3";
}

export type KidLearnView = {
  profile: LearnProfile;
  kid: KidLearn;
  assignments: LearnAssignment[];
  todayKey: string;
  tz: string;
};

export function kidLearnView(state: KioskState, child: KioskChild): KidLearnView {
  const snap = state.learn ?? null;
  const tz = tzOf(state);
  const todayKey = serviceDay(state);
  const row = snap?.profiles?.find((p) => p.child_id === child.id);
  const subjects = (row?.subjects ?? ["reading", "code", "math"]).filter((s): s is SubjectId => s === "reading" || s === "code" || s === "math");
  const profile: LearnProfile = {
    child_id: child.id,
    grade: row && isGrade(row.grade) ? row.grade : gradeForAge(child.birthday),
    subjects: subjects.length ? subjects : ["reading", "code", "math"],
    daily_goal: Math.max(1, Math.min(10, row?.daily_goal ?? 2)),
    earn_stars: row?.earn_stars ?? true,
  };
  const kid = mergeKid(snap, child.id, state.learnOutbox ?? [], todayKey, (iso) => dayKeyInTz(new Date(iso), tz));
  // Assignments the wall already finished (offline) drop off right away.
  const pendingDone = new Set((state.learnOutbox ?? []).filter((r) => r.child_id === child.id).map((r) => r.lesson_id));
  const assignments = (snap?.assignments ?? []).filter((a) => a.child_id === child.id && !pendingDone.has(a.lesson_id) && lessonById(a.lesson_id));
  return { profile, kid, assignments, todayKey, tz };
}

/** Wall stars a finished lesson will earn (mirrors rpc_learn_sync: 1, or 2 for 3 stars, ≤10/day). */
export function starsForLesson(view: KidLearnView, stars: number): number {
  if (!view.profile.earn_stars || stars < 1) return 0;
  let today = 0;
  for (const l of Object.values(view.kid.lessons)) if (l.last && dayKeyInTz(new Date(l.last), view.tz) === view.todayKey) today += l.stars >= 3 ? 2 : 1;
  return Math.max(0, Math.min(stars >= 3 ? 2 : 1, 10 - today));
}
