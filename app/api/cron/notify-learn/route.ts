import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { notify } from "@/lib/notifications/dispatch";
import { tzFromSettings, dayKeyInTz } from "@/lib/tz";
import { COURSES, lessonById, unitById } from "@/lib/learn/curriculum";
import { streakFrom } from "@/lib/learn/progress";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Fired by a DB trigger (learn_notify → net.http_post) for each lesson a child finishes on the
// wall. Only the moments a parent wants in their pocket become notifications — a mission they
// assigned is done, today's goal is hit, a whole unit is finished, a streak milestone — each sent
// exactly once (notification_dispatch_log). Bearer matches the pulse (Vault → PULSE_SECRET).

function authorized(req: Request): boolean {
  const secret = process.env.PULSE_SECRET || process.env.CRON_SECRET;
  if (!secret) return true; // local dev
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

async function claim(admin: SupabaseClient, householdId: string, kind: string, entityId: string, key: string): Promise<boolean> {
  const { data } = await admin
    .from("notification_dispatch_log")
    .upsert({ household_id: householdId, kind, entity_id: entityId, dose_key: key }, { onConflict: "household_id,kind,entity_id,dose_key", ignoreDuplicates: true })
    .select("id");
  return !!(data && data.length);
}

const STREAK_MILESTONES = new Set([3, 7, 14, 30, 50, 100]);
const starsText = (n: number) => (n > 0 ? "⭐".repeat(Math.min(3, n)) : "");

async function handle(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });

  let resultId = "";
  try {
    const j = (await req.json()) as { result_id?: string };
    resultId = String(j?.result_id ?? "");
  } catch {
    /* no body */
  }
  if (!resultId) return Response.json({ ok: false, error: "no result_id" }, { status: 400 });

  const admin = createAdminClient() as unknown as SupabaseClient;
  const { data: r } = await admin.from("learn_results").select("id, household_id, child_id, lesson_id, stars, completed_at").eq("id", resultId).maybeSingle();
  if (!r) return Response.json({ ok: true, skipped: "not found" });

  const [{ data: child }, { data: hh }, { data: profile }] = await Promise.all([
    admin.from("children").select("name").eq("id", r.child_id).maybeSingle(),
    admin.from("households").select("settings").eq("id", r.household_id).maybeSingle(),
    admin.from("learn_profiles").select("daily_goal").eq("child_id", r.child_id).maybeSingle(),
  ]);
  const name = (child?.name as string | undefined) ?? "Your child";
  const tz = tzFromSettings((hh?.settings as Record<string, unknown> | null) ?? null);
  const lesson = lessonById(r.lesson_id as string);
  const route = `/app/children/${r.child_id}?tab=learn`;
  const sent: string[] = [];

  // 1) A mission the parent assigned is done.
  const { data: mission } = await admin
    .from("learn_assignments")
    .select("id")
    .eq("child_id", r.child_id)
    .eq("lesson_id", r.lesson_id)
    .eq("status", "done")
    .eq("completed_at", r.completed_at)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
  if (mission && (await claim(admin, r.household_id, "learn-mission", mission.id as string, "done"))) {
    await notify({
      householdId: r.household_id,
      category: "learning",
      childId: r.child_id,
      title: `🎯 ${name} finished your mission`,
      body: `${lesson ? `${lesson.emoji} ${lesson.title}` : "The lesson you picked"} — ${starsText(r.stars as number) || "done"}`,
      route,
    });
    sent.push("mission");
  }

  // Today's lessons + the days they've learned (for the goal and the streak).
  const since = new Date(Date.now() - 120 * 86400_000).toISOString();
  const { data: recent } = await admin.from("learn_results").select("completed_at").eq("child_id", r.child_id).gte("completed_at", since);
  const todayKey = dayKeyInTz(new Date(), tz);
  const days = [...new Set((recent ?? []).map((x) => dayKeyInTz(new Date(x.completed_at as string), tz)))];
  const todayCount = (recent ?? []).filter((x) => dayKeyInTz(new Date(x.completed_at as string), tz) === todayKey).length;
  const goal = (profile?.daily_goal as number | undefined) ?? 2;

  // 2) Today's goal, the moment it's reached.
  if (todayCount === goal && (await claim(admin, r.household_id, "learn-goal", r.child_id as string, todayKey))) {
    await notify({
      householdId: r.household_id,
      category: "learning",
      childId: r.child_id,
      title: `🏅 ${name} hit today's learning goal`,
      body: `${todayCount} lesson${todayCount === 1 ? "" : "s"} done today. Nice work!`,
      route,
    });
    sent.push("goal");
  }

  // 3) A whole unit finished.
  const unit = lesson ? unitById(lesson.unit) : null;
  if (unit) {
    const ids = unit.lessons.map((l) => l.id);
    const { data: doneRows } = await admin.from("learn_results").select("lesson_id").eq("child_id", r.child_id).in("lesson_id", ids);
    const done = new Set((doneRows ?? []).map((x) => x.lesson_id as string));
    if (ids.every((id) => done.has(id)) && (await claim(admin, r.household_id, "learn-unit", r.child_id as string, unit.id))) {
      await notify({
        householdId: r.household_id,
        category: "learning",
        childId: r.child_id,
        title: `🏝️ ${name} finished “${unit.title}”`,
        body: `${COURSES[unit.subject].title}: ${unit.blurb}`,
        route,
      });
      sent.push("unit");
    }
  }

  // 4) Streak milestones.
  const streak = streakFrom(days.sort().reverse(), todayKey);
  if (STREAK_MILESTONES.has(streak) && days.includes(todayKey) && (await claim(admin, r.household_id, "learn-streak", r.child_id as string, `${streak}:${todayKey}`))) {
    await notify({
      householdId: r.household_id,
      category: "learning",
      childId: r.child_id,
      title: `🔥 ${name} has learned ${streak} days in a row`,
      body: "Every day counts — that's how reading sticks.",
      route,
    });
    sent.push("streak");
  }

  return Response.json({ ok: true, sent });
}

// The DB trigger POSTs; a manual check can GET.
export const GET = handle;
export const POST = handle;
