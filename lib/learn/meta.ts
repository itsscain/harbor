import type { LevelKind, ThemeId } from "./types";

// Harbor Learn's game layer: shells (the currency a child earns by learning), the Harbor Shop
// (customize your boat — it's the character that sails every voyage), the world themes the boat
// sails through, and the titles a sailor earns. Everything is earned by learning; nothing costs
// real money, ever.

// ── Shells ───────────────────────────────────────────────────────────────────────────────────
export const SHELLS = {
  lesson: 10,
  perStar: 5,
  combo: 5, // a run of 5+ right in a row
  boss: 25,
  practice: 8,
  starChest: 30,
  dailyChest: [20, 45] as const,
  setComplete: 60,
  worldComplete: 100,
  duplicate: 3,
  goldenFish: [8, 20] as const,
};

/** Shells for a finished lesson. First clears pay double; replays pay half (practice still pays). */
export function shellsForLesson(o: { stars: number; kind: LevelKind; firstClear: boolean; bestCombo: number; passed: boolean }): number {
  if (!o.passed) return 3; // effort still counts
  let n = o.kind === "practice" ? SHELLS.practice : SHELLS.lesson + SHELLS.perStar * o.stars;
  if (o.bestCombo >= 5) n += SHELLS.combo;
  if (o.kind === "boss") n += SHELLS.boss;
  if (o.kind !== "practice") n = o.firstClear ? n * 2 : Math.ceil(n / 2);
  return Math.min(200, n);
}

// ── The boat (the child's character) + the Harbor Shop ───────────────────────────────────────
export type Slot = "hull" | "sail" | "flag" | "pet" | "trail";
export type ShopItem = {
  id: string;
  slot: Slot;
  name: string;
  price: number;
  /** hull/sail: colors; sail pattern; flag/pet: emoji; trail: effect emoji. */
  color?: string;
  color2?: string;
  pattern?: "solid" | "stripes" | "dots" | "stars" | "rainbow" | "waves" | "checker";
  emoji?: string;
  /** Sailor level needed to buy it. */
  level?: number;
};

export const SHOP: ShopItem[] = [
  // Hulls
  { id: "hull-coral", slot: "hull", name: "Coral Red", price: 0, color: "#ff7363" },
  { id: "hull-sky", slot: "hull", name: "Sky Blue", price: 60, color: "#1cb0f6" },
  { id: "hull-sun", slot: "hull", name: "Sunshine", price: 60, color: "#ffc83d" },
  { id: "hull-mint", slot: "hull", name: "Mint", price: 80, color: "#3ccf6e" },
  { id: "hull-grape", slot: "hull", name: "Grape", price: 80, color: "#8b6cff" },
  { id: "hull-pink", slot: "hull", name: "Bubblegum", price: 100, color: "#ff6aa2" },
  { id: "hull-navy", slot: "hull", name: "Navy", price: 120, color: "#23407a", level: 3 },
  { id: "hull-gold", slot: "hull", name: "Golden", price: 400, color: "#e0a21a", level: 8 },
  { id: "hull-ink", slot: "hull", name: "Midnight", price: 250, color: "#1d2433", level: 5 },
  // Sails
  { id: "sail-white", slot: "sail", name: "Classic White", price: 0, color: "#ffffff", pattern: "solid" },
  { id: "sail-stripes", slot: "sail", name: "Candy Stripes", price: 90, color: "#ffffff", color2: "#ff7363", pattern: "stripes" },
  { id: "sail-dots", slot: "sail", name: "Polka Dots", price: 90, color: "#fff6d8", color2: "#1cb0f6", pattern: "dots" },
  { id: "sail-waves", slot: "sail", name: "Ocean Waves", price: 120, color: "#e8f6ff", color2: "#1cb0f6", pattern: "waves" },
  { id: "sail-stars", slot: "sail", name: "Starry Night", price: 180, color: "#23407a", color2: "#ffc83d", pattern: "stars", level: 3 },
  { id: "sail-checker", slot: "sail", name: "Race Flag", price: 200, color: "#ffffff", color2: "#17324d", pattern: "checker", level: 4 },
  { id: "sail-rainbow", slot: "sail", name: "Rainbow", price: 300, pattern: "rainbow", level: 6 },
  { id: "sail-pirate", slot: "sail", name: "Pirate Black", price: 350, color: "#1d2433", color2: "#ffffff", pattern: "solid", level: 7 },
  // Flags
  { id: "flag-pennant", slot: "flag", name: "Red Pennant", price: 0, emoji: "🚩" },
  { id: "flag-star", slot: "flag", name: "Star", price: 50, emoji: "⭐" },
  { id: "flag-heart", slot: "flag", name: "Heart", price: 50, emoji: "💖" },
  { id: "flag-anchor", slot: "flag", name: "Anchor", price: 70, emoji: "⚓" },
  { id: "flag-rainbow", slot: "flag", name: "Rainbow", price: 90, emoji: "🌈" },
  { id: "flag-lightning", slot: "flag", name: "Lightning", price: 120, emoji: "⚡", level: 3 },
  { id: "flag-crown", slot: "flag", name: "Crown", price: 220, emoji: "👑", level: 5 },
  { id: "flag-pirate", slot: "flag", name: "Jolly Roger", price: 260, emoji: "🏴‍☠️", level: 6 },
  { id: "flag-dragon", slot: "flag", name: "Dragon", price: 400, emoji: "🐉", level: 9 },
  // Pets (ride on deck)
  { id: "pet-parrot", slot: "pet", name: "Polly the Parrot", price: 150, emoji: "🦜" },
  { id: "pet-cat", slot: "pet", name: "Ship Cat", price: 150, emoji: "🐱" },
  { id: "pet-dog", slot: "pet", name: "Sea Pup", price: 150, emoji: "🐶" },
  { id: "pet-penguin", slot: "pet", name: "Penguin", price: 220, emoji: "🐧", level: 3 },
  { id: "pet-frog", slot: "pet", name: "Frog", price: 180, emoji: "🐸", level: 2 },
  { id: "pet-octopus", slot: "pet", name: "Octopus Pal", price: 300, emoji: "🐙", level: 5 },
  { id: "pet-dino", slot: "pet", name: "Baby Dino", price: 380, emoji: "🦖", level: 7 },
  { id: "pet-unicorn", slot: "pet", name: "Unicorn", price: 500, emoji: "🦄", level: 10 },
  // Trails (what the boat leaves behind on the map)
  { id: "trail-bubbles", slot: "trail", name: "Splashes", price: 80, emoji: "💧" },
  { id: "trail-sparkles", slot: "trail", name: "Sparkles", price: 140, emoji: "✨", level: 2 },
  { id: "trail-hearts", slot: "trail", name: "Hearts", price: 140, emoji: "💗", level: 2 },
  { id: "trail-stars", slot: "trail", name: "Stars", price: 200, emoji: "⭐", level: 4 },
  { id: "trail-rainbow", slot: "trail", name: "Rainbow", price: 320, emoji: "🌈", level: 6 },
  { id: "trail-fire", slot: "trail", name: "Comet", price: 420, emoji: "☄️", level: 8 },
];

export const SHOP_BY_ID = new Map(SHOP.map((i) => [i.id, i]));
export type BoatLook = { hull: string; sail: string; flag: string; pet: string | null; trail: string | null };
export const DEFAULT_LOOK: BoatLook = { hull: "hull-coral", sail: "sail-white", flag: "flag-pennant", pet: null, trail: null };
/** Free starter items everyone owns. */
export const STARTER_ITEMS = SHOP.filter((i) => i.price === 0).map((i) => i.id);

export function lookFrom(raw: unknown): BoatLook {
  const r = (raw ?? {}) as Partial<BoatLook>;
  const ok = (id: unknown, slot: Slot) => typeof id === "string" && SHOP_BY_ID.get(id)?.slot === slot;
  return {
    hull: ok(r.hull, "hull") ? r.hull! : DEFAULT_LOOK.hull,
    sail: ok(r.sail, "sail") ? r.sail! : DEFAULT_LOOK.sail,
    flag: ok(r.flag, "flag") ? r.flag! : DEFAULT_LOOK.flag,
    pet: ok(r.pet, "pet") ? r.pet! : null,
    trail: ok(r.trail, "trail") ? r.trail! : null,
  };
}

// ── Sailor titles by level ────────────────────────────────────────────────────────────────────
export const TITLES = ["Deckhand", "Sailor", "Navigator", "Lookout", "First Mate", "Captain", "Commodore", "Admiral", "Sea Legend", "Ocean Master"];

// ── World themes (map + lesson scenery) ──────────────────────────────────────────────────────
export type Theme = { name: string; sky: [string, string]; sea: [string, string]; path: string; deco: string[]; dusk?: [string, string] };
export const THEMES: Record<ThemeId, Theme> = {
  shallows: { name: "Starfish Shallows", sky: ["#9be7ff", "#5fd0f3"], sea: ["#36c6e6", "#1aa6d6"], path: "#fff7d6", deco: ["🏝️", "⭐", "🐚", "🌴", "🦀"] },
  coral: { name: "Coral Kingdom", sky: ["#ffd3e8", "#ff9fc8"], sea: ["#ff7fb0", "#d94f93"], path: "#fff1f8", deco: ["🌺", "🐠", "🐡", "🐚", "🦐"] },
  kelp: { name: "Kelp Forest", sky: ["#c9f7d8", "#7fe0a5"], sea: ["#2fbf7f", "#14935b"], path: "#effff4", deco: ["🌿", "🐢", "🐟", "🦦", "🍀"] },
  pirate: { name: "Pirate Cove", sky: ["#ffe2a8", "#ffbf5e"], sea: ["#d99a3a", "#a86b1e"], path: "#fff4dc", deco: ["🏴‍☠️", "💰", "🗺️", "⚓", "🦜"] },
  ice: { name: "Frosty Fjords", sky: ["#eaf7ff", "#bfe6ff"], sea: ["#8fd0f5", "#4fa9df"], path: "#ffffff", deco: ["🧊", "🐧", "❄️", "🦭", "⛄"] },
  volcano: { name: "Volcano Isle", sky: ["#ffd0b0", "#ff9b6a"], sea: ["#ff6d4a", "#c9412a"], path: "#fff0e6", deco: ["🌋", "🔥", "🦖", "🪨", "💎"] },
  jungle: { name: "Jungle River", sky: ["#e2ffb8", "#aee86a"], sea: ["#6cc23f", "#43941f"], path: "#f7ffe8", deco: ["🌴", "🐒", "🦜", "🐸", "🍌"] },
  night: { name: "Moonlit Bay", sky: ["#5a5fd6", "#2e2f8f"], sea: ["#3a3fb8", "#1f2275"], path: "#e8e9ff", deco: ["🌙", "⭐", "🦉", "✨", "🌌"] },
  storm: { name: "Thunder Straits", sky: ["#c7d3e3", "#8ea3bd"], sea: ["#6684a6", "#3f5b7e"], path: "#f2f6fb", deco: ["⛈️", "⚡", "🌊", "🐋", "🦈"] },
  sky: { name: "Sky Harbor", sky: ["#e6f3ff", "#b6dcff"], sea: ["#9fc8ff", "#6aa7f2"], path: "#ffffff", deco: ["☁️", "🎈", "🪁", "🌈", "🦅"] },
  deep: { name: "Kraken Deep", sky: ["#2a4c8c", "#122a5c"], sea: ["#0f3a7a", "#071d47"], path: "#dfe9ff", deco: ["🐙", "🦑", "🐡", "💧", "🧜"] },
  candy: { name: "Candy Cay", sky: ["#fff0ff", "#ffd0f6"], sea: ["#d9a8ff", "#b07bff"], path: "#ffffff", deco: ["🍭", "🍬", "🧁", "🍩", "🍓"] },
};
export const THEME_ORDER: ThemeId[] = ["shallows", "coral", "kelp", "pirate", "ice", "jungle", "volcano", "night", "sky", "storm", "candy", "deep"];
export const themeFor = (worldIndex: number): ThemeId => THEME_ORDER[worldIndex % THEME_ORDER.length];
