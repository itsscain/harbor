import type { KioskEvent } from "./types";

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * Whether an event occurs on `date`, expanding a simple recurrence rule
 * on-device (no network). Supported rules: "" (one-off), "daily", "weekdays",
 * "weekly", "weekly:0,2,4" (0=Sun..6=Sat).
 */
export function occursOn(event: KioskEvent, date: Date): boolean {
  const start = new Date(event.starts_at);
  if (Number.isNaN(start.getTime())) return false;
  const rule = (event.recurrence_rule ?? "").trim().toLowerCase();

  if (!rule) return sameDay(start, date);

  // Recurring events only show on/after their first date.
  if (startOfDay(date) < startOfDay(start)) return false;

  const dow = date.getDay();
  if (rule === "daily") return true;
  if (rule === "weekdays") return dow >= 1 && dow <= 5;
  if (rule === "weekly") return dow === start.getDay();
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

/** Minutes-since-midnight for an event's start time (for sorting). */
function startMinutes(event: KioskEvent): number {
  if (event.all_day) return -1;
  const d = new Date(event.starts_at);
  return d.getHours() * 60 + d.getMinutes();
}

export function eventsForDay(events: KioskEvent[], date: Date): KioskEvent[] {
  return events
    .filter((e) => occursOn(e, date))
    .sort((a, b) => startMinutes(a) - startMinutes(b));
}

/** Next `days` days (including today) that have at least one event. */
export function upcomingDays(
  events: KioskEvent[],
  days = 7,
): { date: Date; events: KioskEvent[] }[] {
  const out: { date: Date; events: KioskEvent[] }[] = [];
  const base = startOfDay(new Date());
  for (let i = 0; i < days; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const evs = eventsForDay(events, d);
    if (evs.length) out.push({ date: d, events: evs });
  }
  return out;
}

export function formatEventTime(event: KioskEvent): string {
  if (event.all_day) return "All day";
  const d = new Date(event.starts_at);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
