"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import type { Lesson } from "@/lib/learn/types";
import type { Sticker } from "@/lib/learn/stickers";
import { SAY } from "@/lib/learn/script";
import { say } from "@/lib/learn/audio";
import { sfx, buzz } from "@/lib/learn/sfx";
import { XP_PER_LEVEL } from "@/lib/learn/progress";
import { LanternBuddy } from "@/components/lantern/LanternBuddy";
import { Confetti } from "../Confetti";
import { Chunk, Ring } from "./kit";
import { useLater } from "./acts/common";

// The end of a lesson is the payoff: stars land one by one, the XP bar fills (sometimes a level
// up), and a treasure chest wobbles until it's tapped open to reveal a surprise sticker — a
// different one each time, sometimes rare. Then the daily goal, the streak and any wall-store
// stars, and one big button to keep going.

export type DoneInfo = {
  stars: number;
  sticker: Sticker;
  newSticker: boolean;
  xpBefore: number;
  xpGain: number;
  levelNames: [string, string];
  goal: { before: number; after: number; target: number };
  streak: { before: number; after: number };
  wallStars: number;
};

const RARITY = {
  common: { label: "Sticker", ring: "var(--l-blue)", bg: "#e8f6ff" },
  rare: { label: "Rare!", ring: "var(--l-violet)", bg: "#f0ebff" },
  legendary: { label: "Legendary!", ring: "var(--l-gold)", bg: "#fff6d8" },
} as const;

type Phase = "stars" | "chest" | "open" | "summary";

export function LessonDone({ lesson, info, accent, reduced, next, onNext, onHome }: { lesson: Lesson; info: DoneInfo; accent: string; reduced: boolean; next: Lesson | null; onNext: () => void; onHome: () => void }) {
  const [phase, setPhase] = useState<Phase>("stars");
  const [shown, setShown] = useState(0); // stars landed
  const [xpFill, setXpFill] = useState(info.xpBefore % XP_PER_LEVEL);
  const [levelUp, setLevelUp] = useState(false);
  const [party, setParty] = useState(0);
  const later = useLater();
  const levelBefore = Math.floor(info.xpBefore / XP_PER_LEVEL) + 1;
  const levelAfter = Math.floor((info.xpBefore + info.xpGain) / XP_PER_LEVEL) + 1;
  const goalHit = info.goal.before < info.goal.target && info.goal.after >= info.goal.target;

  useEffect(() => {
    later(() => void say(info.stars >= 3 ? SAY.perfect : SAY.lessonDone), 250);
    for (let k = 0; k < 3; k++)
      later(() => {
        setShown(k + 1);
        if (k < info.stars) {
          sfx("star");
          buzz(16);
        }
      }, 550 + k * 380);
    if (info.stars >= 3) later(() => setParty((p) => p + 1), 1700);
    // XP fills; a level up gets its own moment.
    later(() => {
      if (levelAfter > levelBefore) {
        setXpFill(XP_PER_LEVEL);
        later(() => {
          setLevelUp(true);
          setXpFill((info.xpBefore + info.xpGain) % XP_PER_LEVEL);
          sfx("levelup");
          setParty((p) => p + 1);
          void say(SAY.levelUp);
        }, 750);
      } else setXpFill((info.xpBefore + info.xpGain) % XP_PER_LEVEL);
    }, 1900);
    later(() => {
      setPhase("chest");
      void say(SAY.openChest);
    }, levelAfter > levelBefore ? 4200 : 3000);
    // Runs once: the celebration is a fixed sequence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openChest = () => {
    if (phase !== "chest") return;
    setPhase("open");
    sfx("chest");
    buzz([0, 30, 40, 60]);
    later(() => {
      sfx(info.sticker.rarity === "legendary" ? "legendary" : "sticker");
      if (info.sticker.rarity !== "common") setParty((p) => p + 1);
      void say(info.sticker.rarity === "legendary" ? SAY.legendarySticker : info.sticker.rarity === "rare" ? SAY.rareSticker : SAY.newSticker);
    }, 650);
    later(() => {
      setPhase("summary");
      if (goalHit) {
        sfx("goal");
        setParty((p) => p + 1);
        later(() => void say(SAY.goalDone), 400);
      } else if (info.streak.after > info.streak.before) later(() => void say(SAY.streakUp), 400);
      else if (info.wallStars > 0) later(() => void say(SAY.starsEarned), 400);
    }, 2600);
  };

  const r = RARITY[info.sticker.rarity];
  return (
    <div className="fixed inset-0 z-[46] flex flex-col items-center overflow-y-auto px-5 pb-8 pt-6" style={{ background: "var(--l-bg)" }}>
      <div className="relative">{party > 0 && !reduced && <Confetti key={party} count={44} spread={420} accent={accent} />}</div>
      <div className="flex w-full max-w-[1100px] flex-col items-center gap-5">
        <div className="flex items-center gap-4">
          <LanternBuddy mood="cheer" accent={accent} size={96} reducedMotion={reduced} cheerKey={shown + party} />
          <div>
            <p className="font-display text-[44px] font-extrabold leading-none text-white drop-shadow-[0_3px_0_rgba(0,40,80,0.25)]">{info.stars >= 3 ? "Perfect!" : "Lesson complete!"}</p>
            <p className="mt-1 font-display text-xl font-bold text-white/85">
              {lesson.emoji} {lesson.title}
            </p>
          </div>
        </div>

        <div className="grid w-full items-center gap-4 lg:grid-cols-2 lg:gap-8">
          <div className="flex flex-col items-center gap-5">
            {/* Stars */}
            <div className="flex items-end gap-3">
              {[0, 1, 2].map((k) => (
                <span
                  key={k}
                  className={cn("select-none", k < shown && "l-star-in")}
                  style={{ fontSize: k === 1 ? 104 : 84, lineHeight: 1, opacity: k < shown ? 1 : 0, filter: k < info.stars ? "drop-shadow(0 6px 0 rgba(160,100,0,0.35))" : "grayscale(1) opacity(0.4)" }}
                >
                  ⭐
                </span>
              ))}
            </div>

            {/* XP */}
            <div className="w-full max-w-[560px] rounded-[26px] bg-white px-5 py-4 shadow-[0_7px_0_var(--l-line)]">
              <div className="flex items-center justify-between font-display font-bold text-[var(--l-ink)]">
                <span className="text-lg">
                  Level {levelUp ? levelAfter : levelBefore} · {levelUp ? info.levelNames[1] : info.levelNames[0]}
                </span>
                <span className="rounded-full bg-[var(--l-violet)] px-3 py-0.5 text-white">+{info.xpGain} XP</span>
              </div>
              <div className="relative mt-3 h-5 overflow-hidden rounded-full bg-[var(--l-card-2)]">
                <div className="absolute inset-y-0 left-0 rounded-full bg-[var(--l-violet)] transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ width: `${(xpFill / XP_PER_LEVEL) * 100}%` }}>
                  <div className="absolute inset-x-2 top-1 h-1.5 rounded-full bg-white/40" />
                </div>
              </div>
              {levelUp && <p className="l-pop-in mt-3 text-center font-display text-2xl font-extrabold text-[var(--l-violet)]">🎉 Level up! You&rsquo;re a {info.levelNames[1]}!</p>}
            </div>
            {phase === "summary" && (
              <div className="l-rise flex flex-wrap items-center justify-center gap-3">
                <div className="flex items-center gap-3 rounded-full bg-white py-2 pl-2 pr-5 shadow-[0_5px_0_var(--l-line)]">
                  <Ring value={info.goal.after / info.goal.target} size={52} stroke={7} color="var(--l-green)" track="var(--l-card-2)">
                    <span className="text-xl">{info.goal.after >= info.goal.target ? "✅" : "🎯"}</span>
                  </Ring>
                  <span className="font-display text-lg font-bold text-[var(--l-ink)]">
                    {Math.min(info.goal.after, info.goal.target)}/{info.goal.target} today{goalHit ? " — goal!" : ""}
                  </span>
                </div>
                {info.streak.after > 0 && (
                  <div className="flex items-center gap-2 rounded-full bg-white px-5 py-3 shadow-[0_5px_0_var(--l-line)]">
                    <span className="l-flame text-2xl">🔥</span>
                    <span className="font-display text-lg font-bold text-[var(--l-ink)]">
                      {info.streak.after} day{info.streak.after === 1 ? "" : "s"} in a row
                    </span>
                  </div>
                )}
                {info.wallStars > 0 && (
                  <div className="flex items-center gap-2 rounded-full bg-white px-5 py-3 shadow-[0_5px_0_var(--l-line)]">
                    <span className="text-2xl">⭐</span>
                    <span className="font-display text-lg font-bold text-[var(--l-ink)]">+{info.wallStars} for your store</span>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Treasure chest → sticker */}
          {phase !== "stars" && (
            <div className="relative flex h-[340px] w-full items-end justify-center">
              {phase !== "chest" && (
                <>
                  <div className="pointer-events-none absolute left-1/2 top-[38%] h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: `radial-gradient(circle, ${r.bg}cc 0%, transparent 62%)` }} />
                  {!reduced && (
                    <div
                      className="l-rays pointer-events-none absolute left-1/2 top-[38%] h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60"
                      style={{ background: "repeating-conic-gradient(rgba(255,255,255,0.55) 0deg 9deg, transparent 9deg 30deg)", WebkitMaskImage: "radial-gradient(circle, #000 30%, transparent 70%)", maskImage: "radial-gradient(circle, #000 30%, transparent 70%)" } as CSSProperties}
                    />
                  )}
                </>
              )}
              <button type="button" onClick={openChest} disabled={phase !== "chest"} className={cn("relative z-[1] flex flex-col items-center gap-2", phase === "chest" && "l-rise")} aria-label="Open the treasure chest">
                <span className={cn("block origin-bottom transition-transform duration-500", phase === "chest" ? !reduced && "l-chest" : "scale-[0.72]")}>
                  <Chest open={phase !== "chest"} />
                </span>
                {phase === "chest" && <span className="l-pulse rounded-full bg-white px-5 py-2 font-display text-xl font-extrabold text-[var(--l-ink)] shadow-[0_4px_0_var(--l-line)]">Tap to open!</span>}
              </button>
              {phase !== "chest" && (
                <div className="absolute left-1/2 top-0 z-[2] flex -translate-x-1/2 flex-col items-center">
                  <div className="l-pop-in relative flex h-[160px] w-[160px] items-center justify-center rounded-full bg-white" style={{ boxShadow: `0 0 0 8px ${r.ring}, 0 10px 0 8px rgba(0,40,80,0.15)`, animationDelay: "450ms" }}>
                    <span style={{ fontSize: 100, lineHeight: 1 }}>{info.sticker.emoji}</span>
                    {info.newSticker && <span className="absolute -right-2 -top-2 rotate-12 rounded-full bg-[var(--l-coral)] px-3 py-1 font-display text-lg font-extrabold text-white shadow-[0_3px_0_var(--l-coral-edge)]">NEW!</span>}
                  </div>
                  <div className="l-rise mt-3 flex items-center gap-2" style={{ animationDelay: "650ms" }}>
                    <span className="font-display text-2xl font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.3)]">{info.sticker.name}</span>
                    <span className="rounded-full px-3 py-0.5 font-display text-base font-extrabold text-white" style={{ background: r.ring }}>
                      {r.label}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {phase === "summary" && (
          <div className="l-rise mt-2 flex w-full max-w-[560px] flex-col gap-3" style={{ animationDelay: "200ms" }}>
            {next && (
              <Chunk tone="green" onClick={() => (sfx("pick"), onNext())} className="flex h-20 items-center justify-center gap-3 font-display text-[28px] font-extrabold">
                Next: {next.emoji} {next.title}
              </Chunk>
            )}
            <Chunk tone="white" onClick={() => (sfx("tap"), onHome())} className="flex h-16 items-center justify-center font-display text-xl font-bold text-[var(--l-ink-2)]">
              {next ? "Back to Learn" : "All done!"}
            </Chunk>
          </div>
        )}
      </div>
    </div>
  );
}

/** A little treasure chest (closed, or with its lid flipped up). */
function Chest({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 200 170" width="210" height="178" aria-hidden>
      <ellipse cx="100" cy="160" rx="78" ry="8" fill="rgba(0,40,80,0.18)" />
      <rect x="28" y="78" width="144" height="78" rx="14" fill="#b8692a" />
      <rect x="28" y="78" width="144" height="16" fill="#97521d" />
      <rect x="50" y="78" width="16" height="78" fill="#ffc83d" />
      <rect x="134" y="78" width="16" height="78" fill="#ffc83d" />
      <rect x="28" y="140" width="144" height="8" fill="#97521d" opacity="0.6" />
      <g style={{ transformOrigin: "30px 78px", transform: open ? "translate(-8px,-26px) rotate(-22deg)" : "none", transition: "transform 420ms cubic-bezier(0.34,1.56,0.64,1)" }}>
        <path d="M28 80 L28 58 Q28 26 100 26 Q172 26 172 58 L172 80 Z" fill="#c97733" />
        <path d="M28 80 L28 70 L172 70 L172 80 Z" fill="#97521d" />
        <path d="M50 80 L50 32 Q58 29 66 28 L66 80 Z" fill="#ffc83d" />
        <path d="M134 80 L134 28 Q142 29 150 32 L150 80 Z" fill="#ffc83d" />
        <path d="M44 44 Q100 30 156 44" stroke="rgba(255,255,255,0.35)" strokeWidth="5" fill="none" strokeLinecap="round" />
      </g>
      <rect x="86" y="70" width="28" height="34" rx="7" fill="#ffc83d" stroke="#e0a21a" strokeWidth="3" />
      <circle cx="100" cy="84" r="4.5" fill="#7a4a12" />
      <rect x="98" y="86" width="4" height="9" rx="2" fill="#7a4a12" />
    </svg>
  );
}
