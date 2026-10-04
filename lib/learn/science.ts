import type { Activity, Course, LabSpec, LabThing } from "./types";
import { buildWorlds, makeItemsFor, pickN, shuffle, type Rng, type Stage, type Topic, type WorldDef } from "./gen";
import { politeT, type Pol } from "./behavior";
import { LITTLE_WORLDS } from "./sci/little";
import { MIDDLE_WORLDS } from "./sci/middle";
import { BIG_WORLDS } from "./sci/big";

// Discovery — science for every family, Pre-K through 5th grade: living things, the body, Earth
// and sky, matter, forces, energy, and how scientists think. Facts come with a "why", and the
// hands-on labs run the scientist's loop — predict, test, explain: drop things in water, bring a
// magnet close, close a circuit, heat and cool water, grow a plant, move the sun, roll a car down a
// ramp. Skill keys: "s:<topic>".

// ── Lab things ───────────────────────────────────────────────────────────────────────────────
const th = (id: string, name: string, emoji: string, yes: boolean, why: string): LabThing => ({ id, name, emoji, yes, why });
export const FLOAT_THINGS: LabThing[] = [
  th("wood", "Wooden block", "🪵", true, "Wood is lighter than the same amount of water, so it floats."),
  th("duck", "Rubber duck", "🦆", true, "It's hollow and full of air, so it floats."),
  th("apple", "Apple", "🍎", true, "Apples have lots of air inside, so they float."),
  th("ball", "Beach ball", "🏐", true, "It's full of air — and air makes it float."),
  th("leaf", "Leaf", "🍃", true, "A leaf is light and flat, so the water holds it up."),
  th("sponge", "Dry sponge", "🧽", true, "A dry sponge is full of air pockets, so it floats."),
  th("ice", "Ice cube", "🧊", true, "Ice is a little lighter than water, so it floats!"),
  th("orange", "Orange", "🍊", true, "Its peel has tiny air pockets that help it float!"),
  th("coconut", "Coconut", "🥥", true, "Coconuts float — they can drift across whole oceans!"),
  th("rock", "Rock", "🪨", false, "A rock is heavier than the same amount of water, so it sinks."),
  th("key", "Key", "🔑", false, "A metal key is heavy for its size, so it sinks."),
  th("coin", "Coin", "🪙", false, "A coin is small but heavy for its size, so it sinks."),
  th("anchor", "Anchor", "⚓", false, "Anchors are heavy metal made to sink and hold a boat still."),
  th("spoon", "Metal spoon", "🥄", false, "Metal is heavy for its size, so the spoon sinks."),
  th("brick", "Brick", "🧱", false, "A brick is heavy for its size, so it sinks."),
  th("grape", "Grape", "🍇", false, "A grape is a little heavier than water for its size, so it sinks."),
  th("egg", "Egg", "🥚", false, "A fresh egg sinks in plain water!"),
];
export const MAGNET_THINGS: LabThing[] = [
  th("clip", "Paper clip", "📎", true, "Paper clips are steel, and steel has iron in it."),
  th("bolt", "Steel bolt", "🔩", true, "Steel has iron in it, so the magnet pulls it."),
  th("can", "Soup can", "🥫", true, "Soup cans are made of steel, so they stick!"),
  th("wrench", "Wrench", "🔧", true, "Wrenches are made of steel — a magnet pulls them."),
  th("scissors", "Scissors", "✂️", true, "The blades are steel, so the magnet pulls them."),
  th("screwdriver", "Screwdriver", "🪛", true, "Its steel tip is pulled by the magnet."),
  th("coin", "Coin", "🪙", false, "Most coins aren't made of iron, so magnets don't pull them."),
  th("pencil", "Pencil", "✏️", false, "Wood and pencil lead aren't magnetic."),
  th("bear", "Teddy bear", "🧸", false, "Cloth and stuffing aren't magnetic."),
  th("apple", "Apple", "🍎", false, "Food isn't magnetic."),
  th("block", "Wooden block", "🪵", false, "Wood isn't magnetic."),
  th("paper", "Paper", "🧻", false, "Paper isn't magnetic."),
  th("balloon", "Balloon", "🎈", false, "Rubber isn't magnetic."),
];
export const CIRCUIT_THINGS: LabThing[] = [
  th("clip", "Paper clip", "📎", true, "Metal lets electricity flow through it — it's a conductor."),
  th("coin", "Coin", "🪙", true, "Coins are metal, and metal conducts electricity."),
  th("key", "Key", "🔑", true, "Metal keys are conductors, so the bulb lights."),
  th("spoon", "Metal spoon", "🥄", true, "Metal spoons conduct electricity."),
  th("bolt", "Bolt", "🔩", true, "Steel is a metal, so electricity flows through it."),
  th("bear", "Teddy bear", "🧸", false, "Cloth is an insulator — it blocks electricity."),
  th("stick", "Wooden stick", "🪵", false, "Wood is an insulator, so the bulb stays dark."),
  th("balloon", "Balloon", "🎈", false, "Rubber is an insulator — that's why wires are covered in it!"),
  th("paper", "Paper", "🧻", false, "Paper is an insulator."),
  th("straw", "Plastic straw", "🥤", false, "Plastic is an insulator, so no electricity flows."),
  th("sponge", "Dry sponge", "🧽", false, "A dry sponge blocks electricity."),
];

/** A lab item with a balanced handful of things (some yes, some no). */
function things(r: Rng, bank: LabThing[], n: number): LabThing[] {
  const yes = pickN(r, bank.filter((t) => t.yes), Math.ceil(n / 2));
  const no = pickN(r, bank.filter((t) => !t.yes), Math.floor(n / 2));
  return shuffle(r, [...yes, ...no]);
}
const lab = (key: string, prompt: string, make: (r: Rng) => LabSpec): Topic => ({
  key: `lab-${key}`,
  gen: (r): Activity => ({ kind: "lab", prompt, spec: make(r), skill: `s:${key}` }),
});
const floatLab = (n: number) => lab("float", "Will it sink or float?", (r) => ({ lab: "float", things: things(r, FLOAT_THINGS, n) }));
const magnetLab = (n: number) => lab("magnet", "Which things will the magnet pull?", (r) => ({ lab: "magnet", things: things(r, MAGNET_THINGS, n) }));
const circuitLab = (n: number) => lab("circuit", "Which things will light the bulb?", (r) => ({ lab: "circuit", things: things(r, CIRCUIT_THINGS, n) }));
const statesLab = (key: string, prompt: string, start: "solid" | "liquid" | "gas", goal: "solid" | "liquid" | "gas") => lab(key, prompt, () => ({ lab: "states", start, goal }));
const plantLab = lab("plant", "Give the plant everything it needs, then tap Grow!", () => ({ lab: "plant", need: ["sun", "water", "air", "soil"] }));
const shadowLab = (goal: "short" | "long" | "left" | "right", prompt: string) => lab(`shadow-${goal}`, prompt, () => ({ lab: "shadow", goal }));
const rampLab = (goal: "far" | "near", prompt: string) => lab(`ramp-${goal}`, prompt, () => ({ lab: "ramp", goal }));

const FLOAT_Q: Pol[] = [
  { q: "Why does a beach ball float?", e: "🏐🌊", a: "It's full of air", w: ["It's very heavy", "It's made of rock"], why: "Air is very light, so things full of air float." },
  { q: "Which one will sink?", e: "🌊❓", a: "A rock", w: ["A leaf", "A rubber duck"], why: "Rocks are heavy for their size, so they sink." },
  { q: "Which one will float?", e: "🌊❓", a: "A wooden block", w: ["A key", "A coin"], why: "Wood is lighter than the same amount of water." },
  { q: "Big ships are made of metal. Why don't they sink?", e: "🚢", a: "Their shape holds lots of air", w: ["Metal always floats", "The captain holds it up"], why: "A ship's wide, hollow shape is full of air, so it floats." },
  { q: "What happens to an ice cube in water?", e: "🧊🥤", a: "It floats", w: ["It sinks to the bottom", "It flies away"], why: "Ice is a little lighter than water, so it floats." },
  { q: "Does a big thing always sink?", e: "🐋", a: "No — big things can float too", w: ["Yes, always", "Only on Tuesdays"], why: "What matters is how heavy it is for its size, not just how big it is." },
  { q: "What does a scientist do BEFORE testing?", e: "🧪🤔", a: "Make a prediction", w: ["Go to sleep", "Throw everything away"], why: "Scientists guess first, then test to find out." },
  { q: "A coin sinks. What would help it float?", e: "🪙⛵", a: "Putting it on a little boat", w: ["Making it heavier", "Painting it"], why: "A boat spreads out and holds air, so it can carry the coin." },
];

/** Labs added to the content worlds, by world id (each becomes one more stage). */
const LAB_STAGES: Record<string, Stage[]> = {
  "plants-grow": [{ title: "Plant lab", emoji: "🌱", topics: [plantLab], levels: 1 }],
  weather: [{ title: "Ice lab", emoji: "🧊", topics: [statesLab("melt", "Melt the ice — turn it into water!", "solid", "liquid")], levels: 1 }],
  "push-pull": [{ title: "Ramp lab", emoji: "🎢", topics: [rampLab("far", "Make the car roll as far as it can!")], levels: 1 }],
  matter: [{ title: "Heat and cool lab", emoji: "🔥", topics: [statesLab("boil", "Heat the water until it turns into steam!", "liquid", "gas"), statesLab("freeze", "Cool the water until it freezes!", "liquid", "solid")], levels: 2 }],
  "sound-light": [{ title: "Shadow lab", emoji: "☀️", topics: [shadowLab("short", "Make the shortest shadow!"), shadowLab("long", "Make a long shadow!"), shadowLab("left", "Make the shadow point to the left!")], levels: 2 }],
  magnets: [{ title: "Magnet lab", emoji: "🧲", topics: [magnetLab(4)], levels: 2 }],
  "plant-parts": [{ title: "Plant lab", emoji: "🌱", topics: [plantLab], levels: 1 }],
  "water-cycle": [{ title: "Water lab", emoji: "💧", topics: [statesLab("evaporate", "Heat the water — make it evaporate!", "liquid", "gas"), statesLab("condense", "Cool the steam until it turns back into water!", "gas", "liquid")], levels: 1 }],
  forces: [{ title: "Ramp lab", emoji: "🎢", topics: [rampLab("far", "Make the car roll the farthest!"), rampLab("near", "Make the car stop as soon as it can!")], levels: 2 }],
  circuits: [{ title: "Circuit lab", emoji: "💡", topics: [circuitLab(4)], levels: 2 }],
  "matter-changes": [{ title: "States lab", emoji: "🌡️", topics: [statesLab("melt-boil", "Take ice all the way to steam!", "solid", "gas"), statesLab("condense", "Cool the steam back into water!", "gas", "liquid")], levels: 1 }],
};
/** A lab level mixes the experiment with quick questions from the island it sits on (a whole
 *  level of experiments is too long for little ones). */
const interleave = (a: Topic[], b: Topic[]) => Array.from({ length: Math.max(a.length, b.length) }, (_, k) => [a[k], b[k]]).flat().filter((t): t is Topic => !!t);
const withLabs = (w: WorldDef): WorldDef => ({
  ...w,
  stages: [...w.stages, ...(LAB_STAGES[w.id] ?? []).map((st) => ({ ...st, topics: interleave(st.topics, w.stages[0]?.topics ?? []), items: st.items ?? 4 }))],
});

/** Little sailors' own lab island. */
const FLOAT_WORLD: WorldDef = {
  id: "float-lab",
  title: "Sink or Float Shallows",
  emoji: "🌊",
  grade: "k",
  items: 5,
  blurb: "Predict, drop it in, and find out!",
  talk: ["What was the most surprising thing that floated or sank?", "Why do you think big ships float?"],
  challenge: "Fill a bowl with water. Guess, then test: a spoon, a leaf, a crayon and a toy. Which float?",
  stages: [
    { title: "Sink or float?", emoji: "⛵", topics: [floatLab(3), politeT("float-why", FLOAT_Q, true, "s")], levels: 2, items: 4 },
    { title: "Why things float", emoji: "🤔", topics: [politeT("float-why", FLOAT_Q, true, "s"), floatLab(3)], levels: 1, items: 4 },
    { title: "Float lab", emoji: "🧪", topics: [floatLab(4)], levels: 1, items: 2 },
  ],
};

const order = (worlds: WorldDef[]) => worlds.map(withLabs);
/** Pre-K–K, then the float lab, then 1st–2nd, then 3rd–5th. */
const WORLDS: WorldDef[] = [...order(LITTLE_WORLDS), FLOAT_WORLD, ...order(MIDDLE_WORLDS), ...order(BIG_WORLDS)];

export const SCIENCE: Course = {
  id: "science",
  title: "Discovery",
  emoji: "🔬",
  tagline: "Science you can try",
  units: buildWorlds("science", "sci", WORLDS, 0),
  itemsFor: makeItemsFor(WORLDS),
};
