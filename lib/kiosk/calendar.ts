import type { KioskEvent } from "./types";
import { DEFAULT_TZ, dayKeyInTz, minutesIntoDayInTz, weekdayInTz, formatTimeInTz } from "@/lib/tz";

/**
 * Whether an event occurs on `date`, expanding a simple recurrence rule on-device
 * (no network). Supported rules: "" (one-off), "daily", "weekdays", "weekly",
 * "weekly:0,2,4" (0=Sun..6=Sat). All day/weekday math is done in the family `tz`
 * so an event lands on the same calendar day on every device.
 */
export function occursOn(event: KioskEvent, date: Date, tz: string = DEFAULT_TZ): boolean {
  const start = new Date(event.starts_at);
  if (Number.isNaN(start.getTime())) return false;
  const rule = (event.recurrence_rule ?? "").trim().toLowerCase();
  const startKey = dayKeyInTz(start, tz);
  const dateKey = dayKeyInTz(date, tz);

  if (!rule) return startKey === dateKey;

  // Recurring events only show on/after their first date (YYYY-MM-DD compares lexically).
  if (dateKey < startKey) return false;

  const dow = weekdayInTz(date, tz);
  if (rule === "daily") return true;
  if (rule === "weekdays") return dow >= 1 && dow <= 5;
  if (rule === "weekly") return dow === weekdayInTz(start, tz);
  if (rule.startsWith("weekly:")) {
    const days = rule
      .slice("weekly:".length)
      .split(",")
      .map((n) => Number(n.trim()))
      .filter((n) => Number.isFinite(n));
    return days.includes(dow);
  }
  return false;
}

/** Minutes-since-midnight (in the family tz) for an event's start time (for sorting). */
function startMinutes(event: KioskEvent, tz: string): number {
  if (event.all_day) return -1;
  return minutesIntoDayInTz(new Date(event.starts_at), tz);
}

export function eventsForDay(events: KioskEvent[], date: Date, tz: string = DEFAULT_TZ): KioskEvent[] {
  return events
    .filter((e) => occursOn(e, date, tz))
    .sort((a, b) => startMinutes(a, tz) - startMinutes(b, tz));
}

/** Next `days` days (including today) that have at least one event. */
export function upcomingDays(
  events: KioskEvent[],
  days = 7,
  tz: string = DEFAULT_TZ,
): { date: Date; events: KioskEvent[] }[] {
  const out: { date: Date; events: KioskEvent[] }[] = [];
  const now = Date.now();
  for (let i = 0; i < days; i++) {
    const d = new Date(now + i * 86_400_000);
    const evs = eventsForDay(events, d, tz);
    if (evs.length) out.push({ date: d, events: evs });
  }
  return out;
}

/** Whether a routine runs today, given its days_of_week (0=Sun..6=Sat), in the family
 *  tz. Null/empty means "every day". */
export function runsToday(daysOfWeek: number[] | null | undefined, tz: string = DEFAULT_TZ, date = new Date()): boolean {
  if (!daysOfWeek || daysOfWeek.length === 0) return true;
  return daysOfWeek.includes(weekdayInTz(date, tz));
}

function toMin(t: string): number {
  const [h, m] = t.split(":").map((n) => Number(n));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

/** Whether `nowMs` falls inside a routine's time window (its start_time..end_time, in
 *  the family tz). No window set (both null) → always available. Handles an overnight
 *  window (end before start). This is the time-LOCK the parent sets on a routine. */
export function withinWindow(
  routine: { start_time?: string | null; end_time?: string | null },
  nowMs: number,
  tz: string = DEFAULT_TZ,
): boolean {
  const s = routine.start_time;
  const e = routine.end_time;
  if (!s && !e) return true;
  const cur = minutesIntoDayInTz(nowMs, tz);
  const sm = s ? toMin(s) : 0;
  const em = e ? toMin(e) : 24 * 60;
  return sm <= em ? cur >= sm && cur < em : cur >= sm || cur < em;
}

/** "7:00 AM" — a "HH:MM[:SS]" clock string formatted for display. */
export function formatClock(t: string): string {
  const [h, m] = t.split(":").map((n) => Number(n));
  if (!Number.isFinite(h)) return t;
  const am = h < 12;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(Number.isFinite(m) ? m : 0).padStart(2, "0")} ${am ? "AM" : "PM"}`;
}

/** A routine's availability window as a label, or null if always available. */
export function windowLabel(routine: { start_time?: string | null; end_time?: string | null }): string | null {
  const s = routine.start_time;
  const e = routine.end_time;
  if (!s && !e) return null;
  if (s && e) return `${formatClock(s)} – ${formatClock(e)}`;
  if (s) return `from ${formatClock(s)}`;
  return `until ${formatClock(e as string)}`;
}

export function formatEventTime(event: KioskEvent, tz: string = DEFAULT_TZ): string {
  if (event.all_day) return "All day";
  return formatTimeInTz(new Date(event.starts_at), tz);
}
