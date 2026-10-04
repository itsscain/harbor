import type { Activity, Lesson } from "./types";
import { SOUNDS, soundOut } from "./sounds";
import { COURSES } from "./curriculum";

// Everything Harbor Learn says out loud. Each line is pre-recorded in the Harbor voice
// (scripts/gen-learn-voice.mjs → /public/learn-voice), so a non-reader always hears clear,
// identical speech — and letter sounds are true phonics sounds ("mmm", never "em").
//
// Clip keys: a line of text is its own key; a speech sound is `snd:<id>` (see sounds.ts).
// The UI strings lines together ("Tap the letter that says," + snd:m), so lead-ins end in a
// comma to keep the voice's rising "there's more" lilt.

export const SAY = {
  // Home + flow
  pickSubject: "What do you want to learn?",
  reading: "Reading",
  code: "Code",
  math: "Math",
  mission: "Here's your mission!",
  fromGrownup: "A grown-up picked this one for you.",
  letsGo: "Let's go!",
  locked: "Finish the lessons before this one to unlock it.",
  stickerBook: "Your sticker book!",
  keepGoing: "Keep going!",
  wantToLeave: "Do you want to stop this lesson?",

  // Meet a letter
  thisLetterSays: "This letter says,",
  theseLettersSay: "These letters say,",
  tapEachPicture: "Tap each picture.",
  // Trace
  traceIt: "Trace the letter with your finger. Start at the green dot.",
  traceDone: "Beautiful writing!",
  // Find the letter
  tapLetterThatSays: "Tap the letter that says,",
  // First sound / rhyme
  whichStartsWith: "Which one starts with,",
  whichRhymesWith: "Which one rhymes with,",
  // Build
  spellIt: "Let's spell,",
  dragLetters: "Drag the letters into the boxes.",
  // Blend
  slideToBlend: "Slide the boat under the word to sound it out.",
  whichPicture: "Which picture is it?",
  // Read a word
  findTheWord: "Find the word,",
  // Pop
  popEvery: "Pop every bubble that says,",
  // Sentence
  readSentence: "Read the sentence. Tap a word if you need help.",
  readToMe: "Listen.",
  // Counting
  tapToCount: "Tap each one to count it.",
  howMany: "How many are there?",
  pushTogether: "Push them together!",
  howManyInAll: "How many in all?",
  tooMany: "That's too many. Take one out.",

  // Code
  codeGoal: "Help the boat sail to the island!",
  codeShells: "Collect every shell, then sail to the island!",
  codeBug: "Uh oh, this code has a bug. Can you fix it?",
  codeLoop: "Try the repeat block. It does things again and again!",
  codeTurns: "Turn the boat, then sail forward.",
  addBlocks: "Drag arrows into your code, then press play.",
  bumped: "Bonk! The boat hit a rock. Try again!",
  notThere: "Not there yet! Add more blocks.",
  missedShells: "Get all the shells first!",
  outOfBounds: "Whoa, that's off the map! Try again.",
  codeHint: "Here's a hint!",

  // End of lesson
  lessonDone: "Lesson complete!",
  perfect: "Perfect! Three stars!",
  openChest: "Tap the treasure chest!",
  newSticker: "A new sticker for your book!",
  rareSticker: "Wow! A rare sticker!",
  legendarySticker: "Whoa! A legendary sticker!",
  goalDone: "You reached your goal for today!",
  levelUp: "Level up!",
  streakUp: "Your streak keeps growing!",
  starsEarned: "You earned stars for your store!",
} as const;

/** Instant feedback, rotated so it never sounds like a machine. */
export const PRAISE = ["Yes!", "Great job!", "You got it!", "Awesome!", "Nice work!", "Super!", "Way to go!", "Perfect!", "Amazing!", "You're a star!"];
export const RETRY = ["Try again!", "Almost! Try again.", "Oops! Try another one."];
/** Bigger cheers for a combo (three right in a row and up). */
export const COMBO = ["You're on fire!", "Unstoppable!", "Three in a row!"];

export const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
export const numberWord = (n: number) => NUMBER_WORDS[n] ?? String(n);
/** "Put four in the net." — one line per number so it sounds natural. */
export const putInNet = (n: number) => `Put ${numberWord(n)} in the net.`;
/** "Two plus three." */
export const plusLine = (a: number, b: number) => `${numberWord(a)} plus ${numberWord(b)}.`;

export const sndKey = (id: string) => `snd:${id}`;

export type Clip = { key: string; text?: string; ipa?: string; kind: "line" | "word" | "sound" | "sentence" };

function activityClips(a: Activity, add: (c: Clip) => void) {
  const word = (w: string) => add({ key: w, text: w, kind: "word" });
  const sound = (id: string) => SOUNDS[id] && add({ key: sndKey(id), ipa: SOUNDS[id].ipa, kind: "sound" });
  switch (a.kind) {
    case "meet":
      sound(a.letter);
      a.pics.forEach((p) => word(p.word));
      break;
    case "trace":
      sound(a.letter);
      break;
    case "find-letter":
      a.options.forEach(sound);
      break;
    case "first-sound":
      sound(a.letter);
      a.options.forEach((p) => word(p.word));
      break;
    case "rhyme":
      word(a.target.word);
      a.options.forEach((p) => word(p.word));
      break;
    case "build":
    case "blend":
      word(a.word.word);
      soundOut(a.word.word).forEach((u) => u.sound && sound(u.sound));
      if (a.kind === "build") a.tiles.forEach(sound);
      if (a.kind === "blend") a.options.forEach((p) => word(p.word));
      break;
    case "read-word":
      a.options.forEach(word);
      break;
    case "pop":
      word(a.word);
      a.others.forEach(word);
      break;
    case "sentence":
      add({ key: a.text, text: a.text, kind: "sentence" });
      a.text.split(/\s+/).forEach((w) => word(w.replace(/[^A-Za-z']/g, "")));
      if (a.question) {
        add({ key: a.question.prompt, text: a.question.prompt, kind: "line" });
        a.question.options.forEach((p) => word(p.word));
      }
      break;
    case "count":
      for (let i = 1; i <= Math.max(a.n, ...a.options); i++) word(numberWord(i));
      break;
    case "make":
      add({ key: putInNet(a.n), text: putInNet(a.n), kind: "line" });
      for (let i = 1; i <= a.n + 1; i++) word(numberWord(i));
      break;
    case "add":
      add({ key: plusLine(a.a, a.b), text: plusLine(a.a, a.b), kind: "line" });
      for (let i = 1; i <= Math.max(a.a + a.b, ...a.options); i++) word(numberWord(i));
      break;
    case "code":
      if (a.level.hint) add({ key: a.level.hint, text: a.level.hint, kind: "line" });
      break;
  }
}

/** The clips one lesson needs (preloaded when it opens, so every sound is instant). */
export function lessonClipKeys(lesson: Lesson): string[] {
  const keys = new Set<string>();
  for (const a of lesson.activities) activityClips(a, (c) => keys.add(c.key));
  return [...keys];
}

/** Every clip Harbor Learn can say — what the generator records. */
export function allClips(): Clip[] {
  const out = new Map<string, Clip>();
  const add = (c: Clip) => {
    if (c.key && (c.text || c.ipa) && !out.has(c.key)) out.set(c.key, c);
  };
  for (const line of Object.values(SAY)) add({ key: line, text: line, kind: "line" });
  for (const line of [...PRAISE, ...RETRY, ...COMBO]) add({ key: line, text: line, kind: "line" });
  for (const s of Object.values(SOUNDS)) {
    add({ key: sndKey(s.id), ipa: s.ipa, kind: "sound" });
    s.pics.forEach((p) => add({ key: p.word, text: p.word, kind: "word" }));
  }
  for (let i = 0; i <= 20; i++) add({ key: numberWord(i), text: numberWord(i), kind: "word" });
  for (const course of Object.values(COURSES))
    for (const u of course.units) for (const l of u.lessons) for (const a of l.activities) activityClips(a, add);
  return [...out.values()];
}
