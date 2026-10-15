"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Part } from "@/lib/learn/audio";
import type { Score } from "@/lib/learn/mus/types";
import { retime, scoreBeats, then } from "@/lib/learn/mus/score";
import { SAY } from "@/lib/learn/script";
import { buzz, sfx } from "@/lib/learn/sfx";
import { Chunk, useDrag, useShuffled } from "../../kit";
import { ChoiceTile, Hearable, PromptRow, spoken, tileState, useChoice, useLater, type ActProps } from "../../acts/common";
import { Glyph, WithGlyphs } from "../../art/Glyph";
import { usePlayer } from "../kit/player";
import { MiniPlay, PlayButton, SoundOffNote } from "../kit/kit";
import { FormBlocks, sectionColor } from "../kit/visual";

// Song form: a piece is built from parts (A, B, C… or verse and chorus), and some parts come back.
// The song plays and a row of blocks lights up part by part, so you can SEE the shape you hear.
//   build  every block starts as "?" — tap one to hear just that part, then tap (or drag) the
//          letter it matches into it. Check when they're all filled: right parts lock in, wrong ones
//          hop out to be heard again; after three tries the form is shown and played.
//   label  listen, then pick the form ("AB", "ABA", "ABACA"…) from tiles drawn as colored blocks.

type Form = ActProps<"form">["act"];
type Playing = { kind: "all" } | { kind: "slot"; i: number } | { kind: "pal"; k: string } | null;

const TRIES = 3;
/** A breath between the parts of the song (beats). */
const GAP = 0.5;
const nice = (k: string) => (k.length > 1 ? k[0].toUpperCase() + k.slice(1) : k);
const isLetters = (s: string) => /^[A-Za-z]{1,10}$/.test(s);

/** The parts played in order, and where each one starts and ends (beats into the song). */
function pieceOf(order: string[], sections: Record<string, Score>) {
  const ss = order.map((k) => sections[k]);
  let acc = ss[0];
  const starts = [0];
  for (let i = 1; i < ss.length; i++) {
    starts.push(scoreBeats(acc) + GAP);
    acc = then(acc, ss[i], GAP);
  }
  const ends = ss.map((s, i) => starts[i] + scoreBeats(retime(s, ss[0].bpm)));
  return { score: acc, starts, ends };
}
function partAt(starts: number[], ends: number[], b: number | null): number {
  if (b === null || b < 0) return -1;
  for (let i = starts.length - 1; i >= 0; i--) if (b >= starts[i] - 1e-6) return b < ends[i] + GAP ? i : -1;
  return -1;
}

export function FormAct(props: ActProps<"form">) {
  return props.act.mode === "label" ? <LabelForm {...props} /> : <BuildForm {...props} />;
}

/** What's sounding, for the blocks: which part is lit and how far through it. */
function useFormPlayer(act: Form) {
  const player = usePlayer();
  const piece = useMemo(() => pieceOf(act.order, act.sections), [act]);
  const lens = useMemo(() => Object.fromEntries(Object.entries(act.sections).map(([k, s]) => [k, scoreBeats(s)])), [act]);
  const [what, setWhat] = useState<Playing>(null);
  const same = (a: Playing, b: Playing) => JSON.stringify(a) === JSON.stringify(b);
  const play = (w: Exclude<Playing, null>, onEnd?: () => void) => {
    if (player.playing && same(what, w)) {
      player.stop();
      setWhat(null);
      return;
    }
    const s = w.kind === "all" ? piece.score : w.kind === "slot" ? act.sections[act.order[w.i]] : act.sections[w.k];
    setWhat(w);
    player.play(s, {
      onEnd: () => {
        setWhat((cur) => (same(cur, w) ? null : cur));
        onEnd?.();
      },
    });
  };
  const stop = () => {
    player.stop();
    setWhat(null);
  };
  const b = player.playing ? player.beat : null;
  let lit = -1;
  let frac = 0;
  if (what?.kind === "all") {
    lit = partAt(piece.starts, piece.ends, b);
    if (lit >= 0 && b !== null) frac = (b - piece.starts[lit]) / Math.max(0.01, piece.ends[lit] - piece.starts[lit]);
  } else if (what?.kind === "slot" && b !== null) {
    lit = what.i;
    frac = b / Math.max(0.01, lens[act.order[what.i]] ?? 1);
  }
  const pal = what?.kind === "pal" && player.playing ? what.k : null;
  return { player, play, stop, what, lit, frac: Math.max(0, Math.min(1, frac)), pal, all: what?.kind === "all" && player.playing };
}

/** Ask, then play the whole song once (the parts wake when it's been heard). */
function useIntro(fx: ActProps<"form">["fx"], intro: Part[], auto: boolean, playAll: (then: () => void) => void, wake: () => void) {
  useEffect(() => {
    let alive = true;
    fx.setPrompt(intro);
    const go = () => alive && playAll(() => alive && wake());
    const t = window.setTimeout(() => {
      if (auto && intro.length) void fx.say(intro).then(() => window.setTimeout(go, 250));
      else go();
    }, 380);
    // Never keep the answers asleep for long.
    const cap = window.setTimeout(() => alive && wake(), 30000);
    return () => {
      alive = false;
      window.clearTimeout(t);
      window.clearTimeout(cap);
    };
    // Asked once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ── Build: fill the "?" blocks ─────────────────────────────────────────────────────────────────
function BuildForm({ act, fx, onDone }: ActProps<"form">) {
  const fp = useFormPlayer(act);
  const later = useLater();
  const voiced = fx.voice !== "keys";
  const little = fx.voice === "all";
  const keys = Object.keys(act.sections);
  const n = act.order.length;
  const { parts, auto } = spoken(fx, act.say, act.prompt);
  const intro: Part[] = fx.firstTime && voiced ? [...parts, "~", SAY.formHow] : parts;
  const [slots, setSlots] = useState<(string | null)[]>(() => act.order.map(() => null));
  const [locked, setLocked] = useState<boolean[]>(() => act.order.map(() => false));
  const [cursor, setCursor] = useState(0);
  const [bad, setBad] = useState<{ idx: number[]; k: number } | null>(null);
  const [shown, setShown] = useState<number[]>([]);
  const [misses, setMisses] = useState(0);
  const [phase, setPhase] = useState<"listen" | "build" | "checking" | "done" | "reveal">("listen");
  const [note, setNote] = useState<string | null>(null);
  const [lifted, setLifted] = useState<string | null>(null);
  const finished = useRef(false);
  const doneOnce = (m: number) => {
    if (finished.current) return;
    finished.current = true;
    onDone(m);
  };
  /** The parts wake once the song's been heard — or as soon as the child starts exploring it. */
  const wake = () => setPhase((p) => (p === "listen" ? "build" : p));

  useIntro(fx, intro, auto, (go) => fp.play({ kind: "all" }, go), wake);

  const say = (text: string) => {
    setNote(text);
    if (voiced) void fx.say(text);
  };
  const nextOpen = (from: number, filled: (string | null)[]) => {
    for (let d = 1; d <= n; d++) {
      const j = (from + d) % n;
      if (!filled[j] && !locked[j]) return j;
    }
    return from;
  };
  const place = (k: string, i: number) => {
    if (phase !== "build" || locked[i]) return;
    const next = slots.map((x, j) => (j === i ? k : x));
    setSlots(next);
    setCursor(nextOpen(i, next));
    setNote(null);
    sfx("snap");
    buzz(12);
  };
  const tapPal = (k: string) => {
    if (phase !== "build") return;
    const i = locked[cursor] ? nextOpen(cursor, slots) : cursor;
    place(k, i);
  };
  const tapSlot = (i: number) => {
    if (phase === "listen") wake();
    if ((phase === "build" || phase === "listen") && !locked[i]) setCursor(i);
    fp.play({ kind: "slot", i });
  };

  const finish = (m: number) => {
    // Hear the whole form with every block lit, then move on.
    later(() => fp.play({ kind: "all" }, () => later(() => doneOnce(m), 300)), 1500);
    later(() => doneOnce(m), 11000);
  };
  const check = (el: HTMLElement) => {
    if (phase !== "build") return;
    if (slots.some((x) => !x)) {
      sfx("soft-fail");
      setNote("Fill every block first!");
      return;
    }
    fp.stop();
    const wrong = act.order.map((k, i) => (slots[i] === k ? -1 : i)).filter((i) => i >= 0);
    if (!wrong.length) {
      setLocked(act.order.map(() => true));
      setPhase("done");
      setNote(null);
      fx.right(el, voiced ? [act.order.map(nice).join(", ")] : []);
      finish(misses);
      return;
    }
    const m = misses + 1;
    setMisses(m);
    setLocked(locked.map((l, i) => l || !wrong.includes(i)));
    setBad((b) => ({ idx: wrong, k: (b?.k ?? 0) + 1 }));
    setPhase("checking");
    fx.miss();
    say(wrong.length === 1 ? `Listen to part ${wrong[0] + 1} again!` : `Listen to parts ${wrong.map((i) => i + 1).join(" and ")} again!`);
    later(() => {
      setBad(null);
      if (m >= TRIES) {
        setSlots([...act.order]);
        setLocked(act.order.map(() => true));
        setShown(wrong);
        setPhase("reveal");
        say(`This song goes ${act.order.map(nice).join(" – ")}. Listen!`);
        finish(m);
      } else {
        setSlots((s) => s.map((x, i) => (wrong.includes(i) ? null : x)));
        setCursor(wrong[0]);
        setPhase("build");
      }
    }, 1400);
  };

  const awake = phase === "build";
  const wordy = keys.some((k) => k.length > 2);
  const size = wordy ? (n > 5 ? 72 : 84) : little ? 104 : n > 6 ? 82 : 94;
  const palSize = wordy ? (keys.length > 4 ? 66 : 76) : little ? 96 : 84;
  return (
    <div className="relative flex w-full max-w-[1100px] flex-col items-center gap-3">
      <PromptRow parts={intro}>{act.prompt}</PromptRow>
      <SoundOffNote />
      <div className="flex w-full max-w-full items-center gap-5 rounded-[30px] bg-white/95 px-5 py-4 shadow-[0_8px_0_rgba(0,40,80,0.14)]">
        <PlayButton size={little ? 100 : 88} playing={fp.all} onClick={() => (wake(), fp.play({ kind: "all" }))} pulse={awake && !fp.player.playing} />
        <div className="flex min-w-0 flex-1 flex-wrap items-start justify-center gap-3">
          {act.order.map((_, i) => {
            const k = slots[i];
            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  data-drop="slot"
                  data-slot={i}
                  onClick={() => tapSlot(i)}
                  aria-label={k ? `Part ${i + 1}: ${nice(k)}` : `Part ${i + 1}: hear it`}
                  className={cn("relative rounded-[22px] transition-transform duration-150", fp.lit === i && "scale-110", awake && cursor === i && !locked[i] && "outline outline-[5px] outline-offset-4 outline-[var(--l-gold)]", shown.includes(i) && "l-hint")}
                >
                  <Block k={k} size={size} wordy={wordy} lit={fp.lit === i} frac={fp.lit === i ? fp.frac : 0} empty={!k} locked={locked[i]} bad={bad?.idx.includes(i) ? bad.k : 0} playing={fp.lit === i} />
                </button>
                <span className={cn("font-display text-base font-extrabold", fp.lit === i ? "text-[#d9408f]" : "text-[var(--l-ink-2)]")}>{i + 1}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className={cn("flex w-full flex-col items-center gap-2 transition-opacity duration-300", !awake && phase !== "checking" && "opacity-60")}>
        <span className="flex items-center gap-2 font-display text-lg font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.25)]">
          <Glyph e="👂" size={28} /> {little ? "Which part is it?" : "Tap a block to hear that part — then tap the letter it matches."}
        </span>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {keys.map((k) => (
            <div key={k} className={cn("relative flex items-center gap-2", lifted === k && "z-[60]")}>
              <MiniPlay playing={fp.pal === k} onClick={() => (wake(), fp.play({ kind: "pal", k }))} size={little ? 62 : 54} />
              <PalBlock
                k={k}
                size={palSize}
                wordy={wordy}
                lit={fp.pal === k}
                disabled={!awake}
                onTap={() => tapPal(k)}
                onLift={() => {
                  sfx("lift");
                  setLifted(k);
                }}
                onDrop={(t) => {
                  setLifted(null);
                  const i = t?.dataset.slot !== undefined ? Number(t.dataset.slot) : NaN;
                  if (!Number.isNaN(i)) place(k, i);
                }}
              />
            </div>
          ))}
        </div>
      </div>
      {/* Check stays put; what it found sits beside it (a button never slides away from a finger). */}
      <div className="relative flex min-h-[72px] items-center justify-center">
        {phase === "reveal" ? (
          note && (
            <span key={note} className="l-pop-in max-w-[560px] rounded-[20px] bg-[var(--l-violet)] px-5 py-2 text-center font-display text-lg font-extrabold leading-tight text-white shadow-[0_4px_0_rgba(0,40,80,0.2)]">
              <WithGlyphs text={note} />
            </span>
          )
        ) : phase === "done" ? (
          <span className="l-pop-in flex items-center gap-2 rounded-full bg-[var(--l-green)] px-5 py-2 font-display text-xl font-extrabold text-white shadow-[0_4px_0_var(--l-green-edge)]">
            <Glyph e="🎉" size={30} /> {act.order.map(nice).join(" ")}!
          </span>
        ) : (
          <>
            <Chunk tone="green" onClick={(e) => check(e.currentTarget)} disabled={phase !== "build"} className={cn("flex h-[68px] items-center gap-2 px-8 font-display text-2xl font-extrabold transition-opacity", slots.every(Boolean) && awake ? "l-pulse" : "opacity-70")}>
              <Check className="h-8 w-8" strokeWidth={3.5} /> Check
            </Chunk>
            {note && (
              <span key={note} className="l-pop-in absolute right-full top-1/2 mr-4 w-max max-w-[380px] -translate-y-1/2 rounded-[20px] bg-[var(--l-orange)] px-5 py-2 text-center font-display text-lg font-extrabold leading-tight text-white shadow-[0_4px_0_rgba(0,40,80,0.2)]">
                <WithGlyphs text={note} />
              </span>
            )}
            {misses > 0 && phase === "build" && <span className="absolute left-full top-1/2 ml-4 -translate-y-1/2 whitespace-nowrap font-display text-base font-bold text-white/85">Try {misses + 1} of {TRIES}</span>}
          </>
        )}
      </div>
    </div>
  );
}

/** Block sizes: square letters (A, B, C), or wider word blocks (Verse, Chorus, Pre-chorus). */
const blockBox = (size: number, wordy: boolean) => (wordy ? { w: Math.round(size * 1.5), h: Math.round(size * 0.84) } : { w: size, h: size });
const fitFont = (text: string, w: number, h: number) => (text.length <= 2 ? h * 0.5 : Math.min(h * 0.36, (w - 18) / (text.length * 0.6)));

/** A section block: its color and letter, or a "?" that dances while its part plays. */
function Block({ k, size, wordy, lit, frac, empty, locked, bad, playing }: { k: string | null; size: number; wordy: boolean; lit: boolean; frac: number; empty: boolean; locked: boolean; bad: number; playing: boolean }) {
  const c = k ? sectionColor(k) : "#9aa9bd";
  const { w, h } = blockBox(size, wordy);
  return (
    <span
      key={bad}
      className={cn("relative flex items-center justify-center overflow-hidden rounded-[22px] border-[4px] font-display font-extrabold leading-none text-white", empty ? "border-dashed border-[#9aa9bd] bg-[#eef3f8]" : "border-[#2a2f45]", bad > 0 && "l-shake", !empty && !bad && "l-pop-in")}
      style={{ width: w, height: h, background: empty ? undefined : c, boxShadow: lit ? "0 0 0 4px #fff, 0 0 26px rgba(255,77,141,0.75)" : locked ? "0 5px 0 var(--l-green-edge)" : "0 5px 0 rgba(0,40,80,0.18)", fontSize: fitFont(k ? nice(k) : "?", w, h) } as CSSProperties}
    >
      {empty ? (
        playing ? (
          <span className="flex items-end gap-[6px]" style={{ height: h * 0.42 }} aria-hidden>
            {[0, 1, 2, 3].map((j) => (
              <span key={j} className="m-eq w-[7px] rounded-full bg-[#ff6fb5]" style={{ height: "100%", animationDelay: `${j * 0.12}s` }} />
            ))}
          </span>
        ) : (
          <span className="text-[#9aa9bd]" style={{ fontSize: h * 0.46 }}>?</span>
        )
      ) : (
        <span className="drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]">{nice(k!)}</span>
      )}
      {lit && <span className={cn("absolute bottom-0 left-0 h-[10%]", empty ? "bg-[#ff6fb5]" : "bg-white/85")} style={{ width: `${frac * 100}%` }} aria-hidden />}
      {locked && !bad && !empty && (
        <span className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white">
          <Glyph e="✅" size={24} />
        </span>
      )}
      {bad > 0 && (
        <span className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white">
          <Glyph e="❌" size={20} />
        </span>
      )}
    </span>
  );
}

/** A letter block in the palette: tap it to fill the chosen part, or drag it onto any part. */
function PalBlock({ k, size, wordy, lit, disabled, onTap, onLift, onDrop }: { k: string; size: number; wordy: boolean; lit: boolean; disabled: boolean; onTap: () => void; onLift: () => void; onDrop: (t: HTMLElement | null) => void }) {
  const { handlers, dragging } = useDrag({ onTap, onLift, onDrop, disabled });
  const c = sectionColor(k);
  const { w, h } = blockBox(size, wordy);
  return (
    <div
      {...handlers}
      data-dragging={dragging}
      role="button"
      aria-label={`Part ${nice(k)}`}
      className={cn("l-drag l-chunk relative flex items-center justify-center font-display font-extrabold leading-none text-white", disabled && "opacity-70")}
      style={{ "--f": c, "--e": "rgba(0,40,80,0.3)", width: w, height: h, borderRadius: 24, border: "4px solid #2a2f45", fontSize: fitFont(nice(k), w, h), boxShadow: lit ? "0 6px 0 rgba(0,40,80,0.3), 0 0 0 5px #ff6fb5, 0 0 26px rgba(255,111,181,0.6)" : undefined } as CSSProperties}
    >
      <span className="drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]">{nice(k)}</span>
    </div>
  );
}

// ── Label: which form is it? ───────────────────────────────────────────────────────────────────
function LabelForm({ act, fx, onDone }: ActProps<"form">) {
  const fp = useFormPlayer(act);
  const voiced = fx.voice !== "keys";
  const little = fx.voice === "all";
  const n = act.order.length;
  const { parts, auto } = spoken(fx, act.say, act.prompt);
  const intro: Part[] = fx.firstTime && voiced ? [...parts, "~", SAY.musicListen] : parts;
  const answer = act.answer ?? act.order.join("");
  const options = useShuffled(act.options ?? [answer], fx.seed);
  const c = useChoice(answer, fx, onDone, { extra: voiced ? [answer.split("").join(" ")] : [] });
  const [awake, setAwake] = useState(false);
  useIntro(fx, intro, auto, (go) => fp.play({ kind: "all" }, go), () => setAwake(true));
  const solved = !!c.found;
  const wordy = Object.keys(act.sections).some((k) => k.length > 2);
  const size = wordy ? (n > 5 ? 72 : 84) : little ? 96 : n > 6 ? 76 : 88;
  return (
    <div className="relative flex w-full max-w-[1100px] flex-col items-center gap-4">
      <PromptRow parts={intro}>{act.prompt}</PromptRow>
      <SoundOffNote />
      <div className="flex w-full max-w-full items-center gap-5 rounded-[30px] bg-white/95 px-5 py-4 shadow-[0_8px_0_rgba(0,40,80,0.14)]">
        <PlayButton size={little ? 100 : 88} playing={fp.all} onClick={() => (setAwake(true), fp.play({ kind: "all" }))} pulse={awake && !fp.player.playing} />
        <div className="flex min-w-0 flex-1 flex-wrap items-start justify-center gap-3">
          {act.order.map((k, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <button type="button" onClick={() => (setAwake(true), fp.play({ kind: "slot", i }))} aria-label={`Hear part ${i + 1}`} className={cn("rounded-[22px] transition-transform duration-150", fp.lit === i && "scale-110")}>
                <Block k={solved ? k : null} size={size} wordy={wordy} lit={fp.lit === i} frac={fp.lit === i ? fp.frac : 0} empty={!solved} locked={solved} bad={0} playing={fp.lit === i} />
              </button>
              <span className={cn("font-display text-base font-extrabold", fp.lit === i ? "text-[#d9408f]" : "text-[var(--l-ink-2)]")}>{i + 1}</span>
            </div>
          ))}
        </div>
      </div>
      <span className="flex items-center gap-2 font-display text-lg font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.25)]">
        <Glyph e="👂" size={28} /> {little ? "Which shape is the song?" : "Same music = same letter. Which form is it?"}
      </span>
      <div className={cn("grid w-full max-w-[1000px] gap-4 transition-opacity duration-300", !awake && "pointer-events-none opacity-60")} style={{ gridTemplateColumns: `repeat(${Math.min(4, options.length)}, minmax(0, 1fr))` }}>
        {options.map((o, i) => {
          const tile = (
            <ChoiceTile state={tileState(o, c, answer)} shakeKey={c.shake?.id === o ? c.shake.n : undefined} onPick={(el) => (sfx("pick"), c.choose(o, el))} label={o} className="min-h-[120px] w-full px-3 py-3 text-[var(--l-ink)]">
              {isLetters(o) ? (
                <span className="flex flex-col items-center gap-1.5">
                  <FormBlocks sections={o.toUpperCase().split("")} k={o.length > 5 ? 0.5 : 0.62} />
                  {!little && <span className="font-display text-xl font-extrabold tracking-[0.2em]">{o.toUpperCase()}</span>}
                </span>
              ) : (
                <span className="font-display text-[24px] font-extrabold leading-tight">
                  <WithGlyphs text={o} />
                </span>
              )}
            </ChoiceTile>
          );
          return (
            <div key={o} className="l-rise" style={{ animationDelay: `${120 + i * 60}ms` }}>
              {little ? (
                <Hearable parts={[o]} side="below">
                  {tile}
                </Hearable>
              ) : (
                tile
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
