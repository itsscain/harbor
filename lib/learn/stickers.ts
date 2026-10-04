// The sticker album — themed sets a child fills from treasure chests. A surprise every time
// (variable rewards are what make "one more lesson" irresistible), biased toward stickers they
// don't have yet so sets keep filling, with rare, epic and legendary finds to hunt for — and a
// small chance of a SHINY version of any sticker. Finishing a set earns a big bonus. Picked
// deterministically from a seed, so the same lesson play gives the same sticker on every screen.

export type Rarity = "common" | "rare" | "epic" | "legendary";
export type Sticker = { id: string; emoji: string; name: string; rarity: Rarity; set: string };
export type StickerSet = { id: string; name: string; emoji: string; color: string };

export const SETS: StickerSet[] = [
  { id: "ocean", name: "Ocean Friends", emoji: "🐠", color: "#1cb0f6" },
  { id: "legends", name: "Sea Legends", emoji: "🐉", color: "#8b6cff" },
  { id: "dino", name: "Dino Island", emoji: "🦕", color: "#3ccf6e" },
  { id: "space", name: "Space Voyage", emoji: "🚀", color: "#4c5bd4" },
  { id: "garden", name: "Bug Garden", emoji: "🐞", color: "#7cc54b" },
  { id: "snacks", name: "Snack Shack", emoji: "🍩", color: "#ff9149" },
  { id: "wheels", name: "Things That Go", emoji: "🚒", color: "#ff7363" },
  { id: "jungle", name: "Jungle Trek", emoji: "🦁", color: "#e0a21a" },
  { id: "farm", name: "Happy Farm", emoji: "🐮", color: "#c97733" },
  { id: "magic", name: "Magic Kingdom", emoji: "🦄", color: "#e05fb0" },
  { id: "sky", name: "Sky & Weather", emoji: "🌈", color: "#4cc3f0" },
  { id: "sports", name: "Game Day", emoji: "⚽", color: "#22c59b" },
];

const st = (set: string, rarity: Rarity, list: [string, string, string][]): Sticker[] => list.map(([id, emoji, name]) => ({ id, emoji, name, rarity, set }));

export const STICKERS: Sticker[] = [
  // Ocean Friends (ids kept from the first sticker book so nobody loses a sticker)
  ...st("ocean", "common", [["fish", "🐟", "Fish"], ["tropical", "🐠", "Tropical Fish"], ["puffer", "🐡", "Puffer Fish"], ["crab", "🦀", "Crab"], ["shell", "🐚", "Spiral Shell"], ["shrimp", "🦐", "Shrimp"], ["turtle", "🐢", "Sea Turtle"], ["starfish", "⭐", "Starfish"]]),
  ...st("ocean", "rare", [["octopus", "🐙", "Octopus"], ["dolphin", "🐬", "Dolphin"], ["seal", "🦭", "Seal"], ["otter", "🦦", "Otter"]]),
  ...st("ocean", "epic", [["whale", "🐳", "Whale"], ["shark", "🦈", "Shark"]]),
  // Sea Legends
  ...st("legends", "common", [["wave", "🌊", "Big Wave"], ["anchor", "⚓", "Anchor"], ["sailboat", "⛵", "Sailboat"], ["island", "🏝️", "Island"]]),
  ...st("legends", "rare", [["squid", "🦑", "Giant Squid"], ["lobster", "🦞", "Lobster"], ["compass", "🧭", "Golden Compass"]]),
  ...st("legends", "epic", [["pirate", "🏴‍☠️", "Pirate Flag"], ["crown", "👑", "Lost Crown"]]),
  ...st("legends", "legendary", [["dragon", "🐉", "Sea Dragon"], ["mermaid", "🧜", "Mermaid"], ["gem", "💎", "Treasure Gem"]]),
  // Dino Island
  ...st("dino", "common", [["dino-egg", "🥚", "Dino Egg"], ["bone", "🦴", "Fossil Bone"], ["volcano", "🌋", "Volcano"], ["fern", "🌿", "Fern"], ["footprint", "🐾", "Footprint"]]),
  ...st("dino", "rare", [["sauropod", "🦕", "Long-Neck"], ["lizard", "🦎", "Lizard"], ["croc", "🐊", "Crocodile"]]),
  ...st("dino", "epic", [["trex", "🦖", "T. Rex"]]),
  ...st("dino", "legendary", [["meteor", "☄️", "Meteor"]]),
  // Space Voyage
  ...st("space", "common", [["moon", "🌙", "Moon"], ["star2", "🌟", "Shining Star"], ["planet", "🪐", "Ringed Planet"], ["earth", "🌍", "Earth"], ["telescope", "🔭", "Telescope"]]),
  ...st("space", "rare", [["rocket", "🚀", "Rocket"], ["satellite", "🛰️", "Satellite"], ["astronaut", "👩‍🚀", "Astronaut"]]),
  ...st("space", "epic", [["ufo", "🛸", "UFO"], ["alien", "👽", "Friendly Alien"]]),
  ...st("space", "legendary", [["galaxy", "🌌", "Galaxy"]]),
  // Bug Garden
  ...st("garden", "common", [["ladybug", "🐞", "Ladybug"], ["bee", "🐝", "Bee"], ["snail", "🐌", "Snail"], ["sunflower", "🌻", "Sunflower"], ["tulip", "🌷", "Tulip"]]),
  ...st("garden", "rare", [["butterfly", "🦋", "Butterfly"], ["caterpillar", "🐛", "Caterpillar"], ["cricket", "🦗", "Cricket"]]),
  ...st("garden", "epic", [["mushroom", "🍄", "Magic Mushroom"]]),
  ...st("garden", "legendary", [["hibiscus", "🌺", "Rare Flower"]]),
  // Snack Shack
  ...st("snacks", "common", [["apple", "🍎", "Apple"], ["banana", "🍌", "Banana"], ["cookie", "🍪", "Cookie"], ["pizza", "🍕", "Pizza"], ["taco", "🌮", "Taco"]]),
  ...st("snacks", "rare", [["donut", "🍩", "Donut"], ["icecream", "🍦", "Ice Cream"], ["cupcake", "🧁", "Cupcake"]]),
  ...st("snacks", "epic", [["cake", "🎂", "Birthday Cake"]]),
  ...st("snacks", "legendary", [["candy-castle", "🍭", "Giant Lollipop"]]),
  // Things That Go
  ...st("wheels", "common", [["car", "🚗", "Car"], ["bus", "🚌", "Bus"], ["bike", "🚲", "Bike"], ["train", "🚂", "Train"], ["tractor", "🚜", "Tractor"]]),
  ...st("wheels", "rare", [["firetruck", "🚒", "Fire Truck"], ["helicopter", "🚁", "Helicopter"], ["racecar", "🏎️", "Race Car"]]),
  ...st("wheels", "epic", [["plane", "✈️", "Jet Plane"]]),
  ...st("wheels", "legendary", [["ship", "🚢", "Ocean Liner"]]),
  // Jungle Trek
  ...st("jungle", "common", [["monkey", "🐒", "Monkey"], ["parrot", "🦜", "Parrot"], ["frog", "🐸", "Frog"], ["palm", "🌴", "Palm Tree"], ["snake", "🐍", "Snake"]]),
  ...st("jungle", "rare", [["lion", "🦁", "Lion"], ["tiger", "🐯", "Tiger"], ["zebra", "🦓", "Zebra"]]),
  ...st("jungle", "epic", [["elephant", "🐘", "Elephant"], ["gorilla", "🦍", "Gorilla"]]),
  ...st("jungle", "legendary", [["peacock", "🦚", "Peacock"]]),
  // Happy Farm
  ...st("farm", "common", [["cow", "🐮", "Cow"], ["pig", "🐷", "Pig"], ["chick", "🐤", "Chick"], ["sheep", "🐑", "Sheep"], ["duck", "🦆", "Duck"]]),
  ...st("farm", "rare", [["horse", "🐴", "Horse"], ["goat", "🐐", "Goat"], ["rooster", "🐓", "Rooster"]]),
  ...st("farm", "epic", [["barn", "🏡", "Red Barn"]]),
  ...st("farm", "legendary", [["golden-corn", "🌽", "Golden Corn"]]),
  // Magic Kingdom
  ...st("magic", "common", [["tophat", "🎩", "Magic Hat"], ["castle", "🏰", "Castle"], ["crystal", "🔮", "Crystal Ball"], ["sparkles", "✨", "Sparkles"]]),
  ...st("magic", "rare", [["fairy", "🧚", "Fairy"], ["wizard", "🧙", "Wizard"], ["genie", "🧞", "Genie"]]),
  ...st("magic", "epic", [["unicorn", "🦄", "Unicorn"], ["carousel", "🎠", "Magic Carousel"]]),
  ...st("magic", "legendary", [["dragon-egg", "🐲", "Dragon Friend"]]),
  // Sky & Weather
  ...st("sky", "common", [["sun", "☀️", "Sunny Day"], ["cloud", "☁️", "Cloud"], ["umbrella", "☂️", "Umbrella"], ["snowflake", "❄️", "Snowflake"]]),
  ...st("sky", "rare", [["rainbow", "🌈", "Rainbow Bridge"], ["tornado", "🌪️", "Twister"], ["snowman", "⛄", "Snowman"]]),
  ...st("sky", "epic", [["lightning", "⚡", "Lightning"]]),
  ...st("sky", "legendary", [["aurora", "🎆", "Fireworks Sky"]]),
  // Game Day
  ...st("sports", "common", [["soccer", "⚽", "Soccer Ball"], ["basketball", "🏀", "Basketball"], ["baseball", "⚾", "Baseball"], ["kite", "🪁", "Kite"], ["skate", "🛹", "Skateboard"]]),
  ...st("sports", "rare", [["medal", "🏅", "Gold Medal"], ["goal", "🥅", "Goal Net"], ["swim", "🏊", "Swimmer"]]),
  ...st("sports", "epic", [["trophy", "🏆", "Trophy"]]),
  ...st("sports", "legendary", [["rocket-shoe", "👟", "Lightning Shoes"]]),
];

export const STICKER_BY_ID = new Map(STICKERS.map((s) => [s.id, s]));
export const SET_BY_ID = new Map(SETS.map((s) => [s.id, s]));
export const stickersInSet = (set: string) => STICKERS.filter((s) => s.set === set);
export const RARITY_COLOR: Record<Rarity, string> = { common: "#1cb0f6", rare: "#22c59b", epic: "#8b6cff", legendary: "#ffc83d" };
export const RARITY_LABEL: Record<Rarity, string> = { common: "Sticker", rare: "Rare!", epic: "Epic!", legendary: "Legendary!" };

/** Stored sticker ids may carry a shiny marker: "shark*". */
export const isShiny = (id: string) => id.endsWith("*");
export const baseId = (id: string) => id.replace(/\*$/, "");

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

export type ChestKind = "wood" | "silver" | "gold";

/** Which sticker a chest holds. Better chests (perfect lessons, bosses) find rarer things. */
export function pickSticker(seed: string, owned: Record<string, number>, chest: ChestKind = "wood"): { sticker: Sticker; shiny: boolean } {
  const weights: Record<ChestKind, Record<Rarity, number>> = {
    wood: { common: 64, rare: 26, epic: 8, legendary: 2 },
    silver: { common: 45, rare: 35, epic: 15, legendary: 5 },
    gold: { common: 20, rare: 38, epic: 28, legendary: 14 },
  };
  const w = weights[chest];
  const total = w.common + w.rare + w.epic + w.legendary;
  const roll = hash(seed + ":rarity") * total;
  const rarity: Rarity = roll < w.legendary ? "legendary" : roll < w.legendary + w.epic ? "epic" : roll < w.legendary + w.epic + w.rare ? "rare" : "common";
  const tier = STICKERS.filter((s) => s.rarity === rarity);
  const has = (id: string) => (owned[id] ?? 0) > 0 || (owned[`${id}*`] ?? 0) > 0;
  const fresh = tier.filter((s) => !has(s.id));
  // Mostly something new (so the album fills), sometimes a repeat (so new ones stay exciting).
  const pool = fresh.length && hash(seed + ":fresh") < 0.8 ? fresh : tier;
  const sticker = pool[Math.floor(hash(seed + ":pick") * pool.length)];
  const shiny = hash(seed + ":shiny") < (chest === "gold" ? 0.12 : 0.05);
  return { sticker, shiny };
}

/** Album progress: per set, how many found (shiny counts as found). */
export function albumProgress(owned: Record<string, number>) {
  return SETS.map((set) => {
    const all = stickersInSet(set.id);
    const found = all.filter((s) => (owned[s.id] ?? 0) > 0 || (owned[`${s.id}*`] ?? 0) > 0).length;
    return { set, found, total: all.length, complete: found === all.length };
  });
}
