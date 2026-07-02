// Skipper's thought bubbles — what the sailboat buddy "says." A rich, kid-safe, on-brand (nautical)
// pool that works fully OFFLINE and is always the fallback. When online + Plus, the device also caches
// a fresh AI-personalized batch (see /api/ai/skipper) and those get MERGED into these pools by category,
// so the lines stay meaningful, helpful, motivational, and fun — and never repeat too much.

export type SkipperCategory = "greet" | "cheer" | "tip" | "joke" | "mindful" | "celebrate";

export type SkipperContext = {
  name: string;
  /** 0-23 local hour, for time-aware greetings. */
  hour: number;
  done: number;
  total: number;
  /** routine.type or name, lowercased — used to pick a relevant tip. */
  routine?: string;
  /** what just happened, to bias the category. */
  event?: "idle" | "open" | "step" | "allDone";
  night?: boolean;
};

const GREET = {
  morning: ["Good morning, {name}! Ready to set sail? ☀️", "Rise and shine, {name}! Let's cast off! ⛵", "Morning, captain {name}! The sea is calm and ready."],
  afternoon: ["Ahoy, {name}! What's our next adventure?", "Afternoon, {name}! Wind's at our back. 🌊", "Hi {name}! Let's keep our voyage going."],
  evening: ["Evening, {name}! Let's finish strong. 🌆", "Ahoy {name}! Home stretch to the harbor.", "Hi {name}! A few more waves to go."],
  night: ["The stars are out, {name}. 🌙", "Quiet seas tonight, {name}. Almost bedtime.", "Evening, {name}. Let's wind down gently. ✨"],
};

const CHEER = [
  "You've got this, captain! ⛵",
  "One wave at a time — that's how we cross the ocean!",
  "I believe in you, {name}! 🌟",
  "Steady as she goes — you're doing great!",
  "Look at you go! Full speed ahead! 💨",
  "Every little step moves our boat forward.",
  "You're a brave sailor, {name}!",
  "Keep going — the harbor's in sight! 🚢",
];

const ALMOST = [
  "Almost to the harbor — keep going! 🏁",
  "So close, {name}! One more push!",
  "I can see the dock from here — nearly done!",
  "Last stretch, captain! You've got this.",
];

const CELEBRATE = [
  "We did it! Smooth sailing, {name}! 🎉",
  "Anchors up — you finished! I'm so proud! ⚓",
  "What a voyage! High five, captain! ✋",
  "You're the best first mate a boat could ask for! 🌟",
  "Hooray! We sailed all the way through! 🎊",
];

// Tips keyed by routine flavor; "any" is the general bucket.
const TIP: Record<string, string[]> = {
  morning: ["A big glass of water helps your body wake up! 💧", "Sunshine on your face tells your brain it's daytime. ☀️", "Doing the hardest thing first makes the rest feel easy!"],
  bedtime: ["A dark, cozy room helps your brain drift off. 🌙", "Slow, quiet things help sleep sneak up on you.", "Tucking in your favorite toy makes bedtime cozier. 🧸"],
  night: ["A dark, cozy room helps your brain drift off. 🌙", "Slow breaths help your body get sleepy.", "Screens off helps your eyes rest. 😴"],
  teeth: ["Brush in tiny circles — your teeth love it! 🪥", "Count to ten on the top, ten on the bottom!", "Even the back teeth need a little scrub."],
  hygiene: ["Warm water and a little soap — squeaky clean! 🧼", "Don't forget between your fingers!", "A fresh face wakes you right up."],
  clean: ["A tidy room is a happy harbor! 🧹", "One toy at a time — that's how the deck gets clean.", "Everything has its own little dock to rest in."],
  homework: ["Break big tasks into little rowing strokes. 🚣", "A quiet spot helps your brain focus.", "Take a breath if it feels tricky — then try again."],
  any: [
    "Break big jobs into little rowing strokes. 🚣",
    "It helps to say each step out loud!",
    "Take a slow breath and start with just the first thing.",
    "You can do hard things, one at a time.",
  ],
};

const JOKE = [
  "What did the ocean say to the boat? Nothing — it just waved! 🌊",
  "How do boats say hello? They wave! 👋",
  "Why are boats so smart? They always pay a-tow-tion! ⚓",
  "What's a sailboat's favorite snack? A ship-wich! 🥪",
  "What do you call a boat that never sinks? Un-sink-able — just like you! 💪",
  "Why did the little boat feel brave? It had lots of pluck... and a big sail! ⛵",
  "What's the sea's favorite word? Shore! Get it? 😄",
  "How does the ocean say goodbye? It waves again! 🌊",
  "Why did I bring a map to bed? To chart my dreams! 🗺️",
  "What do you call a happy sailor? A ship-py camper! 🏕️",
];

const MINDFUL = [
  "Let's take one big, slow breath together. 🌬️",
  "It's okay to go slow. Steady wins the voyage.",
  "You are doing great, exactly as you are. 💙",
  "Feeling wobbly? I'm right here with you. ⛵",
  "Every sailor rests. It's okay to take a moment.",
  "You are safe in the harbor. Let's take it easy.",
];

function timeBucket(hour: number, night?: boolean): keyof typeof GREET {
  if (night || hour >= 20 || hour < 5) return "night";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function routineBucket(routine?: string): string {
  const r = (routine ?? "").toLowerCase();
  if (/(bed|night|sleep|wind)/.test(r)) return "bedtime";
  if (/(tooth|teeth|brush)/.test(r)) return "teeth";
  if (/(wash|bath|shower|hygien|clean up your|face|hand)/.test(r)) return "hygiene";
  if (/(clean|tidy|chore|room|toy)/.test(r)) return "clean";
  if (/(home ?work|study|read|learn)/.test(r)) return "homework";
  if (/(morning|wake)/.test(r)) return "morning";
  return "any";
}

/** Deterministic-ish pick without Math.random (SSR/replay safe): rotate by a seed the caller bumps. */
function at<T>(arr: T[], seed: number): T {
  if (arr.length === 0) return undefined as unknown as T;
  return arr[((seed % arr.length) + arr.length) % arr.length];
}

function fill(line: string, name: string): string {
  return line.replaceAll("{name}", name || "friend");
}

/**
 * Pick Skipper's next line for the given context. `seed` should change per rotation (e.g. a counter or
 * a stamped time bucket) so lines vary; pass AI-cached pools via `extra` to blend them in by category.
 */
export function skipperLine(ctx: SkipperContext, seed: number, extra?: Partial<Record<SkipperCategory, string[]>>): { text: string; category: SkipperCategory } {
  const pool = (cat: SkipperCategory, base: string[]): string[] => {
    const add = extra?.[cat];
    return add && add.length ? [...base, ...add] : base;
  };

  // Finishing everything → a proud celebration.
  if (ctx.event === "allDone") {
    return { text: fill(at(pool("celebrate", CELEBRATE), seed), ctx.name), category: "celebrate" };
  }
  // Just completed a step → cheer (or an "almost there" when one's left).
  if (ctx.event === "step") {
    const almostDone = ctx.total > 0 && ctx.total - ctx.done === 1;
    const arr = almostDone ? pool("cheer", ALMOST) : pool("cheer", CHEER);
    return { text: fill(at(arr, seed), ctx.name), category: "cheer" };
  }
  // Night wind-down → mindful + gentle bedtime tips only.
  if (ctx.night || ctx.hour >= 20) {
    const arr = seed % 2 === 0 ? pool("mindful", MINDFUL) : pool("tip", TIP.bedtime);
    return { text: fill(at(arr, seed), ctx.name), category: seed % 2 === 0 ? "mindful" : "tip" };
  }
  // Landing somewhere new: a warm greeting on the home hub, a relevant tip inside a routine.
  if (ctx.event === "open") {
    if (ctx.routine) {
      return { text: fill(at(pool("tip", TIP[routineBucket(ctx.routine)] ?? TIP.any), seed), ctx.name), category: "tip" };
    }
    return { text: fill(at(GREET[timeBucket(ctx.hour, ctx.night)], seed), ctx.name), category: "greet" };
  }

  // Idle rotation: cycle tip → joke → cheer → mindful for variety.
  const rota: SkipperCategory[] = ["tip", "joke", "cheer", "mindful"];
  const cat = rota[((seed % rota.length) + rota.length) % rota.length];
  const base =
    cat === "tip" ? (TIP[routineBucket(ctx.routine)] ?? TIP.any) :
    cat === "joke" ? JOKE :
    cat === "cheer" ? CHEER :
    MINDFUL;
  return { text: fill(at(pool(cat, base), seed), ctx.name), category: cat };
}

/** A safe first line for a brand-new device before anything else is known. */
export function skipperHello(name: string, hour: number): string {
  return fill(GREET[timeBucket(hour)][0], name);
}
