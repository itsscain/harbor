import type { Egg, EggTier } from "./reef";

// My Aquarium: where shells turn into a living tank. Everything costs shells earned by learning
// (never real money):
//   • Food — packs of flakes, shrimp treats and golden pellets. Feeding a creature makes it happy
//     (hearts, a spin) and helps it grow faster. Food is a treat, never a chore: nobody gets sick
//     or sad if they're not fed — a fish that hasn't eaten today just looks up hopefully.
//   • Eggs — buy a Sea, Rare or Golden egg, or roll the Mystery Egg machine (its odds are printed
//     right on it, and every 10th roll is Rare or better). Eggs hatch in the nest like earned ones.
//   • Decorations and tank themes — make the tank yours.
//
// Purchases are ledger "spend" events whose item names carry what was bought (each pack, egg and
// roll gets its own id, so counts survive the server's de-duplication); feedings are "collect"
// events "feed:<food>:<egg>"; the chosen tank is "aq:tank:<id>", and a decoration put away (or
// back) is "aq:off:<id>" ("aq:on:<id>"). Everything else is derived.

// ── Eggs for sale + the Mystery Egg machine ─────────────────────────────────────────────────
// Buying is never worse than gambling: a roll costs a little more than a Sea egg and is usually
// one, so the machine is a fun surprise, not the smart way to get rare friends.
export const EGG_SHOP: { tier: EggTier; price: number; odds: string }[] = [
  { tier: "sea", price: 50, odds: "Common friends, sometimes rare ones" },
  { tier: "rare", price: 150, odds: "Rare and epic friends — maybe a legend!" },
  { tier: "golden", price: 400, odds: "Never common — epic and legendary friends!" },
];
export const ROLL_PRICE = 60;
/** What the Mystery Egg machine gives — printed on the machine, so there are no secrets. */
export const ROLL_ODDS: { tier: EggTier; pct: number }[] = [
  { tier: "sea", pct: 85 },
  { tier: "rare", pct: 12 },
  { tier: "golden", pct: 3 },
];
/** Every 10th roll is Rare or better. */
export const ROLL_PITY = 10;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}
/** The egg a roll gives: fixed by the roll's id, so every screen agrees. Roll number n is in it. */
export function rollTier(rollId: string): EggTier {
  const n = Number(rollId.split(":")[1]) || 0;
  const r = hash(rollId) * 100;
  const tier: EggTier = r < ROLL_ODDS[2].pct ? "golden" : r < ROLL_ODDS[2].pct + ROLL_ODDS[1].pct ? "rare" : "sea";
  return n > 0 && n % ROLL_PITY === 0 && tier === "sea" ? "rare" : tier;
}
/** A fresh id for something bought (unique per purchase). */
export const purchaseId = (rand: number) => Math.floor(rand * 36 ** 6).toString(36).padStart(6, "0");

// ── Food ─────────────────────────────────────────────────────────────────────────────────────
export type FoodKind = "flakes" | "shrimp" | "golden";
export const FOODS: Record<FoodKind, { name: string; price: number; pack: number; grow: number }> = {
  flakes: { name: "Fish Flakes", price: 20, pack: 5, grow: 20 },
  shrimp: { name: "Shrimp Treats", price: 45, pack: 5, grow: 50 },
  golden: { name: "Golden Pellets", price: 90, pack: 3, grow: 120 },
};
export const FOOD_ORDER: FoodKind[] = ["flakes", "shrimp", "golden"];
/** A creature eats at most this many times a day (then it's full — come back tomorrow). */
export const MEALS_PER_DAY = 3;
export type Fed = { n: Record<FoodKind, number>; last: string | null; today: number };
export const NO_MEALS: Fed = { n: { flakes: 0, shrimp: 0, golden: 0 }, last: null, today: 0 };
/** Extra growth a creature has from everything it's eaten. */
export const foodGrowth = (f: Fed | undefined) => (f ? FOOD_ORDER.reduce((s, k) => s + f.n[k] * FOODS[k].grow, 0) : 0);

// ── Decorations ──────────────────────────────────────────────────────────────────────────────
export type DecorSpot = "floor" | "back" | "float";
export type Decor = { id: string; name: string; price: number; spot: DecorSpot; level?: number };
export const DECOR: Decor[] = [
  { id: "grass", name: "Sea Grass", price: 30, spot: "floor" },
  { id: "flower", name: "Sea Flower", price: 40, spot: "floor" },
  { id: "rock", name: "Big Rock", price: 30, spot: "floor" },
  { id: "shell", name: "Giant Shell", price: 50, spot: "floor" },
  { id: "star", name: "Starfish", price: 50, spot: "floor" },
  { id: "mushroom", name: "Glow Mushroom", price: 70, spot: "floor" },
  { id: "anchor", name: "Old Anchor", price: 80, spot: "floor" },
  { id: "chest", name: "Treasure Box", price: 110, spot: "floor", level: 2 },
  { id: "pineapple", name: "Pineapple House", price: 130, spot: "floor", level: 2 },
  { id: "castle", name: "Sand Castle", price: 160, spot: "back", level: 3 },
  { id: "palm", name: "Tiny Island", price: 120, spot: "back", level: 2 },
  { id: "volcano", name: "Bubble Volcano", price: 180, spot: "back", level: 4 },
  { id: "statue", name: "Stone Head", price: 200, spot: "back", level: 4 },
  { id: "mermaid", name: "Mermaid Statue", price: 220, spot: "back", level: 5 },
  { id: "ship", name: "Sunken Ship", price: 260, spot: "back", level: 5 },
  { id: "crystal", name: "Crystal Cave", price: 240, spot: "floor", level: 6 },
  { id: "trident", name: "King's Trident", price: 300, spot: "floor", level: 7 },
  { id: "balloon", name: "Party Balloon", price: 60, spot: "float" },
  { id: "moon", name: "Moon", price: 140, spot: "float", level: 3 },
  { id: "rainbow", name: "Rainbow", price: 200, spot: "float", level: 4 },
  { id: "sparkles", name: "Sparkles", price: 150, spot: "float", level: 3 },
  { id: "crown", name: "Floating Crown", price: 350, spot: "float", level: 8 },
];
export const DECOR_BY_ID = new Map(DECOR.map((d) => [d.id, d]));

// ── Tank themes ──────────────────────────────────────────────────────────────────────────────
/** A tank theme (its water, sky, sand and scenery live in the tank's scene). */
export type Tank = { id: string; name: string; price: number; level?: number };
export const TANKS: Tank[] = [
  { id: "reef", name: "Coral Reef", price: 0 },
  { id: "kelp", name: "Kelp Forest", price: 150 },
  { id: "arctic", name: "Arctic Ice", price: 220, level: 3 },
  { id: "deep", name: "Deep Sea", price: 280, level: 3 },
  { id: "lagoon", name: "Rainbow Lagoon", price: 320, level: 4 },
  { id: "night", name: "Night Glow", price: 380, level: 5 },
  { id: "lava", name: "Volcano Vent", price: 450, level: 6 },
];
export const TANK_BY_ID = new Map(TANKS.map((t) => [t.id, t]));

// ── Reading the ledger ───────────────────────────────────────────────────────────────────────
export type Aquarium = {
  food: Record<FoodKind, number>;
  decor: Decor[];
  tanks: Set<string>;
  tank: Tank;
  /** Eggs bought in the shop or won from the machine (hatched or not). */
  eggs: Egg[];
  rolls: number;
};
const TIER_NAME: Record<EggTier, string> = { sea: "Sea", rare: "Rare", golden: "Golden" };
/** Everything the aquarium shows, from what the child owns and every meal so far. */
export function aquariumOf(owned: Set<string>, fed: Record<string, Fed>, tank: string | null): Aquarium {
  const items = [...owned];
  const bought = (prefix: string) => items.filter((i) => i.startsWith(prefix));
  const food = Object.fromEntries(
    FOOD_ORDER.map((k) => {
      const eaten = Object.values(fed).reduce((s, f) => s + f.n[k], 0);
      return [k, Math.max(0, bought(`food:${k}:`).length * FOODS[k].pack - eaten)];
    }),
  ) as Record<FoodKind, number>;
  const decor = DECOR.filter((d) => owned.has(`decor:${d.id}`));
  const tanks = new Set(["reef", ...TANKS.filter((t) => owned.has(`tank:${t.id}`)).map((t) => t.id)]);
  const eggs: Egg[] = [
    ...bought("egg:").flatMap((id): Egg[] => {
      const tier = id.split(":")[1] as EggTier;
      return EGG_SHOP.some((e) => e.tier === tier) ? [{ id, tier, why: `A ${TIER_NAME[tier]} egg from the Egg Shop` }] : [];
    }),
    ...bought("roll:").map((id): Egg => ({ id, tier: rollTier(id), why: "From the Mystery Egg machine!" })),
  ];
  return { food, decor, tanks, tank: TANK_BY_ID.get(tank && tanks.has(tank) ? tank : "reef")!, eggs, rolls: bought("roll:").length };
}
