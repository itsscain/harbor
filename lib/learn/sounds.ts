import type { Pic } from "./types";

// The speech sounds Harbor Learn teaches. Each has:
//   ipa  — exact phonemes for the on-device Kokoro voice (fed straight to its tokenizer, so a
//          short "a" is really /æ/ — never the letter NAME "ay"). Continuous sounds are held
//          (ː); stop sounds get the tiniest vowel so they're audible, like a teacher says them.
//   say  — what to speak if the neural voice isn't ready yet (the system voice can't do IPA),
//          phrased so it's still right: "the first sound in apple".
//   pics — keyword pictures that START with the sound (the first one is the anchor word).

export type Sound = { id: string; graph: string; ipa: string; say: string; pics: Pic[] };

const s = (id: string, graph: string, ipa: string, say: string, pics: [string, string][]): Sound => ({
  id,
  graph,
  ipa,
  say,
  pics: pics.map(([word, emoji]) => ({ word, emoji })),
});

export const SOUNDS: Record<string, Sound> = Object.fromEntries(
  [
    s("m", "m", "mːː", "mmm", [["moon", "🌙"], ["mouse", "🐭"], ["monkey", "🐵"]]),
    s("s", "s", "sːː", "sss", [["sun", "☀️"], ["snake", "🐍"], ["sock", "🧦"]]),
    s("a", "a", "ˈæː", "the first sound in apple", [["apple", "🍎"], ["ant", "🐜"], ["alligator", "🐊"]]),
    s("t", "t", "tʰ", "the first sound in tiger", [["tiger", "🐯"], ["turtle", "🐢"], ["tent", "⛺"]]),
    s("p", "p", "pʰ", "the first sound in pig", [["pig", "🐷"], ["penguin", "🐧"], ["pizza", "🍕"]]),
    s("f", "f", "fːː", "fff", [["fish", "🐟"], ["frog", "🐸"], ["fox", "🦊"]]),
    s("i", "i", "ˈɪː", "the first sound in insect", [["insect", "🐞"], ["inchworm", "🐛"], ["ink", "🖋️"]]),
    s("n", "n", "nːː", "nnn", [["nose", "👃"], ["net", "🥅"], ["nut", "🥜"]]),
    s("o", "o", "ˈɑː", "the first sound in octopus", [["octopus", "🐙"], ["ox", "🐂"], ["otter", "🦦"]]),
    s("d", "d", "də", "the first sound in dog", [["dog", "🐶"], ["duck", "🦆"], ["drum", "🥁"]]),
    s("c", "c", "kʰ", "the first sound in cat", [["cat", "🐱"], ["cow", "🐮"], ["cake", "🎂"]]),
    s("u", "u", "ˈʌː", "the first sound in umbrella", [["umbrella", "☂️"], ["up", "⬆️"], ["upside down", "🙃"]]),
    s("g", "g", "ɡə", "the first sound in goat", [["goat", "🐐"], ["gift", "🎁"], ["grapes", "🍇"]]),
    s("b", "b", "bə", "the first sound in ball", [["ball", "⚽"], ["bear", "🐻"], ["bus", "🚌"]]),
    s("e", "e", "ˈɛː", "the first sound in egg", [["egg", "🥚"], ["elephant", "🐘"], ["elf", "🧝"]]),
    s("l", "l", "lːː", "lll", [["lion", "🦁"], ["leaf", "🍃"], ["lemon", "🍋"]]),
    s("h", "h", "hə", "the first sound in hat", [["hat", "🎩"], ["horse", "🐴"], ["house", "🏠"]]),
    s("r", "r", "ɹːː", "rrr", [["rabbit", "🐰"], ["rocket", "🚀"], ["rainbow", "🌈"]]),
    s("k", "k", "kʰ", "the first sound in kite", [["kite", "🪁"], ["key", "🔑"], ["koala", "🐨"]]),
    s("w", "w", "wə", "the first sound in whale", [["whale", "🐳"], ["watermelon", "🍉"], ["wave", "🌊"]]),
    s("j", "j", "ʤə", "the first sound in juice", [["juice", "🧃"], ["jet", "✈️"], ["jam", "🍯"]]),
    s("y", "y", "jə", "the first sound in yarn", [["yarn", "🧶"], ["yo-yo", "🪀"], ["yak", "🐃"]]),
    s("x", "x", "ks", "the last sound in box", [["box", "📦"], ["fox", "🦊"], ["six", "6️⃣"]]),
    s("q", "qu", "kwə", "the first sound in queen", [["queen", "👸"], ["question", "❓"], ["quiet", "🤫"]]),
    s("v", "v", "vːː", "vvv", [["van", "🚐"], ["violin", "🎻"], ["volcano", "🌋"]]),
    s("z", "z", "zːː", "zzz", [["zebra", "🦓"], ["zipper", "🤐"], ["zero", "0️⃣"]]),
    // Digraphs (two letters, one sound)
    s("sh", "sh", "ʃːː", "shh", [["ship", "🚢"], ["shell", "🐚"], ["shoe", "👟"]]),
    s("ch", "ch", "ʧ", "the first sound in chick", [["chick", "🐤"], ["cheese", "🧀"], ["cherry", "🍒"]]),
    s("th", "th", "θːː", "the first sound in thumb", [["thumb", "👍"], ["three", "3️⃣"], ["thunder", "⛈️"]]),
    s("ck", "ck", "kʰ", "the last sound in duck", [["duck", "🦆"], ["sock", "🧦"], ["rock", "🪨"]]),
    s("ng", "ng", "ŋːː", "the last sound in ring", [["ring", "💍"], ["king", "🤴"], ["sing", "🎤"]]),
    // Long vowels (magic e / vowel teams)
    s("a_e", "a_e", "ˈeɪ", "the middle sound in cake", [["cake", "🎂"], ["snake", "🐍"], ["game", "🎮"]]),
    s("i_e", "i_e", "ˈaɪ", "the middle sound in kite", [["kite", "🪁"], ["bike", "🚲"], ["five", "5️⃣"]]),
    s("o_e", "o_e", "ˈoʊ", "the middle sound in bone", [["bone", "🦴"], ["rose", "🌹"], ["globe", "🌍"]]),
    s("u_e", "u_e", "ˈuː", "the middle sound in tube", [["tube", "🧪"], ["cube", "🧊"], ["cute", "🥰"]]),
    s("ee", "ee", "ˈiː", "the middle sound in bee", [["bee", "🐝"], ["tree", "🌳"], ["feet", "🦶"]]),
    s("ai", "ai", "ˈeɪ", "the middle sound in rain", [["rain", "🌧️"], ["snail", "🐌"], ["train", "🚆"]]),
    s("oa", "oa", "ˈoʊ", "the middle sound in boat", [["boat", "⛵"], ["goat", "🐐"], ["coat", "🧥"]]),
    s("ar", "ar", "ˈɑɹ", "the middle sound in car", [["car", "🚗"], ["star", "⭐"], ["shark", "🦈"]]),
    s("or", "or", "ˈɔɹ", "the middle sound in corn", [["corn", "🌽"], ["fork", "🍴"], ["horse", "🐴"]]),
  ].map((x) => [x.id, x]),
);

/** The sound a single letter (or letter group) in a word makes — for "tap a letter to hear it". */
export function soundOf(graph: string): Sound | null {
  return SOUNDS[graph] ?? SOUNDS[graph.toLowerCase()] ?? null;
}

/** How a word sounds out, unit by written unit, with the sound each makes — null when silent,
 *  like the magic e in "cake" (whose a then says its name). Drives the blending slider. */
export function soundOut(word: string): { text: string; sound: string | null }[] {
  const w = word.toLowerCase();
  const magicVowel = w.length >= 4 && /[aeiou][^aeiou]e$/.test(w) && SOUNDS[`${w[w.length - 3]}_e`] ? w.length - 3 : -1;
  const out: { text: string; sound: string | null }[] = [];
  for (let i = 0; i < w.length; ) {
    const two = w.slice(i, i + 2);
    if (two === "qu") {
      out.push({ text: "qu", sound: "q" });
      i += 2;
    } else if (["sh", "ch", "th", "ck", "ng", "ee", "ai", "oa", "ar", "or"].includes(two)) {
      out.push({ text: two, sound: two });
      i += 2;
    } else if (i === magicVowel) {
      out.push({ text: w[i], sound: `${w[i]}_e` });
      i += 1;
    } else if (magicVowel >= 0 && i === w.length - 1) {
      out.push({ text: w[i], sound: null }); // the magic e: silent
      i += 1;
    } else {
      out.push({ text: w[i], sound: SOUNDS[w[i]] ? w[i] : null });
      i += 1;
    }
  }
  return out;
}

/** Split a decodable word into its sound units ("ship" → sh,i,p; "duck" → d,u,ck). */
export function graphemes(word: string): string[] {
  const w = word.toLowerCase();
  const out: string[] = [];
  for (let i = 0; i < w.length; ) {
    const two = w.slice(i, i + 2);
    if (["sh", "ch", "th", "ck", "ng", "qu", "ee", "ai", "oa", "ar", "or"].includes(two)) {
      out.push(two === "qu" ? "q" : two);
      i += 2;
    } else {
      out.push(w[i]);
      i += 1;
    }
  }
  return out;
}
