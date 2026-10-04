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
import { Chunk } from "./kit";

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
        <button type="button" onClick={tap} disabled={open || !ready} className={cn("text-[120px] leading-none", ready && !open && !reduced && "l-chest")} aria-label="Open the chest">
          {open ? "🎉" : ready ? "🎁" : "🌙"}
        </button>
        {open ? (
          <div className="l-rise flex flex-col items-center gap-3">
            <span className="flex items-center gap-2 rounded-full bg-[var(--l-card-2)] px-5 py-2 font-display text-3xl font-extrabold text-[var(--l-ink)]">
              🐚 +{prize.shells}
            </span>
            {prize.sticker && (
              <span className="flex items-center gap-3 rounded-[22px] bg-[var(--l-card-2)] px-5 py-3">
                <span className={cn("flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white text-4xl", prize.shiny && "l-shiny")} style={{ boxShadow: `0 0 0 4px ${prize.shiny ? "#ffd700" : RARITY_COLOR[prize.sticker.rarity]}` }}>
                  {prize.sticker.emoji}
                </span>
                <span className="font-display text-xl font-extrabold text-[var(--l-ink)]">
                  {prize.shiny ? "✨ Shiny " : ""}
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
