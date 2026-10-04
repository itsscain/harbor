import type { SubjectId } from "./types";
import { COURSES, SUBJECTS } from "./curriculum";
import { isMastered, type Skills } from "./mastery";
import { albumProgress } from "./stickers";
import type { Hatch } from "./progress";

// My Reef — a living aquarium the child fills by learning. Eggs are EARNED by real milestones
// (finishing an island, a perfect boss, a streak, a filled sticker set, verses hidden in the
// heart, skills mastered) — so every creature stands for something the child did. Tap an egg to
// hatch it; the creature that comes out swims in the reef forever and grows up as the child keeps
// learning (it never gets sick or sad — no guilt mechanics, ever). One creature can be the
// "buddy" that cheers from the corner of every lesson. Each one comes with a true ocean fact.
//
// Eggs are derived from progress (nothing to store, and a child who already did the work finds
// eggs waiting); only the hatching — which creature, and the XP it started growing from — is
// stored, as a "collect" ledger event.

export type CreatureRarity = "common" | "rare" | "epic" | "legendary";
export type Creature = { id: string; name: string; kind: string; emoji: string; rarity: CreatureRarity; fact: string; /** a color twist (CSS filter) for rare variants */ tint?: string };

const c = (id: string, name: string, kind: string, emoji: string, rarity: CreatureRarity, fact: string, tint?: string): Creature => ({ id, name, kind, emoji, rarity, fact, tint });

export const CREATURES: Creature[] = [
  c("splash", "Splash", "Fish", "🐟", "common", "Fish breathe with gills that pull oxygen right out of the water."),
  c("sunny", "Sunny", "Clownfish", "🐠", "common", "Clownfish live safely inside stinging sea anemones."),
  c("bubbles", "Bubbles", "Pufferfish", "🐡", "common", "A pufferfish puffs up like a ball by gulping water when it's scared."),
  c("pinch", "Captain Pinch", "Crab", "🦀", "common", "Most crabs walk sideways!"),
  c("zippy", "Zippy", "Shrimp", "🦐", "common", "Pistol shrimp snap their claws so fast it makes a loud POP."),
  c("shelly", "Shelly", "Sea Turtle", "🐢", "common", "Sea turtles can rest underwater for hours on one breath."),
  c("echo", "Echo", "Sea Snail", "🐚", "common", "Sea snails build their spiral shells bigger as they grow."),
  c("puddles", "Puddles", "Duck", "🦆", "common", "A duck's feathers are waterproof — water rolls right off."),
  c("hopper", "Hopper", "Frog", "🐸", "common", "Frogs can drink water through their skin."),
  c("inky", "Inky", "Octopus", "🐙", "rare", "An octopus has three hearts and blue blood!"),
  c("squirt", "Squirt", "Squid", "🦑", "rare", "Squids squirt clouds of ink to escape."),
  c("finn", "Finn", "Dolphin", "🐬", "rare", "Dolphins have special whistles — like names — for each other."),
  c("biscuit", "Biscuit", "Seal", "🦭", "rare", "Seals can nap underwater and pop up to breathe."),
  c("pebble", "Pebble", "Sea Otter", "🦦", "rare", "Sea otters hold hands while they sleep so they don't drift apart."),
  c("snaps", "Sir Snaps", "Lobster", "🦞", "rare", "Lobsters keep growing their whole lives."),
  c("waddles", "Waddles", "Penguin", "🐧", "rare", "Penguins can't fly in the air — but they “fly” underwater!"),
  c("rosie", "Rosie", "Flamingo", "🦩", "rare", "Flamingos turn pink from the shrimp and algae they eat."),
  c("grace", "Grace", "Swan", "🦢", "rare", "Swans often stay with the same partner their whole lives."),
  c("spout", "Spout", "Blue Whale", "🐳", "epic", "Blue whales are the biggest animals that have ever lived."),
  c("humphrey", "Humphrey", "Humpback Whale", "🐋", "epic", "Humpback whales sing long songs that travel far through the sea."),
  c("chompers", "Chompers", "Shark", "🦈", "epic", "Sharks were swimming the seas before the dinosaurs."),
  c("snappy", "Snappy", "Crocodile", "🐊", "epic", "A crocodile can't stick its tongue out."),
  c("ruby", "Ruby", "Ruby Pufferfish", "🐡", "epic", "Some pufferfish make beautiful sand art on the sea floor to attract a mate.", "hue-rotate(300deg) saturate(1.4)"),
  c("midnight", "Midnight", "Midnight Octopus", "🐙", "epic", "Octopuses can change color in a blink to hide.", "hue-rotate(200deg) saturate(1.3)"),
  c("tide", "Tide", "Sea Dragon", "🐉", "legendary", "Leafy sea dragons are real fish that look like floating seaweed!"),
  c("nessie", "Nessie", "Sea Reptile", "🦕", "legendary", "Long ago, giant reptiles called plesiosaurs swam in the oceans."),
  c("goldie", "Goldie", "Golden Fish", "🐟", "legendary", "Goldfish can remember things for months — not just seconds!", "sepia(1) saturate(5) hue-rotate(-10deg) brightness(1.1)"),
  c("aurora", "Aurora", "Glow Turtle", "🐢", "legendary", "Some sea turtles glow under blue light — scientists call it biofluorescence.", "hue-rotate(140deg) saturate(1.8) brightness(1.15)"),
];
export const CREATURE_BY_ID = new Map(CREATURES.map((x) => [x.id, x]));
export const CREATURE_RARITY_COLOR: Record<CreatureRarity, string> = { common: "#1cb0f6", rare: "#22c59b", epic: "#8b6cff", legendary: "#ffc83d" };

// ── Eggs ────────────────────────────────────────────────────────────────────────────────────
export type EggTier = "sea" | "rare" | "golden";
export type Egg = { id: string; tier: EggTier; why: string };
export const EGG_LOOK: Record<EggTier, { emoji: string; name: string; color: string }> = {
  sea: { emoji: "🥚", name: "Sea egg", color: "#7cc8ff" },
  rare: { emoji: "🥚", name: "Rare egg", color: "#22c59b" },
  golden: { emoji: "🥚", name: "Golden egg", color: "#ffc83d" },
};

type Progress = { lessons: Record<string, { stars: number; plays: number }>; days: string[]; skills: Skills; stickers: Record<string, number>; subjects?: SubjectId[] };

/** The longest run of consecutive learning days we can still see. */
export function bestStreak(days: string[]): number {
  const set = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of set) {
    const t = Date.parse(`${d}T12:00:00Z`);
    run = prev !== null && Math.round((t - prev) / 86_400_000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
}

/** Islands a child has finished (every level passed, or the boss beaten), in every course. */
export function islandsDone(lessons: Progress["lessons"], subjects: SubjectId[] = SUBJECTS) {
  const out: { unit: string; subject: SubjectId; perfectBoss: boolean }[] = [];
  for (const s of subjects)
    for (const u of COURSES[s].units) {
      const boss = u.lessons.find((l) => l.kind === "boss");
      const bossStars = boss ? (lessons[boss.id]?.stars ?? 0) : 0;
      if (bossStars >= 1 || u.lessons.every((l) => (lessons[l.id]?.stars ?? 0) >= 1)) out.push({ unit: u.id, subject: s, perfectBoss: bossStars >= 3 });
    }
  return out;
}

/** Every egg a child has earned so far. */
export function eggsEarned(p: Progress): Egg[] {
  const eggs: Egg[] = [];
  const anyPassed = Object.values(p.lessons).some((l) => l.stars >= 1);
  if (anyPassed) eggs.push({ id: "welcome", tier: "sea", why: "Your very first level!" });
  const isl = islandsDone(p.lessons);
  isl.forEach((x, i) => {
    eggs.push({ id: `isl:${x.unit}`, tier: (i + 1) % 5 === 0 ? "rare" : "sea", why: "You finished an island!" });
    if (x.perfectBoss) eggs.push({ id: `boss3:${x.unit}`, tier: "golden", why: "A perfect boss battle!" });
  });
  const streak = bestStreak(p.days);
  for (const [n, tier] of [[3, "sea"], [7, "rare"], [14, "rare"], [30, "golden"], [60, "golden"], [100, "golden"]] as const) if (streak >= n) eggs.push({ id: `streak:${n}`, tier, why: `${n} days in a row!` });
  for (const s of albumProgress(p.stickers)) if (s.complete) eggs.push({ id: `set:${s.set.id}`, tier: "golden", why: `You filled the ${s.set.name} sticker set!` });
  const mastered = Object.values(p.skills).filter(isMastered).length;
  for (const [n, tier] of [[10, "sea"], [25, "rare"], [60, "rare"], [120, "golden"], [250, "golden"]] as const) if (mastered >= n) eggs.push({ id: `mastery:${n}`, tier, why: `${n} skills mastered!` });
  const verses = Object.entries(p.skills).filter(([k, s]) => k.startsWith("f:verse:") && isMastered(s)).length;
  for (const [n, tier] of [[1, "sea"], [5, "rare"], [12, "rare"], [25, "golden"], [50, "golden"]] as const) if (verses >= n) eggs.push({ id: `verses:${n}`, tier, why: n === 1 ? "Your first verse hidden in your heart!" : `${n} verses hidden in your heart!` });
  return eggs;
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

const WEIGHTS: Record<EggTier, Record<CreatureRarity, number>> = {
  sea: { common: 70, rare: 25, epic: 5, legendary: 0 },
  rare: { common: 25, rare: 50, epic: 20, legendary: 5 },
  golden: { common: 0, rare: 35, epic: 45, legendary: 20 },
};

/** What hatches from an egg: rarity by the egg's tier, and something new when possible. */
export function hatchCreature(seed: string, tier: EggTier, owned: string[]): Creature {
  const w = WEIGHTS[tier];
  const total = w.common + w.rare + w.epic + w.legendary;
  const roll = hash(`${seed}:r`) * total;
  const rarity: CreatureRarity = roll < w.legendary ? "legendary" : roll < w.legendary + w.epic ? "epic" : roll < w.legendary + w.epic + w.rare ? "rare" : "common";
  const tierPool = CREATURES.filter((x) => x.rarity === rarity);
  const fresh = tierPool.filter((x) => !owned.includes(x.id));
  const pool = fresh.length ? fresh : CREATURES.filter((x) => !owned.includes(x.id)).length ? CREATURES.filter((x) => !owned.includes(x.id)) : tierPool;
  return pool[Math.floor(hash(`${seed}:p`) * pool.length)];
}

// ── Growing up ──────────────────────────────────────────────────────────────────────────────
export const GROWTH = [
  { at: 0, name: "Baby", scale: 0.85 },
  { at: 150, name: "Young", scale: 1 },
  { at: 500, name: "Grown", scale: 1.15 },
  { at: 1200, name: "Royal", scale: 1.3 },
];
/** A creature's stage from the XP earned since it hatched (each level passed feeds every creature). */
export function growth(xpNow: number, h: Hatch) {
  const gained = Math.max(0, xpNow - h.xp);
  let i = 0;
  while (i + 1 < GROWTH.length && gained >= GROWTH[i + 1].at) i++;
  const next = GROWTH[i + 1];
  return { stage: GROWTH[i], index: i, gained, next, toNext: next ? next.at - gained : 0, royal: i === GROWTH.length - 1 };
}

/** Eggs earned but not hatched yet. */
export function eggsWaiting(p: Progress, hatched: Hatch[]): Egg[] {
  const done = new Set(hatched.map((h) => h.egg));
  return eggsEarned(p).filter((e) => !done.has(e.id));
}
