"use client";

import { Glyph, GlyphRow, WithGlyphs } from "./art/Glyph";
import { LessonBackdrop } from "./LessonScene";
import { useEffect, useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import type { Lesson, Unit } from "@/lib/learn/types";
import { RARITY_COLOR, RARITY_LABEL, type ChestKind, type Sticker, type StickerSet } from "@/lib/learn/stickers";
import type { Hero } from "@/lib/learn/heroes";
import type { Badge } from "@/lib/learn/badges";
import { TIER_COLOR } from "@/lib/learn/badges";
import type { Creature, Egg } from "@/lib/learn/reef";
import { SAY } from "@/lib/learn/script";
import { say } from "@/lib/learn/audio";
import { sfx, buzz } from "@/lib/learn/sfx";
import { XP_PER_LEVEL } from "@/lib/learn/progress";
import type { BoatLook } from "@/lib/learn/meta";
import { Confetti } from "../Confetti";
import { Chunk, Ring, ShellIcon } from "./kit";
import { SideBoat } from "./KidBoat";
import { useLater } from "./acts/common";
import { CreatureView } from "./tank/CreatureView";
import { artUrl, eggArt } from "./tank/art";

// The payoff. Passed: stars land one by one, shells count up, the XP bar fills (sometimes a
// level up), and a treasure chest — wood, silver or gold by how well it went — wobbles until
// it's tapped open for a surprise sticker (rare, epic, legendary, sometimes shiny). Then the
// daily goal, streak, and any island finished. Not passed yet: no gloom — "so close", the score,
// and two clear ways forward: a quick Practice Cove on the tricky bits, or try again.

export type DoneInfo = {
  passed: boolean;
  stars: number;
  correct: number;
  total: number;
  label: string;
  shells: number;
  chest: ChestKind | null;
  sticker: Sticker | null;
  shiny: boolean;
  newSticker: boolean;
  xpBefore: number;
  xpGain: number;
  levelNames: [string, string];
  goal: { before: number; after: number; target: number };
  streak: { before: number; after: number };
  wallStars: number;
  setDone: StickerSet | null;
  worldDone: Unit | null;
  nextWorld: Unit | null;
  canPractice: boolean;
  /** A Bible hero card won (or turned holo by a perfect replay). */
  card?: { hero: Hero; holo: boolean; upgrade: boolean } | null;
  /** Eggs this level earned (hatch them in the reef). */
  eggs?: Egg[];
  badges?: Badge[];
  /** A real-world mission from this island. */
  challenge?: string | null;
  /** The reef buddy (and the stage it just grew into, if it did). */
  buddy?: { creature: Creature; grew: string | null } | null;
};

type Phase = "stars" | "chest" | "open" | "summary";
export const CHEST: Record<ChestKind, { body: string; dark: string; band: string; name: string }> = {
  wood: { body: "#b8692a", dark: "#97521d", band: "#ffc83d", name: "Treasure chest" },
  silver: { body: "#9aa9bd", dark: "#738399", band: "#e8eef6", name: "Silver chest" },
  gold: { body: "#f2b52a", dark: "#c98a0c", band: "#fff1b3", name: "Golden chest" },
};

export function LessonDone({
  lesson,
  info,
  accent,
  look,
  reduced,
  next,
  onNext,
  onRetry,
  onPractice,
  onHome,
  onHatch,
}: {
  lesson: Lesson;
  info: DoneInfo;
  accent: string;
  look: BoatLook;
  reduced: boolean;
  next: Lesson | null;
  onNext: () => void;
  onRetry: () => void;
  onPractice: () => void;
  onHome: () => void;
  onHatch?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("stars");
  const [shown, setShown] = useState(0);
  const [shellCount, setShellCount] = useState(0);
  const [xpFill, setXpFill] = useState(info.xpBefore % XP_PER_LEVEL);
  const [levelUp, setLevelUp] = useState(false);
  const [party, setParty] = useState(0);
  const later = useLater();
  const levelBefore = Math.floor(info.xpBefore / XP_PER_LEVEL) + 1;
  const levelAfter = Math.floor((info.xpBefore + info.xpGain) / XP_PER_LEVEL) + 1;
  const goalHit = info.goal.before < info.goal.target && info.goal.after >= info.goal.target;

  const countShells = () => {
    const steps = Math.min(20, info.shells);
    for (let k = 1; k <= steps; k++)
      later(() => {
        setShellCount(Math.round((info.shells * k) / steps));
        sfx("tick", k);
      }, k * 45);
    later(() => info.shells > 0 && sfx("coin"), steps * 45 + 60);
  };

  useEffect(() => {
    if (!info.passed) {
      sfx("soft-fail");
      later(() => void say(SAY.almost), 300);
      later(() => countShells(), 900);
      later(() => setPhase("summary"), 1800);
      return;
    }
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
    later(() => countShells(), 1800);
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
    }, 2600);
    later(() => {
      setPhase(info.chest ? "chest" : "summary");
      if (info.chest) void say(SAY.openChest);
    }, levelAfter > levelBefore ? 4600 : 3500);
    // Runs once: the celebration is a fixed sequence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openChest = () => {
    if (phase !== "chest" || !info.sticker) return;
    setPhase("open");
    sfx("chest");
    buzz([0, 30, 40, 60]);
    const r = info.sticker.rarity;
    later(() => {
      sfx(r === "legendary" || info.shiny ? "legendary" : "sticker");
      if (r !== "common" || info.shiny) setParty((p) => p + 1);
      void say(info.shiny ? SAY.shinySticker : r === "legendary" ? SAY.legendarySticker : r === "epic" ? SAY.epicSticker : r === "rare" ? SAY.rareSticker : SAY.newSticker);
    }, 650);
    later(() => {
      setPhase("summary");
      if (info.setDone) {
        sfx("goal");
        setParty((p) => p + 1);
        later(() => void say(SAY.setComplete), 500);
      } else if (info.worldDone) {
        sfx("levelup");
        setParty((p) => p + 1);
        later(() => void say(SAY.worldDone), 500);
      } else if (goalHit) {
        sfx("goal");
        setParty((p) => p + 1);
        later(() => void say(SAY.goalDone), 400);
      } else if (info.streak.after > info.streak.before) later(() => void say(SAY.streakUp), 400);
      // Then the extra treasures, one at a time.
      const treat = info.card ? (info.card.holo ? SAY.shinyCard : SAY.newCard) : info.eggs?.length ? SAY.newEgg : info.badges?.length ? SAY.newBadge : info.buddy?.grew ? SAY.buddyGrew : null;
      if (treat) {
        later(() => {
          sfx(info.card?.holo || info.badges?.length ? "legendary" : "sticker");
          setParty((p) => p + 1);
        }, 1700);
        later(() => void say(treat), 2000);
      }
      if (info.challenge) later(() => void say([SAY.challenge, { gap: 250 }, info.challenge!]), treat ? 4600 : 2600);
    }, 2700);
  };

  const s = info.sticker;
  const ring = s ? RARITY_COLOR[s.rarity] : "var(--l-blue)";
  const chest = info.chest ? CHEST[info.chest] : null;
  return (
    <div className="fixed inset-0 z-[46] overflow-y-auto">
      <div className="pointer-events-none fixed inset-0">
        <LessonBackdrop subject={lesson.subject} reduced={reduced} />
      </div>
      <div className="relative">{party > 0 && !reduced && <Confetti key={party} count={info.shiny || s?.rarity === "legendary" ? 80 : 44} spread={460} accent={accent} />}</div>
      <div className="relative mx-auto flex w-full max-w-[1100px] flex-col items-center gap-5 px-5 pb-10 pt-6">
        <div className="flex items-center gap-4">
          <SideBoat look={look} size={112} bob={!reduced} showTrail />
          <div>
            <p className={cn("inline-block rounded-[22px] px-5 py-1.5 font-display text-[46px] font-extrabold leading-none shadow-[0_6px_0_rgba(0,40,80,0.18)]", !info.passed ? "bg-white text-[var(--l-ink)]" : info.stars >= 3 ? "bg-[linear-gradient(180deg,#fff3a8,#ffd23a)] text-[#6b4400]" : "bg-white text-[var(--l-ink)]")}>
              {!info.passed ? "So close!" : info.stars >= 3 ? "Perfect!" : lesson.kind === "boss" ? "Boss beaten!" : "Level complete!"}
            </p>
            <p className="mt-2 flex items-center gap-2 font-display text-xl font-bold text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.3)]">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90">
                <GlyphRow s={lesson.emoji} size={26} />
              </span>
              {info.label} · {lesson.title}
            </p>
          </div>
        </div>

        <div className="grid w-full items-center gap-4 lg:grid-cols-2 lg:gap-8">
          <div className="flex flex-col items-center gap-4">
            {/* Stars */}
            <div className="relative flex items-end gap-2">
              {info.passed && <span className="pointer-events-none absolute left-1/2 top-1/2 h-[260px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "radial-gradient(ellipse, rgba(255,240,160,0.75) 0%, transparent 65%)" }} />}
              {[0, 1, 2].map((k) => (
                <span key={k} className={cn("relative block", k < shown && "l-star-in", k !== 1 && "translate-y-2")} style={{ opacity: !info.passed || k < shown ? 1 : 0 }}>
                  <Glyph e="⭐" size={k === 1 ? 132 : 104} style={{ filter: k < info.stars ? "drop-shadow(0 6px 0 rgba(160,100,0,0.3))" : "grayscale(1) opacity(0.4)" }} />
                </span>
              ))}
            </div>
            {!info.passed && (
              <div className="l-rise max-w-[560px] rounded-[26px] bg-white px-6 py-4 text-center shadow-[0_7px_0_var(--l-line)]">
                <p className="font-display text-2xl font-extrabold text-[var(--l-ink)]">
                  You got {info.correct} of {info.total} on the first try.
                </p>
                <p className="mt-1 font-display text-lg font-bold text-[var(--l-ink-2)]">Get {Math.ceil(info.total * 0.6)} to pass — a little practice and you&rsquo;ve got it!</p>
              </div>
            )}

            {/* Shells */}
            <div className="flex items-center gap-3 rounded-full bg-white py-2 pl-3 pr-6 shadow-[0_6px_0_var(--l-line)]">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fff3df]">
                <ShellIcon size={40} />
              </span>
              <span className="font-display text-4xl font-extrabold tabular-nums text-[var(--l-ink)]">+{shellCount}</span>
              <span className="font-display text-lg font-bold text-[var(--l-ink-2)]">shells</span>
            </div>

            {/* XP */}
            {info.passed && (
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
                {levelUp && (
                  <p className="l-pop-in mt-3 flex items-center justify-center gap-2 text-center font-display text-2xl font-extrabold text-[var(--l-violet)]">
                    <Glyph e="🎉" size={38} /> Level up! You&rsquo;re a {info.levelNames[1]}!
                  </p>
                )}
              </div>
            )}

            {phase === "summary" && info.passed && (
              <div className="l-rise flex flex-wrap items-center justify-center gap-3">
                <div className="flex items-center gap-3 rounded-full bg-white py-2 pl-2 pr-5 shadow-[0_5px_0_var(--l-line)]">
                  <Ring value={info.goal.after / info.goal.target} size={52} stroke={7} color="var(--l-green)" track="var(--l-card-2)">
                    <Glyph e={info.goal.after >= info.goal.target ? "✅" : "🎯"} size={30} />
                  </Ring>
                  <span className="font-display text-lg font-bold text-[var(--l-ink)]">
                    {Math.min(info.goal.after, info.goal.target)}/{info.goal.target} today{goalHit ? " — goal!" : ""}
                  </span>
                </div>
                {info.streak.after > 0 && (
                  <div className="flex items-center gap-2 rounded-full bg-white px-5 py-3 shadow-[0_5px_0_var(--l-line)]">
                    <Glyph e="🔥" size={32} className="l-flame" />
                    <span className="font-display text-lg font-bold text-[var(--l-ink)]">
                      {info.streak.after} day{info.streak.after === 1 ? "" : "s"} in a row
                    </span>
                  </div>
                )}
                {info.wallStars > 0 && (
                  <div className="flex items-center gap-2 rounded-full bg-white px-5 py-3 shadow-[0_5px_0_var(--l-line)]">
                    <Glyph e="⭐" size={32} />
                    <span className="font-display text-lg font-bold text-[var(--l-ink)]">+{info.wallStars} for your store</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Treasure chest → sticker */}
          {info.passed && phase !== "stars" && chest && s && (
            <div className="relative flex h-[350px] w-full items-end justify-center">
              {phase !== "chest" && (
                <>
                  <div className="pointer-events-none absolute left-1/2 top-[38%] h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: `radial-gradient(circle, ${ring}55 0%, transparent 62%)` }} />
                  {!reduced && (
                    <div
                      className="l-rays pointer-events-none absolute left-1/2 top-[38%] h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60"
                      style={{ background: "repeating-conic-gradient(rgba(255,255,255,0.55) 0deg 9deg, transparent 9deg 30deg)", WebkitMaskImage: "radial-gradient(circle, #000 30%, transparent 70%)", maskImage: "radial-gradient(circle, #000 30%, transparent 70%)" } as CSSProperties}
                    />
                  )}
                </>
              )}
              <button type="button" onClick={openChest} disabled={phase !== "chest"} className={cn("relative z-[1] flex flex-col items-center gap-2", phase === "chest" && "l-rise")} aria-label={`Open the ${chest.name}`}>
                <span className={cn("block origin-bottom transition-transform duration-500", phase === "chest" ? !reduced && "l-chest" : "scale-[0.72]")}>
                  <Chest open={phase !== "chest"} c={chest} />
                </span>
                {phase === "chest" && (
                  <span className="l-pulse rounded-full bg-white px-5 py-2 font-display text-xl font-extrabold text-[var(--l-ink)] shadow-[0_4px_0_var(--l-line)]">
                    <WithGlyphs text={info.chest === "gold" ? "✨ Golden chest! Tap!" : info.chest === "silver" ? "Silver chest! Tap!" : "Tap to open!"} />
                  </span>
                )}
              </button>
              {phase !== "chest" && (
                <div className="absolute left-1/2 top-0 z-[2] flex -translate-x-1/2 flex-col items-center">
                  {/* The sticker itself: a die-cut sticker with a white edge, in its rarity's ring. */}
                  <div className={cn("l-pop-in relative flex h-[176px] w-[176px] items-center justify-center overflow-hidden rounded-full", info.shiny && "l-shiny")} style={{ background: `radial-gradient(circle at 35% 30%, #ffffff, ${ring}33)`, boxShadow: `0 0 0 8px #ffffff, 0 0 0 14px ${info.shiny ? "#ffd700" : ring}, 0 12px 0 14px rgba(0,40,80,0.15)`, animationDelay: "450ms" }}>
                    <GlyphRow s={s.emoji} size={128} style={{ filter: info.shiny ? "drop-shadow(0 0 12px #ffd700) saturate(1.35)" : "drop-shadow(0 4px 0 rgba(0,40,80,0.12))" }} />
                  </div>
                  {info.newSticker && <span className="l-pop-in absolute -right-4 top-0 rotate-12 rounded-full bg-[var(--l-coral)] px-3 py-1 font-display text-lg font-extrabold text-white shadow-[0_3px_0_var(--l-coral-edge)]">NEW!</span>}
                  <div className="l-rise mt-3 flex flex-wrap items-center justify-center gap-2" style={{ animationDelay: "650ms" }}>
                    <span className="font-display text-2xl font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.3)]">
                      {info.shiny && <Glyph e="✨" size={30} className="mr-1 inline-block align-[-0.3em]" />}
                      {info.shiny ? "Shiny " : ""}
                      {s.name}
                    </span>
                    <span className="rounded-full px-3 py-0.5 font-display text-base font-extrabold text-white" style={{ background: ring }}>
                      {RARITY_LABEL[s.rarity]}
                    </span>
                  </div>
                  {!info.newSticker && <span className="l-rise mt-1 font-display text-base font-bold text-white/90">You had this one — +3 bonus shells!</span>}
                </div>
              )}
            </div>
          )}
        </div>

        {phase === "summary" && (info.setDone || info.worldDone) && (
          <div className="l-pop-in flex flex-wrap items-center justify-center gap-3 rounded-[26px] bg-white px-6 py-4 shadow-[0_7px_0_var(--l-line)]">
            {info.setDone && (
              <span className="font-display text-2xl font-extrabold text-[var(--l-ink)]">
                <GlyphRow s={info.setDone.emoji} size={34} className="mr-1.5 align-[-0.35em]" />
                {info.setDone.name} set complete!{" "}
                <span className="whitespace-nowrap text-[var(--l-gold-edge)]">
                  +60 <ShellIcon size={26} className="-mt-1 align-middle" />
                </span>
              </span>
            )}
            {info.worldDone && (
              <span className="font-display text-2xl font-extrabold text-[var(--l-ink)]">
                <Glyph e="🏝️" size={38} className="mr-1.5 inline-block align-[-0.4em]" />
                {info.worldDone.title} complete!{" "}
                <span className="whitespace-nowrap text-[var(--l-gold-edge)]">
                  +100 <ShellIcon size={26} className="-mt-1 align-middle" />
                </span>
                {info.nextWorld && (
                  <span className="mt-1 flex items-center gap-1.5 text-lg text-[var(--l-ink-2)]">
                    Next island: <GlyphRow s={info.nextWorld.emoji} size={26} /> {info.nextWorld.title}
                  </span>
                )}
              </span>
            )}
          </div>
        )}

        {phase === "summary" && info.passed && (info.card || info.eggs?.length || info.badges?.length || info.buddy || info.challenge) && (
          <div className="flex w-full max-w-[980px] flex-wrap items-stretch justify-center gap-3">
            {info.card && (
              <div className="l-card-in flex items-center gap-3 rounded-[24px] p-3 pr-5 text-white shadow-[0_7px_0_rgba(0,40,80,0.18)]" style={{ background: `linear-gradient(150deg, ${info.card.hero.color}, ${info.card.hero.color}cc)`, animationDelay: "1500ms" }}>
                <GlyphRow s={info.card.hero.emoji ?? ""} size={55} className={cn("flex h-[86px] w-[66px] items-center justify-center rounded-[14px] bg-white/25 shadow-[inset_0_0_0_3px_rgba(255,255,255,0.6)]", info.card.holo && "l-shiny")} />
                <span>
                  <span className="block font-display text-sm font-extrabold uppercase tracking-wider text-white/85"><WithGlyphs text={info.card.upgrade ? "✨ Now holo!" : info.card.holo ? "✨ Holo hero card!" : "New hero card!"} /></span>
                  <span className="block font-display text-2xl font-extrabold leading-tight drop-shadow-[0_2px_0_rgba(0,0,0,0.15)]">{info.card.hero.name}</span>
                  <span className="mt-0.5 inline-block rounded-full bg-white/90 px-2.5 font-display text-sm font-extrabold text-[var(--l-ink)]">{info.card.hero.trait}</span>
                </span>
              </div>
            )}
            {!!info.eggs?.length && (
              <div className="l-pop-in flex items-center gap-3 rounded-[24px] bg-white p-3 pr-4 shadow-[0_7px_0_var(--l-line)]" style={{ animationDelay: "1700ms" }}>
                <span className={cn("block", !reduced && "l-chest")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={artUrl(eggArt(info.eggs[0].tier))} alt="" width={46} height={58} />
                </span>
                <span className="max-w-[240px]">
                  <span className="block font-display text-xl font-extrabold leading-tight text-[var(--l-ink)]">{info.eggs.length > 1 ? `${info.eggs.length} new eggs!` : "A new egg!"}</span>
                  <span className="block font-display text-sm font-bold text-[var(--l-ink-2)]">{info.eggs[0].why}</span>
                </span>
                {onHatch && (
                  <Chunk tone="gold" onClick={() => (sfx("pick"), onHatch())} className="flex h-14 items-center px-4 font-display text-lg font-extrabold">
                    Hatch it!
                  </Chunk>
                )}
              </div>
            )}
            {info.badges?.map((b, i) => (
              <div key={b.id} className="l-pop-in flex items-center gap-3 rounded-[24px] bg-white p-3 pr-5 shadow-[0_7px_0_var(--l-line)]" style={{ animationDelay: `${1900 + i * 150}ms` }}>
                <span className="l-shiny flex h-16 w-16 items-center justify-center rounded-full" style={{ boxShadow: `0 0 0 4px ${TIER_COLOR[b.tier]}`, background: `${TIER_COLOR[b.tier]}22` }}>
                  <GlyphRow s={b.emoji} size={44} />
                </span>
                <span>
                  <span className="block font-display text-sm font-extrabold uppercase tracking-wider text-[var(--l-ink-2)]">New badge</span>
                  <span className="block font-display text-xl font-extrabold leading-tight text-[var(--l-ink)]">{b.name}</span>
                </span>
              </div>
            ))}
            {info.buddy && (
              <div className="l-pop-in flex items-center gap-3 rounded-[24px] bg-white p-3 pr-5 shadow-[0_7px_0_var(--l-line)]" style={{ animationDelay: "2100ms" }}>
                <CreatureView id={info.buddy.creature.id} size={72} react={info.buddy.grew ? 1 : 0} animate={!reduced} />
                <span className="font-display text-lg font-extrabold leading-tight text-[var(--l-ink)]">{info.buddy.grew ? `${info.buddy.creature.name} grew up — now ${info.buddy.grew}!` : `${info.buddy.creature.name} is cheering for you!`}</span>
              </div>
            )}
            {info.challenge && (
              <div className="l-rise flex w-full max-w-[760px] items-start gap-3 rounded-[24px] border-[4px] border-dashed border-[var(--l-gold)] bg-white/95 p-4 shadow-[0_7px_0_var(--l-line)]" style={{ animationDelay: "2300ms" }}>
                <Glyph e="⚓" size={48} />
                <span>
                  <span className="block font-display text-sm font-extrabold uppercase tracking-wider text-[var(--l-gold-edge)]">Captain&apos;s challenge for today</span>
                  <span className="block font-display text-xl font-extrabold leading-snug text-[var(--l-ink)]">{info.challenge}</span>
                </span>
              </div>
            )}
          </div>
        )}

        {phase === "summary" && (
          <div className="l-rise mt-2 flex w-full max-w-[560px] flex-col gap-3" style={{ animationDelay: "200ms" }}>
            {info.passed ? (
              <>
                {next && (
                  <Chunk tone="green" onClick={() => (sfx("pick"), onNext())} className="flex h-20 items-center justify-center gap-3 font-display text-[28px] font-extrabold">
                    Next: <GlyphRow s={next.emoji} size={44} /> {next.title}
                  </Chunk>
                )}
                {info.stars < 3 && (
                  <Chunk tone="white" onClick={() => (sfx("pick"), onRetry())} className="flex h-16 items-center justify-center gap-2 font-display text-xl font-bold text-[var(--l-ink)]">
                    <Glyph e="⭐" size={32} /> Try for 3 stars
                  </Chunk>
                )}
              </>
            ) : (
              <>
                {info.canPractice && (
                  <Chunk tone="teal" onClick={() => (sfx("pick"), onPractice())} className="flex h-20 items-center justify-center gap-3 font-display text-[26px] font-extrabold">
                    <Glyph e="🏝️" size={44} /> Practice the tricky ones
                  </Chunk>
                )}
                <Chunk tone={info.canPractice ? "white" : "green"} onClick={() => (sfx("pick"), onRetry())} className={cn("flex items-center justify-center gap-2 font-display font-extrabold", info.canPractice ? "h-16 text-xl text-[var(--l-ink)]" : "h-20 text-[26px]")}>
                  <Glyph e="🔁" size={36} /> Try the level again
                </Chunk>
              </>
            )}
            <Chunk tone="white" onClick={() => (sfx("tap"), onHome())} className="flex h-14 items-center justify-center font-display text-lg font-bold text-[var(--l-ink-2)]">
              Back to the map
            </Chunk>
          </div>
        )}
      </div>
    </div>
  );
}

/** A treasure chest in its tier's colors (closed, or with its lid flipped up), in the house style. */
export function Chest({ open, c }: { open: boolean; c: (typeof CHEST)[ChestKind] }) {
  const OL = "#2a2f45";
  return (
    <svg viewBox="0 0 200 175" width="220" height="192" aria-hidden>
      <defs>
        <linearGradient id="chB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.body} />
          <stop offset="1" stopColor={c.dark} />
        </linearGradient>
        <linearGradient id="chL" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="0.4" stopColor={c.body} />
          <stop offset="1" stopColor={c.dark} />
        </linearGradient>
        <radialGradient id="chG" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fff7b0" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffd23a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="100" cy="165" rx="80" ry="8" fill="rgba(0,40,80,0.18)" />
      {open && <ellipse cx="100" cy="76" rx="86" ry="46" fill="url(#chG)" />}
      <rect x="26" y="78" width="148" height="80" rx="14" fill="url(#chB)" stroke={OL} strokeWidth="4" />
      <path d="M30 104 H170 M30 128 H170" stroke={c.dark} strokeWidth="3" opacity="0.55" />
      <rect x="48" y="80" width="18" height="76" fill={c.band} stroke={OL} strokeWidth="3" />
      <rect x="134" y="80" width="18" height="76" fill={c.band} stroke={OL} strokeWidth="3" />
      <g style={{ transformOrigin: "30px 78px", transform: open ? "translate(-8px,-28px) rotate(-22deg)" : "none", transition: "transform 420ms cubic-bezier(0.34,1.56,0.64,1)" }}>
        <path d="M26 82 L26 58 Q26 24 100 24 Q174 24 174 58 L174 82 Z" fill="url(#chL)" stroke={OL} strokeWidth="4" strokeLinejoin="round" />
        <path d="M48 82 L48 30 Q57 27 66 26 L66 82 Z" fill={c.band} stroke={OL} strokeWidth="3" strokeLinejoin="round" />
        <path d="M134 82 L134 26 Q143 27 152 30 L152 82 Z" fill={c.band} stroke={OL} strokeWidth="3" strokeLinejoin="round" />
        <path d="M40 46 Q100 32 160 46" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="6" fill="none" strokeLinecap="round" />
      </g>
      <rect x="84" y="70" width="32" height="38" rx="8" fill={c.band} stroke={OL} strokeWidth="3.5" />
      <circle cx="100" cy="85" r="5" fill={OL} />
      <rect x="97.5" y="87" width="5" height="10" rx="2.5" fill={OL} />
      <ellipse cx="54" cy="94" rx="10" ry="4" fill="#ffffff" opacity="0.35" transform="rotate(-12 54 94)" />
    </svg>
  );
}
