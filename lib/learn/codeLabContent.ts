import type { Activity, Band, Block, CodeLevel, ConceptId, EvAction, FactoryCond, FactoryItem, FactoryRule, MachineStep, RecipeStep, VarLine } from "./types";
import { type Rng, int, pick, pickN, shuffle } from "./gen";
import { blk, rep, ARROWS, BOAT, MOVES, NOTES, makeMap, makeBug } from "./codeGen";
import { blockCount, runLevel } from "./program";
import { applyMachine, machineText, recipeFail, route, runVar, shiftText } from "./codelab";

// Code Lab content: the scripts for the concept cards, Robot Chef's recipe book, the Sorting
// Factory's catalog, Event Studio's little apps, and generators for every coding game. Generated
// puzzles are checked as they're made (a predicted cell really is where the boat stops, a buggy
// program really fails, a factory rule really sorts), and scripts/check-learn.mjs checks them all
// again.

// ── Concept cards ────────────────────────────────────────────────────────────────────────────
type ConceptText = { title: string; kid: string[]; big: string[] };
export const CONCEPTS: Record<ConceptId, ConceptText> = {
  program: {
    title: "What is a program?",
    kid: ["A program is a list of steps for a computer.", "The computer does the steps one at a time, in order.", "It does exactly what the steps say. Nothing more!"],
    big: ["A program is a list of instructions that a computer follows.", "It runs them one at a time, top to bottom, in order.", "A computer does EXACTLY what the code says — not what you meant. That's why every step matters."],
  },
  bug: {
    title: "What is a bug?",
    kid: ["Uh oh! This program has a bug. A bug is a mistake.", "Let's find the step that's wrong.", "Fix it, and now it works! Fixing bugs is called debugging."],
    big: ["A bug is a mistake in a program. Even expert programmers make them every day.", "Debugging means running the program, watching where it goes wrong, and finding the step that caused it.", "Fix that step, run it again, and check. Run, watch, fix, repeat!"],
  },
  loop: {
    title: "What is a loop?",
    kid: ["The robot claps, and claps, and claps again!", "A loop says it just once: repeat six times.", "Same claps, fewer blocks. Loops do the repeating for you!"],
    big: ["When a program does the same steps again and again, writing them out each time is slow and easy to get wrong.", "A loop says it once, with a count: repeat 6 times.", "Same result, far fewer blocks. Real programs loop millions of times a second!"],
  },
  condition: {
    title: "What is an if?",
    kid: ["An if asks a question. Is it raining?", "If the answer is yes, take an umbrella!", "If the answer is no, do the else part. Sunglasses!"],
    big: ["An if-block checks a condition — something that is either true or false.", "If it's true, the program runs the first group of blocks.", "If it's false, it runs the else blocks instead. That's how programs make decisions."],
  },
  until: {
    title: "What is repeat until?",
    kid: ["Repeat until means: keep going until something is true.", "Is the robot at the door yet? No. No. No. Yes! Stop!"],
    big: ["Repeat-until keeps looping until a condition becomes true.", "Before each pass it checks the condition. You don't even need to know how many steps it will take!"],
  },
  function: {
    title: "What is a function?",
    kid: ["These three moves make a dance.", "Give them a name: dance! Now one name means all three moves.", "Say dance two times, and the robot does all six moves!"],
    big: ["These three moves happen together a lot.", "A function gives a group of blocks a name. Define it once: dance = wave, spin, clap.", "Now calling dance runs all three. Write it once, use it anywhere — and fix it in one place."],
  },
  variable: {
    title: "What is a variable?",
    kid: ["A variable is a box with a name. This box is called coins.", "The program can change what's inside. One more coin! One more!", "Games use variables for scores, lives and timers!"],
    big: ["A variable is a named box that stores a value. This one is called coins.", "The program can change it: coins = coins + 1 means take what's in the box, add 1, and put it back.", "Every game you've played uses variables — for the score, your lives, the timer, your position."],
  },
  event: {
    title: "What is an event?",
    kid: ["An event is something that happens, like a tap!", "Try it! Tap the frog, and it jumps.", "Apps and games are full of events: taps, clicks, keys and timers."],
    big: ["An event is something that happens — a tap, a click, a key press, a timer running out.", "A program can wait for an event, then react. Tap the frog and see!", "Every app works this way: when the button is tapped, do something."],
  },
  algorithm: {
    title: "What is an algorithm?",
    kid: ["An algorithm is a plan, step by step, that solves a problem.", "Let's find the biggest number. Look at each card, and keep the biggest one so far.", "A good algorithm works every time, with any cards!"],
    big: ["An algorithm is a step-by-step method for solving a problem.", "To find the biggest number: look at each card in turn, and remember the biggest so far.", "It works for 5 cards or 5 million. Computers are fast — algorithms make them smart."],
  },
  binary: {
    title: "How do computers count?",
    kid: ["Computers only understand two things: on and off. One and zero.", "Give each light a number: 8, 4, 2 and 1.", "Add the lights that are on. 4 plus 1 makes 5!"],
    big: ["Inside, a computer only stores on and off — 1 and 0. Each one is called a bit.", "Give each light a place value: 8, 4, 2, 1. Each is double the one on its right.", "Add the lights that are on: 0101 means 4 + 1 = 5. That's binary!"],
  },
  sorting: {
    title: "How do computers sort?",
    kid: ["Sorting means putting things in order, smallest to biggest.", "Look at two neighbors. If the left one is bigger, swap them!", "Keep going until nothing needs to swap. Sorted!"],
    big: ["Sorting puts things in order. Computers sort all day: contacts, scores, search results.", "Bubble sort compares neighbors: if the left one is bigger, swap them.", "Pass after pass, the biggest values bubble to the end — until nothing needs swapping."],
  },
  search: {
    title: "How do computers search fast?",
    kid: ["I picked a number from 1 to 16. How fast can you find it?", "Guess the middle: 8. It's higher, so 1 to 8 are gone, all at once!", "Each guess cuts the choices in half. 16, 8, 4, 2, 1. Just four guesses!"],
    big: ["Find a number from 1 to 16 in as few guesses as possible.", "Guess the middle. Higher or lower? Either way, half the numbers are gone in one guess.", "16 → 8 → 4 → 2 → 1: four guesses. For a million numbers it takes only 20! That's binary search."],
  },
  coordinates: {
    title: "What are coordinates?",
    kid: ["Coordinates are like an address on a grid.", "First, count across. That's x: 3.", "Then count up. That's y: 2. The treasure is at 3, 2!"],
    big: ["Coordinates name an exact spot on a grid.", "The first number, x, tells how far across.", "The second, y, tells how far up. (3, 2) means 3 across, 2 up. Games use them to place everything on screen."],
  },
  machine: {
    title: "What is a function machine?",
    kid: ["A function machine follows a rule.", "Put in 3. The rule is times 2. Out comes 6!", "Same rule every time. Put in 5, get 10."],
    big: ["A function takes an input, follows a rule, and gives an output.", "Input 3 → rule × 2 → output 6.", "Same rule every time: 5 gives 10. Find the rule from the examples, and you can predict any output."],
  },
  logic: {
    title: "What are AND, OR and NOT?",
    kid: ["AND means the light needs BOTH switches on.", "OR means the light needs at least ONE switch on.", "NOT flips it. On becomes off, and off becomes on!"],
    big: ["AND is true only when both inputs are true.", "OR is true when at least one input is true.", "NOT flips its input. Computer chips are built from billions of these tiny logic gates."],
  },
  cipher: {
    title: "What is a secret code?",
    kid: ["A secret code changes letters using a rule.", "The rule: move every letter one forward. A becomes B. B becomes C.", "HI becomes IJ! If you know the rule, you can decode the message."],
    big: ["A cipher scrambles a message with a rule, so only people who know the key can read it.", "A shift cipher moves every letter forward. Shift 1: A→B, B→C, Z wraps around to A.", "To decode, shift back. Your passwords and messages are protected by much stronger codes like this."],
  },
  nested: {
    title: "A loop inside a loop",
    kid: ["A loop can go inside another loop!", "The inside loop makes a row of four stars.", "The outside loop does that three times. Twelve stars!"],
    big: ["Loops can be nested: one loop inside another.", "The inner loop runs completely — 4 stars in a row — every time the outer loop runs once.", "Outer 3 × inner 4 = 12 stars. Nested loops draw grids, pictures and whole game boards."],
  },
  data: {
    title: "What is data?",
    kid: ["Data is information. Computers store pictures as data.", "This row is red, red, red, white, white, red.", "Shorter: 3 red, 2 white, 1 red. Saving space like that is called compression!"],
    big: ["Data is information a computer stores — numbers, words, pictures, sounds.", "A picture is a grid of colors: red, red, red, white, white, red.", "Write it shorter — 3 red, 2 white, 1 red — and it takes less space. That's compression."],
  },
  python: {
    title: "From blocks to Python",
    kid: ["Grown-up coders type their programs. One coding language is called Python.", "Every block has Python words. Repeat 3 times looks like this.", "The spaces at the front show what's inside the loop.", "print shows words on the screen. Ahoy, ahoy, ahoy!"],
    big: ["Real programmers type code as text. One of the most popular languages in the world is Python.", "Every block you know has Python words. Repeat 3 times becomes: for i in range(3):", "The spaces at the start of a line matter! They show which lines are INSIDE the loop.", "print() shows words on the screen — this loop prints Ahoy! three times. Now YOU read the code!"],
  },
};
export const concept = (id: ConceptId, band: Band): Activity => ({ kind: "concept", concept: id, title: CONCEPTS[id].title, lines: band === "big" ? CONCEPTS[id].big : CONCEPTS[id].kid });

// ── Robot Chef recipes ───────────────────────────────────────────────────────────────────────
type Recipe = { id: string; title: string; scene: string; done: string; doneEmoji: string; steps: RecipeStep[] };
const st = (id: string, text: string, emoji: string, needs?: string[], fail?: string, failEmoji?: string): RecipeStep => ({ id, text, emoji, needs, fail, failEmoji });
export const RECIPES: Recipe[] = [
  { id: "cereal", title: "Breakfast cereal", scene: "🍳", done: "Breakfast is served!", doneEmoji: "🥣", steps: [
    st("bowl", "Get a bowl", "🥣"),
    st("cereal", "Pour the cereal", "🌾", ["bowl"], "No bowl! Cereal all over the table!", "💥"),
    st("milk", "Pour the milk", "🥛", ["bowl"], "No bowl! Milk splashes everywhere!", "💦"),
    st("eat", "Eat it with a spoon", "🥄", ["cereal", "milk"], "There's nothing in the bowl to eat!", "🤷"),
  ] },
  { id: "teeth", title: "Brush your teeth", scene: "🪞", done: "Sparkly clean teeth!", doneEmoji: "😁", steps: [
    st("brush", "Get your toothbrush", "🪥"),
    st("paste", "Squeeze on toothpaste", "🧴", ["brush"], "Toothpaste squirts onto your hand!", "😖"),
    st("scrub", "Brush for two minutes", "⏱️", ["paste"], "Brushing with no toothpaste!", "😬"),
    st("rinse", "Rinse and spit", "💧", ["scrub"], "Rinsing before brushing? Silly robot!", "🙃"),
  ] },
  { id: "seed", title: "Plant a seed", scene: "🏡", done: "A sprout is growing!", doneEmoji: "🌱", steps: [
    st("dig", "Dig a hole", "🕳️"),
    st("drop", "Drop in the seed", "🌰", ["dig"], "The seed rolls away. There's no hole!", "💨"),
    st("cover", "Cover it with soil", "🟫", ["drop"], "Covering an empty hole!", "🤷"),
    st("water", "Water it", "💧", ["cover"], "Whoosh! The seed washes away!", "🌊"),
  ] },
  { id: "fish", title: "Feed the fish", scene: "🐠", done: "Happy, full fish!", doneEmoji: "🐟", steps: [
    st("open", "Open the fish food", "🥫"),
    st("pinch", "Take a pinch", "🤏", ["open"], "The lid is closed. No food comes out!", "🔒"),
    st("sprinkle", "Sprinkle it in the tank", "✨", ["pinch"], "Sprinkling… nothing!", "🤷"),
    st("close", "Close the food", "🔒", ["pinch"], "Closing the food before taking any!", "😅"),
  ] },
  { id: "sandwich", title: "A peanut butter sandwich", scene: "🍽️", done: "Lunch is ready!", doneEmoji: "🥪", steps: [
    st("bread", "Get two slices of bread", "🍞"),
    st("pb", "Spread peanut butter", "🥜", ["bread"], "Peanut butter on the plate. There's no bread!", "😳"),
    st("jelly", "Spread jelly", "🍓", ["bread"], "Jelly all over the counter!", "😅"),
    st("close", "Put the slices together", "🥪", ["pb", "jelly"], "An empty sandwich? Add the fillings first!", "🤨"),
    st("cut", "Cut it in half", "🔪", ["close"], "Cutting… nothing?", "🤔"),
  ] },
  { id: "dressed", title: "Get dressed", scene: "🚪", done: "Ready to go!", doneEmoji: "🧒", steps: [
    st("undies", "Put on underwear", "🩲"),
    st("pants", "Put on pants", "👖", ["undies"], "Underwear on the OUTSIDE? Silly robot!", "🤪"),
    st("socks", "Put on socks", "🧦"),
    st("shoes", "Put on shoes", "👟", ["socks", "pants"], "Socks over your shoes?!", "😂"),
    st("shirt", "Put on a shirt", "👕"),
  ] },
  { id: "snowman", title: "Build a snowman", scene: "🌨️", done: "Hello, snowman!", doneEmoji: "⛄", steps: [
    st("big", "Roll a big snowball", "❄️"),
    st("middle", "Stack a middle snowball", "⚪", ["big"], "It falls! There's nothing to stack it on.", "💥"),
    st("head", "Put the head on top", "🙂", ["middle"], "A head floating in the air!", "👻"),
    st("nose", "Push in a carrot nose", "🥕", ["head"], "A carrot nose… with no face!", "🤨"),
    st("scarf", "Wrap a scarf", "🧣", ["middle"], "A scarf with no snowman to wear it!", "🌬️"),
  ] },
  { id: "pizza", title: "Make a pizza", scene: "🏠", done: "Pizza night!", doneEmoji: "🍕", steps: [
    st("dough", "Stretch the dough", "🫓"),
    st("sauce", "Spread the sauce", "🍅", ["dough"], "Sauce all over the pan!", "😱"),
    st("cheese", "Sprinkle the cheese", "🧀", ["sauce"], "Cheese under the sauce?!", "🙃"),
    st("toppings", "Add toppings", "🍄", ["cheese"], "Toppings on bare dough!", "😬"),
    st("bake", "Bake it", "🔥", ["toppings"], "Baking a half-made pizza!", "😕"),
  ] },
  { id: "dogbath", title: "Give the dog a bath", scene: "🛁", done: "Squeaky clean pup!", doneEmoji: "🐶", steps: [
    st("fill", "Fill the tub", "🛁"),
    st("dog", "Put the dog in", "🐕", ["fill"], "The dog sits in an empty tub!", "😕"),
    st("shampoo", "Shampoo the fur", "🧴", ["dog"], "Shampoo on the floor. Where's the dog?", "🧼"),
    st("rinse", "Rinse off the bubbles", "🚿", ["shampoo"], "Rinsing a dog with no shampoo yet!", "💦"),
    st("dry", "Dry with a towel", "🧻", ["rinse"], "Drying a soapy dog!", "🧼"),
  ] },
  { id: "lemonade", title: "Lemonade stand", scene: "🏪", done: "Fresh lemonade!", doneEmoji: "🍋", steps: [
    st("pitcher", "Get a pitcher", "🫖"),
    st("water", "Pour in water", "💧", ["pitcher"], "Water all over the table — no pitcher!", "💦"),
    st("lemon", "Squeeze in lemons", "🍋", ["pitcher"], "Lemon juice drips on the floor!", "😖"),
    st("sugar", "Add sugar", "🍬", ["pitcher"], "Sugar spills everywhere!", "🧂"),
    st("stir", "Stir it up", "🥄", ["water", "lemon", "sugar"], "Stirring before everything is in!", "🌀"),
    st("pour", "Pour a cup", "🥤", ["stir"], "Lumpy, unstirred lemonade!", "😝"),
  ] },
  { id: "hands", title: "Wash your hands", scene: "🚰", done: "Clean hands, no germs!", doneEmoji: "🙌", steps: [
    st("on", "Turn on the water", "🚰"),
    st("wet", "Wet your hands", "💦", ["on"], "No water yet. Dry hands!", "🏜️"),
    st("soap", "Add soap", "🧼", ["wet"], "Wet your hands first so the soap can lather!", "🧼"),
    st("scrub", "Scrub for 20 seconds", "⏱️", ["soap"], "Scrubbing without soap won't wash the germs away!", "🦠"),
    st("rinse", "Rinse off the soap", "🌊", ["scrub"], "Rinsing before scrubbing!", "🙃"),
    st("dry", "Dry with a towel", "🧻", ["rinse"], "Drying soapy hands? Rinse first!", "🧼"),
  ] },
  { id: "letter", title: "Mail a letter", scene: "🏤", done: "On its way!", doneEmoji: "📬", steps: [
    st("write", "Write the letter", "✍️"),
    st("fold", "Fold it", "📄", ["write"], "Folding a blank page!", "🤷"),
    st("envelope", "Put it in an envelope", "✉️", ["fold"], "An empty envelope!", "😶"),
    st("address", "Write the address", "🏠", ["envelope"], "Writing an address on… nothing!", "🤔"),
    st("stamp", "Add a stamp", "🏷️", ["envelope"], "A stamp with nothing to stick to!", "😅"),
    st("mail", "Drop it in the mailbox", "📮", ["address", "stamp"], "The mail carrier can't deliver it without an address and a stamp!", "😕"),
  ] },
  { id: "cookies", title: "Bake cookies", scene: "🏠", done: "Warm cookies!", doneEmoji: "🍪", steps: [
    st("preheat", "Preheat the oven", "🔥"),
    st("mix", "Mix the dough", "🥣"),
    st("shape", "Roll the dough into balls", "⚪", ["mix"], "Rolling… nothing? Make the dough first!", "🤔"),
    st("tray", "Put them on a tray", "🍽️", ["shape"], "An empty tray!", "😶"),
    st("bake", "Bake for 10 minutes", "⏲️", ["tray", "preheat"], "The oven isn't hot yet, or there's nothing to bake!", "🥶"),
    st("cool", "Let them cool", "❄️", ["bake"], "Cooling raw dough!", "🙃"),
    st("eat", "Eat one!", "😋", ["cool"], "Ouch! Too hot!", "🥵"),
  ] },
  { id: "rocket", title: "Launch a rocket", scene: "🌌", done: "Liftoff!", doneEmoji: "🚀", steps: [
    st("fuel", "Fill the fuel tanks", "⛽"),
    st("crew", "Astronauts climb in", "🧑‍🚀"),
    st("hatch", "Close the hatch", "🚪", ["crew"], "Closing the door before the crew gets in!", "😱"),
    st("check", "Check every system", "✅", ["fuel", "hatch"], "Checking a rocket with no fuel and an open door!", "⚠️"),
    st("count", "Count down: 3, 2, 1!", "🔢", ["check"], "Wait! Nothing has been checked yet!", "✋"),
    st("launch", "Blast off!", "🔥", ["count"], "Blast off before the countdown?!", "😵"),
  ] },
];
const RECIPE_BY_ID = new Map(RECIPES.map((r) => [r.id, r]));

/** A Robot Chef level. `buggy`: start with a broken order to fix (one swap that breaks it). */
export function recipeAct(r: Rng, id: string, buggy = false): Activity {
  const rec = RECIPE_BY_ID.get(id)!;
  let start: string[] | undefined;
  if (buggy) {
    const ids = rec.steps.map((s) => s.id);
    for (let tries = 0; tries < 40 && !start; tries++) {
      const i = int(r, 0, ids.length - 2);
      const j = int(r, i + 1, ids.length - 1);
      const o = [...ids];
      [o[i], o[j]] = [o[j], o[i]];
      if (recipeFail(o, rec.steps) >= 0) start = o;
    }
  }
  return { kind: "recipe", title: rec.title, scene: rec.scene, steps: rec.steps, done: rec.done, doneEmoji: rec.doneEmoji, buggy: start, skill: buggy ? "c:debugging" : "c:sequencing" };
}

// ── Sorting Factory ──────────────────────────────────────────────────────────────────────────
const T = (emoji: string, name: string, ...tags: string[]): FactoryItem => ({ id: name.replace(/\s+/g, "-"), emoji, name, tags });
const THINGS: FactoryItem[] = [
  T("🍎", "apple", "red", "fruit", "food", "round"), T("🍓", "strawberry", "red", "fruit", "food"), T("🍒", "cherries", "red", "fruit", "food", "round"),
  T("🍌", "banana", "yellow", "fruit", "food"), T("🍋", "lemon", "yellow", "fruit", "food"), T("🍇", "grapes", "purple", "fruit", "food"), T("🍊", "orange", "orange", "fruit", "food", "round"), T("🍐", "pear", "green", "fruit", "food"),
  T("🥕", "carrot", "orange", "vegetable", "food"), T("🥦", "broccoli", "green", "vegetable", "food"), T("🌽", "corn", "yellow", "vegetable", "food"), T("🥒", "cucumber", "green", "vegetable", "food"), T("🌶️", "pepper", "red", "vegetable", "food"), T("🥔", "potato", "brown", "vegetable", "food"),
  T("🔴", "red circle", "red", "circle", "shape", "round"), T("🔵", "blue circle", "blue", "circle", "shape", "round"), T("🟡", "yellow circle", "yellow", "circle", "shape", "round"), T("🟢", "green circle", "green", "circle", "shape", "round"),
  T("🟥", "red square", "red", "square", "shape"), T("🟦", "blue square", "blue", "square", "shape"), T("🟨", "yellow square", "yellow", "square", "shape"), T("🟩", "green square", "green", "square", "shape"),
  T("🔺", "red triangle", "red", "triangle", "shape"), T("🔷", "blue diamond", "blue", "diamond", "shape"),
  T("🐟", "fish", "animal", "water", "swims"), T("🐬", "dolphin", "animal", "water", "swims", "mammal"), T("🐙", "octopus", "animal", "water", "swims"), T("🦀", "crab", "animal", "water", "red"),
  T("🦆", "duck", "animal", "wings", "bird", "water"), T("🐦", "bird", "animal", "wings", "bird"), T("🦉", "owl", "animal", "wings", "bird"), T("🦋", "butterfly", "animal", "wings", "insect"), T("🐝", "bee", "animal", "wings", "insect", "yellow"),
  T("🐶", "dog", "animal", "land", "mammal"), T("🐱", "cat", "animal", "land", "mammal"), T("🐴", "horse", "animal", "land", "mammal"), T("🐢", "turtle", "animal", "land", "water"), T("🐘", "elephant", "animal", "land", "mammal"),
  T("⚽", "ball", "toy", "round"), T("🧸", "teddy bear", "toy"), T("🪁", "kite", "toy"), T("🚗", "toy car", "toy", "red"),
];
const C = (id: string, label: string, icon: string, ...tags: string[]): FactoryCond => ({ id, label, icon, tags });
type FactorySet = { prompt: string; bins: { id: string; label: string; emoji: string }[]; conds: FactoryCond[]; answer: FactoryRule[]; elseBin: string; pool: (it: FactoryItem) => boolean; n: number };
const FACTORY: Record<string, FactorySet> = {
  red: { prompt: "Send the RED things to the red bin. Everything else goes in the gray bin.", bins: [{ id: "r", label: "Red bin", emoji: "🟥" }, { id: "x", label: "Gray bin", emoji: "⬜" }], conds: [C("red", "is red", "🔴", "red"), C("blue", "is blue", "🔵", "blue"), C("round", "is round", "⚪", "round")], answer: [{ cond: "red", bin: "r" }], elseBin: "x", pool: (it) => it.tags.includes("shape") || it.tags.includes("fruit"), n: 6 },
  animal: { prompt: "Animals go to the zoo bin. Everything else goes to the toy box.", bins: [{ id: "z", label: "Zoo", emoji: "🦁" }, { id: "t", label: "Toy box", emoji: "🧸" }], conds: [C("animal", "is an animal", "🐾", "animal"), C("food", "is food", "🍽️", "food"), C("toy", "is a toy", "🧸", "toy")], answer: [{ cond: "animal", bin: "z" }], elseBin: "t", pool: (it) => it.tags.includes("animal") || it.tags.includes("toy"), n: 6 },
  circle: { prompt: "Circles go in the circle bin. Everything else goes in the other bin.", bins: [{ id: "c", label: "Circles", emoji: "⚪" }, { id: "o", label: "Other shapes", emoji: "🔶" }], conds: [C("circle", "is a circle", "⚪", "circle"), C("square", "is a square", "⬛", "square"), C("red", "is red", "🔴", "red")], answer: [{ cond: "circle", bin: "c" }], elseBin: "o", pool: (it) => it.tags.includes("shape"), n: 6 },
  wings: { prompt: "Animals with wings go to the sky bin. The rest go to the ground bin.", bins: [{ id: "s", label: "Sky", emoji: "☁️" }, { id: "g", label: "Ground", emoji: "🌳" }], conds: [C("wings", "has wings", "🕊️", "wings"), C("water", "lives in water", "🌊", "water"), C("mammal", "is a mammal", "🐾", "mammal")], answer: [{ cond: "wings", bin: "s" }], elseBin: "g", pool: (it) => it.tags.includes("animal") && !it.tags.includes("water"), n: 6 },
  produce: { prompt: "Fruit to the fruit bin, vegetables to the veggie bin, everything else to the other bin.", bins: [{ id: "f", label: "Fruit", emoji: "🍎" }, { id: "v", label: "Veggies", emoji: "🥦" }, { id: "o", label: "Other", emoji: "📦" }], conds: [C("fruit", "is a fruit", "🍎", "fruit"), C("veg", "is a vegetable", "🥦", "vegetable"), C("red", "is red", "🔴", "red"), C("toy", "is a toy", "🧸", "toy")], answer: [{ cond: "fruit", bin: "f" }, { cond: "veg", bin: "v" }], elseBin: "o", pool: (it) => it.tags.includes("food") || it.tags.includes("toy"), n: 8 },
  colors: { prompt: "Red things to the red bin, blue things to the blue bin, everything else to the gray bin.", bins: [{ id: "r", label: "Red", emoji: "🟥" }, { id: "b", label: "Blue", emoji: "🟦" }, { id: "x", label: "Gray", emoji: "⬜" }], conds: [C("red", "is red", "🔴", "red"), C("blue", "is blue", "🔵", "blue"), C("circle", "is a circle", "⚪", "circle")], answer: [{ cond: "red", bin: "r" }, { cond: "blue", bin: "b" }], elseBin: "x", pool: (it) => it.tags.includes("shape"), n: 8 },
  habitat: { prompt: "Water animals to the sea tank, winged animals to the sky cage, the rest to the field.", bins: [{ id: "w", label: "Sea tank", emoji: "🌊" }, { id: "s", label: "Sky cage", emoji: "☁️" }, { id: "l", label: "Field", emoji: "🌳" }], conds: [C("water", "lives in water", "🌊", "water"), C("wings", "has wings", "🕊️", "wings"), C("mammal", "is a mammal", "🐾", "mammal")], answer: [{ cond: "water", bin: "w" }, { cond: "wings", bin: "s" }], elseBin: "l", pool: (it) => it.tags.includes("animal") && !(it.tags.includes("water") && it.tags.includes("wings")), n: 8 },
  redCircle: { prompt: "RED circles go to bin A. Other circles go to bin B. Everything else goes to bin C.", bins: [{ id: "a", label: "A: red circles", emoji: "🔴" }, { id: "b", label: "B: other circles", emoji: "🔵" }, { id: "c", label: "C: everything else", emoji: "📦" }], conds: [C("redCircle", "is red AND a circle", "🔴⚪", "red", "circle"), C("circle", "is a circle", "⚪", "circle"), C("red", "is red", "🔴", "red"), C("square", "is a square", "⬛", "square")], answer: [{ cond: "redCircle", bin: "a" }, { cond: "circle", bin: "b" }], elseBin: "c", pool: (it) => it.tags.includes("shape"), n: 8 },
  redFruit: { prompt: "Red fruit to the jam pot, other fruit to the fruit bowl, everything else to the pantry.", bins: [{ id: "j", label: "Jam pot", emoji: "🍯" }, { id: "f", label: "Fruit bowl", emoji: "🥣" }, { id: "p", label: "Pantry", emoji: "🗄️" }], conds: [C("redFruit", "is red AND a fruit", "🔴🍎", "red", "fruit"), C("fruit", "is a fruit", "🍎", "fruit"), C("red", "is red", "🔴", "red"), C("veg", "is a vegetable", "🥦", "vegetable")], answer: [{ cond: "redFruit", bin: "j" }, { cond: "fruit", bin: "f" }], elseBin: "p", pool: (it) => it.tags.includes("food"), n: 8 },
  order: { prompt: "Watch the ORDER! Red things go to the red bin first; then any circle left goes to the circle bin; the rest to gray.", bins: [{ id: "r", label: "Red", emoji: "🟥" }, { id: "c", label: "Circles", emoji: "⚪" }, { id: "x", label: "Gray", emoji: "⬜" }], conds: [C("red", "is red", "🔴", "red"), C("circle", "is a circle", "⚪", "circle"), C("blue", "is blue", "🔵", "blue")], answer: [{ cond: "red", bin: "r" }, { cond: "circle", bin: "c" }], elseBin: "x", pool: (it) => it.tags.includes("shape"), n: 8 },
};
/** A factory level: items that land in every bin (and, for order/AND rules, the tricky ones). */
export function factoryAct(r: Rng, key: keyof typeof FACTORY): Activity {
  const f = FACTORY[key];
  const pool = THINGS.filter(f.pool);
  const byBin = new Map<string, FactoryItem[]>();
  for (const it of pool) {
    const b = route(it, f.answer, f.elseBin, f.conds);
    byBin.set(b, [...(byBin.get(b) ?? []), it]);
  }
  const per = Math.max(2, Math.floor(f.n / f.bins.length));
  let items = f.bins.flatMap((b) => pickN(r, byBin.get(b.id) ?? [], per));
  // Rules where order matters need an item that two rules both match (a red circle).
  if ((key === "order" || key === "redCircle") && !items.some((it) => it.tags.includes("red") && it.tags.includes("circle"))) items = [...items.slice(1), THINGS.find((t) => t.name === "red circle")!];
  return { kind: "factory", prompt: f.prompt, items: shuffle(r, items), bins: f.bins, conds: f.conds, answer: f.answer, elseBin: f.elseBin, skill: "c:conditionals" };
}
export const FACTORY_KEYS = Object.keys(FACTORY) as (keyof typeof FACTORY)[];

// ── Event Studio ─────────────────────────────────────────────────────────────────────────────
const A = (id: string, label: string, icon: string, fx: EvAction["fx"]): EvAction => ({ id, label, icon, fx });
const ACTIONS: EvAction[] = [
  A("jump", "Jump", "⬆️", "jump"), A("spin", "Spin", "🌀", "spin"), A("grow", "Grow big", "🔍", "grow"), A("shake", "Shake", "〰️", "shake"), A("glow", "Light up", "✨", "glow"),
  A("sing", "Play a sound", "🎵", "sing"), A("hide", "Hide / show", "👻", "hide"), A("count", "Add 1 point", "➕", "count"), A("rain", "Sparkle", "🎆", "rain"), A("color", "Change color", "🎨", "color"),
];
type EvApp = { prompt: string; story: string; sprites: [id: string, emoji: string, name: string, action: string][] };
const APPS: EvApp[] = [
  { prompt: "Make the Pet Party app", story: "When you tap the dog, it jumps. When you tap the cat, it spins. When you tap the bird, it plays a sound.", sprites: [["dog", "🐶", "Dog", "jump"], ["cat", "🐱", "Cat", "spin"], ["bird", "🐦", "Bird", "sing"]] },
  { prompt: "Make the Night Lights app", story: "Tapping the lamp lights it up. Tapping the moon changes its color. Tapping the owl hides it.", sprites: [["lamp", "💡", "Lamp", "glow"], ["moon", "🌙", "Moon", "color"], ["owl", "🦉", "Owl", "hide"]] },
  { prompt: "Make the Coin Catcher game", story: "Every tap on the coin adds 1 point. The gem sparkles. The bomb shakes.", sprites: [["coin", "🪙", "Coin", "count"], ["gem", "💎", "Gem", "rain"], ["bomb", "💣", "Bomb", "shake"]] },
  { prompt: "Make the Garden app", story: "Tap the flower to make it grow big. Tap the bee to shake it. Tap the butterfly to spin.", sprites: [["flower", "🌻", "Flower", "grow"], ["bee", "🐝", "Bee", "shake"], ["butterfly", "🦋", "Butterfly", "spin"]] },
  { prompt: "Make the Band app", story: "The drum plays a sound. The guitar plays a sound too. The star lights up.", sprites: [["drum", "🥁", "Drum", "sing"], ["guitar", "🎸", "Guitar", "sing"], ["star", "⭐", "Star", "glow"]] },
  { prompt: "Make the Space app", story: "Tap the rocket to jump. Tap the planet to spin. Tap the alien to change its color.", sprites: [["rocket", "🚀", "Rocket", "jump"], ["planet", "🪐", "Planet", "spin"], ["alien", "👾", "Alien", "color"]] },
  { prompt: "Make the Farm app", story: "The cow plays a sound. The pig jumps. The chick grows big.", sprites: [["cow", "🐮", "Cow", "sing"], ["pig", "🐷", "Pig", "jump"], ["chick", "🐤", "Chick", "grow"]] },
  { prompt: "Make the Weather app", story: "Tap the cloud to sparkle. Tap the sun to light it up. Tap the snowman to shake.", sprites: [["cloud", "☁️", "Cloud", "rain"], ["sun", "☀️", "Sun", "glow"], ["snowman", "⛄", "Snowman", "shake"]] },
  { prompt: "Make the Sea app", story: "The fish hides when tapped. The octopus changes color. The whale plays a sound. The crab adds 1 point.", sprites: [["fish", "🐠", "Fish", "hide"], ["octopus", "🐙", "Octopus", "color"], ["whale", "🐳", "Whale", "sing"], ["crab", "🦀", "Crab", "count"]] },
  { prompt: "Make the Party app", story: "The balloon grows big. The gift jumps. The cake sparkles. The party popper plays a sound.", sprites: [["balloon", "🎈", "Balloon", "grow"], ["gift", "🎁", "Gift", "jump"], ["cake", "🎂", "Cake", "rain"], ["popper", "🎉", "Popper", "sing"]] },
];
/** An Event Studio level. `n` = how many characters to wire (2 for little ones). */
export function eventsAct(r: Rng, n: number): Activity {
  const app = pick(r, APPS.filter((a) => a.sprites.length >= n));
  const used = app.sprites.slice(0, n);
  const need = [...new Set(used.map((s) => s[3]))];
  const extra = pickN(r, ACTIONS.filter((a) => !need.includes(a.id)), Math.max(1, 4 - need.length));
  const story = n === app.sprites.length ? app.story : used.map(([, , name, act]) => `Tap the ${name.toLowerCase()}: ${ACTIONS.find((a) => a.id === act)!.label.toLowerCase()}.`).join(" ");
  return {
    kind: "events",
    prompt: app.prompt,
    story,
    sprites: used.map(([id, emoji, name]) => ({ id, emoji, name })),
    actions: shuffle(r, [...ACTIONS.filter((a) => need.includes(a.id)), ...extra]),
    goal: used.map(([id, , , action]) => ({ sprite: id, action })),
    skill: "c:events",
  };
}

// ── Variables ────────────────────────────────────────────────────────────────────────────────
const VARS: [string, string][] = [["coins", "🪙"], ["score", "🏆"], ["stars", "⭐"], ["apples", "🍎"], ["gems", "💎"], ["steps", "👣"], ["points", "🎯"], ["fish", "🐟"], ["lives", "❤️"], ["shells", "🐚"]];
const set = (n: number): VarLine => ({ op: "set", n });
const add = (n: number): VarLine => ({ op: "add", n });
const sub = (n: number): VarLine => ({ op: "sub", n });
const mul = (n: number): VarLine => ({ op: "mul", n });
/** Treasure Counter: tier 1 (add twice) → 2 (a loop) → 3 (loop with + and −) → 4 (an if in a loop) → 5 (doubling, nested). */
export function variableAct(r: Rng, tier: 1 | 2 | 3 | 4 | 5): Activity {
  const [name, emoji] = pick(r, VARS);
  let lines: VarLine[];
  const wrong: number[] = [];
  const a = int(r, 0, 5);
  if (tier === 1) {
    const b = int(r, 1, 5), c = int(r, 1, 4);
    lines = [set(a), add(b), add(c)];
    wrong.push(a + b, b + c, a + b + c + 1);
  } else if (tier === 2) {
    const n = int(r, 2, 4), b = int(r, 2, 5);
    lines = [set(a), { op: "repeat", n, body: [add(b)] }];
    wrong.push(a + b, a + b * (n + 1), a + b * (n - 1), b * n);
  } else if (tier === 3) {
    const n = int(r, 2, 4), b = int(r, 3, 6), c = int(r, 1, b - 1);
    lines = [set(a + 2), { op: "repeat", n, body: [add(b), sub(c)] }];
    wrong.push(a + 2 + b * n, a + 2 + (b - c), a + 2 - c * n, a + 2 + (b - c) * (n + 1));
  } else if (tier === 4) {
    const n = int(r, 3, 5), b = int(r, 2, 4), t = int(r, 4, 8), c = int(r, 1, 3);
    lines = [set(a), { op: "repeat", n, body: [add(b), { op: "if", cmp: ">", n: t, body: [sub(c)] }] }];
    wrong.push(a + b * n, a + (b - c) * n, a + b * n - c);
  } else {
    const n = int(r, 2, 4);
    lines = r() < 0.5 ? [set(int(r, 1, 3)), { op: "repeat", n, body: [mul(2)] }] : [set(0), { op: "repeat", n, body: [{ op: "repeat", n: int(r, 2, 3), body: [add(int(r, 1, 3))] }] }];
    const v = runVar(lines).value;
    wrong.push(v / 2, v + 2, v * 2, v - 1);
  }
  const answer = runVar(lines).value;
  const opts = [...new Set(wrong.filter((w) => Number.isInteger(w) && w >= 0 && w !== answer))];
  for (let d = 1; opts.length < 3; d++) [answer + d, answer - d].forEach((w) => w >= 0 && w !== answer && !opts.includes(w) && opts.push(w));
  return { kind: "variable", name, emoji, lines, options: shuffle(r, [answer, ...pickN(r, opts, 3)]), answer, skill: "c:variables" };
}

// ── Loop Detective ───────────────────────────────────────────────────────────────────────────
const minPeriod = (s: string[]) => {
  for (let p = 1; p <= s.length; p++) if (s.every((x, i) => x === s[i % p])) return p;
  return s.length;
};
const PAL: Record<"dance" | "arrows" | "notes", readonly string[]> = { dance: MOVES, arrows: ARROWS, notes: NOTES };
export function loopFindAct(r: Rng, pal: "dance" | "arrows" | "notes", unit: [number, number], times: [number, number], tail = false): Activity {
  const ops = PAL[pal];
  for (let tries = 0; tries < 80; tries++) {
    const u = int(r, unit[0], unit[1]);
    const n = int(r, times[0], times[1]);
    const chunk = Array.from({ length: u }, () => pick(r, ops));
    if (minPeriod(chunk) !== u) continue;
    const seq = Array.from({ length: n }, () => chunk).flat();
    const tl = tail ? [pick(r, ops.filter((o) => o !== chunk[0]))] : [];
    const all = [...seq, ...tl];
    const decoys: string[][] = [];
    const changed = [...chunk];
    changed[u - 1] = pick(r, ops.filter((o) => o !== chunk[u - 1] && o !== chunk[0]));
    for (const d of [changed, all.slice(0, u + 1), all.slice(1, u + 1)]) {
      const k = d.join(",");
      if (d.length && k !== chunk.join(",") && !decoys.some((x) => x.join(",") === k)) decoys.push(d);
    }
    if (decoys.length < 2) continue;
    return { kind: "loopfind", ops: all, unit: u, times: n, decoys: decoys.slice(0, 2), skill: "c:loops" };
  }
  return { kind: "loopfind", ops: ["clap", "jump", "clap", "jump", "clap", "jump"], unit: 2, times: 3, decoys: [["clap", "clap"], ["clap", "jump", "clap"]], skill: "c:loops" };
}

// ── Predict ──────────────────────────────────────────────────────────────────────────────────
/** All the actions a program would do (repeats expanded) — the "song" a music program plays. */
export function expand(p: Block[]): string[] {
  return p.flatMap((b) => (b.op === "repeat" ? Array.from({ length: b.n ?? 2 }, () => expand(b.body ?? [])).flat() : [b.op]));
}
const D: Record<string, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPP: Record<string, string> = { up: "down", down: "up", left: "right", right: "left" };
/** Where will the boat stop? A small sea, a program (with a loop for older kids) that stays on
 *  the water — and the answer is wherever it ends (usually NOT the island: you have to trace it). */
export function predictEnd(r: Rng, o: { w: number; h: number; loop: boolean; rocks: number; rover?: boolean }): Activity {
  for (let tries = 0; tries < 200; tries++) {
    const sx = int(r, 0, o.w - 1), sy = int(r, 0, o.h - 1);
    // No silly back-and-forth: a move is never followed by its opposite.
    const walk = (n: number, after?: string) => {
      const out: string[] = [];
      for (let k = 0; k < n; k++) out.push(pick(r, ARROWS.filter((op) => op !== OPP[out[k - 1] ?? after ?? ""])));
      return out;
    };
    let prog: Block[];
    if (o.loop) {
      const chunk = walk(int(r, 1, 2));
      if (chunk.length === 2 && OPP[chunk[1]] === chunk[0]) continue;
      prog = [rep(int(r, 2, 3), ...chunk.map(blk)), ...(r() < 0.6 ? walk(1, chunk[chunk.length - 1]).map(blk) : [])];
    } else prog = walk(int(r, 3, 5)).map(blk);
    const path = [[sx, sy]];
    let x = sx, y = sy, ok = true;
    for (const op of expand(prog)) {
      x += D[op][0];
      y += D[op][1];
      if (x < 0 || y < 0 || x >= o.w || y >= o.h) ok = false;
      path.push([x, y]);
    }
    if (!ok || (x === sx && y === sy)) continue;
    const onPath = new Set(path.map(([a, b]) => `${a},${b}`));
    const free = [];
    for (let yy = 0; yy < o.h; yy++) for (let xx = 0; xx < o.w; xx++) if (!onPath.has(`${xx},${yy}`)) free.push([xx, yy]);
    if (free.length < o.rocks + 1) continue;
    const picks = pickN(r, free, o.rocks + 1);
    const rows: string[][] = Array.from({ length: o.h }, (_, yy) => Array.from({ length: o.w }, (_, xx) => (xx === sx && yy === sy ? "S" : ".")));
    picks.slice(0, o.rocks).forEach(([xx, yy]) => (rows[yy][xx] = "#"));
    const [gx, gy] = picks[o.rocks];
    rows[gy][gx] = "G";
    const map = rows.map((row) => row.join(""));
    const level: CodeLevel = { sim: o.rover ? "rover" : "sea", goal: "", palette: ARROWS, maps: [map], facing: "right", solution: prog, best: blockCount(prog) };
    if (runLevel(level, prog).results[0].fail) continue;
    return { kind: "predict", level, program: prog, ask: "end", skill: "c:predict" };
  }
  throw new Error("predictEnd: no level");
}
/** Captain's View: forward and turns are from the BOAT's point of view — trace where it ends. */
export function predictEndBoat(r: Rng, o: { w: number; h: number; rocks: number }): Activity {
  for (let tries = 0; tries < 300; tries++) {
    const sx = int(r, 0, o.w - 1), sy = int(r, 0, o.h - 1);
    const n = int(r, 4, 6);
    const ops: string[] = [];
    for (let k = 0; k < n; k++) {
      const prev = ops[k - 1];
      // Never two turns that cancel out, and never end on a turn (it would not move anywhere).
      const choices = k === n - 1 ? ["fwd"] : prev === "tl" ? ["fwd", "tl"] : prev === "tr" ? ["fwd", "tr"] : ["fwd", "fwd", "tl", "tr"];
      ops.push(pick(r, choices));
    }
    if (!ops.some((x) => x !== "fwd")) continue;
    const prog = ops.map(blk);
    // Trace it by hand (an engine run on a map without an island would stop at a default goal).
    let x = sx, y = sy, f = 0; // 0 right · 1 down · 2 left · 3 up
    const path = new Set([`${sx},${sy}`]);
    let ok = true;
    for (const op of ops) {
      if (op === "tl") f = (f + 3) % 4;
      else if (op === "tr") f = (f + 1) % 4;
      else {
        x += [1, 0, -1, 0][f];
        y += [0, 1, 0, -1][f];
        if (x < 0 || y < 0 || x >= o.w || y >= o.h) ok = false;
        path.add(`${x},${y}`);
      }
    }
    if (!ok || (x === sx && y === sy)) continue;
    const rows: string[][] = Array.from({ length: o.h }, (_, yy) => Array.from({ length: o.w }, (_, xx) => (xx === sx && yy === sy ? "S" : ".")));
    const free: [number, number][] = [];
    for (let yy = 0; yy < o.h; yy++) for (let xx = 0; xx < o.w; xx++) if (!path.has(`${xx},${yy}`)) free.push([xx, yy]);
    if (free.length < o.rocks + 1) continue;
    const spots = pickN(r, free, o.rocks + 1);
    spots.slice(0, o.rocks).forEach(([xx, yy]) => (rows[yy][xx] = "#"));
    rows[spots[o.rocks][1]][spots[o.rocks][0]] = "G";
    const level: CodeLevel = { sim: "sea", goal: "", palette: BOAT, maps: [rows.map((row) => row.join(""))], facing: "right", solution: prog, best: prog.length };
    if (runLevel(level, prog).results[0].fail) continue;
    return { kind: "predict", level, program: prog, ask: "end", skill: "c:turning" };
  }
  throw new Error("predictEndBoat: no level");
}

/** How many bells will ring / moves will the robot do? (Loops multiply!) */
export function predictCount(r: Rng, sim: "music" | "dance", nested: boolean): Activity {
  const pal = sim === "music" ? NOTES : MOVES;
  const body = Array.from({ length: int(r, 2, 3) }, () => blk(pick(r, pal)));
  const prog: Block[] = nested ? [rep(int(r, 2, 3), rep(int(r, 2, 3), ...body.slice(0, 2)), blk(pick(r, pal)))] : [rep(int(r, 2, 4), ...body), ...(r() < 0.6 ? [blk(pick(r, pal))] : [])];
  const target = expand(prog);
  const level: CodeLevel = { sim, goal: "", palette: [...pal], target, loops: true, solution: prog, best: blockCount(prog) };
  return { kind: "predict", level, program: prog, ask: "count", answer: target.length, skill: "c:predict" };
}
/** Which program reaches the island? One right answer and two believable bugs. */
export function predictPick(r: Rng, o: { w: number; h: number; rocks: number; len: [number, number]; turns: number }): Activity {
  for (let tries = 0; tries < 60; tries++) {
    const { map, ops } = makeMap(r, { w: o.w, h: o.h, rocks: o.rocks, len: o.len, turns: o.turns });
    const solution = ops.map(blk);
    const level: CodeLevel = { sim: "sea", goal: "", palette: ARROWS, maps: [map], facing: "right", solution, best: solution.length };
    const bugs: Block[][] = [];
    for (let k = 0; k < 12 && bugs.length < 2; k++) {
      const b = makeBug(r, level, solution);
      const key = JSON.stringify(b);
      if (!runLevel(level, b).won && key !== JSON.stringify(solution) && !bugs.some((x) => JSON.stringify(x) === key)) bugs.push(b);
    }
    if (bugs.length < 2) continue;
    return { kind: "predict", level, program: solution, ask: "pick", options: [solution, ...bugs], skill: "c:predict" };
  }
  throw new Error("predictPick: no level");
}

// ── Quick puzzles ────────────────────────────────────────────────────────────────────────────
export function binaryAct(r: Rng, bits: number, mode: "make" | "read"): Activity {
  const max = 2 ** bits - 1;
  const target = int(r, Math.max(1, bits > 3 ? 3 : 1), max);
  const options = mode === "read" ? shuffle(r, [target, ...pickN(r, [target + 1, target - 1, target + 2, target ^ 1, target ^ 2].filter((v, i, a) => v > 0 && v <= max && v !== target && a.indexOf(v) === i), 2)]) : undefined;
  return { kind: "binary", bits, mode, target, options, skill: "c:binary" };
}
export const searchAct = (max: number, coach = false): Activity => ({ kind: "search", max, limit: Math.ceil(Math.log2(max + 1)) + (max <= 10 ? 1 : 0), coach, skill: "c:search" });
export function swapSortAct(r: Rng, n: number): Activity {
  const pool = Array.from({ length: 9 }, (_, i) => i + 1);
  let values = pickN(r, pool, n);
  for (let k = 0; values.every((v, i) => i === 0 || values[i - 1] <= v) && k < 10; k++) values = shuffle(r, values);
  return { kind: "swapsort", values, skill: "c:sorting" };
}
const WORDS: Record<number, string[]> = {
  3: ["CAT", "DOG", "SUN", "MAP", "BOX", "HAT", "BUG", "PIG", "BAT", "RUN", "FUN", "SEA"],
  4: ["FISH", "SHIP", "STAR", "MOON", "CAKE", "SAIL", "WAVE", "BOAT", "LOOP", "GAME", "CODE", "BIRD", "FROG", "KITE"],
  5: ["ROBOT", "PIRATE", "OCEAN", "LIGHT", "PIZZA", "TIGER", "WHALE", "CLOUD", "SMILE", "PLANT"].filter((w) => w.length === 5),
};
const SYMBOLS = ["🍎", "🐝", "🌙", "⭐", "🐟", "🌸", "🔔", "🎈", "🍀", "🐸", "🎵", "🍩"];
export function cipherAct(r: Rng, mode: "shift" | "symbol", len: 3 | 4 | 5, shift = 1): Activity {
  const answer = pick(r, WORDS[len]);
  const others = pickN(r, WORDS[len].filter((w) => w !== answer), 2);
  if (mode === "shift") return { kind: "cipher", mode, shift, coded: shiftText(answer, shift), answer, options: shuffle(r, [answer, ...others]), skill: "c:ciphers" };
  const letters = [...new Set([...answer, ...others.join("")])];
  const syms = pickN(r, SYMBOLS, letters.length);
  const key = letters.map((l, i) => [syms[i], l] as [string, string]);
  const coded = [...answer].map((l) => key.find(([, x]) => x === l)![0]).join("");
  return { kind: "cipher", mode, key: shuffle(r, key), coded, answer, options: shuffle(r, [answer, ...others]), skill: "c:ciphers" };
}
/** Each story names its switches, so A and B mean something (the key, the secret word…). */
const LOGIC_STORIES: Record<"AND" | "OR" | "NOT", [story: string, a: string, b: string][]> = {
  AND: [["The treasure chest opens only with the key AND the secret word.", "🔑 Key", "🤫 Secret word"], ["The ride starts only if you're tall enough AND buckled in.", "📏 Tall enough", "🔒 Buckled"], ["The robot walks only when its battery is charged AND its switch is on.", "🔋 Charged", "🔘 Switch on"]],
  OR: [["The doorbell rings if someone presses the front button OR the back button.", "🚪 Front button", "🚪 Back button"], ["The porch light turns on if it's dark OR someone walks by.", "🌙 Dark", "🚶 Someone walks by"], ["You get a sticker for reading OR helping a friend.", "📖 Reading", "🤝 Helping"]],
  NOT: [["The night light turns on when it is NOT daytime.", "☀️ Daytime", ""], ["The fan runs when the room is NOT cool.", "❄️ Room is cool", ""], ["The alarm beeps when the door is NOT closed.", "🚪 Door closed", ""]],
};
export function logicAct(r: Rng, g: "AND" | "OR" | "NOT", mode: "light" | "predict"): Activity {
  const [story, la, lb] = pick(r, LOGIC_STORIES[g]);
  return { kind: "logic", gate: g, mode, a: r() < 0.5, b: r() < 0.5, story, labels: [la, lb], skill: "c:logic" };
}
const ruleOf = (r: Rng, tier: 1 | 2 | 3): MachineStep[] => {
  if (tier === 1) return [pick(r, [{ op: "+", n: int(r, 1, 5) }, { op: "-", n: int(r, 1, 3) }] as MachineStep[])];
  if (tier === 2) return [pick(r, [{ op: "×", n: int(r, 2, 5) }, { op: "+", n: int(r, 3, 9) }] as MachineStep[])];
  return [{ op: "×", n: int(r, 2, 4) }, pick(r, [{ op: "+", n: int(r, 1, 5) }, { op: "-", n: int(r, 1, 3) }] as MachineStep[])];
};
export function machineAct(r: Rng, tier: 1 | 2 | 3, mode: "output" | "rule"): Activity {
  const steps = ruleOf(r, tier);
  // No negative numbers yet: every input keeps the output at zero or more.
  const inputs = pickN(r, [2, 3, 4, 5, 6, 7, 8, 10].filter((x) => applyMachine(steps, x) >= 0), 4);
  const examples = inputs.slice(0, 3).map((x) => [x, applyMachine(steps, x)] as [number, number]);
  if (mode === "output") {
    const input = inputs[3];
    const ans = applyMachine(steps, input);
    const wrong = [...new Set([ans + 1, ans - 1, ans + (steps[0].n ?? 1), input + (steps[0].n ?? 1)].filter((v) => v !== ans && v >= 0))];
    return { kind: "machine", steps, mode, examples, input, options: shuffle(r, [String(ans), ...pickN(r, wrong, 2).map(String)]), answer: String(ans), skill: "c:machines" };
  }
  const right = machineText(steps);
  const decoys = new Set<string>();
  for (let k = 0; decoys.size < 2 && k < 30; k++) {
    const d = ruleOf(r, tier);
    const txt = machineText(d);
    if (txt !== right && examples.some(([x, y]) => applyMachine(d, x) !== y)) decoys.add(txt);
  }
  return { kind: "machine", steps, mode, examples, options: shuffle(r, [right, ...decoys]), answer: right, skill: "c:machines" };
}
const TREASURE = ["💎", "🪙", "🗝️", "👑", "🏴‍☠️", "🐚", "⭐"];
export function plotAct(r: Rng, cols: number, rows: number, mode: "place" | "read"): Activity {
  let tx = int(r, 1, cols - 1), ty = int(r, 0, rows - 1);
  if (tx === ty) ty = (ty + 1) % rows; // so swapping x and y is a real mistake, not the same spot
  const opts = mode === "read" ? shuffle(r, [`(${tx}, ${ty})`, `(${ty}, ${tx})`, `(${tx}, ${Math.min(rows - 1, ty + 1) === ty ? ty - 1 : ty + 1})`]) : undefined;
  if (tx === ty) tx = (tx + 1) % cols;
  return { kind: "plot", cols, rows, target: [tx, ty], emoji: pick(r, TREASURE.filter((t) => !t.includes("‍"))), mode, options: opts, skill: "c:coordinates" };
}

export const LAB_SKILL_LABEL: Record<string, string> = {
  "c:predict": "Reading code (predicting)",
  "c:variables": "Variables",
  "c:events": "Events (how apps react)",
  "c:binary": "Binary numbers",
  "c:search": "Searching by halves",
  "c:sorting": "Sorting algorithms",
  "c:ciphers": "Codes & ciphers",
  "c:logic": "Logic gates (AND · OR · NOT)",
  "c:machines": "Function machines",
  "c:coordinates": "Coordinates",
  "c:python": "Reading real code (Python)",
  "c:pydebug": "Debugging real code (Python)",
};

// ── Python Peek: real code, read and predicted ───────────────────────────────────────────────
type Py = { lines: string[]; question: string; answer: string; wrong: string[]; output: string[]; why: string };
const PETS = [["cat", "dog", "fish"], ["shark", "whale", "crab"], ["apple", "pear", "plum"], ["red", "blue", "green"]];
const WORDS_PY = ["PIRATE", "HARBOR", "ROBOT", "CODE", "ISLAND", "ANCHOR"];
const SHOUTS = ["ahoy", "hello", "yay", "beep"];
type PyTier = 1 | 2 | 3 | 4;
/** How many kinds of program each tier has. */
const PY_VARIANTS: Record<PyTier, number> = { 1: 5, 2: 5, 3: 7, 4: 8 };
/** One Python Peek program by tier: 1 variables · 2 loops · 3 if / functions / lists · 4 nesting.
 *  `v` picks which kind of program (random if not given). */
function pyProgram(r: Rng, tier: PyTier, v = int(r, 0, PY_VARIANTS[tier] - 1)): Py {
  const A = int(r, 2, 9), B = int(r, 2, 6);
  if (tier === 1) {
    switch (v) {
      case 0:
        return { lines: [`x = ${A}`, `x = x + ${B}`, `print(x)`], question: "What does this print?", answer: String(A + B), wrong: [String(A), "x"], output: [String(A + B)], why: `x starts at ${A}, then x = x + ${B} makes it ${A + B}.` };
      case 1: {
        const nm = pick(r, ["Sam", "Ava", "Leo", "Mia"]);
        return { lines: [`name = "${nm}"`, `print("Hello, " + name)`], question: "What does this print?", answer: `Hello, ${nm}`, wrong: ["Hello, name", `Hello + ${nm}`], output: [`Hello, ${nm}`], why: "name holds the text, and + joins the two pieces of text together." };
      }
      case 2:
        return { lines: [`a = ${A}`, `b = ${B}`, `print(a * b)`], question: "What does this print?", answer: String(A * B), wrong: [String(A + B), "a * b"], output: [String(A * B)], why: `* means multiply: ${A} × ${B} = ${A * B}.` };
      case 3:
        return { lines: [`coins = ${A + B}`, `coins = coins - ${B}`, `print(coins)`], question: "What does this print?", answer: String(A), wrong: [String(A + B), String(A + 2 * B)], output: [String(A)], why: `coins starts at ${A + B}; taking away ${B} leaves ${A}.` };
      default: {
        const s = pick(r, ["ho", "ha", "la", "go"]);
        const n = int(r, 2, 4);
        return { lines: [`sound = "${s}"`, `print(sound * ${n})`], question: "What does this print?", answer: s.repeat(n), wrong: [`${s}${n}`, Array.from({ length: n }, () => s).join(" ")], output: [s.repeat(n)], why: `* on text repeats it: "${s}" ${n} times is ${s.repeat(n)} — with no spaces, because "${s}" has none.` };
      }
    }
  }
  if (tier === 2) {
    const N = int(r, 3, 6), K = int(r, 2, 5);
    switch (v) {
      case 0: {
        const w = pick(r, SHOUTS);
        return { lines: [`for i in range(${N}):`, `    print("${w}")`], question: `How many times does it print "${w}"?`, answer: String(N), wrong: [String(N + 1), String(N - 1)], output: Array.from({ length: N }, () => w), why: `range(${N}) runs the loop ${N} times.` };
      }
      case 1:
        return { lines: ["total = 0", `for i in range(${N}):`, `    total = total + ${K}`, "print(total)"], question: "What does this print?", answer: String(N * K), wrong: [String(K), String(N + K)], output: [String(N * K)], why: `The loop adds ${K}, ${N} times: ${N} × ${K} = ${N * K}.` };
      case 2:
        return { lines: [`for i in range(${N}):`, "    print(i)"], question: "What is the LAST number it prints?", answer: String(N - 1), wrong: [String(N), "1"], output: Array.from({ length: N }, (_, i) => String(i)), why: `range(${N}) counts 0, 1, 2… and stops before ${N}, so the last number is ${N - 1}.` };
      case 3:
        return { lines: ["count = 0", `while count < ${N}:`, "    count = count + 1", "print(count)"], question: "What does this print?", answer: String(N), wrong: [String(N - 1), String(N + 1)], output: [String(N)], why: `The loop keeps going while count is less than ${N}, so it stops at ${N}.` };
      default: {
        const lo = int(r, 1, 3), hi = lo + int(r, 3, 5);
        const nums = Array.from({ length: hi - lo }, (_, i) => String(lo + i));
        return { lines: [`for i in range(${lo}, ${hi}):`, "    print(i)"], question: "How many numbers does it print?", answer: String(hi - lo), wrong: [String(hi - lo + 1), String(lo === 1 ? hi - lo - 1 : hi)], output: nums, why: `range(${lo}, ${hi}) starts at ${lo} and stops BEFORE ${hi}: ${nums.join(", ")}. That's ${hi - lo}.` };
      }
    }
  }
  if (tier === 3) {
    switch (v) {
      case 0: {
        const T = int(r, 3, 8);
        const big = A > T;
        return { lines: [`x = ${A}`, `if x > ${T}:`, '    print("big")', "else:", '    print("small")'], question: "What does this print?", answer: big ? "big" : "small", wrong: [big ? "small" : "big", "big small"], output: [big ? "big" : "small"], why: `${A} > ${T} is ${big ? "true" : "false"}, so it runs the ${big ? "if" : "else"} part.` };
      }
      case 1:
        return { lines: ["def double(n):", "    return n * 2", "", `print(double(${A}))`], question: "What does this print?", answer: String(A * 2), wrong: [String(A), String(A + 2)], output: [String(A * 2)], why: `double(${A}) sends ${A} into the function as n, and it returns ${A} × 2.` };
      case 2: {
        const list = pick(r, PETS);
        const k = int(r, 0, 2);
        return { lines: [`things = ["${list[0]}", "${list[1]}", "${list[2]}"]`, `print(things[${k}])`], question: "What does this print?", answer: list[k], wrong: list.filter((x) => x !== list[k]), output: [list[k]], why: `Lists count from 0: things[0] is ${list[0]}, things[1] is ${list[1]}, things[2] is ${list[2]}.` };
      }
      case 3: {
        const w = pick(r, WORDS_PY);
        return { lines: [`word = "${w}"`, "print(len(word))"], question: "What does this print?", answer: String(w.length), wrong: [String(w.length - 1), String(w.length + 1)], output: [String(w.length)], why: `len() counts the letters: ${w} has ${w.length}.` };
      }
      case 4: {
        const w = pick(r, WORDS_PY);
        return { lines: [`word = "${w}"`, "print(word[0])"], question: "What does this print?", answer: w[0], wrong: [w[1], "word"], output: [w[0]], why: `word[0] is the FIRST letter — computers start counting at 0.` };
      }
      case 5: {
        const score = pick(r, [95, 92, 88, 81, 74, 71, 66, 58]);
        const medal = score >= 90 ? "gold" : score >= 70 ? "silver" : "bronze";
        const why = score >= 90 ? `${score} >= 90 is true, so it prints gold and skips the rest.` : score >= 70 ? `${score} >= 90 is false, so Python checks the elif: ${score} >= 70 is true — silver.` : `${score} is not >= 90 and not >= 70, so neither check passes and the else runs: bronze.`;
        return { lines: [`score = ${score}`, "if score >= 90:", '    print("gold")', "elif score >= 70:", '    print("silver")', "else:", '    print("bronze")'], question: "What does this print?", answer: medal, wrong: ["gold", "silver", "bronze"].filter((m) => m !== medal), output: [medal], why };
      }
      default:
        return { lines: [`shells = ${A}`, `shells += ${B}`, `shells += ${B}`, "print(shells)"], question: "What does this print?", answer: String(A + 2 * B), wrong: [String(A + B), String(A)], output: [String(A + 2 * B)], why: `+= adds to what's already there: ${A}, then ${A + B}, then ${A + 2 * B}.` };
    }
  }
  const N = int(r, 2, 4), M = int(r, 2, 4);
  switch (v) {
    case 0:
      return { lines: [`for a in range(${N}):`, `    for b in range(${M}):`, '        print("*")'], question: "How many stars does it print?", answer: String(N * M), wrong: [String(N + M), String(Math.max(N, M))], output: Array.from({ length: N * M }, () => "*"), why: `The inner loop prints ${M} stars, and the outer loop does that ${N} times: ${N} × ${M} = ${N * M}.` };
    case 1: {
      const n = int(r, 4, 8);
      const evens = Math.ceil(n / 2);
      const list = Array.from({ length: evens }, (_, i) => i * 2).join(", ");
      return { lines: ["count = 0", `for i in range(${n}):`, "    if i % 2 == 0:", "        count = count + 1", "print(count)"], question: "What does this print?", answer: String(evens), wrong: [String(n), String(n - evens === evens ? evens + 1 : n - evens)], output: [String(evens)], why: `i goes from 0 to ${n - 1}. i % 2 == 0 means "splits by 2 with nothing left over" — true for ${list}. That's ${evens}.` };
    }
    case 2:
      return { lines: ["def triple(n):", "    return n * 3", "", `print(triple(${A}) + 1)`], question: "What does this print?", answer: String(A * 3 + 1), wrong: [String(A * 3), String((A + 1) * 3)], output: [String(A * 3 + 1)], why: `triple(${A}) is ${A * 3}, then + 1 makes ${A * 3 + 1}.` };
    case 3: {
      const C = int(r, 1, 9);
      const v = A > B && B > C;
      return { lines: [`a = ${A}`, `b = ${B}`, `c = ${C}`, "print(a > b and b > c)"], question: "What does this print?", answer: v ? "True" : "False", wrong: [v ? "False" : "True", "a > b"], output: [v ? "True" : "False"], why: `a > b is ${A > B ? "True" : "False"} and b > c is ${B > C ? "True" : "False"}. "and" is True only when both are True.` };
    }
    case 4: {
      const nums = [int(r, 1, 9), int(r, 1, 9), int(r, 1, 9)];
      const sum = nums[0] + nums[1] + nums[2];
      return { lines: [`nums = [${nums.join(", ")}]`, "total = 0", "for n in nums:", "    total = total + n", "print(total)"], question: "What does this print?", answer: String(sum), wrong: [String(nums[2]), String(sum - nums[0]), "3"], output: [String(sum)], why: `The loop visits each number and adds it: ${nums.join(" + ")} = ${sum}.` };
    }
    case 5: {
      const L = pick(r, [10, 20, 30, 50, 100]);
      const steps = [1];
      while (steps[steps.length - 1] < L) steps.push(steps[steps.length - 1] * 2);
      const end = steps[steps.length - 1];
      return { lines: ["x = 1", `while x < ${L}:`, "    x = x * 2", "print(x)"], question: "What does this print?", answer: String(end), wrong: [String(L), String(end / 2)], output: [String(end)], why: `x doubles: ${steps.join(", ")}. ${end} is the first one that is NOT less than ${L}, so the loop stops there.` };
    }
    case 6: {
      const n = int(r, 3, 4);
      const list = (from: number, len: number) => `[${Array.from({ length: len }, (_, i) => from + i).join(", ")}]`;
      return { lines: ["bag = []", `for i in range(${n}):`, "    bag.append(i)", "print(bag)"], question: "What does this print?", answer: list(0, n), wrong: [list(1, n), list(0, n + 1)], output: [list(0, n)], why: `append adds each i to the end of the list. range(${n}) gives 0 up to ${n - 1}, so the bag holds ${list(0, n)}.` };
    }
    default: {
      const B2 = A === B ? B + 1 : B;
      return { lines: ["def bigger(a, b):", "    if a > b:", "        return a", "    return b", "", `print(bigger(${A}, ${B2}))`], question: "What does this print?", answer: String(Math.max(A, B2)), wrong: [String(Math.min(A, B2)), String(A + B2)], output: [String(Math.max(A, B2))], why: `${A} > ${B2} is ${A > B2 ? "true, so it returns a" : "false, so it skips to return b"}: ${Math.max(A, B2)}.` };
    }
  }
}
/** A level's worth of Python Peek programs, one per tier given — no kind of program twice in a row
 *  until the tier's bag runs out. */
export function pythonSet(r: Rng, tiers: PyTier[]): Activity[] {
  const bags: Partial<Record<PyTier, number[]>> = {};
  return tiers.map((t) => {
    if (!bags[t]?.length) bags[t] = shuffle(r, Array.from({ length: PY_VARIANTS[t] }, (_, i) => i));
    return pythonRead(r, t, bags[t]!.pop());
  });
}
/** Programs already handed out while the course is built, so no level repeats another's exact code. */
const PY_SEEN = new Set<string>();
export function pythonRead(r: Rng, tier: PyTier, v?: number): Activity {
  for (let tries = 0; tries < 20; tries++) {
    // Keep the chosen kind of program (new numbers each try); fall back to any kind late on.
    const p = pyProgram(r, tier, tries < 12 ? v : undefined);
    const opts = [p.answer, ...p.wrong.filter((w) => w !== p.answer)];
    if (new Set(opts).size !== opts.length || opts.length < 3) continue;
    const sig = p.lines.join("\n");
    if (PY_SEEN.has(sig) && tries < 16) continue;
    PY_SEEN.add(sig);
    return { kind: "coderead", lines: p.lines, question: p.question, options: shuffle(r, opts), answer: p.answer, output: p.output, why: p.why, skill: "c:python" };
  }
  return { kind: "coderead", lines: ["print(2 + 3)"], question: "What does this print?", options: ["5", "23", "2 + 3"], answer: "5", output: ["5"], why: "Python does the math first: 2 + 3 = 5.", skill: "c:python" };
}

// ── Python bug hunt: real code with one wrong line ───────────────────────────────────────────
// The child sees what the program does now (wrong output, or a real crash), finds the line, and
// watches the fixed program print the right thing. Tier 1: logic slips · tier 2: real crashes
// (IndexError, IndentationError, = vs ==, an endless loop).
type PyBug = { lines: string[]; goal: string; output: string[]; line: number; code: string; fixed: string[]; why: string };
const BUG_VARIANTS = 5;
function pyBug(r: Rng, tier: 1 | 2, v: number): PyBug {
  if (tier === 1) {
    switch (v) {
      case 0: {
        const nm = pick(r, ["Ava", "Leo", "Mia", "Sam", "Zoe"]);
        return { lines: ['greeting = "Hello, "', `name = "${nm}"`, 'print(greeting + "name")'], goal: `It should print "Hello, ${nm}".`, output: ["Hello, name"], line: 3, code: "print(greeting + name)", fixed: [`Hello, ${nm}`], why: `"name" in quotes is just the word name. Without quotes, name is the variable holding "${nm}".` };
      }
      case 1: {
        const X = int(r, 7, 12);
        return { lines: [`x = ${X}`, "if x < 5:", '    print("big")', "else:", '    print("small")'], goal: `x is ${X}, so it should print "big".`, output: ["small"], line: 2, code: "if x > 5:", fixed: ["big"], why: `< means "less than". ${X} < 5 is false, so the else part ran. It should be x > 5.` };
      }
      case 2: {
        const N = int(r, 3, 5);
        const upTo = (n: number) => Array.from({ length: n }, (_, i) => String(i + 1));
        return { lines: ["count = 1", `while count < ${N}:`, "    print(count)", "    count = count + 1"], goal: `It should print 1 to ${N}.`, output: upTo(N - 1), line: 2, code: `while count <= ${N}:`, fixed: upTo(N), why: `count < ${N} stops BEFORE ${N}. <= means "less than or equal to", so ${N} gets printed too.` };
      }
      case 3: {
        const K = int(r, 3, 4);
        const hips = (n: number) => [...Array.from({ length: n }, () => "hip"), "hooray!"];
        return { lines: [`for i in range(${K - 1}):`, '    print("hip")', 'print("hooray!")'], goal: `It should print "hip" ${K} times, then "hooray!".`, output: hips(K - 1), line: 1, code: `for i in range(${K}):`, fixed: hips(K), why: `range(${K - 1}) only repeats ${K - 1} times. range(${K}) repeats ${K} times.` };
      }
      default: {
        const A = int(r, 2, 9);
        const B = A + int(r, 1, 5);
        return { lines: [`a = ${A}`, `b = ${B}`, "total = a + a", "print(total)"], goal: `It should print a + b, which is ${A + B}.`, output: [String(2 * A)], line: 3, code: "total = a + b", fixed: [String(A + B)], why: `Line 3 adds a twice: ${A} + ${A} = ${2 * A}. It should be a + b.` };
      }
    }
  }
  switch (v) {
    case 0: {
      const pets = pick(r, PETS);
      return { lines: [`pets = ["${pets[0]}", "${pets[1]}", "${pets[2]}"]`, "last = 3", "print(pets[last])"], goal: `It should print the last one, "${pets[2]}".`, output: ["IndexError: list index out of range"], line: 2, code: "last = 2", fixed: [pets[2]], why: "Lists count from 0, so the last of 3 things is number 2. pets[3] doesn't exist — so Python crashes!" };
    }
    case 1: {
      const N = int(r, 2, 4);
      return { lines: ['print("Stars:")', `for i in range(${N}):`, 'print("*")'], goal: `It should print "Stars:" and then ${N} stars.`, output: ["IndentationError: expected an indented block"], line: 3, code: '    print("*")', fixed: ["Stars:", ...Array.from({ length: N }, () => "*")], why: "The line inside a loop needs 4 spaces in front. Without them, Python doesn't know what to repeat — so it won't run at all." };
    }
    case 2: {
      const S = int(r, 3, 5);
      return { lines: [`n = ${S}`, "while n > 0:", "    print(n)", "    n = n + 1"], goal: `It should count down from ${S} to 1.`, output: [...Array.from({ length: 6 }, (_, i) => String(S + i)), "…it never stops!"], line: 4, code: "    n = n - 1", fixed: Array.from({ length: S }, (_, i) => String(S - i)), why: "n = n + 1 makes n BIGGER, so n > 0 is always true — an endless loop! n = n - 1 counts down." };
    }
    case 3: {
      const A = int(r, 3, 9);
      return { lines: ["def double(n):", "    return n + 2", "", `print(double(${A}))`], goal: `double(${A}) should print ${2 * A}.`, output: [String(A + 2)], line: 2, code: "    return n * 2", fixed: [String(2 * A)], why: "n + 2 ADDS two. Doubling means n * 2." };
    }
    default: {
      const X = int(r, 2, 9);
      return { lines: [`x = ${X}`, `if x = ${X}:`, '    print("match!")'], goal: 'It should print "match!".', output: ["SyntaxError: invalid syntax. Maybe you meant '==' instead of '='?"], line: 2, code: `if x == ${X}:`, fixed: ["match!"], why: 'One = puts a value in a box. Two == ASKS "are these equal?" — and an if needs a question.' };
    }
  }
}
export function pythonBug(r: Rng, tier: 1 | 2, v = int(r, 0, BUG_VARIANTS - 1)): Activity {
  const b = pyBug(r, tier, v);
  const options = b.lines.flatMap((l, i) => (l.trim() ? [`Line ${i + 1}`] : []));
  return { kind: "coderead", lines: b.lines, question: `${b.goal} Which line has the bug?`, options, answer: `Line ${b.line}`, output: b.output, why: b.why, fix: { line: b.line, code: b.code, output: b.fixed }, skill: "c:pydebug" };
}
/** A level of bug hunts — each kind of bug at most once until the tier's bag runs out. */
export function pythonBugSet(r: Rng, tier: 1 | 2, n: number): Activity[] {
  let bag: number[] = [];
  return Array.from({ length: n }, () => {
    if (!bag.length) bag = shuffle(r, Array.from({ length: BUG_VARIANTS }, (_, i) => i));
    return pythonBug(r, tier, bag.pop());
  });
}
