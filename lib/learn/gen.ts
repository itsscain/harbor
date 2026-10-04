import type { Activity, GradeId, Lesson, Option, SubjectId, ThemeId, Unit, Visual } from "./types";
import { themeFor } from "./meta";

// Shared machinery for generating big courses from small, careful definitions: a seeded RNG
// (so a level is the same on every screen), plausible wrong answers, number words, and level
// assembly — every world gets lessons that ramp up, a review level that mixes earlier skills,
// and a boss level at the end.

export type Rng = () => number;
export function rng(seed: string): Rng {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
export const int = (r: Rng, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
export const pick = <T>(r: Rng, a: readonly T[]): T => a[Math.floor(r() * a.length)];
export function pickN<T>(r: Rng, from: readonly T[], n: number, not: (x: T) => boolean = () => false): T[] {
  const pool = from.filter((x) => !not(x));
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  return out;
}
export function shuffle<T>(r: Rng, a: readonly T[]): T[] {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ── Number words (voice keys) ───────────────────────────────────────────────────────────────
const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
export function numberWord(n: number): string {
  if (n < 0) return `minus ${numberWord(-n)}`;
  if (n < 20) return ONES[n];
  if (n < 100) return n % 10 ? `${TENS[Math.floor(n / 10)]}-${ONES[n % 10]}` : TENS[n / 10];
  if (n < 1000) return n % 100 ? `${ONES[Math.floor(n / 100)]} hundred ${numberWord(n % 100)}` : `${ONES[n / 100]} hundred`;
  return String(n);
}
/** Voice key for a number (only up to 100 are recorded; bigger ones are read, not spoken). */
export const numKey = (n: number): string[] => (n >= 0 && n <= 100 ? [numberWord(n)] : []);

/** Plausible wrong answers near a number (no negatives, no duplicates). */
export function nearNumbers(r: Rng, answer: number, count: number, opts: { spread?: number; min?: number; max?: number; also?: number[] } = {}): number[] {
  const spread = opts.spread ?? 3;
  const min = opts.min ?? 0;
  const max = opts.max ?? Number.MAX_SAFE_INTEGER;
  const set = new Set<number>([answer]);
  for (const a of opts.also ?? []) if (a >= min && a <= max && set.size < count + 1) set.add(a);
  let guard = 0;
  while (set.size < count + 1 && guard++ < 200) {
    const d = int(r, 1, spread) * (r() < 0.5 ? -1 : 1);
    const v = answer + d;
    if (v >= min && v <= max) set.add(v);
  }
  for (let v = answer + 1; set.size < count + 1; v++) set.add(v);
  return [...set].filter((v) => v !== answer).slice(0, count);
}

const sortNum = (a: number[]) => [...a].sort((x, y) => x - y);

/** A number-answer choice item (options shown in numeric order — calmer for kids). */
export function numChoice(o: {
  r: Rng;
  prompt: string;
  say?: string[];
  visual?: Visual;
  answer: number;
  skill: string;
  count?: number;
  spread?: number;
  min?: number;
  max?: number;
  also?: number[];
  why?: string;
  fmt?: (n: number) => string;
}): Activity {
  const wrong = nearNumbers(o.r, o.answer, o.count ?? 2, { spread: o.spread, min: o.min, max: o.max, also: o.also });
  const all = sortNum([o.answer, ...wrong]);
  const options: Option[] = all.map((n) => ({ id: String(n), text: o.fmt ? o.fmt(n) : String(n), say: o.fmt ? undefined : numKey(n) }));
  return { kind: "choice", prompt: o.prompt, say: o.say, visual: o.visual, options, answer: String(o.answer), layout: "row", skill: o.skill, why: o.why };
}

export function textChoice(o: { prompt: string; say?: string[]; visual?: Visual; answer: string; wrong: string[]; skill: string; why?: string; r: Rng; layout?: "grid" | "row" | "list"; sayOptions?: boolean; whys?: Record<string, string> }): Activity {
  const options: Option[] = shuffle(o.r, [o.answer, ...o.wrong]).map((t) => ({ id: t, text: t, say: o.sayOptions ? [t] : undefined, why: o.whys?.[t] }));
  return { kind: "choice", prompt: o.prompt, say: o.say, visual: o.visual, options, answer: o.answer, layout: o.layout ?? "row", skill: o.skill, why: o.why };
}

// ── Level assembly ──────────────────────────────────────────────────────────────────────────
export type Topic = {
  /** Stable key (used in skill names and for review). */
  key: string;
  /** One fresh item at difficulty d (0 easy → 1 hard). */
  gen: (r: Rng, d: number) => Activity;
  /** Re-create the item for one exact skill (e.g. the fact "m:add:7+8"), for spaced review. */
  forSkill?: (skill: string, r: Rng) => Activity | null;
};

export type Stage = {
  title: string;
  emoji: string;
  /** Topics to draw items from (and to review later). */
  topics: Topic[];
  levels: number;
  items?: number;
  /** A hand-sequenced lesson instead of cycling topics (e.g. one letter: meet → find → trace…). */
  fixed?: (r: Rng, levelIndex: number) => Activity[];
  /** Per-level titles (overrides "Title 1, Title 2…"). */
  titles?: string[];
  emojis?: string[];
  /** Per-level Bible hero cards (earned the first time that level is passed). */
  cards?: (string | undefined)[];
};

export type WorldDef = {
  id: string;
  title: string;
  emoji: string;
  grade: GradeId;
  blurb: string;
  stages: Stage[];
  /** Items per lesson (default 7). */
  items?: number;
  theme?: ThemeId;
  /** Dinner-table questions for grown-ups. */
  talk?: string[];
  /** A real-world mission shown after its levels. */
  challenge?: string;
};

/** What makes two items "the same" inside one level: the situation, not the order its choices
 *  happen to be shuffled in (so a lesson never shows the same story twice). */
export function keyOf(a: Activity): string {
  switch (a.kind) {
    case "scenario":
      return `scenario|${a.story}`;
    case "choice":
      return `choice|${a.prompt}|${a.answer}|${a.visual ? JSON.stringify(a.visual) : ""}`;
    case "slots":
      return `slots|${a.story ?? ""}|${a.prompt}`;
    case "spot":
      return `spot|${a.title ?? ""}|${a.lines.map((l) => l.text).join("|")}`;
    case "reflect":
      return `reflect|${a.prompt}`;
    case "sort":
      return `sort|${a.prompt}|${a.items.map((i) => i.id).sort().join(",")}`;
    case "match":
      return `match|${a.prompt}|${a.pairs.map((p) => p.a.id).sort().join(",")}`;
    default:
      return JSON.stringify(a);
  }
}

/** Generate n distinct items cycling through topics (a topic that has run out of fresh items
 *  just yields its turn — it never blocks the others). */
/** A sort is a whole pile of cards to drag — four from the same bank is plenty for one level. */
const SORT_CAP = 4;

export function items(r: Rng, topics: Topic[], n: number, d0: number, d1: number): Activity[] {
  const out: Activity[] = [];
  const seen = new Set<string>();
  const sorts = new Map<string, number>();
  let i = 0;
  let guard = 0;
  while (out.length < n && guard++ < n * 12) {
    const t = topics[i++ % topics.length];
    const d = n <= 1 ? d1 : d0 + ((d1 - d0) * out.length) / (n - 1);
    const a = t.gen(r, Math.max(0, Math.min(1, d)));
    if (a.kind === "sort" && (sorts.get(t.key) ?? 0) >= SORT_CAP) continue;
    const k = keyOf(a);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(a);
      if (a.kind === "sort") sorts.set(t.key, (sorts.get(t.key) ?? 0) + 1);
    }
  }
  return out;
}

/** Build a course's units from world definitions: lessons per stage (ramping difficulty), a
 *  review level after every two stages, and a boss level to finish each world. */
export function buildWorlds(subject: SubjectId, prefix: string, defs: WorldDef[], worldOffset = 0): Unit[] {
  return defs.map((w, wi) => {
    const lessons: Lesson[] = [];
    const add = (l: Omit<Lesson, "id" | "subject" | "unit" | "n">) => {
      const n = lessons.length + 1;
      lessons.push({ ...l, id: `${prefix}.${w.id}.${n}`, subject, unit: `${prefix}.${w.id}`, n });
    };
    const done: Topic[] = [];
    w.stages.forEach((st, si) => {
      for (let li = 0; li < st.levels; li++) {
        const r = rng(`${w.id}:${si}:${li}`);
        const d0 = st.levels === 1 ? 0.25 : (li / st.levels) * 0.7;
        const d1 = Math.min(1, d0 + 0.35);
        const acts = st.fixed ? st.fixed(r, li) : items(r, st.topics, st.items ?? w.items ?? 7, d0, d1);
        const title = st.titles?.[li] ?? (st.levels > 1 ? `${st.title} ${li + 1}` : st.title);
        const card = st.cards?.[li];
        add({ kind: "lesson", title, emoji: st.emojis?.[li] ?? st.emoji, activities: acts, skills: [...new Set(acts.map((a) => a.skill ?? ""))].filter(Boolean), ...(card ? { card } : {}) });
      }
      done.push(...st.topics);
      if (si % 2 === 1 && si < w.stages.length - 1) {
        const r = rng(`${w.id}:review:${si}`);
        const acts = items(r, shuffle(r, done), 8, 0.4, 0.8);
        add({ kind: "review", title: "Treasure review", emoji: "🗺️", activities: acts, skills: [...new Set(acts.map((a) => a.skill ?? ""))].filter(Boolean) });
      }
    });
    const rb = rng(`${w.id}:boss`);
    const boss = items(rb, shuffle(rb, done), 10, 0.6, 1);
    add({ kind: "boss", title: `${w.title} boss`, emoji: "🐙", activities: boss, skills: [...new Set(boss.map((a) => a.skill ?? ""))].filter(Boolean) });
    return {
      id: `${prefix}.${w.id}`,
      subject,
      n: worldOffset + wi + 1,
      title: w.title,
      emoji: w.emoji,
      grade: w.grade,
      theme: w.theme ?? themeFor(worldOffset + wi),
      blurb: w.blurb,
      lessons,
      ...(w.talk ? { talk: w.talk } : {}),
      ...(w.challenge ? { challenge: w.challenge } : {}),
    };
  });
}

/** A topic index for review: skill key → the topic that made it. */
export function topicIndex(defs: WorldDef[]): Map<string, Topic> {
  const m = new Map<string, Topic>();
  for (const w of defs) for (const s of w.stages) for (const t of s.topics) if (!m.has(t.key)) m.set(t.key, t);
  return m;
}

const familyOf = (skill: string) => skill.split(":").slice(0, 2).join(":");

/** Review items for a skill: the exact item when a topic can rebuild it (a missed fact comes back
 *  as that fact), otherwise fresh items of the same family ("m:add", "r:sound"…). The family →
 *  topics index is built lazily by sampling each topic once. */
export function makeItemsFor(defs: WorldDef[]): (skill: string, n: number, seed: string) => Activity[] {
  const topics = [...topicIndex(defs).values()];
  let fam: Map<string, Topic[]> | null = null;
  const build = () => {
    const m = new Map<string, Topic[]>();
    for (const t of topics) {
      const r = rng(`idx:${t.key}`);
      const seen = new Set<string>();
      for (let i = 0; i < 12; i++) {
        const a = t.gen(r, i / 11);
        if (a.skill) seen.add(familyOf(a.skill));
      }
      for (const f of seen) m.set(f, [...(m.get(f) ?? []), t]);
    }
    return m;
  };
  return (skill, n, seed) => {
    fam ??= build();
    const ts = fam.get(familyOf(skill)) ?? [];
    if (!ts.length) return [];
    const r = rng(seed);
    const out: Activity[] = [];
    const seen = new Set<string>();
    const push = (a: Activity | null | undefined) => {
      if (!a) return;
      const k = keyOf(a);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(a);
      }
    };
    for (const t of ts) if (out.length < n && t.forSkill) push(t.forSkill(skill, r));
    for (let i = 0; i < 80 && out.length < n; i++) {
      const a = ts[i % ts.length].gen(r, 0.3 + (i % 5) * 0.15);
      if (a.skill === skill || i > 40) push(a);
    }
    return out.slice(0, n);
  };
}
