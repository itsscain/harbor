import type { Activity, Option } from "./types";
import { pick, pickN, shuffle, type Rng, type Topic } from "./gen";
import type { Story } from "./stories";

// Character, taught the way it actually sticks: real situations, a choice — and then you SEE what
// happens next. "Rewind" scenes play out the consequence of a choice (a trust bridge loses a plank,
// a friend goes quiet), then let the child rewind time and choose again; Truth Detective cases
// train them to spot deception (half-truths, blame, "technically true"); the Repair Kit builds a
// real apology piece by piece; dilemmas ask for the best REASON, not just the right answer; and
// reflection questions with no wrong answer connect it all to their own life. Perspective-taking,
// consequence thinking, practiced scripts and self-reflection are the moves social-emotional
// learning research keeps finding actually change behavior.
//
// These factories are shared by Captain's Code ("h:" skills) and the Lighthouse course ("f:").

export type Ns = "h" | "f";
const voice = (on: boolean, ...t: string[]) => (on ? t : undefined);

// ── Scenarios (a story, a choice, and why) ─────────────────────────────────────────────────
export type Scn = { s: string; e: string; q: string; a: string; w: [string, string]; why: string; wwhy: [string, string] };
/** A scenario: story, question, the right choice, two less-good choices, and why for each. */
export const scn = (s: string, e: string, q: string, a: string, w: [string, string], why: string, wwhy: [string, string]): Scn => ({ s, e, q, a, w, why, wwhy });

function scenarioItem(r: Rng, x: Scn, skill: string, voiced: boolean): Activity {
  const options: Option[] = shuffle(r, [
    { id: "a", text: x.a, say: voiced ? [x.a] : undefined, why: x.why },
    { id: "w0", text: x.w[0], say: voiced ? [x.w[0]] : undefined, why: x.wwhy[0] },
    { id: "w1", text: x.w[1], say: voiced ? [x.w[1]] : undefined, why: x.wwhy[1] },
  ]);
  return { kind: "scenario", scene: { type: "scene", emoji: x.e }, story: x.s, say: voiced ? [x.s] : undefined, question: x.q, askSay: voiced ? [x.q] : undefined, options, answer: "a", skill };
}
export const scenarioT = (key: string, bank: Scn[], voiced: boolean, ns: Ns = "h"): Topic => ({ key: `scn-${key}`, gen: (r) => scenarioItem(r, pick(r, bank), `${ns}:${key}`, voiced) });

// ── Rewind: choose, watch what happens, rewind and choose again ────────────────────────────
/** a / each of w: [the choice, what happens next, a picture of what happens]. */
export type Rw = { s: string; e: string; q: string; a: [string, string, string]; w: [string, string, string][]; why: string };
export const rw = (s: string, e: string, q: string, a: [string, string, string], w: [string, string, string][], why: string): Rw => ({ s, e, q, a, w, why });

export function rewindItem(r: Rng, x: Rw, skill: string, voiced: boolean, trust = false): Activity {
  const options: Option[] = shuffle(r, [
    { id: "a", text: x.a[0], say: voice(voiced, x.a[0]), why: x.why, then: { text: x.a[1], emoji: x.a[2], trust: trust ? 1 : undefined } },
    ...x.w.map(([text, then, emoji], i) => ({ id: `w${i}`, text, say: voice(voiced, text), then: { text: then, emoji, trust: trust ? -1 : undefined } })),
  ]);
  return { kind: "scenario", scene: { type: "scene", emoji: x.e }, story: x.s, say: voice(voiced, x.s), question: x.q, askSay: voice(voiced, x.q), options, answer: "a", skill };
}
export const rewindT = (key: string, bank: Rw[], voiced: boolean, o: { ns?: Ns; trust?: boolean } = {}): Topic => ({
  key: `rw-${key}`,
  gen: (r) => rewindItem(r, pick(r, bank), `${o.ns ?? "h"}:${key}`, voiced, o.trust),
});

// ── Sort ─────────────────────────────────────────────────────────────────────────────────
export type SortBank = { prompt: string; bins: [string, string, string?, string?]; items: [string, 0 | 1, string?][] };
export const sortT = (key: string, b: SortBank, voiced: boolean, n = 6, ns: Ns = "h"): Topic => ({
  key: `sort-${key}`,
  gen: (r) => {
    const good = pickN(r, b.items.filter((x) => x[1] === 1), n / 2);
    const bad = pickN(r, b.items.filter((x) => x[1] === 0), n / 2);
    return {
      kind: "sort",
      prompt: b.prompt,
      say: voiced ? [b.prompt] : undefined,
      bins: [
        { id: "1", label: b.bins[0], emoji: b.bins[2] },
        { id: "0", label: b.bins[1], emoji: b.bins[3] },
      ],
      items: shuffle(r, [...good, ...bad]).map(([text, bin, emoji]) => ({ id: text, text, emoji, bin: String(bin), say: voiced ? [text] : undefined })),
      skill: `${ns}:${key}`,
    };
  },
});
/** Sort into three or four bins ("Praise · Sorry · Thanks · Please"). */
export type SortMany = { prompt: string; bins: { id: string; label: string; emoji?: string }[]; items: [string, string, string?][] };
export const sortManyT = (key: string, b: SortMany, voiced: boolean, perBin = 2, ns: Ns = "h"): Topic => ({
  key: `sortm-${key}`,
  gen: (r) => ({
    kind: "sort",
    prompt: b.prompt,
    say: voice(voiced, b.prompt),
    bins: b.bins,
    items: shuffle(r, b.bins.flatMap((bin) => pickN(r, b.items.filter((x) => x[1] === bin.id), perBin))).map(([text, bin, emoji]) => ({ id: text, text, emoji, bin, say: voice(voiced, text) })),
    skill: `${ns}:${key}`,
  }),
});

// ── Choices with a reason ────────────────────────────────────────────────────────────────
/** "Which is the polite / honest / respectful way?" */
export type Pol = { q: string; e: string; a: string; w: [string, string]; why: string };
export const politeT = (key: string, bank: Pol[], voiced: boolean, ns: Ns = "h"): Topic => ({
  key: `polite-${key}`,
  gen: (r) => {
    const x = pick(r, bank);
    return {
      kind: "choice",
      prompt: x.q,
      say: voiced ? [x.q] : undefined,
      visual: { type: "scene", emoji: x.e },
      options: shuffle(r, [x.a, ...x.w]).map((t) => ({ id: t, text: t, say: voiced ? [t] : undefined })),
      answer: x.a,
      layout: "list",
      readOptions: voiced,
      skill: `${ns}:${key}`,
      why: x.why,
    };
  },
});
export const orderT = (key: string, prompt: string, steps: [string, string][], voiced: boolean, ns: Ns = "h"): Topic => ({
  key: `order-${key}`,
  gen: () => ({ kind: "order", prompt, say: voiced ? [prompt] : undefined, items: steps.map(([text, emoji]) => ({ id: text, text, emoji, say: voiced ? [text] : undefined })), direction: "column", skill: `${ns}:${key}` }),
});
/** Order a long list a window at a time (still in order). */
export const orderWindowT = (key: string, prompt: string, steps: [string, string][], n: number, voiced: boolean, ns: Ns = "h"): Topic => ({
  key: `orderw-${key}`,
  gen: (r) => {
    const at = steps.length <= n ? 0 : Math.floor(r() * (steps.length - n + 1));
    return { kind: "order", prompt, say: voice(voiced, prompt), items: steps.slice(at, at + n).map(([text, emoji]) => ({ id: text, text, emoji, say: voice(voiced, text) })), direction: "column", skill: `${ns}:${key}` };
  },
});
export type MatchBank = [string, string][];
export const matchT = (key: string, prompt: string, pairs: MatchBank, voiced: boolean, ns: Ns = "h", n = 4): Topic => ({
  key: `match-${key}`,
  gen: (r) => ({ kind: "match", mode: "columns", prompt, say: voiced ? [prompt] : undefined, pairs: pickN(r, pairs, n).map(([a, b]) => ({ a: { id: a, text: a, say: voiced ? [a] : undefined }, b: { id: b, text: b, say: voiced ? [b] : undefined } })), skill: `${ns}:${key}` }),
});

// ── Truth Detective ──────────────────────────────────────────────────────────────────────
/** A short case: lines (with a picture), which line(s) hide the dishonest move, and why. */
export type Case = { title: string; e: string; lines: [string, string?][]; answer: number[]; why: string };
export const kase = (title: string, e: string, lines: [string, string?][], answer: number[], why: string): Case => ({ title, e, lines, answer, why });
export const spotT = (key: string, prompt: string, bank: Case[], voiced: boolean, ns: Ns = "h"): Topic => ({
  key: `spot-${key}`,
  gen: (r) => {
    const c = pick(r, bank);
    const p = c.answer.length > 1 ? `${prompt} (find ${c.answer.length})` : prompt;
    return { kind: "spot", prompt: p, title: c.title, scene: c.e, lines: c.lines.map(([text, emoji]) => ({ text, emoji })), answer: c.answer, why: c.why, say: voice(voiced, p), skill: `${ns}:${key}` };
  },
});

// ── Repair Kit / Respect Builder ─────────────────────────────────────────────────────────
export type Kit = { e: string; story: string; slots: [label: string, right: string, wrong: [string, string], why: string][] };
export const slotsT = (key: string, prompt: string, bank: Kit[], voiced: boolean, ns: Ns = "h"): Topic => ({
  key: `slots-${key}`,
  gen: (r) => {
    const k = pick(r, bank);
    return {
      kind: "slots",
      prompt,
      scene: k.e,
      story: k.story,
      say: voice(voiced, k.story, "~", prompt),
      slots: k.slots.map(([label, right, wrong, why]) => ({ label, options: shuffle(r, [right, ...wrong]), answer: right, why })),
      skill: `${ns}:${key}`,
    };
  },
});

// ── Think about it (no wrong answers) ────────────────────────────────────────────────────
export type Reflect = { q: string; e: string; options: [text: string, emoji: string, reply: string][]; multi?: boolean; closing?: string };
export const reflectT = (key: string, bank: Reflect[], voiced: boolean, ns: Ns = "h"): Topic => ({
  key: `reflect-${key}`,
  gen: (r) => {
    const x = pick(r, bank);
    return {
      kind: "reflect",
      prompt: x.q,
      scene: x.e,
      say: voice(voiced, x.q),
      options: x.options.map(([text, emoji, reply], i) => ({ id: String(i), text, emoji, reply })),
      multi: x.multi,
      closing: x.closing,
      skill: `${ns}:${key}`,
    };
  },
});

// ════════════════════════════════════════════════════════════════════════════════════════════
// Captain's Code — honesty, respect and attitude (for every family; no religious content)
// ════════════════════════════════════════════════════════════════════════════════════════════

// ── Little sailors: true, pretend, or a fib? ─────────────────────────────────────────────
export const PRETEND: Pol[] = [
  { q: "Lily puts on a crown and says, “I'm a princess!” while everyone plays pretend. Is that a fib?", e: "👑👧🎭", a: "No — it's pretend, and everyone knows it's a game", w: ["Yes, it's a big fib", "Yes, she should stop playing"], why: "Pretend play is fine when everyone knows it's a game. A fib is trying to make someone believe something that isn't true." },
  { q: "Leo tells Mom he cleaned his room, but he didn't. Is that true?", e: "🧸🧹👦", a: "No — that's a fib", w: ["Yes, it's true", "It's just pretend"], why: "Saying you did something you didn't do is a fib — it tricks Mom." },
  { q: "Jack says the couch is a pirate ship while playing with his sister. Is that a lie?", e: "🛋️🏴‍☠️👦", a: "No — it's a pretend game they both know", w: ["Yes, couches aren't ships", "Yes, he's tricking her"], why: "When everyone knows it's a game, it's imagination — not a lie." },
  { q: "Ella tells Dad she fed the fish, but she forgot. Is that okay?", e: "🐟👨👧", a: "No — that's not true, and the fish is still hungry", w: ["Yes, it's fine", "Yes, it's pretend"], why: "A fib can hurt — the fish still needs food! It's better to say, “I forgot.”" },
  { q: "Noah tells his teacher the dog ate his drawing. Really, he forgot it at home. What is that?", e: "🐶📄👦", a: "A fib", w: ["Pretend play", "The truth"], why: "He's trying to make the teacher believe something that didn't happen. That's a fib." },
  { q: "Max roars, “I'm a T. rex!” and his friends roar back, playing dinosaurs. Is Max lying?", e: "🦖👦👧", a: "No — they're all playing pretend", w: ["Yes, he's not a T. rex", "Yes, roaring is lying"], why: "Everyone is in on the game. That's pretend, not a lie!" },
];

export const TRUTH_LITTLE: Rw[] = [
  rw("Leo was playing ball in the house — and CRASH! Mom's lamp broke. Mom asks, “What happened?”", "⚽💥🛋️", "What should Leo say?", ["“I was playing ball and broke it. I'm sorry.”", "Mom is sad about the lamp, but she hugs Leo. “Thank you for telling me the truth. Let's clean up together.”", "🤗"], [["“The cat did it!”", "Mom finds the ball next to the lamp. Now she's sad about the lamp AND sad that Leo didn't tell the truth.", "😞"], ["Hide behind the couch.", "Mom finds Leo hiding. Hiding made it worse — and Leo felt worried the whole time.", "🙈"]], "Telling the truth is brave. It makes things right faster."),
  rw("Mia ate a cookie before dinner when no one was looking. Dad asks, “Did you eat a cookie?”", "🍪👀👧", "What should Mia say?", ["“Yes. I'm sorry I didn't ask.”", "Dad says, “Thank you for being honest. Next time, ask first.” Mia feels light and happy inside.", "😊"], [["“No!” (with crumbs on her face)", "Dad sees the crumbs. Now he knows Mia said something that wasn't true.", "🍪"], ["“My brother ate it.”", "Her brother gets in trouble for something he didn't do. That's not fair — and Mia feels bad inside.", "😢"]], "Honest words keep trust strong — even about small things."),
  rw("Sam drew on the wall with a marker. His sister asks, “Who drew on the wall?”", "🖍️🧱👦", "What should Sam say?", ["“I did. I'll help clean it.”", "Sam and Mom scrub the wall together. Mom smiles: “I'm proud of you for telling the truth.”", "🧽"], [["“It was already there.”", "Mom knows it wasn't. Next time Sam says something, Mom might wonder if it's true.", "🤔"], ["Say nothing and walk away.", "The wall still needs cleaning, and Sam has a heavy, worried feeling.", "😟"]], "When we do something wrong, telling the truth and helping fix it is the best choice."),
  rw("Ava's teacher asks, “Did you put away your crayons?” Ava forgot.", "🖍️👩‍🏫👧", "What should Ava say?", ["“Not yet! I'll do it now.”", "Ava puts them away, and her teacher says, “Thank you for being honest!”", "⭐"], [["“Yes!” (but she didn't)", "The teacher sees the crayons still out. Oops — now it's a fib.", "🖍️"], ["Blame her friend.", "Her friend is sad and confused. That wasn't kind or true.", "😢"]], "Saying “not yet” is honest — and then you can fix it!"),
  rw("Ben broke his sister's toy by accident.", "🧸💔👦", "What should Ben do?", ["Tell her and say sorry.", "His sister is sad, but she forgives him. They fix it with tape together.", "🤝"], [["Hide the toy under the bed.", "She looks everywhere and cries. When she finds it, she's even sadder.", "😭"], ["Say, “It broke by itself.”", "His sister knows toys don't break by themselves. Now it's hard to believe Ben.", "🤨"]], "Accidents happen! Telling the truth and saying sorry makes it better."),
  rw("Grandma asks, “Did you brush your teeth?” Zoe didn't yet.", "🪥👵👧", "What should Zoe say?", ["“Not yet — I'll go brush now!”", "Zoe brushes, and Grandma gives her a big smile.", "😁"], [["“Yep!”", "Grandma checks the toothbrush — it's dry. Uh-oh.", "🪥"], ["Run and hide.", "Hiding doesn't brush teeth! Grandma has to come find her.", "🙈"]], "Being honest — even about little things — helps people trust you."),
  rw("Max peeked while counting in hide-and-seek, then found everyone super fast.", "🙈👀👦", "What should Max do?", ["Say, “I peeked. Let's play again fair.”", "His friends cheer. Playing fair is more fun for everyone!", "🎉"], [["Keep quiet and brag.", "His friend saw him peek. Now nobody wants to play with Max.", "😕"], ["Say, “I never peek.”", "That's not true — and his friends feel tricked.", "😠"]], "Fair play and honest words make games fun."),
];

export const HONEST_SORT_LITTLE: SortBank = { prompt: "Honest or not honest?", bins: ["Honest", "Not honest", "😊", "🙊"], items: [["Telling Mom you spilled milk", 1, "🥛"], ["Saying “I did it”", 1, "🙋"], ["Saying “not yet” when you're not done", 1, "⏳"], ["Giving back a toy you found", 1, "🧸"], ["Saying sorry when you break something", 1, "🙏"], ["Saying “I didn't” when you did", 0, "🤥"], ["Hiding a broken toy", 0, "🙈"], ["Blaming your sister", 0, "👉"], ["Keeping a toy that's not yours", 0, "🎒"], ["Saying you cleaned up when you didn't", 0, "🧹"]] };

export const FIB_CASES: Case[] = [
  kase("Carrot Time", "🥕🐶", [["Ava ate her sandwich.", "🥪"], ["She slipped her carrots to the dog under the table.", "🐶"], ["She told Mom, “I ate all my carrots!”", "🗣️"]], [2], "The dog ate the carrots! Saying she ate them is a fib."),
  kase("Tumbled Tower", "🧱💥", [["Leo played with blocks.", "🧱"], ["He knocked over his brother's tower.", "💥"], ["He said, “It fell by itself!”", "🙊"]], [2], "Towers don't fall by themselves. Leo should tell the truth and help rebuild."),
  kase("Wash Up", "🧼💧", [["Mom said, “Wash your hands with soap.”", "🧼"], ["Max just splashed water on his fingers.", "💧"], ["He told Mom, “I used soap!”", "🗣️"]], [2], "Max didn't use soap, so saying he did is a fib."),
  kase("Sleepy Time", "🛏️📱", [["Zoe was supposed to be asleep.", "🛏️"], ["She played with the tablet under her blanket.", "📱"], ["When Dad came in, she said, “I was sleeping!”", "😴"]], [2], "She wasn't sleeping — that's a fib. Playing under the blanket was sneaky too."),
  kase("Paint Spill", "🎨🛋️", [["Sam painted a picture.", "🎨"], ["He spilled paint on the rug.", "🟥"], ["He hid the spot with a pillow so no one would see.", "🛋️"]], [2], "Hiding a mistake is a kind of fib. Telling a grown-up is the honest way."),
  kase("Snack Attack", "🍪🏺", [["Grandpa said, “One cookie each.”", "🍪"], ["Lily took two cookies.", "✌️"], ["She told her cousin, “Grandpa said I could have two.”", "🗣️"]], [2], "Grandpa never said that. Lily made it up to get more."),
];

// ── Little sailors: obey with a happy heart ──────────────────────────────────────────────
export const HAPPY_STEPS: [string, string][] = [["Listen", "👂"], ["Say “Okay!”", "🙂"], ["Do it right away", "🏃"], ["Finish all the way", "✅"]];
export const HAPPY_HEART: Rw[] = [
  rw("Dad says, “Time for your bath!” Eli is building with blocks.", "🛁🧱🧒", "What should Eli do?", ["Say “Okay, Dad!” and go.", "Bath time is quick and fun — and there's still time for a story after!", "📚"], [["Whine, “Noooo!”", "Dad has to ask three times. Now there's no time for a story.", "😩"], ["Keep building and pretend not to hear.", "Dad turns off the light and carries Eli to the bath. Eli feels grumpy.", "😤"]], "Obeying right away with a happy heart makes everyone's day better."),
  rw("Mom says, “Please put your shoes away.”", "👟🏠👧", "What should Nora do?", ["Put them away right now — both shoes!", "The hallway is tidy, and Mom says, “Thank you, helper!”", "😊"], [["Put away one shoe and leave the other.", "Mom trips on the other shoe. All the way means finishing!", "🤕"], ["Stomp and grumble.", "The shoes get put away, but everyone feels grumpy.", "😠"]], "Right away, all the way, with a happy heart!"),
  rw("The teacher says, “Clean-up time!” Max is still coloring.", "🖍️🧹👦", "What should Max do?", ["Put the crayons away and help.", "The class finishes fast and goes outside to play!", "🏃"], [["Keep coloring.", "Everyone waits for Max. Recess gets shorter.", "⏳"], ["Throw the crayons in a pile.", "Crayons roll everywhere — clean-up takes even longer.", "😬"]], "Listening the first time helps everyone."),
  rw("Grandpa says, “No more candy today.”", "🍬👴👧", "What should Ella do?", ["Say, “Okay, Grandpa.”", "Grandpa smiles: “Want to play a game instead?”", "🎲"], [["Cry and kick.", "Grandpa is sad, and the fun afternoon gets spoiled.", "😢"], ["Sneak candy when he's not looking.", "Grandpa finds the wrapper. Now he feels sad that he can't trust Ella.", "🍬"]], "Accepting “no” with a happy heart shows respect."),
  rw("Mom says, “Time to turn off the TV.”", "📺⏰👦", "What should Theo do?", ["Turn it off and say, “Okay!”", "Mom says, “Wow, thank you for listening!” and they play outside.", "⚽"], [["Turn it up louder.", "Mom has to unplug it. Now TV is done for tomorrow too.", "🔌"], ["Say, “Just one more show!” over and over.", "Mom gets tired of asking, and the fun time is over.", "😩"]], "Listening the first time is a big-kid superpower."),
];
export const WHINE_SORT: SortBank = { prompt: "Big-kid voice or whiny voice?", bins: ["Big-kid voice", "Whiny voice", "😊", "😫"], items: [["“May I have a snack, please?”", 1, "🍎"], ["“Can I play outside?”", 1, "⚽"], ["“Okay, Mom!”", 1, "👍"], ["“Can you help me, please?”", 1, "🙋"], ["“Thank you for dinner.”", 1, "🍽️"], ["“I WANT IT NOW!”", 0, "😤"], ["“That's not faaair!”", 0, "😫"], ["“Ugh, nooo!”", 0, "🙄"], ["“You never let me!”", 0, "😠"], ["“I don't waaant to!”", 0, "😭"]] };

// ── Middle sailors: the trust bridge ─────────────────────────────────────────────────────
export const TRUST: Rw[] = [
  rw("Noah told his mom he finished his homework so he could play video games. He didn't.", "📚🎮👦", "What should Noah do now?", ["Tell Mom the truth and finish his homework.", "Mom is disappointed, but she says, “Thank you for coming to me.” Tomorrow she believes him again.", "🤝"], [["Keep playing and hope she doesn't check.", "His teacher sends a note home: homework missing. Mom feels tricked, and the games go away for a week.", "📩"], ["Make up another excuse.", "Lies pile up like blocks. When they fall, the trouble is bigger.", "🧱"]], "Trust is like a bridge: every lie takes a plank away, and honesty builds it back."),
  rw("Leo borrowed his brother's headphones without asking — and lost them.", "🎧❓👦", "What should Leo do?", ["Tell his brother, say sorry, and offer to help replace them.", "His brother is upset, but says, “Thanks for telling me.” They agree Leo will use his allowance.", "🤝"], [["Pretend he never touched them.", "His brother finds them later in Leo's backpack. Now he locks his door.", "🔒"], ["Say, “You probably lost them.”", "His brother searches for days, confused and blamed. When he learns the truth, he's really hurt.", "💔"]], "Owning up — even when it's embarrassing — keeps trust strong."),
  rw("Mia got a bad grade on a spelling test and doesn't want her parents to see.", "📝😟👧", "What should Mia do?", ["Show them and ask for help practicing.", "Dad helps Mia practice every night. Next week she gets a better grade!", "📈"], [["Hide the test in her backpack.", "The teacher emails her parents. They're sad she hid it — that's worse than the grade.", "📧"], ["Change the grade with a pencil.", "Her parents can tell. Now it's not just a bad grade — it's a lie.", "✏️"]], "Mistakes can be fixed. Hiding them makes them bigger."),
  rw("Jake promised to feed the dog but forgot. Mom asks, “Did you feed Biscuit?”", "🐶🍽️👦", "What should Jake say?", ["“I forgot! I'll do it right now.”", "Biscuit wags his tail. Mom says, “Thanks for being honest.”", "🐕"], [["“Yes!” (he didn't)", "Biscuit is hungry all night. Mom finds the food bag hasn't been opened.", "🥺"], ["“Sister was supposed to.”", "His sister gets in trouble unfairly. That breaks trust with her too.", "😠"]], "Honesty — even about forgetting — keeps people's trust."),
  rw("Ruby's friend left her favorite pencil at Ruby's house. Ruby really likes it.", "✏️✨👧", "What should Ruby do?", ["Give it back at school tomorrow.", "Her friend squeals, “You found it! Thank you!” Their friendship grows.", "💛"], [["Keep it — finders keepers.", "Her friend searches everywhere and is sad. Ruby feels guilty every time she uses it.", "😔"], ["Say she's never seen it.", "Her friend later sees it in Ruby's pencil box. Now she wonders what else Ruby isn't honest about.", "🤨"]], "Returning what isn't yours shows you can be trusted."),
];
export const TRUST_STEPS: [string, string][] = [["Tell the truth", "🗣️"], ["Say sorry for real", "🙏"], ["Make it right", "🛠️"], ["Keep being honest, day after day", "📅"]];
export const TRUST_POL: Pol[] = [
  { q: "Which builds trust?", e: "🌉➕", a: "Doing what you said you would do", w: ["Saying you'll do it, then not doing it", "Telling only part of the truth"], why: "Every kept promise adds a plank to the trust bridge." },
  { q: "Your friend told you something private. What keeps their trust?", e: "🤫🤝", a: "Keeping it private (unless someone could get hurt)", w: ["Telling just one other friend", "Telling everyone it's a secret"], why: "Trustworthy friends keep private things private — but safety secrets always go to a grown-up." },
  { q: "You broke a promise. What rebuilds trust fastest?", e: "🌉🔨", a: "Admit it, apologize, and keep your next promises", w: ["Pretend it didn't happen", "Promise something even bigger"], why: "Trust grows back one honest action at a time." },
  { q: "Why does lying break trust even if you only lie once?", e: "💔🌉", a: "People start wondering if your other words are true too", w: ["It doesn't — once is fine", "Because lies are loud"], why: "After a lie, people have to guess which words to believe." },
];

export const WOLF: Story = {
  id: "wolf", title: "The Boy Who Cried Wolf", emoji: "🐺", ref: "A fable from long ago", band: "middle", ns: "h",
  scenes: [
    { sky: "day", art: "👦🐑", ground: "🌿🌿", text: "A shepherd boy watched the village sheep on a hill. It was quiet… and boring." },
    { sky: "day", art: "👦", text: "For fun, he shouted, “Wolf! Wolf! A wolf is chasing the sheep!”", act: { type: "tap", prompt: "Tap to shout like the boy…", target: "📣", n: 1, after: "🏃" } },
    { sky: "day", art: "🧑‍🌾🧑‍🌾", text: "The villagers dropped everything and ran up the hill — but there was no wolf. The boy laughed. The villagers were not happy." },
    { sky: "day", art: "👦😂", text: "A few days later, he did it again: “Wolf! Wolf!” Again the villagers came running. Again — no wolf." },
    { sky: "dusk", art: "🐺🐑", text: "Then one evening, a real wolf crept out of the trees!", act: { type: "tap", prompt: "Tap to call for help!", target: "📣", n: 3, after: "😢" } },
    { sky: "dusk", art: "👦😢", text: "The boy shouted, “WOLF! Please help!” But the villagers said, “He's just tricking us again.” No one came. When people can't trust your words, they can't help you when it matters." },
  ],
  order: [["The boy was bored", "🥱"], ["He shouted “Wolf!” for fun", "📣"], ["The villagers ran to help", "🏃"], ["He tricked them again", "😂"], ["A real wolf came", "🐺"], ["No one believed him", "😢"]],
  quiz: [
    { q: "Why didn't the villagers come the last time?", a: "They didn't believe him anymore", w: ["They were asleep", "They didn't hear"], why: "His lies taught them not to believe him.", e: "🐺" },
    { q: "What does this story teach?", a: "Lies make people stop believing you — even when you tell the truth", w: ["Wolves are scary", "Never watch sheep"], why: "Broken trust is hard to fix.", e: "🌉" },
    { q: "What could the boy have done when he was bored?", a: "Found an honest way to have fun", w: ["Shouted louder", "Told a bigger lie"], why: "Being bored is never a reason to trick people.", e: "🎶" },
    { q: "How did the villagers feel after being tricked?", a: "Annoyed and not ready to trust him", w: ["Happy and excited", "Thankful"], why: "Tricks waste people's time and hurt their trust.", e: "😠" },
  ],
  tf: [["The boy told the truth every time.", false], ["The villagers stopped believing him.", true], ["A real wolf came in the end.", true]],
  lesson: "Lies break trust — and broken trust means people can't believe you when it matters.",
};

// ── Middle sailors: sneaky or honest? ────────────────────────────────────────────────────
export const SNEAKY_SORT: SortBank = { prompt: "Honest and open, or sneaky?", bins: ["Honest & open", "Sneaky", "🌞", "🕵️"], items: [["Asking before taking a snack", 1, "🍎"], ["Telling Mom you broke a rule", 1, "🗣️"], ["Playing fair when nobody's watching", 1, "🎲"], ["Showing your parents your test", 1, "📝"], ["Giving back extra change", 1, "🪙"], ["Eating candy in secret", 0, "🍬"], ["Playing the tablet under the covers", 0, "📱"], ["Peeking at birthday presents", 0, "🎁"], ["Deleting a message so Mom won't see", 0, "🗑️"], ["Hiding a broken toy", 0, "🙈"], ["Moving your game piece when no one's looking", 0, "♟️"]] };
export const SNEAKY_CASES: Case[] = [
  kase("Screen Time", "📱🛏️", [["Dad said screen time was over at 7:00.", "⏰"], ["Chris said, “Okay, Dad,” and went to his room.", "👦"], ["He took the tablet under his blanket and kept playing.", "📱"], ["When Dad checked, Chris hid it and pretended to sleep.", "😴"]], [2, 3], "Playing in secret and pretending to sleep are both sneaky. Chris acted honest, but he wasn't."),
  kase("Game Night", "🎲♟️", [["Marcus and Theo played a board game.", "🎲"], ["When Theo went to get a drink, Marcus moved his piece ahead three spaces.", "♟️"], ["When Theo came back, Marcus said, “Your turn!”", "😇"], ["Marcus won the game.", "🏆"]], [1], "Moving his piece in secret is cheating — a win like that isn't really a win."),
  kase("The Phone Call", "📞👵", [["Grandma called to talk to Mom.", "📞"], ["Ruby answered and said, “Mom's too busy.”", "🗣️"], ["Mom wasn't busy — Ruby wanted to keep playing on Mom's phone.", "🎮"], ["Ruby played for ten more minutes.", "⏳"]], [1], "Ruby told Grandma something untrue so she could keep the phone. That's a sneaky lie."),
  kase("Cookie Jar", "🍪🏺", [["Mom said, “No snacks before dinner.”", "🍽️"], ["Lucy waited until Mom went outside.", "🚪"], ["She took two cookies and ate them in the closet.", "🍪"], ["At dinner she said, “I'm SO hungry!”", "😋"]], [1, 2], "Waiting for Mom to leave and eating in the closet are sneaky moves — doing something you know isn't allowed, in secret."),
  kase("The Permission Slip", "📄✍️", [["Owen's class was going on a field trip.", "🚌"], ["He forgot to give his mom the permission slip.", "📄"], ["The morning it was due, he signed his mom's name himself.", "✍️"], ["He turned it in and said nothing.", "🤐"]], [2], "Signing someone else's name is pretending to be them — that's deception."),
];
export const WATCHING: Pol[] = [
  { q: "You're alone in the kitchen and see Dad's open wallet. Try the “watching test”: would you take money if Dad were right there?", e: "👛👀", a: "No — so I shouldn't take it now, either", w: ["It's okay because no one's watching", "Just take a little"], why: "Honest people act the same whether or not anyone is watching." },
  { q: "Your teacher steps out during a quiz. The answer key is on her desk. What do you do?", e: "📝🚪", a: "Keep doing my own work", w: ["Take a quick peek", "Copy the answers fast"], why: "Doing right when no one's watching is what makes you trustworthy." },
  { q: "You're told to read for 20 minutes, but no one is checking. What's the honest choice?", e: "📖⏱️", a: "Read the whole 20 minutes", w: ["Play quietly and say you read", "Read 5 minutes and say 20"], why: "Being honest about small things builds a strong, honest habit." },
  { q: "Your big brother says, “Mom won't know if you have another cookie.” What do you do?", e: "🍪👦", a: "Not take it — I know the rule even if Mom doesn't see", w: ["Take it fast", "Take two"], why: "Sneaky choices are still wrong, even if no one finds out." },
];

// ── Middle sailors: tattling or telling? ─────────────────────────────────────────────────
export const TATTLE_SORT: SortBank = { prompt: "Tell a grown-up now, or try to solve it yourself?", bins: ["Tell a grown-up", "Solve it myself", "🚨", "🤝"], items: [["Someone is hurt", 1, "🤕"], ["A kid is being bullied", 1, "😢"], ["Someone is playing with matches", 1, "🔥"], ["A stranger wants you to go with them", 1, "🚗"], ["Someone is climbing somewhere dangerous", 1, "🧗"], ["A friend says someone is hurting them", 1, "💔"], ["Your brother is humming", 0, "🎶"], ["Someone took the crayon you wanted", 0, "🖍️"], ["A kid cut in line", 0, "🚶"], ["Your friend won't share the swing", 0, "🎠"], ["Someone made a silly face at you", 0, "😜"], ["Your sister copies what you say", 0, "🦜"]] };
export const TATTLE: Pol[] = [
  { q: "What's the difference between tattling and telling?", e: "📢🤔", a: "Tattling tries to get someone IN trouble; telling tries to get someone OUT of trouble or danger", w: ["There's no difference", "Telling is for grown-ups only"], why: "If someone is hurt or in danger, telling a grown-up is always right." },
  { q: "Your sister keeps singing the same song and it's annoying. What should you do?", e: "🎶😖", a: "Ask her kindly to sing somewhere else", w: ["Run and tell Mom right away", "Yell at her to stop"], why: "Small problems are chances to use your words first." },
  { q: "A kid on the playground pushes your friend down, and your friend is crying. What should you do?", e: "🛝😢", a: "Help your friend and tell a teacher", w: ["Push the kid back", "Do nothing — it's not your business"], why: "When someone is hurt, telling a grown-up is the right move." },
  { q: "Your friend says, “Don't tell anyone, but someone at home hurts me.” What should you do?", e: "🤫💔", a: "Tell a trusted grown-up — this secret isn't safe to keep", w: ["Keep the secret forever", "Tell other kids"], why: "Secrets about someone getting hurt must be told to a trusted adult. That's how you help." },
];

// ── Middle sailors: attitude adjustment ──────────────────────────────────────────────────
export const ATTITUDE_KIDS: Rw[] = [
  rw("Mom says, “Time to turn off the TV and set the table.”", "📺🍽️👧", "How should Ella answer?", ["“Okay, Mom. Can I finish this part first?” (calm voice)", "Mom says, “Sure, two minutes.” Dinner is happy and calm.", "😊"], [["Roll her eyes: “Ugh, you ALWAYS make me do stuff!”", "Mom feels disrespected. TV time is over for the night.", "📵"], ["Stomp to the kitchen and slam the plates down.", "A plate cracks. Now there's a mess and hurt feelings.", "💥"]], "Your tone of voice and your face say as much as your words."),
  rw("Dad says you can't have a sleepover this weekend.", "🏕️👨👦", "How should Sam respond?", ["“Okay. Can we plan one for another time?”", "Dad says, “I'd like that. Let's look at the calendar.”", "📅"], [["“That's so unfair! You're the worst!”", "Dad is hurt. Now he's not in the mood to plan anything.", "😞"], ["Pout and refuse to talk all night.", "Everyone has a gloomy evening, and nothing changes.", "😶"]], "Accepting no calmly — and asking about later — works better than arguing."),
  rw("Your teacher asks you to redo a messy worksheet.", "📄👩‍🏫🧒", "What should you say?", ["“Okay, I'll try again neatly.”", "Your second try looks great, and your teacher puts a star on it!", "⭐"], [["“But I already DID it!” (whining)", "The teacher says it still needs redoing — and now recess is shorter.", "⏳"], ["Crumple it up.", "Now you have to start from scratch — and your teacher is disappointed.", "🗑️"]], "A good attitude turns a do-over into a win."),
  rw("Your little brother wants to play with you while your friend is over.", "👦🧒👧", "What's a good-attitude response?", ["“Sure, you can play for a bit!”", "Your brother lights up, and your friend thinks you're a great big sibling.", "😄"], [["“Go away, you're annoying!”", "Your brother runs off crying, and your friend feels awkward.", "😢"], ["Ignore him until he leaves.", "He feels invisible. Ignoring someone hurts too.", "😔"]], "Kindness at home matters just as much as kindness at school."),
];
export const TONE: Pol[] = [
  { q: "Which way of saying “okay” shows respect?", e: "🗣️👂", a: "😊 “Okay!”", w: ["🙄 “O-KAY.”", "😤 “Fine. OKAY.”"], why: "The same word can sound kind or rude. A friendly tone shows respect." },
  { q: "Which face goes with a respectful answer?", e: "🪞😊", a: "😊 Calm and friendly", w: ["🙄 Rolling eyes", "😒 Annoyed"], why: "Your face talks too! Eye-rolling says “I don't respect you.”" },
  { q: "Mom asks you to help. Which shows a good attitude?", e: "🧺🙋", a: "“Sure! What should I do?”", w: ["*big sigh* “Whaaat?”", "“Why do I have to?”"], why: "A cheerful helper makes chores go faster for everyone." },
  { q: "Which is a respectful way to disagree with a grown-up?", e: "🤔🗣️", a: "“Can I tell you what I think?” (calm voice)", w: ["“You're wrong!”", "“That's dumb.”"], why: "You can share your ideas — respectfully." },
  { q: "Your sister asks to borrow your markers. Which answer sounds kind?", e: "🖍️👧", a: "😊 “Sure, here you go!”", w: ["😒 “Ugh, fine, take them.”", "🙄 “Whatever.”"], why: "Even a yes can feel like a no when the tone is grumpy." },
  { q: "Dad says it's time to leave the park. Which shows a good attitude?", e: "🛝⏰", a: "“Okay! Can I do one more slide?”", w: ["*stomps feet* “NO!”", "Run away and hide."], why: "Asking calmly — and listening to the answer — shows respect." },
];
export const RESPECT_KIT: Kit[] = [
  { e: "🎮⏰", story: "Mom says it's time to stop playing and come to dinner.", slots: [["Start calm", "“Okay, Mom.”", ["“Ugh!”", "“Fine…”"], "A calm start keeps everyone calm."], ["Ask kindly", "“Could I save my game first?”", ["“I'm NOT done!”", "“You never let me finish!”"], "Asking kindly gets better answers than demanding."], ["Follow through", "“Then I'll come right away.”", ["“Maybe I'll come.”", "“Leave me alone.”"], "Doing what you said builds trust."]] },
  { e: "🧹🧸", story: "Dad asks you to clean your room before you go outside.", slots: [["Start calm", "“Okay, Dad.”", ["“Seriously?!”", "“Not now!”"], "Respect starts with your first words."], ["Ask kindly", "“Can I go out after it's clean?”", ["“Why do I always have to?”", "“It's not even messy!”"], "Ask questions, don't argue."], ["Follow through", "“I'll start right now.”", ["“I'll do it later.”", "“Fine, I'll shove it under the bed.”"], "Right away and all the way!"]] },
  { e: "🛏️🌙", story: "It's bedtime, but you want to finish your show.", slots: [["Start calm", "“Okay, Mom.”", ["“Nooo!”", "“I'm not even tired!”"], "A calm voice makes bedtime easier for everyone."], ["Ask kindly", "“Could we finish it tomorrow?”", ["“You're so mean!”", "“Just five more hours!”"], "Asking kindly about later works better than arguing now."], ["Follow through", "“I'll go brush my teeth.”", ["“I'll go in a minute…”", "Hide the tablet under the blanket."], "Doing it right away builds trust."]] },
  { e: "👩‍🏫🪑", story: "Your teacher asks you to stop talking and sit down.", slots: [["Start calm", "“Okay, sorry!”", ["“I wasn't even talking!”", "“Ugh, fine.”"], "A quick, calm answer shows respect."], ["Ask kindly", "“Can I tell my friend at recess?”", ["“But I have to tell him NOW!”", "“Why are you picking on me?”"], "There's a right time for everything."], ["Follow through", "Sit down and listen.", ["Keep whispering when she turns around.", "Sit down but make faces."], "Being the same when the teacher isn't looking is real respect."]] },
  { e: "🎮👦", story: "Your big brother has the game controller, and you want a turn.", slots: [["Start calm", "“Hey, can I have a turn soon?”", ["“GIVE IT!”", "Grab the controller."], "Grabbing starts a fight. Asking starts a deal."], ["Ask kindly", "“How about after this level?”", ["“You ALWAYS hog it!”", "“I'm telling Mom!”"], "Offering a fair plan helps everyone say yes."], ["Follow through", "“Thanks! I'll give it back after my level too.”", ["Keep it for an hour.", "Run away with it."], "Taking turns fairly means next time is easy."]] },
];

// ── Big sailors: integrity ───────────────────────────────────────────────────────────────
export const LIE_TYPES: MatchBank = [
  ["Half-truth", "Telling only part of the story to mislead"],
  ["Exaggeration", "Making something sound bigger than it was"],
  ["Lie of omission", "Leaving out something important on purpose"],
  ["Blame-shifting", "Pointing the finger at someone else"],
  ["“Technically true”", "True words chosen to fool someone"],
  ["Excuse", "Making up reasons so you don't take responsibility"],
  ["Flattery", "Saying nice things you don't mean to get something"],
];
export const LIE_EXAMPLES: MatchBank = [
  ["“I did my homework.” (one page of five)", "Half-truth"],
  ["“I waited like THREE HOURS!” (ten minutes)", "Exaggeration"],
  ["“We went to Jake's.” (not mentioning the creek)", "Lie of omission"],
  ["“It's Sam's fault I was late.”", "Blame-shifting"],
  ["“I didn't HIT him.” (you pushed him)", "“Technically true”"],
  ["“I couldn't — the dog was being loud.”", "Excuse"],
];
export const INTEGRITY_CASES: Case[] = [
  kase("The Science Fair", "🌋🧪", [["Ava's group built a volcano for the science fair.", "🌋"], ["Ava was supposed to bring the baking soda but forgot.", "🧂"], ["When the teacher asked why it didn't erupt, Ava said, “Someone must have used up the baking soda.”", "🗣️"], ["Her group mates looked at each other, confused.", "😕"], ["Later, Ava told herself, “It wasn't really my fault.”", "💭"]], [2, 4], "Blaming “someone” and telling herself it wasn't her fault are both dishonest — she forgot, and owning it would fix things."),
  kase("Goal Count", "⚽🗣️", [["Ben scored one goal in Saturday's game.", "⚽"], ["At school, he told everyone he scored three.", "🗣️"], ["His friend, who was at the game, didn't say anything.", "🤐"], ["Ben felt proud — and a little uneasy.", "😬"]], [1], "Turning one goal into three is exaggeration — a lie dressed up as a story."),
  kase("Permission", "🏠🏪", [["Jada asked her dad, “Can I go to Mia's house?”", "🏠"], ["Dad said yes.", "👍"], ["She didn't mention they planned to walk to the store alone.", "🤐"], ["They walked to the store and back.", "🏪"], ["When Dad asked how it was, Jada said, “Fine, we just hung out.”", "🗣️"]], [2, 4], "Leaving out the store trip and saying “we just hung out” are both deception — a lie of omission and a misleading answer."),
  kase("Quiz Day", "📝👀", [["During a quiz, Leo's eyes wandered to Sam's paper.", "👀"], ["He saw the answer to number 4 and copied it.", "✍️"], ["Leo got 100%.", "💯"], ["When his teacher said, “Great job studying!” he said, “Thanks, I studied hard.”", "🗣️"]], [1, 3], "Copying is cheating, and accepting praise for it is deceiving his teacher."),
  kase("The Window", "⚾🪟", [["Chris and Eli were playing baseball in the yard.", "⚾"], ["Chris hit the ball through Mr. Lee's window.", "💥"], ["When Mr. Lee came out, Chris said, “We didn't hit any balls over here today.”", "🗣️"], ["Eli stayed quiet and looked at the ground.", "😶"]], [2], "Chris told a flat-out lie. Eli's silence lets the lie stand — something worth thinking about."),
  kase("Reading Time", "📱📖", [["Maya's mom said no phone after 9:00.", "⏰"], ["At 9:30, Maya was still texting.", "📱"], ["When Mom knocked, Maya hid the phone and said, “I'm reading.”", "🗣️"], ["She did have a book open on her bed.", "📖"]], [1, 2], "Breaking the rule in secret, then saying “I'm reading” with a book as a prop, is “technically true” deception."),
];
export const DILEMMA: Pol[] = [
  { q: "Why tell the truth even if you'd never get caught?", e: "🧭❓", a: "Because it's right, and it keeps my heart and my friendships honest", w: ["Because I'd probably get caught someday", "Because I might get a reward"], why: "The strongest reason isn't fear or rewards — it's that honesty is right and builds trust." },
  { q: "You find $20 on a store floor. No one saw. What's the integrity move?", e: "💵🏪", a: "Turn it in at the counter — someone is missing it", w: ["Keep it — finders keepers", "Keep it unless someone asks"], why: "Integrity means doing right even when no one is watching." },
  { q: "Your friend asks if you like her new haircut. You don't love it. What's honest AND kind?", e: "💇🤔", a: "“I like that you tried something new — it's fun!”", w: ["“I love it!!” (not true)", "“It looks bad.”"], why: "You don't have to say every thought — but what you say should be true. Look for something true and kind." },
  { q: "A cashier gives you $5 too much change. What do you do?", e: "🪙🧾", a: "Give it back", w: ["Keep it — it's their mistake", "Spend it fast"], why: "Keeping money you know isn't yours is a form of stealing." },
  { q: "You're last out of class and see the class hamster's cage open. You didn't open it.", e: "🐹🚪", a: "Close it and tell the teacher", w: ["Walk away — not my fault", "Leave it"], why: "Integrity includes doing the right thing even when it isn't your job." },
  { q: "Your team wins because the referee missed your foul. A teammate says, “Who cares, we won.”", e: "⚽🏆", a: "Own up — a win without honesty isn't really a win", w: ["Celebrate — that's the ref's job", "Blame the other team"], why: "Integrity matters more than the scoreboard." },
];
export const BEST_REASON: Pol[] = [
  { q: "Which is the BEST reason not to cheat on a test?", e: "📝🧠", a: "Cheating is dishonest, and I want to really learn", w: ["The teacher might see", "My friend's answers might be wrong"], why: "Fear of getting caught is the weakest reason. Doing right because it's right is the strongest." },
  { q: "Which is the BEST reason to return a lost wallet?", e: "👛🔁", a: "It belongs to someone who's probably worried", w: ["There might be a reward", "The police might find out"], why: "Thinking about how others feel — empathy — is a great reason to do right." },
  { q: "Which is the BEST reason to keep a promise?", e: "🤝⭐", a: "People are counting on me, and my word should mean something", w: ["So I don't get in trouble", "Because I have nothing better to do"], why: "Keeping your word makes you someone others can trust." },
];
export const HARDEST_TRUTH: Reflect[] = [
  { q: "When is it hardest for YOU to tell the truth?", e: "🤔💭", options: [["When I might get in trouble", "⚠️", "That's the bravest time to be honest. Grown-ups who love you would much rather hear the truth — trouble shrinks when you tell it."], ["When I don't want someone to be disappointed", "😔", "That shows you care about them. Honesty, with a sorry, protects the relationship much better than a lie."], ["When my friends are doing something", "👥", "Being the honest one in a group takes real courage. One honest voice can change the whole group."], ["It's usually easy for me", "😎", "Awesome! Keep building that habit — it makes you someone everyone can trust."]] },
  { q: "How do you feel inside after you tell a lie?", e: "💭💗", options: [["Worried or heavy", "😟", "That heavy feeling is your conscience — it's a gift that nudges you back to the truth."], ["Scared of being found out", "😨", "Lies keep you on guard all the time. The truth lets you breathe again."], ["I don't really notice", "🤷", "Try noticing next time. Paying attention to that feeling helps you choose honesty."]] },
];

// ── Big sailors: respect & authority ─────────────────────────────────────────────────────
export const RESPECT_BIG: Rw[] = [
  rw("Your teacher tells the class to put away phones. You're in the middle of a message.", "📱👩‍🏫🧑", "What do you do?", ["Put it away right away.", "Class goes smoothly, and your teacher trusts you more.", "👍"], [["“Hold on, one sec!” and keep typing.", "The phone gets taken until the end of the day — and you looked disrespectful.", "📵"], ["Roll your eyes and sigh loudly.", "The teacher notices. Now there's tension with someone who's trying to help you.", "😬"]], "Respecting authority means cooperating — even when it's inconvenient."),
  rw("Your coach benches you for talking back during practice.", "⚽🧢🧑", "What's the respectful response?", ["Apologize and ask how to do better.", "Coach says, “I respect that.” You're back in next game — and you've earned his trust.", "🤝"], [["Argue: “That's so unfair!”", "Coach benches you longer. Arguing proved his point.", "⏳"], ["Mutter something rude under your breath.", "Your teammates hear it. Now they see you differently too.", "😕"]], "Owning your mistake shows maturity."),
  rw("Grandpa starts telling a long story you've heard before.", "👴📖🧒", "What do you do?", ["Listen kindly and ask a question.", "Grandpa lights up — he loves that you care.", "😊"], [["Say, “You already told me this!”", "Grandpa goes quiet. His feelings are hurt.", "😔"], ["Look at your phone.", "Grandpa notices and stops talking. You missed a moment with him.", "📱"]], "Respect means honoring people — especially older people — with attention and kindness."),
  rw("An older kid tells you to keep a secret from your parents about something dangerous.", "🤫⚠️🧒", "What do you do?", ["Tell a trusted adult anyway.", "The adult helps make things safe. You did the right — and brave — thing.", "🛡️"], [["Keep the secret to look cool.", "Someone could get hurt. Some secrets are not safe to keep.", "⚠️"], ["Join in so you're not left out.", "Now you're in danger too.", "🚫"]], "Respect doesn't mean obeying anyone older. If someone asks you to do something wrong or unsafe, tell a trusted adult."),
  rw("Your mom asks you to watch your little sister for ten minutes while she makes a call.", "👧📞🧒", "What's the respectful choice?", ["Play with your sister and keep her safe.", "Mom comes back to a happy sister and says, “I can count on you.”", "⭐"], [["Watch videos and ignore her.", "Your sister wanders into the kitchen and spills flour everywhere.", "💥"], ["Complain the whole time.", "Mom can't focus on her call, and everyone ends up frustrated.", "😤"]], "Respect is shown in how we handle responsibility."),
];
export const RESPECT_SORT_BIG: SortBank = { prompt: "Respectful or disrespectful?", bins: ["Respectful", "Disrespectful", "🙌", "👎"], items: [["Saying “okay” without a sigh", 1, "👍"], ["Disagreeing calmly, in private", 1, "🗣️"], ["Looking at someone when they talk", 1, "👀"], ["Following a rule you don't love", 1, "📏"], ["Thanking a coach after practice", 1, "🧢"], ["A sarcastic “Thanks a LOT”", 0, "🙄"], ["Talking over the teacher", 0, "🗯️"], ["Mocking a sibling's mistake", 0, "😏"], ["Ignoring a parent until they ask three times", 0, "🙉"], ["Muttering under your breath", 0, "😒"]] };
export const DISAGREE_KIT: Kit[] = [
  { e: "🗣️🤝", story: "Your parents decide you can't go to a friend's party, and you think it's unfair.", slots: [["Start calmly", "“Can I share my side?”", ["“That's ridiculous!”", "“Whatever.”"], "Starting calm invites listening."], ["Explain with “I”", "“I feel left out, because everyone I know is going.”", ["“You never let me do anything!”", "“Everyone else's parents are nicer.”"], "“I feel…” explains without attacking."], ["Accept the answer", "“Okay. Thanks for listening to me.”", ["“Fine, but I won't like it.”", "*slams the door*"], "Respect shows most when the answer is still no."]] },
  { e: "📝👩‍🏫", story: "Your teacher marked an answer wrong that you think was right.", slots: [["Start calmly", "“Could I ask about number 6?”", ["“You graded this wrong!”", "“This is so unfair.”"], "A question opens a conversation."], ["Explain", "“I think my answer works because…”", ["“You obviously didn't read it.”", "“Everyone says you're a hard grader.”"], "Explain your thinking — don't attack."], ["Accept the answer", "“Thanks for explaining it.”", ["“Ugh, never mind.”", "Roll your eyes and walk away"], "Even if the grade doesn't change, respect earns respect."]] },
  { e: "⚽🧢", story: "Your coach keeps playing you in a position you don't like.", slots: [["Start calmly", "“Coach, can I talk to you after practice?”", ["“This position is dumb.”", "Sulk on the field"], "Picking the right moment shows respect."], ["Explain with “I”", "“I'd love a chance at forward — I've been practicing.”", ["“You never play me where I'm good.”", "“Everyone knows I'm better at forward.”"], "Say what you hope for without blaming."], ["Accept the answer", "“Okay. I'll give it my best wherever you need me.”", ["“Fine. Then I won't try.”", "Quit the team that night"], "A good attitude after a no earns trust — and future chances."]] },
  { e: "🎬🛋️", story: "Your family picks a movie for movie night, and you think it sounds boring.", slots: [["Start calmly", "“Could I suggest another one?”", ["“That one's so stupid.”", "Groan loudly"], "Calm words get a real hearing."], ["Explain with “I”", "“I'd really like something funny tonight.”", ["“You guys always pick bad movies.”", "“I never get to choose anything.”"], "“I'd like…” shares your wish without attacking anyone."], ["Accept the answer", "“Okay — maybe I can pick next time?”", ["Watch with arms crossed, sighing", "Leave and slam your door"], "Being a good sport keeps family time fun."]] },
];

// ── Big sailors: self-control ────────────────────────────────────────────────────────────
export const STOP_STEPS: [string, string][] = [["Stop — freeze before you react", "🛑"], ["Breathe — slow, deep breaths", "🌬️"], ["Think — what will happen next?", "🤔"], ["Choose — pick the wise action", "✅"]];
export const SELF_CONTROL: Rw[] = [
  rw("Your little brother knocks over the LEGO city you spent all day building.", "🧱💥👦", "What do you do?", ["Take a breath, step away, then tell him how you feel.", "You calm down, he says sorry, and you rebuild it together — even better.", "🏙️"], [["Yell and shove him.", "He falls and cries. Now you're in trouble too, and he's hurt.", "😭"], ["Smash his toy to get even.", "Now two things are broken — and so is trust.", "💔"]], "Self-control is the pause between the feeling and the action."),
  rw("You're playing a game and your mom says time's up.", "🎮⏰🧒", "What do you do?", ["Save, log off, and say “Okay.”", "Mom notices and gives you extra time tomorrow.", "⏳"], [["Keep playing until she takes it.", "No games tomorrow — and Mom feels like she can't trust you.", "📵"], ["Beg and argue for twenty minutes.", "You spend the time arguing instead of playing — and the answer is still no.", "😩"]], "Self-control means stopping even when it's hard."),
  rw("Someone at school says something mean about you.", "💬😠🧒", "What do you do?", ["Walk away and talk to a trusted adult or friend.", "You stay out of trouble, and the adult helps handle it.", "🛡️"], [["Say something meaner back.", "It turns into a fight. Both of you get in trouble.", "⚡"], ["Spread a rumor about them.", "Now you're doing the very thing that hurt you.", "🔁"]], "Staying calm when someone is unkind takes real strength."),
  rw("You get $10 for your birthday. There's a toy you want that costs $25.", "💵🎁🧒", "What's the self-control move?", ["Save it until you have enough.", "Three weeks later you buy it — and it feels amazing.", "🎉"], [["Spend it right away on candy.", "The candy's gone in a day, and the toy is still far away.", "🍬"], ["Borrow money and never pay it back.", "That breaks trust with your parents.", "💸"]], "Waiting for something better is a superpower."),
  rw("You're about to post an angry comment about a game you lost.", "📱😡🧑", "What's the wise move?", ["Wait, cool off, and decide later.", "An hour later you're glad you didn't post it.", "😌"], [["Post it right now.", "People reply with angry comments. Now it's a big mess with your name on it.", "🔥"], ["Message the winner something mean.", "They screenshot it and share it. You can't take it back.", "📸"]], "Strong feelings pass. Words posted online don't."),
];
export const FUTURE_YOU: Pol[] = [
  { q: "You want to stay up late playing, but you have a test tomorrow. What would Future You want?", e: "🌙📝", a: "Get some sleep so I can think clearly tomorrow", w: ["Play until midnight", "Play now, study at breakfast"], why: "Asking “What would Future Me want?” is a powerful self-control trick." },
  { q: "You're super angry. Which choice would you be glad about tomorrow?", e: "😡➡️😌", a: "Taking space until I calm down", w: ["Saying exactly what I'm thinking", "Throwing something"], why: "Calm-down time protects you from regrets." },
  { q: "There's one slice of cake left. Your sister hasn't had any. What's the self-control choice?", e: "🍰👧", a: "Let her have it, or split it", w: ["Eat it fast before she sees", "Take it because you saw it first"], why: "Self-control and kindness often go together." },
  { q: "You're saving for a bike, and there's candy at the checkout. What would Future You want?", e: "🍬🚲", a: "Skip the candy and keep saving", w: ["Buy it — it's only a little", "Buy candy every time"], why: "Little choices add up. Future You will be riding that bike!" },
  { q: "A friend says, “Skip your homework and play!” What would Future You thank you for?", e: "📚🎮", a: "Homework first, then play", w: ["Play now and hope the teacher forgets", "Copy someone's homework tomorrow"], why: "Work first, play later — and Future You gets both." },
];

// ── Big sailors: owning it ───────────────────────────────────────────────────────────────
export const OWN_SORT: SortBank = { prompt: "Owning it, or making an excuse?", bins: ["Owning it", "Excuse", "🙋", "🙅"], items: [["“I forgot. I'll fix it now.”", 1, "🛠️"], ["“That was my fault.”", 1, "🙋"], ["“I wasn't listening — can you tell me again?”", 1, "👂"], ["“I made a mistake, and I'm sorry.”", 1, "🙏"], ["“I'll do better next time — here's how.”", 1, "📈"], ["“It's not MY fault the teacher didn't remind us.”", 0, "👉"], ["“Everybody else did it too.”", 0, "👥"], ["“I would have, but my brother distracted me.”", 0, "🙄"], ["“Well, YOU didn't tell me exactly.”", 0, "😒"], ["“It's not a big deal.”", 0, "🤷"]] };
export const APOLOGY_KIT: Kit[] = [
  { e: "🎨😢", story: "You made fun of your friend's drawing in front of the class, and they looked hurt.", slots: [["1. Say it", "“I'm sorry I made fun of your drawing.”", ["“Sorry if you got upset.”", "“Sorry, but it was a joke.”"], "A real apology names what you did."], ["2. Own it", "“It was unkind, and it embarrassed you.”", ["“Everyone was laughing anyway.”", "“You're too sensitive.”"], "Say why it was wrong — no excuses."], ["3. Make it right", "“Can I tell everyone I was wrong? I like your drawing.”", ["“Let's just forget it.”", "“I'll buy you candy.”"], "Repair the harm if you can."], ["4. Next time", "“Next time I'll encourage instead of tease.”", ["“Next time I'll be quieter about it.”", "“There won't be a next time if you stop drawing.”"], "Show how you'll change."]] },
  { e: "👕☕", story: "You borrowed your sister's favorite sweater without asking and got a stain on it.", slots: [["1. Say it", "“I'm sorry I took your sweater without asking and stained it.”", ["“Sorry, but you weren't using it.”", "“Sorry it got dirty.”"], "Name exactly what you did."], ["2. Own it", "“It was yours, and I should have asked.”", ["“You borrow my stuff too.”", "“It's just a sweater.”"], "Take responsibility — no counter-blaming."], ["3. Make it right", "“I'll wash it, and if it doesn't come out, I'll help replace it.”", ["“Maybe nobody will notice.”", "“Just wear it with the stain.”"], "Making it right shows you mean it."], ["4. Next time", "“Next time I'll always ask first.”", ["“Next time I'll be more careful not to get caught.”", "“Next time hide it better.”"], "The goal is changing, not hiding better."]] },
  { e: "🐶🥣", story: "You promised to feed the dog every morning this week, but you forgot two days.", slots: [["1. Say it", "“I'm sorry I forgot to feed Max.”", ["“Sorry, but I was busy.”", "“Sorry if he was hungry.”"], "Say exactly what you did — no “but,” no “if.”"], ["2. Own it", "“It was my job, and he was counting on me.”", ["“Someone should have reminded me.”", "“He's a dog — he's fine.”"], "Owning it means no blaming and no shrinking it."], ["3. Make it right", "“I'll feed him now and take him for an extra walk.”", ["“Let's not make it a big deal.”", "“Can someone else just do it?”"], "Do something to repair it."], ["4. Next time", "“I'll put a reminder by my toothbrush.”", ["“Next time I'll hide that I forgot.”", "“Next time, give the job to someone else.”"], "A real plan shows you'll change."]] },
  { e: "😡🎮", story: "Your little brother bumped your game, and you yelled and called him a name.", slots: [["1. Say it", "“I'm sorry I yelled and called you a name.”", ["“Sorry, but you bumped me.”", "“Sorry you're crying.”"], "Name what YOU did."], ["2. Own it", "“Even when I'm mad, that wasn't okay.”", ["“You made me mad.”", "“It's just a word.”"], "Feelings are real — but you choose your words."], ["3. Make it right", "“Want to play a level together?”", ["“Just get over it.”", "“Don't tell Mom.”"], "Repair the friendship, not just the moment."], ["4. Next time", "“Next time I'll take a breath and use calm words.”", ["“Next time I'll yell quieter.”", "“Next time stay away from me.”"], "Next time is about changing, not hiding it."]] },
];
export const FAKE_APOLOGY: Case[] = [
  kase("Real or Fake?", "🙏❓", [["“I'm sorry you feel that way.”", "😐"], ["“I'm sorry I broke your headphones. I'll help replace them.”", "🎧"], ["“Sorry, but you started it.”", "👉"], ["“I was wrong to yell at you. I'm sorry.”", "🙇"]], [0, 2], "“Sorry you feel that way” and “Sorry, but…” don't take responsibility. Real apologies name what you did — without excuses."),
  kase("Real or Fake?", "🙏❓", [["“Sorry if anyone was offended.”", "🤷"], ["“I'm sorry I left you out at lunch. That wasn't kind.”", "🍱"], ["“My bad, whatever.”", "🙄"], ["“I'm sorry I took your seat. Here, it's yours.”", "🪑"]], [0, 2], "“Sorry if…” and “my bad, whatever” are fake apologies. Real ones are specific and sincere."),
  kase("Real or Fake?", "🙏❓", [["“I'm sorry I forgot your birthday. Can I take you out for ice cream?”", "🎂"], ["“Sorry. I guess I'm just a terrible friend.”", "😩"], ["“Okay, okay, SORRY. Happy now?”", "😤"], ["“I'm sorry I said that. It was mean, and I was wrong.”", "🙇"]], [1, 2], "“I'm just terrible” makes it about you, and a shouted “SORRY, happy now?” isn't sincere. Real apologies focus on the person you hurt."),
  kase("Real or Fake?", "🙏❓", [["“I'm sorry I broke your trust. I'll show you I can change.”", "🤝"], ["“Sorry — but if you hadn't left it there, I wouldn't have stepped on it.”", "👟"], ["“Mistakes were made.”", "🤷"], ["“I'm sorry I spoiled the movie ending for you.”", "🎬"]], [1, 2], "Blaming the other person and “mistakes were made” both dodge responsibility. Real apologies say “I.”"),
];

// ── Big sailors: words matter ────────────────────────────────────────────────────────────
export const THINK_STEPS: [string, string][] = [["T — Is it true?", "✅"], ["H — Is it helpful?", "🤝"], ["I — Is it inspiring?", "🌟"], ["N — Is it necessary?", "❗"], ["K — Is it kind?", "💖"]];
export const WORDS: Rw[] = [
  rw("Your friend tells you a private thing about another kid's family. At lunch, everyone's talking about that kid.", "🤫🍱🧑", "What do you do?", ["Keep it to yourself and change the subject.", "The talk moves on. The other kid never gets hurt — and your friend can trust you.", "🤝"], [["Share it — it's juicy news.", "By afternoon it's all over school. The kid finds out and is crushed.", "📢"], ["Hint: “I know something, but I can't say…”", "Now everyone's curious and guessing. Hints spread rumors too.", "👀"]], "Gossip is like a spark — it spreads fast and burns people."),
  rw("In a group chat, someone posts a funny but mean picture of a classmate.", "📱😂😢", "What do you do?", ["Don't react — say it's not cool, or tell an adult.", "A couple of others agree with you, and the post gets deleted.", "🗑️"], [["Send a laughing emoji.", "Your laugh tells everyone it's okay. The classmate sees it later.", "😢"], ["Share it with another group.", "Now it's everywhere — and you're part of the hurt.", "🔥"]], "Online words are still words — and they last."),
  rw("Your sister shows you her art project. It's… not great.", "🎨👧🧑", "What do you say?", ["“I like the colors you picked! What's your favorite part?”", "She beams and tells you all about it.", "😄"], [["“That's ugly.”", "She hides the project and stops showing you her art.", "😞"], ["“Wow, amazing, best ever” (sarcastic).", "She can hear the sarcasm. It hurts more than plain words.", "🙄"]], "Kind and true words build people up."),
  rw("A new kid at school talks with an accent. Some kids imitate him behind his back.", "🗣️🌍🧑", "What do you do?", ["Don't join in — go talk to the new kid.", "He smiles for the first time all week. You just made a friend.", "😊"], [["Laugh along.", "He hears the laughing. He feels even more alone.", "😔"], ["Do an even funnier imitation.", "Everyone laughs — except him. That's not funny; it's mean.", "💔"]], "Words can include or exclude. Choose to include."),
];
export const WORDS_SORT: SortBank = { prompt: "Words that build up or tear down?", bins: ["Build up", "Tear down", "🏗️", "💥"], items: [["“Nice try — you'll get it next time!”", 1, "👏"], ["“Want to sit with us?”", 1, "🪑"], ["“Thanks for helping me.”", 1, "🙏"], ["“I'm sorry I said that.”", 1, "🙇"], ["“You're really good at drawing!”", 1, "🎨"], ["“You're so weird.”", 0, "😒"], ["“Nobody likes you.”", 0, "😠"], ["“Did you hear what she did?”", 0, "🤫"], ["“Ha, you're so bad at this.”", 0, "😏"], ["“Whatever, loser.”", 0, "🙄"]] };
export const TOOTHPASTE: Story = {
  id: "toothpaste", title: "The Toothpaste Test", emoji: "🪥", ref: "A classroom lesson", band: "big", ns: "h",
  scenes: [
    { sky: "indoor", art: "👩‍🏫", text: "Ms. Rivera held up a tube of toothpaste and asked for a volunteer to squeeze it all out onto a plate." },
    { sky: "indoor", art: "🧑", text: "Jayden squeezed and squeezed until a long white mountain of toothpaste covered the plate.", act: { type: "tap", prompt: "Tap to squeeze the tube!", target: "🪥", n: 4, after: "🍽️" } },
    { sky: "indoor", art: "👩‍🏫🧑", text: "“Great,” said Ms. Rivera. “Now put it all back in the tube.” Jayden tried a spoon, a straw, his fingers… impossible!" },
    { sky: "indoor", art: "👩‍🏫💬", text: "Ms. Rivera said, “Our words are like this toothpaste. Once they're out, you can't put them back. Mean words, gossip and lies keep going long after we say them.”" },
    { sky: "indoor", art: "🧑‍🤝‍🧑💖", text: "“So before you speak, THINK: Is it true? Helpful? Inspiring? Necessary? Kind?”" },
  ],
  order: [["The teacher held up toothpaste", "🪥"], ["Jayden squeezed it all out", "🍽️"], ["He tried to put it back", "🥄"], ["It was impossible", "🙅"], ["Words are like toothpaste — THINK first", "💭"]],
  quiz: [
    { q: "Why couldn't Jayden put the toothpaste back?", a: "Once it's out, it can't go back in", w: ["The tube was broken", "He didn't try"], why: "That's the whole point — some things can't be undone.", e: "🪥" },
    { q: "What are words like, in this lesson?", a: "Toothpaste — once said, you can't take them back", w: ["Balloons", "Bubbles that pop"], why: "Even after “sorry,” words can keep echoing in someone's heart.", e: "💬" },
    { q: "What does THINK stand for?", a: "True, Helpful, Inspiring, Necessary, Kind", w: ["Talk, Holler, Insult, Nag, Kick", "Think Hard In Nice Kitchens"], why: "Five quick questions before you speak.", e: "💭" },
  ],
  tf: [["Words can be taken back easily.", false], ["THINK helps you choose your words.", true]],
  lesson: "Words can't be un-said — so THINK before you speak.",
};
