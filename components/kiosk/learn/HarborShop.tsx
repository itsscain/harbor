"use client";

import { Glyph, GlyphRow } from "./art/Glyph";
import { useState } from "react";
import { ArrowLeft, Check, Lock } from "lucide-react";
import { cn } from "@/lib/cn";
import { SHOP, type BoatLook, type ShopItem, type Slot } from "@/lib/learn/meta";
import { SAY } from "@/lib/learn/script";
import { say } from "@/lib/learn/audio";
import { sfx, buzz } from "@/lib/learn/sfx";
import { Chunk, ShellIcon } from "./kit";
import { SideBoat } from "./KidBoat";

// The Harbor Shop: everything here is bought with shells earned by learning (never real money).
// Hulls, sails, flags, a pet for the deck and a trail for the map — the boat is the child's
// character on every voyage, so making it theirs is the reward that keeps on showing.

const TABS: { slot: Slot; label: string; emoji: string }[] = [
  { slot: "hull", label: "Hulls", emoji: "🚤" },
  { slot: "sail", label: "Sails", emoji: "⛵" },
  { slot: "flag", label: "Flags", emoji: "🚩" },
  { slot: "pet", label: "Pets", emoji: "🦜" },
  { slot: "trail", label: "Trails", emoji: "✨" },
];

export function HarborShop({
  look,
  owned,
  shells,
  level,
  reduced,
  onBack,
  onBuy,
  onEquip,
}: {
  look: BoatLook;
  owned: Set<string>;
  shells: number;
  level: number;
  reduced: boolean;
  onBack: () => void;
  onBuy: (item: ShopItem) => void;
  onEquip: (look: BoatLook) => void;
}) {
  const [tab, setTab] = useState<Slot>("hull");
  const [preview, setPreview] = useState<ShopItem | null>(null);
  const [shake, setShake] = useState<{ id: string; n: number } | null>(null);
  const shown = preview ? { ...look, [preview.slot]: preview.id } : look;
  const equipped = (it: ShopItem) => look[it.slot] === it.id;

  const tapItem = (it: ShopItem) => {
    sfx("pick");
    if (owned.has(it.id)) {
      if (equipped(it) && (it.slot === "pet" || it.slot === "trail")) onEquip({ ...look, [it.slot]: null });
      else onEquip({ ...look, [it.slot]: it.id });
      setPreview(null);
      return;
    }
    setPreview(it);
  };
  const buy = (it: ShopItem) => {
    if ((it.level ?? 0) > level || shells < it.price) {
      sfx("wrong");
      setShake((s) => ({ id: it.id, n: (s?.n ?? 0) + 1 }));
      void say(SAY.notEnough);
      return;
    }
    sfx("buy");
    buzz([0, 20, 40, 20]);
    void say(SAY.bought);
    onBuy(it);
    setPreview(null);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 px-4 pb-10 pt-2 sm:px-6">
      <div className="flex items-center gap-3">
        <Chunk tone="white" onClick={() => (sfx("tap"), onBack())} aria-label="Back" className="flex h-14 w-14 items-center justify-center rounded-full" style={{ borderRadius: 999 }}>
          <ArrowLeft className="h-7 w-7 text-[var(--l-ink)]" strokeWidth={3} />
        </Chunk>
        <p className="flex-1 font-display text-3xl font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.25)]"><Glyph e="🛍️" size="1.25em" className="mx-[0.1em] inline-block align-[-0.28em]" /> Harbor Shop</p>
        <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 font-display text-2xl font-extrabold text-[var(--l-ink)] shadow-[0_5px_0_var(--l-line)]">
          <ShellIcon size={28} /> <span className="tabular-nums">{shells}</span>
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        {/* Preview */}
        <div className="relative flex flex-col items-center gap-3 overflow-hidden rounded-[34px] p-5 shadow-[0_8px_0_rgba(0,40,80,0.18)]" style={{ background: "linear-gradient(180deg, #c9f1ff 0%, #9be2ff 46%, #3fb6e8 46%, #1d93cf 100%)" }}>
          <span className="pointer-events-none absolute right-7 top-6 h-12 w-12 rounded-full bg-[radial-gradient(circle_at_40%_40%,#fff7c2,#ffd23a)] shadow-[0_0_30px_10px_rgba(255,220,90,0.55)]" />
          <svg viewBox="0 0 260 40" preserveAspectRatio="none" className={cn("pointer-events-none absolute inset-x-0 top-[44%] h-7 w-[200%]", !reduced && "l-wave-slow")} aria-hidden>
            <path d="M0 20 Q16 8 32 20 T64 20 T96 20 T128 20 T160 20 T192 20 T224 20 T256 20 V40 H0 Z" fill="#ffffff" opacity="0.45" />
          </svg>
          <span className="relative mt-4">
            <SideBoat look={shown} size={240} bob={!reduced} showTrail />
          </span>
          {preview ? (
            <div className="flex w-full flex-col items-center gap-2 rounded-[22px] bg-white p-4">
              <p className="font-display text-2xl font-extrabold text-[var(--l-ink)]">{preview.name}</p>
              {(preview.level ?? 0) > level ? (
                <p className="font-display text-lg font-bold text-[var(--l-ink-2)]"><Glyph e="🔒" size="1.25em" className="mx-[0.1em] inline-block align-[-0.28em]" /> Reach level {preview.level} to buy this</p>
              ) : (
                <Chunk key={shake?.id === preview.id ? shake.n : 0} tone={shells >= preview.price ? "green" : "white"} onClick={() => buy(preview)} className={cn("flex h-16 w-full items-center justify-center gap-2 font-display text-2xl font-extrabold", shells < preview.price && "text-[var(--l-ink-2)]", shake?.id === preview.id && "l-shake")}>
                  Buy for <ShellIcon size={30} /> {preview.price}
                </Chunk>
              )}
              {shells < preview.price && (preview.level ?? 0) <= level && <p className="font-display text-base font-bold text-[var(--l-ink-2)]">{preview.price - shells} more shells — keep learning!</p>}
            </div>
          ) : (
            <p className="rounded-full bg-white/85 px-4 py-2 font-display text-lg font-bold text-[var(--l-ink)]">Tap something to try it on!</p>
          )}
        </div>

        {/* Catalog */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <Chunk key={t.slot} tone={tab === t.slot ? "blue" : "white"} onClick={() => (sfx("tap"), setTab(t.slot), setPreview(null))} className={cn("flex h-14 items-center gap-2 px-4 font-display text-lg font-extrabold", tab !== t.slot && "text-[var(--l-ink)]")}>
                <GlyphRow s={t.emoji ?? ""} size={32} /> {t.label}
              </Chunk>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {SHOP.filter((it) => it.slot === tab).map((it) => {
              const have = owned.has(it.id);
              const on = equipped(it);
              const locked = !have && (it.level ?? 0) > level;
              return (
                <Chunk key={it.id} tone="white" onClick={() => tapItem(it)} className={cn("relative flex flex-col items-center gap-2 p-3", preview?.id === it.id && "outline-[5px] outline-[var(--l-gold)]", on && "outline-[5px] outline-[var(--l-green)]")}>
                  <ItemSwatch it={it} look={look} />
                  <span className="text-center font-display text-base font-extrabold leading-tight text-[var(--l-ink)]">{it.name}</span>
                  {on ? (
                    <span className="flex items-center gap-1 rounded-full bg-[var(--l-green)] px-3 py-0.5 font-display text-sm font-extrabold text-white">
                      <Check className="h-4 w-4" strokeWidth={3.5} /> On
                    </span>
                  ) : have ? (
                    <span className="rounded-full bg-[var(--l-card-2)] px-3 py-0.5 font-display text-sm font-extrabold text-[var(--l-ink-2)]">Tap to use</span>
                  ) : locked ? (
                    <span className="flex items-center gap-1 rounded-full bg-[var(--l-card-2)] px-3 py-0.5 font-display text-sm font-extrabold text-[var(--l-ink-2)]">
                      <Lock className="h-3.5 w-3.5" /> Level {it.level}
                    </span>
                  ) : (
                    <span className={cn("flex items-center gap-1 rounded-full px-3 py-0.5 font-display text-sm font-extrabold", shells >= it.price ? "bg-[var(--l-gold)] text-[#5a3b00]" : "bg-[var(--l-card-2)] text-[var(--l-ink-2)]")}>
                      <ShellIcon size={16} /> {it.price}
                    </span>
                  )}
                </Chunk>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/** What an item looks like in the catalog: hulls and sails on a little boat of their own,
 *  flags, pets and trails as their pictures. */
function ItemSwatch({ it, look }: { it: ShopItem; look: BoatLook }) {
  if (it.slot === "hull" || it.slot === "sail")
    return (
      <span className="flex h-[84px] w-[84px] items-center justify-center rounded-[22px] bg-[linear-gradient(180deg,#e6f7ff_0%,#e6f7ff_62%,#bfe8ff_62%)]">
        <SideBoat look={{ ...look, [it.slot]: it.id, pet: null, trail: null }} size={78} bob={false} />
      </span>
    );
  return (
    <span className="flex h-[84px] w-[84px] items-center justify-center rounded-[22px] bg-[var(--l-card-2)]">
      <GlyphRow s={it.emoji ?? "✨"} size={60} />
    </span>
  );
}
