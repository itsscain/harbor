import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { Household } from "@/lib/types";
import {
  tzFromSettings,
  dayKeyInTz,
  minutesIntoDayInTz,
  weekdayInTz,
  formatInTz,
  formatTimeInTz,
  wallTimeToUtcMs,
} from "@/lib/tz";
import { routineForChild, effectiveSchedule } from "@/lib/kiosk/schedule";
import { runsToday, withinWindow, formatClock, eventsForDay } from "@/lib/kiosk/calendar";
import { choreAssignee } from "@/lib/kiosk/chores";
import { readHouseMode, requestSummary, requestKindMeta, type HouseModeState } from "@/lib/command";
import { routineEmoji } from "@/lib/routine-emoji";
import type { KioskChore, KioskEvent, KioskRoutine, KioskRoutineOverride, KioskScheduleTemplate } from "@/lib/kiosk/types";

// The Today screen's view model — "what needs me, how are the kids doing, what's tonight" —
// computed server-side in the FAMILY time zone (not the server's UTC day, which used to reset
// the counts around 8 pm Eastern). Uses the same scheduling seam as the wall so the phone and the
// wall can never disagree about which routine is "now".

type Db = SupabaseClient<Database>;

export type TodayKid = {
  id: string;
  name: string;
  avatar: string | null;
  photo_url: string | null;
  color: string | null;
  stars: number;
  status: "calm" | "grounded" | null;
  routine: {
    id: string;
    name: string;
    emoji: string;
    done: number;
    total: number;
    /** now = open + unfinished · next = opens later today · late = window closed unfinished */
    state: "now" | "next" | "late" | "anytime";
    hint: string | null; // "until 8:00 PM" / "opens 7:00 PM"
  } | null;
  routinesToday: number;
  routinesDone: number;
  chores: { done: number; total: number };
  allDone: boolean;
};

export type NeedItem =
  | {
      kind: "request";
      key: string;
      id: string;
      childName: string;
      childAvatar: string | null;
      childColor: string | null;
      emoji: string;
      summary: string;
      at: string;
    }
  | {
      kind: "med";
      key: string;
      medicationId: string;
      childId: string;
      childName: string;
      name: string;
      dose: string | null;
      time: string;
      timeLabel: string;
      overdue: boolean;
      parentGives: boolean;
    }
  | { kind: "reminder"; key: string; id: string; title: string; overdue: boolean; dueLabel: string };

export type AgendaItem = { id: string; title: string; emoji: string | null; time: string; past: boolean; color: string | null };

export type TodayModel = {
  greeting: string;
  familyName: string;
  dateLabel: string;
  tz: string;
  needs: NeedItem[];
  kids: TodayKid[];
  today: AgendaItem[];
  tomorrow: AgendaItem[];
  dinner: { title: string; emoji: string | null } | null;
  houseMode: HouseModeState;
  setup: { steps: { label: string; hint: string; done: boolean; href: string }[]; show: boolean };
};

const toMin = (t: string): number => {
  const [h, m] = t.split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
};
const hhmm = (t: string): string => t.slice(0, 5);

export async function buildTodayModel(supabase: Db, household: Household, opts?: { forceSetup?: boolean }): Promise<TodayModel> {
  const settings = (household.settings ?? {}) as Record<string, unknown>;
  const tz = tzFromSettings(settings);
  const now = new Date();
  const nowMs = now.getTime();
  const curMin = minutesIntoDayInTz(now, tz);
  const todayKey = dayKeyInTz(now, tz);
  const tomorrow = new Date(nowMs + 86_400_000);
  const tomorrowKey = dayKeyInTz(tomorrow, tz);
  const dow = weekdayInTz(now, tz);
  const startOfDayIso = new Date(wallTimeToUtcMs(`${todayKey}T00:00`, tz)).toISOString();
  // A Date whose LOCAL parts are the family day — choreAssignee's weekly rotation reads local
  // parts, and the server runs in UTC.
  const familyDay = new Date(`${todayKey}T12:00:00Z`);

  const { data: kidRows } = await supabase
    .from("children")
    .select("id, name, avatar, photo_url, color, settings, sort_order")
    .eq("household_id", household.id)
    .is("deleted_at", null)
    .order("sort_order");
  const kids = kidRows ?? [];
  const kidIds = kids.map((k) => k.id);
  const kidById = new Map(kids.map((k) => [k.id, k]));
  const none = Promise.resolve({ data: [] as never[] });

  const [
    { data: rewards },
    { data: routines },
    { data: templates },
    { data: overrides },
    { data: log },
    { data: chores },
    { data: requests },
    { data: meds },
    { data: medLogs },
    { data: reminders },
    { data: events },
    { data: meals },
    { data: corners },
    { data: groundings },
    { data: pairings },
    { count: storeCount },
  ] = await Promise.all([
    kidIds.length ? supabase.from("rewards").select("child_id, points_total").in("child_id", kidIds) : none,
    supabase
      .from("routines")
      .select(
        "id, child_id, person_id, name, type, active, start_time, end_time, days_of_week, scope, assigned_child_ids, schedule_template_id, sort_order, routine_steps(id, deleted_at)",
      )
      .eq("household_id", household.id)
      .is("deleted_at", null),
    supabase.from("schedule_templates").select("*").eq("household_id", household.id).is("deleted_at", null),
    supabase.from("routine_child_overrides").select("*").eq("household_id", household.id).is("deleted_at", null),
    kidIds.length
      ? supabase.from("reward_log").select("child_id, step_id, chore_id").in("child_id", kidIds).gte("created_at", startOfDayIso).is("deleted_at", null)
      : none,
    supabase
      .from("chores")
      .select("id, child_id, title, icon, points, days_of_week, rotation_member_ids, active, sort_order, requires_approval")
      .eq("household_id", household.id)
      .is("deleted_at", null),
    supabase
      .from("requests")
      .select("id, child_id, kind, amount, body, created_at")
      .eq("household_id", household.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("medications")
      .select("id, child_id, name, dose, schedule_times, days_of_week, parent_administered")
      .eq("household_id", household.id)
      .eq("active", true)
      .is("deleted_at", null),
    supabase.from("medication_logs").select("medication_id, dose_time").eq("household_id", household.id).eq("dose_date", todayKey),
    supabase
      .from("reminders")
      .select("id, title, due_date, snoozed_until")
      .eq("household_id", household.id)
      .eq("done", false)
      .is("deleted_at", null)
      .lte("due_date", todayKey)
      .order("due_date"),
    supabase
      .from("events")
      .select("id, child_id, title, emoji, location, starts_at, ends_at, all_day, is_countdown, person_label, color, responsible_label, recurrence_rule")
      .eq("household_id", household.id)
      .is("deleted_at", null),
    supabase
      .from("meals")
      .select("date, title, emoji")
      .eq("household_id", household.id)
      .eq("meal_type", "dinner")
      .in("date", [todayKey, tomorrowKey])
      .is("deleted_at", null),
    kidIds.length
      ? supabase.from("corners").select("child_id, started_at, duration_minutes").in("child_id", kidIds).eq("status", "active").is("deleted_at", null)
      : none,
    kidIds.length
      ? supabase.from("groundings").select("child_id, ends_on").in("child_id", kidIds).eq("status", "active").is("deleted_at", null)
      : none,
    supabase.from("device_pairings").select("status").eq("household_id", household.id),
    supabase.from("store_items").select("id", { count: "exact", head: true }).eq("household_id", household.id).is("deleted_at", null),
  ]);

  const snap = {
    schedule_templates: (templates ?? []) as unknown as KioskScheduleTemplate[],
    routine_child_overrides: (overrides ?? []) as unknown as KioskRoutineOverride[],
  };
  const doneByKid = new Map<string, Set<string>>();
  for (const l of log ?? []) {
    const ref = l.step_id ?? l.chore_id;
    if (!ref) continue;
    if (!doneByKid.has(l.child_id)) doneByKid.set(l.child_id, new Set());
    doneByKid.get(l.child_id)!.add(ref);
  }
  const pointsBy = new Map((rewards ?? []).map((r) => [r.child_id, r.points_total]));
  const calmKids = new Set(
    (corners ?? [])
      .filter((c) => new Date(c.started_at).getTime() + (c.duration_minutes ?? 5) * 60_000 > nowMs)
      .map((c) => c.child_id),
  );
  const groundedKids = new Set((groundings ?? []).filter((g) => !g.ends_on || g.ends_on >= todayKey).map((g) => g.child_id));
  const validIds = new Set(kidIds);

  // ── Kids now ──────────────────────────────────────────────────────────────
  const todayKids: TodayKid[] = kids.map((k) => {
    const done = doneByKid.get(k.id) ?? new Set<string>();
    const mine = (routines ?? [])
      .filter((r) => r.active && !r.person_id && routineForChild(r as unknown as KioskRoutine, k.id))
      .map((r) => {
        const eff = effectiveSchedule(r as unknown as KioskRoutine, k.id, snap);
        const stepIds = ((r.routine_steps ?? []) as { id: string; deleted_at: string | null }[])
          .filter((s) => !s.deleted_at)
          .map((s) => s.id);
        return { r, eff, total: stepIds.length, done: stepIds.filter((id) => done.has(id)).length };
      })
      .filter((x) => !x.eff.disabled && x.total > 0 && runsToday(x.eff.days_of_week, tz, now))
      .sort((a, b) => toMin(a.eff.start_time ?? "00:00") - toMin(b.eff.start_time ?? "00:00"));

    const unfinished = mine.filter((x) => x.done < x.total);
    const windowed = (x: (typeof mine)[number]) => !!(x.eff.start_time || x.eff.end_time);
    const openNow = unfinished.find((x) => windowed(x) && withinWindow(x.eff, nowMs, tz));
    const anytime = unfinished.find((x) => !windowed(x));
    const nextUp = unfinished.find((x) => x.eff.start_time && toMin(x.eff.start_time) > curMin);
    const late = [...unfinished].reverse().find((x) => windowed(x) && !withinWindow(x.eff, nowMs, tz));
    const pick = openNow ?? anytime ?? nextUp ?? late ?? null;
    let routine: TodayKid["routine"] = null;
    if (pick) {
      const state = pick === openNow ? "now" : pick === anytime ? "anytime" : pick === nextUp ? "next" : "late";
      const hint =
        state === "now" && pick.eff.end_time
          ? `until ${formatClock(pick.eff.end_time)}`
          : state === "next" && pick.eff.start_time
            ? `opens ${formatClock(pick.eff.start_time)}`
            : state === "late"
              ? "time's up"
              : null;
      routine = { id: pick.r.id, name: pick.r.name, emoji: routineEmoji(pick.r), done: pick.done, total: pick.total, state, hint };
    }

    const myChores = ((chores ?? []) as unknown as KioskChore[]).filter(
      (c) => c.active && runsToday(c.days_of_week, tz, now) && choreAssignee(c, validIds, familyDay) === k.id,
    );
    const choresDone = myChores.filter((c) => done.has(c.id)).length;

    return {
      id: k.id,
      name: k.name,
      avatar: k.avatar,
      photo_url: k.photo_url,
      color: k.color,
      stars: pointsBy.get(k.id) ?? 0,
      status: calmKids.has(k.id) ? "calm" : groundedKids.has(k.id) ? "grounded" : null,
      routine,
      routinesToday: mine.length,
      routinesDone: mine.length - unfinished.length,
      chores: { done: choresDone, total: myChores.length },
      allDone: mine.length > 0 && unfinished.length === 0 && choresDone === myChores.length,
    };
  });

  // ── Needs you ─────────────────────────────────────────────────────────────
  const needs: NeedItem[] = [];
  for (const r of requests ?? []) {
    const kid = kidById.get(r.child_id);
    needs.push({
      kind: "request",
      key: `req:${r.id}`,
      id: r.id,
      childName: kid?.name ?? "A child",
      childAvatar: kid?.avatar ?? null,
      childColor: kid?.color ?? null,
      emoji: requestKindMeta(r.kind).emoji,
      summary: requestSummary(r.kind, r.amount, r.body),
      at: r.created_at,
    });
  }
  const taken = new Set((medLogs ?? []).map((l) => `${l.medication_id}:${hhmm(l.dose_time ?? "")}`));
  for (const m of meds ?? []) {
    const days = (m.days_of_week as number[] | null) ?? null;
    if (days && days.length && !days.includes(dow)) continue;
    const kid = kidById.get(m.child_id);
    if (!kid) continue;
    for (const raw of (m.schedule_times as string[] | null) ?? []) {
      const t = hhmm(raw);
      if (!/^\d{2}:\d{2}$/.test(t) || taken.has(`${m.id}:${t}`)) continue;
      const mins = toMin(t);
      if (mins > curMin + 30) continue; // not due yet
      needs.push({
        kind: "med",
        key: `med:${m.id}:${t}`,
        medicationId: m.id,
        childId: m.child_id,
        childName: kid.name,
        name: m.name,
        dose: m.dose,
        time: t,
        timeLabel: formatClock(t),
        overdue: mins < curMin - 60,
        parentGives: m.parent_administered === true,
      });
    }
  }
  for (const r of reminders ?? []) {
    if (r.snoozed_until && r.snoozed_until > todayKey) continue;
    const overdue = r.due_date < todayKey;
    needs.push({
      kind: "reminder",
      key: `rem:${r.id}`,
      id: r.id,
      title: r.title,
      overdue,
      dueLabel: overdue ? `was due ${formatInTz(new Date(`${r.due_date}T12:00:00Z`), "UTC", { month: "short", day: "numeric" })}` : "today",
    });
  }

  // ── Today & tonight ───────────────────────────────────────────────────────
  const evts = (events ?? []) as unknown as KioskEvent[];
  const colorOf = (e: KioskEvent) => (e.child_id ? kidById.get(e.child_id)?.color ?? e.color : e.color) ?? null;
  const toAgenda = (e: KioskEvent, isToday: boolean): AgendaItem => {
    const startMin = e.all_day ? -1 : minutesIntoDayInTz(new Date(e.starts_at), tz);
    return {
      id: e.id,
      title: e.title,
      emoji: e.emoji,
      time: e.all_day ? "All day" : formatTimeInTz(new Date(e.starts_at), tz),
      past: isToday && !e.all_day && startMin < curMin - 30,
      color: colorOf(e),
    };
  };
  const dinnerRow = (meals ?? []).find((m) => m.date === todayKey) ?? null;

  // ── Setup ─────────────────────────────────────────────────────────────────
  const steps = [
    { label: "Add your kids", hint: "Name, picture, and color", done: kids.length > 0, href: "/app/children" },
    {
      label: "Give them a routine",
      hint: "Start from a ready-made one",
      done: (routines ?? []).some((r) => !r.person_id),
      href: kids[0] ? `/app/children/${kids[0].id}` : "/app/children",
    },
    { label: "Add a reward", hint: "Something to spend stars on", done: (storeCount ?? 0) > 0, href: "/app/store" },
    { label: "Set a wall PIN", hint: "Keeps little hands out of settings", done: !!household.parent_pin_hash, href: "/app/settings#pin" },
    { label: "Connect your wall", hint: "Show your family on the tablet", done: (pairings ?? []).some((p) => p.status === "paired"), href: "/app/devices" },
  ];
  const showSetup = (settings.onboardingDismissed !== true || !!opts?.forceSetup) && !steps.every((s) => s.done);

  const hour = Math.floor(curMin / 60);
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return {
    greeting,
    familyName: household.name,
    dateLabel: formatInTz(now, tz, { weekday: "long", month: "long", day: "numeric" }),
    tz,
    needs,
    kids: todayKids,
    today: eventsForDay(evts, now, tz).map((e) => toAgenda(e, true)),
    tomorrow: eventsForDay(evts, tomorrow, tz)
      .slice(0, 3)
      .map((e) => toAgenda(e, false)),
    dinner: dinnerRow ? { title: dinnerRow.title, emoji: dinnerRow.emoji } : null,
    houseMode: readHouseMode(settings, now),
    setup: { steps, show: showSetup },
  };
}
