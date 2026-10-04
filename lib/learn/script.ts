import type { Activity, GradeId, Lesson, Option, SubjectId } from "./types";
import { bandOf } from "./types";
import { SOUNDS, soundOut } from "./sounds";
import { COURSES, unitById } from "./curriculum";
import { THEMES } from "./meta";
import { numberWord as numberWordFull } from "./gen";

// Everything Harbor Learn says out loud. Lines are pre-recorded in the Harbor voice
// (scripts/gen-learn-voice.mjs → /public/learn-voice), so a child who can't read yet always hears
// clear, identical speech — and letter sounds are true phonics sounds ("mmm", never "em").
//
// Clip keys: a line of text is its own key; a speech sound is `snd:<id>`; "~" in a say-list is a
// short breath. Lead-in lines end in a comma to keep the voice's rising "there's more" lilt.
// Little and middle sailors (Pre-K–2nd) get every prompt, choice and explanation recorded; big
// sailors read on their own (a "read to me" button uses the device voice for anything unrecorded).

export const SAY = {
  // Home + flow
  pickSubject: "What do you want to learn today?",
  reading: "Reading",
  code: "Code",
  math: "Math",
  manners: "Captain's Code",
  mission: "Here's your mission!",
  fromGrownup: "A grown-up picked this one for you.",
  letsGo: "Let's go!",
  locked: "Pass the level before this one to unlock it.",
  worldLocked: "Finish the island before this one to sail here.",
  stickerBook: "Your sticker album!",
  keepGoing: "Keep going!",
  wantToLeave: "Do you want to stop this level?",
  welcomeBack: "Welcome back, captain!",
  dailyChest: "Your daily treasure chest is ready!",
  shop: "Welcome to the Harbor Shop!",
  notEnough: "You need more shells for that one. Keep learning to earn more!",
  bought: "It's yours!",
  practiceCove: "Let's practice the tricky ones in Practice Cove!",
  practiceDone: "Practice makes perfect!",
  bossTime: "Boss level! You can do it!",
  reviewTime: "Treasure review! Let's remember what we learned.",
  goldenFish: "A golden fish! Tap it, quick!",
  fromBefore: "Here's one from before!",
  retryRound: "Let's try the tricky ones again!",
  greatTry: "Great try! Every mistake helps your brain grow.",
  worldUnlocked: "A new island is open!",
  hint: "Here's a hint.",
  showMe: "Let me show you.",
  tryTogether: "Now you try it.",
  almost: "So close! Let's practice a little, then try again.",
  youCanDoIt: "You can do it!",
  dailyLimit: "That's all the learning for today. Great job! Come back tomorrow.",
  newWorld: "A new island! Let's explore!",
  worldDone: "Island complete! On to a new adventure!",
  sailOn: "Sail on!",

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
  // New activity kinds
  sortIt: "Drag each one to where it belongs.",
  orderIt: "Drag them into the right order.",
  matchIt: "Tap two that go together.",
  memoryIt: "Flip two cards to find a match.",
  typeIt: "Type the answer.",
  buildNumber: "Build the number with tens and ones.",
  whatShouldYouDo: "What should you do?",
  whatHappens: "Here's what happens next.",
  listenAgain: "Listen again.",

  // Code
  codeTap: "Tap the blocks to build your program. Then press play!",
  codeBug: "Uh oh, this code has a bug. Can you fix it?",
  codePlay: "Press play to run your program!",
  bumped: "Bonk! Try a different way.",
  notThere: "Not there yet! Add more blocks.",
  missedShells: "Get all the shells first!",
  outOfBounds: "Whoa, that's off the map! Try again.",
  codeWin: "It worked! You're a coder!",
  danceWrong: "Oops, that's not the same dance. Watch again!",
  songWrong: "That's not quite the song. Listen again!",
  drawWrong: "Not quite the same picture. Look closely!",
  pixelWrong: "Something's different. Look closely at the picture.",
  bugFixed: "You fixed the bug!",
  watchFirst: "Watch first!",
  listenFirst: "Listen first!",
  tryThisBlock: "Try this block next.",
  fewerBlocks: "It works! Can you do it with fewer blocks?",
  everyMap: "Your program has to work on every map!",
  useLoop: "Try a repeat block. It does things again and again!",

  // End of lesson
  lessonDone: "Level complete!",
  perfect: "Perfect! Three stars!",
  openChest: "Tap the treasure chest!",
  newSticker: "A new sticker for your album!",
  rareSticker: "Wow! A rare sticker!",
  epicSticker: "Whoa! An epic sticker!",
  legendarySticker: "Amazing! A legendary sticker!",
  shinySticker: "A shiny sticker! Super rare!",
  setComplete: "You finished a sticker set!",
  goalDone: "You reached your goal for today!",
  levelUp: "Level up!",
  streakUp: "Your streak keeps growing!",
  shellsEarned: "You earned shells!",
} as const;

/** Instant feedback, rotated so it never sounds like a machine. */
export const PRAISE = ["Yes!", "Great job!", "You got it!", "Awesome!", "Nice work!", "Super!", "Way to go!", "Perfect!", "Amazing!", "You're a star!", "Brilliant!", "Fantastic!"];
export const RETRY = ["Try again!", "Almost! Try again.", "Oops! Try another one.", "Not quite. Look again!"];
/** Bigger cheers for a combo (three right in a row and up). */
export const COMBO = ["You're on fire!", "Unstoppable!", "Three in a row!", "Combo!", "Keep it going!"];
/** World welcomes, one per theme. */
export const welcomeTo = (theme: keyof typeof THEMES) => `Welcome to ${THEMES[theme].name}!`;

export const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
export const numberWord = (n: number) => NUMBER_WORDS[n] ?? String(n);
/** "Put four in the net." — one line per number so it sounds natural. */
export const putInNet = (n: number) => `Put ${numberWord(n)} in the net.`;
/** "Two plus three." */
export const plusLine = (a: number, b: number) => `${numberWord(a)} plus ${numberWord(b)}.`;

export const sndKey = (id: string) => `snd:${id}`;
/** The "~" breath between parts of a say-list. */
export const GAP = "~";

export type Clip = { key: string; text?: string; ipa?: string; kind: "line" | "word" | "sound" | "sentence" };

/**
 * How much of an item is pre-recorded:
 *  all  (Pre-K, K)  — every prompt, choice and explanation (they can't read yet);
 *  core (1st, 2nd)  — prompts and choices (math is stitched from recorded number words, and
 *                     explanations use the device voice), plus manners stories and outcomes;
 *  keys (3rd–5th)   — only the voice keys an item names (they read on their own).
 */
export type VoiceLevel = "all" | "core" | "keys";
export const voiceLevelFor = (grade: GradeId): VoiceLevel => (bandOf(grade) === "little" ? "all" : bandOf(grade) === "middle" ? "core" : "keys");

function activityClips(a: Activity, level: VoiceLevel, subject: SubjectId, add: (c: Clip) => void) {
  const line = (t?: string) => t && t !== GAP && (t.startsWith("snd:") ? sound(t.slice(4)) : add({ key: t, text: t, kind: t.includes(" ") ? "line" : "word" }));
  const lines = (ts?: string[]) => ts?.forEach(line);
  const word = (w: string) => w && add({ key: w, text: w, kind: "word" });
  const sound = (id: string) => SOUNDS[id] && add({ key: sndKey(id), ipa: SOUNDS[id].ipa, kind: "sound" });
  // prompts + choices: all; core except math (stitched); explanations: all, and manners in core
  const full = level === "all" || (level === "core" && subject !== "math");
  const why = level === "all" || (level === "core" && subject === "manners");
  const opt = (o: Option) => (o.say ? lines(o.say) : full && o.text && !o.visual ? line(o.text) : undefined);
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
      if (a.kind === "build") a.tiles.forEach((t) => soundOut(t).forEach((u) => u.sound && sound(u.sound)));
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
        line(a.question.prompt);
        a.question.options.forEach((p) => word(p.word));
      }
      break;
    case "count":
      for (let i = 1; i <= Math.max(a.n, ...a.options); i++) word(numberWord(i));
      break;
    case "make":
      line(putInNet(a.n));
      for (let i = 1; i <= a.n + 1; i++) word(numberWord(i));
      break;
    case "add":
      line(plusLine(a.a, a.b));
      for (let i = 1; i <= Math.max(a.a + a.b, ...a.options); i++) word(numberWord(i));
      break;
    case "choice":
      if (a.say) lines(a.say);
      else if (full) line(a.prompt);
      a.options.forEach(opt);
      if (why) line(a.why);
      break;
    case "keypad":
      if (a.say) lines(a.say);
      else if (full) line(a.prompt);
      if (why) line(a.why);
      break;
    case "sort":
      if (a.say) lines(a.say);
      else if (full) line(a.prompt);
      a.items.forEach((it) => (it.say ? lines(it.say) : full && it.text && line(it.text)));
      if (level === "all") a.bins.forEach((b) => line(b.label));
      break;
    case "order":
      if (a.say) lines(a.say);
      else if (full) line(a.prompt);
      a.items.forEach((it) => (it.say ? lines(it.say) : full && it.text && line(it.text)));
      break;
    case "match":
      if (a.say) lines(a.say);
      else if (full) line(a.prompt);
      a.pairs.forEach((p) => (opt(p.a), opt(p.b)));
      break;
    case "scenario":
      if (a.say) lines(a.say);
      else if (full) line(a.story);
      if (a.askSay) lines(a.askSay);
      else if (full) line(a.question);
      a.options.forEach((o) => {
        opt(o);
        if (why) line(o.why);
      });
      break;
    case "place":
      break;
    case "code":
      if (level !== "keys") {
        line(a.level.goal);
        line(a.level.hint);
      }
      break;
  }
}

const lessonVoice = (l: Lesson): VoiceLevel => {
  const u = unitById(l.unit);
  return u ? voiceLevelFor(u.grade) : "core";
};

/** The clips one lesson needs (preloaded when it opens, so every sound is instant). */
export function lessonClipKeys(lesson: Lesson): string[] {
  const keys = new Set<string>();
  const level = lessonVoice(lesson);
  for (const a of lesson.activities) activityClips(a, level, lesson.subject, (c) => keys.add(c.key));
  return [...keys];
}

/** Words a stitched line can use: "7 + 5 = ?" → seven, plus, five, equals, what. */
export const MATH_WORDS = ["plus", "minus", "times", "divided by", "equals", "what", "is", "and", "more than", "less than", "point"];

/** Every clip Harbor Learn can say — what the generator records. */
export function allClips(): Clip[] {
  const out = new Map<string, Clip>();
  const add = (c: Clip) => {
    if (c.key && (c.text || c.ipa) && !out.has(c.key)) out.set(c.key, c);
  };
  for (const line of Object.values(SAY)) add({ key: line, text: line, kind: "line" });
  for (const line of [...PRAISE, ...RETRY, ...COMBO]) add({ key: line, text: line, kind: "line" });
  for (const t of Object.keys(THEMES) as (keyof typeof THEMES)[]) add({ key: welcomeTo(t), text: welcomeTo(t), kind: "line" });
  for (const s of Object.values(SOUNDS)) {
    add({ key: sndKey(s.id), ipa: s.ipa, kind: "sound" });
    s.pics.forEach((p) => add({ key: p.word, text: p.word, kind: "word" }));
  }
  // Every number word to 100 (and the math words), so any equation can be stitched together.
  for (let i = 0; i <= 100; i++) add({ key: numberWordFull(i), text: numberWordFull(i), kind: "word" });
  for (const w of MATH_WORDS) add({ key: w, text: w, kind: "word" });
  for (const course of Object.values(COURSES))
    for (const u of course.units) {
      const level = voiceLevelFor(u.grade);
      for (const l of u.lessons) for (const a of l.activities) activityClips(a, level, course.id, add);
    }
  return [...out.values()];
}
