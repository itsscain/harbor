import type { Activity, Course, GradeId, Lesson, Pic, Unit } from "./types";
import { SOUNDS, graphemes } from "./sounds";
import { PIC_WORDS, decodable, readable, pic, HEART_WORDS, SENTENCES, RHYMES } from "./words";

// The Reading course — systematic phonics in the order structured-literacy programs use:
// sounds → letters (m s a t first, so real words come fast) → blending CVC words → heart words
// → sentences → digraphs, blends, magic e, vowel teams, bossy r → short reading. Lessons are
// generated from that sequence, so every word a child is asked to read uses only sounds they
// know. Short (3–5 min), lots of tiny wins, and every answer is spoken back to them.

// Deterministic "random" so a lesson is the same every time it's opened (the player shuffles
// the order of choices, not which choices).
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
function pickN<T>(rand: () => number, from: T[], n: number, not: (x: T) => boolean = () => false): T[] {
  const pool = from.filter((x) => !not(x));
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
}

const LETTER_SETS: { id: string; letters: string[]; grade: GradeId; emoji: string }[] = [
  { id: "ls1", letters: ["m", "s", "a", "t"], grade: "prek", emoji: "🔤" },
  { id: "ls2", letters: ["p", "f", "i", "n"], grade: "prek", emoji: "🔡" },
  { id: "ls3", letters: ["o", "d", "c", "u"], grade: "k", emoji: "🅾️" },
  { id: "ls4", letters: ["g", "b", "e", "l"], grade: "k", emoji: "🅱️" },
  { id: "ls5", letters: ["h", "r", "k", "w"], grade: "k", emoji: "🔠" },
  { id: "ls6", letters: ["j", "y", "x", "q", "v", "z"], grade: "k", emoji: "✨" },
];

const ALL_LETTERS = LETTER_SETS.flatMap((s) => s.letters);
const knownThrough = (setIndex: number) => new Set(LETTER_SETS.slice(0, setIndex + 1).flatMap((s) => s.letters));
/** Pictures whose first sound is NOT this letter (for "which starts with…?"). */
const otherPics = (letter: string) =>
  Object.values(SOUNDS)
    .filter((s) => s.id !== letter && s.id.length === 1)
    .map((s) => s.pics[0]);

function lesson(unit: string, slug: string, title: string, emoji: string, activities: Activity[], skills: string[]): Lesson {
  return { id: `read.${unit}.${slug}`, subject: "reading", unit: `read.${unit}`, title, emoji, activities, skills };
}

// ── Lesson builders ──────────────────────────────────────────────────────────
function letterLesson(unit: string, letter: string, before: string[]): Lesson {
  const r = seeded(`${unit}.${letter}`);
  const snd = SOUNDS[letter];
  const choices = (n: number) => [letter, ...pickN(r, before.length >= 2 ? before : ALL_LETTERS, n, (x) => x === letter)];
  const firstSound = (anchor: Pic): Activity => ({ kind: "first-sound", letter, options: [anchor, ...pickN(r, otherPics(letter), 2)], answer: anchor.word });
  return lesson(
    unit,
    letter,
    `The ${snd.graph} sound`,
    snd.pics[0].emoji,
    [
      { kind: "meet", letter, pics: snd.pics },
      { kind: "find-letter", letter, options: choices(2) },
      { kind: "trace", letter: snd.graph.length === 1 ? letter : snd.graph[0] },
      firstSound(snd.pics[1] ?? snd.pics[0]),
      { kind: "find-letter", letter, options: choices(2) },
      firstSound(snd.pics[2] ?? snd.pics[0]),
    ],
    [`sound:${letter}`],
  );
}

function reviewLesson(unit: string, letters: string[]): Lesson {
  const r = seeded(`${unit}.review`);
  const acts: Activity[] = [];
  for (const l of pickN(r, letters, letters.length)) acts.push({ kind: "find-letter", letter: l, options: [l, ...pickN(r, letters, 2, (x) => x === l)] });
  for (const l of pickN(r, letters, 3)) {
    const anchor = SOUNDS[l].pics[Math.floor(r() * SOUNDS[l].pics.length)];
    acts.push({ kind: "first-sound", letter: l, options: [anchor, ...pickN(r, otherPics(l), 2)], answer: anchor.word });
  }
  return lesson(unit, "review", `Sound check: ${letters.join(" ")}`, "🎯", acts, letters.map((l) => `sound:${l}`));
}

function wordsLesson(unit: string, slug: string, title: string, known: Set<string>, n: number): Lesson {
  const r = seeded(`${unit}.${slug}`);
  const words = decodable(known);
  const read = readable(known);
  const builds = pickN(r, words, Math.min(2, words.length));
  const blends = pickN(r, words, Math.min(2, words.length), (w) => builds.includes(w));
  const acts: Activity[] = [];
  for (const w of builds) acts.push({ kind: "build", word: w, tiles: [...graphemes(w.word), ...pickN(r, [...known], 2, (l) => w.word.includes(l))] });
  for (const w of blends) acts.push({ kind: "blend", word: w, options: [w, ...pickN(r, words, 2, (x) => x.word === w.word)] });
  for (const target of pickN(r, read, Math.min(2, read.length))) acts.push({ kind: "read-word", word: target, options: [target, ...pickN(r, read, 2, (x) => x === target)] });
  return lesson(unit, slug, title, builds[0]?.emoji ?? "📖", acts.slice(0, Math.max(4, n)), [...builds, ...blends].map((w) => `word:${w.word}`));
}

function heartLesson(unit: string, group: number): Lesson {
  const r = seeded(`${unit}.hw${group}`);
  const words = HEART_WORDS[group];
  const others = [...HEART_WORDS.flat(), ...readable(new Set(ALL_LETTERS))];
  const acts: Activity[] = [];
  for (const w of words) acts.push({ kind: "pop", word: w, others: pickN(r, others, 5, (x) => x.toLowerCase() === w.toLowerCase()) });
  for (const w of pickN(r, words, 2)) acts.push({ kind: "read-word", word: w, options: [w, ...pickN(r, words, 2, (x) => x === w)] });
  return lesson(unit, `hw${group + 1}`, `Heart words ${group + 1}`, "💖", acts, words.map((w) => `heart:${w.toLowerCase()}`));
}

function sentenceLesson(unit: string, slug: string, title: string, level: "k" | "1" | "2", offset: number): Lesson {
  const items = SENTENCES.find((s) => s.level === level)!.items.slice(offset, offset + 3);
  return lesson(
    unit,
    slug,
    title,
    items[0]?.emoji ?? "📖",
    items.map((s) => ({ kind: "sentence", text: s.text, emoji: s.emoji, question: s.question })),
    [`read:${level}`],
  );
}

function patternLesson(unit: string, slug: string, title: string, graph: string, words: string[]): Lesson {
  const r = seeded(`${unit}.${slug}`);
  const snd = SOUNDS[graph];
  const pics = words.map(pic);
  const acts: Activity[] = [];
  if (snd) acts.push({ kind: "meet", letter: graph, pics: snd.pics });
  // Cycle through the words so even a small pattern gets a full, repetitive (that's good) lesson.
  const order = pickN(r, pics, pics.length);
  const at = (i: number) => order[i % order.length];
  for (let i = 0; i < 2; i++) acts.push({ kind: "build", word: at(i), tiles: [...graphemes(at(i).word), ...pickN(r, ["a", "e", "i", "o", "u", "s", "t", "p"], 2, (l) => at(i).word.includes(l))] });
  for (let i = 2; i < 4; i++) acts.push({ kind: "blend", word: at(i), options: [at(i), ...pickN(r, PIC_WORDS, 2, (x) => x.word === at(i).word)] });
  if (order.length > 2) acts.push({ kind: "build", word: at(4), tiles: [...graphemes(at(4).word), ...pickN(r, ["a", "e", "i", "o", "u"], 1, (l) => at(4).word.includes(l))] });
  return lesson(unit, slug, title, snd?.pics[0].emoji ?? pics[0].emoji, acts, words.map((w) => `word:${w}`));
}

// ── The course ───────────────────────────────────────────────────────────────
function unit(id: string, title: string, emoji: string, grade: GradeId, blurb: string, lessons: Lesson[]): Unit {
  return { id: `read.${id}`, subject: "reading", title, emoji, grade, blurb, lessons };
}

function buildReading(): Course {
  const units: Unit[] = [];

  // Sounds before letters: rhymes and first sounds (phonemic awareness).
  const r0 = seeded("pa");
  const rhymeActs = (count: number): Activity[] =>
    pickN(r0, RHYMES.filter((f) => f.length >= 2), count).map((fam) => {
      const [target, answer] = fam;
      const others = pickN(r0, PIC_WORDS.filter((w) => w.word.length <= 4), 2, (w) => fam.some((f) => f.word === w.word));
      return { kind: "rhyme", target, options: [answer, ...others], answer: answer.word } as Activity;
    });
  units.push(
    unit("pa", "Sound detectives", "🔍", "prek", "Hear rhymes and the first sound in words.", [
      lesson("pa", "rhyme1", "Rhyme time", "🎵", rhymeActs(5), ["skill:rhyme"]),
      lesson("pa", "first1", "First sounds", "👂", ["m", "s", "t", "p", "b"].map((l) => ({ kind: "first-sound", letter: l, options: [SOUNDS[l].pics[0], ...pickN(r0, otherPics(l), 2)], answer: SOUNDS[l].pics[0].word }) as Activity), ["skill:first-sound"]),
      lesson("pa", "rhyme2", "More rhymes", "🎶", rhymeActs(5), ["skill:rhyme"]),
    ]),
  );

  // Letter sets, each followed by word work once real words are possible.
  LETTER_SETS.forEach((set, i) => {
    const before = LETTER_SETS.slice(0, i).flatMap((s) => s.letters);
    const lessons: Lesson[] = [];
    set.letters.forEach((l, j) => lessons.push(letterLesson(set.id, l, [...before, ...set.letters.slice(0, j)])));
    lessons.push(reviewLesson(set.id, set.letters));
    units.push(unit(set.id, `Letters ${set.letters.map((l) => SOUNDS[l].graph).join(" ")}`, set.emoji, set.grade, "Meet each letter's sound, trace it, and find it.", lessons));
    if (i >= 1) {
      const known = knownThrough(i);
      units.push(
        unit(`w${i}`, i === 1 ? "First words" : `Word builder ${i}`, i === 1 ? "🧱" : "🏗️", i === 1 ? "k" : set.grade, "Sound out words, then build them letter by letter.", [
          wordsLesson(`w${i}`, "1", "Build and blend", known, 6),
          wordsLesson(`w${i}`, "2", "Read it!", known, 6),
          wordsLesson(`w${i}`, "3", "Word workout", known, 6),
        ]),
      );
    }
  });

  units.push(unit("hw", "Heart words", "💖", "k", "Common words we learn by heart.", [heartLesson("hw", 0), heartLesson("hw", 1)]));
  units.push(
    unit("s1", "First sentences", "📗", "k", "Read a whole sentence — then show you got it.", [
      sentenceLesson("s1", "1", "My first sentences", "k", 0),
      sentenceLesson("s1", "2", "Read and find", "k", 3),
      sentenceLesson("s1", "3", "Sentence star", "k", 6),
    ]),
  );
  units.push(
    unit("dg", "Two letters, one sound", "🔗", "1", "sh, ch, th, ck and ng.", [
      patternLesson("dg", "sh", "The sh sound", "sh", ["ship", "fish", "dish", "shop"]),
      patternLesson("dg", "ch", "The ch sound", "ch", ["chick", "chip"]),
      patternLesson("dg", "th", "The th sound", "th", ["bath"]),
      patternLesson("dg", "ck", "The ck sound", "ck", ["duck", "sock", "rock", "chick"]),
      patternLesson("dg", "ng", "The ng sound", "ng", ["ring", "king", "sing"]),
    ]),
  );
  units.push(
    unit("bl", "Blends", "🌀", "1", "Two sounds side by side: fr, cl, st…", [
      patternLesson("bl", "1", "Blend it", "", ["frog", "flag", "crab", "drum"]),
      patternLesson("bl", "2", "Blend more", "", ["clap", "sled", "swim", "stop"]),
      patternLesson("bl", "3", "Ending blends", "", ["tent", "hand", "milk", "lamp", "gift"]),
    ]),
  );
  units.push(
    unit("me", "Magic e", "🪄", "1", "A silent e makes the vowel say its name.", [
      patternLesson("me", "a", "a_e: cake", "a_e", ["cake", "game", "snake"]),
      patternLesson("me", "i", "i_e: kite", "i_e", ["kite", "bike", "five", "nine", "smile"]),
      patternLesson("me", "o", "o_e: bone", "o_e", ["bone", "rose", "home"]),
      patternLesson("me", "u", "u_e: cube", "u_e", ["cube", "tube"]),
    ]),
  );
  units.push(unit("s2", "Reading stars", "📘", "1", "Sentences with the new sounds.", [sentenceLesson("s2", "1", "Fish and frogs", "1", 0), sentenceLesson("s2", "2", "Goats and kings", "1", 3), sentenceLesson("s2", "3", "Bees and crabs", "1", 5)]));
  units.push(unit("hw2", "More heart words", "💗", "1", "More words to know by heart.", [heartLesson("hw2", 2), heartLesson("hw2", 3)]));
  units.push(
    unit("vt", "Vowel teams", "👯", "1", "Two vowels together: ee, ai, oa.", [
      patternLesson("vt", "ee", "ee: bee", "ee", ["bee", "tree", "feet", "sheep", "seed"]),
      patternLesson("vt", "ai", "ai: rain", "ai", ["rain", "snail", "train"]),
      patternLesson("vt", "oa", "oa: boat", "oa", ["boat", "goat", "coat", "road"]),
    ]),
  );
  units.push(
    unit("rc", "Bossy r", "🦜", "2", "When r follows a vowel, it changes the sound.", [
      patternLesson("rc", "ar", "ar: car", "ar", ["car", "star", "shark"]),
      patternLesson("rc", "or", "or: corn", "or", ["corn", "fork", "storm"]),
    ]),
  );
  units.push(unit("s3", "Story time", "📚", "2", "Longer sentences and what they mean.", [sentenceLesson("s3", "1", "Rain and snails", "2", 0), sentenceLesson("s3", "2", "Sharks and sheep", "2", 3)]));

  return { id: "reading", title: "Reading", emoji: "📖", tagline: "Letter sounds to real reading", units };
}

export const READING: Course = buildReading();
