import type { LevelKind, ThemeId } from "./types";

// Harbor Learn's game layer: shells (the currency a child earns by learning), the Shipyard
// (design your boat — it's the character that sails every voyage; catalog in ./boats.ts), the
// world themes the boat sails through, and the titles a sailor earns. Everything is earned by
// learning; nothing costs real money, ever.

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

// ── The boat (the child's character) + the Shipyard: see ./boats.ts ───────────────────────────
export { SHOP, SHOP_BY_ID, STARTER_ITEMS, DEFAULT_LOOK, lookFrom, equipItem, isOn, modelOf } from "./boats";
export type { Slot, ShopItem, BoatLook, BoatModel, DeckSpot } from "./boats";

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
