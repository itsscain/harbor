"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";
import { STICKERS } from "@/lib/learn/stickers";
import { sfx } from "@/lib/learn/sfx";
import { Chunk } from "./kit";

// Every sea friend a child has found, with the ones still out there shown as mystery shapes —
// a reason to do just one more lesson.

const RING = { common: "var(--l-blue)", rare: "var(--l-violet)", legendary: "var(--l-gold)" } as const;

export function StickerBook({ stickers, onBack }: { stickers: Record<string, number>; onBack: () => void }) {
  const [wiggle, setWiggle] = useState<{ id: string; n: number } | null>(null);
  const found = STICKERS.filter((s) => stickers[s.id]).length;
  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-5 px-4 pb-12 pt-2 sm:px-6">
      <div className="flex items-center gap-3">
        <Chunk tone="white" onClick={() => (sfx("tap"), onBack())} aria-label="Back" className="flex h-14 w-14 items-center justify-center rounded-full" style={{ borderRadius: 999 }}>
          <ArrowLeft className="h-7 w-7 text-[var(--l-ink)]" strokeWidth={3} />
        </Chunk>
        <div className="flex-1">
          <p className="font-display text-3xl font-extrabold leading-none text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.25)]">Sticker book</p>
          <p className="mt-1 font-display text-lg font-bold text-white/90">
            {found} of {STICKERS.length} found
          </p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 rounded-[32px] bg-white/90 p-5 shadow-[0_8px_0_rgba(0,50,90,0.18)] sm:grid-cols-6 lg:grid-cols-8">
        {STICKERS.map((s) => {
          const n = stickers[s.id] ?? 0;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                if (!n) return;
                sfx(s.rarity === "legendary" ? "legendary" : "sticker");
                setWiggle((w) => ({ id: s.id, n: (w?.n ?? 0) + 1 }));
              }}
              className="relative flex aspect-square flex-col items-center justify-center rounded-[22px] bg-[var(--l-card-2)]"
              style={n ? { boxShadow: `inset 0 0 0 4px ${RING[s.rarity]}` } : undefined}
              aria-label={n ? `${s.name}${n > 1 ? `, ${n}` : ""}` : "Not found yet"}
            >
              <span key={wiggle?.id === s.id ? wiggle.n : 0} className={cn("text-[46px] leading-none", n ? wiggle?.id === s.id && "l-boing" : "opacity-25 brightness-0")}>
                {s.emoji}
              </span>
              {n > 0 && <span className="mt-1 max-w-full truncate px-1 font-display text-[11px] font-extrabold text-[var(--l-ink-2)]">{s.name}</span>}
              {n > 1 && <span className="absolute -right-1.5 -top-1.5 rounded-full bg-[var(--l-coral)] px-2 font-display text-sm font-extrabold text-white">×{n}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
