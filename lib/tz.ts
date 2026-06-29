// Family timezone — Harbor pins all calendar + day-rollover math to ONE configured
// zone (default America/New_York), so the wall, the parents' phones, and "today" all
// agree regardless of each device's OS clock. Events are stored as absolute UTC
// instants (timestamptz); these helpers format + bucket them in the family zone, and
// interpret a parent's wall-clock entry as the family zone (not the entering device's).
// Pure (Intl only) → safe on client and server.

export const DEFAULT_TZ = "America/New_York";

/** The household's timezone, or the default. Accepts the settings jsonb. */
export function tzFromSettings(settings: Record<string, unknown> | null | undefined): string {
  const t = settings?.timezone;
  return typeof t === "string" && t.trim() ? t : DEFAULT_TZ;
}

type Parts = { year: number; month: number; day: number; hour: number; minute: number; weekday: number };

const WD: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** The calendar parts of an instant AS SEEN in `tz`. */
export function partsInTz(date: Date | number, tz: string): Parts {
  const d = typeof date === "number" ? new Date(date) : date;
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });
  const o: Record<string, string> = {};
  for (const p of f.formatToParts(d)) o[p.type] = p.value;
  return {
    year: Number(o.year),
    month: Number(o.month),
    day: Number(o.day),
    hour: Number(o.hour),
    minute: Number(o.minute),
    weekday: WD[o.weekday] ?? 0,
  };
}

/** YYYY-MM-DD of an instant in `tz` (the family's "which day"). */
export function dayKeyInTz(date: Date | number, tz: string): string {
  const p = partsInTz(date, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Minutes since midnight of an instant in `tz` (for calendar placement/sorting). */
export function minutesIntoDayInTz(date: Date | number, tz: string): number {
  const p = partsInTz(date, tz);
  return p.hour * 60 + p.minute;
}

/** Day-of-week (0=Sun..6=Sat) of an instant in `tz`. */
export function weekdayInTz(date: Date | number, tz: string): number {
  return partsInTz(date, tz).weekday;
}

/** "3:00 PM" — an instant's time formatted in `tz`. */
export function formatTimeInTz(date: Date | number, tz: string): string {
  const d = typeof date === "number" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(d);
}

/** A date/time string in `tz` with the given Intl options. */
export function formatInTz(date: Date | number, tz: string, opts: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "number" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, ...opts }).format(d);
}

/** Interpret a wall-clock entry (datetime-local "YYYY-MM-DDTHH:mm", no zone) as a time
 *  in `tz` and return the absolute UTC instant (ms). DST-correct via offset lookup.
 *  This pins a parent's "3 PM" to 3 PM in the FAMILY zone, not their device's zone. */
export function wallTimeToUtcMs(naive: string, tz: string): number {
  const m = naive.match(/(\d{4})-(\d{1,2})-(\d{1,2})[T ](\d{1,2}):(\d{2})/);
  if (!m) return NaN;
  const Y = +m[1], Mo = +m[2], D = +m[3], H = +m[4], Mi = +m[5];
  const wallAsUtc = Date.UTC(Y, Mo - 1, D, H, Mi);
  // The zone's offset from UTC at a given instant.
  const offsetAt = (utcMs: number) => {
    const p = partsInTz(new Date(utcMs), tz);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - utcMs;
  };
  // Two passes: the first guess can land in the wrong DST regime near a transition;
  // re-evaluating the offset at the candidate instant converges (DST-correct).
  let utc = wallAsUtc - offsetAt(wallAsUtc);
  utc = wallAsUtc - offsetAt(utc);
  return utc;
}

/** UTC instant → a datetime-local "YYYY-MM-DDTHH:mm" string showing the wall time in
 *  `tz` (for prefilling a datetime-local input from a stored instant). */
export function utcMsToWallInTz(ms: number, tz: string): string {
  const p = partsInTz(new Date(ms), tz);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}
