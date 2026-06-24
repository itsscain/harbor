// The wall is "awake to the time of day." A single source of truth for which
// daypart bucket we're in, used by the Living Ambient (background) and the
// Beacon (which settles to an ember at night). Pure; client + server safe.

export type Daypart = "dawn" | "morning" | "midday" | "afternoon" | "golden" | "dusk" | "night";

/** Map an hour (0-23) to its daypart bucket. See HARBOR_V2 §3.1. */
export function daypartFor(date: Date = new Date()): Daypart {
  const h = date.getHours();
  if (h >= 5 && h < 8) return "dawn";
  if (h >= 8 && h < 11) return "morning";
  if (h >= 11 && h < 15) return "midday";
  if (h >= 15 && h < 18) return "afternoon";
  if (h >= 18 && h < 20) return "golden";
  if (h >= 20 && h < 21) return "dusk";
  return "night";
}

export function isNight(date: Date = new Date()): boolean {
  return daypartFor(date) === "night";
}
