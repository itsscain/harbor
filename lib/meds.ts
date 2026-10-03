import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { Household } from "@/lib/types";
import { formatClock } from "@/lib/kiosk/calendar";
import { tzFromSettings, dayKeyInTz, minutesIntoDayInTz, weekdayInTz, formatInTz, formatTimeInTz } from "@/lib/tz";

// Medicine, by kid: each medicine's schedule, today's doses (given / due / later / not logged),
// and a two-week log for the doctor — all in the family time zone, matching the wall.

type Db = SupabaseClient<Database>;
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
};

export type DoseToday = { time: string; label: string; status: "given" | "due" | "later" | "missed"; givenLabel: string | null };
export type MedRow = {
  id: string;
  childId: string;
  name: string;
  dose: string | null;
  icon: string | null;
  times: string[];
  days: number[] | null;
  withFood: boolean;
  parentGives: boolean;
  helpsNote: string | null;
  active: boolean;
  scheduleLabel: string;
  today: DoseToday[];
};
export type MedKid = { id: string; name: string; avatar: string | null; photo_url: string | null; color: string | null; meds: MedRow[] };
export type MedLogDay = { key: string; label: string; entries: { id: string; kidName: string; medName: string; icon: string | null; doseLabel: string; at: string; by: string }[] };

const daysLabel = (days: number[] | null) =>
  !days || days.length === 0 || days.length === 7
    ? "Every day"
    : days.length === 5 && [1, 2, 3, 4, 5].every((d) => days.includes(d))
      ? "Weekdays"
      : days.map((d) => DOW[d]).join(", ");

export async function loadMeds(supabase: Db, household: Household): Promise<{ kids: MedKid[]; log: MedLogDay[]; tz: string }> {
  const tz = tzFromSettings((household.settings ?? {}) as Record<string, unknown>);
  const now = new Date();
  const todayKey = dayKeyInTz(now, tz);
  const curMin = minutesIntoDayInTz(now, tz);
  const dow = weekdayInTz(now, tz);
  const since = new Date(`${todayKey}T12:00:00Z`);
  since.setUTCDate(since.getUTCDate() - 13);
  const sinceKey = since.toISOString().slice(0, 10);

  const [{ data: kids }, { data: meds }, { data: logs }] = await Promise.all([
    supabase.from("children").select("id, name, avatar, photo_url, color").eq("household_id", household.id).is("deleted_at", null).order("sort_order"),
    supabase
      .from("medications")
      .select("id, child_id, name, dose, icon, schedule_times, days_of_week, with_food, parent_administered, helps_note, active, sort_order")
      .eq("household_id", household.id)
      .is("deleted_at", null)
      .order("sort_order"),
    supabase
      .from("medication_logs")
      .select("id, child_id, medication_id, dose_date, dose_time, status, confirmed_by, taken_at")
      .eq("household_id", household.id)
      .gte("dose_date", sinceKey)
      .order("taken_at", { ascending: false })
      .limit(300),
  ]);

  const byOf = (c: string | null) => (c === "parent" ? "a grown-up" : c === "child" ? "on the wall" : "logged");
  const todayLogs = (logs ?? []).filter((l) => l.dose_date === todayKey);

  const rowOf = (m: NonNullable<typeof meds>[number]): MedRow => {
    const times = [...(m.schedule_times ?? [])].map((t) => t.slice(0, 5)).sort();
    const days = (m.days_of_week as number[] | null) ?? null;
    const runsToday = m.active && (!days || days.length === 0 || days.includes(dow));
    const today: DoseToday[] = runsToday
      ? times.map((t) => {
          const log = todayLogs.find((l) => l.medication_id === m.id && (l.dose_time ?? "").slice(0, 5) === t);
          const tMin = toMin(t);
          const status: DoseToday["status"] = log ? "given" : curMin >= tMin + 60 ? "missed" : curMin >= tMin - 30 ? "due" : "later";
          return {
            time: t,
            label: formatClock(t),
            status,
            givenLabel: log ? `${formatTimeInTz(new Date(log.taken_at), tz)} · ${byOf(log.confirmed_by)}` : null,
          };
        })
      : [];
    return {
      id: m.id,
      childId: m.child_id,
      name: m.name,
      dose: m.dose,
      icon: m.icon,
      times,
      days,
      withFood: m.with_food,
      parentGives: m.parent_administered,
      helpsNote: m.helps_note,
      active: m.active,
      scheduleLabel: [times.map(formatClock).join(" · ") || "No times set", daysLabel(days)].join(" · "),
      today,
    };
  };

  const medById = new Map((meds ?? []).map((m) => [m.id, m]));
  const kidName = new Map((kids ?? []).map((k) => [k.id, k.name]));
  const logDays = new Map<string, MedLogDay>();
  for (const l of logs ?? []) {
    const med = medById.get(l.medication_id);
    if (!med) continue;
    const day =
      logDays.get(l.dose_date) ??
      ({
        key: l.dose_date,
        label: l.dose_date === todayKey ? "Today" : formatInTz(new Date(`${l.dose_date}T12:00:00Z`), "UTC", { weekday: "short", month: "short", day: "numeric" }),
        entries: [],
      } as MedLogDay);
    day.entries.push({
      id: l.id,
      kidName: kidName.get(l.child_id) ?? "",
      medName: med.name,
      icon: med.icon,
      doseLabel: l.dose_time ? formatClock(l.dose_time) : "",
      at: formatTimeInTz(new Date(l.taken_at), tz),
      by: byOf(l.confirmed_by),
    });
    logDays.set(l.dose_date, day);
  }

  return {
    tz,
    kids: (kids ?? []).map((k) => ({ ...k, meds: (meds ?? []).filter((m) => m.child_id === k.id).map(rowOf) })),
    log: [...logDays.values()].sort((a, b) => (a.key < b.key ? 1 : -1)),
  };
}
