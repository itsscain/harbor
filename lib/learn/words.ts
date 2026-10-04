import type { Pic } from "./types";

// Harbor Learn's word bank. Decodable words carry the letters they need, so a lesson only ever
// asks a child to read words built from sounds they've already learned. Pictures are emoji
// that every tablet shows (Unicode ≤ 13) and that mean one thing at a glance.

const p = (word: string, emoji: string): Pic => ({ word, emoji });

/** Picturable short words (consonant–vowel–consonant and friends), for building and blending. */
export const PIC_WORDS: Pic[] = [
  // short a
  p("cat", "🐱"), p("hat", "🎩"), p("bat", "🦇"), p("rat", "🐀"), p("map", "🗺️"), p("cap", "🧢"), p("van", "🚐"),
  p("pan", "🍳"), p("jam", "🍯"), p("ram", "🐏"), p("bag", "👜"), p("man", "👨"), p("can", "🥫"), p("cab", "🚕"),
  p("sad", "😢"), p("mad", "😠"), p("nap", "😴"), p("tag", "🏷️"), p("gas", "⛽"),
  // short e
  p("bed", "🛏️"), p("hen", "🐔"), p("pen", "🖊️"), p("ten", "🔟"), p("net", "🥅"), p("jet", "✈️"), p("web", "🕸️"),
  p("leg", "🦵"), p("red", "🟥"), p("wet", "💦"), p("gem", "💎"), p("vet", "🩺"), p("yes", "✅"),
  // short i
  p("pig", "🐷"), p("pin", "📌"), p("bin", "🗑️"), p("lip", "👄"), p("zip", "🤐"), p("six", "6️⃣"), p("kid", "🧒"), p("dig", "⛏️"),
  // short o
  p("dog", "🐶"), p("fox", "🦊"), p("box", "📦"), p("pot", "🍲"), p("log", "🪵"), p("hot", "🔥"), p("dot", "⚫"),
  p("mom", "👩"), p("rod", "🎣"), p("cob", "🌽"), p("top", "🔝"),
  // short u
  p("sun", "☀️"), p("bus", "🚌"), p("cup", "🥤"), p("bug", "🐛"), p("hug", "🤗"), p("nut", "🥜"), p("tub", "🛁"),
  p("cub", "🐻"), p("mug", "☕"), p("hut", "🛖"), p("run", "🏃"), p("sub", "🥪"),
  // digraphs
  p("ship", "🚢"), p("fish", "🐟"), p("dish", "🍽️"), p("shop", "🏪"), p("chick", "🐤"), p("chip", "🍟"), p("bath", "🛁"),
  p("duck", "🦆"), p("sock", "🧦"), p("rock", "🪨"), p("ring", "💍"), p("king", "🤴"), p("sing", "🎤"),
  // blends
  p("frog", "🐸"), p("flag", "🚩"), p("crab", "🦀"), p("drum", "🥁"), p("clap", "👏"), p("sled", "🛷"), p("swim", "🏊"),
  p("tent", "⛺"), p("hand", "✋"), p("milk", "🥛"), p("lamp", "💡"), p("gift", "🎁"), p("stop", "🛑"), p("plum", "🟣"),
  // magic e
  p("cake", "🎂"), p("kite", "🪁"), p("bike", "🚲"), p("bone", "🦴"), p("rose", "🌹"), p("cube", "🧊"), p("tube", "🧪"),
  p("five", "5️⃣"), p("nine", "9️⃣"), p("game", "🎮"), p("snake", "🐍"), p("home", "🏠"), p("smile", "😊"),
  // vowel teams
  p("bee", "🐝"), p("tree", "🌳"), p("feet", "🦶"), p("sheep", "🐑"), p("seed", "🌱"), p("rain", "🌧️"), p("snail", "🐌"),
  p("train", "🚆"), p("boat", "⛵"), p("goat", "🐐"), p("coat", "🧥"), p("road", "🛣️"),
  // bossy r
  p("car", "🚗"), p("star", "⭐"), p("shark", "🦈"), p("corn", "🌽"), p("fork", "🍴"), p("storm", "⛈️"),
];

const BY_WORD = new Map(PIC_WORDS.map((w) => [w.word, w]));
export const pic = (word: string): Pic => BY_WORD.get(word) ?? { word, emoji: "⭐" };

/** Letters a word needs (digraphs count as their letters). */
export const lettersOf = (word: string) => new Set(word.toLowerCase().replace(/[^a-z]/g, "").split(""));

/** Picturable words a child can read with these letters (and no other sounds). */
export function decodable(known: Set<string>, opts?: { max?: number; len?: number }): Pic[] {
  const list = PIC_WORDS.filter((w) => w.word.length <= (opts?.len ?? 3) && /^[a-z]+$/.test(w.word) && [...lettersOf(w.word)].every((l) => known.has(l)));
  return opts?.max ? list.slice(0, opts.max) : list;
}

/** Non-picture words for "read it" practice, by letter set. */
export const READ_WORDS: string[] = [
  "am", "at", "sat", "mat", "pat", "tap", "sap", "map", "nap", "pan", "pin", "tin", "sit", "fit", "fin", "fan", "pit", "tip", "sip", "nip",
  "an", "in", "it", "is", "if", "on", "not", "dot", "cot", "cod", "pod", "nod", "top", "mop", "pop", "sun", "fun", "cup", "cut", "nut", "mud", "dad", "did",
  "dig", "big", "bag", "beg", "bed", "leg", "let", "bet", "get", "got", "lot", "lit", "bit", "but", "bug", "dug", "gum", "bun", "bus", "lab",
  "hat", "hen", "hot", "hug", "hut", "him", "his", "red", "rat", "rug", "run", "rip", "kid", "kit", "web", "wet", "win", "wig",
  "jam", "jet", "jog", "yes", "yum", "box", "fox", "six", "wax", "van", "vet", "zip", "zap", "quit", "quiz",
];

/** Readable words (no picture) from known letters. */
export function readable(known: Set<string>): string[] {
  return READ_WORDS.filter((w) => [...lettersOf(w)].every((l) => known.has(l)));
}

/** Heart words — the common words kids learn by sight, in teaching order. */
export const HEART_WORDS: string[][] = [
  ["the", "a", "I", "is", "to", "see", "my", "go"],
  ["we", "like", "and", "can", "you", "it", "in", "on"],
  ["he", "she", "me", "said", "look", "are", "was", "of"],
  ["for", "here", "they", "have", "what", "do", "come", "one"],
];

export type SentenceItem = { text: string; emoji: string; question: { prompt: string; options: Pic[]; answer: string } };
const q = (prompt: string, answer: Pic, ...others: Pic[]) => ({ prompt, options: [answer, ...others], answer: answer.word });

/** Sentences kids can read with what they know, each with a picture and a "did you get it?". */
export const SENTENCES: { level: "k" | "1" | "2"; items: SentenceItem[] }[] = [
  {
    level: "k",
    items: [
      { text: "I see a cat.", emoji: "🐱", question: q("What do I see?", pic("cat"), pic("dog"), pic("sun")) },
      { text: "A dog can run.", emoji: "🐶", question: q("Who can run?", pic("dog"), pic("pig"), pic("hen")) },
      { text: "My pig is big.", emoji: "🐷", question: q("What is big?", pic("pig"), pic("bug"), pic("cat")) },
      { text: "The hen is in the box.", emoji: "🐔", question: q("Where is the hen?", pic("box"), pic("bed"), pic("bus")) },
      { text: "I like the red hat.", emoji: "🎩", question: q("What color is the hat?", { word: "red", emoji: "🟥" }, { word: "blue", emoji: "🟦" }, { word: "green", emoji: "🟩" }) },
      { text: "We can see the sun.", emoji: "☀️", question: q("What can we see?", pic("sun"), { word: "moon", emoji: "🌙" }, pic("star")) },
      { text: "Is it a fox?", emoji: "🦊", question: q("What is it?", pic("fox"), pic("cat"), pic("pig")) },
      { text: "The bug is on the mug.", emoji: "🐛", question: q("Where is the bug?", pic("mug"), pic("bed"), pic("box")) },
      { text: "Go, bus, go!", emoji: "🚌", question: q("What can go?", pic("bus"), pic("bed"), pic("hat")) },
      { text: "I can hug my mom.", emoji: "🤗", question: q("Who do I hug?", pic("mom"), pic("dog"), pic("pig")) },
    ],
  },
  {
    level: "1",
    items: [
      { text: "The fish is in the dish.", emoji: "🐟", question: q("Where is the fish?", pic("dish"), pic("ship"), pic("box")) },
      { text: "A frog sat on a log.", emoji: "🐸", question: q("Where did the frog sit?", pic("log"), pic("rock"), pic("bed")) },
      { text: "I can ride my bike home.", emoji: "🚲", question: q("What do I ride?", pic("bike"), pic("boat"), pic("train")) },
      { text: "The duck has a red sock.", emoji: "🦆", question: q("What does the duck have?", pic("sock"), pic("hat"), pic("cake")) },
      { text: "The goat is in the boat.", emoji: "🐐", question: q("Where is the goat?", pic("boat"), pic("car"), pic("tent")) },
      { text: "The king can sing.", emoji: "🤴", question: q("Who can sing?", pic("king"), pic("crab"), pic("snail")) },
      { text: "A bee is on the tree.", emoji: "🐝", question: q("What is on the tree?", pic("bee"), pic("cat"), pic("star")) },
      { text: "The crab can swim fast.", emoji: "🦀", question: q("Who can swim?", pic("crab"), pic("cake"), pic("kite")) },
    ],
  },
  {
    level: "2",
    items: [
      { text: "The snail went slow in the rain.", emoji: "🐌", question: q("What was the weather?", pic("rain"), pic("sun"), { word: "snow", emoji: "❄️" }) },
      { text: "We ate corn and cake at the farm.", emoji: "🌽", question: q("What did we eat?", pic("corn"), pic("fish"), pic("plum")) },
      { text: "A shark swam past the big ship.", emoji: "🦈", question: q("What swam past?", pic("shark"), pic("duck"), pic("goat")) },
      { text: "Five sheep sleep under a tree.", emoji: "🐑", question: q("How many sheep?", pic("five"), pic("nine"), pic("six")) },
      { text: "The train stops at the end of the road.", emoji: "🚆", question: q("What stops?", pic("train"), pic("boat"), pic("bike")) },
      { text: "Look at the star in the dark!", emoji: "⭐", question: q("What do we look at?", pic("star"), pic("sun"), pic("kite")) },
    ],
  },
];

/** Rhyme families with pictures, for "which one rhymes?". */
export const RHYMES: Pic[][] = [
  [pic("cat"), pic("hat"), pic("bat"), pic("rat")],
  [pic("dog"), pic("log"), pic("frog")],
  [pic("sun"), pic("run"), pic("bun" as string)],
  [pic("bug"), pic("hug"), pic("mug")],
  [pic("pig"), pic("dig")],
  [pic("hen"), pic("pen"), pic("ten")],
  [pic("cake"), pic("snake")],
  [pic("bee"), pic("tree")],
  [pic("boat"), pic("goat"), pic("coat")],
  [pic("car"), pic("star")],
  [pic("fox"), pic("box")],
].map((fam) => fam.filter((w) => w.emoji !== "⭐" || w.word === "star"));
