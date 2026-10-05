"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";
import { RARITY_COLOR, RARITY_LABEL, albumProgress, stickersInSet, type StickerSet } from "@/lib/learn/stickers";
import { sfx } from "@/lib/learn/sfx";
import { Chunk } from "./kit";
import { Glyph, GlyphRow } from "./art/Glyph";

// The sticker album: twelve sets to fill, each sticker common to legendary, and a rare shiny
// version of every one. Every sticker is a drawn, die-cut sticker (a white edge and a ring in its
// rarity's color); finished sets get a gold badge (and paid 60 shells when they filled). Unfound
// stickers show as mystery silhouettes, so there's always something to hunt for.

export function StickerAlbum({ stickers, onBack, bare }: { stickers: Record<string, number>; onBack: () => void; bare?: boolean }) {
  const [open, setOpen] = useState<StickerSet | null>(null);
  const sets = albumProgress(stickers);
  const found = sets.reduce((n, s) => n + s.found, 0);
  const total = sets.reduce((n, s) => n + s.total, 0);
  const shinies = Object.keys(stickers).filter((k) => k.endsWith("*")).length;

  return (
    <div className={cn("flex w-full flex-col gap-4", bare ? "" : "mx-auto max-w-[1100px] px-4 pb-10 pt-2 sm:px-6")}>
      {bare && open && (
        <Chunk tone="white" onClick={() => (sfx("tap"), setOpen(null))} className="flex h-14 w-fit items-center gap-2 px-4 font-display text-lg font-extrabold text-[var(--l-ink)]">
          <ArrowLeft className="h-5 w-5" strokeWidth={3} /> <GlyphRow s={open.emoji} size={32} /> {open.name}
        </Chunk>
      )}
      <div className={cn("flex items-center gap-3", bare && "hidden")}>
        <Chunk tone="white" onClick={() => (sfx("tap"), open ? setOpen(null) : onBack())} aria-label="Back" className="flex h-14 w-14 items-center justify-center rounded-full" style={{ borderRadius: 999 }}>
          <ArrowLeft className="h-7 w-7 text-[var(--l-ink)]" strokeWidth={3} />
        </Chunk>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-display text-3xl font-extrabold leading-none text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.25)]">
            <GlyphRow s={open ? open.emoji : "📒"} size={40} /> {open ? open.name : "Sticker album"}
          </p>
          <p className="mt-1 flex items-center gap-1.5 font-display text-base font-bold text-white/90">
            {found} of {total} found
            {shinies > 0 && (
              <>
                {" "}
                · <Glyph e="✨" size={20} /> {shinies} shiny
              </>
            )}
          </p>
        </div>
      </div>

      {!open ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {sets.map(({ set, found: f, total: t, complete }, i) => (
            <Chunk key={set.id} tone="white" onClick={() => (sfx("pick"), setOpen(set))} className="l-rise relative flex flex-col items-center gap-2 overflow-hidden p-4" style={{ animationDelay: `${i * 40}ms` }}>
              <span className="pointer-events-none absolute inset-x-0 top-0 h-16" style={{ background: `linear-gradient(180deg, ${set.color}33, transparent)` }} />
              {complete && (
                <span className="absolute -right-1 top-2 z-[1] flex rotate-12 items-center gap-1 rounded-full bg-[var(--l-gold)] px-2.5 py-1 font-display text-sm font-extrabold text-[#5a3b00] shadow-[0_3px_0_var(--l-gold-edge)]">
                  <Glyph e="⭐" size={18} /> Done!
                </span>
              )}
              <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white" style={{ boxShadow: `0 0 0 5px ${set.color}, 0 6px 0 5px rgba(0,40,80,0.12)` }}>
                <GlyphRow s={set.emoji} size={70} />
              </span>
              <span className="mt-1 text-center font-display text-lg font-extrabold leading-tight text-[var(--l-ink)]">{set.name}</span>
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
        <div className="grid grid-cols-3 gap-4 rounded-[32px] bg-white/30 p-4 sm:grid-cols-4 lg:grid-cols-6" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.35) 1.5px, transparent 1.5px)", backgroundSize: "22px 22px" }}>
          {stickersInSet(open.id).map((s, i) => {
            const n = stickers[s.id] ?? 0;
            const shiny = (stickers[`${s.id}*`] ?? 0) > 0;
            const have = n > 0 || shiny;
            const ring = have ? (shiny ? "#ffd700" : RARITY_COLOR[s.rarity]) : "#c9d8e4";
            return (
              <div key={s.id} className="l-pop-in flex flex-col items-center gap-1.5" style={{ animationDelay: `${i * 30}ms` }}>
                {/* A die-cut sticker: a white edge, then the rarity ring. */}
                <span className={cn("relative flex h-[104px] w-[104px] items-center justify-center rounded-full", have && "rotate-[-3deg]", shiny && "l-shiny")} style={{ background: have ? `radial-gradient(circle at 35% 30%, #ffffff, ${ring}22)` : "#e9f1f7", boxShadow: have ? `0 0 0 6px #ffffff, 0 0 0 10px ${ring}, 0 8px 0 10px rgba(0,40,80,0.14)` : `0 0 0 5px rgba(255,255,255,0.7), inset 0 3px 0 rgba(0,40,80,0.08)` }}>
                  <GlyphRow s={s.emoji} size={76} style={have ? (shiny ? { filter: "drop-shadow(0 0 8px #ffd700) saturate(1.3)" } : undefined) : { filter: "brightness(0) opacity(0.16)" }} />
                  {shiny && <Glyph e="✨" size={30} className="absolute -right-2 -top-2" />}
                  {n > 1 && <span className="absolute -bottom-1 -right-1 rounded-full bg-[var(--l-ink)] px-2 font-display text-sm font-extrabold text-white shadow-[0_2px_0_rgba(0,0,0,0.2)]">×{n}</span>}
                </span>
                <span className="mt-2 text-center font-display text-sm font-extrabold leading-tight text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.3)]">{have ? s.name : "???"}</span>
                <span className="rounded-full px-2 font-display text-xs font-extrabold text-white" style={{ background: have ? (shiny ? "#e0a800" : RARITY_COLOR[s.rarity]) : "#9fb3c6" }}>
                  {shiny ? "Shiny" : RARITY_LABEL[s.rarity].replace("!", "")}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
