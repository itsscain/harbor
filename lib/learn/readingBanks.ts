import type { Pic } from "./types";

// Word banks for the Reading voyage. Picturable words use emoji every tablet shows (Unicode ≤ 13).
// Sight words are the public-domain Dolch lists. Each bank is ordered roughly easiest-first.

const p = (word: string, emoji: string): Pic => ({ word, emoji });

/** CVC word families with pictures (short vowels). */
export const FAMILIES: Record<string, Pic[]> = {
  at: [p("cat", "🐱"), p("hat", "🎩"), p("bat", "🦇"), p("rat", "🐀"), p("mat", "🧘")],
  an: [p("can", "🥫"), p("man", "👨"), p("pan", "🍳"), p("van", "🚐")],
  ap: [p("cap", "🧢"), p("map", "🗺️"), p("nap", "😴"), p("tap", "🚰")],
  ag: [p("bag", "👜"), p("tag", "🏷️"), p("rag", "🧽"), p("flag", "🚩")],
  ig: [p("pig", "🐷"), p("wig", "💇"), p("dig", "⛏️")],
  in: [p("pin", "📌"), p("bin", "🗑️"), p("fin", "🦈"), p("tin", "🥫")],
  it: [p("sit", "🪑"), p("kit", "🧰"), p("hit", "🏏"), p("pit", "🕳️")],
  ip: [p("lip", "👄"), p("zip", "🤐"), p("hip", "🕺"), p("dip", "🥣")],
  ot: [p("pot", "🍲"), p("hot", "🔥"), p("dot", "⚫"), p("cot", "🛏️")],
  og: [p("dog", "🐶"), p("log", "🪵"), p("frog", "🐸"), p("hog", "🐗")],
  op: [p("mop", "🧹"), p("top", "🔝"), p("hop", "🐇"), p("pop", "🎈")],
  ug: [p("bug", "🐛"), p("hug", "🤗"), p("mug", "☕"), p("rug", "🟫")],
  un: [p("sun", "☀️"), p("bun", "🍞"), p("run", "🏃"), p("fun", "🎉")],
  ub: [p("tub", "🛁"), p("cub", "🐻"), p("sub", "🥪"), p("rub", "👐")],
  ut: [p("nut", "🥜"), p("hut", "🛖"), p("cut", "✂️")],
  et: [p("net", "🥅"), p("jet", "✈️"), p("wet", "💦"), p("vet", "🩺"), p("pet", "🐕")],
  en: [p("hen", "🐔"), p("pen", "🖊️"), p("ten", "🔟")],
  ed: [p("bed", "🛏️"), p("red", "🟥"), p("sled", "🛷")],
  eg: [p("leg", "🦵"), p("peg", "📍"), p("egg", "🥚")],
};
/** Word families per vowel (teaching order). */
export const FAMILY_GROUPS = { a: ["at", "an", "ap", "ag"], i: ["ig", "in", "it", "ip"], o: ["ot", "og", "op"], u: ["ug", "un", "ub", "ut"], e: ["et", "en", "ed", "eg"] } as const;

/** Decodable non-picture words for "read it" practice. */
export const CVC_WORDS: Record<"a" | "i" | "o" | "u" | "e", string[]> = {
  a: ["sat", "mat", "pat", "tap", "sap", "nap", "pan", "tan", "fan", "ram", "jam", "dad", "bad", "had", "lap", "gas", "wax", "cab"],
  i: ["sit", "fit", "pit", "tip", "sip", "nip", "pin", "tin", "fin", "big", "dig", "him", "rib", "lid", "kid", "mix", "six", "win"],
  o: ["not", "dot", "cot", "hop", "top", "mop", "pop", "job", "rob", "box", "fox", "log", "jog", "nod", "pod", "mom", "rod", "sob"],
  u: ["sun", "fun", "run", "cup", "cut", "nut", "hut", "bug", "dug", "rug", "mud", "bud", "tub", "cub", "gum", "hum", "bus", "pup"],
  e: ["bed", "red", "fed", "leg", "beg", "peg", "get", "jet", "let", "net", "pet", "ten", "hen", "men", "web", "yes", "vet", "wet"],
};

/** Dolch sight words (public domain), split into teaching groups. */
export const DOLCH = {
  prePrimer: ["a", "and", "away", "big", "blue", "can", "come", "down", "find", "for", "funny", "go", "help", "here", "I", "in", "is", "it", "jump", "little", "look", "make", "me", "my", "not", "one", "play", "red", "run", "said", "see", "the", "three", "to", "two", "up", "we", "where", "yellow", "you"],
  primer: ["all", "am", "are", "at", "ate", "be", "black", "brown", "but", "came", "did", "do", "eat", "four", "get", "good", "have", "he", "into", "like", "must", "new", "no", "now", "on", "our", "out", "please", "pretty", "ran", "ride", "saw", "say", "she", "so", "soon", "that", "there", "they", "this", "too", "under", "want", "was", "well", "went", "what", "white", "who", "will", "with", "yes"],
  first: ["after", "again", "an", "any", "as", "ask", "by", "could", "every", "fly", "from", "give", "going", "had", "has", "her", "him", "his", "how", "just", "know", "let", "live", "may", "of", "old", "once", "open", "over", "put", "round", "some", "stop", "take", "thank", "them", "then", "think", "walk", "were", "when"],
  second: ["always", "around", "because", "been", "before", "best", "both", "buy", "call", "cold", "does", "don't", "fast", "first", "five", "found", "gave", "goes", "green", "its", "made", "many", "off", "or", "pull", "read", "right", "sing", "sit", "sleep", "tell", "their", "these", "those", "upon", "us", "use", "very", "wash", "which", "why", "wish", "work", "would", "write", "your"],
};

/** Digraph words with pictures. */
export const DIGRAPHS: Record<string, Pic[]> = {
  sh: [p("ship", "🚢"), p("fish", "🐟"), p("dish", "🍽️"), p("shop", "🏪"), p("shell", "🐚"), p("brush", "🪥"), p("shed", "🛖")],
  ch: [p("chick", "🐤"), p("chip", "🍟"), p("chin", "🧔"), p("chop", "🪓"), p("lunch", "🥪"), p("bench", "🪑")],
  th: [p("bath", "🛁"), p("moth", "🦋"), p("thumb", "👍"), p("teeth", "🦷"), p("math", "➗")],
  wh: [p("whale", "🐳"), p("whip", "🍦"), p("whisk", "🥄")],
  ck: [p("duck", "🦆"), p("sock", "🧦"), p("rock", "🪨"), p("clock", "🕰️"), p("truck", "🚚"), p("chick", "🐤")],
  ng: [p("ring", "💍"), p("king", "🤴"), p("sing", "🎤")],
};
export const BLENDS: Record<string, Pic[]> = {
  bl: [p("block", "🧱"), p("blue", "🔵"), p("blimp", "🎈")],
  cl: [p("clap", "👏"), p("clock", "🕰️"), p("clam", "🦪"), p("cloud", "☁️")],
  fl: [p("flag", "🚩"), p("flower", "🌸"), p("fly", "🪰"), p("flute", "🎶")],
  gr: [p("grapes", "🍇"), p("grass", "🌱"), p("grin", "😁")],
  tr: [p("tree", "🌳"), p("truck", "🚚"), p("train", "🚆"), p("trap", "🪤")],
  dr: [p("drum", "🥁"), p("dress", "👗"), p("drip", "💧")],
  cr: [p("crab", "🦀"), p("crown", "👑"), p("crib", "🛏️")],
  fr: [p("frog", "🐸"), p("fries", "🍟"), p("fruit", "🍎")],
  st: [p("star", "⭐"), p("stop", "🛑"), p("stamp", "📮"), p("stick", "🪵")],
  sn: [p("snake", "🐍"), p("snail", "🐌"), p("snow", "❄️")],
  sp: [p("spoon", "🥄"), p("spider", "🕷️"), p("spin", "🌀")],
  sw: [p("swim", "🏊"), p("swan", "🦢"), p("sweater", "🧥")],
  nd: [p("hand", "✋"), p("pond", "🦆"), p("sand", "🏖️")],
  mp: [p("lamp", "💡"), p("camp", "🏕️"), p("jump", "🦘")],
  nk: [p("sink", "🚰"), p("skunk", "🦨"), p("drink", "🥤")],
  st2: [p("vest", "🦺"), p("fist", "✊")],
};
export const MAGIC_E: Record<"a_e" | "i_e" | "o_e" | "u_e", Pic[]> = {
  a_e: [p("cake", "🎂"), p("game", "🎮"), p("snake", "🐍"), p("cave", "🕳️"), p("gate", "🚪"), p("plane", "✈️")],
  i_e: [p("kite", "🪁"), p("bike", "🚲"), p("five", "5️⃣"), p("nine", "9️⃣"), p("smile", "😊"), p("dime", "🪙")],
  o_e: [p("bone", "🦴"), p("rose", "🌹"), p("home", "🏠"), p("rope", "🪢"), p("nose", "👃"), p("cone", "🍦")],
  u_e: [p("cube", "🧊"), p("tube", "🧪"), p("flute", "🎶")],
};
/** Short-vowel ↔ magic-e pairs (cap → cape). */
export const E_PAIRS: [string, string][] = [["cap", "cape"], ["tap", "tape"], ["mad", "made"], ["can", "cane"], ["kit", "kite"], ["pin", "pine"], ["rid", "ride"], ["hop", "hope"], ["not", "note"], ["rob", "robe"], ["cub", "cube"], ["tub", "tube"], ["cut", "cute"]];
export const VOWEL_TEAMS: Record<string, Pic[]> = {
  ee: [p("bee", "🐝"), p("tree", "🌳"), p("feet", "🦶"), p("sheep", "🐑"), p("seed", "🌱"), p("queen", "👸")],
  ea: [p("leaf", "🍃"), p("peach", "🍑"), p("beach", "🏖️"), p("seal", "🦭"), p("tea", "🍵")],
  ai: [p("rain", "🌧️"), p("snail", "🐌"), p("train", "🚆"), p("nail", "💅"), p("tail", "🐕")],
  ay: [p("hay", "🌾"), p("tray", "🍱"), p("clay", "🏺"), p("play", "🧸")],
  oa: [p("boat", "⛵"), p("goat", "🐐"), p("coat", "🧥"), p("road", "🛣️"), p("soap", "🧼"), p("toast", "🍞")],
  ow: [p("snow", "❄️"), p("bowl", "🥣"), p("crow", "🐦"), p("bow", "🎀")],
  oo: [p("moon", "🌙"), p("spoon", "🥄"), p("boot", "🥾"), p("zoo", "🦁"), p("pool", "🏊"), p("broom", "🧹")],
  ou: [p("house", "🏠"), p("mouse", "🐭"), p("cloud", "☁️"), p("mouth", "👄")],
  ow2: [p("cow", "🐮"), p("owl", "🦉"), p("crown", "👑"), p("town", "🏘️"), p("clown", "🤡")],
  oi: [p("coin", "🪙"), p("oil", "🛢️"), p("soil", "🌱"), p("point", "👉")],
  oy: [p("boy", "👦"), p("toy", "🧸"), p("oyster", "🦪")],
};
export const BOSSY_R: Record<string, Pic[]> = {
  ar: [p("car", "🚗"), p("star", "⭐"), p("shark", "🦈"), p("barn", "🏚️"), p("jar", "🍯"), p("yarn", "🧶")],
  or: [p("corn", "🌽"), p("fork", "🍴"), p("horse", "🐴"), p("storm", "⛈️"), p("horn", "📯")],
  er: [p("tiger", "🐯"), p("letter", "✉️"), p("ladder", "🪜"), p("flower", "🌸")],
  ir: [p("bird", "🐦"), p("girl", "👧"), p("shirt", "👕"), p("skirt", "👗")],
  ur: [p("turtle", "🐢"), p("nurse", "🧑‍⚕️"), p("purse", "👛"), p("burger", "🍔")],
};
export const ENDINGS: { base: string; ing: string; ed: string; s: string }[] = [
  { base: "jump", ing: "jumping", ed: "jumped", s: "jumps" },
  { base: "play", ing: "playing", ed: "played", s: "plays" },
  { base: "help", ing: "helping", ed: "helped", s: "helps" },
  { base: "look", ing: "looking", ed: "looked", s: "looks" },
  { base: "kick", ing: "kicking", ed: "kicked", s: "kicks" },
  { base: "fish", ing: "fishing", ed: "fished", s: "fishes" },
  { base: "rest", ing: "resting", ed: "rested", s: "rests" },
  { base: "pack", ing: "packing", ed: "packed", s: "packs" },
  { base: "run", ing: "running", ed: "ran", s: "runs" },
  { base: "hop", ing: "hopping", ed: "hopped", s: "hops" },
  { base: "bake", ing: "baking", ed: "baked", s: "bakes" },
  { base: "smile", ing: "smiling", ed: "smiled", s: "smiles" },
];
export const COMPOUNDS: [string, string, string, string][] = [
  ["sun", "flower", "sunflower", "🌻"], ["rain", "bow", "rainbow", "🌈"], ["star", "fish", "starfish", "⭐"], ["cup", "cake", "cupcake", "🧁"], ["foot", "ball", "football", "🏈"],
  ["snow", "man", "snowman", "⛄"], ["butter", "fly", "butterfly", "🦋"], ["pop", "corn", "popcorn", "🍿"], ["tooth", "brush", "toothbrush", "🪥"], ["cow", "boy", "cowboy", "🤠"],
  ["bed", "room", "bedroom", "🛏️"], ["fire", "truck", "firetruck", "🚒"], ["pan", "cake", "pancake", "🥞"], ["sail", "boat", "sailboat", "⛵"], ["light", "house", "lighthouse", "🗼"],
  ["hand", "bag", "handbag", "👜"], ["back", "pack", "backpack", "🎒"], ["water", "melon", "watermelon", "🍉"],
];
export const CONTRACTIONS: [string, string][] = [["do not", "don't"], ["can not", "can't"], ["is not", "isn't"], ["I am", "I'm"], ["it is", "it's"], ["you are", "you're"], ["we are", "we're"], ["they are", "they're"], ["I will", "I'll"], ["she is", "she's"], ["did not", "didn't"], ["was not", "wasn't"], ["let us", "let's"], ["I have", "I've"], ["would not", "wouldn't"]];
export const PREFIXES: { pre: string; means: string; words: [string, string][] }[] = [
  { pre: "un", means: "not", words: [["unhappy", "not happy"], ["unlock", "the opposite of lock"], ["unkind", "not kind"], ["unsafe", "not safe"], ["untie", "the opposite of tie"]] },
  { pre: "re", means: "again", words: [["redo", "do again"], ["replay", "play again"], ["refill", "fill again"], ["reread", "read again"], ["rebuild", "build again"]] },
  { pre: "pre", means: "before", words: [["preview", "see before"], ["preheat", "heat before"], ["pregame", "before the game"], ["prepay", "pay before"]] },
  { pre: "dis", means: "not / opposite", words: [["dislike", "not like"], ["disagree", "not agree"], ["disappear", "the opposite of appear"], ["dishonest", "not honest"]] },
  { pre: "mis", means: "wrongly", words: [["misspell", "spell wrongly"], ["misplace", "put in the wrong place"], ["misread", "read wrongly"], ["misbehave", "behave badly"]] },
  { pre: "non", means: "not", words: [["nonstop", "without stopping"], ["nonfiction", "true, not made up"], ["nonsense", "words that don't make sense"]] },
  { pre: "over", means: "too much", words: [["overcook", "cook too much"], ["oversleep", "sleep too long"], ["overflow", "flow over the top"]] },
  { pre: "sub", means: "under", words: [["submarine", "a boat that goes under the sea"], ["subway", "a train under the ground"], ["subtract", "take away"]] },
];
export const SUFFIXES: { suf: string; means: string; words: [string, string][] }[] = [
  { suf: "ful", means: "full of", words: [["helpful", "full of help"], ["careful", "full of care"], ["joyful", "full of joy"], ["colorful", "full of color"]] },
  { suf: "less", means: "without", words: [["fearless", "without fear"], ["helpless", "without help"], ["careless", "without care"], ["endless", "without an end"]] },
  { suf: "er", means: "one who / more", words: [["teacher", "one who teaches"], ["painter", "one who paints"], ["faster", "more fast"], ["taller", "more tall"]] },
  { suf: "est", means: "the most", words: [["fastest", "the most fast"], ["biggest", "the most big"], ["smallest", "the most small"]] },
  { suf: "ly", means: "in a way", words: [["quickly", "in a quick way"], ["softly", "in a soft way"], ["kindly", "in a kind way"], ["loudly", "in a loud way"]] },
  { suf: "able", means: "can be", words: [["washable", "can be washed"], ["readable", "can be read"], ["breakable", "can be broken"], ["comfortable", "can be comfy"]] },
  { suf: "ness", means: "state of being", words: [["kindness", "being kind"], ["darkness", "being dark"], ["happiness", "being happy"], ["sadness", "being sad"]] },
  { suf: "ment", means: "the act or result of", words: [["enjoyment", "the act of enjoying"], ["payment", "the act of paying"], ["movement", "the act of moving"], ["agreement", "the result of agreeing"]] },
];
export const SYNONYMS: [string, string][] = [["big", "large"], ["small", "tiny"], ["happy", "glad"], ["sad", "unhappy"], ["fast", "quick"], ["begin", "start"], ["shout", "yell"], ["smart", "clever"], ["scared", "afraid"], ["shut", "close"], ["jump", "leap"], ["look", "see"], ["pretty", "lovely"], ["angry", "mad"], ["tired", "sleepy"], ["easy", "simple"], ["huge", "giant"], ["giggle", "laugh"], ["damp", "wet"], ["gift", "present"]];
export const ANTONYMS: [string, string][] = [["hot", "cold"], ["big", "small"], ["up", "down"], ["happy", "sad"], ["fast", "slow"], ["open", "closed"], ["day", "night"], ["wet", "dry"], ["full", "empty"], ["loud", "quiet"], ["early", "late"], ["hard", "soft"], ["light", "dark"], ["young", "old"], ["first", "last"], ["win", "lose"], ["push", "pull"], ["above", "below"], ["brave", "afraid"], ["remember", "forget"]];
export const HOMOPHONES: { pair: string[]; sentences: [string, string][] }[] = [
  { pair: ["to", "two", "too"], sentences: [["I want ___ go home.", "to"], ["I have ___ cats.", "two"], ["Can I come ___?", "too"]] },
  { pair: ["there", "their", "they're"], sentences: [["Put the box over ___.", "there"], ["The kids love ___ dog.", "their"], ["___ going to the park.", "they're"]] },
  { pair: ["see", "sea"], sentences: [["I can ___ the bird.", "see"], ["Fish swim in the ___.", "sea"]] },
  { pair: ["blue", "blew"], sentences: [["The sky is ___.", "blue"], ["The wind ___ hard.", "blew"]] },
  { pair: ["right", "write"], sentences: [["Turn ___ at the corner.", "right"], ["Please ___ your name.", "write"]] },
  { pair: ["eight", "ate"], sentences: [["I ___ a big lunch.", "ate"], ["A spider has ___ legs.", "eight"]] },
  { pair: ["one", "won"], sentences: [["Our team ___ the game!", "won"], ["I have ___ brother.", "one"]] },
  { pair: ["knew", "new"], sentences: [["I got ___ shoes.", "new"], ["She ___ the answer.", "knew"]] },
  { pair: ["hear", "here"], sentences: [["Come over ___.", "here"], ["I can ___ music.", "hear"]] },
  { pair: ["flower", "flour"], sentences: [["We need ___ to bake bread.", "flour"], ["A ___ grew in the garden.", "flower"]] },
];
export const ROOTS: { root: string; means: string; words: string[] }[] = [
  { root: "tele", means: "far", words: ["telephone", "telescope", "television"] },
  { root: "graph", means: "write", words: ["autograph", "paragraph", "photograph"] },
  { root: "port", means: "carry", words: ["transport", "portable", "import"] },
  { root: "rupt", means: "break", words: ["erupt", "interrupt", "disrupt"] },
  { root: "struct", means: "build", words: ["construct", "structure", "instruct"] },
  { root: "spect", means: "look", words: ["inspect", "spectator", "respect"] },
  { root: "dict", means: "say", words: ["predict", "dictionary", "contradict"] },
  { root: "aud", means: "hear", words: ["audio", "audience", "audible"] },
  { root: "vis", means: "see", words: ["visible", "vision", "visit"] },
  { root: "phon", means: "sound", words: ["phone", "microphone", "symphony"] },
  { root: "bio", means: "life", words: ["biology", "biography", "biome"] },
  { root: "geo", means: "earth", words: ["geography", "geology", "geode"] },
  { root: "micro", means: "small", words: ["microscope", "microphone", "microwave"] },
  { root: "scope", means: "see / look at", words: ["telescope", "microscope", "periscope"] },
  { root: "therm", means: "heat", words: ["thermometer", "thermos", "thermal"] },
  { root: "auto", means: "self", words: ["automatic", "autograph", "autopilot"] },
  { root: "aqua", means: "water", words: ["aquarium", "aquatic", "aqueduct"] },
  { root: "astro", means: "star", words: ["astronaut", "astronomy", "asteroid"] },
];
export const IDIOMS: [string, string][] = [
  ["It's raining cats and dogs.", "It's raining very hard."],
  ["That's a piece of cake.", "That's very easy."],
  ["I'm all ears.", "I'm listening carefully."],
  ["Break a leg!", "Good luck!"],
  ["Hold your horses.", "Wait a moment."],
  ["You hit the nail on the head.", "You got it exactly right."],
  ["It cost an arm and a leg.", "It was very expensive."],
  ["Let the cat out of the bag.", "Tell a secret."],
  ["I'm feeling under the weather.", "I'm feeling sick."],
  ["Don't cry over spilled milk.", "Don't be upset about something you can't change."],
  ["She has a heart of gold.", "She is very kind."],
  ["We're in the same boat.", "We have the same problem."],
  ["Time flies.", "Time goes by quickly."],
  ["Bite off more than you can chew.", "Try to do too much."],
];
export const SIMILES_METAPHORS: { text: string; kind: "simile" | "metaphor"; means: string }[] = [
  { text: "She is as busy as a bee.", kind: "simile", means: "She is very busy." },
  { text: "The baby is as light as a feather.", kind: "simile", means: "The baby is very light." },
  { text: "He ran like the wind.", kind: "simile", means: "He ran very fast." },
  { text: "The stars were like diamonds.", kind: "simile", means: "The stars sparkled." },
  { text: "My brother is a couch potato.", kind: "metaphor", means: "My brother sits around a lot." },
  { text: "The classroom was a zoo.", kind: "metaphor", means: "The classroom was wild and noisy." },
  { text: "Her voice is music to my ears.", kind: "metaphor", means: "Her voice is lovely to hear." },
  { text: "The snow is a white blanket.", kind: "metaphor", means: "The snow covers everything." },
  { text: "He is as brave as a lion.", kind: "simile", means: "He is very brave." },
  { text: "Life is a roller coaster.", kind: "metaphor", means: "Life has ups and downs." },
  { text: "The pillow was as soft as a cloud.", kind: "simile", means: "The pillow was very soft." },
  { text: "The sun was a golden coin.", kind: "metaphor", means: "The sun was round and shining." },
];
export const PARTS_OF_SPEECH: Record<"noun" | "verb" | "adjective" | "adverb", string[]> = {
  noun: ["dog", "school", "teacher", "apple", "city", "ocean", "pencil", "friend", "mountain", "kitchen", "boat", "garden"],
  verb: ["run", "jump", "eat", "swim", "write", "sing", "climb", "laugh", "build", "read", "paint", "sail"],
  adjective: ["happy", "tall", "blue", "noisy", "soft", "brave", "tiny", "shiny", "cold", "funny", "huge", "gentle"],
  adverb: ["quickly", "slowly", "loudly", "quietly", "happily", "carefully", "softly", "bravely", "gently", "nearly"],
};
/** Sentences with a capitalization/punctuation fix (the first is correct). */
export const GRAMMAR_SETS: string[][] = [
  ["My dog likes to play.", "my dog likes to play.", "My dog likes to play"],
  ["Where is my hat?", "Where is my hat.", "where is my hat?"],
  ["We went to Florida in July.", "We went to florida in july.", "we went to Florida in July."],
  ["Wow, that is a big fish!", "wow, that is a big fish", "Wow that is a big fish."],
  ["Sam and Mia ate lunch.", "sam and mia ate lunch.", "Sam and mia ate lunch"],
  ["Is it time for bed?", "Is it time for bed.", "is it time for bed?"],
  ["I met Dr. Lee on Monday.", "I met dr. lee on monday.", "i met Dr. Lee on Monday."],
  ["\"Let's go!\" said Max.", "\"lets go!\" said max.", "Let's go! said Max"],
  ["The cat's toy is under the bed.", "The cats' toy is under the bed", "the cat's toy is under the bed."],
  ["We need eggs, milk, and bread.", "We need eggs milk and bread.", "we need eggs, milk, and bread"],
];
export const FACT_OPINION: { text: string; fact: boolean }[] = [
  { text: "Dogs have four legs.", fact: true }, { text: "Dogs are the best pets.", fact: false }, { text: "The sun rises in the east.", fact: true }, { text: "Sunsets are beautiful.", fact: false },
  { text: "Water freezes at 32 degrees Fahrenheit.", fact: true }, { text: "Winter is the most fun season.", fact: false }, { text: "A spider has eight legs.", fact: true }, { text: "Spiders are scary.", fact: false },
  { text: "There are seven days in a week.", fact: true }, { text: "Pizza is the yummiest food.", fact: false }, { text: "The Pacific is an ocean.", fact: true }, { text: "Reading is boring.", fact: false },
  { text: "Bees make honey.", fact: true }, { text: "Blue is the prettiest color.", fact: false },
];
/** Rhyme families with pictures, for "which one rhymes?". */
export const RHYME_SETS: Pic[][] = [
  [p("cat", "🐱"), p("hat", "🎩"), p("bat", "🦇")], [p("dog", "🐶"), p("log", "🪵"), p("frog", "🐸")], [p("sun", "☀️"), p("bun", "🍞"), p("run", "🏃")],
  [p("bug", "🐛"), p("hug", "🤗"), p("mug", "☕")], [p("hen", "🐔"), p("pen", "🖊️"), p("ten", "🔟")], [p("cake", "🎂"), p("snake", "🐍"), p("rake", "🧹")],
  [p("bee", "🐝"), p("tree", "🌳"), p("key", "🔑")], [p("boat", "⛵"), p("goat", "🐐"), p("coat", "🧥")], [p("car", "🚗"), p("star", "⭐"), p("jar", "🍯")],
  [p("fox", "🦊"), p("box", "📦"), p("socks", "🧦")], [p("moon", "🌙"), p("spoon", "🥄"), p("balloon", "🎈")], [p("mouse", "🐭"), p("house", "🏠")],
  [p("king", "🤴"), p("ring", "💍")], [p("bear", "🐻"), p("chair", "🪑"), p("pear", "🍐")], [p("light", "💡"), p("kite", "🪁"), p("night", "🌙")],
];
/** Syllable counts with pictures. */
export const SYLLABLES: [string, string, number][] = [
  ["cat", "🐱", 1], ["dog", "🐶", 1], ["sun", "☀️", 1], ["fish", "🐟", 1], ["tree", "🌳", 1], ["apple", "🍎", 2], ["tiger", "🐯", 2], ["rabbit", "🐰", 2],
  ["pencil", "✏️", 2], ["monkey", "🐵", 2], ["rocket", "🚀", 2], ["banana", "🍌", 3], ["butterfly", "🦋", 3], ["elephant", "🐘", 3], ["dinosaur", "🦕", 3],
  ["kangaroo", "🦘", 3], ["octopus", "🐙", 3], ["watermelon", "🍉", 4], ["caterpillar", "🐛", 4], ["helicopter", "🚁", 4],
];
