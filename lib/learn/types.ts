// Harbor Learn — shared types for the curriculum, the lesson player and progress. Content is
// plain code (bundled with the wall), so every lesson works offline; only results sync.

export type SubjectId = "reading" | "code" | "math";
export type GradeId = "prek" | "k" | "1" | "2" | "3";

export const GRADES: { id: GradeId; label: string; short: string; age: string }[] = [
  { id: "prek", label: "Pre-K", short: "Pre-K", age: "ages 3–4" },
  { id: "k", label: "Kindergarten", short: "K", age: "ages 5–6" },
  { id: "1", label: "1st grade", short: "1st", age: "ages 6–7" },
  { id: "2", label: "2nd grade", short: "2nd", age: "ages 7–8" },
  { id: "3", label: "3rd grade", short: "3rd", age: "ages 8–9" },
];
export const gradeIndex = (g: GradeId) => Math.max(0, GRADES.findIndex((x) => x.id === g));
export const isGrade = (v: unknown): v is GradeId => typeof v === "string" && GRADES.some((g) => g.id === v);

/** A picturable word: what it says + the picture that shows it. */
export type Pic = { word: string; emoji: string };

// ── Code puzzles ─────────────────────────────────────────────────────────────
export type Dir = "up" | "right" | "down" | "left";
/** Absolute arrows for little ones; forward/turns once they're ready to think "from the boat". */
export type Cmd = "up" | "down" | "left" | "right" | "forward" | "turnLeft" | "turnRight";
export type CodeBlock = { cmd: Cmd } | { repeat: number; body: CodeBlock[] };
export type CodeLevel = {
  /** Rows of the map, top to bottom: "." water · "#" rock · "S" start · "G" goal · "*" shell to collect. */
  map: string[];
  facing: Dir;
  /** Which blocks the palette offers. */
  palette: Cmd[];
  /** Offer the "repeat" block. */
  loops?: boolean;
  /** Most blocks a perfect answer needs (for 3 stars). */
  best: number;
  /** A starting program that has a bug to find (debugging levels). */
  buggy?: CodeBlock[];
  /** A known answer — used to check every level is solvable, and for "show me a hint". */
  solution: CodeBlock[];
  hint?: string;
};

// ── Activities ───────────────────────────────────────────────────────────────
export type Activity =
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
  /** Hear a word → tap the written word (reading, not guessing from pictures). */
  | { kind: "read-word"; word: string; options: string[] }
  /** Pop the bubbles that show a heart word. */
  | { kind: "pop"; word: string; others: string[] }
  /** Read a sentence (tap words to hear them), then answer about it. */
  | { kind: "sentence"; text: string; emoji: string; question?: { prompt: string; options: Pic[]; answer: string } }
  /** Count the things, then tap the number. */
  | { kind: "count"; emoji: string; n: number; options: number[] }
  /** Drag things into the basket until it has the number. */
  | { kind: "make"; emoji: string; n: number }
  /** a + b with things to drag together. */
  | { kind: "add"; emoji: string; a: number; b: number; options: number[] }
  | { kind: "code"; level: CodeLevel };

export type Lesson = {
  id: string;
  subject: SubjectId;
  unit: string;
  title: string;
  emoji: string;
  activities: Activity[];
  /** Skill tags it practices (e.g. "sound:m", "word:cat", "code:loops") — for parent progress. */
  skills: string[];
};

export type Unit = {
  id: string;
  subject: SubjectId;
  title: string;
  emoji: string;
  grade: GradeId;
  blurb: string;
  lessons: Lesson[];
};

export type Course = { id: SubjectId; title: string; emoji: string; tagline: string; units: Unit[] };

// ── Progress ─────────────────────────────────────────────────────────────────
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
};

/** Best result per lesson for one child (merged server + not-yet-synced). */
export type LessonProgress = { stars: number; plays: number; last: string };

export type LearnProfile = {
  child_id: string;
  grade: GradeId;
  subjects: SubjectId[];
  daily_goal: number;
  earn_stars: boolean;
};

export type LearnAssignment = { id: string; child_id: string; lesson_id: string; note: string | null; created_at: string };
