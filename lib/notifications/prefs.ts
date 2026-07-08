// Notification preferences — shared types + defaults + the calm delivery logic (categories, quiet
// hours, lock-screen detail level). Pure/isomorphic so the Settings UI and the server dispatch agree.

// Granular, per-type categories so a parent can pick exactly what reaches their phone
// (event reminders vs. the daily AI summary vs. routines, etc.). `notifications.category`
// is a plain text column and `mergePrefs` tolerates unknown/legacy keys, so adding a
// category needs no migration and existing parents keep their saved toggles.
export type NotifCategory =
  | "distress" // tier 1 — a child needs you (SOS / calm corner); always on
  | "approvals" // tier 2 — a chore/reward is waiting for your OK
  | "routines" // tier 3 — a routine finished, or was missed
  | "moments" // tier 3 — celebrations & milestones
  | "medication" // tier 3 — a dose is due or was missed
  | "messages" // tier 3 — a note posted to the wall for you
  | "events" // tier 4 — an upcoming calendar event
  | "briefing" // tier 4 — the daily summary from Harbor
  | "digest"; // tier 5 — the weekly wrap-up
export type DetailLevel = "full" | "names" | "discreet";

export type NotifPrefs = {
  categories: Record<NotifCategory, boolean>;
  quietHours: { enabled: boolean; start: string; end: string; allowCritical: boolean };
  detailLevel: DetailLevel;
};

/** Urgency tier per category (lower = more urgent). Tier 1 = "your child needs you". */
export const CATEGORY_TIER: Record<NotifCategory, number> = {
  distress: 1,
  approvals: 2,
  routines: 3,
  moments: 3,
  medication: 3,
  messages: 3,
  events: 4,
  briefing: 4,
  digest: 5,
};

export const CATEGORY_LABEL: Record<NotifCategory, string> = {
  distress: "When your child needs you",
  approvals: "Approvals & requests",
  routines: "Routines — finished or missed",
  moments: "Moments & celebrations",
  medication: "Medication reminders",
  messages: "Messages from the wall",
  events: "Event reminders",
  briefing: "Daily summary from Harbor",
  digest: "Weekly digest",
};

/** One-line helper shown under each toggle in Settings. */
export const CATEGORY_DESC: Record<NotifCategory, string> = {
  distress: "SOS and calm-corner alerts. Always on.",
  approvals: "A chore or reward is waiting for your OK.",
  routines: "When a child finishes their day — or a window closes unfinished.",
  moments: "Streaks, big wins, and points milestones.",
  medication: "A dose is coming up, or was missed.",
  messages: "A note posted to the wall for you.",
  events: "A heads-up before a calendar event.",
  briefing: "A short morning rundown of everyone's day.",
  digest: "A gentle weekly recap of patterns and wins.",
};

/** Display order for the Settings list — most urgent first. */
export const CATEGORY_ORDER: NotifCategory[] = [
  "distress",
  "approvals",
  "routines",
  "medication",
  "messages",
  "moments",
  "events",
  "briefing",
  "digest",
];

/** Conservative, high-signal defaults: everything on, quiet hours off, full detail. */
export const DEFAULT_PREFS: NotifPrefs = {
  categories: {
    distress: true,
    approvals: true,
    routines: true,
    moments: true,
    medication: true,
    messages: true,
    events: true,
    briefing: true,
    digest: true,
  },
  quietHours: { enabled: false, start: "21:00", end: "07:00", allowCritical: true },
  detailLevel: "full",
};

const CATS: NotifCategory[] = CATEGORY_ORDER;

/** Merge stored prefs over the defaults, tolerating partial/legacy shapes. */
export function mergePrefs(raw: unknown): NotifPrefs {
  const r = (raw ?? {}) as Partial<NotifPrefs> & { categories?: Partial<Record<NotifCategory, boolean>>; quietHours?: Partial<NotifPrefs["quietHours"]> };
  const categories = { ...DEFAULT_PREFS.categories };
  for (const c of CATS) if (typeof r.categories?.[c] === "boolean") categories[c] = r.categories[c] as boolean;
  const qh: Partial<NotifPrefs["quietHours"]> = r.quietHours ?? {};
  const detail: DetailLevel = r.detailLevel === "names" || r.detailLevel === "discreet" ? r.detailLevel : "full";
  return {
    categories,
    detailLevel: detail,
    quietHours: {
      enabled: qh.enabled === true,
      start: typeof qh.start === "string" && /^\d{2}:\d{2}$/.test(qh.start) ? qh.start : DEFAULT_PREFS.quietHours.start,
      end: typeof qh.end === "string" && /^\d{2}:\d{2}$/.test(qh.end) ? qh.end : DEFAULT_PREFS.quietHours.end,
      allowCritical: qh.allowCritical !== false,
    },
  };
}

/** Minutes-since-midnight of the current time in the given IANA timezone. */
function nowMinutesInTz(tz: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
    const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
    const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
    return (h % 24) * 60 + m;
  } catch {
    return -1;
  }
}

function hmToMin(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return (h % 24) * 60 + (m || 0);
}

/** Is it currently inside the parent's quiet-hours window (handles overnight windows)? */
export function withinQuietHours(qh: NotifPrefs["quietHours"], tz: string): boolean {
  if (!qh.enabled) return false;
  const now = nowMinutesInTz(tz);
  if (now < 0) return false;
  const start = hmToMin(qh.start);
  const end = hmToMin(qh.end);
  if (start === end) return false;
  return start < end ? now >= start && now < end : now >= start || now < end; // overnight
}

export type PushDecision = "skip" | "record" | "push";

/** Decide what to do with an event for one parent: skip entirely (category off), write the in-app
 *  record only (held by quiet hours), or record + push. Tier 1 (distress) always pushes when the
 *  category is on and quiet-hours "allow critical" is set (default). */
export function decide(prefs: NotifPrefs, category: NotifCategory, tz: string): PushDecision {
  const tier = CATEGORY_TIER[category];
  // Tier 1 ("your child needs you") ALWAYS reaches the parent — checked BEFORE the category toggle so a
  // (mis)toggled distress category can never fully suppress a safety alert. Quiet hours only hold the
  // push (keeping the durable record + badge) and only if the parent explicitly disallowed critical.
  if (tier === 1) {
    return prefs.quietHours.enabled && withinQuietHours(prefs.quietHours, tz) && !prefs.quietHours.allowCritical ? "record" : "push";
  }
  if (prefs.categories[category] === false) return "skip";
  if (withinQuietHours(prefs.quietHours, tz)) return "record"; // hold the push; keep the record + badge
  return "push";
}

/** Apply the lock-screen detail level to a PUSH payload (the in-app record always keeps full detail). */
export function applyDetail(level: DetailLevel, title: string, body: string): { title: string; body: string } {
  if (level === "discreet") return { title: "Harbor", body: "You have an update — tap to open." };
  if (level === "names") return { title, body: "Tap to open." };
  return { title, body };
}
