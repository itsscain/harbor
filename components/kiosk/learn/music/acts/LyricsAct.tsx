"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Part } from "@/lib/learn/audio";
import type { MHit, MTrack, Meter, Score } from "@/lib/learn/mus/types";
import { barBeats, near, noteColor, pulses } from "@/lib/learn/mus/theory";
import { activeDur } from "@/lib/learn/mus/score";
import { strongSyllables } from "@/lib/learn/mus/check";
import { playNote } from "@/lib/learn/mus/synth";
import { SAY } from "@/lib/learn/script";
import { buzz, sfx } from "@/lib/learn/sfx";
import { Chunk, useDrag, useShuffledApart } from "../../kit";
import { PromptRow, spoken, useLater, type ActProps } from "../../acts/common";
import { Glyph } from "../../art/Glyph";
import { usePlayer } from "../kit/player";
import { PlayButton, SoundOffNote } from "../kit/kit";
import { SymbolView } from "../kit/notation";

// Words in songs — the words have to fit the music.
//   fit     the tune is a row of note bubbles (high notes up, long notes with long tails), with an
//           empty box under each. Put the word parts in order — tap a tile (it goes in the next
//           box) or drag it to any box — then Check. Play sings it karaoke-style: a star bounces
//           from note to note and each word part lights up as it's sung.
//   stress  the word parts sit under a beat grid (the strong beats are the big circles). Tap the
//           ones that land on a strong beat; the music plays with the strong ones accented, so you
//           can hear them too. The truth comes from check.ts (strongSyllables), like the checker's.

type Lyr = ActProps<"lyrics">["act"];
const TRIES = 3;
const SUNG = 67; // a tune with no pitches is sung on one note

/** The strong beats inside one bar (beats from the bar line): the downbeat, the middle of 4/4,
 *  the second big pulse of 6/8 — the same rule as check.ts strongSyllables. */
function strongBeats(m: Meter): number[] {
  const ps = pulses(m);
  const out = [0];
  if (m[0] === 4 && m[1] === 4) out.push(2);
  if (m[1] === 8 && ps.length >= 2) out.push(ps[0]);
  return out;
}
/** The tune, sung by a choir over a soft piano. `strong` syllables are accented (the others sung
 *  gently); `count` adds the beat on sticks, strong beats louder. */
function lineScore(a: Lyr, strong: number[] | null, count: boolean): Score {
  const ps = a.pitches ?? a.syllables.map(() => SUNG);
  const notes = a.durs.map((d, i) => ({ p: ps[i] ?? SUNG, d, v: strong ? (strong.includes(i) ? 1 : 0.4) : 0.8 }));
  const tracks: MTrack[] = [
    { kind: "notes", inst: "choir", notes },
    { kind: "notes", inst: "piano", notes, vol: 0.5 },
  ];
  if (count) {
    const total = a.durs.reduce((s, d) => s + d, 0);
    const bar = barBeats(a.meter);
    const strongs = strongBeats(a.meter);
    const hits: MHit[] = [];
    for (let b0 = 0; b0 < total - 1e-6; b0 += bar) {
      let q = 0;
      for (const p of pulses(a.meter)) {
        if (b0 + q < total - 1e-6) hits.push({ t: b0 + q, k: "sticks", v: strongs.some((s) => near(s, q)) ? 0.8 : 0.35 });
        q += p;
      }
    }
    tracks.push({ kind: "drums", hits, vol: 0.8 });
  }
  return { bpm: a.bpm, meter: a.meter, tracks };
}
/** Smaller text for short (narrow) syllables. */
const sylSize = (share: number, little: boolean) => (share < 0.075 ? 20 : share < 0.11 ? 24 : little ? 30 : 28);
/** A word part's font: its usual size, shrunk to fit a narrow note (the tile is an `@container`). */
const sylFont = (text: string, share: number, little: boolean) => `clamp(13px, ${(100 / (Math.max(1, text.length) * 0.64)).toFixed(1)}cqw, ${sylSize(share, little)}px)`;

export function LyricsAct(props: ActProps<"lyrics">) {
  return props.act.mode === "stress" ? <Stress {...props} /> : <Fit {...props} />;
}

// ── Fit: each word part on its note ────────────────────────────────────────────────────────────
type Tile = { id: number; s: string };

function Fit({ act, fx, onDone }: ActProps<"lyrics">) {
  const player = usePlayer();
  const later = useLater();
  const voiced = fx.voice !== "keys";
  const little = fx.voice === "all";
  const n = act.syllables.length;
  const { parts, auto } = spoken(fx, act.say, act.prompt);
  const intro: Part[] = fx.firstTime && voiced ? [...parts, "~", SAY.lyricsFit] : parts;
  const tiles = useShuffledApart<Tile>(
    act.syllables.map((s, i) => ({ id: i, s })),
    fx.seed,
  );
  const sing = useMemo(() => lineScore(act, null, false), [act]);
  const [slots, setSlots] = useState<(number | null)[]>(() => act.syllables.map(() => null));
  const [locked, setLocked] = useState<boolean[]>(() => act.syllables.map(() => false));
  const [bad, setBad] = useState<{ idx: number[]; k: number } | null>(null);
  const [shown, setShown] = useState<number[]>([]);
  const [misses, setMisses] = useState(0);
  const [phase, setPhase] = useState<"fit" | "checking" | "done" | "reveal">("fit");
  const [note, setNote] = useState<string | null>(null);
  const [lifted, setLifted] = useState<number | null>(null);
  const finished = useRef(false);

  // The tune's shape: one column per syllable, as wide as its note is long.
  const total = act.durs.reduce((s, d) => s + d, 0);
  const shares = act.durs.map((d) => Math.max(0.55 / n, d / total));
  const sum = shares.reduce((s, w) => s + w, 0);
  const ws = shares.map((w) => (w / sum) * 100);
  const lefts = ws.map((_, i) => ws.slice(0, i).reduce((s, w) => s + w, 0));
  const ps = act.pitches;
  const lo = ps ? Math.min(...ps) : 0;
  const hi = ps ? Math.max(...ps, lo + 5) : 1;
  const B = little ? 40 : 34;
  const LANE = ps ? 112 : 64;
  const yOf = (i: number) => (ps ? (1 - (ps[i] - lo) / (hi - lo)) * (LANE - B) : (LANE - B) / 2);

  useEffect(() => {
    let alive = true;
    fx.setPrompt(intro);
    const t = window.setTimeout(() => {
      // Little readers hear the tune first, so they know how it goes.
      if (auto && intro.length) void fx.say(intro).then(() => alive && window.setTimeout(() => alive && player.play(sing), 250));
    }, 380);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
    // Asked once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doneOnce = (m: number) => {
    if (finished.current) return;
    finished.current = true;
    onDone(m);
  };
  const used = new Set(slots.filter((x): x is number => x !== null));
  const textAt = (i: number) => (slots[i] === null ? null : (tiles.find((t) => t.id === slots[i])?.s ?? null));
  const place = (tile: Tile, i: number) => {
    if (phase !== "fit" || locked[i]) return;
    setSlots((s) => s.map((x, j) => (j === i ? tile.id : x === tile.id ? null : x)));
    setNote(null);
    sfx("snap");
    buzz(12);
  };
  const tapTile = (tile: Tile) => {
    const i = slots.findIndex((x, j) => x === null && !locked[j]);
    if (i >= 0) place(tile, i);
  };
  const tapSlot = (i: number) => {
    if (phase === "fit" && slots[i] !== null && !locked[i]) {
      setSlots((s) => s.map((x, j) => (j === i ? null : x)));
      sfx("pop");
      return;
    }
    // An empty box sings its own note.
    playNote("choir", (ps ?? [])[i] ?? SUNG, Math.min(1.6, (act.durs[i] * 60) / act.bpm + 0.1), 0.8);
  };

  const playLine = (after?: () => void) => {
    if (player.playing && !after) {
      player.stop();
      return;
    }
    player.play(sing, { onEnd: after });
  };
  const celebrate = (m: number) => {
    later(() => playLine(() => later(() => doneOnce(m), 500)), 1300);
    later(() => doneOnce(m), 1300 + ((total * 60) / act.bpm) * 1000 + 4000);
  };
  const check = (el: HTMLElement) => {
    if (phase !== "fit") return;
    if (slots.some((x) => x === null)) {
      sfx("soft-fail");
      setNote("Put a word part in every box first!");
      return;
    }
    player.stop();
    const wrong = act.syllables.map((s, i) => (textAt(i) === s ? -1 : i)).filter((i) => i >= 0);
    if (!wrong.length) {
      setLocked(act.syllables.map(() => true));
      setPhase("done");
      setNote("Now sing along!");
      fx.right(el);
      celebrate(misses);
      return;
    }
    const m = misses + 1;
    setMisses(m);
    setLocked(locked.map((l, i) => l || !wrong.includes(i)));
    setBad((b) => ({ idx: wrong, k: (b?.k ?? 0) + 1 }));
    setPhase("checking");
    fx.miss();
    const line = "Some word parts are on the wrong notes. Play the tune and listen!";
    setNote(line);
    if (voiced) void fx.say(line);
    later(() => {
      setBad(null);
      if (m >= TRIES) {
        // Show it: every word part on its note, then sing it.
        const free = [...tiles];
        const right = act.syllables.map((s) => {
          const k = free.findIndex((t) => t.s === s);
          return k >= 0 ? free.splice(k, 1)[0].id : null;
        });
        setSlots(right);
        setLocked(act.syllables.map(() => true));
        setShown(wrong);
        setPhase("reveal");
        setNote("Here's how the words fit. Sing along!");
        celebrate(m);
      } else {
        setSlots((s) => s.map((x, i) => (wrong.includes(i) ? null : x)));
        setPhase("fit");
      }
    }, 1400);
  };

  const active = player.playing ? activeDur(act.durs, player.beat) : -1;
  const ball = active >= 0 ? active : null;
  return (
    <div className="relative flex w-full max-w-[1120px] flex-col items-center gap-3">
      <PromptRow parts={intro}>{act.prompt}</PromptRow>
      <SoundOffNote />
      <div className="flex w-full items-center gap-4 rounded-[30px] bg-white/95 px-4 py-4 shadow-[0_8px_0_rgba(0,40,80,0.14)]">
        <PlayButton size={little ? 96 : 84} playing={player.playing} onClick={() => playLine()} pulse={!player.playing && phase === "fit"} />
        <div className="relative min-w-0 flex-1 pt-7">
          {/* The bouncing star (karaoke) */}
          {ball !== null && (
            <span className="pointer-events-none absolute z-[3] -translate-x-1/2 transition-[left,top] duration-150 ease-out" style={{ left: `calc(${lefts[ball]}% + ${7 + B / 2}px)`, top: yOf(ball) - 4 }} aria-hidden>
              <span key={ball} className="l-hop block">
                <Glyph e="⭐" size={30} />
              </span>
            </span>
          )}
          <div className="flex w-full items-stretch">
            {act.syllables.map((_, i) => {
              const col = ps ? noteColor(ps[i]) : "#ff6fb5";
              const on = active === i;
              const txt = textAt(i);
              const share = ws[i] / 100;
              return (
                <div key={i} className="flex min-w-0 flex-col items-stretch px-[3px]" style={{ width: `${ws[i]}%` }}>
                  <div className="relative" style={{ height: LANE }}>
                    {act.durs[i] >= 1 && <span className="absolute h-3 rounded-full" style={{ left: 4 + B / 2, right: 2, top: yOf(i) + B / 2 - 6, background: col, opacity: on ? 0.9 : 0.45 }} aria-hidden />}
                    <span className={cn("absolute rounded-full border-[3px] border-[#2a2f45] transition-transform duration-100", on && "scale-125")} style={{ left: 4, top: yOf(i), width: B, height: B, background: col, boxShadow: on ? "0 0 0 4px #fff, 0 0 20px rgba(255,77,141,0.8)" : "0 3px 0 rgba(0,40,80,0.2)" }} aria-hidden />
                  </div>
                  <button
                    type="button"
                    data-drop="slot"
                    data-slot={i}
                    onClick={() => tapSlot(i)}
                    aria-label={txt ? `Box ${i + 1}: ${txt}` : `Box ${i + 1}: empty — hear its note`}
                    className={cn(
                      "@container relative mt-2 flex h-[70px] min-w-0 items-center justify-center rounded-[18px] px-1 transition-all duration-150",
                      txt ? (on ? "-translate-y-1 scale-105 bg-[#ff4d8d] text-white shadow-[0_5px_0_#c2306c]" : locked[i] ? "bg-white text-[var(--l-ink)] shadow-[0_5px_0_var(--l-green-edge)]" : "bg-white text-[var(--l-ink)] shadow-[0_5px_0_var(--l-line)]") : on ? "border-[4px] border-dashed border-[#ff4d8d] bg-[#ffe3f0]" : "border-[4px] border-dashed border-[#c9d6e2] bg-[#f2f8fc]",
                      shown.includes(i) && "l-hint",
                    )}
                  >
                    {txt && (
                      <span key={bad?.idx.includes(i) ? `b${bad.k}` : "ok"} className={cn("l-pop-in truncate font-reading font-bold leading-none", bad?.idx.includes(i) && "l-shake text-[var(--l-coral-edge)]")} style={{ fontSize: sylFont(txt, share, little) }}>
                        {txt}
                      </span>
                    )}
                    {bad?.idx.includes(i) && <Glyph e="❌" size={22} className="absolute -right-1.5 -top-2.5" />}
                    {txt && locked[i] && !bad?.idx.includes(i) && phase !== "done" && <Glyph e="✅" size={22} className="absolute -right-1.5 -top-2.5" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* The word parts */}
      <div className="flex min-h-[86px] w-full flex-wrap items-center justify-center gap-3">
        {tiles.map((t) =>
          used.has(t.id) ? (
            // The gap keeps the word's width, so the other words don't slide out from under a finger.
            <span key={t.id} className="flex h-[74px] min-w-[86px] items-center justify-center rounded-[20px] bg-black/10 px-4" aria-hidden>
              <span className="invisible font-reading font-bold leading-none" style={{ fontSize: little ? 34 : 30 }}>
                {t.s}
              </span>
            </span>
          ) : (
            <div key={t.id} className={cn("relative", lifted === t.id && "z-[60]")}>
              <WordTile
                tile={t}
                little={little}
                disabled={phase !== "fit"}
                onTap={() => tapTile(t)}
                onLift={() => {
                  sfx("lift");
                  setLifted(t.id);
                }}
                onDrop={(target) => {
                  setLifted(null);
                  const i = target?.dataset.slot !== undefined ? Number(target.dataset.slot) : NaN;
                  if (!Number.isNaN(i)) place(t, i);
                }}
              />
            </div>
          ),
        )}
      </div>
      {/* Check stays put; what it found sits beside it (a button never slides away from a finger). */}
      <div className="relative flex min-h-[70px] items-center justify-center">
        {phase === "fit" || phase === "checking" ? (
          <>
            <Chunk tone="green" onClick={(e) => check(e.currentTarget)} disabled={phase !== "fit"} className={cn("flex h-[68px] items-center gap-2 px-8 font-display text-2xl font-extrabold transition-opacity", slots.every((x) => x !== null) && phase === "fit" ? "l-pulse" : "opacity-70")}>
              <Check className="h-8 w-8" strokeWidth={3.5} /> Check
            </Chunk>
            {note && (
              <span key={note} className="l-pop-in absolute right-full top-1/2 mr-4 w-max max-w-[400px] -translate-y-1/2 rounded-[20px] bg-[var(--l-orange)] px-5 py-2 text-center font-display text-lg font-extrabold leading-tight text-white shadow-[0_4px_0_rgba(0,40,80,0.2)]">
                {note}
              </span>
            )}
            {misses > 0 && phase === "fit" && <span className="absolute left-full top-1/2 ml-4 -translate-y-1/2 whitespace-nowrap font-display text-base font-bold text-white/85">Try {misses + 1} of {TRIES}</span>}
          </>
        ) : (
          note && (
            <span key={note} className={cn("l-pop-in max-w-[560px] rounded-[20px] px-5 py-2 text-center font-display text-lg font-extrabold leading-tight text-white shadow-[0_4px_0_rgba(0,40,80,0.2)]", phase === "done" ? "bg-[var(--l-green)]" : "bg-[var(--l-violet)]")}>
              {note}
            </span>
          )
        )}
      </div>
    </div>
  );
}

function WordTile({ tile, little, disabled, onTap, onLift, onDrop }: { tile: Tile; little: boolean; disabled: boolean; onTap: () => void; onLift: () => void; onDrop: (t: HTMLElement | null) => void }) {
  const { handlers, dragging } = useDrag({ onTap, onLift, onDrop, disabled });
  return (
    <div
      {...handlers}
      data-dragging={dragging}
      role="button"
      aria-label={`word part ${tile.s}`}
      className={cn("l-drag l-chunk relative flex h-[74px] min-w-[86px] items-center justify-center px-4", disabled && "opacity-70")}
      style={{ "--f": "var(--l-card)", "--e": "#d9408f" } as CSSProperties}
    >
      <span className="font-reading font-bold leading-none text-[var(--l-ink)]" style={{ fontSize: little ? 34 : 30 }}>
        {tile.s}
      </span>
    </div>
  );
}

// ── Stress: which word parts land on the strong beats? ────────────────────────────────────────
function Stress({ act, fx, onDone }: ActProps<"lyrics">) {
  const player = usePlayer();
  const later = useLater();
  const voiced = fx.voice !== "keys";
  const little = fx.voice === "all";
  const { parts, auto } = spoken(fx, act.say, act.prompt);
  const intro: Part[] = fx.firstTime && voiced ? [...parts, "~", SAY.lyricsStress] : parts;
  const truth = useMemo(() => strongSyllables(act.durs, act.meter), [act]);
  const sing = useMemo(() => lineScore(act, truth, true), [act, truth]);
  const [picked, setPicked] = useState<number[]>([]);
  const [bad, setBad] = useState<{ idx: number[]; k: number } | null>(null);
  const [misses, setMisses] = useState(0);
  const [phase, setPhase] = useState<"listen" | "pick" | "checking" | "done" | "reveal">("listen");
  const [note, setNote] = useState<string | null>(null);
  const finished = useRef(false);

  // The timeline: whole bars, each beat a marker (strong ones big), each syllable under its beat.
  const bar = barBeats(act.meter);
  const total = act.durs.reduce((s, d) => s + d, 0);
  const span = Math.max(bar, Math.ceil(total / bar - 1e-6) * bar);
  const x = (t: number) => (t / span) * 100;
  const onsets = act.durs.map((_, i) => act.durs.slice(0, i).reduce((s, d) => s + d, 0));
  const strongs = strongBeats(act.meter);
  const marks: { t: number; strong: boolean; n: number; len: number }[] = [];
  for (let b0 = 0; b0 < span - 1e-6; b0 += bar) {
    let q = 0;
    pulses(act.meter).forEach((p, k) => {
      marks.push({ t: b0 + q, strong: strongs.some((s) => near(s, q)), n: k + 1, len: p });
      q += p;
    });
  }

  const wake = () => setPhase((p) => (p === "listen" ? "pick" : p));
  useEffect(() => {
    let alive = true;
    fx.setPrompt(intro);
    const go = () => alive && player.play(sing, { onEnd: () => alive && wake() });
    const t = window.setTimeout(() => {
      if (auto && intro.length) void fx.say(intro).then(() => window.setTimeout(go, 250));
      else go();
    }, 380);
    const cap = window.setTimeout(() => alive && wake(), 20000);
    return () => {
      alive = false;
      window.clearTimeout(t);
      window.clearTimeout(cap);
    };
    // Asked once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doneOnce = (m: number) => {
    if (finished.current) return;
    finished.current = true;
    onDone(m);
  };
  const toggle = (i: number) => {
    if (phase !== "pick") return;
    setNote(null);
    if (picked.includes(i)) {
      setPicked(picked.filter((k) => k !== i));
      sfx("pop");
    } else {
      setPicked([...picked, i]);
      sfx("snap");
      buzz(10);
    }
  };
  const playLine = () => {
    wake();
    if (player.playing) player.stop();
    else player.play(sing);
  };
  const celebrate = (m: number) => {
    later(() => player.play(sing, { onEnd: () => later(() => doneOnce(m), 400) }), 1300);
    later(() => doneOnce(m), 1300 + ((span * 60) / act.bpm) * 1000 + 4000);
  };
  const check = (el: HTMLElement) => {
    if (phase !== "pick") return;
    if (!picked.length) {
      sfx("soft-fail");
      setNote("Tap the word parts that land on the big beats first!");
      return;
    }
    player.stop();
    const extra = picked.filter((i) => !truth.includes(i));
    const missing = truth.filter((i) => !picked.includes(i));
    if (!extra.length && !missing.length) {
      setPhase("done");
      setNote("Strong beats, strong words!");
      fx.right(el);
      celebrate(misses);
      return;
    }
    const m = misses + 1;
    setMisses(m);
    setBad((b) => ({ idx: extra, k: (b?.k ?? 0) + 1 }));
    setPhase("checking");
    fx.miss();
    const line = extra.length && missing.length ? "Some of those aren't on a big beat — and one big beat is missing. Listen for the loud ones!" : extra.length ? (extra.length === 1 ? "One of those isn't on a big beat. Look at the circles!" : "Some of those aren't on a big beat. Look at the circles!") : "There's another strong one. Listen for the loud words!";
    setNote(line);
    if (voiced) void fx.say(line);
    later(() => {
      setBad(null);
      if (m >= TRIES) {
        setPicked(truth);
        setPhase("reveal");
        setNote("These land on the strong beats. Listen!");
        celebrate(m);
      } else {
        setPicked((p) => p.filter((i) => truth.includes(i)));
        setPhase("pick");
      }
    }, 1400);
  };

  const b = player.playing ? player.beat : null;
  const active = activeDur(act.durs, b);
  const beatOn = b === null || b < 0 ? -1 : marks.findIndex((mk) => b >= mk.t - 1e-6 && b < mk.t + mk.len - 1e-6);
  const guides = misses >= 2 || phase === "reveal";
  const awake = phase === "pick";
  return (
    <div className="relative flex w-full max-w-[1120px] flex-col items-center gap-3">
      <PromptRow parts={intro}>{act.prompt}</PromptRow>
      <SoundOffNote />
      <div className="flex w-full items-center gap-4 rounded-[30px] bg-white/95 px-4 py-4 shadow-[0_8px_0_rgba(0,40,80,0.14)]">
        <PlayButton size={little ? 96 : 84} playing={player.playing} onClick={playLine} pulse={awake && !player.playing} />
        <div className="relative min-w-0 flex-1">
          {/* The beat grid */}
          <div className="relative h-[64px]">
            {Array.from({ length: Math.round(span / bar) + 1 }, (_, k) => (
              <span key={k} className="absolute top-1 h-[56px] w-[3px] -translate-x-1/2 rounded-full bg-[#2a2f45]/35" style={{ left: `${x(k * bar)}%` }} aria-hidden />
            ))}
            {marks.map((mk, k) => {
              const s = mk.strong ? (little ? 50 : 44) : 26;
              const on = beatOn === k;
              return (
                <span
                  key={k}
                  className={cn("absolute top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full border-[3px] font-display font-extrabold transition-transform duration-100", on && "scale-125")}
                  style={{ left: `calc(${x(mk.t)}% + 6px)`, width: s, height: s, background: mk.strong ? (on ? "#ff4d8d" : "#ffc0dc") : on ? "#8b6cff" : "#eef3f8", borderColor: mk.strong ? "#d9408f" : "#b9c7d6", color: mk.strong ? (on ? "#fff" : "#a8306e") : "#6b7c90", fontSize: mk.strong ? 20 : 13, boxShadow: on ? "0 0 18px rgba(255,77,141,0.7)" : undefined }}
                  aria-hidden
                >
                  {mk.n}
                </span>
              );
            })}
          </div>
          {/* Guides from the strong beats down to the words */}
          <div className="pointer-events-none relative h-5" aria-hidden>
            {marks
              .filter((mk) => mk.strong)
              .map((mk, k) => (
                <span key={k} className={cn("absolute inset-y-0 border-l-[3px] border-dotted", guides ? "border-[var(--l-gold-edge)]" : "border-[#d9408f]/30")} style={{ left: `calc(${x(mk.t)}% + ${6 + (little ? 50 : 44) / 2 - 1}px)` }} />
              ))}
          </div>
          {/* The word parts, each under its beat */}
          <div className="relative h-[86px]">
            {act.syllables.map((syl, i) => {
              const on = active === i;
              const isPicked = picked.includes(i);
              const wrong = bad?.idx.includes(i);
              const right = (phase === "done" || phase === "reveal") && truth.includes(i);
              const w = x(act.durs[i]);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggle(i)}
                  disabled={!awake}
                  aria-pressed={isPicked}
                  aria-label={`${syl}${isPicked ? ", strong" : ""}`}
                  className={cn("@container absolute top-3 flex h-[70px] items-center justify-center rounded-[18px] border-[3px] px-1 transition-all duration-150", on && "-translate-y-1 scale-105", !awake && !right && "cursor-default")}
                  style={{
                    left: `calc(${x(onsets[i])}% + 3px)`,
                    width: `calc(${w}% - 6px)`,
                    background: on ? "#ff4d8d" : right || isPicked ? "#ffc83d" : "#ffffff",
                    borderColor: wrong ? "#df5444" : right ? "#25a552" : isPicked ? "#e0a21a" : "#dbe8f1",
                    boxShadow: on ? "0 5px 0 #c2306c, 0 0 20px rgba(255,77,141,0.6)" : right ? "0 5px 0 #25a552" : "0 5px 0 rgba(0,40,80,0.16)",
                  }}
                >
                  {(isPicked || right) && (
                    <span className="absolute -top-4 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-white shadow-[0_2px_0_rgba(0,40,80,0.2)]">
                      <SymbolView sym="accent" size={26} />
                    </span>
                  )}
                  <span key={wrong ? `b${bad?.k}` : "ok"} className={cn("truncate font-reading font-bold leading-none", wrong && "l-shake", on ? "text-white" : "text-[var(--l-ink)]")} style={{ fontSize: sylFont(syl, act.durs[i] / span, little) }}>
                    {syl}
                  </span>
                  {wrong && <Glyph e="❌" size={22} className="absolute -right-2 -top-2.5" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <span className="flex items-center gap-2 font-display text-lg font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.25)]">
        <span className="inline-block h-7 w-7 rounded-full border-[3px] border-[#d9408f] bg-[#ffc0dc]" aria-hidden /> {little ? "Big circle = strong beat" : "Big circles are the strong beats — tap the word parts that start on one."}
      </span>
      {/* Check stays put; what it found sits beside it (a button never slides away from a finger). */}
      <div className="relative flex min-h-[70px] items-center justify-center">
        {phase === "pick" || phase === "checking" || phase === "listen" ? (
          <>
            <Chunk tone="green" onClick={(e) => check(e.currentTarget)} disabled={phase !== "pick"} className={cn("flex h-[68px] items-center gap-2 px-8 font-display text-2xl font-extrabold transition-opacity", picked.length && awake ? "l-pulse" : "opacity-70")}>
              <Check className="h-8 w-8" strokeWidth={3.5} /> Check
            </Chunk>
            {note && (
              <span key={note} className="l-pop-in absolute right-full top-1/2 mr-4 w-max max-w-[400px] -translate-y-1/2 rounded-[20px] bg-[var(--l-orange)] px-5 py-2 text-center font-display text-lg font-extrabold leading-tight text-white shadow-[0_4px_0_rgba(0,40,80,0.2)]">
                {note}
              </span>
            )}
            {misses > 0 && phase === "pick" && <span className="absolute left-full top-1/2 ml-4 -translate-y-1/2 whitespace-nowrap font-display text-base font-bold text-white/85">Try {misses + 1} of {TRIES}</span>}
          </>
        ) : (
          note && (
            <span key={note} className={cn("l-pop-in max-w-[560px] rounded-[20px] px-5 py-2 text-center font-display text-lg font-extrabold leading-tight text-white shadow-[0_4px_0_rgba(0,40,80,0.2)]", phase === "done" ? "bg-[var(--l-green)]" : "bg-[var(--l-violet)]")}>
              {note}
            </span>
          )
        )}
      </div>
    </div>
  );
}
