import type { Activity, Course, Option, Pic } from "./types";
import { SOUNDS, graphemes, soundOut, vowelUnits } from "./sounds";
import { buildWorlds, makeItemsFor, pick, pickN, rng, shuffle, type Rng, type Topic, type WorldDef } from "./gen";
import * as B from "./readingBanks";
import { K_SENTENCES, passagesFor, type Passage } from "./passages";

// The Reading voyage — systematic phonics the way structured-literacy programs teach it, then on
// to real reading: sounds → letters (m s a t first, so words come fast) → word families → sight
// words → sentences → digraphs, blends, magic e, vowel teams, bossy r → endings and compound
// words → prefixes, suffixes and word meaning → roots, figurative language, grammar, and leveled
// stories and passages with real comprehension questions. Every word a child is asked to decode
// uses only patterns already taught.

// ── Letters ───────────────────────────────────────────────────────────────────────────────────
const LETTER_SETS: string[][] = [["m", "s", "a", "t"], ["p", "f", "i", "n"], ["o", "d", "c", "u"], ["g", "b", "e", "l"], ["h", "r", "k", "w"], ["j", "y", "x", "q", "v", "z"]];
const ALL_LETTERS = LETTER_SETS.flat();
/** Letters that make the same sound (never offer both as choices). */
const SAME_SOUND: Record<string, string> = { c: "k", k: "k", ck: "k", q: "kw" };
const same = (a: string, b: string) => (SAME_SOUND[a] ?? a) === (SAME_SOUND[b] ?? b);
/** Keyword pictures that start with some OTHER sound (for "which starts with…"). */
const otherFirstPics = (letter: string) =>
  Object.values(SOUNDS)
    .filter((s) => s.id.length === 1 && s.id !== "x" && !same(s.id, letter))
    .map((s) => s.pics[0]);
const ALL_PICS: Pic[] = [...Object.values(B.FAMILIES).flat(), ...Object.values(B.DIGRAPHS).flat(), ...Object.values(B.MAGIC_E).flat(), ...Object.values(B.VOWEL_TEAMS).flat()];
const uniqueByEmoji = (ps: Pic[]) => ps.filter((p, i) => ps.findIndex((x) => x.emoji === p.emoji) === i);

function findLetter(r: Rng, l: string, pool: string[]): Activity {
  return { kind: "find-letter", letter: l, options: [l, ...pickN(r, pool.length >= 3 ? pool : ALL_LETTERS, 2, (x) => x === l || same(x, l))], skill: `r:sound:${l}` };
}
function firstSound(r: Rng, l: string, anchor?: Pic): Activity {
  const a = anchor ?? pick(r, SOUNDS[l].pics);
  return { kind: "first-sound", letter: l, options: [a, ...pickN(r, otherFirstPics(l), 2, (p) => p.emoji === a.emoji)], answer: a.word, skill: `r:sound:${l}` };
}
const soundSkill = (skill: string) => /^r:sound:([a-z_]+)$/.exec(skill)?.[1] ?? null;
const findT = (letters: string[]): Topic => ({
  key: `find-${letters.join("")}`,
  gen: (r) => findLetter(r, pick(r, letters), letters),
  forSkill: (skill, r) => {
    const l = soundSkill(skill);
    return l && letters.includes(l) ? findLetter(r, l, letters) : null;
  },
});
const firstT = (letters: string[]): Topic => ({
  key: `first-${letters.join("")}`,
  gen: (r) => firstSound(r, pick(r, letters.filter((l) => l !== "x"))),
  forSkill: (skill, r) => {
    const l = soundSkill(skill);
    return l && l !== "x" && letters.includes(l) ? firstSound(r, l) : null;
  },
});
/** One letter, start to finish: meet it, find it, trace it, hear it at the start of words. */
const letterLesson = (l: string, before: string[]) => (r: Rng): Activity[] => {
  const snd = SOUNDS[l];
  const pool = [...before, l];
  const out: Activity[] = [
    { kind: "meet", letter: l, pics: snd.pics, skill: `r:sound:${l}` },
    findLetter(r, l, pool),
    { kind: "trace", letter: snd.graph[0], skill: `r:write:${l}` },
    l === "x" ? findLetter(r, l, pool) : firstSound(r, l, snd.pics[1] ?? snd.pics[0]),
    findLetter(r, l, pool),
    l === "x" ? findLetter(r, l, pool) : firstSound(r, l, snd.pics[2] ?? snd.pics[0]),
  ];
  return out;
};

// ── Sounds in words (phonemic awareness) ──────────────────────────────────────────────────────
const rhymeT: Topic = {
  key: "rhyme",
  gen: (r) => {
    const set = pick(r, B.RHYME_SETS);
    const [target, answer] = pickN(r, set, 2);
    const others = pickN(r, uniqueByEmoji(B.RHYME_SETS.filter((x) => x !== set).flat()), 2, (p) => p.emoji === target.emoji || p.emoji === answer.emoji);
    return { kind: "rhyme", target, options: [answer, ...others], answer: answer.word, skill: "r:rhyme" };
  },
};
const syllablesT = (withWord: boolean): Topic => ({
  key: `syllables-${withWord}`,
  gen: (r) => {
    const [word, emoji, n] = pick(r, B.SYLLABLES);
    const options: Option[] = [1, 2, 3, 4].map((v) => ({ id: String(v), text: String(v), say: [["zero", "one", "two", "three", "four"][v]] }));
    return { kind: "choice", prompt: withWord ? `How many syllables in "${word}"?` : "Clap it! How many claps?", say: ["Clap it! How many claps in,", word], visual: withWord ? { type: "word", text: word } : { type: "emoji", emoji, size: "xl" }, options, answer: String(n), layout: "row", skill: "r:syllables", why: `${word}: ${n} ${n === 1 ? "clap" : "claps"}.` };
  },
});
const oralBlendT: Topic = {
  key: "oralblend",
  gen: (r) => {
    const words = Object.values(B.FAMILIES).flat().filter((w) => graphemes(w.word).length === 3);
    const w = pick(r, words);
    const units = graphemes(w.word);
    const say = ["Listen to the sounds.", ...soundOut(w.word).flatMap((u) => (u.sound ? [`snd:${u.sound}`, "~"] : [])), "What word is it?"];
    const others = pickN(r, words, 2, (x) => x.word === w.word || x.emoji === w.emoji);
    return { kind: "choice", prompt: "Listen to the sounds. What word is it?", say, options: shuffle(r, [w, ...others]).map((p) => ({ id: p.word, emoji: p.emoji, visual: { type: "emoji", emoji: p.emoji, size: "lg" } as const })), answer: w.word, layout: "row", skill: "r:blend-oral", why: `${units.join(" — ")} … ${w.word}!` };
  },
};

// ── Words ─────────────────────────────────────────────────────────────────────────────────────
const wordSkill = (skill: string) => /^r:word:(.+)$/.exec(skill)?.[1] ?? null;
function buildItem(r: Rng, w: Pic, extra: string[]): Activity {
  const g = graphemes(w.word);
  return { kind: "build", word: w, tiles: [...g, ...pickN(r, extra, 2, (x) => g.includes(x))], skill: `r:word:${w.word}` };
}
const buildT = (words: Pic[], key: string, extra = ["a", "e", "i", "o", "u", "s", "t", "p", "m", "n"]): Topic => ({
  key: `build-${key}`,
  gen: (r) => buildItem(r, pick(r, words), extra),
  forSkill: (skill, r) => {
    const w = words.find((x) => x.word === wordSkill(skill));
    return w ? buildItem(r, w, extra) : null;
  },
});
function blendItem(r: Rng, w: Pic): Activity {
  return { kind: "blend", word: w, options: [w, ...pickN(r, uniqueByEmoji(ALL_PICS), 2, (x) => x.word === w.word || x.emoji === w.emoji)], skill: `r:word:${w.word}` };
}
const blendT = (words: Pic[], key: string): Topic => {
  const ok = words.filter((w) => vowelUnits(w.word) === 1);
  return {
    key: `blend-${key}`,
    gen: (r) => blendItem(r, pick(r, ok.length ? ok : words)),
    forSkill: (skill, r) => {
      const w = ok.find((x) => x.word === wordSkill(skill));
      return w ? blendItem(r, w) : null;
    },
  };
};
function picWordItem(r: Rng, w: Pic, pool: string[]): Activity {
  const wrong = pickN(r, pool, 2, (x) => x === w.word || x.length !== w.word.length || x[0] !== w.word[0] && x.slice(-2) !== w.word.slice(-2));
  const fill = wrong.length < 2 ? pickN(r, pool, 2 - wrong.length, (x) => x === w.word || wrong.includes(x)) : [];
  return {
    kind: "choice",
    prompt: "Which word matches the picture?",
    say: ["Which word matches the picture?"],
    visual: { type: "emoji", emoji: w.emoji, size: "xl" },
    options: shuffle(r, [w.word, ...wrong, ...fill]).map((t) => ({ id: t, text: t })),
    answer: w.word,
    layout: "row",
    skill: `r:word:${w.word}`,
    why: `Sound it out: ${graphemes(w.word).join(" – ")} … ${w.word}.`,
  };
}
const picWordT = (words: Pic[], key: string, pool?: string[]): Topic => ({
  key: `picword-${key}`,
  gen: (r) => picWordItem(r, pick(r, words), pool ?? words.map((w) => w.word)),
  forSkill: (skill, r) => {
    const w = words.find((x) => x.word === wordSkill(skill));
    return w ? picWordItem(r, w, pool ?? words.map((x) => x.word)) : null;
  },
});
const missingVowelT = (words: Pic[], key: string): Topic => ({
  key: `missingvowel-${key}`,
  gen: (r) => {
    const w = pick(r, words.filter((x) => /^[a-z]{3}$/.test(x.word)));
    const v = w.word[1];
    return {
      kind: "choice",
      prompt: "Which letter is missing?",
      say: ["Which letter is missing?", "~", w.word],
      visual: { type: "pair", left: { type: "emoji", emoji: w.emoji, size: "lg" }, right: { type: "word", text: `${w.word[0]}_${w.word[2]}` } },
      options: shuffle(r, [v, ...pickN(r, ["a", "e", "i", "o", "u"], 2, (x) => x === v)]).map((t) => ({ id: t, text: t, say: [`snd:${t}`] })),
      answer: v,
      layout: "row",
      skill: `r:vowel:${v}`,
      why: `${w.word}: the middle sound is ${v}.`,
    };
  },
});
const readWordT = (words: string[], key: string, kind: "word" | "sight"): Topic => ({
  key: `read-${key}`,
  gen: (r) => {
    const w = pick(r, words);
    return { kind: "read-word", word: w, options: [w, ...pickN(r, words, 2, (x) => x === w || x.toLowerCase() === w.toLowerCase())], skill: `r:${kind}:${w.toLowerCase()}` };
  },
  forSkill: (skill, r) => {
    const m = new RegExp(`^r:${kind}:(.+)$`).exec(skill);
    const w = m && words.find((x) => x.toLowerCase() === m[1]);
    return w ? { kind: "read-word", word: w, options: [w, ...pickN(r, words, 2, (x) => x === w)], skill } : null;
  },
});
const familyRhymeT = (fams: string[]): Topic => ({
  key: `famrhyme-${fams.join("")}`,
  gen: (r) => {
    const fam = pick(r, fams);
    const [target, answer] = pickN(r, B.FAMILIES[fam], 2);
    const others = pickN(r, fams.filter((f) => f !== fam).flatMap((f) => B.FAMILIES[f]), 2).map((p) => p.word);
    return { kind: "choice", prompt: `Which word rhymes with ${target.word}?`, say: ["Which word rhymes with,", target.word], visual: { type: "pair", left: { type: "emoji", emoji: target.emoji, size: "lg" }, right: { type: "word", text: target.word } }, options: shuffle(r, [answer.word, ...others]).map((t) => ({ id: t, text: t })), answer: answer.word, layout: "row", skill: `r:family:${fam}`, why: `${target.word} and ${answer.word} both end in -${fam}.` };
  },
});

// ── Sight words ───────────────────────────────────────────────────────────────────────────────
const popT = (words: string[], key: string): Topic => ({
  key: `pop-${key}`,
  gen: (r) => {
    const w = pick(r, words);
    return { kind: "pop", word: w, others: pickN(r, words, 5, (x) => x.toLowerCase() === w.toLowerCase()), skill: `r:sight:${w.toLowerCase()}` };
  },
  forSkill: (skill, r) => {
    const w = words.find((x) => `r:sight:${x.toLowerCase()}` === skill);
    return w ? { kind: "pop", word: w, others: pickN(r, words, 5, (x) => x === w), skill } : null;
  },
});
const memoryT = (words: string[], key: string): Topic => ({
  key: `memory-${key}`,
  gen: (r) => {
    const ws = pickN(r, words, 4);
    return { kind: "match", mode: "memory", prompt: "Find the matching words", say: ["Find the matching words."], pairs: ws.map((w) => ({ a: { id: w, text: w, say: [w] }, b: { id: w, text: w, say: [w] } })), skill: "r:sight" };
  },
});
const FRAMES: [string, string, string[]][] = [
  ["I can ___ the cat.", "see", ["go", "red"]], ["We ___ to the park.", "go", ["see", "big"]], ["___ is my hat.", "This", ["Go", "Up"]], ["The dog is ___ the box.", "in", ["is", "red"]],
  ["Look at ___!", "me", ["go", "is"]], ["Can you ___ me?", "help", ["blue", "little"]], ["I ___ to play.", "like", ["the", "down"]], ["She ___ my friend.", "is", ["go", "up"]],
  ["The ball is ___.", "red", ["run", "see"]], ["Come ___ with me.", "play", ["blue", "the"]], ["I see ___ birds.", "three", ["jump", "where"]], ["___ is my cat?", "Where", ["Run", "Big"]],
  ["They ___ fast.", "run", ["red", "the"]], ["He ___ a dog.", "has", ["blue", "and"]], ["I ___ a big cake.", "ate", ["saw", "four"]], ["We ___ happy.", "are", ["was", "into"]],
];
const sightFillT: Topic = {
  key: "sightfill",
  gen: (r) => {
    const [text, answer, wrong] = pick(r, FRAMES);
    return { kind: "choice", prompt: "Which word fits?", say: ["Which word fits?"], visual: { type: "sentence", text }, options: shuffle(r, [answer, ...wrong]).map((t) => ({ id: t, text: t, say: [t.toLowerCase()] })), answer, layout: "row", skill: `r:sight:${answer.toLowerCase()}`, why: text.replace("___", answer) };
  },
};
const sentenceLesson = (offset: number) => (): Activity[] =>
  K_SENTENCES.slice(offset, offset + 3).map((s) => ({ kind: "sentence", text: s.text, emoji: s.emoji, question: s.question, skill: "r:read:sentence" }) as Activity);

// ── Patterns: digraphs, blends, magic e, vowel teams, bossy r ─────────────────────────────────
const meetPattern = (p: string) => (): Activity[] => [{ kind: "meet", letter: p, pics: SOUNDS[p]?.pics ?? [], skill: `r:pattern:${p}` }];
const sortT = (groups: Record<string, Pic[]>, keys: string[], label: (k: string) => string = (k) => k): Topic => ({
  key: `sort-${keys.join("-")}`,
  gen: (r) => {
    const its = keys.flatMap((k) => pickN(r, groups[k], keys.length > 2 ? 2 : 3).map((p) => ({ id: p.word, text: p.word, emoji: p.emoji, bin: k, say: [p.word] })));
    return { kind: "sort", prompt: "Sort the words by their sound", say: ["Sort the words by their sound."], bins: keys.map((k) => ({ id: k, label: label(k) })), items: shuffle(r, its), skill: `r:pattern:${keys.join("-")}` };
  },
});
const missingPatternT = (groups: Record<string, Pic[]>, keys: string[], label: (k: string) => string = (k) => k.replace(/\d$/, "")): Topic => ({
  key: `missingpat-${keys.join("-")}`,
  gen: (r) => {
    const k = pick(r, keys);
    const w = pick(r, groups[k]);
    const pat = label(k);
    const i = w.word.indexOf(pat.replace("_", ""));
    const masked = i >= 0 ? w.word.slice(0, i) + "_".repeat(pat.replace("_", "").length) + w.word.slice(i + pat.replace("_", "").length) : w.word;
    const options = [...new Set([pat, ...pickN(r, keys.map(label), 2, (x) => x === pat)])];
    return { kind: "choice", prompt: "Which letters are missing?", say: ["Which letters are missing?", "~", w.word], visual: { type: "pair", left: { type: "emoji", emoji: w.emoji, size: "lg" }, right: { type: "word", text: masked } }, options: shuffle(r, options).map((t) => ({ id: t, text: t })), answer: pat, layout: "row", skill: `r:pattern:${pat}`, why: `${w.word} is spelled with ${pat}.` };
  },
});
const eChangeT: Topic = {
  key: "echange",
  gen: (r) => {
    const [short, long] = pick(r, B.E_PAIRS);
    const flip = r() < 0.35;
    const [from, to] = flip ? [long, short] : [short, long];
    return { kind: "choice", prompt: flip ? `Take away the magic e: ${from} → ?` : `Add a magic e: ${from} → ?`, say: [flip ? "Take away the magic e. What's the new word?" : "Add a magic e. What's the new word?"], visual: { type: "word", text: flip ? `${from} − e` : `${from} + e` }, options: shuffle(r, [to, from, pick(r, B.E_PAIRS.filter((x) => x[0] !== short))[flip ? 0 : 1]]).map((t) => ({ id: t, text: t, say: [t] })), answer: to, layout: "row", skill: "r:magic-e", why: flip ? `Without the e, the vowel is short: ${to}.` : `The magic e makes the vowel say its name: ${to}.` };
  },
};

// ── Word study: endings, compounds, contractions, prefixes, suffixes… ────────────────────────
const endingT: Topic = {
  key: "ending",
  gen: (r) => {
    const e = pick(r, B.ENDINGS);
    const ed = r() < 0.4;
    const answer = ed ? e.ed : e.ing;
    const naive = ed ? `${e.base}ed` : `${e.base}ing`;
    const dbl = `${e.base}${e.base.slice(-1)}${ed ? "ed" : "ing"}`;
    const wrong = [...new Set([naive, dbl, ed ? e.ing : e.ed].filter((w) => w !== answer))].slice(0, 2);
    return { kind: "choice", prompt: `${e.base} + ${ed ? "ed" : "ing"} = ?`, say: [e.base], visual: { type: "word", text: `${e.base} + ${ed ? "ed" : "ing"}` }, options: shuffle(r, [answer, ...wrong]).map((t) => ({ id: t, text: t })), answer, layout: "row", skill: ed ? "r:ending:ed" : "r:ending:ing", why: answer === naive ? `Just add ${ed ? "ed" : "ing"}: ${answer}.` : answer === dbl ? `Short vowel + one consonant: double it: ${answer}.` : e.base.endsWith("e") ? `Drop the e, then add ${ed ? "d" : "ing"}: ${answer}.` : `${e.base} → ${answer}.` };
  },
};
const tenseSortT: Topic = {
  key: "tensesort",
  gen: (r) => {
    const es = pickN(r, B.ENDINGS.filter((x) => x.ed.endsWith("ed")), 3);
    const its = es.flatMap((e) => [
      { id: e.ing, text: e.ing, bin: "now" },
      { id: e.ed, text: e.ed, bin: "past" },
    ]);
    return { kind: "sort", prompt: "Happening now, or already happened?", say: ["Is it happening now, or did it already happen?"], bins: [{ id: "now", label: "Now (-ing)", emoji: "⏳" }, { id: "past", label: "Past (-ed)", emoji: "✅" }], items: shuffle(r, its), skill: "r:ending:tense" };
  },
};
const compoundT: Topic = {
  key: "compound",
  gen: (r) => {
    const [a, b, c, emoji] = pick(r, B.COMPOUNDS);
    const split = r() < 0.4;
    if (split) return { kind: "choice", prompt: `Which two words make "${c}"?`, say: ["Which two words make,", c], visual: { type: "pair", left: { type: "emoji", emoji, size: "lg" }, right: { type: "word", text: c } }, options: shuffle(r, [`${a} + ${b}`, `${c.slice(0, a.length + 1)} + ${c.slice(a.length + 1)}`, `${b} + ${a}`]).map((t) => ({ id: t, text: t })), answer: `${a} + ${b}`, layout: "list", skill: "r:compound", why: `${a} + ${b} = ${c}.` };
    const other = pick(r, B.COMPOUNDS.filter((x) => x[2] !== c && x[1] !== b && `${a}${x[1]}` !== `${b}${a}`));
    return { kind: "choice", prompt: `${a} + ${b} = ?`, say: [a, b], visual: { type: "emoji", emoji, size: "xl" }, options: shuffle(r, [c, `${b}${a}`, `${a}${other[1]}`]).map((t) => ({ id: t, text: t })), answer: c, layout: "row", skill: "r:compound", why: `${a} + ${b} = ${c}.` };
  },
};
const contractionT: Topic = {
  key: "contraction",
  gen: (r) => {
    const [long, short] = pick(r, B.CONTRACTIONS);
    const wrong = pickN(r, B.CONTRACTIONS.map((x) => x[1]), 2, (x) => x === short);
    const flip = r() < 0.4;
    if (flip) return { kind: "choice", prompt: `What does "${short}" mean?`, visual: { type: "word", text: short }, options: shuffle(r, [long, ...pickN(r, B.CONTRACTIONS.map((x) => x[0]), 2, (x) => x === long)]).map((t) => ({ id: t, text: t })), answer: long, layout: "list", skill: "r:contraction", why: `${short} is short for ${long}. The apostrophe takes the place of missing letters.` };
    return { kind: "choice", prompt: `${long} = ?`, visual: { type: "word", text: long }, options: shuffle(r, [short, ...wrong]).map((t) => ({ id: t, text: t })), answer: short, layout: "row", skill: "r:contraction", why: `${long} → ${short}.` };
  },
};
const prefixT = (pres: typeof B.PREFIXES): Topic => ({
  key: `prefix-${pres.map((x) => x.pre).join("")}`,
  gen: (r) => {
    const pr = pick(r, pres);
    const [word, means] = pick(r, pr.words);
    const others = pickN(r, [...new Set(pres.flatMap((x) => x.words).map((x) => x[1]))], 2, (x) => x === means);
    if (r() < 0.5) return { kind: "choice", prompt: `What does "${word}" mean?`, visual: { type: "word", text: word, highlight: [0, pr.pre.length] }, options: shuffle(r, [means, ...others]).map((t) => ({ id: t, text: t })), answer: means, layout: "list", skill: `r:prefix:${pr.pre}`, why: `"${pr.pre}-" means ${pr.means}, so ${word} means ${means}.` };
    return { kind: "choice", prompt: `The prefix "${pr.pre}-" means…`, visual: { type: "word", text: `${pr.pre}-`, highlight: [0, pr.pre.length] }, options: shuffle(r, [pr.means, ...pickN(r, [...new Set(B.PREFIXES.map((x) => x.means))], 2, (x) => x === pr.means)]).map((t) => ({ id: t, text: t })), answer: pr.means, layout: "list", skill: `r:prefix:${pr.pre}`, why: `Think of ${pr.words.map((w) => w[0]).slice(0, 2).join(" and ")}: "${pr.pre}-" means ${pr.means}.` };
  },
});
const suffixT = (sufs: typeof B.SUFFIXES): Topic => ({
  key: `suffix-${sufs.map((x) => x.suf).join("")}`,
  gen: (r) => {
    const sf = pick(r, sufs);
    const [word, means] = pick(r, sf.words);
    const others = pickN(r, [...new Set(sufs.flatMap((x) => x.words).map((x) => x[1]))], 2, (x) => x === means);
    return { kind: "choice", prompt: `What does "${word}" mean?`, visual: { type: "word", text: word, highlight: [word.length - sf.suf.length, word.length] }, options: shuffle(r, [means, ...others]).map((t) => ({ id: t, text: t })), answer: means, layout: "list", skill: `r:suffix:${sf.suf}`, why: `"-${sf.suf}" means ${sf.means}: ${word} = ${means}.` };
  },
});
const synAntT = (kind: "synonym" | "antonym"): Topic => ({
  key: kind,
  gen: (r) => {
    const bank = kind === "synonym" ? B.SYNONYMS : B.ANTONYMS;
    const [a, b] = pick(r, bank);
    const wrong = pickN(r, [...new Set(bank.map((x) => x[1]).concat(bank.map((x) => x[0])))], 2, (x) => x === a || x === b);
    return { kind: "choice", prompt: kind === "synonym" ? `Which word means the same as "${a}"?` : `What is the opposite of "${a}"?`, visual: { type: "word", text: a }, options: shuffle(r, [b, ...wrong]).map((t) => ({ id: t, text: t })), answer: b, layout: "row", skill: `r:${kind}`, why: kind === "synonym" ? `${a} and ${b} mean almost the same thing.` : `${a} and ${b} are opposites.` };
  },
});
const matchPairsT = (kind: "synonym" | "antonym"): Topic => ({
  key: `match-${kind}`,
  gen: (r) => {
    const bank = kind === "synonym" ? B.SYNONYMS : B.ANTONYMS;
    const ps = pickN(r, bank, 4);
    return { kind: "match", mode: "columns", prompt: kind === "synonym" ? "Match words that mean the same" : "Match the opposites", pairs: ps.map(([a, b]) => ({ a: { id: a, text: a }, b: { id: b, text: b } })), skill: `r:${kind}` };
  },
});
const homophoneT: Topic = {
  key: "homophone",
  gen: (r) => {
    const h = pick(r, B.HOMOPHONES);
    const [text, answer] = pick(r, h.sentences);
    return { kind: "choice", prompt: "Which word fits?", visual: { type: "sentence", text }, options: shuffle(r, h.pair).map((t) => ({ id: t, text: t })), answer, layout: "row", skill: "r:homophone", why: text.replace("___", answer) };
  },
};
const abcT: Topic = {
  key: "abc",
  gen: (r, d) => {
    const pool = ["apple", "boat", "cat", "dog", "egg", "fish", "goat", "hat", "igloo", "jam", "kite", "lion", "moon", "nest", "owl", "pig", "queen", "rain", "sun", "tree", "umbrella", "van", "whale", "yarn", "zebra"];
    const same = d > 0.6;
    const words = same ? pickN(r, ["sail", "sand", "seal", "shell", "ship", "sky", "snow", "star", "sun", "swim"], 4) : pickN(r, pool, 4);
    return { kind: "order", prompt: "Put the words in ABC order", say: ["Put the words in A B C order."], items: [...words].sort().map((w) => ({ id: w, text: w })), direction: "column", skill: same ? "r:abc:2nd-letter" : "r:abc" };
  },
};
const posSortT = (kinds: ("noun" | "verb" | "adjective" | "adverb")[]): Topic => ({
  key: `pos-${kinds.join("-")}`,
  gen: (r) => {
    const label = { noun: "Noun (person, place, thing)", verb: "Verb (action)", adjective: "Adjective (describes)", adverb: "Adverb (how)" } as const;
    const its = kinds.flatMap((k) => pickN(r, B.PARTS_OF_SPEECH[k], kinds.length > 2 ? 2 : 3).map((w) => ({ id: w, text: w, bin: k })));
    return { kind: "sort", prompt: "Sort the words by part of speech", bins: kinds.map((k) => ({ id: k, label: label[k] })), items: shuffle(r, its), skill: `r:pos:${kinds.join("-")}` };
  },
});
const CONTEXT: [string, string, string, string[]][] = [
  ["The enormous whale was bigger than a bus.", "enormous", "very big", ["very small", "very fast"]],
  ["Max was famished after skipping lunch, so he ate three sandwiches.", "famished", "very hungry", ["very sleepy", "very cold"]],
  ["The trail was so narrow that we had to walk in a single line.", "narrow", "not wide", ["very long", "bumpy"]],
  ["The puppy was timid and hid behind the couch when guests arrived.", "timid", "shy and nervous", ["brave", "noisy"]],
  ["After the rain, the field was soggy and our shoes got wet.", "soggy", "very wet", ["dry and dusty", "frozen"]],
  ["Lena was elated when she won the art contest and jumped for joy.", "elated", "very happy", ["upset", "tired"]],
  ["The ancient castle had been standing for over a thousand years.", "ancient", "very old", ["brand new", "very tall"]],
  ["Please be cautious near the stove because it is hot.", "cautious", "careful", ["quick", "loud"]],
  ["The fragile glass broke into pieces when it fell.", "fragile", "easy to break", ["very heavy", "very shiny"]],
  ["The baby was drowsy, so her eyes kept closing.", "drowsy", "sleepy", ["hungry", "excited"]],
  ["The kids were so boisterous that the teacher asked them to quiet down.", "boisterous", "loud and lively", ["calm", "sad"]],
  ["We had an abundant harvest with more apples than we could eat.", "abundant", "more than enough", ["not enough", "rotten"]],
];
const contextT: Topic = {
  key: "context",
  gen: (r) => {
    const [text, word, means, wrong] = pick(r, CONTEXT);
    return { kind: "choice", prompt: `What does "${word}" mean?`, visual: { type: "sentence", text }, options: shuffle(r, [means, ...wrong]).map((t) => ({ id: t, text: t })), answer: means, layout: "list", skill: "r:context", why: `Use the clues in the sentence: "${text}"` };
  },
};
const factOpinionT: Topic = {
  key: "factopinion",
  gen: (r) => {
    const its = [...pickN(r, B.FACT_OPINION.filter((x) => x.fact), 2), ...pickN(r, B.FACT_OPINION.filter((x) => !x.fact), 2)];
    return { kind: "sort", prompt: "Fact or opinion?", bins: [{ id: "fact", label: "Fact (can be proven)", emoji: "🔍" }, { id: "opinion", label: "Opinion (what someone thinks)", emoji: "💭" }], items: shuffle(r, its.map((x) => ({ id: x.text, text: x.text, bin: x.fact ? "fact" : "opinion" }))), skill: "r:fact-opinion" };
  },
};
const rootT: Topic = {
  key: "roots",
  gen: (r) => {
    const rt = pick(r, B.ROOTS);
    if (r() < 0.5) return { kind: "choice", prompt: `The root "${rt.root}" means…`, visual: { type: "word", text: rt.words.join(" · ") }, options: shuffle(r, [rt.means, ...pickN(r, B.ROOTS.map((x) => x.means), 2, (x) => x === rt.means)]).map((t) => ({ id: t, text: t })), answer: rt.means, layout: "row", skill: `r:root:${rt.root}`, why: `${rt.words.join(", ")} all have "${rt.root}", which means ${rt.means}.` };
    const word = pick(r, rt.words);
    const others = pickN(r, B.ROOTS.filter((x) => x.root !== rt.root && !x.words.includes(word)).flatMap((x) => x.words), 2, (x) => x.includes(rt.root));
    return { kind: "choice", prompt: `Which word has a root that means "${rt.means}"?`, options: shuffle(r, [word, ...others]).map((t) => ({ id: t, text: t })), answer: word, layout: "row", skill: `r:root:${rt.root}`, why: `${word} contains "${rt.root}" (${rt.means}).` };
  },
};
const idiomT: Topic = {
  key: "idiom",
  gen: (r) => {
    const [text, means] = pick(r, B.IDIOMS);
    return { kind: "choice", prompt: "What does it really mean?", visual: { type: "sentence", text }, options: shuffle(r, [means, ...pickN(r, B.IDIOMS.map((x) => x[1]), 2, (x) => x === means)]).map((t) => ({ id: t, text: t })), answer: means, layout: "list", skill: "r:idiom", why: `"${text}" is an idiom — it means ${means.toLowerCase()}` };
  },
};
const figurativeT: Topic = {
  key: "figurative",
  gen: (r) => {
    if (r() < 0.5) {
      const its = [...pickN(r, B.SIMILES_METAPHORS.filter((x) => x.kind === "simile"), 2), ...pickN(r, B.SIMILES_METAPHORS.filter((x) => x.kind === "metaphor"), 2)];
      return { kind: "sort", prompt: "Simile or metaphor?", bins: [{ id: "simile", label: "Simile (uses like/as)" }, { id: "metaphor", label: "Metaphor (says it IS)" }], items: shuffle(r, its.map((x) => ({ id: x.text, text: x.text, bin: x.kind }))), skill: "r:figurative" };
    }
    const f = pick(r, B.SIMILES_METAPHORS);
    return { kind: "choice", prompt: "What does it mean?", visual: { type: "sentence", text: f.text }, options: shuffle(r, [f.means, ...pickN(r, B.SIMILES_METAPHORS.map((x) => x.means), 2, (x) => x === f.means)]).map((t) => ({ id: t, text: t })), answer: f.means, layout: "list", skill: "r:figurative", why: `${f.kind === "simile" ? "A simile compares using like or as" : "A metaphor says one thing IS another"}: ${f.means}` };
  },
};
const grammarT: Topic = {
  key: "grammar",
  gen: (r) => {
    const set = pick(r, B.GRAMMAR_SETS);
    return { kind: "choice", prompt: "Which sentence is written correctly?", options: shuffle(r, set).map((t) => ({ id: t, text: t })), answer: set[0], layout: "list", skill: "r:grammar", why: `"${set[0]}" — capital letters at the start and for names, and the right end mark.` };
  },
};
const adverbT: Topic = {
  key: "adverb",
  gen: (r) => {
    const adv = pick(r, B.PARTS_OF_SPEECH.adverb);
    const noun = pick(r, ["dog", "girl", "boat", "teacher", "bird"]);
    const verb = pick(r, ["ran", "sang", "moved", "spoke", "walked"]);
    const text = `The ${noun} ${verb} ${adv}.`;
    return { kind: "choice", prompt: "Which word is the adverb?", visual: { type: "sentence", text }, options: shuffle(r, [adv, noun, verb]).map((t) => ({ id: t, text: t })), answer: adv, layout: "row", skill: "r:pos:adverb", why: `"${adv}" tells HOW the ${noun} ${verb} — that's an adverb.` };
  },
};

// ── Stories and passages ──────────────────────────────────────────────────────────────────────
function passageLesson(ps: Passage[]) {
  return (r: Rng, li: number): Activity[] => {
    const psg = ps[li % ps.length];
    return psg.questions.map((qq) => ({
      kind: "choice",
      prompt: qq.q,
      visual: { type: "passage", title: psg.title, text: psg.text, emoji: psg.emoji },
      options: shuffle(r, [qq.a, ...qq.wrong]).map((t) => ({ id: t, text: t })),
      answer: qq.a,
      layout: "list",
      skill: `r:comp:${qq.kind}`,
      why: qq.why,
    }));
  };
}
const passageStage = (grade: "1" | "2" | "3" | "4" | "5") => {
  const ps = passagesFor(grade);
  return { title: "Story", emoji: "📖", topics: [contextT], levels: ps.length, fixed: passageLesson(ps), titles: ps.map((x) => x.title), emojis: ps.map((x) => x.emoji) };
};

// ── The voyage ────────────────────────────────────────────────────────────────────────────────
const letterWorld = (i: number, id: string, title: string, emoji: string, grade: "prek" | "k"): WorldDef => {
  const before = LETTER_SETS.slice(0, i).flat();
  const set = LETTER_SETS[i];
  return {
    id,
    title,
    emoji,
    grade,
    blurb: `Meet ${set.map((l) => SOUNDS[l].graph).join(", ")} — hear each sound, trace it, find it.`,
    stages: [
      ...set.map((l, j) => ({ title: `The ${SOUNDS[l].graph} sound`, emoji: SOUNDS[l].pics[0].emoji, topics: [findT([...before, ...set.slice(0, j + 1)])], levels: 1, fixed: letterLesson(l, [...before, ...set.slice(0, j)]) })),
      { title: "Sound check", emoji: "🎯", topics: [findT(set), firstT(set)], levels: 1 },
    ],
  };
};
const fams = (keys: readonly string[]) => keys.flatMap((k) => B.FAMILIES[k]);
const allFamWords = Object.values(B.FAMILIES).flat().map((p) => p.word);
const pats = (g: Record<string, Pic[]>, keys: string[]) => keys.flatMap((k) => g[k]);

const WORLDS: WorldDef[] = [
  // Pre-K
  { id: "pa", title: "Sound Detectives", emoji: "🔍", grade: "prek", blurb: "Hear rhymes, first sounds and syllables.", stages: [
    { title: "Rhyme time", emoji: "🎵", topics: [rhymeT], levels: 2 },
    { title: "First sounds", emoji: "👂", topics: [firstT(["m", "s", "t", "p", "b", "d", "f"])], levels: 2 },
    { title: "Clap it out", emoji: "👏", topics: [syllablesT(false)], levels: 2 },
  ] },
  { id: "pa2", title: "Listening Lagoon", emoji: "👂", grade: "prek", blurb: "Put sounds together to make words.", stages: [
    { title: "Sound it out loud", emoji: "🔊", topics: [oralBlendT], levels: 3 },
    { title: "Listening mix", emoji: "🎧", topics: [oralBlendT, rhymeT, syllablesT(false)], levels: 2 },
  ] },
  letterWorld(0, "ls1", "Letter Lagoon: m s a t", "🔤", "prek"),
  letterWorld(1, "ls2", "Letter Lagoon: p f i n", "🔡", "prek"),
  // Kindergarten
  letterWorld(2, "ls3", "Letter Reef: o d c u", "🅾️", "k"),
  letterWorld(3, "ls4", "Letter Reef: g b e l", "🅱️", "k"),
  letterWorld(4, "ls5", "Letter Bay: h r k w", "🔠", "k"),
  letterWorld(5, "ls6", "Letter Bay: j y x q v z", "✨", "k"),
  { id: "fam-a", title: "Short a Shores", emoji: "🐱", grade: "k", blurb: "Read and build -at, -an, -ap, -ag words.", stages: [
    { title: "Build it", emoji: "🧱", topics: [buildT(fams(B.FAMILY_GROUPS.a), "a")], levels: 2 },
    { title: "Blend it", emoji: "⛵", topics: [blendT(fams(B.FAMILY_GROUPS.a), "a"), picWordT(fams(B.FAMILY_GROUPS.a), "a", allFamWords)], levels: 2 },
    { title: "Word families", emoji: "🏠", topics: [familyRhymeT([...B.FAMILY_GROUPS.a]), readWordT(B.CVC_WORDS.a, "a", "word"), missingVowelT(fams(B.FAMILY_GROUPS.a), "a")], levels: 2 },
  ] },
  { id: "fam-io", title: "Short i & o Isles", emoji: "🐷", grade: "k", blurb: "Read and build short i and short o words.", stages: [
    { title: "Short i", emoji: "🐷", topics: [buildT(fams(B.FAMILY_GROUPS.i), "i"), blendT(fams(B.FAMILY_GROUPS.i), "i")], levels: 2 },
    { title: "Short o", emoji: "🐶", topics: [buildT(fams(B.FAMILY_GROUPS.o), "o"), blendT(fams(B.FAMILY_GROUPS.o), "o")], levels: 2 },
    { title: "i or o?", emoji: "🤔", topics: [missingVowelT([...fams(B.FAMILY_GROUPS.i), ...fams(B.FAMILY_GROUPS.o)], "io"), readWordT([...B.CVC_WORDS.i, ...B.CVC_WORDS.o], "io", "word"), picWordT([...fams(B.FAMILY_GROUPS.i), ...fams(B.FAMILY_GROUPS.o)], "io", allFamWords)], levels: 2 },
  ] },
  { id: "fam-ue", title: "Short u & e Bay", emoji: "🐛", grade: "k", blurb: "Read and build short u and short e words.", stages: [
    { title: "Short u", emoji: "☀️", topics: [buildT(fams(B.FAMILY_GROUPS.u), "u"), blendT(fams(B.FAMILY_GROUPS.u), "u")], levels: 2 },
    { title: "Short e", emoji: "🐔", topics: [buildT(fams(B.FAMILY_GROUPS.e), "e"), blendT(fams(B.FAMILY_GROUPS.e), "e")], levels: 2 },
    { title: "All the vowels", emoji: "🌈", topics: [missingVowelT(Object.values(B.FAMILIES).flat(), "all"), readWordT(Object.values(B.CVC_WORDS).flat(), "allcvc", "word"), familyRhymeT(Object.keys(B.FAMILIES))], levels: 3 },
  ] },
  { id: "sight1", title: "Sight Word Sandbar", emoji: "💖", grade: "k", blurb: "Words we know by heart.", stages: [
    { title: "Pop the words", emoji: "🎈", topics: [popT(B.DOLCH.prePrimer.slice(0, 20), "pp1")], levels: 2 },
    { title: "Find the word", emoji: "🔎", topics: [readWordT(B.DOLCH.prePrimer.slice(0, 20), "pp1", "sight"), memoryT(B.DOLCH.prePrimer.slice(0, 20), "pp1")], levels: 2 },
    { title: "Fill it in", emoji: "✏️", topics: [sightFillT, popT(B.DOLCH.prePrimer, "pp")], levels: 2 },
  ] },
  { id: "sight2", title: "Sight Word Springs", emoji: "💗", grade: "k", blurb: "More words to know by heart.", stages: [
    { title: "Pop the words", emoji: "🎈", topics: [popT(B.DOLCH.prePrimer.slice(20), "pp2")], levels: 2 },
    { title: "Memory match", emoji: "🃏", topics: [memoryT(B.DOLCH.prePrimer.slice(20), "pp2"), readWordT(B.DOLCH.prePrimer.slice(20), "pp2", "sight")], levels: 2 },
    { title: "Primer words", emoji: "📗", topics: [popT(B.DOLCH.primer.slice(0, 26), "pr1"), readWordT(B.DOLCH.primer.slice(0, 26), "pr1", "sight")], levels: 2 },
  ] },
  { id: "sent1", title: "Sentence Sea", emoji: "📗", grade: "k", blurb: "Read whole sentences — then show you got it.", stages: [
    { title: "First sentences", emoji: "📗", topics: [sightFillT], levels: 4, fixed: (_r, li) => sentenceLesson(li * 3)(), titles: ["My first sentences", "Read and find", "Sentence star", "Sentence captain"] },
    { title: "Fill it in", emoji: "✏️", topics: [sightFillT], levels: 1 },
  ] },
  // 1st grade
  { id: "digraphs", title: "Digraph Docks", emoji: "🔗", grade: "1", blurb: "Two letters, one sound: sh, ch, th, wh, ck, ng.", stages: [
    { title: "sh", emoji: "🚢", topics: [buildT(B.DIGRAPHS.sh, "sh")], levels: 1, fixed: (r) => [...meetPattern("sh")(), buildItem(r, pick(r, B.DIGRAPHS.sh), ["a", "i", "o"]), blendItem(r, pick(r, B.DIGRAPHS.sh.filter((w) => vowelUnits(w.word) === 1))), picWordItem(r, pick(r, B.DIGRAPHS.sh), allFamWords.concat(B.DIGRAPHS.sh.map((w) => w.word))), buildItem(r, pick(r, B.DIGRAPHS.sh), ["e", "u"])] },
    { title: "ch", emoji: "🐤", topics: [buildT(B.DIGRAPHS.ch, "ch")], levels: 1, fixed: (r) => [...meetPattern("ch")(), buildItem(r, pick(r, B.DIGRAPHS.ch), ["a", "o"]), blendItem(r, pick(r, B.DIGRAPHS.ch.filter((w) => vowelUnits(w.word) === 1))), picWordItem(r, pick(r, B.DIGRAPHS.ch), allFamWords.concat(B.DIGRAPHS.ch.map((w) => w.word))), buildItem(r, pick(r, B.DIGRAPHS.ch), ["e", "i"])] },
    { title: "th & wh", emoji: "🐳", topics: [picWordT([...B.DIGRAPHS.th, ...B.DIGRAPHS.wh], "thwh")], levels: 1, fixed: (r) => [...meetPattern("th")(), buildItem(r, pick(r, B.DIGRAPHS.th), ["a", "u"]), picWordItem(r, pick(r, B.DIGRAPHS.wh), B.DIGRAPHS.wh.map((w) => w.word).concat(["while", "white"])), picWordItem(r, pick(r, B.DIGRAPHS.th), B.DIGRAPHS.th.map((w) => w.word).concat(["that", "then"])), blendItem(r, pick(r, [...B.DIGRAPHS.th, ...B.DIGRAPHS.wh].filter((w) => vowelUnits(w.word) === 1)))] },
    { title: "ck & ng", emoji: "🦆", topics: [buildT([...B.DIGRAPHS.ck, ...B.DIGRAPHS.ng], "ckng")], levels: 1, fixed: (r) => [...meetPattern("ck")(), buildItem(r, pick(r, B.DIGRAPHS.ck), ["a", "e"]), ...meetPattern("ng")(), buildItem(r, pick(r, B.DIGRAPHS.ng), ["a", "o"]), blendItem(r, pick(r, B.DIGRAPHS.ck.filter((w) => vowelUnits(w.word) === 1))), picWordItem(r, pick(r, B.DIGRAPHS.ng), B.DIGRAPHS.ng.map((w) => w.word).concat(B.DIGRAPHS.ck.map((w) => w.word)))] },
    { title: "Digraph detective", emoji: "🕵️", topics: [sortT(B.DIGRAPHS, ["sh", "ch"]), missingPatternT(B.DIGRAPHS, ["sh", "ch", "th"]), picWordT(Object.values(B.DIGRAPHS).flat(), "dig")], levels: 2 },
  ] },
  { id: "blends", title: "Blend Bay", emoji: "🌀", grade: "1", blurb: "Two sounds side by side: fr, cl, st, nd…", stages: [
    { title: "Starting blends", emoji: "🐸", topics: [buildT(pats(B.BLENDS, ["fr", "cr", "dr", "tr"]), "rblends"), picWordT(pats(B.BLENDS, ["fr", "cr", "dr", "tr", "gr"]), "rblends")], levels: 2 },
    { title: "L and S blends", emoji: "⭐", topics: [buildT(pats(B.BLENDS, ["cl", "fl", "st", "sn", "sp", "sw"]), "lsblends"), blendT(pats(B.BLENDS, ["cl", "fl", "st", "sn", "sp", "sw"]), "ls")], levels: 2 },
    { title: "Ending blends", emoji: "✋", topics: [buildT(pats(B.BLENDS, ["nd", "mp", "nk", "st2"]), "endblends"), missingPatternT(B.BLENDS, ["nd", "mp", "nk"])], levels: 2 },
  ] },
  { id: "magic-e", title: "Magic e Island", emoji: "🪄", grade: "1", blurb: "A silent e makes the vowel say its name.", stages: [
    { title: "a_e", emoji: "🎂", topics: [buildT(B.MAGIC_E.a_e, "ae")], levels: 1, fixed: (r) => [...meetPattern("a_e")(), buildItem(r, pick(r, B.MAGIC_E.a_e), ["i", "o"]), blendItem(r, pick(r, B.MAGIC_E.a_e)), picWordItem(r, pick(r, B.MAGIC_E.a_e), B.MAGIC_E.a_e.map((w) => w.word).concat(["cap", "tap", "can"])), buildItem(r, pick(r, B.MAGIC_E.a_e), ["u"])] },
    { title: "i_e", emoji: "🪁", topics: [buildT(B.MAGIC_E.i_e, "ie")], levels: 1, fixed: (r) => [...meetPattern("i_e")(), buildItem(r, pick(r, B.MAGIC_E.i_e), ["a", "o"]), blendItem(r, pick(r, B.MAGIC_E.i_e)), picWordItem(r, pick(r, B.MAGIC_E.i_e), B.MAGIC_E.i_e.map((w) => w.word).concat(["kit", "pin", "bit"])), buildItem(r, pick(r, B.MAGIC_E.i_e), ["u"])] },
    { title: "o_e and u_e", emoji: "🦴", topics: [buildT([...B.MAGIC_E.o_e, ...B.MAGIC_E.u_e], "oeue")], levels: 1, fixed: (r) => [...meetPattern("o_e")(), buildItem(r, pick(r, B.MAGIC_E.o_e), ["a", "i"]), ...meetPattern("u_e")(), buildItem(r, pick(r, B.MAGIC_E.u_e), ["o"]), blendItem(r, pick(r, B.MAGIC_E.o_e)), picWordItem(r, pick(r, [...B.MAGIC_E.o_e, ...B.MAGIC_E.u_e]), [...B.MAGIC_E.o_e, ...B.MAGIC_E.u_e].map((w) => w.word).concat(["hop", "cub", "not"]))] },
    { title: "The magic switch", emoji: "✨", topics: [eChangeT, picWordT(Object.values(B.MAGIC_E).flat(), "me")], levels: 2 },
    { title: "Short or long?", emoji: "🔄", topics: [eChangeT, sortT({ short: Object.values(B.FAMILIES).flat().slice(0, 12), long: Object.values(B.MAGIC_E).flat() }, ["short", "long"], (k) => (k === "short" ? "Short vowel" : "Magic e"))], levels: 1 },
  ] },
  { id: "teams1", title: "Vowel Team Tides", emoji: "👯", grade: "1", blurb: "When two vowels go walking: ee, ea, ai, ay, oa, ow.", stages: [
    { title: "ee and ea", emoji: "🐝", topics: [buildT([...B.VOWEL_TEAMS.ee, ...B.VOWEL_TEAMS.ea], "eeea"), picWordT([...B.VOWEL_TEAMS.ee, ...B.VOWEL_TEAMS.ea], "eeea")], levels: 2 },
    { title: "ai and ay", emoji: "🌧️", topics: [buildT([...B.VOWEL_TEAMS.ai, ...B.VOWEL_TEAMS.ay], "aiay"), sortT(B.VOWEL_TEAMS, ["ai", "ay"])], levels: 2 },
    { title: "oa and ow", emoji: "⛵", topics: [buildT([...B.VOWEL_TEAMS.oa, ...B.VOWEL_TEAMS.ow], "oaow"), missingPatternT(B.VOWEL_TEAMS, ["oa", "ai", "ee"])], levels: 2 },
  ] },
  { id: "teams2", title: "Sound Swirl", emoji: "🌙", grade: "1", blurb: "oo, ou, ow, oi, oy — the tricky teams.", stages: [
    { title: "oo", emoji: "🌙", topics: [buildT(B.VOWEL_TEAMS.oo, "oo"), blendT(B.VOWEL_TEAMS.oo, "oo")], levels: 2 },
    { title: "ou and ow", emoji: "🐮", topics: [buildT([...B.VOWEL_TEAMS.ou, ...B.VOWEL_TEAMS.ow2], "ouow"), sortT(B.VOWEL_TEAMS, ["ou", "ow2"], (k) => (k === "ow2" ? "ow" : k))], levels: 2 },
    { title: "oi and oy", emoji: "🪙", topics: [buildT([...B.VOWEL_TEAMS.oi, ...B.VOWEL_TEAMS.oy], "oioy"), picWordT([...B.VOWEL_TEAMS.oi, ...B.VOWEL_TEAMS.oy], "oioy")], levels: 2 },
  ] },
  { id: "bossy-r", title: "Bossy R Reef", emoji: "🦜", grade: "1", blurb: "When r follows a vowel, it changes the sound.", stages: [
    { title: "ar", emoji: "🚗", topics: [buildT(B.BOSSY_R.ar, "ar"), blendT(B.BOSSY_R.ar, "ar")], levels: 2 },
    { title: "or", emoji: "🌽", topics: [buildT(B.BOSSY_R.or, "or"), picWordT(B.BOSSY_R.or, "or")], levels: 1 },
    { title: "er, ir, ur", emoji: "🐦", topics: [picWordT([...B.BOSSY_R.er, ...B.BOSSY_R.ir, ...B.BOSSY_R.ur], "erirur"), missingPatternT(B.BOSSY_R, ["ir", "ur", "or", "ar"])], levels: 2 },
  ] },
  { id: "endings", title: "Word Builder Wharf", emoji: "🏗️", grade: "1", blurb: "Endings (-ing, -ed), compound words and contractions.", stages: [
    { title: "-ing and -ed", emoji: "🏃", topics: [endingT], levels: 2 },
    { title: "Now or before?", emoji: "⏳", topics: [tenseSortT, endingT], levels: 1 },
    { title: "Compound words", emoji: "🌻", topics: [compoundT], levels: 2 },
    { title: "Contractions", emoji: "✂️", topics: [contractionT], levels: 2 },
  ] },
  { id: "sight3", title: "Sight Word Summit", emoji: "🏔️", grade: "1", blurb: "1st-grade words to know by heart.", stages: [
    { title: "Pop the words", emoji: "🎈", topics: [popT(B.DOLCH.primer.slice(26), "pr2")], levels: 2 },
    { title: "First grade words", emoji: "📘", topics: [readWordT(B.DOLCH.first, "first", "sight"), memoryT(B.DOLCH.first, "first")], levels: 2 },
    { title: "Word race", emoji: "🏁", topics: [popT(B.DOLCH.first, "first"), readWordT(B.DOLCH.first, "first2", "sight")], levels: 2 },
  ] },
  { id: "stories1", title: "Story Cove", emoji: "📚", grade: "1", blurb: "Read short stories and show what you understood.", stages: [passageStage("1")] },
  // 2nd grade
  { id: "syllables2", title: "Syllable Sail", emoji: "👏", grade: "2", blurb: "Longer words, one beat at a time.", stages: [
    { title: "Count the beats", emoji: "👏", topics: [syllablesT(true)], levels: 2 },
    { title: "Compound words", emoji: "🌈", topics: [compoundT], levels: 1 },
    { title: "Contractions", emoji: "✂️", topics: [contractionT], levels: 1 },
  ] },
  { id: "affixes1", title: "Prefix Port", emoji: "🧩", grade: "2", blurb: "un-, re-, -ful, -less, -er, -est change a word.", stages: [
    { title: "un- and re-", emoji: "🔁", topics: [prefixT(B.PREFIXES.slice(0, 2))], levels: 2 },
    { title: "-ful and -less", emoji: "💯", topics: [suffixT(B.SUFFIXES.slice(0, 2))], levels: 2 },
    { title: "-er and -est", emoji: "🏆", topics: [suffixT(B.SUFFIXES.slice(2, 4))], levels: 1 },
  ] },
  { id: "wordpairs", title: "Word Pair Pier", emoji: "🔀", grade: "2", blurb: "Synonyms, antonyms and words that sound alike.", stages: [
    { title: "Same meaning", emoji: "⚖️", topics: [synAntT("synonym"), matchPairsT("synonym")], levels: 2 },
    { title: "Opposites", emoji: "↔️", topics: [synAntT("antonym"), matchPairsT("antonym")], levels: 2 },
    { title: "Sound-alikes", emoji: "👂", topics: [homophoneT], levels: 2 },
  ] },
  { id: "sight4", title: "Sight Word Sky", emoji: "☁️", grade: "2", blurb: "2nd-grade words to know by heart.", stages: [
    { title: "Find the word", emoji: "🔎", topics: [readWordT(B.DOLCH.second, "second", "sight")], levels: 2 },
    { title: "Memory match", emoji: "🃏", topics: [memoryT(B.DOLCH.second, "second")], levels: 1 },
  ] },
  { id: "stories2", title: "Reading Reef", emoji: "🐠", grade: "2", blurb: "Stories and articles with questions that make you think.", stages: [passageStage("2")] },
  // 3rd grade
  { id: "affixes2", title: "Prefix Peaks", emoji: "⛰️", grade: "3", blurb: "dis-, mis-, pre-, -ly, -able, -ness, -ment.", stages: [
    { title: "More prefixes", emoji: "🧩", topics: [prefixT(B.PREFIXES.slice(2))], levels: 2 },
    { title: "More suffixes", emoji: "🔚", topics: [suffixT(B.SUFFIXES.slice(4))], levels: 2 },
  ] },
  { id: "dictionary", title: "Dictionary Dunes", emoji: "📕", grade: "3", blurb: "ABC order and parts of speech.", stages: [
    { title: "ABC order", emoji: "🔤", topics: [abcT], levels: 2 },
    { title: "Nouns and verbs", emoji: "🏷️", topics: [posSortT(["noun", "verb"])], levels: 2 },
    { title: "Describing words", emoji: "🎨", topics: [posSortT(["noun", "verb", "adjective"])], levels: 1 },
  ] },
  { id: "clues", title: "Clue Cove", emoji: "🕵️", grade: "3", blurb: "Figure out words from clues; fact or opinion.", stages: [
    { title: "Context clues", emoji: "🔍", topics: [contextT], levels: 2 },
    { title: "Fact or opinion", emoji: "💭", topics: [factOpinionT], levels: 2 },
  ] },
  { id: "stories3", title: "Lighthouse Library", emoji: "🗼", grade: "3", blurb: "Longer passages — main idea, cause and effect, inference.", stages: [passageStage("3")] },
  // 4th grade
  { id: "roots", title: "Root Rapids", emoji: "🌱", grade: "4", blurb: "Greek and Latin roots unlock big words.", stages: [
    { title: "Word roots", emoji: "🌱", topics: [rootT], levels: 4 },
  ] },
  { id: "figurative", title: "Figurative Falls", emoji: "🎭", grade: "4", blurb: "Idioms, similes and metaphors.", stages: [
    { title: "Idioms", emoji: "🐱", topics: [idiomT], levels: 2 },
    { title: "Similes and metaphors", emoji: "🌟", topics: [figurativeT], levels: 2 },
  ] },
  { id: "grammar", title: "Grammar Grotto", emoji: "✍️", grade: "4", blurb: "Capitals, punctuation and adverbs.", stages: [
    { title: "Write it right", emoji: "✍️", topics: [grammarT], levels: 2 },
    { title: "Adverbs", emoji: "🏃", topics: [adverbT, posSortT(["adjective", "adverb"])], levels: 2 },
  ] },
  { id: "stories4", title: "Explorer's Archive", emoji: "🧭", grade: "4", blurb: "Nonfiction and fiction — evidence, inference and theme.", stages: [passageStage("4"), { title: "Word meaning", emoji: "🔍", topics: [contextT, rootT], levels: 1 }] },
  // 5th grade
  { id: "stories5", title: "Captain's Library", emoji: "📚", grade: "5", blurb: "Challenging passages and big ideas.", stages: [passageStage("5")] },
  { id: "wordwizard", title: "Word Wizard Waters", emoji: "🧙", grade: "5", blurb: "Roots, figurative language and context — all mixed.", stages: [
    { title: "Word wizardry", emoji: "🧙", topics: [rootT, idiomT, contextT, figurativeT], levels: 3 },
  ] },
];

const units = buildWorlds("reading", "read", WORLDS);
const fromTopics = makeItemsFor(WORLDS);
const lessonPool = units.flatMap((u) => u.lessons.flatMap((l) => l.activities)).filter((a) => a.kind !== "meet");

export const READING: Course = {
  id: "reading",
  title: "Reading",
  emoji: "📖",
  tagline: "Letter sounds to real reading",
  units,
  // Review: rebuild the exact item when a topic can; otherwise bring back a past item of that skill.
  itemsFor: (skill, n, seed) => {
    const w = /^r:write:(.+)$/.exec(skill);
    if (w) return [{ kind: "trace", letter: SOUNDS[w[1]]?.graph[0] ?? w[1], skill }];
    const fresh = fromTopics(skill, n, seed);
    return fresh.length ? fresh : pickN(rng(seed), lessonPool.filter((a) => a.skill === skill), n);
  },
};
