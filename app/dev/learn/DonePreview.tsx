"use client";

import { LessonDone, type DoneInfo } from "@/components/kiosk/learn/LessonDone";
import { lessonById, COURSES } from "@/lib/learn/curriculum";
import { STICKERS } from "@/lib/learn/stickers";
import { HEROES } from "@/lib/learn/heroes";
import { DEFAULT_LOOK } from "@/lib/learn/meta";

// Development-only: the finish screen with made-up results (/dev/learn?done=3 · done=1 · done=0
// for "so close"), so it can be checked without playing a whole level.
export function DonePreview({ stars }: { stars: number }) {
  const lesson = lessonById("read.pa.2") ?? COURSES.reading.units[0].lessons[0];
  const sticker = STICKERS.find((s) => s.rarity === "epic") ?? STICKERS[0];
  const info: DoneInfo = {
    passed: stars > 0,
    stars,
    correct: stars ? 6 : 3,
    total: 7,
    label: "1-2",
    shells: stars ? 18 + stars * 4 : 6,
    chest: stars >= 3 ? "gold" : stars === 2 ? "silver" : stars ? "wood" : null,
    sticker: stars ? sticker : null,
    shiny: stars >= 3,
    newSticker: true,
    xpBefore: 110,
    xpGain: stars * 10,
    levelNames: ["Deckhand", "Sailor"],
    goal: { before: 0, after: 1, target: 2 },
    streak: { before: 2, after: 3 },
    wallStars: stars ? 1 : 0,
    setDone: null,
    worldDone: null,
    nextWorld: null,
    canPractice: true,
    card: stars >= 2 && HEROES[0] ? { hero: HEROES[0], holo: stars >= 3, upgrade: false } : null,
    eggs: [],
    badges: [],
    challenge: stars ? "Find three things at home that rhyme with cat." : null,
    buddy: null,
  };
  return (
    <div className="learn-root relative min-h-dvh">
      <LessonDone lesson={lesson} info={info} accent="#4AA8F0" look={DEFAULT_LOOK} reduced={false} next={lessonById("read.pa.3") ?? null} onNext={() => {}} onRetry={() => {}} onPractice={() => {}} onHome={() => {}} />
    </div>
  );
}
