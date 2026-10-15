"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { ArrowDown, ArrowUp, Check, Play, Undo2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Part } from "@/lib/learn/audio";
import { SAY } from "@/lib/learn/script";
import { sfx } from "@/lib/learn/sfx";
import type { StaffNote } from "@/lib/learn/mus/types";
import { BOTTOM_LINE, keyAcc, noteColor, spell, spelledName, staffStep, stepToMidi } from "@/lib/learn/mus/theory";
import { melody, note1 } from "@/lib/learn/mus/score";
import { playNote } from "@/lib/learn/mus/synth";
import { Chunk, useShuffled } from "../../kit";
import { ChoiceTile, Hearable, PromptRow, spoken, tileState, useChoice, useLater, type ActProps } from "../../acts/common";
import { usePlayer } from "../kit/player";
import { MiniPlay, SoundOffNote } from "../kit/kit";
import { Staff } from "../kit/notation";
import { StaffBox, noteWords, soundingAt, staffLayout, useWhenQuiet } from "./MelodyAct";

// The staff, three ways:
//   name   one big note (in its clef and key) — which letter is it? Hear it if you like; once it's
//          named, it rings and its name pops up under it;
//   place  put the note asked for on its line or space: touch the staff (slide up or down — the
//          note follows your finger and sings its pitch), nudge it with the arrows, then Check;
//   write  write a run of notes in order the same way (tap a written note to move it, Undo to take
//          the last one back), then Check.
// A wrong check says what's off (higher or lower; which notes are red), the second one shows green
// rings where the notes belong, and the third shows the answer and plays it — nobody gets stuck.

export function StaffAct({ act, fx, onDone }: ActProps<"staff">) {
  if (act.mode === "name") return <NameNote act={act} fx={fx} onDone={onDone} />;
  return <PlaceNotes act={act} fx={fx} onDone={onDone} />;
}

// ── Name the note ────────────────────────────────────────────────────────────────────────────
function NameNote({ act: a, fx, onDone }: ActProps<"staff">) {
  const p = a.notes[0];
  const keySig = a.key ?? 0;
  const name = spelledName(p, keySig);
  const answer = a.answer ?? name;
  const options = useShuffled(a.options?.length ? a.options : [answer], fx.seed);
  const voiced = fx.voice !== "keys";
  const little = fx.voice === "all";
  const player = usePlayer();
  const later = useLater();
  const whenQuiet = useWhenQuiet();
  const alive = useRef(true);
  const { parts, auto } = spoken(fx, a.say, a.prompt);
  const sound = useMemo(() => note1(p, "piano", 1.6, 60), [p]);
  // Named: once the praise is said, the note rings (glowing) — then on to the next.
  const celebrate = (m: number) =>
    whenQuiet(() => {
      if (!alive.current) return;
      player.play(sound, { onEnd: () => later(() => onDone(m), 300) });
    });
  const c = useChoice(answer, fx, (m) => celebrate(m), { extra: voiced ? [noteWords(answer)] : [], doneDelay: 600 });

  useEffect(() => {
    alive.current = true;
    fx.setPrompt(parts);
    const t = window.setTimeout(() => {
      const go = () => alive.current && a.hear && player.play(sound);
      if (auto && parts.length) void fx.say(parts).then((ok) => ok && whenQuiet(go, 150));
      else go();
    }, 380);
    return () => {
      alive.current = false;
      window.clearTimeout(t);
    };
    // Asked once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const found = c.found !== null;
  const nk = Math.min(7, Math.abs(keySig));
  const cols = options.length >= 3 ? 2 : 1;
  // The staff card and the answers sit side by side: the staff is as big as that allows.
  const units = 128 + (nk ? nk * 10 + 6 : 0);
  const tilesW = cols === 2 ? (voiced ? 540 : 440) : voiced ? 300 : 230;
  const H = Math.max(170, Math.min(little ? 250 : 236, Math.floor(((1060 - 32 - tilesW - 56 - (a.hear ? 92 : 0)) * 108) / units)));
  return (
    <div className="flex w-full max-w-[1100px] flex-col items-center gap-5">
      <PromptRow parts={parts}>{a.prompt}</PromptRow>
      <SoundOffNote />
      <div className="flex w-full flex-wrap items-center justify-center gap-x-8 gap-y-6">
        {/* The note, big — and once it's named, its name pops up under it. */}
        <div className="l-pop-in relative flex items-center gap-5 rounded-[32px] bg-white/95 px-7 py-4 shadow-[0_8px_0_rgba(0,40,80,0.14)]">
          <StaffBox notes={[{ p, d: 4, mark: !found }]} clef={a.clef} keySig={keySig} active={player.playing ? 0 : -1} height={H} minWidth={units} />
          {a.hear && (
            <span className="flex flex-col items-center gap-1">
              <MiniPlay playing={player.playing} onClick={() => (sfx("tap"), player.playing ? player.stop() : player.play(sound))} size={little ? 72 : 64} />
              <span className="font-display text-base font-extrabold text-[var(--l-ink-2)]">Hear it</span>
            </span>
          )}
          {found && (
            <span className="l-pop-in absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border-4 border-white px-7 py-1 font-display text-4xl font-black text-white shadow-[0_5px_0_rgba(0,40,80,0.2)]" style={{ background: noteColor(p) }}>
              {name}
            </span>
          )}
        </div>
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, width: tilesW }}>
          {options.map((o, i) => {
            const tile = (
              <ChoiceTile state={tileState(o, c, answer)} shakeKey={c.shake?.id === o ? c.shake.n : undefined} onPick={(el) => (sfx("pick"), c.choose(o, el))} label={noteWords(o)} className={cn("w-full text-[var(--l-ink)]", little ? "min-h-[118px]" : "min-h-[108px]")}>
                <span className="font-display text-[56px] font-black leading-none">{o}</span>
              </ChoiceTile>
            );
            return (
              <div key={o} className="l-rise" style={{ animationDelay: `${120 + i * 60}ms` }}>
                {voiced ? (
                  <Hearable parts={[noteWords(o)]} side="left">
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
    </div>
  );
}

// ── Place a note / write a run of notes ──────────────────────────────────────────────────────
/** A quarter note's column in the kit's staff layout (staff units: one space between lines = 10). */
const COL = 38;
const placeAt = (s: number[], slot: number, step: number) => (slot < s.length ? s.map((x, i) => (i === slot ? step : x)) : [...s, step]);
/** The pitch a line or space sounds in a key (the key signature's sharps and flats included), so a
 *  note the child writes never grows a stray natural sign. */
const inKey = (step: number, keySig: number) => stepToMidi(step) + keyAcc(keySig, ((step % 7) + 7) % 7);

type Msg = { text: string; tone: "good" | "oops" | "info" };

function PlaceNotes({ act: a, fx, onDone }: ActProps<"staff">) {
  const write = a.mode === "write";
  const keySig = a.key ?? 0;
  const clef = a.clef;
  const bottom = BOTTOM_LINE[clef];
  const N = write ? Math.max(1, a.notes.length) : 1;
  const goal = useMemo(() => a.notes.slice(0, N), [a.notes, N]);
  const targets = useMemo(() => goal.map((p) => staffStep(spell(p, keySig))), [goal, keySig]);
  const names = useMemo(() => goal.map((p) => spelledName(p, keySig)), [goal, keySig]);
  const voiced = fx.voice !== "keys";
  const little = fx.voice === "all";
  const player = usePlayer();
  const later = useLater();
  const whenQuiet = useWhenQuiet();
  const { parts, auto } = spoken(fx, a.say, a.prompt);
  const intro: Part[] = voiced && fx.firstTime && a.prompt !== SAY.staffPlace && !parts.includes(SAY.staffPlace) ? [...parts, "~", SAY.staffPlace] : parts;
  const goalSound = useMemo(() => (write ? melody(goal, 1, "piano", 88) : note1(goal[0], "piano", 1.6, 60)), [write, goal]);

  const [steps, setSteps] = useState<number[]>([]);
  const [sel, setSel] = useState(-1);
  const [drag, setDrag] = useState<{ slot: number; step: number } | null>(null);
  const [checks, setChecks] = useState(0);
  const [marks, setMarks] = useState<(boolean | null)[]>([]);
  const [ghosts, setGhosts] = useState<number[]>([]);
  const [phase, setPhase] = useState<"edit" | "won" | "shown">("edit");
  const [msg, setMsg] = useState<Msg | null>(null);
  const [hearing, setHearing] = useState<"goal" | "mine" | null>(null);
  // What was on the staff at the last wrong check (Check wakes up again once something changes).
  const [lastWrong, setLastWrong] = useState<string | null>(null);
  const dragRef = useRef<{ slot: number; step: number; id: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const alive = useRef(true);
  const checksRef = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    alive.current = true;
    fx.setPrompt(intro);
    const t = window.setTimeout(() => {
      if (auto && intro.length) void fx.say(intro);
    }, 380);
    return () => {
      alive.current = false;
      window.clearTimeout(t);
    };
    // Asked once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The staff: a column per note, sized so a run of notes fits and every line is easy to hit.
  const nk = Math.min(7, Math.abs(keySig));
  const X0 = 58 + nk * 10 + (nk ? 6 : 0);
  const minWidth = X0 + COL * (N - 1) + (write ? 44 : 96);
  const H = write ? Math.min(little ? 300 : 290, Math.floor((800 * 108) / minWidth)) : little ? 330 : 310;
  const live = drag ? placeAt(steps, drag.slot, drag.step) : steps;
  const notes: StaffNote[] = phase === "edit" ? live.map((st) => ({ p: inKey(st, keySig), d: 1 })) : goal.map((p) => ({ p, d: 1 }));
  const lay = staffLayout(notes, keySig, minWidth);
  const pxW = (lay.width * H) / 108;
  const yOf = (step: number) => 40 - (step - bottom) * 5;
  const nameAt = (step: number) => spelledName(inKey(step, keySig), keySig);

  const ring = (step: number, soft = false) => playNote("piano", inKey(step, keySig), soft ? 0.35 : 0.7, soft ? 0.5 : 0.75);
  const finish = (m: number) => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone(m);
  };

  // Touch the staff: the note appears under the finger and follows it up and down (singing its
  // pitch); letting go puts it there. In write mode, touching near a written note moves that one.
  const toUnits = (e: RPointerEvent) => {
    const r = boxRef.current?.getBoundingClientRect();
    if (!r || !r.width || !r.height) return null;
    return { x: ((e.clientX - r.left) / r.width) * lay.width, y: -34 + ((e.clientY - r.top) / r.height) * 108 };
  };
  const stepAt = (y: number) => Math.max(bottom - 6, Math.min(bottom + 14, Math.round(bottom + (40 - y) / 5)));
  const slotAt = (x: number) => {
    if (!write) return 0;
    const cols = steps.length < N ? steps.length + 1 : steps.length;
    let best = 0;
    for (let i = 1; i < cols; i++) if (Math.abs(x - (X0 + COL * i)) < Math.abs(x - (X0 + COL * best))) best = i;
    return best;
  };
  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if (phase !== "edit" || dragRef.current) return;
    const u = toUnits(e);
    if (!u) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    const slot = slotAt(u.x);
    const step = stepAt(u.y);
    dragRef.current = { slot, step, id: e.pointerId };
    setDrag({ slot, step });
    setSel(slot);
    ring(step);
  };
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.id) return;
    const u = toUnits(e);
    if (!u) return;
    const step = stepAt(u.y);
    if (step === d.step) return;
    dragRef.current = { ...d, step };
    setDrag({ slot: d.slot, step });
    ring(step, true);
  };
  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.id) return;
    dragRef.current = null;
    setDrag(null);
    setSteps((s) => placeAt(s, d.slot, d.step));
    setMarks((mk) => mk.map((x, i) => (i === d.slot ? null : x)));
    if (msg?.tone !== "info") setMsg(null);
  };
  const onCancel = () => {
    dragRef.current = null;
    setDrag(null);
  };
  const nudge = (dir: 1 | -1) => {
    if (phase !== "edit" || !steps.length) return;
    const i = sel >= 0 && sel < steps.length ? sel : steps.length - 1;
    const st = Math.max(bottom - 6, Math.min(bottom + 14, steps[i] + dir));
    setSteps(steps.map((x, k) => (k === i ? st : x)));
    setSel(i);
    setMarks((mk) => mk.map((x, k) => (k === i ? null : x)));
    ring(st);
  };
  const undo = () => {
    if (phase !== "edit" || !steps.length) return;
    sfx("tap");
    setSteps(steps.slice(0, -1));
    setMarks((mk) => mk.slice(0, steps.length - 1));
    setSel(-1);
  };
  const hear = (which: "goal" | "mine") => {
    sfx("tap");
    if (hearing === which && player.playing) {
      player.stop();
      setHearing(null);
      return;
    }
    if (which === "mine" && !steps.length) return;
    setHearing(which);
    player.play(which === "goal" ? goalSound : melody(steps.map((st) => inKey(st, keySig)), 1, "piano", 88), { onEnd: () => setHearing(null) });
  };

  const win = (el: HTMLElement) => {
    setPhase("won");
    setMarks([]);
    setGhosts([]);
    setMsg({ text: write ? "You wrote it!" : `Yes — that's ${names[0]}!`, tone: "good" });
    fx.right(el, voiced && !write ? [noteWords(names[0])] : []);
    whenQuiet(() => {
      if (!alive.current) return;
      setHearing(null);
      player.play(goalSound, { onEnd: () => later(() => finish(checksRef.current), 450) });
    }, 400);
  };
  // Third wrong check: here's where they go (it plays), and on we sail.
  const reveal = () => {
    setPhase("shown");
    setMarks([]);
    setGhosts([]);
    setSteps(targets);
    setMsg({ text: write ? "Here's where they go — listen!" : `Here's where ${names[0]} goes — listen!`, tone: "info" });
    whenQuiet(() => {
      if (!alive.current) return;
      setHearing(null);
      player.play(goalSound, { onEnd: () => later(() => finish(checksRef.current), 900) });
    }, 600);
  };
  const check = (el: HTMLElement) => {
    if (phase !== "edit" || steps.length < N || drag || steps.join() === lastWrong) return;
    const per = steps.map((st, i) => st === targets[i]);
    if (per.every(Boolean)) return win(el);
    const k = checksRef.current + 1;
    checksRef.current = k;
    setChecks(k);
    setMarks(per);
    setLastWrong(steps.join());
    if (k >= 3) {
      fx.miss();
      reveal();
      return;
    }
    if (k === 2) setGhosts(per.flatMap((ok, i) => (ok ? [] : [i])));
    const more = k === 2 ? (write ? " The green rings show where they go." : " The green ring shows where it goes.") : "";
    if (!write) {
      const up = targets[0] > steps[0];
      setMsg({ text: `That's ${nameAt(steps[0])}. ${names[0]} is ${up ? "higher — move it up" : "lower — move it down"}!${more}`, tone: "oops" });
      fx.wrong(el, voiced ? [up ? "Up" : "Down"] : []);
    } else {
      const bad = per.filter((ok) => !ok).length;
      setMsg({ text: `${bad === 1 ? "One note isn't" : `${bad} notes aren't`} right yet — fix the red ${bad === 1 ? "one" : "ones"}.${more}`, tone: "oops" });
      fx.wrong(el);
    }
  };

  // What glows: the note being placed (or moved), else the one that's sounding.
  const sound = soundingAt(player.playing ? player.score : null, player.beat);
  const lightSound = sound.i >= 0 && (hearing === "mine" || phase !== "edit");
  const editing = phase === "edit";
  const selIdx = sel >= 0 && sel < steps.length ? sel : steps.length - 1;
  const active = lightSound ? sound.i : editing ? (drag ? drag.slot : selIdx) : -1;
  const ready = editing && steps.length === N && !drag && steps.join() !== lastWrong;
  const markY = (step: number) => (yOf(step) < 12 ? 64 : -24);

  return (
    <div className="flex w-full max-w-[1120px] flex-col items-center gap-3">
      <PromptRow parts={intro}>{a.prompt}</PromptRow>
      <SoundOffNote />
      <div className="flex w-full items-stretch justify-center gap-4">
        <div className="l-pop-in flex min-w-0 items-center justify-center rounded-[30px] bg-white/95 px-5 py-3 shadow-[0_8px_0_rgba(0,40,80,0.14)]">
          <div
            ref={boxRef}
            className={cn("relative touch-none select-none", editing && "cursor-pointer")}
            style={{ width: pxW, height: H }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onCancel}
            role="application"
            aria-label={write ? "Staff: touch a line or space to write the next note" : "Staff: touch a line or space to put the note there"}
          >
            <Staff notes={notes} clef={clef} keySig={keySig} active={active} labels={editing ? "none" : "letters"} colored={!editing} height={H} minWidth={minWidth} className="block" />
            <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox={`0 -34 ${lay.width} 108`} aria-hidden>
              {editing && !drag && steps.length < N && <Slot x={X0 + COL * steps.length} />}
              {editing && ghosts.map((i) => <Ghost key={i} x={X0 + COL * i} step={targets[i]} bottom={bottom} still={fx.reduced} />)}
              {editing && marks.map((ok, i) => (ok === true || ok === false) && steps[i] !== undefined && <Mark key={`m${i}`} x={lay.xs[i] ?? X0 + COL * i} y={markY(steps[i])} ok={ok} />)}
            </svg>
          </div>
        </div>
        <div className="flex w-[200px] shrink-0 flex-col justify-center gap-3">
          <div className="flex items-center justify-center gap-3 rounded-[24px] bg-white/95 px-4 py-3 shadow-[0_6px_0_rgba(0,40,80,0.14)]">
            {write ? (
              <span className="font-display text-2xl font-extrabold tabular-nums text-[var(--l-ink)]">
                {steps.length} <span className="text-[var(--l-ink-2)]">/ {N}</span>
              </span>
            ) : (
              <span className="font-display text-5xl font-black leading-none text-[var(--l-ink)]">{names[0]}</span>
            )}
            {a.hear && <MiniPlay playing={hearing === "goal" && player.playing} onClick={() => hear("goal")} size={little ? 64 : 56} />}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Chunk tone="white" aria-label="Move the note up" disabled={!editing || !steps.length} onClick={() => nudge(1)} className={cn("flex h-16 items-center justify-center", (!editing || !steps.length) && "opacity-50")}>
              <ArrowUp className="h-9 w-9 text-[var(--l-ink)]" strokeWidth={3} />
            </Chunk>
            <Chunk tone="white" aria-label="Move the note down" disabled={!editing || !steps.length} onClick={() => nudge(-1)} className={cn("flex h-16 items-center justify-center", (!editing || !steps.length) && "opacity-50")}>
              <ArrowDown className="h-9 w-9 text-[var(--l-ink)]" strokeWidth={3} />
            </Chunk>
          </div>
          {write && (
            <div className="grid grid-cols-2 gap-3">
              <Chunk tone="white" disabled={!editing || !steps.length} onClick={undo} className={cn("flex h-14 items-center justify-center gap-1 font-display text-lg font-extrabold text-[var(--l-ink)]", (!editing || !steps.length) && "opacity-50")}>
                <Undo2 className="h-6 w-6" strokeWidth={2.6} /> Undo
              </Chunk>
              <Chunk tone="violet" aria-label="Hear my notes" disabled={!steps.length} onClick={() => hear("mine")} className={cn("flex h-14 items-center justify-center gap-1 font-display text-lg font-extrabold", !steps.length && "opacity-50")}>
                <Play className="h-6 w-6 fill-current" strokeWidth={0} /> Mine
              </Chunk>
            </div>
          )}
          <Chunk tone="green" disabled={!ready} onClick={(e) => check(e.currentTarget)} className={cn("flex h-16 items-center justify-center gap-2 font-display text-2xl font-extrabold", ready ? "l-pulse" : "opacity-60")}>
            <Check className="h-8 w-8" strokeWidth={3.2} /> Check
          </Chunk>
        </div>
      </div>
      <div className="flex min-h-11 items-center justify-center">
        {msg ? (
          <span key={msg.text + checks} className={cn("l-pop-in max-w-[860px] text-balance rounded-[22px] px-5 py-1.5 text-center font-display text-xl font-extrabold text-white shadow-[0_4px_0_rgba(0,40,80,0.2)]", msg.tone === "good" ? "bg-[var(--l-green)]" : msg.tone === "oops" ? "bg-[var(--l-orange)]" : "bg-[var(--l-violet)]")}>
            {msg.text}
          </span>
        ) : editing && steps.length < N ? (
          <span className="font-display text-xl font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.3)]">
            {steps.length === 0 ? "Touch a line or a space — slide to move the note." : write ? "Now the next note!" : ""}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Where the next note will go: a dashed column with a "+" under the staff. */
function Slot({ x }: { x: number }) {
  return (
    <g>
      <rect x={x - 14} y={-29} width={28} height={98} rx={10} fill="#ff6fb5" fillOpacity={0.08} stroke="#ff6fb5" strokeWidth={1.4} strokeDasharray="4 4" />
      <circle cx={x} cy={60} r={6.5} fill="#ff6fb5" />
      <path d={`M${x - 3.2} 60 H${x + 3.2} M${x} 56.8 V63.2`} stroke="#fff" strokeWidth={1.8} strokeLinecap="round" />
    </g>
  );
}

/** A right/wrong mark above (or below) a written note after a check. */
function Mark({ x, y, ok }: { x: number; y: number; ok: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={7.5} fill={ok ? "#3ccf6e" : "#ff7363"} stroke="#fff" strokeWidth={1.6} />
      {ok ? <path d="M-3.4 0.2 L-1 2.8 L3.6 -2.6" stroke="#fff" strokeWidth={1.9} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : <path d="M-2.8 -2.8 L2.8 2.8 M2.8 -2.8 L-2.8 2.8" stroke="#fff" strokeWidth={1.9} strokeLinecap="round" />}
    </g>
  );
}

/** The hint: a green note (with its ledger lines) and a ring, right where a note belongs. */
function Ghost({ x, step, bottom, still }: { x: number; step: number; bottom: number; still: boolean }) {
  const y = 40 - (step - bottom) * 5;
  const ledgers: number[] = [];
  for (let s = bottom + 10; s <= step; s += 2) ledgers.push(s);
  for (let s = bottom - 2; s >= step; s -= 2) ledgers.push(s);
  return (
    <g>
      {ledgers.map((s) => (
        <line key={s} x1={x - 11} x2={x + 11} y1={40 - (s - bottom) * 5} y2={40 - (s - bottom) * 5} stroke="#25a552" strokeWidth={1.8} opacity={0.75} />
      ))}
      <ellipse cx={x} cy={y} rx={6} ry={4.6} fill="#3ccf6e" opacity={0.6} transform={`rotate(-20 ${x} ${y})`} />
      <circle cx={x} cy={y} r={10} fill="none" stroke="#25a552" strokeWidth={2.4}>
        {!still && <animate attributeName="r" values="9;13;9" dur="1.2s" repeatCount="indefinite" />}
        {!still && <animate attributeName="opacity" values="1;0.45;1" dur="1.2s" repeatCount="indefinite" />}
      </circle>
    </g>
  );
}
