import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { notify } from "@/lib/notifications/dispatch";
import { tzFromSettings, dayKeyInTz } from "@/lib/tz";
import { COURSES, isPractice, lessonById, levelLabel, unitById } from "@/lib/learn/curriculum";
import { streakFrom } from "@/lib/learn/progress";
import { VERSE_BY_ID } from "@/lib/learn/bible";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Fired by a DB trigger (learn_notify → net.http_post) for each level a child finishes on the
// wall. Only the moments a parent wants in their pocket become notifications — a mission they
// assigned is done, their child is stuck on a level, today's goal is hit, a whole island is
// finished, a memory verse is memorized, a streak milestone — each sent exactly once
// (notification_dispatch_log). Bearer matches the pulse (Vault → PULSE_SECRET).

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
  const { data: r } = await admin.from("learn_results").select("id, household_id, child_id, lesson_id, stars, completed_at, skills").eq("id", resultId).maybeSingle();
  if (!r) return Response.json({ ok: true, skipped: "not found" });
  const practice = isPractice(r.lesson_id as string);

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

  // 1) A mission the parent assigned is done (the sync stamps it with this result's time; a
  // "practice:<subject>" mission is done by any Practice Cove in that subject).
  const { data: mission } = await admin
    .from("learn_assignments")
    .select("id")
    .eq("child_id", r.child_id)
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
      body: `${practice ? "🏝️ Practice Cove" : lesson ? `${lesson.emoji} ${levelLabel(lesson)} ${lesson.title}` : "The level you picked"} — ${starsText(r.stars as number) || "done"}`,
      route,
    });
    sent.push("mission");
  }

  // 1b) Stuck: a third try at the same level today that still didn't pass — worth a grown-up's help.
  if (!practice && lesson && (r.stars as number) < 1) {
    const dayStart = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { data: tries } = await admin.from("learn_results").select("stars, completed_at").eq("child_id", r.child_id).eq("lesson_id", r.lesson_id).gte("completed_at", dayStart);
    const todayKey0 = dayKeyInTz(new Date(), tz);
    const missesToday = (tries ?? []).filter((x) => (x.stars as number) < 1 && dayKeyInTz(new Date(x.completed_at as string), tz) === todayKey0).length;
    const passedToday = (tries ?? []).some((x) => (x.stars as number) >= 1);
    if (missesToday === 3 && !passedToday && (await claim(admin, r.household_id, "learn-stuck", r.child_id as string, `${r.lesson_id}:${todayKey0}`))) {
      await notify({
        householdId: r.household_id,
        category: "learning",
        childId: r.child_id,
        title: `🧭 ${name} is working hard on ${levelLabel(lesson)} ${lesson.title}`,
        body: "Three tries today without passing yet. The wall offers Practice Cove — or sit with them for one try.",
        route,
      });
      sent.push("stuck");
    }
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

  // 3) A whole island finished (every level passed).
  const unit = lesson && (r.stars as number) >= 1 ? unitById(lesson.unit) : null;
  if (unit) {
    const ids = unit.lessons.map((l) => l.id);
    const { data: doneRows } = await admin.from("learn_results").select("lesson_id").eq("child_id", r.child_id).gte("stars", 1).in("lesson_id", ids);
    const done = new Set((doneRows ?? []).map((x) => x.lesson_id as string));
    if ((lesson?.kind === "boss" || ids.every((id) => done.has(id))) && (await claim(admin, r.household_id, "learn-unit", r.child_id as string, unit.id))) {
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

  // 3b) A memory verse "hidden in the heart": its third solid review in a row (how the wall's
  // mastery engine defines memorized), announced once per verse.
  const verseKeys = Object.entries(((r as { skills?: unknown }).skills ?? {}) as Record<string, [number, number]>)
    .filter(([k, v]) => k.startsWith("f:verse:") && Array.isArray(v) && v[1] > 0 && v[0] >= v[1])
    .map(([k]) => k);
  if (verseKeys.length) {
    const { data: hist } = await admin.from("learn_results").select("skills, completed_at").eq("child_id", r.child_id).lte("completed_at", r.completed_at).order("completed_at", { ascending: false }).limit(80);
    for (const key of verseKeys) {
      const sessions = (hist ?? [])
        .map((h) => ((h.skills ?? {}) as Record<string, [number, number]>)[key])
        .filter((v): v is [number, number] => Array.isArray(v) && v[1] > 0);
      const solid = (v: [number, number]) => v[0] >= v[1];
      const total = sessions.reduce((n, v) => n + v[1], 0);
      const memorized = sessions.length >= 3 && sessions.slice(0, 3).every(solid) && total >= 3 && !(sessions[3] && solid(sessions[3]));
      const verse = VERSE_BY_ID.get(key.slice(8));
      if (memorized && verse && (await claim(admin, r.household_id, "learn-verse", r.child_id as string, key))) {
        await notify({
          householdId: r.household_id,
          category: "learning",
          childId: r.child_id,
          title: `📜 ${name} memorized ${verse.ref}`,
          body: `“${verse.text}” Ask them to say it for you!`,
          route,
        });
        sent.push("verse");
      }
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
