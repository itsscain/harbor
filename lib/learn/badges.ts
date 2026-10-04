import type { SubjectId } from "./types";
import { lessonById } from "./curriculum";
import { isMastered } from "./mastery";
import { albumProgress, STICKERS } from "./stickers";
import { HERO_BY_ID, HEROES, type Hero } from "./heroes";
import { bestStreak, islandsDone } from "./reef";
import type { KidLearn } from "./progress";

// The Trophy Room: badges for the things worth celebrating — and not only winning. "Never Give
// Up" (passing a level you didn't pass the first time) and "Practice Makes Progress" sit next to
// streaks and perfect bosses, because praising effort and strategy is what builds a learner who
// keeps going (growth mindset). Everything is derived from progress, so badges can't be lost.

export type BadgeTier = "bronze" | "silver" | "gold";
export type Badge = { id: string; name: string; emoji: string; desc: string; tier: BadgeTier; goal: number; stat: keyof BadgeStats; subject?: SubjectId };

export type BadgeStats = {
  passed: number;
  perfect: number;
  bosses: number;
  islands: number;
  streak: number;
  mastered: number;
  comebacks: number;
  practice: number;
  verses: number;
  stories: number;
  subjects: number;
  stickers: number;
  creatures: number;
  cards: number;
  gym: number;
  reading: number;
  math: number;
  code: number;
  manners: number;
  faith: number;
};

const b = (id: string, name: string, emoji: string, desc: string, tier: BadgeTier, stat: keyof BadgeStats, goal: number, subject?: SubjectId): Badge => ({ id, name, emoji, desc, tier, stat, goal, subject });

export const BADGES: Badge[] = [
  b("first", "First Voyage", "🚀", "Pass your first level", "bronze", "passed", 1),
  b("ten", "Deckhand", "⚓", "Pass 10 levels", "bronze", "passed", 10),
  b("fifty", "Navigator", "🧭", "Pass 50 levels", "silver", "passed", 50),
  b("onefifty", "Admiral", "🎖️", "Pass 150 levels", "gold", "passed", 150),
  b("perfect1", "Perfect!", "⭐", "Get 3 stars on a level", "bronze", "perfect", 1),
  b("perfect25", "Star Collector", "🌟", "Get 3 stars on 25 levels", "silver", "perfect", 25),
  b("perfect100", "Superstar", "💫", "Get 3 stars on 100 levels", "gold", "perfect", 100),
  b("boss1", "Kraken Tamer", "🐙", "Beat a boss level", "bronze", "bosses", 1),
  b("boss10", "Monster Hunter", "🦑", "Beat 10 bosses", "silver", "bosses", 10),
  b("boss30", "Sea Master", "🔱", "Beat 30 bosses", "gold", "bosses", 30),
  b("isl1", "Island Hopper", "🏝️", "Finish an island", "bronze", "islands", 1),
  b("isl10", "Island Chain", "🗺️", "Finish 10 islands", "silver", "islands", 10),
  b("isl30", "Ocean Explorer", "🌊", "Finish 30 islands", "gold", "islands", 30),
  b("streak3", "On Fire", "🔥", "Learn 3 days in a row", "bronze", "streak", 3),
  b("streak7", "Week Warrior", "📅", "Learn 7 days in a row", "silver", "streak", 7),
  b("streak30", "Month of Learning", "🏆", "Learn 30 days in a row", "gold", "streak", 30),
  b("master10", "Brain Builder", "🧠", "Master 10 skills", "bronze", "mastered", 10),
  b("master50", "Big Brain", "💡", "Master 50 skills", "silver", "mastered", 50),
  b("master150", "Genius Mode", "🎓", "Master 150 skills", "gold", "mastered", 150),
  b("comeback1", "Never Give Up", "💪", "Play a level again — and pass it", "bronze", "comebacks", 1),
  b("comeback10", "Comeback Captain", "🦸", "Come back to 10 levels and pass them", "silver", "comebacks", 10),
  b("practice1", "Practice Makes Progress", "🏝️", "Finish a Practice Cove or Brain Boost", "bronze", "practice", 1),
  b("practice15", "Practice Pro", "🏋️", "Finish 15 practice rounds", "silver", "practice", 15),
  b("all4", "All-Rounder", "🎨", "Try 4 different subjects", "silver", "subjects", 4),
  b("read1", "Reader", "📖", "Finish a reading island", "bronze", "reading", 1, "reading"),
  b("math1", "Mathlete", "🔢", "Finish a math island", "bronze", "math", 1, "math"),
  b("code1", "Coder", "🧩", "Finish a code island", "bronze", "code", 1, "code"),
  b("char1", "Captain's Honor", "⚓", "Finish a Captain's Code island", "bronze", "manners", 1, "manners"),
  b("faith1", "Light Bearer", "✝️", "Finish a Lighthouse island", "bronze", "faith", 1, "faith"),
  b("verse1", "Hidden in My Heart", "📜", "Master your first memory verse", "bronze", "verses", 1, "faith"),
  b("verse10", "Verse Keeper", "💎", "Master 10 memory verses", "silver", "verses", 10, "faith"),
  b("verse30", "Sword Sharpener", "⚔️", "Master 30 memory verses", "gold", "verses", 30, "faith"),
  b("story5", "Story Keeper", "📚", "Pass 5 Bible story levels", "bronze", "stories", 5, "faith"),
  b("story20", "Bible Explorer", "🗺️", "Pass 20 Bible story levels", "silver", "stories", 20, "faith"),
  b("cards10", "Hero Hall", "🃏", "Collect 10 hero cards", "silver", "cards", 10, "faith"),
  b("stickers10", "Sticker Fan", "📒", "Find 10 stickers", "bronze", "stickers", 10),
  b("stickers60", "Album Pro", "🗂️", "Find 60 stickers", "silver", "stickers", 60),
  b("stickersAll", "Completionist", "👑", `Find all ${STICKERS.length} stickers`, "gold", "stickers", STICKERS.length),
  b("reef1", "Reef Keeper", "🐠", "Hatch your first creature", "bronze", "creatures", 1),
  b("reef10", "Aquarium", "🐬", "Hatch 10 creatures", "silver", "creatures", 10),
  b("reef25", "Ocean Zoo", "🐳", "Hatch 25 creatures", "gold", "creatures", 25),
  b("gym1", "Brain Gym Member", "🏋️", "Set a record in the Brain Gym", "bronze", "gym", 1),
  b("gym5", "Record Breaker", "🥇", "Set a record in all five Brain Gym games", "silver", "gym", 5),
];
export const TIER_COLOR: Record<BadgeTier, string> = { bronze: "#d38b4f", silver: "#9aa9bd", gold: "#e0a21a" };

/** Hero cards a child has won (passing the level that tells that hero's story; 3★ = holo). */
export function heroCards(lessons: KidLearn["lessons"]): { hero: Hero; holo: boolean; lesson: string }[] {
  const out = new Map<string, { hero: Hero; holo: boolean; lesson: string }>();
  for (const [id, p] of Object.entries(lessons)) {
    if (p.stars < 1) continue;
    const l = lessonById(id);
    const hero = l?.card ? HERO_BY_ID.get(l.card) : undefined;
    if (!hero) continue;
    const cur = out.get(hero.id);
    if (!cur || (!cur.holo && p.stars >= 3)) out.set(hero.id, { hero, holo: p.stars >= 3, lesson: id });
  }
  return HEROES.map((h) => out.get(h.id)).filter((x): x is { hero: Hero; holo: boolean; lesson: string } => !!x);
}

/** Every number the badges look at. */
export function badgeStats(kid: Pick<KidLearn, "lessons" | "days" | "skills" | "stickers" | "hatched" | "bests">): BadgeStats {
  const entries = Object.entries(kid.lessons);
  const passed = entries.filter(([, p]) => p.stars >= 1);
  const lessonOf = (id: string) => (id.startsWith("practice:") ? null : lessonById(id));
  const isl = islandsDone(kid.lessons);
  const by = (s: SubjectId) => isl.filter((x) => x.subject === s).length;
  const subjects = new Set(passed.map(([id]) => lessonOf(id)?.subject).filter(Boolean));
  return {
    passed: passed.filter(([id]) => !id.startsWith("practice:")).length,
    perfect: passed.filter(([id, p]) => p.stars >= 3 && !id.startsWith("practice:")).length,
    bosses: passed.filter(([id]) => lessonOf(id)?.kind === "boss").length,
    islands: isl.length,
    streak: bestStreak(kid.days),
    mastered: Object.values(kid.skills).filter(isMastered).length,
    comebacks: passed.filter(([id, p]) => p.plays >= 2 && !id.startsWith("practice:")).length,
    practice: entries.filter(([id]) => id.startsWith("practice:")).length,
    verses: Object.entries(kid.skills).filter(([k, s]) => k.startsWith("f:verse:") && isMastered(s)).length,
    stories: passed.filter(([id]) => lessonOf(id)?.subject === "faith" && lessonOf(id)?.activities[0]?.kind === "story").length,
    subjects: subjects.size,
    stickers: albumProgress(kid.stickers).reduce((n, s) => n + s.found, 0),
    creatures: kid.hatched.length,
    cards: heroCards(kid.lessons).length,
    gym: Object.keys(kid.bests).length,
    reading: by("reading"),
    math: by("math"),
    code: by("code"),
    manners: by("manners"),
    faith: by("faith"),
  };
}

/** Badges that apply to this child (faith badges only for families with Lighthouse on). */
export function badgesFor(subjects: SubjectId[]): Badge[] {
  return BADGES.filter((x) => !x.subject || subjects.includes(x.subject));
}
export const earned = (badge: Badge, s: BadgeStats) => s[badge.stat] >= badge.goal;
