// Harbor Learn — shared types for the curriculum, the lesson player and progress. Content is
// plain code (bundled with the wall), so every lesson works offline; only results sync.
//
// A course is a voyage: worlds (islands) of numbered levels — 1-1, 1-2, 1-3… — the child's boat
// sails through. Every item practices a tagged skill, so the mastery engine can tell what's
// solid, what's shaky, and what to bring back for review.

export type SubjectId = "reading" | "math" | "code" | "manners" | "faith";
export type GradeId = "prek" | "k" | "1" | "2" | "3" | "4" | "5";

export const GRADES: { id: GradeId; label: string; short: string; age: string }[] = [
  { id: "prek", label: "Pre-K", short: "Pre-K", age: "ages 3–4" },
  { id: "k", label: "Kindergarten", short: "K", age: "ages 5–6" },
  { id: "1", label: "1st grade", short: "1st", age: "ages 6–7" },
  { id: "2", label: "2nd grade", short: "2nd", age: "ages 7–8" },
  { id: "3", label: "3rd grade", short: "3rd", age: "ages 8–9" },
  { id: "4", label: "4th grade", short: "4th", age: "ages 9–10" },
  { id: "5", label: "5th grade", short: "5th", age: "ages 10–11" },
];
export const gradeIndex = (g: GradeId) => Math.max(0, GRADES.findIndex((x) => x.id === g));
export const isGrade = (v: unknown): v is GradeId => typeof v === "string" && GRADES.some((g) => g.id === v);
/** Little (Pre-K–K: pictures + voice, no reading needed) · Middle (1–2) · Big (3–5: reads on their own). */
export type Band = "little" | "middle" | "big";
export const bandOf = (g: GradeId): Band => (gradeIndex(g) <= 1 ? "little" : gradeIndex(g) <= 3 ? "middle" : "big");

/** A picturable word: what it says + the picture that shows it. */
export type Pic = { word: string; emoji: string };

// ── Visuals: the pictures an item shows (rendered by one shared component) ──────────────────
export type ShapeName = "circle" | "square" | "triangle" | "rectangle" | "star" | "heart" | "hexagon" | "oval" | "diamond" | "pentagon" | "cube" | "sphere" | "cone" | "cylinder";
export type Visual =
  | { type: "emoji"; emoji: string; size?: "md" | "lg" | "xl" }
  | { type: "count"; emoji: string; n: number }
  | { type: "groups"; groups: { emoji: string; n: number }[]; op?: "+" | "-" | "×" }
  | { type: "tenframe"; n: number; frames?: 1 | 2 }
  | { type: "numberline"; min: number; max: number; step?: number; marks?: number[]; jump?: [number, number]; ask?: number }
  | { type: "clock"; h: number; m: number }
  | { type: "coins"; coins: ("p" | "n" | "d" | "q")[] }
  | { type: "blocks"; h: number; t: number; o: number }
  | { type: "fraction"; num: number; den: number; shape: "pie" | "bar" }
  | { type: "array"; rows: number; cols: number; emoji: string }
  | { type: "shape"; shape: ShapeName; color?: string }
  | { type: "pattern"; items: string[]; blank: number }
  | { type: "equation"; text: string }
  | { type: "word"; text: string; highlight?: [number, number] }
  | { type: "sentence"; text: string }
  | { type: "passage"; title: string; text: string; emoji?: string }
  | { type: "scene"; emoji: string; caption?: string }
  | { type: "bars"; data: { label: string; value: number; emoji?: string }[] }
  | { type: "ruler"; length: number; emoji: string }
  /** A grid: filled cells (area), or a point to read (coordinates). */
  | { type: "grid"; cols: number; rows: number; fill?: [number, number][]; point?: [number, number]; axes?: boolean }
  | { type: "angle"; deg: number }
  | { type: "lines"; kind: "parallel" | "perpendicular" | "intersecting" }
  | { type: "pair"; left: Visual; right: Visual; mid?: string };

/** One answer choice. `say` = clip keys spoken when it's read aloud; `why` = the explanation;
 *  `then` = what happens next if you choose it (a scene that plays out — and can be rewound). */
export type Option = { id: string; text?: string; emoji?: string; visual?: Visual; say?: string[]; why?: string; then?: Then };
/** A consequence scene: what happens after a choice. `trust` moves the trust bridge (+1 / −1). */
export type Then = { emoji: string; text: string; trust?: number };

// ── Stories: a scene-by-scene telling with things to tap along the way ──────────────────────
export type Sky = "day" | "dawn" | "dusk" | "night" | "storm" | "sea" | "desert" | "garden" | "glory" | "indoor";
export type StoryAct =
  /** Tap the big thing n times (hammer the ark, march around Jericho) — then it becomes `after`
   *  (and the sky can change: "Let there be light!" turns night into day). */
  | { type: "tap"; prompt: string; target: string; n: number; after?: string; afterSky?: Sky }
  /** Find the right one among look-alikes (the lost sheep). */
  | { type: "find"; prompt: string; target: string; decoys: string[] }
  /** Tap each thing to send it somewhere (animals into the ark, bread into the basket). */
  | { type: "collect"; prompt: string; items: string[]; into: string };
export type StoryScene = {
  /** The main picture (a few emoji). */
  art: string;
  /** Small things up in the sky, and along the ground. */
  top?: string;
  ground?: string;
  sky?: Sky;
  text: string;
  act?: StoryAct;
};

// ── Scripture memory: hear it → fill a word → build it → recall it from first letters ──────
export type VerseStep =
  /** Hear it and see it, then say it along. */
  | { step: "listen" }
  /** Pick the missing word(s), in order (`at` = word index). `cue: "letters"` shows every other
   *  word as its first letter only — recall with the lightest hint. */
  | { step: "blanks"; blanks: { at: number; options: string[] }[]; cue?: "full" | "letters" }
  /** Tap the pieces in order (decoys are pieces that don't belong). */
  | { step: "tiles"; chunks: string[]; decoys?: string[] }
  /** Where is it found? */
  | { step: "ref"; options: string[] }
  /** What does it mean? */
  | { step: "meaning"; options: string[]; answer: string };

// ── Code: block programs run by one of several simulators ───────────────────────────────────
export type Dir = "up" | "right" | "down" | "left";
export type SimId = "sea" | "dance" | "turtle" | "music" | "rover" | "pixel";
/** A block. Containers: repeat (n + body), if/ifelse (cond + body/else), until (cond + body),
 *  def (name + body) and call (name). Everything else is a simple action op for the simulator. */
export type Block = { op: string; n?: number; cond?: string; name?: string; body?: Block[]; else?: Block[] };

export type CodeLevel = {
  sim: SimId;
  /** The goal in a few words (shown + spoken). */
  goal: string;
  /** Which blocks the palette offers. */
  palette: string[];
  /** Container blocks offered. */
  loops?: boolean;
  ifs?: boolean;
  untils?: boolean;
  funcs?: boolean;
  /** Most blocks a perfect answer needs (3 stars). */
  best: number;
  /** A known answer (proves the level is solvable; drives hints). */
  solution: Block[];
  /** A starting program with a bug in it (debugging levels). */
  buggy?: Block[];
  hint?: string;
  /** Show the "real code" view (older kids). */
  textCode?: boolean;
  // Simulator data
  /** sea / rover: map rows ("." water/ground, "#" rock, "S" start, "G" goal, "*" shell). Rover may
   *  list several maps that ONE program must solve (why you need if/until). */
  maps?: string[][];
  facing?: Dir;
  /** dance / music: the sequence to copy. */
  target?: string[];
  /** turtle: the picture to draw, as a program that draws it (rendered faintly). */
  draw?: Block[];
  /** pixel: target grid of color letters ("." blank). */
  picture?: string[];
};

// ── Activities ───────────────────────────────────────────────────────────────────────────────
export type Activity = (
  /** Meet a letter: see it big, hear its sound, tap pictures that start with it. */
  | { kind: "meet"; letter: string; pics: Pic[] }
  /** Trace the letter with a finger. */
  | { kind: "trace"; letter: string }
  /** Hear a sound → tap the letter that makes it. */
  | { kind: "find-letter"; letter: string; options: string[] }
  /** Hear a sound → tap the picture that starts with it. */
  | { kind: "first-sound"; letter: string; options: Pic[]; answer: string }
  /** Which picture rhymes? */
  | { kind: "rhyme"; target: Pic; options: Pic[]; answer: string }
  /** Drag letters into the boxes to spell the picture. */
  | { kind: "build"; word: Pic; tiles: string[] }
  /** Sound out a word by sliding under it, then pick its picture. */
  | { kind: "blend"; word: Pic; options: Pic[] }
  /** Hear a word → tap the written word. */
  | { kind: "read-word"; word: string; options: string[] }
  /** Pop the bubbles that show a word. */
  | { kind: "pop"; word: string; others: string[] }
  /** Read a sentence (tap words to hear them), then answer about it. */
  | { kind: "sentence"; text: string; emoji: string; question?: { prompt: string; options: Pic[]; answer: string } }
  /** Count the things (tap each), then tap the number. */
  | { kind: "count"; emoji: string; n: number; options: number[] }
  /** Drag things into the net until it has the number. */
  | { kind: "make"; emoji: string; n: number }
  /** a + b with groups to push together. */
  | { kind: "add"; emoji: string; a: number; b: number; options: number[] }
  /** The workhorse: a prompt (+ picture) and choices. Covers most of math, reading, manners. */
  | { kind: "choice"; prompt: string; say?: string[]; visual?: Visual; options: Option[]; answer: string; layout?: "grid" | "row" | "list"; readOptions?: boolean; why?: string }
  /** Drag each card into the right bin. */
  | { kind: "sort"; prompt: string; say?: string[]; bins: { id: string; label: string; emoji?: string }[]; items: { id: string; text?: string; emoji?: string; bin: string; say?: string[] }[] }
  /** Drag the cards into the right order (given order = correct). */
  | { kind: "order"; prompt: string; say?: string[]; items: { id: string; text?: string; emoji?: string; say?: string[] }[]; direction?: "row" | "column" }
  /** Tap matching pairs — two columns, or a memory game of face-down cards. */
  | { kind: "match"; prompt: string; say?: string[]; pairs: { a: Option; b: Option }[]; mode?: "columns" | "memory" }
  /** Type a number on a big keypad. */
  | { kind: "keypad"; prompt: string; say?: string[]; visual?: Visual; answer: number; why?: string; unit?: string }
  /** Manners: a short story, a choice, and what happens next. */
  | { kind: "scenario"; scene: Visual; story: string; say?: string[]; question: string; askSay?: string[]; options: Option[]; answer: string }
  /** Build a number with place-value blocks (tap +10 / +1). */
  | { kind: "place"; target: number; hundreds?: boolean }
  /** Program something. */
  | { kind: "code"; level: CodeLevel }
  /** A story told scene by scene with things to do (it teaches; questions about it follow). */
  | { kind: "story"; title: string; emoji: string; ref?: string; scenes: StoryScene[] }
  /** Scripture memory, one step of the ladder. */
  | { kind: "verse"; ref: string; text: string; pic?: string; meaning?: string; v: VerseStep }
  /** Truth Detective: tap the line(s) where someone wasn't honest, or was sneaky. */
  | { kind: "spot"; prompt: string; title?: string; scene?: string; lines: { text: string; emoji?: string }[]; answer: number[]; why: string; say?: string[] }
  /** Build better words one piece at a time (a real apology, a respectful answer, a plan). */
  | { kind: "slots"; prompt: string; scene?: string; story?: string; slots: { label?: string; options: string[]; answer: string; why?: string }[]; say?: string[] }
  /** No wrong answers: think about your own life (or pick what to thank God for). */
  | { kind: "reflect"; prompt: string; scene?: string; options: { id: string; text: string; emoji?: string; reply?: string }[]; multi?: boolean; closing?: string; say?: string[] }
) & {
  /** The skill this item practices (mastery tracking + review). */
  skill?: string;
};

export type LevelKind = "lesson" | "review" | "boss" | "practice";

export type Lesson = {
  id: string;
  subject: SubjectId;
  /** The world (unit) it belongs to. */
  unit: string;
  /** Position in its world, 1-based — shown as "world-level" (e.g. 3-4). */
  n: number;
  kind: LevelKind;
  title: string;
  emoji: string;
  activities: Activity[];
  /** Skill tags it practices (parent progress + review). */
  skills: string[];
  /** A Bible hero card earned the first time it's passed. */
  card?: string;
};

export type ThemeId = "shallows" | "coral" | "kelp" | "pirate" | "ice" | "volcano" | "jungle" | "night" | "storm" | "sky" | "deep" | "candy";

export type Unit = {
  id: string;
  subject: SubjectId;
  /** World number in the course (1-based). */
  n: number;
  title: string;
  emoji: string;
  grade: GradeId;
  theme: ThemeId;
  blurb: string;
  lessons: Lesson[];
  /** Questions for the grown-ups to ask at dinner (shown on the parent's Learn tab). */
  talk?: string[];
  /** A real-world mission for today, shown after a level ("Captain's challenge"). */
  challenge?: string;
};

export type Course = {
  id: SubjectId;
  title: string;
  emoji: string;
  tagline: string;
  units: Unit[];
  /** Fresh items for one skill (spiral review + practice detours). */
  itemsFor?: (skill: string, n: number, seed: string) => Activity[];
};

// ── Progress ─────────────────────────────────────────────────────────────────────────────────
/** One finished lesson (what the wall sends home). */
export type LearnResult = {
  op_id: string;
  child_id: string;
  lesson_id: string;
  subject: SubjectId;
  stars: number;
  correct: number;
  total: number;
  duration_sec: number;
  sticker: string | null;
  completed_at: string;
  /** Per skill: [right on the first try, items]. */
  skills?: Record<string, [number, number]>;
  kind?: LevelKind;
  /** Shells earned. */
  shells?: number;
  /** Shells spent / gained outside lessons (shop, chests) ride along as ledger entries. */
};

/** Best result per lesson for one child (merged server + not-yet-synced). */
export type LessonProgress = { stars: number; plays: number; last: string };

export type LearnProfile = {
  child_id: string;
  grade: GradeId;
  subjects: SubjectId[];
  daily_goal: number;
  earn_stars: boolean;
  /** Most lessons a day (0 = no limit). */
  daily_limit: number;
};

export type LearnAssignment = { id: string; child_id: string; lesson_id: string; note: string | null; created_at: string };
