// "Command" — the shared brain for the parent's live remote (Parent Power).
// Isomorphic + dependency-free so the parent UI, the notify route, and the kiosk wall
// all agree on modes, request kinds, and how to read house-mode out of household.settings.

// ── House modes ─────────────────────────────────────────────────────────────
export type HouseMode = "normal" | "bedtime" | "homework" | "screen_free" | "quiet";

export type HouseModeMeta = {
  mode: HouseMode;
  label: string;
  emoji: string;
  blurb: string; // shown on the parent switch
  wallLine: string; // shown on the wall banner
  /** Wall behavior flags. */
  pausesRewards: boolean; // stars can't be earned/spent while active
  hidesPlay: boolean; // hide the reward store / games
  lock: boolean; // full "screens are resting" overlay (screen-free)
  /** A calm accent the wall tints with. */
  tint: string;
};

export const HOUSE_MODES: HouseModeMeta[] = [
  {
    mode: "normal",
    label: "Normal",
    emoji: "🏠",
    blurb: "Everything as usual",
    wallLine: "",
    pausesRewards: false,
    hidesPlay: false,
    lock: false,
    tint: "#56c7e0",
  },
  {
    mode: "homework",
    label: "Homework",
    emoji: "📚",
    blurb: "Focus — games hidden, routines up",
    wallLine: "Homework time — let's focus",
    pausesRewards: false,
    hidesPlay: true,
    lock: false,
    tint: "#f6b23d",
  },
  {
    mode: "quiet",
    label: "Quiet",
    emoji: "🤫",
    blurb: "Soft & calm, screens dimmed",
    wallLine: "Quiet time",
    pausesRewards: false,
    hidesPlay: false,
    lock: false,
    tint: "#8b9bb4",
  },
  {
    mode: "bedtime",
    label: "Bedtime",
    emoji: "🌙",
    blurb: "Wind down — dim, calm, rewards paused",
    wallLine: "Winding down for bed",
    pausesRewards: true,
    hidesPlay: true,
    lock: false,
    tint: "#7c6cf0",
  },
  {
    mode: "screen_free",
    label: "Screen-free",
    emoji: "🚫",
    blurb: "Lock the walls — screens are resting",
    wallLine: "Screens are resting",
    pausesRewards: false,
    hidesPlay: true,
    lock: true,
    tint: "#5c7178",
  },
];

export function houseModeMeta(mode: string | null | undefined): HouseModeMeta {
  return HOUSE_MODES.find((m) => m.mode === mode) ?? HOUSE_MODES[0];
}

export type HouseModeState = {
  mode: HouseMode;
  until: string | null; // ISO — auto-expires back to normal after this
  except: string[]; // child ids exempt from the mode
  setAt: string | null;
};

const MODES = new Set(HOUSE_MODES.map((m) => m.mode));

/** Tolerant read of household.settings.house_mode, honoring an `until` expiry. */
export function readHouseMode(
  settings: Record<string, unknown> | null | undefined,
  now: Date = new Date(),
): HouseModeState {
  const raw = ((settings ?? {}) as Record<string, unknown>).house_mode;
  const off: HouseModeState = { mode: "normal", until: null, except: [], setAt: null };
  if (!raw || typeof raw !== "object") return off;
  const r = raw as Record<string, unknown>;
  const mode = typeof r.mode === "string" && MODES.has(r.mode as HouseMode) ? (r.mode as HouseMode) : "normal";
  if (mode === "normal") return off;
  const until = typeof r.until === "string" ? r.until : null;
  if (until) {
    const t = Date.parse(until);
    if (Number.isFinite(t) && t <= now.getTime()) return off; // expired → normal
  }
  const except = Array.isArray(r.except) ? r.except.filter((x): x is string => typeof x === "string") : [];
  return { mode, until, except, setAt: typeof r.set_at === "string" ? r.set_at : null };
}

/** The effective mode for a given child (normal if they're exempted). */
export function effectiveHouseMode(state: HouseModeState, childId?: string | null): HouseModeState {
  if (childId && state.except.includes(childId)) return { mode: "normal", until: null, except: [], setAt: null };
  return state;
}

// ── Requests (a kid asks a grown-up) ─────────────────────────────────────────
export type RequestKind = "screen_time" | "reward" | "help" | "snack" | "outside" | "other";

export const REQUEST_KINDS: { kind: RequestKind; label: string; emoji: string; hasAmount?: boolean }[] = [
  { kind: "screen_time", label: "Screen time", emoji: "📺", hasAmount: true },
  { kind: "reward", label: "A reward", emoji: "🎁" },
  { kind: "snack", label: "A snack", emoji: "🍎" },
  { kind: "outside", label: "Go outside", emoji: "🌳" },
  { kind: "help", label: "I need you", emoji: "🤝" },
  { kind: "other", label: "Ask something", emoji: "💬" },
];

export function requestKindMeta(kind: string): { label: string; emoji: string } {
  return REQUEST_KINDS.find((k) => k.kind === kind) ?? { label: "Request", emoji: "💬" };
}

/** A one-line human summary of a request (used in the push + parent inbox + wall). */
export function requestSummary(kind: string, amount?: number | null, body?: string | null): string {
  const meta = requestKindMeta(kind);
  if (kind === "screen_time") return amount ? `${amount} min of screen time` : "some screen time";
  if (kind === "other" || kind === "help") return body?.trim() || meta.label;
  const base = meta.label.toLowerCase();
  return body?.trim() ? `${base} — ${body.trim()}` : base;
}
