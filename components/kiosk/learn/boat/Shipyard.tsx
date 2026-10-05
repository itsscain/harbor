"use client";

import { useState, type ReactNode } from "react";
import { ArrowLeft, Check, Dices, Lock, Sailboat, Volume2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { NAME_ADJ, NAME_NOUN, SHOP, equipItem, isOn, modelOf, type BoatLook, type DeckSpot, type ShopItem, type Slot } from "@/lib/learn/boats";
import { SAY } from "@/lib/learn/script";
import { say } from "@/lib/learn/audio";
import { sfx, buzz, boatSound } from "@/lib/learn/sfx";
import { Glyph, GlyphRow } from "../art/Glyph";
import { Chunk, ShellIcon } from "../kit";
import { BuyButton } from "../Aquarium";
import { SideBoat } from "./Boat";
import { Flag } from "./skin";
import { Pet, type PetReact } from "./Pet";
import { partInner } from "./gear";

// The Shipyard: design your boat. A big stage shows it on the water (alive — sails filling, flag
// flying, the pet on deck); tabs hold the boats (the upgrades), colors, paint jobs, sails, flags,
// figureheads, deck gear, pets, trails and a name. Tap anything to try it on; things you own go
// straight onto the boat, new things cost shells (two taps, never by accident).

type Tab = Slot | "name";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "boat", label: "Boats", icon: "⛵" },
  { id: "hull", label: "Colors", icon: "🎨" },
  { id: "paint", label: "Paint", icon: "🖌️" },
  { id: "sail", label: "Sails", icon: "🧭" },
  { id: "flag", label: "Flags", icon: "🚩" },
  { id: "figure", label: "Bow", icon: "🐬" },
  { id: "deck", label: "Deck", icon: "🔔" },
  { id: "pet", label: "Pets", icon: "🦜" },
  { id: "trail", label: "Trails", icon: "✨" },
  { id: "name", label: "Name", icon: "🏷️" },
];
const SPOTS: { spot: DeckSpot; label: string }[] = [
  { spot: "bow", label: "At the front" },
  { spot: "mid", label: "In the middle" },
  { spot: "stern", label: "At the back" },
  { spot: "mast", label: "Up the mast" },
  { spot: "side", label: "On the side" },
];

const pick = <T,>(arr: T[], n: number) => arr[Math.abs(n) % arr.length];
const randomSeed = () => Math.floor(Math.random() * 1e6);

export function Shipyard({
  look,
  owned,
  shells,
  level,
  reduced,
  onBack,
  onBuy,
  onEquip,
  onSail,
}: {
  look: BoatLook;
  owned: Set<string>;
  shells: number;
  level: number;
  reduced: boolean;
  onBack: () => void;
  onBuy: (item: ShopItem) => void;
  onEquip: (look: BoatLook) => void;
  onSail: () => void;
}) {
  const [tab, setTab] = useState<Tab>("boat");
  const [preview, setPreview] = useState<ShopItem | null>(null);
  const [petReact, setPetReact] = useState<PetReact>(null);
  const [hop, setHop] = useState(0);
  const [adj, setAdj] = useState(() => look.name?.split(" ")[0] ?? NAME_ADJ[0]);
  const [noun, setNoun] = useState(() => look.name?.split(" ")[1] ?? NAME_NOUN[0]);
  const has = (it: ShopItem) => it.price === 0 || owned.has(it.id);
  const shown = preview ? equipItem(look, preview) : look;
  const model = modelOf(shown);
  const sailless = model === "tug" || model === "paddle";
  const celebrate = () => {
    setPetReact((r) => ({ mood: "cheer", k: (r?.k ?? 0) + 1 }));
    setHop((h) => h + 1);
  };

  const tapItem = (it: ShopItem) => {
    sfx("pick");
    void say([it.name]);
    if (has(it)) {
      onEquip(equipItem(look, it));
      setPreview(null);
      if (it.slot === "boat") boatSound(it.model === "tug" ? "toot" : it.model === "duck" ? "duck" : "horn");
      if (it.slot === "pet" && !isOn(look, it)) celebrate();
      return;
    }
    setPreview(it);
  };
  const buy = (it: ShopItem) => {
    sfx("buy");
    buzz([0, 20, 40, 20]);
    void say(SAY.bought);
    onBuy(it);
    setPreview(null);
    celebrate();
  };
  const surprise = () => {
    // A random boat from everything this sailor owns.
    const seed = randomSeed();
    const mine = (slot: Slot) => SHOP.filter((i) => i.slot === slot && has(i));
    let next: BoatLook = { ...look };
    (["boat", "hull", "paint", "sail", "flag"] as const).forEach((slot, i) => {
      const list = mine(slot);
      if (list.length) next = { ...next, [slot]: pick(list, seed >> i).id };
    });
    for (const slot of ["figure", "pet", "trail"] as const) {
      const list = mine(slot);
      next = { ...next, [slot]: list.length && (seed >> slot.length) % 3 ? pick(list, seed >> (slot.length + 2)).id : null };
    }
    next = { ...next, deck: [] };
    for (const g of mine("deck")) if ((seed + g.id.length) % 2) next = equipItem(next, g);
    sfx("whoosh");
    onEquip(next);
    setPreview(null);
    celebrate();
  };
  const saveName = (a = adj, n = noun) => {
    const name = `${a} ${n}`;
    onEquip({ ...look, name });
    void say(["The", a, n]);
  };

  const items = SHOP.filter((i) => i.slot === tab);
  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-4 px-4 pb-10 pt-2 sm:px-6">
      <div className="flex items-center gap-3">
        <Chunk tone="white" onClick={() => (sfx("tap"), onBack())} aria-label="Back" className="flex h-14 w-14 items-center justify-center rounded-full" style={{ borderRadius: 999 }}>
          <ArrowLeft className="h-7 w-7 text-[var(--l-ink)]" strokeWidth={3} />
        </Chunk>
        <p className="flex flex-1 items-center gap-2 font-display text-3xl font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.25)]">
          <Glyph e="⚓" size={40} /> Shipyard
        </p>
        <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 font-display text-2xl font-extrabold text-[var(--l-ink)] shadow-[0_5px_0_var(--l-line)]">
          <ShellIcon size={28} /> <span className="tabular-nums">{shells}</span>
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        {/* ── The stage ── */}
        <div className="flex flex-col gap-3">
          <div className="relative overflow-hidden rounded-[36px] shadow-[0_10px_0_rgba(0,40,80,0.18)]" style={{ background: "linear-gradient(180deg,#bdeaff 0%,#8fd6fb 52%,#2ea7df 52%,#167fbe 100%)" }}>
            <span className="pointer-events-none absolute right-8 top-6 h-16 w-16 rounded-full bg-[radial-gradient(circle_at_40%_40%,#fff7c2,#ffd23a)] shadow-[0_0_44px_14px_rgba(255,220,90,0.55)]" />
            <svg viewBox="0 0 400 60" className="pointer-events-none absolute left-[6%] top-[12%] w-[34%] opacity-90" aria-hidden>
              <path d="M30 40 Q32 22 52 24 Q60 8 80 16 Q96 6 106 24 Q124 24 122 40 Z" fill="#fff" />
            </svg>
            {/* The name, on a banner. */}
            <div className="relative flex justify-center pt-4">
              <button type="button" onClick={() => (sfx("tap"), setTab("name"), void say(shown.name ? ["The", ...shown.name.split(" ")] : [SAY.nameBoat]))} className="flex items-center gap-2 rounded-full bg-white/90 px-5 py-2 font-display text-2xl font-extrabold text-[var(--l-ink)] shadow-[0_4px_0_rgba(0,40,80,0.15)]">
                <Glyph e="🏷️" size={30} />
                {shown.name ? `The ${shown.name}` : "Name your boat"}
              </button>
            </div>
            <div className="relative flex justify-center pb-2">
              <span key={hop} className={cn("block", hop > 0 && !reduced && "bt-hop")} style={{ transformOrigin: "50% 85%" }}>
                <SideBoat look={shown} size={420} sea showTrail petReact={petReact} petTappable still={reduced} />
              </span>
            </div>
          </div>
          {preview ? (
            <PreviewCard item={preview} level={level} shells={shells} onBuy={() => buy(preview)} />
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Chunk tone="green" onClick={() => (sfx("whoosh"), onSail())} className="flex h-16 flex-1 items-center justify-center gap-2 font-display text-2xl font-extrabold">
                <Sailboat className="h-7 w-7" strokeWidth={2.6} /> Sail it!
              </Chunk>
              <Chunk tone="white" onClick={surprise} className="flex h-16 items-center gap-2 px-5 font-display text-xl font-extrabold text-[var(--l-ink)]">
                <Dices className="h-6 w-6" strokeWidth={2.6} /> Surprise me
              </Chunk>
            </div>
          )}
        </div>

        {/* ── The catalog ── */}
        <div className="flex min-w-0 flex-col gap-3">
          <div className="grid grid-cols-5 gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => (sfx("tap"), setTab(t.id), setPreview(null))}
                className={cn("flex flex-col items-center gap-0.5 rounded-[20px] px-1 py-2 font-display text-sm font-extrabold transition-colors", tab === t.id ? "bg-[var(--l-blue)] text-white shadow-[0_5px_0_var(--l-blue-edge)]" : "bg-white text-[var(--l-ink)] shadow-[0_5px_0_var(--l-line)]")}
              >
                <Glyph e={t.icon} size={34} />
                {t.label}
              </button>
            ))}
          </div>

          {tab === "name" ? (
            <NamePanel adj={adj} noun={noun} onAdj={(a) => (setAdj(a), saveName(a, noun))} onNoun={(n) => (setNoun(n), saveName(adj, n))} />
          ) : (
            <div className="flex flex-col gap-3 overflow-y-auto rounded-[28px] bg-white/25 p-3 lg:max-h-[640px]">
              {tab === "boat" && <p className="px-1 font-display text-lg font-bold text-white">Your boat grows as you level up — new boats unlock as you learn!</p>}
              {tab === "sail" && sailless && <p className="px-1 font-display text-lg font-bold text-white">This boat has no sails — it wears your sail colors on its smokestacks!</p>}
              {tab === "deck"
                ? SPOTS.map(({ spot, label }) => (
                    <div key={spot}>
                      <p className="mb-1.5 px-1 font-display text-base font-extrabold uppercase tracking-wide text-white/90">{label}</p>
                      <Grid items={items.filter((i) => i.spot === spot)} look={look} shown={shown} preview={preview} has={has} level={level} shells={shells} onTap={tapItem} />
                    </div>
                  ))
                : <Grid items={items} look={look} shown={shown} preview={preview} has={has} level={level} shells={shells} onTap={tapItem} big={tab === "boat"} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Grid({ items, look, shown, preview, has, level, shells, onTap, big }: { items: ShopItem[]; look: BoatLook; shown: BoatLook; preview: ShopItem | null; has: (i: ShopItem) => boolean; level: number; shells: number; onTap: (i: ShopItem) => void; big?: boolean }) {
  return (
    <div className={cn("grid gap-3", big ? "grid-cols-2" : "grid-cols-3")}>
      {items.map((it) => {
        const mine = has(it);
        const on = isOn(look, it);
        const locked = !mine && (it.level ?? 0) > level;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onTap(it)}
            className={cn(
              "l-tile relative flex flex-col items-center gap-1 rounded-[24px] bg-white p-2.5 shadow-[0_5px_0_var(--l-line)] transition-transform active:translate-y-1",
              preview?.id === it.id && "outline outline-[5px] outline-[var(--l-gold)]",
              on && "outline outline-[5px] outline-[var(--l-green)]",
            )}
          >
            <Swatch it={it} look={shown} locked={locked} big={big} />
            <span className="text-center font-display text-base font-extrabold leading-tight text-[var(--l-ink)]">{it.name}</span>
            {big && it.blurb && <span className="text-center font-display text-sm font-bold leading-snug text-[var(--l-ink-2)]">{it.blurb}</span>}
            <Badge on={on} mine={mine} locked={locked} it={it} shells={shells} />
          </button>
        );
      })}
    </div>
  );
}

function Badge({ on, mine, locked, it, shells }: { on: boolean; mine: boolean; locked: boolean; it: ShopItem; shells: number }) {
  if (on)
    return (
      <span className="flex items-center gap-1 rounded-full bg-[var(--l-green)] px-3 py-0.5 font-display text-sm font-extrabold text-white">
        <Check className="h-4 w-4" strokeWidth={3.5} /> On
      </span>
    );
  if (mine) return <span className="rounded-full bg-[var(--l-card-2)] px-3 py-0.5 font-display text-sm font-extrabold text-[var(--l-ink-2)]">Tap to use</span>;
  if (locked)
    return (
      <span className="flex items-center gap-1 rounded-full bg-[var(--l-card-2)] px-3 py-0.5 font-display text-sm font-extrabold text-[var(--l-ink-2)]">
        <Lock className="h-3.5 w-3.5" /> Level {it.level}
      </span>
    );
  return (
    <span className={cn("flex items-center gap-1 rounded-full px-3 py-0.5 font-display text-sm font-extrabold", shells >= it.price ? "bg-[var(--l-gold)] text-[#5a3b00]" : "bg-[var(--l-card-2)] text-[var(--l-ink-2)]")}>
      <ShellIcon size={16} /> {it.price}
    </span>
  );
}

/** How an item looks in the catalog. */
function Swatch({ it, look, locked, big }: { it: ShopItem; look: BoatLook; locked: boolean; big?: boolean }) {
  const box = (child: ReactNode, bg = "bg-[linear-gradient(180deg,#e6f7ff_0%,#e6f7ff_64%,#bfe8ff_64%)]") => (
    <span className={cn("relative flex items-center justify-center overflow-hidden rounded-[18px]", big ? "h-[150px] w-full" : "h-[96px] w-full", bg, locked && "opacity-70 saturate-[0.6]")}>{child}</span>
  );
  switch (it.slot) {
    case "boat":
      return box(<SideBoat look={{ ...look, boat: it.id }} size={big ? 168 : 100} still bob={false} />);
    case "hull":
    case "paint":
    case "sail":
      return box(<SideBoat look={{ ...look, [it.slot]: it.id, pet: null, trail: null, figure: null, deck: [] }} size={100} still bob={false} />);
    case "flag":
      return box(
        <svg viewBox="2 -6 34 30" width="92" height="80" aria-hidden>
          <path d="M30 -2 L30 26" stroke="#2a2f45" strokeWidth="2.6" />
          <Flag at={[30, -1]} item={it} still />
        </svg>,
        "bg-[var(--l-card-2)]",
      );
    case "figure":
    case "deck": {
      const inner = partInner(it.id);
      if (it.id === "gear-bunting")
        return box(
          <svg viewBox="0 0 40 30" width="90" height="68" aria-hidden>
            <path d="M2 4 Q20 16 38 4" fill="none" stroke="#2a2f45" strokeWidth="1.2" />
            {[6, 12, 18, 24, 30].map((x, i) => (
              <path key={x} d={`M${x - 2.6} ${6 + (i === 0 || i === 4 ? 0 : i === 2 ? 4 : 2.6)} l5.2 0 l-2.6 6 Z`} fill={["#ff5d5d", "#ffd93d", "#4cd964", "#2fb5ff", "#8b6cff"][i]} stroke="#2a2f45" strokeWidth="0.8" />
            ))}
          </svg>,
          "bg-[var(--l-card-2)]",
        );
      return box(inner ? <svg viewBox="0 0 40 40" width="84" height="84" aria-hidden dangerouslySetInnerHTML={{ __html: inner }} /> : <span className="font-display text-sm text-[var(--l-ink-2)]">soon</span>, "bg-[var(--l-card-2)]");
    }
    case "pet":
      return box(<Pet id={it.id} size={92} still />, "bg-[radial-gradient(circle_at_50%_70%,#fff6dc,#ffe6b0)]");
    case "trail":
      return box(<GlyphRow s={`${it.emoji ?? "✨"}${it.emoji ?? "✨"}${it.emoji ?? "✨"}`} size={30} />, "bg-[linear-gradient(90deg,#bfe8ff,#e6f7ff)]");
  }
}

function PreviewCard({ item, level, shells, onBuy }: { item: ShopItem; level: number; shells: number; onBuy: () => void }) {
  const locked = (item.level ?? 0) > level;
  return (
    <div className="l-pop-in flex items-center gap-4 rounded-[28px] bg-white p-4 shadow-[0_8px_0_var(--l-line)]">
      <div className="min-w-0 flex-1">
        <p className="font-display text-2xl font-extrabold text-[var(--l-ink)]">{item.name}</p>
        <p className="font-display text-base font-bold text-[var(--l-ink-2)]">
          {locked ? `Unlocks at level ${item.level} — keep learning!` : shells < item.price ? `${item.price - shells} more shells — keep learning!` : item.blurb ?? "Trying it on! Like it?"}
        </p>
      </div>
      <BuyButton price={item.price} can={shells >= item.price} locked={locked ? item.level : undefined} onBuy={onBuy} className="h-16 min-w-[180px] px-5 text-xl" />
    </div>
  );
}

function NamePanel({ adj, noun, onAdj, onNoun }: { adj: string; noun: string; onAdj: (a: string) => void; onNoun: (n: string) => void }) {
  const chip = (w: string, on: boolean, fn: () => void) => (
    <button key={w} type="button" onClick={fn} className={cn("rounded-full px-4 py-2 font-display text-lg font-extrabold transition-transform active:translate-y-0.5", on ? "bg-[var(--l-violet)] text-white shadow-[0_4px_0_var(--l-violet-edge)]" : "bg-white text-[var(--l-ink)] shadow-[0_4px_0_var(--l-line)]")}>
      {w}
    </button>
  );
  return (
    <div className="flex flex-col gap-4 rounded-[28px] bg-white/25 p-4">
      <div className="flex items-center justify-center gap-3 rounded-[24px] bg-white px-5 py-4 shadow-[0_6px_0_var(--l-line)]">
        <span className="font-display text-3xl font-extrabold text-[var(--l-ink)]">The {adj} {noun}</span>
        <button type="button" aria-label="Hear the name" onClick={() => void say(["The", adj, noun])} className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--l-blue)] text-white shadow-[0_4px_0_var(--l-blue-edge)]">
          <Volume2 className="h-6 w-6" />
        </button>
      </div>
      <div>
        <p className="mb-2 font-display text-base font-extrabold uppercase tracking-wide text-white">Pick a word</p>
        <div className="flex flex-wrap gap-2">{NAME_ADJ.map((w) => chip(w, w === adj, () => (sfx("pick"), onAdj(w))))}</div>
      </div>
      <div>
        <p className="mb-2 font-display text-base font-extrabold uppercase tracking-wide text-white">And another</p>
        <div className="flex flex-wrap gap-2">{NAME_NOUN.map((w) => chip(w, w === noun, () => (sfx("pick"), onNoun(w))))}</div>
      </div>
    </div>
  );
}
