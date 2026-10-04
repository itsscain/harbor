"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, Check, Lock, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Hatch, KidLearn } from "@/lib/learn/progress";
import { CREATURES, CREATURE_BY_ID, CREATURE_RARITY_COLOR, EGG_LOOK, EGG_ODDS, growth, hatchCreature, type Creature, type CreatureRarity, type Egg, type EggTier } from "@/lib/learn/reef";
import {
  DECOR, EGG_SHOP, FOODS, FOOD_ORDER, MEALS_PER_DAY, ROLL_ODDS, ROLL_PITY, ROLL_PRICE, TANKS, TANK_BY_ID,
  aquariumOf, foodGrowth, purchaseId, rollTier, type Decor, type Fed, type FoodKind, type Tank,
} from "@/lib/learn/aquarium";
import { SAY } from "@/lib/learn/script";
import { say } from "@/lib/learn/audio";
import { sfx, buzz } from "@/lib/learn/sfx";
import { Confetti } from "../Confetti";
import { BurstLayer, Chunk, SpeakerButton, useBursts } from "./kit";

// My Aquarium: the living tank a child builds with the shells they earn by learning. Creatures
// hatched from eggs swim back and forth (turning to face the way they go); tap one to meet it, or
// pick up a food and tap a friend to feed it — it stops, the food drifts down, chomp chomp, hearts
// — and it grows up faster. A friend who hasn't had a treat today just looks up hopefully (no
// guilt, ever: nobody gets sick or sad). The panel beside the tank is the shop: food packs, the
// nest + Egg Shop + Mystery Egg machine (odds printed on it), decorations and tank themes (try
// them on in the real tank before buying), and the Fish Book. Every purchase takes two taps —
// "tap again to buy" — so a child tapping fast can't spend shells by accident.

export type AquaPanel = "food" | "eggs" | "decor" | "tanks" | "book";

const YUM: Record<FoodKind, string> = { flakes: SAY.aqYumFlakes, shrimp: SAY.aqYumShrimp, golden: SAY.aqYumGolden };
const EGG_TINT: Record<EggTier, string | undefined> = { sea: undefined, rare: "hue-rotate(110deg) saturate(2)", golden: "sepia(1) saturate(4) hue-rotate(5deg)" };
const RARITIES: CreatureRarity[] = ["common", "rare", "epic", "legendary"];
const PANELS: { id: AquaPanel; label: string; emoji: string; say: string }[] = [
  { id: "food", label: "Food", emoji: "🥫", say: SAY.aqFood },
  { id: "eggs", label: "Eggs", emoji: "🥚", say: SAY.aqEggs },
  { id: "decor", label: "Decor", emoji: "🏰", say: SAY.aqDecor },
  { id: "tanks", label: "Tanks", emoji: "🌊", say: SAY.aqTanks },
  { id: "book", label: "Book", emoji: "📖", say: SAY.aqBook },
];
// The tank and the panel beside it share one height (written out in full so Tailwind sees both).
const TANK_H = "h-[min(64dvh,560px)]";
const PANEL_H = "lg:h-[min(64dvh,560px)]";

/** A new id for something bought (only ever called from a tap). */
const freshId = () => purchaseId(Math.random());

type Drop = { id: string; x: number; y: number; e: string; dx: number; delay: number };
type Float = { id: number; x: number; y: number; text: string };

export function Aquarium({
  kid,
  eggs,
  childId,
  reduced,
  accent,
  autoHatch,
  onBack,
  onSpend,
  onFeed,
  onTank,
  onDecor,
  onHatch,
  onBuddy,
}: {
  kid: KidLearn;
  /** The nest: eggs earned or bought that haven't hatched yet. */
  eggs: Egg[];
  childId: string;
  reduced: boolean;
  accent: string;
  /** Open straight into hatching this egg (from a level's finish screen). */
  autoHatch?: string;
  onBack: () => void;
  /** Shells spent on "food:<kind>:<id>", "egg:<tier>:<id>", "roll:<n>:<id>", "decor:<id>" or "tank:<id>". */
  onSpend: (item: string, price: number) => void;
  onFeed: (food: FoodKind, egg: string) => void;
  onTank: (id: string) => void;
  onDecor: (id: string, on: boolean) => void;
  onHatch: (egg: Egg, creature: Creature) => void;
  onBuddy: (id: string) => void;
}) {
  const aq = useMemo(() => aquariumOf(kid.owned, kid.fed, kid.tank), [kid.owned, kid.fed, kid.tank]);
  const [panel, setPanel] = useState<AquaPanel>(() => (eggs.length || !kid.hatched.length ? "eggs" : "food"));
  const [holding, setHolding] = useState<FoodKind | null>(null);
  const [eating, setEating] = useState<string[]>([]);
  const [drops, setDrops] = useState<Drop[]>([]);
  const [floats, setFloats] = useState<Float[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [hatching, setHatching] = useState<Egg | null>(() => (autoHatch ? (eggs.find((e) => e.id === autoHatch) ?? eggs[0] ?? null) : null));
  const [preview, setPreview] = useState<{ kind: "decor" | "tank"; id: string } | null>(null);
  const [rolling, setRolling] = useState<{ id: string; tier: EggTier; done: boolean } | null>(null);
  const [party, setParty] = useState(0);
  const tankRef = useRef<HTMLDivElement>(null);
  const warned = useRef<string | null>(null);
  const fx = useRef(0);
  const { bursts, fire } = useBursts();

  const greet = !autoHatch;
  useEffect(() => {
    if (!greet) return;
    const t = window.setTimeout(() => void say(SAY.aquarium), 300);
    return () => window.clearTimeout(t);
  }, [greet]);

  const owned = kid.hatched.map((h) => h.creature);
  const buddyId = kid.buddy ?? kid.hatched[0]?.creature ?? null;
  const anyFood = FOOD_ORDER.some((k) => aq.food[k] > 0);
  const tank = (preview?.kind === "tank" ? TANK_BY_ID.get(preview.id) : undefined) ?? aq.tank;
  const previewDecor = preview?.kind === "decor" ? (DECOR.find((d) => d.id === preview.id) ?? null) : null;
  const shown = aq.decor.filter((d) => !kid.decorOff.has(d.id));
  const placed = decorLayout(previewDecor && !shown.some((d) => d.id === previewDecor.id) ? [...shown, previewDecor] : shown);
  const n = kid.hatched.length;
  const crowd = n > 10 ? Math.max(0.62, 1 - (n - 10) * 0.025) : 1;
  // Stable swim lanes: spread over the water by the golden ratio (any count stays evenly mixed),
  // each creature with its own pace.
  const swimmers = useMemo(
    () =>
      kid.hatched.map((h, i) => {
        const k = (i * 7919) % 97;
        return { h, top: Math.round(8 + ((i * 0.618 + 0.25) % 1) * 54), dur: 15 + (k % 11), delay: -((k * 1.7) % 20), x0: 2 + (k % 10), x1: 70 + (k % 14) };
      }),
    [kid.hatched],
  );

  // ── Actions ────────────────────────────────────────────────────────────────────────────
  const spend = (item: string, price: number) => {
    if (kid.shells < price) {
      sfx("wrong");
      void say(SAY.notEnough);
      return false;
    }
    sfx("buy");
    buzz([0, 20, 40, 20]);
    onSpend(item, price);
    return true;
  };

  const pop = (x: number, y: number, text: string) => {
    const id = ++fx.current;
    setFloats((f) => [...f, { id, x, y, text }]);
    window.setTimeout(() => setFloats((f) => f.filter((v) => v.id !== id)), 1500);
  };

  /** Feed one friend: from the tank (food drifts down to it) or from its card. */
  const feed = (h: Hatch, kind: FoodKind, el: HTMLElement | null, inTank: boolean) => {
    if (eating.includes(h.egg)) {
      // Mashing doesn't feed faster — and the voice says so once, not on every tap.
      if (warned.current !== h.egg) {
        warned.current = h.egg;
        void say(SAY.aqOneBite);
      }
      return;
    }
    const fed = kid.fed[h.egg];
    const t = tankRef.current?.getBoundingClientRect();
    const r = el?.getBoundingClientRect();
    const at = t && r ? { x: r.left - t.left + r.width / 2, y: r.top - t.top + r.height / 2 } : null;
    if ((fed?.today ?? 0) >= MEALS_PER_DAY) {
      sfx("soft-fail");
      void say(SAY.aqFull);
      if (inTank && at) pop(at.x, at.y - 34, "😊 Full!");
      return;
    }
    if (aq.food[kind] <= 0) {
      sfx("wrong");
      void say(SAY.aqNoFood);
      setHolding(null);
      setPanel("food");
      return;
    }
    const bonus = foodGrowth(fed);
    const grew = growth(kid.xp, h, bonus + FOODS[kind].grow).index > growth(kid.xp, h, bonus).index;
    onFeed(kind, h.egg);
    if (aq.food[kind] <= 1) setHolding(null);
    setEating((e) => [...e, h.egg]);
    window.setTimeout(() => {
      setEating((e) => e.filter((x) => x !== h.egg));
      if (warned.current === h.egg) warned.current = null;
    }, 1500);
    sfx("pop");
    buzz(15);
    const drift = inTank && !!at && !reduced;
    if (drift && at) {
      const k = ++fx.current;
      const bits = [-18, -6, 6, 18].map((dx, i) => ({ id: `${k}-${i}`, x: at.x + dx, y: at.y - 6, e: FOODS[kind].emoji, dx: dx * 0.6, delay: i * 70 }));
      setDrops((d) => [...d, ...bits]);
      window.setTimeout(() => setDrops((d) => d.filter((b) => !b.id.startsWith(`${k}-`))), 1300);
    }
    window.setTimeout(
      () => {
        if (r) fire(r.left + r.width / 2, r.top + r.height / 2, "heart", 10);
        sfx("coin");
        if (inTank && at) pop(at.x, at.y - 44, `+${FOODS[kind].grow} 🌱`);
      },
      drift ? 650 : 150,
    );
    if (grew)
      window.setTimeout(() => {
        sfx("levelup");
        setParty((p) => p + 1);
        void say(SAY.aqGrew);
      }, 900);
    else void say(YUM[kind]);
  };

  const tapCreature = (h: Hatch, el: HTMLElement) => {
    if (holding) return feed(h, holding, el, true);
    sfx("splash");
    const cr = CREATURE_BY_ID.get(h.creature);
    if (cr) void say([cr.name]);
    setOpen(h.egg);
  };

  const hold = (k: FoodKind) => {
    if (holding === k) {
      sfx("tap");
      setHolding(null);
      return;
    }
    if (!kid.hatched.length) {
      sfx("soft-fail");
      void say(SAY.aqNoFriends);
      return;
    }
    if (aq.food[k] <= 0) {
      sfx("wrong");
      void say(SAY.aqNoFood);
      return;
    }
    sfx("pick");
    setHolding(k);
    setPreview(null);
    void say([FOODS[k].name, "~", SAY.aqTapFriend]);
  };

  const buyFood = (k: FoodKind) => {
    if (!spend(`food:${k}:${freshId()}`, FOODS[k].price)) return;
    if (kid.hatched.length) {
      setHolding(k);
      void say([SAY.bought, "~", SAY.aqTapFriend]);
    } else void say(SAY.bought);
  };

  const buyEgg = (tier: EggTier, price: number) => {
    if (spend(`egg:${tier}:${freshId()}`, price)) void say(SAY.aqNewEgg);
  };

  const roll = () => {
    if (rolling && !rolling.done) return;
    const id = `roll:${aq.rolls + 1}:${freshId()}`;
    if (!spend(id, ROLL_PRICE)) return;
    const tier = rollTier(id);
    setRolling({ id, tier, done: false });
    window.setTimeout(
      () => {
        setRolling((r) => (r?.id === id ? { ...r, done: true } : r));
        sfx(tier === "golden" ? "legendary" : tier === "rare" ? "sticker" : "pop");
        void say(tier === "golden" ? SAY.aqRollGolden : tier === "rare" ? SAY.aqRollRare : SAY.aqRollSea);
      },
      reduced ? 300 : 1300,
    );
  };

  const tapDecor = (d: Decor) => {
    if (aq.decor.some((x) => x.id === d.id)) {
      const putBack = kid.decorOff.has(d.id);
      sfx(putBack ? "pop" : "tap");
      onDecor(d.id, putBack);
      void say(putBack ? [d.name, "~", SAY.aqInTank] : [d.name, "~", SAY.aqPutAway]);
      setPreview(null);
      return;
    }
    sfx("pick");
    setHolding(null);
    setPreview({ kind: "decor", id: d.id });
    void say([d.name]);
  };

  const tapTank = (tk: Tank) => {
    void say([tk.name]);
    if (aq.tanks.has(tk.id)) {
      if (aq.tank.id !== tk.id) {
        sfx("whoosh");
        onTank(tk.id);
      } else sfx("tap");
      setPreview(null);
      return;
    }
    sfx("pick");
    setHolding(null);
    setPreview({ kind: "tank", id: tk.id });
  };

  const buyPreview = () => {
    if (!preview) return;
    if (preview.kind === "decor") {
      const d = DECOR.find((x) => x.id === preview.id);
      if (d && spend(`decor:${d.id}`, d.price)) {
        void say(SAY.aqInTank);
        setPreview(null);
      }
      return;
    }
    const tk = TANK_BY_ID.get(preview.id);
    if (tk && spend(`tank:${tk.id}`, tk.price)) {
      onTank(tk.id);
      setPreview(null);
      window.setTimeout(() => sfx("levelup"), 250);
      void say(SAY.aqNewTank);
    }
  };

  const go = (p: AquaPanel) => {
    sfx("tap");
    setPanel(p);
    setPreview(null);
    if (p !== "food") setHolding(null);
    void say(PANELS.find((x) => x.id === p)!.say);
  };

  const openHatch = open ? (kid.hatched.find((h) => h.egg === open) ?? null) : null;
  const previewItem = preview ? (preview.kind === "decor" ? previewDecor : (TANK_BY_ID.get(preview.id) ?? null)) : null;
  const won = rolling?.done ? (eggs.find((e) => e.id === rolling.id) ?? null) : null;
  // A rolled egg stays a secret until the capsule drops.
  const nest = rolling && !rolling.done ? eggs.filter((e) => e.id !== rolling.id) : eggs;

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-4 pb-10 pt-2 sm:px-6">
      <div className="flex items-center gap-3">
        <Chunk tone="white" onClick={() => (sfx("tap"), onBack())} aria-label="Back" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full" style={{ borderRadius: 999 }}>
          <ArrowLeft className="h-7 w-7 text-[var(--l-ink)]" strokeWidth={3} />
        </Chunk>
        <p className="flex-1 font-display text-3xl font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.25)]">🐠 My Aquarium</p>
        <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 font-display text-2xl font-extrabold text-[var(--l-ink)] shadow-[0_5px_0_var(--l-line)]" aria-label={`${kid.shells} shells`}>
          🐚 <span className="tabular-nums">{kid.shells}</span>
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        {/* ── The tank ── */}
        {/* overflow "clip" (not a scroll box), so tapping a swimmer at the edge can't scroll the
            water sideways; older browsers fall back to hidden, and any scroll is undone. */}
        <div
          ref={tankRef}
          className={cn("relative w-full overflow-hidden rounded-[34px] shadow-[0_10px_0_rgba(0,40,80,0.2)]", TANK_H)}
          style={{ background: tank.water, containerType: "inline-size", overflow: "clip" } as CSSProperties}
          onScroll={(e) => {
            e.currentTarget.scrollLeft = 0;
            e.currentTarget.scrollTop = 0;
          }}
        >
          {!reduced && !tank.glow && <div className="reef-rays pointer-events-none absolute inset-0" aria-hidden />}
          {tank.glow && <Motes reduced={reduced} />}
          {!reduced && <Bubbles />}

          {/* Back decorations stand behind the sand line; floats hang in the water. */}
          {placed
            .filter((p) => p.d.spot === "back")
            .map((p) => (
              <DecorPiece key={p.d.id} p={p} trying={previewDecor?.id === p.d.id} reduced={reduced} />
            ))}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[16%]"
            style={{ background: `linear-gradient(180deg, ${tank.sand[0]}, ${tank.sand[1]})`, clipPath: "polygon(0 22%, 10% 10%, 22% 18%, 35% 6%, 50% 15%, 64% 4%, 78% 14%, 90% 7%, 100% 16%, 100% 100%, 0 100%)" }}
          />
          {[3, 97].map((x, i) => (
            <span key={x} className="pointer-events-none absolute bottom-[3%] -translate-x-1/2 text-[64px] leading-none" style={{ left: `${x}%` }} aria-hidden>
              <span className={cn("block", !reduced && "l-sway")} style={{ animationDelay: `${i * 0.7}s` }}>
                🌿
              </span>
            </span>
          ))}
          {placed
            .filter((p) => p.d.spot !== "back")
            .map((p) => (
              <DecorPiece key={p.d.id} p={p} trying={previewDecor?.id === p.d.id} reduced={reduced} />
            ))}

          {swimmers.length === 0 && (
            <div className="absolute inset-0 z-[3] flex flex-col items-center justify-center gap-3 px-6 text-center">
              <span className={cn("text-[96px] leading-none", !reduced && "l-bob")}>🥚</span>
              <p className="max-w-[520px] font-display text-3xl font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,30,60,0.35)]">Your aquarium is waiting!</p>
              <p className="max-w-[560px] font-display text-xl font-bold text-white/90 drop-shadow-[0_1px_0_rgba(0,30,60,0.35)]">
                {nest.length ? "Tap an egg in your nest to hatch your first friend!" : "Learn to earn eggs, or buy one with shells. Each egg hatches a new friend."}
              </p>
            </div>
          )}

          {swimmers.map(({ h, top, dur, delay, x0, x1 }) => {
            const cr = CREATURE_BY_ID.get(h.creature);
            if (!cr) return null;
            const fed = kid.fed[h.egg];
            const g = growth(kid.xp, h, foodGrowth(fed));
            const meals = fed?.today ?? 0;
            const chomp = eating.includes(h.egg);
            const still: CSSProperties = chomp ? { animationPlayState: "paused" } : {};
            const glow = holding && meals < MEALS_PER_DAY ? "drop-shadow(0 0 10px #ffe27a)" : "";
            const style = { top: `${top}%`, "--x0": x0, "--x1": x1, "--dur": `${dur}s`, animationDelay: `${delay}s`, ...still } as CSSProperties;
            return (
              <button
                key={h.egg}
                type="button"
                onClick={(e) => tapCreature(h, e.currentTarget)}
                className={cn("absolute left-0 z-[4]", reduced ? "" : "reef-swim")}
                style={reduced ? { top: `${top}%`, left: `${x0 + ((x1 - x0) * (h.egg.length % 7)) / 7}%` } : style}
                aria-label={holding ? `Feed ${cr.name}` : `${cr.name} the ${cr.kind}`}
              >
                <span className={cn("relative block", !reduced && "reef-face")} style={{ animationDelay: `${delay}s`, "--dur": `${dur}s`, ...still } as CSSProperties}>
                  <span
                    className={cn("block select-none leading-none drop-shadow-[0_6px_6px_rgba(0,30,60,0.25)]", chomp ? "l-chomp" : !reduced && "l-bob")}
                    style={{ fontSize: Math.round(76 * g.stage.scale * crowd), filter: [cr.tint, glow].filter(Boolean).join(" ") || undefined }}
                  >
                    {cr.emoji}
                  </span>
                </span>
                {g.royal && <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl">👑</span>}
                {buddyId === h.creature && <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--l-gold)] px-2 font-display text-xs font-extrabold text-[#5a3b00]">⭐ Buddy</span>}
                {anyFood && meals === 0 && !chomp && (
                  <span className={cn("absolute -right-3 -top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-xl shadow-[0_2px_0_rgba(0,40,80,0.15)]", !reduced && "l-bob")} aria-hidden>
                    😋
                  </span>
                )}
              </button>
            );
          })}

          {drops.map((b) => (
            <span key={b.id} className="aq-drop pointer-events-none absolute z-[5] -ml-3 -mt-3 text-2xl leading-none" style={{ left: b.x, top: b.y, "--from": `${-b.y - 30}px`, "--dx": `${b.dx}px`, animationDelay: `${b.delay}ms` } as CSSProperties} aria-hidden>
              {b.e}
            </span>
          ))}
          {floats.map((f) => (
            <span key={f.id} className="aq-float pointer-events-none absolute z-[6] whitespace-nowrap rounded-full bg-white/92 px-3 py-1 font-display text-lg font-extrabold text-[var(--l-green-edge)] shadow-[0_3px_0_rgba(0,40,80,0.15)]" style={{ left: f.x, top: f.y }} aria-hidden>
              {f.text}
            </span>
          ))}

          {/* The nest: eggs waiting to hatch, right in the tank. */}
          {nest.length > 0 && (
            <div className="absolute left-3 top-3 z-[6] flex items-center gap-2 rounded-[22px] bg-white/85 px-2.5 py-2 shadow-[0_4px_0_rgba(0,40,80,0.15)]">
              {nest.slice(0, 4).map((e, i) => (
                <EggButton key={e.id} egg={e} size={56} reduced={reduced} delay={i * 0.25} onTap={() => (sfx("pick"), setHatching(e), void say(SAY.hatchIt))} />
              ))}
              {nest.length > 4 && <span className="px-1 font-display text-lg font-extrabold text-[var(--l-ink)]">+{nest.length - 4}</span>}
            </div>
          )}

          {holding && (
            <div className="l-pop-in absolute right-3 top-3 z-[6] flex items-center gap-2 rounded-full bg-[var(--l-gold)] py-1.5 pl-3 pr-1.5 font-display text-lg font-extrabold text-[#5a3b00] shadow-[0_4px_0_var(--l-gold-edge)]">
              <span className="text-2xl leading-none">{FOODS[holding].emoji}</span>
              Tap a friend!
              <span className="rounded-full bg-white/70 px-2 text-base tabular-nums">×{aq.food[holding]}</span>
              <button type="button" onClick={() => (sfx("tap"), setHolding(null))} aria-label="Put the food down" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/85">
                <X className="h-5 w-5" strokeWidth={3} />
              </button>
            </div>
          )}

          {preview && previewItem && (
            <div className="l-pop-in absolute bottom-3 left-1/2 z-[6] -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-4 py-1.5 font-display text-base font-extrabold text-[var(--l-ink)] shadow-[0_4px_0_rgba(0,40,80,0.15)]">
              ✨ Trying on: {previewItem.name}
            </div>
          )}
        </div>

        {/* ── The panel ── */}
        <div className={cn("flex min-h-0 flex-col gap-3 rounded-[30px] bg-white/92 p-3 shadow-[0_7px_0_rgba(0,50,90,0.18)]", PANEL_H)}>
          <div className="grid grid-cols-5 gap-1.5">
            {PANELS.map((p) => (
              <Chunk key={p.id} tone={panel === p.id ? "violet" : "white"} onClick={() => go(p.id)} className="relative flex flex-col items-center gap-0.5 px-1 py-2" aria-label={p.label}>
                {p.id === "eggs" && nest.length > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--l-coral)] px-1.5 font-display text-sm font-extrabold text-white shadow-[0_2px_0_var(--l-coral-edge)]">{nest.length}</span>
                )}
                <span className="text-[28px] leading-none">{p.emoji}</span>
                <span className={cn("font-display text-xs font-extrabold", panel === p.id ? "text-white" : "text-[var(--l-ink)]")}>{p.label}</span>
              </Chunk>
            ))}
          </div>

          <div key={panel} className="min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
            {panel === "food" && (
              <div className="flex flex-col gap-2.5">
                <PanelTitle text="Feed your friends" parts={[SAY.aqFood]} />
                {FOOD_ORDER.map((k) => {
                  const f = FOODS[k];
                  const on = holding === k;
                  return (
                    <div key={k} className={cn("flex items-center gap-3 rounded-[22px] bg-[var(--l-card-2)] p-2.5", on && "ring-[4px] ring-[var(--l-gold)]")}>
                      <Chunk
                        tone={on ? "gold" : "white"}
                        onClick={() => hold(k)}
                        aria-label={`Feed ${f.name}`}
                        className={cn("relative flex h-[76px] w-[76px] shrink-0 items-center justify-center text-[42px]", on && !reduced && "l-pulse", aq.food[k] === 0 && "opacity-60")}
                      >
                        {f.emoji}
                        <span className="absolute -bottom-1.5 -right-1.5 rounded-full bg-[var(--l-violet)] px-2 font-display text-sm font-extrabold tabular-nums text-white shadow-[0_2px_0_var(--l-violet-edge)]">×{aq.food[k]}</span>
                      </Chunk>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-lg font-extrabold leading-tight text-[var(--l-ink)]">{f.name}</p>
                        <p className="font-display text-sm font-bold text-[var(--l-ink-2)]">+{f.grow} 🌱 growth each</p>
                        <BuyButton price={f.price} label={`+${f.pack}`} can={kid.shells >= f.price} onBuy={() => buyFood(k)} className="mt-1.5 h-10 px-3 text-base" />
                      </div>
                    </div>
                  );
                })}
                <p className="px-1 font-display text-sm font-bold leading-snug text-[var(--l-ink-2)]">
                  Tap a food, then tap a friend. Each friend can have {MEALS_PER_DAY} treats a day — treats help them grow up faster!
                </p>
              </div>
            )}

            {panel === "eggs" && (
              <div className="flex flex-col gap-3">
                <section className="rounded-[22px] bg-[var(--l-card-2)] p-3">
                  <p className="font-display text-lg font-extrabold text-[var(--l-ink)]">🥚 Your nest{nest.length ? ` · ${nest.length}` : ""}</p>
                  {nest.length ? (
                    <div className="mt-2 flex flex-wrap gap-2.5">
                      {nest.slice(0, 12).map((e, i) => (
                        <EggButton key={e.id} egg={e} size={60} reduced={reduced} delay={i * 0.2} onTap={() => (sfx("pick"), setHatching(e), void say(SAY.hatchIt))} />
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 font-display text-sm font-bold text-[var(--l-ink-2)]">No eggs right now. Finish an island, learn a verse — or get one below!</p>
                  )}
                </section>
                <EggMachine rolling={rolling} rolls={aq.rolls} shells={kid.shells} reduced={reduced} won={won} onRoll={roll} onHatch={(e) => (sfx("pick"), setHatching(e))} />
                <section className="flex flex-col gap-2">
                  <PanelTitle text="Egg Shop" parts={[SAY.aqEggs]} />
                  {EGG_SHOP.map((s) => (
                    <div key={s.tier} className="flex items-center gap-3 rounded-[22px] bg-[var(--l-card-2)] p-2.5">
                      <button
                        type="button"
                        onClick={() => (sfx("tap"), void say([EGG_LOOK[s.tier].name]))}
                        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-[40px]"
                        style={{ boxShadow: `0 0 0 4px ${EGG_LOOK[s.tier].color}` }}
                        aria-label={EGG_LOOK[s.tier].name}
                      >
                        <span style={{ filter: EGG_TINT[s.tier] }}>🥚</span>
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-lg font-extrabold leading-tight text-[var(--l-ink)]">{EGG_LOOK[s.tier].name}</p>
                        <OddsBar tier={s.tier} />
                        <BuyButton price={s.price} can={kid.shells >= s.price} onBuy={() => buyEgg(s.tier, s.price)} className="mt-1.5 h-10 px-3 text-base" />
                      </div>
                    </div>
                  ))}
                </section>
              </div>
            )}

            {panel === "decor" && (
              <div className="flex flex-col gap-2.5">
                <PanelTitle text="Decorate" parts={[SAY.aqDecor]} />
                <div className="grid grid-cols-3 gap-2">
                  {DECOR.map((d) => {
                    const have = aq.decor.some((x) => x.id === d.id);
                    const off = kid.decorOff.has(d.id);
                    const locked = !have && (d.level ?? 0) > kid.level;
                    return (
                      <Chunk
                        key={d.id}
                        tone="white"
                        onClick={() => tapDecor(d)}
                        className={cn("relative flex flex-col items-center gap-1 px-1 py-2", preview?.id === d.id && "outline-4 outline-[var(--l-gold)]", have && !off && "outline-4 outline-[var(--l-green)]")}
                        aria-label={d.name}
                      >
                        <span className="text-[34px] leading-none" style={locked ? { filter: "grayscale(1) opacity(0.5)" } : undefined}>
                          {d.emoji}
                        </span>
                        <span className="line-clamp-1 text-center font-display text-xs font-extrabold text-[var(--l-ink)]">{d.name}</span>
                        <ItemStatus have={have} on={have && !off} locked={locked ? (d.level ?? 0) : 0} price={d.price} shells={kid.shells} onWord="In tank" offWord="Put away" />
                      </Chunk>
                    );
                  })}
                </div>
                <p className="px-1 font-display text-sm font-bold leading-snug text-[var(--l-ink-2)]">Tap one to try it in your tank. Tap one you own to put it away or bring it back.</p>
              </div>
            )}

            {panel === "tanks" && (
              <div className="flex flex-col gap-2.5">
                <PanelTitle text="Tanks" parts={[SAY.aqTanks]} />
                {TANKS.map((tk) => {
                  const have = aq.tanks.has(tk.id);
                  const inUse = aq.tank.id === tk.id;
                  const locked = !have && (tk.level ?? 0) > kid.level;
                  return (
                    <Chunk
                      key={tk.id}
                      tone="white"
                      onClick={() => tapTank(tk)}
                      className={cn("flex items-center gap-3 p-2.5 text-left", preview?.id === tk.id && "outline-4 outline-[var(--l-gold)]", inUse && "outline-4 outline-[var(--l-green)]")}
                      aria-label={tk.name}
                    >
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[16px] text-[26px]" style={{ background: tk.water, filter: locked ? "grayscale(0.8)" : undefined }}>
                        {tk.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-lg font-extrabold leading-tight text-[var(--l-ink)]">{tk.name}</span>
                        <span className="mt-1 inline-block">
                          <ItemStatus have={have} on={inUse} locked={locked ? (tk.level ?? 0) : 0} price={tk.price} shells={kid.shells} onWord="In use" offWord="Tap to use" />
                        </span>
                      </span>
                    </Chunk>
                  );
                })}
              </div>
            )}

            {panel === "book" && (
              <FishBook
                have={new Set(owned)}
                onOpen={(id) => {
                  const h = kid.hatched.find((x) => x.creature === id);
                  if (!h) return;
                  sfx("splash");
                  void say([CREATURE_BY_ID.get(id)?.name ?? ""]);
                  setOpen(h.egg);
                }}
              />
            )}
          </div>

          {previewItem && (
            <div className="l-rise flex items-center gap-3 rounded-[22px] bg-[#fff6dc] p-2.5 shadow-[0_4px_0_rgba(0,40,80,0.12)]">
              <span className="text-[38px] leading-none">{previewItem.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg font-extrabold text-[var(--l-ink)]">{previewItem.name}</p>
                <BuyButton price={previewItem.price} can={kid.shells >= previewItem.price} locked={(previewItem.level ?? 0) > kid.level ? previewItem.level : undefined} onBuy={buyPreview} className="mt-1 h-11 w-full text-lg" />
              </div>
              <button type="button" onClick={() => (sfx("tap"), setPreview(null))} aria-label="Stop trying it on" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[var(--l-ink)]">
                <X className="h-5 w-5" strokeWidth={3} />
              </button>
            </div>
          )}
        </div>
      </div>

      {openHatch && (
        <CreatureCard
          h={openHatch}
          xp={kid.xp}
          fed={kid.fed[openHatch.egg]}
          food={aq.food}
          buddy={buddyId === openHatch.creature}
          eating={eating.includes(openHatch.egg)}
          onFeed={(k, el) => feed(openHatch, k, el, false)}
          onBuddy={() => {
            onBuddy(openHatch.creature);
            sfx("star");
            void say(SAY.aqBuddy);
          }}
          onClose={() => setOpen(null)}
        />
      )}
      {hatching && <HatchOverlay egg={hatching} seed={`${childId}:${hatching.id}`} owned={owned} accent={accent} reduced={reduced} onHatched={(cr) => onHatch(hatching, cr)} onClose={() => setHatching(null)} />}
      {party > 0 && !reduced && (
        <div key={party} className="pointer-events-none fixed left-1/2 top-1/3 z-[80] h-0 w-0">
          <Confetti count={60} spread={420} accent={accent} />
        </div>
      )}
      <BurstLayer bursts={bursts} />
    </div>
  );
}

// ── Tank pieces ────────────────────────────────────────────────────────────────────────────

type Placed = { d: Decor; left: number; bottom?: number; top?: number; size: number };

/** Where each decoration sits: big pieces stand at the back, small ones on the sand, and floaty
 *  ones hang in the water — spread evenly, so any mix looks arranged. */
function decorLayout(list: Decor[]): Placed[] {
  const at = (i: number, n: number, a: number, b: number) => a + ((b - a) * (i + 0.5)) / n;
  const back = list.filter((d) => d.spot === "back");
  const floor = list.filter((d) => d.spot === "floor");
  const float = list.filter((d) => d.spot === "float");
  return [
    ...back.map((d, i) => ({ d, left: at(i, back.length, 10, 90), bottom: 9, size: 92 })),
    ...floor.map((d, i) => ({ d, left: at(i, floor.length, 11, 89), bottom: 2 + (i % 2) * 3.5, size: 52 })),
    ...float.map((d, i) => ({ d, left: at(i, float.length, 12, 88), top: 5 + (i % 2) * 9, size: 46 })),
  ];
}

function DecorPiece({ p, trying, reduced }: { p: Placed; trying: boolean; reduced: boolean }) {
  return (
    <button
      type="button"
      onClick={() => (sfx("pop"), void say([p.d.name]))}
      className={cn("absolute -translate-x-1/2 leading-none", p.d.spot === "back" ? "z-[1]" : "z-[2]")}
      style={{ left: `${p.left}%`, bottom: p.bottom !== undefined ? `${p.bottom}%` : undefined, top: p.top !== undefined ? `${p.top}%` : undefined, fontSize: p.size }}
      aria-label={p.d.name}
    >
      <span
        className={cn("block drop-shadow-[0_4px_4px_rgba(0,30,60,0.25)]", !reduced && (trying ? "l-pulse" : p.d.spot === "float" ? "l-bob" : p.d.id === "grass" || p.d.id === "flower" ? "l-sway" : ""), trying && "rounded-2xl outline-dashed outline-[3px] outline-offset-4 outline-white/90")}
        style={{ animationDelay: `${(p.left % 7) * 0.3}s` }}
      >
        {p.d.emoji}
      </span>
    </button>
  );
}

function Bubbles() {
  const list = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ x: (i * 53) % 96, s: 6 + (i % 4) * 4, d: 7 + (i % 5) * 2, delay: -(i * 1.3) })), []);
  return (
    <div className="pointer-events-none absolute inset-0 z-[3]" aria-hidden>
      {list.map((b, i) => (
        <span key={i} className="reef-bubble absolute bottom-[-20px] rounded-full border-2 border-white/70 bg-white/20" style={{ left: `${b.x}%`, width: b.s, height: b.s, animationDuration: `${b.d}s`, animationDelay: `${b.delay}s` }} />
      ))}
    </div>
  );
}

/** Soft glowing specks for the dark tanks. */
function Motes({ reduced }: { reduced: boolean }) {
  const list = useMemo(() => Array.from({ length: 18 }, (_, i) => ({ x: (i * 61) % 97, y: 6 + ((i * 37) % 70), s: 4 + (i % 3) * 2, d: 3 + (i % 4), delay: -(i * 0.7) })), []);
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {list.map((m, i) => (
        <span
          key={i}
          className={cn("absolute rounded-full bg-[#cfe9ff]", !reduced && "aq-mote")}
          style={{ left: `${m.x}%`, top: `${m.y}%`, width: m.s, height: m.s, opacity: reduced ? 0.6 : undefined, boxShadow: "0 0 10px 3px rgba(150,210,255,0.75)", animationDuration: `${m.d}s`, animationDelay: `${m.delay}s` }}
        />
      ))}
    </div>
  );
}

function EggButton({ egg, size, reduced, delay, onTap }: { egg: Egg; size: number; reduced: boolean; delay: number; onTap: () => void }) {
  return (
    <button
      type="button"
      onClick={onTap}
      className={cn("flex shrink-0 items-center justify-center rounded-full bg-[var(--l-card-2)]", !reduced && "l-chest")}
      style={{ width: size, height: size, fontSize: size * 0.6, boxShadow: `0 0 0 4px ${EGG_LOOK[egg.tier].color}`, animationDelay: `${delay}s` }}
      aria-label={`Hatch a ${EGG_LOOK[egg.tier].name}`}
    >
      <span style={{ filter: EGG_TINT[egg.tier] }}>🥚</span>
    </button>
  );
}

// ── Panel pieces ───────────────────────────────────────────────────────────────────────────

function PanelTitle({ text, parts }: { text: string; parts: string[] }) {
  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <p className="font-display text-xl font-extrabold text-[var(--l-ink)]">{text}</p>
      <SpeakerButton parts={parts} size={40} />
    </div>
  );
}

/** Two taps to buy: the first asks "tap again to buy it" (out loud), the second buys. A child
 *  tapping fast without looking can't spend shells by accident. */
function BuyButton({ price, label, can, locked, onBuy, className }: { price: number; label?: string; can: boolean; locked?: number; onBuy: () => void; className?: string }) {
  const [armed, setArmed] = useState(false);
  const [shake, setShake] = useState(0);
  const [shaking, setShaking] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );
  const nope = (line: string) => {
    sfx("wrong");
    setArmed(false);
    setShake((n) => n + 1);
    setShaking(true);
    window.setTimeout(() => setShaking(false), 500);
    void say(line);
  };
  const tap = () => {
    if (timer.current) window.clearTimeout(timer.current);
    if (locked) return nope(SAY.levelLock);
    if (!can) return nope(SAY.notEnough);
    if (!armed) {
      sfx("pick");
      setArmed(true);
      void say(SAY.aqTapAgain);
      timer.current = window.setTimeout(() => setArmed(false), 3500);
      return;
    }
    setArmed(false);
    onBuy();
  };
  return (
    <Chunk
      key={shake}
      tone={locked ? "white" : armed ? "green" : can ? "gold" : "white"}
      onClick={tap}
      className={cn("inline-flex items-center justify-center gap-1.5 font-display font-extrabold", shaking ? "l-shake" : armed && "l-pulse", (!!locked || !can) && "text-[var(--l-ink-2)]", className)}
    >
      {locked ? (
        <>
          <Lock className="h-4 w-4" strokeWidth={3} /> Level {locked}
        </>
      ) : armed ? (
        <>
          <Check className="h-5 w-5" strokeWidth={3.5} /> Tap to buy
        </>
      ) : (
        <>
          {label && <span>{label}</span>}
          <span>🐚 {price}</span>
        </>
      )}
    </Chunk>
  );
}

function ItemStatus({ have, on, locked, price, shells, onWord, offWord }: { have: boolean; on: boolean; locked: number; price: number; shells: number; onWord: string; offWord: string }) {
  if (on)
    return (
      <span className="flex items-center gap-1 rounded-full bg-[var(--l-green)] px-2 py-0.5 font-display text-[11px] font-extrabold text-white">
        <Check className="h-3 w-3" strokeWidth={4} /> {onWord}
      </span>
    );
  if (have) return <span className="rounded-full bg-[var(--l-card-2)] px-2 py-0.5 font-display text-[11px] font-extrabold text-[var(--l-ink-2)]">{offWord}</span>;
  if (locked)
    return (
      <span className="flex items-center gap-1 rounded-full bg-[var(--l-card-2)] px-2 py-0.5 font-display text-[11px] font-extrabold text-[var(--l-ink-2)]">
        <Lock className="h-3 w-3" /> Lv {locked}
      </span>
    );
  return <span className={cn("rounded-full px-2 py-0.5 font-display text-[11px] font-extrabold", shells >= price ? "bg-[var(--l-gold)] text-[#5a3b00]" : "bg-[var(--l-card-2)] text-[var(--l-ink-2)]")}>🐚 {price}</span>;
}

/** What can hatch from an egg, as a colored bar (and words for grown-ups). */
function OddsBar({ tier }: { tier: EggTier }) {
  const odds = EGG_ODDS[tier];
  const parts = RARITIES.filter((r) => odds[r] > 0);
  return (
    <div className="mt-1">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-white">
        {parts.map((r) => (
          <span key={r} style={{ width: `${odds[r]}%`, background: CREATURE_RARITY_COLOR[r] }} />
        ))}
      </div>
      <p className="mt-0.5 font-display text-[11px] font-bold leading-tight text-[var(--l-ink-2)]">{parts.map((r) => `${odds[r]}% ${r}`).join(" · ")}</p>
    </div>
  );
}

/** The Mystery Egg machine: turn the crank, a capsule drops, and the egg goes into the nest. Its
 *  odds are printed right on it, and every 10th roll is Rare or better. */
function EggMachine({
  rolling,
  rolls,
  shells,
  reduced,
  won,
  onRoll,
  onHatch,
}: {
  rolling: { id: string; tier: EggTier; done: boolean } | null;
  rolls: number;
  shells: number;
  reduced: boolean;
  won: Egg | null;
  onRoll: () => void;
  onHatch: (e: Egg) => void;
}) {
  const spinning = !!rolling && !rolling.done;
  const toPity = ROLL_PITY - (rolls % ROLL_PITY);
  const inside = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({ x: 12 + ((i * 29) % 70), y: 30 + ((i * 41) % 52), r: (i * 47) % 360, tier: (i % 5 === 0 ? "golden" : i % 3 === 0 ? "rare" : "sea") as EggTier })),
    [],
  );
  return (
    <section className="flex flex-col items-center gap-2 rounded-[22px] bg-gradient-to-b from-[#ffeaf4] to-[#ffd3e7] p-3">
      <div className="flex w-full items-center justify-between gap-2">
        <p className="font-display text-lg font-extrabold text-[#7a1f4f]">🎰 Mystery Egg</p>
        <SpeakerButton parts={[SAY.aqMachine]} size={40} />
      </div>
      <div className="relative h-[176px] w-[156px]" aria-hidden>
        <div className="absolute left-1/2 top-0 h-[116px] w-[124px] -translate-x-1/2 overflow-hidden rounded-full border-[5px] border-white bg-[radial-gradient(circle_at_35%_28%,#ffffffd9,#c9ecff_45%,#86cdfb)] shadow-[inset_0_-8px_0_rgba(0,40,80,0.12)]">
          <div className={cn("absolute inset-0", spinning && !reduced && "aq-jiggle")}>
            {inside.map((e, i) => (
              <span key={i} className="absolute text-[26px] leading-none" style={{ left: `${e.x}%`, top: `${e.y}%`, transform: `translate(-50%,-50%) rotate(${e.r}deg)`, filter: EGG_TINT[e.tier] }}>
                🥚
              </span>
            ))}
          </div>
        </div>
        <div className="absolute bottom-0 left-1/2 h-[74px] w-[136px] -translate-x-1/2 rounded-[18px] bg-[#ff5d8f] shadow-[0_6px_0_#c93a6a]">
          <div className={cn("absolute left-3 top-3.5 h-11 w-11 rounded-full bg-white shadow-[inset_0_-3px_0_rgba(0,0,0,0.12)]", spinning && !reduced && "aq-crank")}>
            <span className="absolute left-1/2 top-1 h-4 w-2.5 -translate-x-1/2 rounded-full bg-[#c93a6a]" />
          </div>
          <div className="absolute right-3 top-3 flex h-12 w-[60px] items-center justify-center rounded-[12px] bg-[#7a1f4f]/85">
            {rolling?.done && (
              <span key={rolling.id} className="aq-capsule text-[34px] leading-none" style={{ filter: EGG_TINT[rolling.tier] }}>
                🥚
              </span>
            )}
          </div>
        </div>
      </div>
      {rolling?.done ? (
        <div className="l-pop-in flex w-full items-center justify-between gap-2 rounded-[18px] bg-white px-3 py-2">
          <span className="font-display text-lg font-extrabold" style={{ color: EGG_LOOK[rolling.tier].color === "#7cc8ff" ? "#1477c2" : EGG_LOOK[rolling.tier].color }}>
            {rolling.tier === "golden" ? "🌟 " : rolling.tier === "rare" ? "✨ " : ""}
            {EGG_LOOK[rolling.tier].name}!
          </span>
          {won && (
            <Chunk tone="green" onClick={() => onHatch(won)} className="h-11 px-4 font-display text-base font-extrabold">
              Hatch it!
            </Chunk>
          )}
        </div>
      ) : spinning ? (
        <p className="font-display text-lg font-extrabold text-[#7a1f4f]">Rolling…</p>
      ) : null}
      {spinning ? (
        <Chunk tone="white" disabled className="h-12 w-full font-display text-lg font-extrabold text-[var(--l-ink-2)]">
          …
        </Chunk>
      ) : (
        <BuyButton price={ROLL_PRICE} label="Roll!" can={shells >= ROLL_PRICE} onBuy={onRoll} className="h-12 w-full text-lg" />
      )}
      <div className="w-full rounded-[14px] bg-white/70 px-3 py-2 text-center">
        <p className="font-display text-sm font-extrabold text-[#7a1f4f]">{ROLL_ODDS.map((o) => `${EGG_LOOK[o.tier].name.replace(" egg", "")} ${o.pct}%`).join(" · ")}</p>
        <p className="font-display text-xs font-bold text-[#7a1f4f]/80">{toPity === 1 ? "✨ Your next roll is Rare or better!" : `Every ${ROLL_PITY}th roll is Rare or better — ${toPity} to go`}</p>
      </div>
    </section>
  );
}

function FishBook({ have, onOpen }: { have: Set<string>; onOpen: (id: string) => void }) {
  return (
    <div className="flex flex-col gap-2.5">
      <PanelTitle text={`Fish Book · ${CREATURES.filter((c) => have.has(c.id)).length}/${CREATURES.length}`} parts={[SAY.aqBook]} />
      <div className="grid grid-cols-4 gap-2">
        {CREATURES.map((cr) => {
          const got = have.has(cr.id);
          return (
            <button
              key={cr.id}
              type="button"
              onClick={() => (got ? onOpen(cr.id) : (sfx("soft-fail"), void say(SAY.aqNotFound)))}
              className="flex flex-col items-center gap-0.5 rounded-[18px] bg-[var(--l-card-2)] px-1 py-2"
              style={{ boxShadow: got ? `inset 0 0 0 3px ${CREATURE_RARITY_COLOR[cr.rarity]}` : undefined }}
              aria-label={got ? cr.name : "A friend you haven't found yet"}
            >
              <span className="text-[34px] leading-none" style={{ filter: got ? cr.tint : "brightness(0) opacity(0.22)" }}>
                {cr.emoji}
              </span>
              <span className="line-clamp-1 font-display text-[11px] font-extrabold text-[var(--l-ink)]">{got ? cr.name : "???"}</span>
              <span className="h-1.5 w-6 rounded-full" style={{ background: CREATURE_RARITY_COLOR[cr.rarity], opacity: got ? 1 : 0.35 }} />
            </button>
          );
        })}
      </div>
      <p className="px-1 font-display text-sm font-bold leading-snug text-[var(--l-ink-2)]">Every egg hatches someone new until you&rsquo;ve found them all.</p>
    </div>
  );
}

// ── Overlays ───────────────────────────────────────────────────────────────────────────────

function CreatureCard({
  h,
  xp,
  fed,
  food,
  buddy,
  eating,
  onFeed,
  onBuddy,
  onClose,
}: {
  h: Hatch;
  xp: number;
  fed: Fed | undefined;
  food: Record<FoodKind, number>;
  buddy: boolean;
  eating: boolean;
  onFeed: (k: FoodKind, el: HTMLElement | null) => void;
  onBuddy: () => void;
  onClose: () => void;
}) {
  const cr = CREATURE_BY_ID.get(h.creature)!;
  const g = growth(xp, h, foodGrowth(fed));
  const pct = g.next ? Math.min(100, ((g.gained - g.stage.at) / (g.next.at - g.stage.at)) * 100) : 100;
  const meals = fed?.today ?? 0;
  const face = useRef<HTMLSpanElement>(null);
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0b2340]/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="l-pop-in flex max-h-[94dvh] w-full max-w-[460px] flex-col items-center gap-3 overflow-y-auto rounded-[34px] bg-white p-6 text-center shadow-[0_10px_0_var(--l-line)]" onClick={(e) => e.stopPropagation()}>
        <span ref={face} className={cn("text-[110px] leading-none", eating ? "l-chomp" : "l-boing")} style={{ filter: cr.tint }}>
          {cr.emoji}
        </span>
        <div className="flex items-center gap-2">
          <p className="font-display text-3xl font-extrabold text-[var(--l-ink)]">{cr.name}</p>
          <SpeakerButton parts={[cr.name]} size={40} />
        </div>
        <p className="-mt-1 flex items-center gap-2 font-display text-lg font-bold text-[var(--l-ink-2)]">
          {cr.kind}
          <span className="rounded-full px-2.5 py-0.5 text-sm font-extrabold capitalize text-white" style={{ background: CREATURE_RARITY_COLOR[cr.rarity] }}>
            {cr.rarity}
          </span>
        </p>
        <div className="w-full rounded-[20px] bg-[var(--l-card-2)] px-4 py-3">
          <div className="flex items-center justify-between font-display font-bold text-[var(--l-ink)]">
            <span>{g.royal ? "👑 Royal!" : g.stage.name}</span>
            <span className="text-sm text-[var(--l-ink-2)]">{g.next ? `${g.next.name} in ${g.toNext} 🌱` : "All grown up"}</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-[var(--l-teal)] transition-[width] duration-700" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1.5 text-left font-display text-sm font-bold text-[var(--l-ink-2)]">Every level you pass — and every treat — helps {cr.name} grow.</p>
        </div>
        <div className="w-full rounded-[20px] bg-[#fff4e0] px-3 py-3">
          <div className="flex items-center justify-between px-1">
            <span className="font-display text-lg font-extrabold text-[var(--l-ink)]">Treats today</span>
            <span className="flex gap-1" aria-label={`${meals} of ${MEALS_PER_DAY} treats today`}>
              {Array.from({ length: MEALS_PER_DAY }, (_, i) => (
                <span key={i} className={cn("flex h-7 w-7 items-center justify-center rounded-full text-base", i < meals ? "bg-[var(--l-gold)]" : "bg-white")}>
                  {i < meals ? "💛" : ""}
                </span>
              ))}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {FOOD_ORDER.map((k) => (
              <Chunk key={k} tone="white" onClick={() => onFeed(k, face.current)} className={cn("flex flex-col items-center gap-0.5 py-2", (food[k] === 0 || meals >= MEALS_PER_DAY) && "opacity-55")} aria-label={`Feed ${FOODS[k].name}`}>
                <span className="text-[32px] leading-none">{FOODS[k].emoji}</span>
                <span className="font-display text-sm font-extrabold tabular-nums text-[var(--l-ink)]">×{food[k]}</span>
              </Chunk>
            ))}
          </div>
          {meals >= MEALS_PER_DAY && <p className="mt-2 font-display text-sm font-bold text-[var(--l-ink-2)]">😊 Full and happy — more treats tomorrow!</p>}
        </div>
        <div className="flex w-full items-start gap-2 rounded-[20px] bg-[#e9f8ff] px-3 py-3 text-left">
          <SpeakerButton parts={[cr.fact]} size={40} />
          <p className="font-reading text-lg font-bold leading-snug text-[var(--l-ink)]">{cr.fact}</p>
        </div>
        <div className="mt-1 flex w-full flex-col gap-2">
          <Chunk tone={buddy ? "white" : "gold"} disabled={buddy} onClick={onBuddy} className="h-14 font-display text-xl font-extrabold">
            {buddy ? "⭐ Your buddy" : "⭐ Make my buddy"}
          </Chunk>
          <Chunk tone="white" onClick={() => (sfx("tap"), onClose())} className="h-12 font-display text-lg font-bold text-[var(--l-ink-2)]">
            Back to the tank
          </Chunk>
        </div>
      </div>
    </div>
  );
}

/** Tap the egg until it cracks — then meet who hatched. */
function HatchOverlay({ egg, seed, owned, accent, reduced, onHatched, onClose }: { egg: Egg; seed: string; owned: string[]; accent: string; reduced: boolean; onHatched: (c: Creature) => void; onClose: () => void }) {
  const [taps, setTaps] = useState(0);
  const [creature, setCreature] = useState<Creature | null>(null);
  const need = 3;
  const tap = () => {
    if (creature) return;
    const n = taps + 1;
    setTaps(n);
    buzz(20);
    if (n < need) return sfx("hit");
    const cr = hatchCreature(seed, egg.tier, owned);
    sfx(cr.rarity === "legendary" || cr.rarity === "epic" ? "legendary" : "sticker");
    setCreature(cr);
    onHatched(cr);
    window.setTimeout(() => void say([SAY.hatched, "~", cr.name]), 500);
  };
  const look = EGG_LOOK[egg.tier];
  const ring = creature ? CREATURE_RARITY_COLOR[creature.rarity] : look.color;
  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-[#0b2340]/65 p-6 backdrop-blur-sm">
      <div className="relative">{creature && !reduced && <Confetti count={creature.rarity === "legendary" ? 90 : 50} spread={460} accent={accent} />}</div>
      <div className="l-pop-in flex w-full max-w-lg flex-col items-center gap-4 rounded-[36px] bg-white p-8 text-center shadow-[0_12px_0_var(--l-line)]">
        <p className="font-display text-3xl font-extrabold text-[var(--l-ink)]">{creature ? `Meet ${creature.name}!` : `${look.name}!`}</p>
        <p className="font-display text-lg font-bold text-[var(--l-ink-2)]">{creature ? `A ${creature.rarity} ${creature.kind}` : egg.why}</p>
        <div className="relative flex h-[220px] w-[220px] items-center justify-center">
          <div className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle, ${ring}66 0%, transparent 65%)` }} />
          {creature && !reduced && <div className="l-rays absolute inset-[-30px] rounded-full opacity-60" style={{ background: "repeating-conic-gradient(rgba(255,255,255,0.7) 0deg 9deg, transparent 9deg 30deg)", WebkitMaskImage: "radial-gradient(circle, #000 30%, transparent 70%)", maskImage: "radial-gradient(circle, #000 30%, transparent 70%)" } as CSSProperties} />}
          {creature ? (
            <span className="l-pop-in relative text-[140px] leading-none" style={{ filter: creature.tint }}>
              {creature.emoji}
            </span>
          ) : (
            <button type="button" onClick={tap} className="relative" aria-label="Tap the egg">
              <span key={taps} className={cn("block text-[150px] leading-none", taps > 0 ? "l-hit" : !reduced && "l-chest")} style={{ filter: EGG_TINT[egg.tier] }}>
                🥚
              </span>
              {taps > 0 && (
                <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
                  <path d="M50 22 L44 38 L54 46 L46 60" stroke="#5a3b00" strokeWidth="3" fill="none" strokeLinecap="round" />
                  {taps > 1 && <path d="M54 46 L66 52 L60 66 M44 38 L32 44" stroke="#5a3b00" strokeWidth="3" fill="none" strokeLinecap="round" />}
                </svg>
              )}
            </button>
          )}
        </div>
        {creature ? (
          <>
            <p className="rounded-[20px] bg-[#e9f8ff] px-4 py-3 font-reading text-lg font-bold leading-snug text-[var(--l-ink)]">🔬 {creature.fact}</p>
            <Chunk tone="green" onClick={() => (sfx("tap"), onClose())} className="flex h-16 w-64 items-center justify-center font-display text-2xl font-extrabold">
              Into the tank!
            </Chunk>
          </>
        ) : (
          <p className="l-pulse font-display text-xl font-bold text-[var(--l-ink-2)]">Tap the egg! {taps > 0 ? `${need - taps} more…` : ""}</p>
        )}
      </div>
    </div>
  );
}
