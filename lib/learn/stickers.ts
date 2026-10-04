// The sticker book — sea friends a kid collects from the treasure chest after each lesson.
// A surprise every time (variable rewards are what make "one more lesson" irresistible), biased
// toward ones they don't have yet so the book keeps filling, with a few rare and legendary
// finds to hunt for. Picked deterministically, so the same lesson play gives the same sticker
// on every screen.

export type Rarity = "common" | "rare" | "legendary";
export type Sticker = { id: string; emoji: string; name: string; rarity: Rarity };

const st = (id: string, emoji: string, name: string, rarity: Rarity): Sticker => ({ id, emoji, name, rarity });

export const STICKERS: Sticker[] = [
  st("fish", "🐟", "Fish", "common"),
  st("tropical", "🐠", "Tropical Fish", "common"),
  st("puffer", "🐡", "Puffer Fish", "common"),
  st("crab", "🦀", "Crab", "common"),
  st("shell", "🐚", "Spiral Shell", "common"),
  st("shrimp", "🦐", "Shrimp", "common"),
  st("turtle", "🐢", "Sea Turtle", "common"),
  st("duck", "🦆", "Duck", "common"),
  st("frog", "🐸", "Frog", "common"),
  st("snail", "🐌", "Snail", "common"),
  st("wave", "🌊", "Big Wave", "common"),
  st("anchor", "⚓", "Anchor", "common"),
  st("sailboat", "⛵", "Sailboat", "common"),
  st("island", "🏝️", "Island", "common"),
  st("starfish", "⭐", "Starfish", "common"),
  st("octopus", "🐙", "Octopus", "rare"),
  st("squid", "🦑", "Squid", "rare"),
  st("lobster", "🦞", "Lobster", "rare"),
  st("dolphin", "🐬", "Dolphin", "rare"),
  st("seal", "🦭", "Seal", "rare"),
  st("penguin", "🐧", "Penguin", "rare"),
  st("flamingo", "🦩", "Flamingo", "rare"),
  st("otter", "🦦", "Otter", "rare"),
  st("whale", "🐳", "Whale", "rare"),
  st("shark", "🦈", "Shark", "rare"),
  st("compass", "🧭", "Golden Compass", "rare"),
  st("dragon", "🐉", "Sea Dragon", "legendary"),
  st("mermaid", "🧜", "Mermaid", "legendary"),
  st("crown", "👑", "Lost Crown", "legendary"),
  st("gem", "💎", "Treasure Gem", "legendary"),
  st("rainbow", "🌈", "Rainbow Bridge", "legendary"),
  st("pirate", "🏴‍☠️", "Pirate Flag", "legendary"),
];

export const STICKER_BY_ID = new Map(STICKERS.map((s) => [s.id, s]));
const WEIGHT: Record<Rarity, number> = { common: 70, rare: 25, legendary: 5 };

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

/** Which sticker this lesson play earns. A perfect lesson gets a better shot at rare finds. */
export function pickSticker(seed: string, owned: Record<string, number>, stars: number): Sticker {
  const r1 = hash(seed + ":rarity");
  const boost = stars >= 3 ? 1.6 : 1;
  const total = WEIGHT.common + WEIGHT.rare * boost + WEIGHT.legendary * boost;
  const roll = r1 * total;
  const rarity: Rarity = roll < WEIGHT.legendary * boost ? "legendary" : roll < (WEIGHT.legendary + WEIGHT.rare) * boost ? "rare" : "common";
  const tier = STICKERS.filter((s) => s.rarity === rarity);
  const fresh = tier.filter((s) => !owned[s.id]);
  // Mostly something new (so the book fills), sometimes a repeat (so new ones stay exciting).
  const pool = fresh.length && hash(seed + ":fresh") < 0.8 ? fresh : tier;
  return pool[Math.floor(hash(seed + ":pick") * pool.length)];
}
