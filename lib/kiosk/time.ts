// Time integrity (Edge Cases §1.2). The economy must never trust the raw device
// clock a child can change in Settings. We anchor "now" to the last server time
// (returned by every sync, stored as state.lastSync) plus the wall-clock elapsed
// since that sync, and we flag a backward jump as suspect (real time never reverses).

import type { KioskState } from "./types";

/** Server-anchored "now" in ms. Falls back to the device clock before first sync. */
export function trustedNow(s: KioskState): number {
  if (s.lastSync && s.trustedAt) {
    const anchor = Date.parse(s.lastSync);
    if (!Number.isNaN(anchor)) return anchor + (Date.now() - s.trustedAt);
  }
  return Date.now();
}

/** Local YYYY-MM-DD for a given ms (matches todayKey's format). */
export function dayKeyOf(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** The economy's service day. Frozen at the last trusted day while the clock looks
 *  tampered, so a clock change can't roll the day over to re-earn (§E2/§E3). */
export function serviceDay(s: KioskState): string {
  if (s.clockSuspect && s.lastTrustedDay) return s.lastTrustedDay;
  return dayKeyOf(trustedNow(s));
}

/** A backward wall-clock jump since we last looked → tampering (time never reverses). */
export function clockJumpedBack(s: KioskState): boolean {
  return typeof s.lastSeenWall === "number" && Date.now() < s.lastSeenWall - 60_000;
}
