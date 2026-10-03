import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { Household } from "@/lib/types";
import type { KioskEvent } from "@/lib/kiosk/types";
import { occursOn } from "@/lib/kiosk/calendar";
import { childColor } from "@/lib/kiosk/colors";
import { tzFromSettings, dayKeyInTz, formatInTz, formatTimeInTz, minutesIntoDayInTz, utcMsToWallInTz, wallTimeToUtcMs } from "@/lib/tz";

// The Plan tab's agenda: the next two weeks as one list — events (repeats expanded with the
// wall's own rules), reminders, and meals — grouped by day in the family time zone.

type Db = SupabaseClient<Database>;

export type PlanKid = { id: string; name: string; avatar: string | null; photo_url: string | null; color: string | null };

export type EventEdit = {
  id: string;
  title: string;
  emoji: string | null;
  date: string;
  time: string | null;
  childId: string | null;
  repeat: string | null;
  location: string | null;
  countdown: boolean;
};
export type ReminderEdit = { id: string; title: string; dueDate: string; childId: string | null; done: boolean };
export type MealEdit = { id: string | null; date: string; title: string; emoji: string | null; mealType: string; notes: string | null };

export type PlanEvent = { kind: "event"; key: string; time: string; sortMin: number; color: string; who: string | null; repeatLabel: string | null; edit: EventEdit };
export type PlanReminder = { kind: "reminder"; key: string; who: string | null; overdueLabel: string | null; edit: ReminderEdit };
export type PlanMeal = { kind: "meal"; key: string; edit: MealEdit };

export type PlanDay = {
  key: string;
  label: string;
  sub: string;
  isToday: boolean;
  /** Dinner slot shown for the coming week so planning dinners is one tap. */
  showDinnerSlot: boolean;
  meals: PlanMeal[];
  events: PlanEvent[];
  reminders: PlanReminder[];
};

export type PlanModel = { tz: string; todayKey: string; overdue: PlanReminder[]; days: PlanDay[]; kids: PlanKid[] };

const REPEAT_LABEL: Record<string, string> = { daily: "Every day", weekdays: "Weekdays", weekly: "Every week" };
const addDays = (key: string, n: number) => {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export async function buildPlanModel(supabase: Db, household: Household, days = 14): Promise<PlanModel> {
  const tz = tzFromSettings((household.settings ?? {}) as Record<string, unknown>);
  const now = new Date();
  const todayKey = dayKeyInTz(now, tz);
  const lastKey = addDays(todayKey, days - 1);
  const startIso = new Date(wallTimeToUtcMs(`${todayKey}T00:00`, tz)).toISOString();
  const endIso = new Date(wallTimeToUtcMs(`${addDays(lastKey, 1)}T00:00`, tz)).toISOString();

  const [{ data: events }, { data: reminders }, { data: meals }, { data: kids }] = await Promise.all([
    supabase
      .from("events")
      .select("id, child_id, title, emoji, location, starts_at, ends_at, all_day, is_countdown, person_label, color, responsible_label, recurrence_rule")
      .eq("household_id", household.id)
      .is("deleted_at", null)
      .lt("starts_at", endIso)
      .or(`starts_at.gte."${startIso}",recurrence_rule.not.is.null`)
      .order("starts_at")
      .limit(500),
    supabase
      .from("reminders")
      .select("id, title, due_date, child_id, done, snoozed_until")
      .eq("household_id", household.id)
      .is("deleted_at", null)
      .eq("done", false)
      .lte("due_date", lastKey)
      .order("due_date")
      .limit(200),
    supabase
      .from("meals")
      .select("id, date, title, emoji, meal_type, notes, sort_order")
      .eq("household_id", household.id)
      .is("deleted_at", null)
      .gte("date", todayKey)
      .lte("date", lastKey)
      .order("date")
      .order("sort_order"),
    supabase.from("children").select("id, name, avatar, photo_url, color").eq("household_id", household.id).is("deleted_at", null).order("sort_order"),
  ]);

  const kidById = new Map((kids ?? []).map((k) => [k.id, k]));
  const whoOf = (id: string | null) => (id ? kidById.get(id)?.name ?? null : null);

  const toEdit = (e: KioskEvent): EventEdit => {
    const wall = utcMsToWallInTz(new Date(e.starts_at).getTime(), tz);
    return {
      id: e.id,
      title: e.title,
      emoji: e.emoji,
      date: wall.slice(0, 10),
      time: e.all_day ? null : wall.slice(11, 16),
      childId: e.child_id,
      repeat: e.recurrence_rule,
      location: e.location,
      countdown: e.is_countdown,
    };
  };

  // Snoozed reminders show on the day they were moved to.
  type R = NonNullable<typeof reminders>[number];
  const effectiveDue = (r: R) => (r.snoozed_until && r.snoozed_until > r.due_date ? r.snoozed_until : r.due_date);
  const reminderItem = (r: R): PlanReminder => ({
    kind: "reminder",
    key: `rem:${r.id}`,
    who: whoOf(r.child_id),
    overdueLabel: effectiveDue(r) < todayKey ? `Was due ${formatInTz(new Date(`${r.due_date}T12:00:00Z`), "UTC", { month: "short", day: "numeric" })}` : null,
    edit: { id: r.id, title: r.title, dueDate: r.due_date, childId: r.child_id, done: r.done },
  });

  const out: PlanDay[] = [];
  for (let i = 0; i < days; i++) {
    const key = addDays(todayKey, i);
    const noon = new Date(wallTimeToUtcMs(`${key}T12:00`, tz));
    const dayEvents: PlanEvent[] = ((events ?? []) as unknown as KioskEvent[])
      .filter((e) => occursOn(e, noon, tz))
      .map((e) => ({
        kind: "event" as const,
        key: `ev:${e.id}:${key}`,
        time: e.all_day ? "All day" : formatTimeInTz(new Date(e.starts_at), tz),
        sortMin: e.all_day ? -1 : minutesIntoDayInTz(new Date(e.starts_at), tz),
        color: e.child_id && kidById.has(e.child_id) ? childColor(kidById.get(e.child_id)!) : (e.color ?? "#18606F"),
        who: whoOf(e.child_id) ?? e.person_label,
        repeatLabel: e.recurrence_rule ? (REPEAT_LABEL[e.recurrence_rule] ?? "Repeats") : null,
        edit: toEdit(e),
      }))
      .sort((a, b) => a.sortMin - b.sortMin);
    const dayReminders = (reminders ?? []).filter((r) => effectiveDue(r) === key).map(reminderItem);
    const dayMeals: PlanMeal[] = (meals ?? [])
      .filter((m) => m.date === key)
      .map((m) => ({
        kind: "meal" as const,
        key: `meal:${m.id}`,
        edit: { id: m.id, date: m.date, title: m.title, emoji: m.emoji, mealType: m.meal_type, notes: m.notes },
      }));
    const label = i === 0 ? "Today" : i === 1 ? "Tomorrow" : formatInTz(noon, tz, { weekday: "long" });
    const sub = formatInTz(noon, tz, { month: "short", day: "numeric" });
    const showDinnerSlot = i < 7;
    if (i >= 7 && !dayEvents.length && !dayReminders.length && !dayMeals.length) continue;
    out.push({ key, label, sub, isToday: i === 0, showDinnerSlot, meals: dayMeals, events: dayEvents, reminders: dayReminders });
  }

  return {
    tz,
    todayKey,
    overdue: (reminders ?? []).filter((r) => effectiveDue(r) < todayKey).map(reminderItem),
    days: out,
    kids: kids ?? [],
  };
}
