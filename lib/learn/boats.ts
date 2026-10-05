// The Shipyard: a child's boat is their character on every voyage, and everything about it is
// theirs to design with shells they earned by learning (never real money). A boat has a MODEL —
// the big upgrades, from a little sloop to a three-masted galleon, unlocked as a sailor levels up —
// plus a hull color, a paint job, sails, a flag, a figurehead at the bow, gear on deck (one thing
// per spot), a pet riding along, a trail on the map, and a name.

export type Slot = "boat" | "hull" | "paint" | "sail" | "flag" | "figure" | "deck" | "pet" | "trail";
export type DeckSpot = "bow" | "mid" | "stern" | "mast" | "side";
export type SailPattern = "solid" | "stripes" | "dots" | "stars" | "rainbow" | "waves" | "checker" | "hearts" | "bolt" | "sunburst" | "paws" | "scales";
export type PaintPattern = "plain" | "stripe" | "waves" | "dots" | "stars" | "hearts" | "flames" | "shark" | "zebra" | "checker" | "rainbow" | "gold";
export type BoatModel = "sloop" | "catamaran" | "tug" | "schooner" | "paddle" | "viking" | "duck" | "galleon";

export type ShopItem = {
  id: string;
  slot: Slot;
  name: string;
  price: number;
  /** Sailor level needed to buy it. */
  level?: number;
  /** hull: color · sail/paint: colors + pattern · flag/trail: the emblem (a drawn picture). */
  color?: string;
  color2?: string;
  pattern?: SailPattern;
  paint?: PaintPattern;
  emoji?: string;
  /** boat: which model it is, and one line about it. */
  model?: BoatModel;
  blurb?: string;
  /** deck gear: the spot it takes (one thing per spot). */
  spot?: DeckSpot;
};

export const SHOP: ShopItem[] = [
  // ── Boats: the upgrades ──
  { id: "boat-sloop", slot: "boat", name: "Little Sloop", price: 0, model: "sloop", blurb: "Your first boat — small and quick!" },
  { id: "boat-catamaran", slot: "boat", name: "Catamaran", price: 300, level: 2, model: "catamaran", blurb: "Two hulls make it super steady." },
  { id: "boat-tug", slot: "boat", name: "Tug Toot", price: 450, level: 3, model: "tug", blurb: "Small but mighty. Toot toot!" },
  { id: "boat-schooner", slot: "boat", name: "Schooner", price: 650, level: 4, model: "schooner", blurb: "Two masts — double the sails!" },
  { id: "boat-paddle", slot: "boat", name: "Paddle Steamer", price: 800, level: 5, model: "paddle", blurb: "Its big wheel turns as it goes." },
  { id: "boat-viking", slot: "boat", name: "Longship", price: 1000, level: 6, model: "viking", blurb: "Row, row! Shields along the side." },
  { id: "boat-duck", slot: "boat", name: "Rubber Ducky", price: 1200, level: 7, model: "duck", blurb: "Squeak! The silliest ship at sea." },
  { id: "boat-galleon", slot: "boat", name: "Galleon", price: 1500, level: 8, model: "galleon", blurb: "Three masts. A real tall ship!" },
  // ── Hull colors ──
  { id: "hull-coral", slot: "hull", name: "Coral Red", price: 0, color: "#ff7363" },
  { id: "hull-sky", slot: "hull", name: "Sky Blue", price: 60, color: "#1cb0f6" },
  { id: "hull-sun", slot: "hull", name: "Sunshine", price: 60, color: "#ffc83d" },
  { id: "hull-mint", slot: "hull", name: "Mint", price: 80, color: "#3ccf6e" },
  { id: "hull-teal", slot: "hull", name: "Ocean Teal", price: 80, color: "#22b8a8" },
  { id: "hull-orange", slot: "hull", name: "Tangerine", price: 80, color: "#ff9a3c" },
  { id: "hull-grape", slot: "hull", name: "Grape", price: 80, color: "#8b6cff" },
  { id: "hull-pink", slot: "hull", name: "Bubblegum", price: 100, color: "#ff6aa2" },
  { id: "hull-white", slot: "hull", name: "Snow White", price: 100, color: "#f2f5fa" },
  { id: "hull-wood", slot: "hull", name: "Old Oak", price: 150, level: 2, color: "#b98146" },
  { id: "hull-navy", slot: "hull", name: "Navy", price: 120, level: 3, color: "#23407a" },
  { id: "hull-ink", slot: "hull", name: "Midnight", price: 250, level: 5, color: "#1d2433" },
  { id: "hull-gold", slot: "hull", name: "Golden", price: 400, level: 8, color: "#e0a21a" },
  // ── Paint jobs (on the hull) ──
  { id: "paint-plain", slot: "paint", name: "Plain", price: 0, paint: "plain" },
  { id: "paint-stripe", slot: "paint", name: "Racing Stripe", price: 70, paint: "stripe", color: "#ffffff" },
  { id: "paint-waves", slot: "paint", name: "Waves", price: 90, paint: "waves", color: "#ffffff" },
  { id: "paint-dots", slot: "paint", name: "Polka Dots", price: 90, paint: "dots", color: "#ffffff" },
  { id: "paint-stars", slot: "paint", name: "Stars", price: 140, level: 2, paint: "stars", color: "#ffd23a" },
  { id: "paint-hearts", slot: "paint", name: "Hearts", price: 140, level: 2, paint: "hearts", color: "#ff7ab8" },
  { id: "paint-zebra", slot: "paint", name: "Zebra", price: 200, level: 3, paint: "zebra", color: "#2a2f45" },
  { id: "paint-checker", slot: "paint", name: "Checkers", price: 200, level: 3, paint: "checker", color: "#ffffff" },
  { id: "paint-flames", slot: "paint", name: "Flames", price: 220, level: 4, paint: "flames", color: "#ffd23a", color2: "#ff7a2f" },
  { id: "paint-shark", slot: "paint", name: "Shark Face", price: 260, level: 4, paint: "shark", color: "#ffffff" },
  { id: "paint-rainbow", slot: "paint", name: "Rainbow", price: 320, level: 6, paint: "rainbow" },
  { id: "paint-gold", slot: "paint", name: "Royal Gold", price: 450, level: 8, paint: "gold", color: "#ffd23a", color2: "#e09a00" },
  // ── Sails ──
  { id: "sail-white", slot: "sail", name: "Classic White", price: 0, color: "#ffffff", pattern: "solid" },
  { id: "sail-stripes", slot: "sail", name: "Candy Stripes", price: 90, color: "#ffffff", color2: "#ff7363", pattern: "stripes" },
  { id: "sail-dots", slot: "sail", name: "Polka Dots", price: 90, color: "#fff6d8", color2: "#1cb0f6", pattern: "dots" },
  { id: "sail-waves", slot: "sail", name: "Ocean Waves", price: 120, color: "#e8f6ff", color2: "#1cb0f6", pattern: "waves" },
  { id: "sail-hearts", slot: "sail", name: "Hearts", price: 150, level: 2, color: "#fff0f6", color2: "#ff6aa2", pattern: "hearts" },
  { id: "sail-paws", slot: "sail", name: "Paw Prints", price: 160, level: 3, color: "#fff7e6", color2: "#a8703f", pattern: "paws" },
  { id: "sail-stars", slot: "sail", name: "Starry Night", price: 180, level: 3, color: "#23407a", color2: "#ffc83d", pattern: "stars" },
  { id: "sail-checker", slot: "sail", name: "Race Flag", price: 200, level: 4, color: "#ffffff", color2: "#17324d", pattern: "checker" },
  { id: "sail-bolt", slot: "sail", name: "Lightning", price: 220, level: 4, color: "#2f6fe0", color2: "#ffd23a", pattern: "bolt" },
  { id: "sail-sunburst", slot: "sail", name: "Sunburst", price: 240, level: 5, color: "#ffb347", color2: "#fff3a8", pattern: "sunburst" },
  { id: "sail-rainbow", slot: "sail", name: "Rainbow", price: 300, level: 6, pattern: "rainbow" },
  { id: "sail-pirate", slot: "sail", name: "Pirate Black", price: 350, level: 7, color: "#1d2433", color2: "#ffffff", pattern: "solid" },
  { id: "sail-scales", slot: "sail", name: "Dragon Scales", price: 380, level: 7, color: "#2fc7b0", color2: "#128676", pattern: "scales" },
  // ── Flags ──
  { id: "flag-pennant", slot: "flag", name: "Red Pennant", price: 0, emoji: "🚩", color: "#ff4d5e" },
  { id: "flag-star", slot: "flag", name: "Star", price: 50, emoji: "⭐", color: "#2f6fe0" },
  { id: "flag-heart", slot: "flag", name: "Heart", price: 50, emoji: "💖", color: "#ffffff" },
  { id: "flag-anchor", slot: "flag", name: "Anchor", price: 70, emoji: "⚓", color: "#ffffff" },
  { id: "flag-paw", slot: "flag", name: "Paw Print", price: 70, emoji: "🐾", color: "#fff1c9" },
  { id: "flag-sun", slot: "flag", name: "Sunshine", price: 80, emoji: "☀️", color: "#5cc4ff" },
  { id: "flag-rainbow", slot: "flag", name: "Rainbow", price: 90, emoji: "🌈", color: "#ffffff" },
  { id: "flag-moon", slot: "flag", name: "Moon", price: 110, level: 2, emoji: "🌙", color: "#2a3b7a" },
  { id: "flag-lightning", slot: "flag", name: "Lightning", price: 120, level: 3, emoji: "⚡", color: "#1d2433" },
  { id: "flag-music", slot: "flag", name: "Music", price: 120, level: 3, emoji: "🎵", color: "#ffe1f0" },
  { id: "flag-crown", slot: "flag", name: "Crown", price: 220, level: 5, emoji: "👑", color: "#8b2bd9" },
  { id: "flag-pirate", slot: "flag", name: "Jolly Roger", price: 260, level: 6, emoji: "🏴‍☠️", color: "#1d2433" },
  { id: "flag-dragon", slot: "flag", name: "Dragon", price: 400, level: 9, emoji: "🐉", color: "#c41f3b" },
  // ── Figureheads (at the bow) ──
  { id: "fig-dolphin", slot: "figure", name: "Dolphin", price: 200, level: 2 },
  { id: "fig-swan", slot: "figure", name: "Swan", price: 200, level: 2 },
  { id: "fig-seahorse", slot: "figure", name: "Seahorse", price: 240, level: 3 },
  { id: "fig-owl", slot: "figure", name: "Owl", price: 280, level: 3 },
  { id: "fig-eagle", slot: "figure", name: "Eagle", price: 300, level: 4 },
  { id: "fig-lion", slot: "figure", name: "Lion", price: 340, level: 5 },
  { id: "fig-mermaid", slot: "figure", name: "Mermaid", price: 380, level: 5 },
  { id: "fig-unicorn", slot: "figure", name: "Unicorn", price: 420, level: 6 },
  { id: "fig-dragon", slot: "figure", name: "Dragon", price: 500, level: 7 },
  { id: "fig-star", slot: "figure", name: "Golden Star", price: 600, level: 8 },
  // ── Deck gear (one per spot) ──
  { id: "gear-ring", slot: "deck", name: "Life Ring", price: 80, spot: "side" },
  { id: "gear-bell", slot: "deck", name: "Ship's Bell", price: 100, spot: "bow" },
  { id: "gear-telescope", slot: "deck", name: "Telescope", price: 120, spot: "bow" },
  { id: "gear-anchor", slot: "deck", name: "Anchor", price: 90, spot: "bow" },
  { id: "gear-lantern", slot: "deck", name: "Lantern", price: 120, spot: "stern" },
  { id: "gear-wheel", slot: "deck", name: "Ship's Wheel", price: 150, level: 2, spot: "stern" },
  { id: "gear-flowers", slot: "deck", name: "Flower Pots", price: 110, spot: "mid" },
  { id: "gear-chest", slot: "deck", name: "Treasure Chest", price: 180, level: 2, spot: "mid" },
  { id: "gear-umbrella", slot: "deck", name: "Beach Umbrella", price: 140, level: 2, spot: "mid" },
  { id: "gear-fishing", slot: "deck", name: "Fishing Rod", price: 160, level: 3, spot: "mid" },
  { id: "gear-bunting", slot: "deck", name: "Party Flags", price: 160, level: 2, spot: "mast" },
  { id: "gear-nest", slot: "deck", name: "Crow's Nest", price: 220, level: 3, spot: "mast" },
  // ── Pets (they ride on deck — and they're alive) ──
  { id: "pet-parrot", slot: "pet", name: "Polly the Parrot", price: 150 },
  { id: "pet-cat", slot: "pet", name: "Ship Cat", price: 150 },
  { id: "pet-dog", slot: "pet", name: "Sea Pup", price: 150 },
  { id: "pet-bunny", slot: "pet", name: "Bunny", price: 160 },
  { id: "pet-frog", slot: "pet", name: "Frog", price: 180, level: 2 },
  { id: "pet-turtle", slot: "pet", name: "Shelly the Turtle", price: 200, level: 2 },
  { id: "pet-crab", slot: "pet", name: "Captain Crab", price: 200, level: 2 },
  { id: "pet-penguin", slot: "pet", name: "Penguin", price: 220, level: 3 },
  { id: "pet-seal", slot: "pet", name: "Seal Pup", price: 240, level: 3 },
  { id: "pet-fox", slot: "pet", name: "Fox Kit", price: 260, level: 3 },
  { id: "pet-owl", slot: "pet", name: "Night Owl", price: 280, level: 4 },
  { id: "pet-octopus", slot: "pet", name: "Octopus Pal", price: 300, level: 5 },
  { id: "pet-panda", slot: "pet", name: "Panda", price: 320, level: 5 },
  { id: "pet-dino", slot: "pet", name: "Baby Dino", price: 380, level: 7 },
  { id: "pet-dragon", slot: "pet", name: "Baby Dragon", price: 450, level: 8 },
  { id: "pet-unicorn", slot: "pet", name: "Unicorn", price: 500, level: 10 },
  // ── Trails (what the boat leaves behind) ──
  { id: "trail-bubbles", slot: "trail", name: "Splashes", price: 80, emoji: "💧" },
  { id: "trail-sparkles", slot: "trail", name: "Sparkles", price: 140, level: 2, emoji: "✨" },
  { id: "trail-hearts", slot: "trail", name: "Hearts", price: 140, level: 2, emoji: "💗" },
  { id: "trail-notes", slot: "trail", name: "Music Notes", price: 180, level: 3, emoji: "🎵" },
  { id: "trail-stars", slot: "trail", name: "Stars", price: 200, level: 4, emoji: "⭐" },
  { id: "trail-rainbow", slot: "trail", name: "Rainbow", price: 320, level: 6, emoji: "🌈" },
  { id: "trail-fire", slot: "trail", name: "Comet", price: 420, level: 8, emoji: "☄️" },
];

export const SHOP_BY_ID = new Map(SHOP.map((i) => [i.id, i]));
/** Free starter items everyone owns. */
export const STARTER_ITEMS = SHOP.filter((i) => i.price === 0).map((i) => i.id);

// ── Boat names: picked from two word wheels (read aloud for little sailors) ──
export const NAME_ADJ = ["Brave", "Happy", "Mighty", "Sparkly", "Speedy", "Sunny", "Lucky", "Jolly", "Golden", "Silver", "Little", "Super", "Swift", "Clever", "Kind", "Bold", "Starry", "Rainbow", "Gentle", "Giggly"];
export const NAME_NOUN = ["Dolphin", "Star", "Wave", "Gull", "Turtle", "Comet", "Shell", "Pearl", "Whale", "Breeze", "Otter", "Seal", "Explorer", "Voyager", "Dreamer", "Sunbeam", "Anchor", "Rocket", "Dragon", "Lighthouse"];
const NAME_OK = new RegExp(`^(${NAME_ADJ.join("|")}) (${NAME_NOUN.join("|")})$`);

export type BoatLook = {
  boat: string;
  hull: string;
  paint: string;
  sail: string;
  flag: string;
  figure: string | null;
  /** Deck gear — at most one per spot. */
  deck: string[];
  pet: string | null;
  trail: string | null;
  name: string | null;
};
export const DEFAULT_LOOK: BoatLook = { boat: "boat-sloop", hull: "hull-coral", paint: "paint-plain", sail: "sail-white", flag: "flag-pennant", figure: null, deck: [], pet: null, trail: null, name: null };

/** A look from anything (old 5-part looks, synced JSON): unknown parts fall back to defaults. */
export function lookFrom(raw: unknown): BoatLook {
  const r = (raw ?? {}) as Partial<Record<keyof BoatLook, unknown>>;
  const ok = (id: unknown, slot: Slot): id is string => typeof id === "string" && SHOP_BY_ID.get(id)?.slot === slot;
  const deck: string[] = [];
  if (Array.isArray(r.deck)) {
    const used = new Set<string>();
    for (const id of r.deck) {
      if (!ok(id, "deck")) continue;
      const spot = SHOP_BY_ID.get(id)!.spot!;
      if (used.has(spot)) continue;
      used.add(spot);
      deck.push(id);
    }
  }
  return {
    boat: ok(r.boat, "boat") ? r.boat : DEFAULT_LOOK.boat,
    hull: ok(r.hull, "hull") ? r.hull : DEFAULT_LOOK.hull,
    paint: ok(r.paint, "paint") ? r.paint : DEFAULT_LOOK.paint,
    sail: ok(r.sail, "sail") ? r.sail : DEFAULT_LOOK.sail,
    flag: ok(r.flag, "flag") ? r.flag : DEFAULT_LOOK.flag,
    figure: ok(r.figure, "figure") ? r.figure : null,
    deck,
    pet: ok(r.pet, "pet") ? r.pet : null,
    trail: ok(r.trail, "trail") ? r.trail : null,
    name: typeof r.name === "string" && NAME_OK.test(r.name) ? r.name : null,
  };
}

/** Put an item on the boat (or take it off: tapping something that's on takes it off, where
 *  that makes sense). Deck gear swaps out whatever was in its spot. */
export function equipItem(look: BoatLook, item: ShopItem): BoatLook {
  switch (item.slot) {
    case "deck": {
      const on = look.deck.includes(item.id);
      const others = look.deck.filter((id) => id !== item.id && SHOP_BY_ID.get(id)?.spot !== item.spot);
      return { ...look, deck: on ? others : [...others, item.id] };
    }
    case "pet":
    case "trail":
    case "figure":
      return { ...look, [item.slot]: look[item.slot] === item.id ? null : item.id };
    default:
      return { ...look, [item.slot]: item.id };
  }
}
/** Is this item on the boat right now? */
export const isOn = (look: BoatLook, item: ShopItem) => (item.slot === "deck" ? look.deck.includes(item.id) : look[item.slot] === item.id);
export const modelOf = (look: BoatLook): BoatModel => SHOP_BY_ID.get(look.boat)?.model ?? "sloop";
