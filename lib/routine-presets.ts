import { formatClock } from "@/lib/kiosk/calendar";

// "When does it happen?" — the three everyday windows, shared by the routine editor and the
// starter set so a new kid's wall opens on the right routine at the right time. A window only
// keeps a routine from opening EARLY; a missed one can always be caught up on the wall.

/** "6:30 – 9:00 AM" (one AM/PM when both ends share it), else "11:00 AM – 1:00 PM". */
export function formatSpan(start: string, end: string): string {
  const a = formatClock(start);
  const b = formatClock(end);
  return a.slice(-2) === b.slice(-2) ? `${a.slice(0, -3)} – ${b}` : `${a} – ${b}`;
}

export const WHEN_PRESETS = [
  { key: "morning", label: "Morning", emoji: "🌅", start: "06:30", end: "09:00" },
  { key: "afterschool", label: "After school", emoji: "🎒", start: "15:00", end: "18:00" },
  { key: "bedtime", label: "Bedtime", emoji: "🌙", start: "18:30", end: "21:00" },
] as const;
export type WhenPreset = (typeof WHEN_PRESETS)[number];

/** A sensible default window from a routine's name ("ADHD-friendly morning" → Morning). */
export function presetForName(name: string): WhenPreset | null {
  const n = name.toLowerCase();
  if (/morning|wake/.test(n)) return WHEN_PRESETS[0];
  if (/after ?school|homework/.test(n)) return WHEN_PRESETS[1];
  if (/bed|night|sleep/.test(n)) return WHEN_PRESETS[2];
  return null;
}

/** Which preset (if any) exactly matches a start/end pair. */
export function presetFor(start: string | null, end: string | null): WhenPreset | null {
  const s = start?.slice(0, 5) ?? null;
  const e = end?.slice(0, 5) ?? null;
  return WHEN_PRESETS.find((p) => p.start === s && p.end === e) ?? null;
}
