"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { SHELLS } from "@/lib/learn/meta";
import { rng } from "@/lib/learn/gen";
import { pickSticker, RARITY_COLOR, type Sticker } from "@/lib/learn/stickers";
import { SAY } from "@/lib/learn/script";
import { say } from "@/lib/learn/audio";
import { sfx, buzz } from "@/lib/learn/sfx";
import { Confetti } from "../Confetti";
import { Chunk, ShellIcon } from "./kit";
import { CHEST, Chest } from "./LessonDone";
import { Glyph, GlyphRow } from "./art/Glyph";

// Once a day, a treasure chest: a handful of shells, and sometimes a sticker. A small, reliable
// reason to come back tomorrow (and the streak does the rest).

export type ChestPrize = { shells: number; sticker: Sticker | null; shiny: boolean };

export function dailyPrize(childId: string, day: string, owned: Record<string, number>): ChestPrize {
  const r = rng(`daily:${childId}:${day}`);
  const [lo, hi] = SHELLS.dailyChest;
  const shells = lo + Math.floor(r() * (hi - lo + 1));
  const withSticker = r() < 0.35;
  const pick = withSticker ? pickSticker(`daily:${childId}:${day}`, owned, "wood") : null;
  return { shells, sticker: pick?.sticker ?? null, shiny: pick?.shiny ?? false };
}

export function DailyChest({ ready, prize, accent, reduced, onOpen, onClose }: { ready: boolean; prize: ChestPrize; accent: string; reduced: boolean; onOpen: () => void; onClose: () => void }) {
  const [open, setOpen] = useState(false);
  const tap = () => {
    if (open || !ready) return;
    setOpen(true);
    sfx("chest");
    buzz([0, 30, 40, 60]);
    window.setTimeout(() => {
      sfx("coin");
      void say(prize.sticker ? SAY.newSticker : SAY.shellsEarned);
    }, 650);
    onOpen();
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0b2340]/60 p-6 backdrop-blur-sm" onClick={open || !ready ? onClose : undefined}>
      <div className="relative">{open && !reduced && <Confetti count={50} spread={420} accent={accent} />}</div>
      <div className="l-pop-in flex w-full max-w-md flex-col items-center gap-4 rounded-[34px] bg-white p-7 text-center shadow-[0_10px_0_var(--l-line)]" onClick={(e) => e.stopPropagation()}>
        <p className="font-display text-3xl font-extrabold text-[var(--l-ink)]">{open ? "Treasure!" : ready ? "Your daily chest!" : "Come back tomorrow!"}</p>
        <button type="button" onClick={tap} disabled={open || !ready} className={cn("relative block", ready && !open && !reduced && "l-chest")} aria-label="Open the chest">
          {ready || open ? (
            <span className={cn("block origin-bottom transition-transform duration-500", open && "scale-90")}>
              <Chest open={open} c={CHEST.gold} />
            </span>
          ) : (
            <Glyph e="🌙" size={150} />
          )}
          {open && <Glyph e="🎉" size={64} className="l-pop-in absolute -right-6 -top-4" />}
        </button>
        {open ? (
          <div className="l-rise flex flex-col items-center gap-3">
            <span className="flex items-center gap-2 rounded-full bg-[var(--l-card-2)] px-5 py-2 font-display text-3xl font-extrabold text-[var(--l-ink)]">
              <ShellIcon size={36} /> +{prize.shells}
            </span>
            {prize.sticker && (
              <span className="flex items-center gap-3 rounded-[22px] bg-[var(--l-card-2)] px-5 py-3">
                <span className={cn("flex h-20 w-20 items-center justify-center rounded-full", prize.shiny && "l-shiny")} style={{ background: "radial-gradient(circle at 35% 30%, #ffffff, #eef5fb)", boxShadow: `0 0 0 5px #ffffff, 0 0 0 9px ${prize.shiny ? "#ffd700" : RARITY_COLOR[prize.sticker.rarity]}, 0 6px 0 9px rgba(0,40,80,0.12)` }}>
                  <GlyphRow s={prize.sticker.emoji} size={58} />
                </span>
                <span className="font-display text-xl font-extrabold text-[var(--l-ink)]">
                  {prize.shiny && <Glyph e="✨" size={26} className="mr-1 inline-block align-[-0.3em]" />}
                  {prize.shiny ? "Shiny " : ""}
                  {prize.sticker.name}
                </span>
              </span>
            )}
            <Chunk tone="green" onClick={() => (sfx("tap"), onClose())} className="mt-1 flex h-16 w-60 items-center justify-center font-display text-2xl font-extrabold">
              Yay!
            </Chunk>
          </div>
        ) : ready ? (
          <p className="l-pulse font-display text-xl font-bold text-[var(--l-ink-2)]">Tap the chest!</p>
        ) : (
          <>
            <p className="font-display text-lg font-bold text-[var(--l-ink-2)]">You opened today&rsquo;s chest. A new one appears every day!</p>
            <Chunk tone="white" onClick={() => (sfx("tap"), onClose())} className="flex h-14 w-48 items-center justify-center font-display text-xl font-bold text-[var(--l-ink)]">
              Okay
            </Chunk>
          </>
        )}
      </div>
    </div>
  );
}
