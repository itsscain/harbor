"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import type { Hatch } from "@/lib/learn/progress";
import { CREATURE_BY_ID, CREATURE_RARITY_COLOR, EGG_LOOK, growth, hatchCreature, type Creature, type Egg } from "@/lib/learn/reef";
import { SAY } from "@/lib/learn/script";
import { say } from "@/lib/learn/audio";
import { sfx, buzz } from "@/lib/learn/sfx";
import { Confetti } from "../Confetti";
import { Chunk } from "./kit";

// My Reef: the aquarium. Creatures drift back and forth (turning to face the way they swim),
// bob, and do a happy spin when tapped; light ripples down through the water and bubbles rise.
// Eggs the child has earned wait in the nest below — tap one and tap again until it cracks open.
// Pick a buddy to ride along in lessons. Creatures grow up as the child keeps learning.

export function Reef({ hatched, xp, eggs, buddy, childId, reduced, accent, autoHatch, onHatch, onBuddy }: { hatched: Hatch[]; xp: number; eggs: Egg[]; buddy: string | null; childId: string; reduced: boolean; accent: string; autoHatch?: string; onHatch: (egg: Egg, creature: Creature) => void; onBuddy: (id: string) => void }) {
  const [open, setOpen] = useState<Hatch | null>(null);
  const [hatching, setHatching] = useState<Egg | null>(() => (autoHatch ? (eggs.find((e) => e.id === autoHatch) ?? eggs[0] ?? null) : null));
  const owned = hatched.map((h) => h.creature);
  const buddyId = buddy ?? hatched[0]?.creature ?? null;
  // Stable swim lanes: spread creatures over the water, each with its own pace.
  const swimmers = useMemo(
    () =>
      hatched.map((h, i) => {
        const k = (i * 7919) % 97;
        return { h, top: 10 + ((i * 37 + 13) % 58), dur: 15 + (k % 11), delay: -((k * 1.7) % 20), x0: 2 + (k % 10), x1: 72 + (k % 14) };
      }),
    [hatched],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="reef-tank relative h-[min(58dvh,520px)] w-full overflow-hidden rounded-[34px] shadow-[0_10px_0_rgba(0,40,80,0.2)]" style={{ containerType: "inline-size" } as CSSProperties}>
        {!reduced && <div className="reef-rays pointer-events-none absolute inset-0" aria-hidden />}
        {!reduced && <Bubbles />}
        {/* Sand and plants */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[16%] rounded-b-[34px] bg-gradient-to-b from-[#f3dba6] to-[#e5c27c]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-[5%] flex justify-between px-[4%] text-[54px] leading-none" aria-hidden>
          {["🌿", "🪨", "🐚", "🌿", "⚓", "🌿", "🪨", "🌿"].map((e, i) => (
            <span key={i} className={cn(!reduced && e === "🌿" && "l-sway")} style={{ animationDelay: `${i * 0.4}s`, fontSize: e === "🌿" ? 64 : 40 }}>
              {e}
            </span>
          ))}
        </div>

        {swimmers.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            <span className={cn("text-[96px] leading-none", !reduced && "l-bob")}>🥚</span>
            <p className="max-w-[520px] font-display text-3xl font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,30,60,0.35)]">Your reef is waiting!</p>
            <p className="max-w-[560px] font-display text-xl font-bold text-white/90">Finish islands, keep your streak, and learn verses and skills to earn eggs. Each one hatches a new friend.</p>
          </div>
        )}

        {swimmers.map(({ h, top, dur, delay, x0, x1 }) => {
          const cr = CREATURE_BY_ID.get(h.creature);
          if (!cr) return null;
          const g = growth(xp, h);
          const style = { top: `${top}%`, "--x0": x0, "--x1": x1, "--dur": `${dur}s`, animationDelay: `${delay}s` } as CSSProperties;
          return (
            <button key={h.egg} type="button" onClick={() => (sfx("splash"), setOpen(h))} className={cn("absolute left-0", reduced ? "" : "reef-swim")} style={reduced ? { top: `${top}%`, left: `${x0 + ((x1 - x0) * (h.egg.length % 7)) / 7}%` } : style} aria-label={`${cr.name} the ${cr.kind}`}>
              <span className={cn("relative block", !reduced && "reef-face")} style={{ animationDelay: `${delay}s`, "--dur": `${dur}s` } as CSSProperties}>
                <span className={cn("block select-none leading-none drop-shadow-[0_6px_6px_rgba(0,30,60,0.25)]", !reduced && "l-bob")} style={{ fontSize: 76 * g.stage.scale, filter: cr.tint }}>
                  {cr.emoji}
                </span>
              </span>
              {g.royal && <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl">👑</span>}
              {buddyId === h.creature && <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--l-gold)] px-2 font-display text-xs font-extrabold text-[#5a3b00]">⭐ Buddy</span>}
            </button>
          );
        })}
      </div>

      {/* The nest */}
      <div className="flex flex-wrap items-center gap-3 rounded-[26px] bg-white/92 px-5 py-4 shadow-[0_6px_0_var(--l-line)]">
        <span className="font-display text-2xl font-extrabold text-[var(--l-ink)]">{eggs.length ? `🥚 ${eggs.length} egg${eggs.length === 1 ? "" : "s"} to hatch!` : "🥚 No eggs right now"}</span>
        <span className="font-display text-lg font-bold text-[var(--l-ink-2)]">{eggs.length ? "Tap one!" : "Finish an island or learn a verse to find one."}</span>
        <div className="ml-auto flex flex-wrap gap-3">
          {eggs.slice(0, 6).map((e, i) => (
            <button key={e.id} type="button" onClick={() => (sfx("pick"), setHatching(e))} className={cn("relative flex h-20 w-20 items-center justify-center rounded-full bg-[var(--l-card-2)] text-[48px]", !reduced && "l-chest")} style={{ boxShadow: `0 0 0 4px ${EGG_LOOK[e.tier].color}`, animationDelay: `${i * 0.25}s` }} aria-label={`Hatch a ${EGG_LOOK[e.tier].name}`}>
              <span style={{ filter: e.tier === "golden" ? "sepia(1) saturate(4) hue-rotate(5deg)" : e.tier === "rare" ? "hue-rotate(110deg) saturate(2)" : undefined }}>🥚</span>
            </button>
          ))}
        </div>
      </div>

      {open && <CreatureCard h={open} xp={xp} buddy={buddyId === open.creature} onBuddy={() => (onBuddy(open.creature), sfx("star"), void say(SAY.buddyGrew), setOpen(null))} onClose={() => setOpen(null)} />}
      {hatching && <HatchOverlay egg={hatching} seed={`${childId}:${hatching.id}`} owned={owned} accent={accent} reduced={reduced} onHatched={(cr) => onHatch(hatching, cr)} onClose={() => setHatching(null)} />}
    </div>
  );
}

function Bubbles() {
  const list = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ x: (i * 53) % 96, s: 6 + (i % 4) * 4, d: 7 + (i % 5) * 2, delay: -(i * 1.3) })), []);
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {list.map((b, i) => (
        <span key={i} className="reef-bubble absolute bottom-[-20px] rounded-full border-2 border-white/70 bg-white/20" style={{ left: `${b.x}%`, width: b.s, height: b.s, animationDuration: `${b.d}s`, animationDelay: `${b.delay}s` }} />
      ))}
    </div>
  );
}

function CreatureCard({ h, xp, buddy, onBuddy, onClose }: { h: Hatch; xp: number; buddy: boolean; onBuddy: () => void; onClose: () => void }) {
  const cr = CREATURE_BY_ID.get(h.creature)!;
  const g = growth(xp, h);
  const pct = g.next ? Math.min(100, (g.gained - g.stage.at) / (g.next.at - g.stage.at) * 100) : 100;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0b2340]/55 p-6 backdrop-blur-sm" onClick={onClose}>
      <div className="l-pop-in flex w-full max-w-md flex-col items-center gap-3 rounded-[34px] bg-white p-7 text-center shadow-[0_10px_0_var(--l-line)]" onClick={(e) => e.stopPropagation()}>
        <span className="l-boing text-[120px] leading-none" style={{ filter: cr.tint }}>
          {cr.emoji}
        </span>
        <p className="font-display text-3xl font-extrabold text-[var(--l-ink)]">{cr.name}</p>
        <p className="flex items-center gap-2 font-display text-lg font-bold text-[var(--l-ink-2)]">
          {cr.kind}
          <span className="rounded-full px-2.5 py-0.5 text-sm font-extrabold capitalize text-white" style={{ background: CREATURE_RARITY_COLOR[cr.rarity] }}>
            {cr.rarity}
          </span>
        </p>
        <div className="w-full rounded-[20px] bg-[var(--l-card-2)] px-4 py-3">
          <div className="flex items-center justify-between font-display font-bold text-[var(--l-ink)]">
            <span>{g.royal ? "👑 Royal!" : `${g.stage.name}`}</span>
            <span className="text-sm text-[var(--l-ink-2)]">{g.next ? `${g.next.name} in ${g.toNext} XP` : "All grown up"}</span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-[var(--l-teal)]" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1.5 text-left font-display text-sm font-bold text-[var(--l-ink-2)]">Every level you pass helps your whole reef grow.</p>
        </div>
        <p className="rounded-[20px] bg-[#e9f8ff] px-4 py-3 text-left font-reading text-lg font-bold leading-snug text-[var(--l-ink)]">🔬 {cr.fact}</p>
        <div className="mt-1 flex w-full flex-col gap-2">
          <Chunk tone={buddy ? "white" : "gold"} disabled={buddy} onClick={onBuddy} className="h-14 font-display text-xl font-extrabold">
            {buddy ? "⭐ Your buddy" : "⭐ Make my buddy"}
          </Chunk>
          <Chunk tone="white" onClick={() => (sfx("tap"), onClose())} className="h-12 font-display text-lg font-bold text-[var(--l-ink-2)]">
            Back to the reef
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
    window.setTimeout(() => void say(SAY.hatched), 500);
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
              <span key={taps} className={cn("block text-[150px] leading-none", taps > 0 ? "l-hit" : !reduced && "l-chest")} style={{ filter: egg.tier === "golden" ? "sepia(1) saturate(4) hue-rotate(5deg)" : egg.tier === "rare" ? "hue-rotate(110deg) saturate(2)" : undefined }}>
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
              Welcome to the reef!
            </Chunk>
          </>
        ) : (
          <p className="l-pulse font-display text-xl font-bold text-[var(--l-ink-2)]">Tap the egg! {taps > 0 ? `${need - taps} more…` : ""}</p>
        )}
      </div>
    </div>
  );
}
