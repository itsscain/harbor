"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getMyHousehold } from "@/lib/household";
import { isGrade, type SubjectId } from "@/lib/learn/types";
import { COURSES, SUBJECTS } from "@/lib/learn/curriculum";
import { missionLesson } from "@/lib/learn/parent";

// Harbor Learn controls for parents: grade level, subjects, daily goal and limit, and levels (or a
// Practice Cove of what's tricky) assigned as "missions". Every action returns an honest result for
// the toast; removing a mission is soft so the toast's Undo can bring it back. Changes reach the
// wall in about a second.

export type LearnActionResult = { ok: true; message?: string; id?: string } | { ok: false; error: string };

async function ctx() {
  const profile = await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household found.");
  const supabase = await createClient();
  return { profile, household, supabase };
}

async function ownKid(supabase: Awaited<ReturnType<typeof createClient>>, householdId: string, childId: string) {
  const { data } = await supabase.from("children").select("id, name").eq("id", childId).eq("household_id", householdId).is("deleted_at", null).maybeSingle();
  return data;
}

const touch = (childId: string) => {
  revalidatePath(`/app/children/${childId}`);
  revalidatePath("/app");
};

export async function saveLearnSettings(childId: string, formData: FormData): Promise<LearnActionResult> {
  const { household, supabase } = await ctx();
  const kid = await ownKid(supabase, household.id, childId);
  if (!kid) return { ok: false, error: "That child isn't in your family." };
  const grade = String(formData.get("grade") ?? "");
  if (!isGrade(grade)) return { ok: false, error: "Pick a grade level." };
  const subjects = formData.getAll("subjects").map(String).filter((s): s is SubjectId => (SUBJECTS as string[]).includes(s));
  if (!subjects.length) return { ok: false, error: "Leave at least one subject on." };
  const goal = Math.max(1, Math.min(10, Math.round(Number(formData.get("daily_goal")) || 2)));
  const limit = Math.max(0, Math.min(20, Math.round(Number(formData.get("daily_limit")) || 0)));
  if (limit && limit < goal) return { ok: false, error: "The daily limit can't be lower than the daily goal." };
  const earnStars = formData.get("earn_stars") === "on";
  const { error } = await supabase.from("learn_profiles").upsert(
    { child_id: childId, household_id: household.id, grade, subjects, daily_goal: goal, daily_limit: limit, earn_stars: earnStars },
    { onConflict: "child_id" },
  );
  if (error) return { ok: false, error: "Couldn't save those settings. Try again." };
  touch(childId);
  return { ok: true, message: `${kid.name}'s learning is set` };
}

export async function assignLesson(childId: string, lessonId: string, note: string | null): Promise<LearnActionResult> {
  const { profile, household, supabase } = await ctx();
  const kid = await ownKid(supabase, household.id, childId);
  if (!kid) return { ok: false, error: "That child isn't in your family." };
  const lesson = missionLesson(lessonId);
  if (!lesson) return { ok: false, error: "That lesson doesn't exist anymore." };
  const { data: open } = await supabase
    .from("learn_assignments")
    .select("id")
    .eq("child_id", childId)
    .eq("lesson_id", lessonId)
    .eq("status", "assigned")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (open) return { ok: true, message: `“${lesson.title}” is already on ${kid.name}'s list`, id: open.id };
  const clean = note?.trim().slice(0, 140) || null;
  const { data, error } = await supabase
    .from("learn_assignments")
    .insert({ household_id: household.id, child_id: childId, lesson_id: lessonId, note: clean, created_by: profile.id })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "Couldn't assign that lesson. Try again." };
  // Assigning from a subject that's been switched off switches it back on, so its island shows up
  // on the wall next to the mission.
  let turnedOn = false;
  const { data: prof } = await supabase.from("learn_profiles").select("subjects").eq("child_id", childId).maybeSingle();
  if (prof && !prof.subjects.includes(lesson.subject)) {
    const { error: upErr } = await supabase.from("learn_profiles").update({ subjects: [...prof.subjects, lesson.subject] }).eq("child_id", childId);
    turnedOn = !upErr;
  }
  touch(childId);
  return { ok: true, message: `Sent to ${kid.name}'s wall: “${lesson.title}”${turnedOn ? ` — ${COURSES[lesson.subject].title} is now on` : ""}`, id: data.id };
}

export async function removeAssignment(id: string): Promise<LearnActionResult> {
  const { household, supabase } = await ctx();
  const { data, error } = await supabase
    .from("learn_assignments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("household_id", household.id)
    .select("child_id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Couldn't remove that mission." };
  touch(data.child_id);
  return { ok: true, message: "Mission removed" };
}

export async function restoreAssignment(id: string): Promise<LearnActionResult> {
  const { household, supabase } = await ctx();
  const { data, error } = await supabase
    .from("learn_assignments")
    .update({ deleted_at: null })
    .eq("id", id)
    .eq("household_id", household.id)
    .select("child_id")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Couldn't bring that mission back." };
  touch(data.child_id);
  return { ok: true, message: "Mission is back" };
}
