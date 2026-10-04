"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";
import { RARITY_COLOR, RARITY_LABEL, albumProgress, stickersInSet, type StickerSet } from "@/lib/learn/stickers";
import { sfx } from "@/lib/learn/sfx";
import { Chunk } from "./kit";

// The sticker album: twelve sets to fill, each sticker common to legendary, and a rare shiny
// version of every one. Finished sets get a gold badge (and paid 60 shells when they filled).
// Unfound stickers show as mystery silhouettes, so there's always something to hunt for.

export function StickerAlbum({ stickers, onBack }: { stickers: Record<string, number>; onBack: () => void }) {
  const [open, setOpen] = useState<StickerSet | null>(null);
  const sets = albumProgress(stickers);
  const found = sets.reduce((n, s) => n + s.found, 0);
  const total = sets.reduce((n, s) => n + s.total, 0);
  const shinies = Object.keys(stickers).filter((k) => k.endsWith("*")).length;

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 px-4 pb-10 pt-2 sm:px-6">
      <div className="flex items-center gap-3">
        <Chunk tone="white" onClick={() => (sfx("tap"), open ? setOpen(null) : onBack())} aria-label="Back" className="flex h-14 w-14 items-center justify-center rounded-full" style={{ borderRadius: 999 }}>
          <ArrowLeft className="h-7 w-7 text-[var(--l-ink)]" strokeWidth={3} />
        </Chunk>
        <div className="min-w-0 flex-1">
          <p className="font-display text-3xl font-extrabold leading-none text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.25)]">{open ? `${open.emoji} ${open.name}` : "📒 Sticker album"}</p>
          <p className="mt-1 font-display text-base font-bold text-white/90">
            {found} of {total} found{shinies ? ` · ✨ ${shinies} shiny` : ""}
          </p>
        </div>
      </div>

      {!open ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {sets.map(({ set, found: f, total: t, complete }, i) => (
            <Chunk key={set.id} tone="white" onClick={() => (sfx("pick"), setOpen(set))} className="l-rise relative flex flex-col items-center gap-2 p-4" style={{ animationDelay: `${i * 40}ms` }}>
              {complete && <span className="absolute -right-2 -top-2 rotate-12 rounded-full bg-[var(--l-gold)] px-2.5 py-1 font-display text-sm font-extrabold text-[#5a3b00] shadow-[0_3px_0_var(--l-gold-edge)]">⭐ Done!</span>}
              <span className="flex h-20 w-20 items-center justify-center rounded-3xl text-5xl" style={{ background: `${set.color}22` }}>
                {set.emoji}
              </span>
              <span className="text-center font-display text-lg font-extrabold leading-tight text-[var(--l-ink)]">{set.name}</span>
              <span className="h-3 w-full overflow-hidden rounded-full bg-[var(--l-card-2)]">
                <span className="block h-full rounded-full" style={{ width: `${(f / t) * 100}%`, background: set.color }} />
              </span>
              <span className="font-display text-sm font-extrabold text-[var(--l-ink-2)]">
                {f}/{t}
              </span>
            </Chunk>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {stickersInSet(open.id).map((s, i) => {
            const n = stickers[s.id] ?? 0;
            const shiny = (stickers[`${s.id}*`] ?? 0) > 0;
            const have = n > 0 || shiny;
            return (
              <div key={s.id} className="l-pop-in flex flex-col items-center gap-1.5 rounded-[24px] bg-white p-3 shadow-[0_5px_0_var(--l-line)]" style={{ animationDelay: `${i * 30}ms` }}>
                <span className={cn("relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full", shiny && "l-shiny")} style={{ boxShadow: `0 0 0 4px ${have ? (shiny ? "#ffd700" : RARITY_COLOR[s.rarity]) : "#dbe8f1"}` }}>
                  <span className="text-5xl" style={have ? (shiny ? { filter: "drop-shadow(0 0 8px #ffd700) saturate(1.4)" } : undefined) : { filter: "brightness(0) opacity(0.18)" }}>
                    {s.emoji}
                  </span>
                  {n > 1 && <span className="absolute bottom-0 right-0 rounded-full bg-[var(--l-ink)] px-1.5 font-display text-xs font-extrabold text-white">×{n}</span>}
                </span>
                <span className="text-center font-display text-sm font-extrabold leading-tight text-[var(--l-ink)]">{have ? s.name : "???"}</span>
                <span className="rounded-full px-2 font-display text-xs font-extrabold text-white" style={{ background: RARITY_COLOR[s.rarity] }}>
                  {shiny ? "✨ Shiny" : RARITY_LABEL[s.rarity].replace("!", "")}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
