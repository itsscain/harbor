"use client";

import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";
import type { SubjectId } from "@/lib/learn/types";
import type { KidLearn } from "@/lib/learn/progress";
import { HEROES, HERO_RARITY_COLOR } from "@/lib/learn/heroes";
import { TIER_COLOR, badgeStats, badgesFor, earned, heroCards } from "@/lib/learn/badges";
import { VERSE_BY_ID, refSpoken } from "@/lib/learn/bible";
import { boxOf, isMastered } from "@/lib/learn/mastery";
import { albumProgress, STICKERS } from "@/lib/learn/stickers";
import type { Creature, Egg } from "@/lib/learn/reef";
import { SAY } from "@/lib/learn/script";
import { say } from "@/lib/learn/audio";
import { sfx } from "@/lib/learn/sfx";
import { Chunk } from "./kit";
import { Reef } from "./Reef";
import { StickerAlbum } from "./StickerAlbum";

// Treasures: everything a child has collected, one tap from Learn home. The reef (creatures that
// hatch from earned eggs and grow), the sticker album, Bible hero cards (flip them over), the
// trophy room (badges for effort as much as for winning), and the verse vault — every memory
// verse as a gem that glows brighter as it's mastered.

export type TreasureTab = "reef" | "stickers" | "heroes" | "trophies" | "verses";

export function Treasures({
  kid,
  subjects,
  eggs,
  childId,
  reduced,
  accent,
  tab: initial,
  autoHatch,
  onBack,
  onHatch,
  onBuddy,
}: {
  kid: KidLearn;
  subjects: SubjectId[];
  eggs: Egg[];
  childId: string;
  reduced: boolean;
  accent: string;
  tab?: TreasureTab;
  /** Open straight into hatching this egg (from a level's finish screen). */
  autoHatch?: string;
  onBack: () => void;
  onHatch: (egg: Egg, creature: Creature) => void;
  onBuddy: (id: string) => void;
}) {
  const faith = subjects.includes("faith") || Object.keys(kid.skills).some((k) => k.startsWith("f:"));
  const [tab, setTab] = useState<TreasureTab>(initial ?? "reef");
  const cards = useMemo(() => heroCards(kid.lessons), [kid.lessons]);
  const stats = useMemo(() => badgeStats(kid), [kid]);
  const badges = badgesFor(subjects);
  const badgeCount = badges.filter((b) => earned(b, stats)).length;
  const verses = Object.keys(kid.skills).filter((k) => k.startsWith("f:verse:")).length;
  const found = albumProgress(kid.stickers).reduce((n, s) => n + s.found, 0);
  const TABS: { id: TreasureTab; label: string; emoji: string; sub: string; show: boolean }[] = [
    { id: "reef", label: "My Reef", emoji: "🐠", sub: eggs.length ? `${eggs.length} egg${eggs.length === 1 ? "" : "s"}!` : `${kid.hatched.length} friend${kid.hatched.length === 1 ? "" : "s"}`, show: true },
    { id: "stickers", label: "Stickers", emoji: "📒", sub: `${found}/${STICKERS.length}`, show: true },
    { id: "heroes", label: "Hero Cards", emoji: "🃏", sub: `${cards.length}/${HEROES.length}`, show: faith },
    { id: "trophies", label: "Trophies", emoji: "🏆", sub: `${badgeCount}/${badges.length}`, show: true },
    { id: "verses", label: "Verse Vault", emoji: "💎", sub: `${verses}`, show: faith },
  ];

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-4 pb-10 pt-2 sm:px-6">
      <div className="flex items-center gap-3">
        <Chunk tone="white" onClick={() => (sfx("tap"), onBack())} aria-label="Back" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full" style={{ borderRadius: 999 }}>
          <ArrowLeft className="h-7 w-7 text-[var(--l-ink)]" strokeWidth={3} />
        </Chunk>
        <p className="font-display text-3xl font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.25)]">💰 Treasures</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.filter((t) => t.show).map((t) => (
          <Chunk
            key={t.id}
            tone={tab === t.id ? "violet" : "white"}
            onClick={() => {
              sfx("pick");
              setTab(t.id);
              void say(t.id === "reef" ? SAY.reef : t.id === "stickers" ? SAY.stickerBook : t.id === "heroes" ? SAY.heroBinder : t.id === "trophies" ? SAY.trophies : SAY.verseVault);
            }}
            className="flex shrink-0 items-center gap-2 px-4 py-2.5"
          >
            <span className="text-3xl leading-none">{t.emoji}</span>
            <span className="text-left">
              <span className={cn("block font-display text-lg font-extrabold leading-tight", tab === t.id ? "text-white" : "text-[var(--l-ink)]")}>{t.label}</span>
              <span className={cn("block font-display text-sm font-bold", tab === t.id ? "text-white/85" : "text-[var(--l-ink-2)]")}>{t.sub}</span>
            </span>
          </Chunk>
        ))}
      </div>

      {tab === "reef" && <Reef hatched={kid.hatched} xp={kid.xp} eggs={eggs} buddy={kid.buddy} childId={childId} reduced={reduced} accent={accent} autoHatch={autoHatch} onHatch={onHatch} onBuddy={onBuddy} />}
      {tab === "stickers" && <StickerAlbum stickers={kid.stickers} onBack={() => setTab("reef")} bare />}
      {tab === "heroes" && <HeroBinder cards={cards} reduced={reduced} />}
      {tab === "trophies" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {badges.map((b, i) => {
            const got = earned(b, stats);
            const v = Math.min(b.goal, stats[b.stat]);
            return (
              <div key={b.id} className={cn("l-rise flex flex-col items-center gap-1.5 rounded-[24px] bg-white p-4 text-center shadow-[0_5px_0_var(--l-line)]", !got && "opacity-80")} style={{ animationDelay: `${Math.min(i, 16) * 25}ms` }}>
                <span className={cn("flex h-20 w-20 items-center justify-center rounded-full text-[44px]", got && "l-shiny")} style={{ boxShadow: `0 0 0 5px ${got ? TIER_COLOR[b.tier] : "#dbe8f1"}`, background: got ? `${TIER_COLOR[b.tier]}22` : "#f2f8fc" }}>
                  <span style={got ? undefined : { filter: "grayscale(1) opacity(0.35)" }}>{b.emoji}</span>
                </span>
                <span className="font-display text-lg font-extrabold leading-tight text-[var(--l-ink)]">{b.name}</span>
                <span className="font-display text-sm font-bold leading-snug text-[var(--l-ink-2)]">{b.desc}</span>
                {!got && b.goal > 1 && (
                  <span className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-[var(--l-card-2)]">
                    <span className="block h-full rounded-full" style={{ width: `${(v / b.goal) * 100}%`, background: TIER_COLOR[b.tier] }} />
                  </span>
                )}
                {got && <span className="rounded-full px-2.5 py-0.5 font-display text-xs font-extrabold uppercase text-white" style={{ background: TIER_COLOR[b.tier] }}>{b.tier}</span>}
              </div>
            );
          })}
        </div>
      )}
      {tab === "verses" && <VerseVault skills={kid.skills} />}
    </div>
  );
}

function HeroBinder({ cards, reduced }: { cards: ReturnType<typeof heroCards>; reduced: boolean }) {
  const [flipped, setFlipped] = useState<string | null>(null);
  const have = new Map(cards.map((c) => [c.hero.id, c]));
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {HEROES.map((h, i) => {
        const card = have.get(h.id);
        const up = flipped === h.id;
        return (
          <button
            key={h.id}
            type="button"
            disabled={!card}
            onClick={() => {
              sfx("whoosh");
              setFlipped(up ? null : h.id);
              if (!up) void say([h.name]);
            }}
            className="l-rise relative h-[250px] [perspective:1000px]"
            style={{ animationDelay: `${Math.min(i, 15) * 30}ms` }}
            aria-label={card ? `${h.name} hero card` : "A hero card you haven't found yet"}
          >
            <span className="absolute inset-0 transition-transform duration-500 [transform-style:preserve-3d]" style={{ transform: up ? "rotateY(180deg)" : "none" }}>
              {/* Front */}
              <span className={cn("absolute inset-0 flex flex-col items-center justify-between overflow-hidden rounded-[22px] p-3 [backface-visibility:hidden]", card?.holo && !reduced && "l-shiny")} style={{ background: card ? `linear-gradient(160deg, ${h.color}, ${h.color}cc)` : "linear-gradient(160deg,#cfdbe6,#b7c7d6)", boxShadow: `0 6px 0 ${card ? HERO_RARITY_COLOR[h.rarity] : "#9fb3c6"}, inset 0 0 0 4px rgba(255,255,255,0.6)` }}>
                <span className="self-start rounded-full bg-white/85 px-2 font-display text-[11px] font-extrabold uppercase tracking-wider" style={{ color: HERO_RARITY_COLOR[h.rarity] }}>
                  {card?.holo ? "✨ Holo" : h.rarity}
                </span>
                <span className="text-[88px] leading-none drop-shadow-[0_6px_0_rgba(0,0,0,0.15)]" style={card ? undefined : { filter: "brightness(0) opacity(0.25)" }}>
                  {h.emoji}
                </span>
                <span className="w-full">
                  <span className="block font-display text-xl font-extrabold leading-tight text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.2)]">{card ? h.name : "???"}</span>
                  <span className="mt-1 block rounded-full bg-white/90 px-2 py-0.5 font-display text-sm font-extrabold text-[var(--l-ink)]">{card ? h.trait : "Pass their story"}</span>
                </span>
              </span>
              {/* Back */}
              <span className="absolute inset-0 flex flex-col justify-between gap-2 rounded-[22px] bg-white p-4 text-left shadow-[0_6px_0_var(--l-line)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <span className="font-display text-lg font-extrabold text-[var(--l-ink)]">
                  {h.emoji} {h.name}
                </span>
                <span className="font-reading text-[15px] font-bold leading-snug text-[var(--l-ink)]">{h.fact}</span>
                <span className="rounded-xl bg-[var(--l-card-2)] px-2 py-1 font-display text-sm font-extrabold text-[var(--l-violet)]">📖 {h.ref}</span>
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Every verse met, as a gem: learning (blue) → strong (green) → mastered (gold crown). */
function VerseVault({ skills }: { skills: KidLearn["skills"] }) {
  const list = Object.entries(skills)
    .filter(([k]) => k.startsWith("f:verse:"))
    .map(([k, s]) => ({ v: VERSE_BY_ID.get(k.slice(8)), s }))
    .filter((x): x is { v: NonNullable<typeof x.v>; s: typeof x.s } => !!x.v)
    .sort((a, b) => boxOf(b.s) - boxOf(a.s));
  const [open, setOpen] = useState<string | null>(null);
  const mastered = list.filter((x) => isMastered(x.s)).length;
  if (!list.length)
    return (
      <div className="flex flex-col items-center gap-3 rounded-[30px] bg-white/92 px-6 py-10 text-center shadow-[0_6px_0_var(--l-line)]">
        <span className="text-[80px] leading-none">💎</span>
        <p className="font-display text-2xl font-extrabold text-[var(--l-ink)]">Your vault is ready for treasure</p>
        <p className="max-w-[520px] font-display text-lg font-bold text-[var(--l-ink-2)]">Every memory verse you learn on the Lighthouse voyage becomes a gem here — and it shines brighter as you master it.</p>
      </div>
    );
  return (
    <div className="flex flex-col gap-3">
      <p className="font-display text-xl font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.25)]">
        {list.length} verse{list.length === 1 ? "" : "s"} in your heart · 👑 {mastered} mastered
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {list.map(({ v, s }) => {
          const tier = isMastered(s) ? "gold" : boxOf(s) >= 1 ? "green" : "blue";
          const color = tier === "gold" ? "#e0a21a" : tier === "green" ? "#22c59b" : "#1cb0f6";
          const isOpen = open === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => {
                sfx("pick");
                setOpen(isOpen ? null : v.id);
                if (!isOpen) void say([v.text, { gap: 250 }, refSpoken(v.ref)]);
              }}
              className="flex items-start gap-3 rounded-[24px] bg-white p-4 text-left shadow-[0_5px_0_var(--l-line)]"
            >
              <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl", tier === "gold" && "l-shiny")} style={{ background: `${color}22`, boxShadow: `0 0 0 3px ${color}` }}>
                {tier === "gold" ? "👑" : "💎"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-lg font-extrabold text-[var(--l-ink)]">
                  {v.pic} {v.ref}
                  <span className="ml-2 font-display text-sm font-bold" style={{ color }}>
                    {tier === "gold" ? "Mastered" : tier === "green" ? "Getting strong" : "Learning"}
                  </span>
                </span>
                <span className={cn("block font-reading text-[17px] font-bold leading-snug text-[#3b2a14]", !isOpen && "line-clamp-2")}>{v.text}</span>
                {isOpen && <span className="mt-2 block rounded-xl bg-[var(--l-card-2)] px-3 py-2 font-display text-[15px] font-bold text-[var(--l-ink)]">💡 {v.meaning}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
