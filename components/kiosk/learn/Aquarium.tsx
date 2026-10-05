"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, Check, Info, Lock, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Hatch, KidLearn } from "@/lib/learn/progress";
import { CREATURES, CREATURE_BY_ID, CREATURE_RARITY_COLOR, EGG_LOOK, EGG_ODDS, growth, hatchCreature, type Creature, type CreatureRarity, type Egg, type EggTier } from "@/lib/learn/reef";
import {
  DECOR, EGG_SHOP, FOODS, FOOD_ORDER, MEALS_PER_DAY, ROLL_ODDS, ROLL_PITY, ROLL_PRICE, TANKS, TANK_BY_ID,
  aquariumOf, foodGrowth, purchaseId, rollTier, type Decor, type Fed, type FoodKind, type Tank as TankTheme,
} from "@/lib/learn/aquarium";
import { SAY } from "@/lib/learn/script";
import { say } from "@/lib/learn/audio";
import { sfx, buzz } from "@/lib/learn/sfx";
import { Confetti } from "../Confetti";
import { Chunk, ShellIcon, SpeakerButton } from "./kit";
import { Tank } from "./tank/Tank";
import type { TankEvents, TankInput } from "./tank/engine";
import { CreatureView } from "./tank/CreatureView";
import { DECOR_ART, EGG_COLORS, FOOD_ART, ICON_ART, artUrl, eggArt, type Art } from "./tank/art";
import { THEMES, themePreview, type Theme } from "./tank/scene";

// My Aquarium: the living tank a child builds with the shells they earn by learning. Every
// creature is drawn and animated from code — it swims, turns, blinks, follows your finger, and
// races to eat the food you drop in (hearts, a gulp, and it grows up faster). Tap a friend to
// hear its name and see its card. A friend who hasn't had a treat today just looks up hopefully
// (no guilt, ever: nobody gets sick or sad). The panel beside the tank is the shop: food packs,
// the nest + Egg Shop + Mystery Egg machine (odds printed on it), decorations and tank themes
// (try them in the real tank before buying), and the Fish Book. Every purchase takes two taps —
// "tap again to buy it" — so a child tapping fast can't spend shells by accident.

export type AquaPanel = "food" | "eggs" | "decor" | "tanks" | "book";

const YUM: Record<FoodKind, string> = { flakes: SAY.aqYumFlakes, shrimp: SAY.aqYumShrimp, golden: SAY.aqYumGolden };
const RARITIES: CreatureRarity[] = ["common", "rare", "epic", "legendary"];
const PANELS: { id: AquaPanel; label: string; art: Art; say: string }[] = [
  { id: "food", label: "Food", art: FOOD_ART.flakes, say: SAY.aqFood },
  { id: "eggs", label: "Eggs", art: eggArt("sea"), say: SAY.aqEggs },
  { id: "decor", label: "Decor", art: ICON_ART.decor, say: SAY.aqDecor },
  { id: "tanks", label: "Tanks", art: ICON_ART.tank, say: SAY.aqTanks },
  { id: "book", label: "Book", art: ICON_ART.book, say: SAY.aqBook },
];
// The tank and the panel beside it share one height (written out in full so Tailwind sees both).
const TANK_H = "h-[min(64dvh,560px)]";
const PANEL_H = "lg:h-[min(64dvh,560px)]";

/** A new id for something bought (only ever called from a tap). */
const freshId = () => purchaseId(Math.random());
const nowMs = () => Date.now();

function Pic({ art, size, className, style }: { art: Art; size: number; className?: string; style?: CSSProperties }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={artUrl(art)} alt="" draggable={false} width={size} height={(size * art.h) / art.w} className={cn("pointer-events-none select-none", className)} style={{ width: size, height: (size * art.h) / art.w, ...style }} />;
}
/** A hand pressing at a spot (its fingertip is the element's top-left), with a little tap ring. */
function PointHand({ style, size = 54 }: { style: CSSProperties; size?: number }) {
  return (
    <span className="pointer-events-none absolute z-[8] h-0 w-0" style={style} aria-hidden>
      <span className="aq-tap absolute -left-4 -top-4 h-8 w-8 rounded-full border-[3px] border-white" />
      <span className="aq-hand absolute block drop-shadow-[0_4px_4px_rgba(0,30,60,0.3)]" style={{ left: -size * 0.3, top: -2, width: size, height: (size * ICON_ART.hand.h) / ICON_ART.hand.w }}>
        <Pic art={ICON_ART.hand} size={size} className="max-w-none" />
      </span>
    </span>
  );
}

export function Aquarium({
  kid,
  eggs,
  childId,
  reduced,
  accent,
  night,
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
  /** Evening: the tank's lights go down and its friends get sleepy. */
  night: boolean;
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
  const [open, setOpen] = useState<string | null>(null);
  const [hatching, setHatching] = useState<Egg | null>(() => (autoHatch ? (eggs.find((e) => e.id === autoHatch) ?? eggs[0] ?? null) : null));
  const [preview, setPreview] = useState<{ kind: "decor" | "tank"; id: string } | null>(null);
  const [rolling, setRolling] = useState<{ id: string; tier: EggTier; done: boolean } | null>(null);
  const [party, setParty] = useState(0);
  const [peek, setPeek] = useState<{ egg: string; x: number; y: number; n: number } | null>(null);
  /** The pointing-hand guide stops once a child has fed a friend this visit. */
  const [fedThisVisit, setFedThisVisit] = useState(false);
  /** …and never pulls them away from a tab they picked themselves. */
  const [chose, setChose] = useState(false);
  const said = useRef({ yum: 0, full: 0 });

  // Say hello — and, if friends are hungry and there's food, point the way.
  const greet = !autoHatch;
  const nudge = kid.hatched.some((h) => (kid.fed[h.egg]?.today ?? 0) < MEALS_PER_DAY) && FOOD_ORDER.some((k) => aq.food[k] > 0);
  const nudgeRef = useRef(nudge);
  useEffect(() => {
    if (!greet) return;
    const t = window.setTimeout(() => void say(nudgeRef.current ? [SAY.aquarium, { gap: 300 }, SAY.aqHungry] : SAY.aquarium), 300);
    return () => window.clearTimeout(t);
  }, [greet]);
  useEffect(() => {
    if (!peek) return;
    const t = window.setTimeout(() => setPeek((p) => (p?.n === peek.n ? null : p)), 3800);
    return () => window.clearTimeout(t);
  }, [peek]);

  const owned = kid.hatched.map((h) => h.creature);
  const buddyId = kid.buddy ?? kid.hatched[0]?.creature ?? null;
  const previewDecor = preview?.kind === "decor" ? (DECOR.find((d) => d.id === preview.id) ?? null) : null;
  const previewItem = preview ? (preview.kind === "decor" ? previewDecor : (TANK_BY_ID.get(preview.id) ?? null)) : null;
  const won = rolling?.done ? (eggs.find((e) => e.id === rolling.id) ?? null) : null;
  // A rolled egg stays a secret until the capsule drops.
  const nest = rolling && !rolling.done ? eggs.filter((e) => e.id !== rolling.id) : eggs;

  const creatures = useMemo(() => {
    const buddyEgg = kid.hatched.find((h) => h.creature === buddyId)?.egg;
    return kid.hatched.map((h) => {
      const fed = kid.fed[h.egg];
      return { egg: h.egg, id: h.creature, stage: growth(kid.xp, h, foodGrowth(fed)).index, buddy: h.egg === buddyEgg, appetite: Math.max(0, MEALS_PER_DAY - (fed?.today ?? 0)) };
    });
  }, [kid.hatched, kid.fed, kid.xp, buddyId]);
  const shownDecor = useMemo(() => aq.decor.filter((d) => !kid.decorOff.has(d.id)).map((d) => d.id), [aq.decor, kid.decorOff]);
  const nestKey = nest.map((e) => `${e.id}:${e.tier}`).join(",");
  const tankInput: TankInput = useMemo(
    () => ({
      creatures,
      eggs: nest.map((e) => ({ id: e.id, tier: e.tier })),
      decor: shownDecor,
      trying: previewDecor?.id ?? null,
      theme: preview?.kind === "tank" ? preview.id : aq.tank.id,
      holding,
      stock: aq.food,
      night,
      reduced,
      paused: !!open || !!hatching,
    }),
    // The nest is keyed by its contents so a new array each render doesn't count as a change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [creatures, nestKey, shownDecor, previewDecor?.id, preview, aq.tank.id, holding, aq.food, night, reduced, open, hatching],
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

  /** A friend ate (in the tank or from its card): grow, cheer, and maybe grow up. */
  const ate = (egg: string, kind: FoodKind) => {
    const h = kid.hatched.find((x) => x.egg === egg);
    if (!h) return;
    const bonus = foodGrowth(kid.fed[egg]);
    const grew = growth(kid.xp, h, bonus + FOODS[kind].grow).index > growth(kid.xp, h, bonus).index;
    onFeed(kind, egg);
    buzz(15);
    setFedThisVisit(true);
    if (aq.food[kind] <= 1 && holding === kind) setHolding(null);
    if (grew) {
      window.setTimeout(() => {
        sfx("levelup");
        setParty((p) => p + 1);
        void say(SAY.aqGrew);
      }, 500);
    } else if (nowMs() - said.current.yum > 2500) {
      said.current.yum = nowMs();
      void say(YUM[kind]);
    }
  };

  const events: TankEvents = {
    creature: (egg, x, y) => {
      const h = kid.hatched.find((e) => e.egg === egg);
      const cr = h ? CREATURE_BY_ID.get(h.creature) : null;
      if (!cr) return;
      sfx("splash");
      void say([cr.name]);
      setPeek({ egg, x, y, n: nowMs() });
    },
    egg: (id) => {
      const e = eggs.find((x) => x.id === id);
      if (!e) return;
      sfx("pick");
      setHatching(e);
      void say(SAY.hatchIt);
    },
    decor: (id) => {
      const d = DECOR.find((x) => x.id === id);
      if (d) void say([d.name]);
    },
    eat: ate,
    noFood: () => {
      sfx("wrong");
      void say(SAY.aqNoFood);
      setHolding(null);
      setPanel("food");
    },
    allFull: () => {
      if (nowMs() - said.current.full < 3000) return;
      said.current.full = nowMs();
      sfx("soft-fail");
      void say(SAY.aqAllFull);
    },
    noFriends: () => {
      sfx("soft-fail");
      void say(SAY.aqNoFriends);
    },
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

  const tapTank = (tk: TankTheme) => {
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
    setChose(true);
    setPreview(null);
    if (p !== "food") setHolding(null);
    void say(PANELS.find((x) => x.id === p)!.say);
  };

  const openHatch = open ? (kid.hatched.find((h) => h.egg === open) ?? null) : null;
  const peekCreature = peek ? CREATURE_BY_ID.get(kid.hatched.find((h) => h.egg === peek.egg)?.creature ?? "") : undefined;
  // Where the pointing hand goes for a child who can't read yet: hatch the first egg, then pick
  // up food, then tap the water.
  const firstFood = FOOD_ORDER.find((k) => aq.food[k] > 0);
  const hint: "nest" | "foodTab" | "food" | "water" | null =
    open || hatching || preview
      ? null
      : !kid.hatched.length
        ? nest.length
          ? "nest"
          : null
        : fedThisVisit
          ? null
          : holding
            ? "water"
            : nudge
              ? panel === "food"
                ? "food"
                : // From the eggs, once they've all hatched (not when they came to shop for more).
                  panel === "eggs" && !nest.length && !chose
                  ? "foodTab"
                  : null
              : null;
  const theme = THEMES[preview?.kind === "tank" ? preview.id : aq.tank.id] ?? THEMES.reef;

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 px-4 pb-10 pt-2 sm:px-6">
      <div className="flex items-center gap-3">
        <Chunk tone="white" onClick={() => (sfx("tap"), onBack())} aria-label="Back" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full" style={{ borderRadius: 999 }}>
          <ArrowLeft className="h-7 w-7 text-[var(--l-ink)]" strokeWidth={3} />
        </Chunk>
        <p className="flex flex-1 items-center gap-2 font-display text-3xl font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.25)]">
          {buddyId ? <CreatureView id={buddyId} size={52} /> : <Pic art={ICON_ART.tank} size={40} />}
          My Aquarium
        </p>
        <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 font-display text-2xl font-extrabold text-[var(--l-ink)] shadow-[0_5px_0_var(--l-line)]" aria-label={`${kid.shells} shells`}>
          <ShellIcon size={28} />{" "}
          <span key={kid.shells} className="l-pop-in tabular-nums">
            {kid.shells}
          </span>
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        {/* ── The living tank ── */}
        <div className={cn("relative w-full overflow-hidden rounded-[34px] shadow-[0_10px_0_rgba(0,40,80,0.2)]", TANK_H)}>
          <Tank input={tankInput} events={events} className="absolute inset-0" />
          {hint === "water" && <PointHand style={{ left: "52%", top: "40%" }} size={68} />}
          {hint === "nest" && <PointHand style={{ left: "10%", top: "79%" }} size={64} />}

          {kid.hatched.length === 0 && (
            <div className="pointer-events-none absolute inset-x-0 top-[22%] flex flex-col items-center gap-2 px-6 text-center">
              <p className="max-w-[520px] font-display text-3xl font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,30,60,0.45)]">Your aquarium is waiting!</p>
              <p className="max-w-[560px] font-display text-xl font-bold text-white/95 drop-shadow-[0_1px_0_rgba(0,30,60,0.45)]">
                {nest.length ? "Tap an egg in the nest to hatch your first friend!" : "Learn to earn eggs, or get one in the Eggs shop. Each egg hatches a new friend."}
              </p>
            </div>
          )}

          {holding && (
            <div className="l-pop-in absolute bottom-3 left-1/2 z-[6] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-[var(--l-gold)] py-1.5 pl-2 pr-1.5 font-display text-lg font-extrabold text-[#5a3b00] shadow-[0_4px_0_var(--l-gold-edge)]">
              <Pic art={FOOD_ART[holding]} size={34} />
              Tap the water!
              <span className="rounded-full bg-white/70 px-2 text-base tabular-nums">×{aq.food[holding]}</span>
              <button type="button" onClick={() => (sfx("tap"), setHolding(null))} aria-label="Put the food down" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/85">
                <X className="h-5 w-5" strokeWidth={3} />
              </button>
            </div>
          )}

          {preview && previewItem && (
            <div className="l-pop-in absolute bottom-3 left-1/2 z-[6] -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-4 py-1.5 font-display text-base font-extrabold text-[var(--l-ink)] shadow-[0_4px_0_rgba(0,40,80,0.15)]">
              Trying on: {previewItem.name}
            </div>
          )}

          {peek && peekCreature && (
            <div key={peek.n} className="aq-peek absolute z-[7] flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white py-1 pl-4 pr-1 shadow-[0_5px_0_rgba(0,40,80,0.18)]" style={{ left: `clamp(100px, ${peek.x}px, calc(100% - 100px))`, top: Math.max(peek.y - 6, 58) }}>
              <span className="font-display text-xl font-extrabold text-[var(--l-ink)]">{peekCreature.name}</span>
              <button
                type="button"
                onClick={() => {
                  sfx("pick");
                  setOpen(peek.egg);
                  setPeek(null);
                }}
                aria-label={`${peekCreature.name}'s card`}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--l-violet)] text-white shadow-[0_3px_0_var(--l-violet-edge)]"
              >
                <Info className="h-5 w-5" strokeWidth={3} />
              </button>
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
                <Pic art={p.art} size={30} />
                <span className={cn("font-display text-xs font-extrabold", panel === p.id ? "text-white" : "text-[var(--l-ink)]")}>{p.label}</span>
                {hint === "foodTab" && p.id === "food" && <PointHand style={{ left: "62%", top: "60%" }} size={44} />}
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
                        className={cn("relative flex h-[78px] w-[78px] shrink-0 items-center justify-center", on && !reduced && "l-pulse", aq.food[k] === 0 && "opacity-60")}
                      >
                        <Pic art={FOOD_ART[k]} size={58} />
                        <span className="absolute -bottom-1.5 -right-1.5 rounded-full bg-[var(--l-violet)] px-2 font-display text-sm font-extrabold tabular-nums text-white shadow-[0_2px_0_var(--l-violet-edge)]">×{aq.food[k]}</span>
                        {hint === "food" && k === firstFood && <PointHand style={{ left: "62%", top: "62%" }} size={46} />}
                      </Chunk>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-lg font-extrabold leading-tight text-[var(--l-ink)]">{f.name}</p>
                        <p className="flex items-center gap-1 font-display text-sm font-bold text-[var(--l-ink-2)]">
                          +{f.grow} <Pic art={ICON_ART.sprout} size={16} /> growth each
                        </p>
                        <BuyButton price={f.price} label={`+${f.pack}`} can={kid.shells >= f.price} onBuy={() => buyFood(k)} className="mt-1.5 h-10 px-3 text-base" />
                      </div>
                    </div>
                  );
                })}
                <p className="px-1 font-display text-sm font-bold leading-snug text-[var(--l-ink-2)]">
                  Tap a food, then tap the water — your friends race to eat it! Each friend can have {MEALS_PER_DAY} treats a day, and treats help them grow up faster.
                </p>
              </div>
            )}

            {panel === "eggs" && (
              <div className="flex flex-col gap-3">
                <section className="rounded-[22px] bg-[var(--l-card-2)] p-3">
                  <p className="flex items-center gap-1.5 font-display text-lg font-extrabold text-[var(--l-ink)]">
                    <Pic art={eggArt("sea")} size={18} /> Your nest{nest.length ? ` · ${nest.length}` : ""}
                  </p>
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
                        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white"
                        style={{ boxShadow: `0 0 0 4px ${EGG_LOOK[s.tier].color}` }}
                        aria-label={EGG_LOOK[s.tier].name}
                      >
                        <Pic art={eggArt(s.tier)} size={38} />
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
                        <span className="flex h-[52px] items-end justify-center">
                          <Pic art={DECOR_ART[d.id]} size={Math.min(56, (52 * DECOR_ART[d.id].w) / DECOR_ART[d.id].h)} style={locked ? { filter: "grayscale(1) opacity(0.5)" } : undefined} />
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
                  const th = THEMES[tk.id];
                  return (
                    <Chunk
                      key={tk.id}
                      tone="white"
                      onClick={() => tapTank(tk)}
                      className={cn("flex items-center gap-3 p-2.5 text-left", preview?.id === tk.id && "outline-4 outline-[var(--l-gold)]", inUse && "outline-4 outline-[var(--l-green)]")}
                      aria-label={tk.name}
                    >
                      <span className="block h-14 w-20 shrink-0 overflow-hidden rounded-[14px] shadow-[0_0_0_2px_rgba(0,40,80,0.12)]" style={{ background: th ? th.water[1] : undefined, filter: locked ? "grayscale(0.8)" : undefined }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={themePreview(tk.id, 80, 56)} alt="" width={80} height={56} className="h-full w-full" draggable={false} />
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
              {preview?.kind === "decor" && previewDecor ? <Pic art={DECOR_ART[previewDecor.id]} size={44} /> : <Pic art={ICON_ART.tank} size={40} />}
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
          reduced={reduced}
          theme={theme}
          onFeed={(k) => ate(openHatch.egg, k)}
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
    </div>
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

function EggButton({ egg, size, reduced, delay, onTap }: { egg: Egg; size: number; reduced: boolean; delay: number; onTap: () => void }) {
  return (
    <button
      type="button"
      onClick={onTap}
      className={cn("flex shrink-0 items-center justify-center rounded-full bg-white", !reduced && "l-chest")}
      style={{ width: size, height: size, boxShadow: `0 0 0 4px ${EGG_LOOK[egg.tier].color}`, animationDelay: `${delay}s` }}
      aria-label={`Hatch a ${EGG_LOOK[egg.tier].name}`}
    >
      <Pic art={eggArt(egg.tier)} size={size * 0.58} />
    </button>
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
          <ShellIcon size={20} />
          <span>{price}</span>
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
  return (
    <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 font-display text-[11px] font-extrabold", shells >= price ? "bg-[var(--l-gold)] text-[#5a3b00]" : "bg-[var(--l-card-2)] text-[var(--l-ink-2)]")}>
      <ShellIcon size={13} /> {price}
    </span>
  );
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
    () => Array.from({ length: 9 }, (_, i) => ({ x: 14 + ((i * 29) % 68), y: 30 + ((i * 41) % 50), r: ((i * 47) % 70) - 35, tier: (i % 5 === 0 ? "golden" : i % 3 === 0 ? "rare" : "sea") as EggTier })),
    [],
  );
  return (
    <section className="flex flex-col items-center gap-2 rounded-[22px] bg-gradient-to-b from-[#ffeaf4] to-[#ffd3e7] p-3">
      <div className="flex w-full items-center justify-between gap-2">
        <p className="font-display text-lg font-extrabold text-[#7a1f4f]">Mystery Egg</p>
        <SpeakerButton parts={[SAY.aqMachine]} size={40} />
      </div>
      <div className="relative h-[176px] w-[156px]" aria-hidden>
        <div className="absolute left-1/2 top-0 h-[116px] w-[124px] -translate-x-1/2 overflow-hidden rounded-full border-[5px] border-white bg-[radial-gradient(circle_at_35%_28%,#ffffffd9,#c9ecff_45%,#86cdfb)] shadow-[inset_0_-8px_0_rgba(0,40,80,0.12)]">
          <div className={cn("absolute inset-0", spinning && !reduced && "aq-jiggle")}>
            {inside.map((e, i) => (
              <span key={i} className="absolute" style={{ left: `${e.x}%`, top: `${e.y}%`, transform: `translate(-50%,-50%) rotate(${e.r}deg)` }}>
                <Pic art={eggArt(e.tier)} size={24} />
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
              <span key={rolling.id} className="aq-capsule">
                <Pic art={eggArt(rolling.tier)} size={30} />
              </span>
            )}
          </div>
        </div>
      </div>
      {rolling?.done ? (
        <div className="l-pop-in flex w-full items-center justify-between gap-2 rounded-[18px] bg-white px-3 py-2">
          <span className="flex items-center gap-2 font-display text-lg font-extrabold" style={{ color: rolling.tier === "sea" ? "#1477c2" : EGG_LOOK[rolling.tier].color === "#ffc83d" ? "#d48a00" : EGG_LOOK[rolling.tier].color }}>
            <Pic art={eggArt(rolling.tier)} size={22} />
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
        <p className="font-display text-xs font-bold text-[#7a1f4f]/80">{toPity === 1 ? "Your next roll is Rare or better!" : `Every ${ROLL_PITY}th roll is Rare or better — ${toPity} to go`}</p>
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
              className="flex flex-col items-center gap-0.5 rounded-[18px] bg-[var(--l-card-2)] px-1 py-1.5"
              style={{ boxShadow: got ? `inset 0 0 0 3px ${CREATURE_RARITY_COLOR[cr.rarity]}` : undefined }}
              aria-label={got ? cr.name : "A friend you haven't found yet"}
            >
              <CreatureView id={cr.id} size={60} animate={false} silhouette={got ? undefined : "rgba(30,50,80,0.28)"} />
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
  reduced,
  theme,
  onFeed,
  onBuddy,
  onClose,
}: {
  h: Hatch;
  xp: number;
  fed: Fed | undefined;
  food: Record<FoodKind, number>;
  buddy: boolean;
  reduced: boolean;
  /** The tank it lives in (the portrait sits in that water). */
  theme: Theme;
  onFeed: (k: FoodKind) => void;
  onBuddy: () => void;
  onClose: () => void;
}) {
  const cr = CREATURE_BY_ID.get(h.creature)!;
  const g = growth(xp, h, foodGrowth(fed));
  const pct = g.next ? Math.min(100, ((g.gained - g.stage.at) / (g.next.at - g.stage.at)) * 100) : 100;
  const meals = fed?.today ?? 0;
  const [eating, setEating] = useState(false);
  const [poke, setPoke] = useState(0);
  const face = useRef<HTMLDivElement>(null);
  const { hearts, fireAt } = useHearts();
  const feed = (k: FoodKind) => {
    if (eating) return;
    if (meals >= MEALS_PER_DAY) {
      sfx("soft-fail");
      void say(SAY.aqFull);
      return;
    }
    if (food[k] <= 0) {
      sfx("wrong");
      void say(SAY.aqNoFood);
      return;
    }
    sfx("gulp");
    setEating(true);
    window.setTimeout(() => setEating(false), 1200);
    fireAt(face.current);
    onFeed(k);
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0b2340]/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="l-pop-in flex max-h-[94dvh] w-full max-w-[460px] flex-col items-center gap-3 overflow-y-auto rounded-[34px] bg-white p-6 text-center shadow-[0_10px_0_var(--l-line)]" onClick={(e) => e.stopPropagation()}>
        <div ref={face} className="relative -my-2 overflow-hidden rounded-[28px] px-6 shadow-[inset_0_0_0_3px_rgba(255,255,255,0.5)]" style={{ background: `radial-gradient(120% 80% at 50% -10%, ${theme.water[0]}, transparent 60%), linear-gradient(180deg, ${theme.water[1]}, ${theme.water[2]})` }}>
          <button type="button" onClick={() => (setPoke((n) => n + 1), sfx("splash"))} aria-label={`Tap ${cr.name}`}>
            <CreatureView id={cr.id} size={190} stage={g.index} royal={g.royal} eating={eating} react={poke} />
          </button>
        </div>
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
            <span>{g.royal ? "Royal!" : g.stage.name}</span>
            <span className="flex items-center gap-1 text-sm text-[var(--l-ink-2)]">
              {g.next ? (
                <>
                  {g.next.name} in {g.toNext} <Pic art={ICON_ART.sprout} size={16} />
                </>
              ) : (
                "All grown up"
              )}
            </span>
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
                <Pic key={i} art={i < meals ? ICON_ART.heart : ICON_ART.heartEmpty} size={26} />
              ))}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {FOOD_ORDER.map((k) => (
              <Chunk key={k} tone="white" onClick={() => feed(k)} className={cn("flex flex-col items-center gap-0.5 py-2", (food[k] === 0 || meals >= MEALS_PER_DAY) && "opacity-55")} aria-label={`Feed ${FOODS[k].name}`}>
                <Pic art={FOOD_ART[k]} size={40} />
                <span className="font-display text-sm font-extrabold tabular-nums text-[var(--l-ink)]">×{food[k]}</span>
              </Chunk>
            ))}
          </div>
          {meals >= MEALS_PER_DAY && <p className="mt-2 font-display text-sm font-bold text-[var(--l-ink-2)]">Full and happy — more treats tomorrow!</p>}
        </div>
        <div className="flex w-full items-start gap-2 rounded-[20px] bg-[#e9f8ff] px-3 py-3 text-left">
          <SpeakerButton parts={[cr.fact]} size={40} />
          <p className="font-reading text-lg font-bold leading-snug text-[var(--l-ink)]">{cr.fact}</p>
        </div>
        <div className="mt-1 flex w-full flex-col gap-2">
          <Chunk tone={buddy ? "white" : "gold"} disabled={buddy} onClick={onBuddy} className="h-14 font-display text-xl font-extrabold">
            {buddy ? "Your buddy" : "Make my buddy"}
          </Chunk>
          <Chunk tone="white" onClick={() => (sfx("tap"), onClose())} className="h-12 font-display text-lg font-bold text-[var(--l-ink-2)]">
            Back to the tank
          </Chunk>
        </div>
      </div>
      {!reduced && (
        <div className="pointer-events-none fixed inset-0 z-[72] overflow-hidden" aria-hidden>
          {hearts.map((h) => (
            <span key={h.id} className="l-particle" style={{ left: h.x, top: h.y, "--dx": `${h.dx}px`, "--dy": `${h.dy}px`, "--r": `${h.r}deg`, "--s": h.s, "--d": `${h.d}ms` } as CSSProperties}>
              <Pic art={ICON_ART.heart} size={30} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Drawn hearts that fly out of a creature when it eats. */
function useHearts() {
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number; dx: number; dy: number; r: number; s: number; d: number }[]>([]);
  const n = useRef(0);
  const fireAt = (el: Element | null) => {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const id0 = (n.current += 10);
    const list = Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 60 + Math.random() * 70;
      return { id: id0 + i, x: r.left + r.width / 2, y: r.top + r.height / 2, dx: Math.cos(a) * dist, dy: Math.sin(a) * dist - 40, r: (Math.random() - 0.5) * 60, s: 0.7 + Math.random() * 0.6, d: 800 + Math.random() * 400 };
    });
    setHearts((h) => [...h, ...list]);
    window.setTimeout(() => setHearts((h) => h.filter((x) => x.id < id0 || x.id >= id0 + 10)), 1400);
  };
  return { hearts, fireAt };
}

// The egg's crack: a zig-zag around its middle (in the egg art's 72×90 box) that grows with each
// tap, and the two pieces of shell it splits into.
const ZIG: [number, number][] = [[2, 47], [10, 40], [17, 47], [24, 39], [31, 47], [38, 39], [45, 47], [52, 39], [59, 47], [66, 40], [70, 45]];
const zigPath = (from: number, to: number) => ZIG.slice(from, to + 1).map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
const CRACKS = [
  "",
  `${zigPath(3, 6)} M38 39 L36 32`,
  `${zigPath(1, 9)} M38 39 L36 32 M17 47 L15 54 M59 47 L62 55 M52 39 L54 33`,
];
const zigPct = ZIG.map(([x, y]) => `${((x / 72) * 100).toFixed(1)}% ${((y / 90) * 100).toFixed(1)}%`);
const SHELL_TOP = `polygon(0 0, 100% 0, 100% ${zigPct.at(-1)!.split(" ")[1]}, ${[...zigPct].reverse().join(", ")}, 0 ${zigPct[0].split(" ")[1]})`;
const SHELL_BOTTOM = `polygon(0 ${zigPct[0].split(" ")[1]}, ${zigPct.join(", ")}, 100% ${zigPct.at(-1)!.split(" ")[1]}, 100% 100%, 0 100%)`;
const CHIP_SHAPES = ["polygon(0 20%, 70% 0, 100% 60%, 30% 100%)", "polygon(10% 0, 100% 30%, 60% 100%, 0 70%)", "polygon(0 0, 100% 40%, 20% 100%)"];
type Chip = { id: string; x: number; y: number; dx: number; dy: number; r: number; s: number; k: number };
/** Bits of shell that fly off a tapped egg — a few per tap, a shower when it opens (only ever called from a tap). */
const shellChips = (tap: number, burst: boolean): Chip[] =>
  Array.from({ length: burst ? 16 : 6 }, (_, i) => {
    const a = burst ? (i / 16) * Math.PI * 2 + Math.random() * 0.4 : -Math.PI / 2 + (Math.random() - 0.5) * 2.6;
    const d = burst ? 90 + Math.random() * 70 : 45 + Math.random() * 45;
    return { id: `${tap}:${i}`, x: Math.cos(a) * 26, y: -8 + Math.sin(a) * 18, dx: Math.cos(a) * d, dy: Math.sin(a) * d - (burst ? 10 : 25), r: (Math.random() - 0.5) * 720, s: 0.6 + Math.random() * 0.8, k: i % CHIP_SHAPES.length };
  });

/** Tap the egg until it cracks open — then meet who hatched, alive. */
function HatchOverlay({ egg, seed, owned, accent, reduced, onHatched, onClose }: { egg: Egg; seed: string; owned: string[]; accent: string; reduced: boolean; onHatched: (c: Creature) => void; onClose: () => void }) {
  const [taps, setTaps] = useState(0);
  const [creature, setCreature] = useState<Creature | null>(null);
  const [chips, setChips] = useState<Chip[]>([]);
  const need = 3;
  const art = eggArt(egg.tier);
  const tint = EGG_COLORS[egg.tier];
  const tap = () => {
    if (creature) return;
    const n = taps + 1;
    setTaps(n);
    if (!reduced) setChips(shellChips(n, n >= need));
    if (n < need) {
      buzz(20);
      return sfx("hit");
    }
    buzz([0, 30, 40, 60]);
    const cr = hatchCreature(seed, egg.tier, owned);
    sfx(cr.rarity === "legendary" || cr.rarity === "epic" ? "legendary" : "sticker");
    setCreature(cr);
    onHatched(cr);
    window.setTimeout(() => void say([SAY.hatched, "~", cr.name]), 500);
  };
  const look = EGG_LOOK[egg.tier];
  const ring = creature ? CREATURE_RARITY_COLOR[creature.rarity] : look.color;
  // The light inside gets brighter with every crack.
  const glow = creature ? "66" : ["33", "55", "88"][Math.min(taps, 2)];
  const shell = (part: "top" | "bottom") => (
    <span className={cn("absolute inset-0", part === "top" ? "aq-shell-top" : "aq-shell-bottom")} style={{ clipPath: part === "top" ? SHELL_TOP : SHELL_BOTTOM }}>
      <Pic art={art} size={150} />
    </span>
  );
  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-[#0b2340]/65 p-6 backdrop-blur-sm">
      <div className="relative">{creature && !reduced && <Confetti count={creature.rarity === "legendary" ? 90 : 50} spread={460} accent={accent} />}</div>
      <div className="l-pop-in flex w-full max-w-lg flex-col items-center gap-4 rounded-[36px] bg-white p-8 text-center shadow-[0_12px_0_var(--l-line)]">
        <p className="font-display text-3xl font-extrabold text-[var(--l-ink)]">{creature ? `Meet ${creature.name}!` : `${look.name}!`}</p>
        <p className="font-display text-lg font-bold text-[var(--l-ink-2)]">{creature ? `A ${creature.rarity} ${creature.kind}` : egg.why}</p>
        <div className="relative flex h-[240px] w-[240px] items-center justify-center">
          <div className="absolute inset-0 rounded-full transition-[background] duration-300" style={{ background: `radial-gradient(circle, ${ring}${glow} 0%, transparent 65%)` }} />
          {creature && !reduced && <div className="l-rays absolute inset-[-30px] rounded-full opacity-60" style={{ background: "repeating-conic-gradient(rgba(255,255,255,0.7) 0deg 9deg, transparent 9deg 30deg)", WebkitMaskImage: "radial-gradient(circle, #000 30%, transparent 70%)", maskImage: "radial-gradient(circle, #000 30%, transparent 70%)" } as CSSProperties} />}
          {creature && !reduced && <span className="aq-flash pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 rounded-full bg-white" />}
          {creature ? (
            <>
              <span className="l-pop-in relative">
                <CreatureView id={creature.id} size={220} stage={0} />
              </span>
              {/* With reduced motion the shell just isn't there any more. */}
              {!reduced && (
                <span className="pointer-events-none absolute" style={{ width: 150, height: 188 }}>
                  {shell("bottom")}
                  {shell("top")}
                </span>
              )}
            </>
          ) : (
            <button type="button" onClick={tap} className="relative" aria-label="Tap the egg">
              <span key={taps} className={cn("relative block", taps > 0 ? !reduced && "aq-cracked" : !reduced && "l-chest")} style={{ width: 150, height: 188 }}>
                <Pic art={art} size={150} />
                {taps > 0 && (
                  <svg viewBox="0 0 72 90" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
                    {/* Light leaking out of the crack, under the crack itself. */}
                    <path d={CRACKS[Math.min(taps, 2)]} stroke="#fff7c2" strokeWidth="6" strokeOpacity="0.85" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <path d={CRACKS[Math.min(taps, 2)]} stroke="#2a2010" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
            </button>
          )}
          <span className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0" aria-hidden>
            {chips.map((c) => (
              <span
                key={c.id}
                className="aq-chip absolute block h-4 w-4"
                style={{ left: c.x, top: c.y, background: `linear-gradient(135deg, ${tint.a}, ${tint.c})`, clipPath: CHIP_SHAPES[c.k], "--dx": `${c.dx}px`, "--dy": `${c.dy}px`, "--r": `${c.r}deg`, "--s": c.s } as CSSProperties}
              />
            ))}
          </span>
        </div>
        {creature ? (
          <>
            <div className="flex items-start gap-2 rounded-[20px] bg-[#e9f8ff] px-3 py-3 text-left">
              <SpeakerButton parts={[creature.fact]} size={40} />
              <p className="font-reading text-lg font-bold leading-snug text-[var(--l-ink)]">{creature.fact}</p>
            </div>
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
