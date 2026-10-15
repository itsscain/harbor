"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, CheckCircle2, Circle, Ear, Eraser } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Part } from "@/lib/learn/audio";
import type { BeatRule, DrumId } from "@/lib/learn/mus/types";
import { DRUMS } from "@/lib/learn/mus/catalog";
import { beatFails, solveBeat } from "@/lib/learn/mus/check";
import { SONG_ADJ, SONG_NOUN, newSong, type StudioSong } from "@/lib/learn/mus/song";
import { audioNow } from "@/lib/learn/mus/synth";
import { scoreSeconds } from "@/lib/learn/mus/score";
import { SAY } from "@/lib/learn/script";
import { sfx } from "@/lib/learn/sfx";
import { Chunk } from "../../kit";
import { PromptRow, spoken, useLater, type ActProps } from "../../acts/common";
import { usePlayer } from "../kit/player";
import { InstrumentPic, PlayButton, SoundOffNote } from "../kit/kit";
import { BeatGrid, gridLoop, gridStep, loopFactor, normGrid } from "../kit/BeatGrid";

// The Beat Lab: a drum machine to build a beat on, square by square.
//   make  your own beat that follows the rules ("kick on 1 and 3") — kept in your Studio;
//   copy  hear a beat, then build the same one (the playhead shows WHEN, your ears tell WHAT);
//   fix   a beat with mistakes in it — change it until it matches the one you hear.
// Play loops your beat, and you can keep changing it while it plays (a change joins in at the top
// of the next bar, like a real drum machine). Nothing wins by itself: Check judges it, says what's
// wrong in kid words (which drum, which rule), points at the squares after two misses, and shows
// the answer after three.

const TRIES = 3;
const freshId = () => Math.random().toString(36).slice(2, 8);
const nowIso = () => new Date().toISOString();
const anyOf = (list: readonly string[]) => list[Math.floor(Math.random() * list.length)];

type Playing = "none" | "mine" | "target" | "show";

// ── Rules in kid words ───────────────────────────────────────────────────────────────────────
const andList = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const drumWord = (d: DrumId) => DRUMS[d].name.toLowerCase();
const timesWord = (n: number) => (n === 1 ? "once" : n === 2 ? "twice" : `${n} times`);
/** "beats 1 and 3", "every beat", "every eighth", "1, 2& and 4". */
function stepsWords(ss: number[], steps: number): string {
  const per = Math.max(1, steps / 4);
  const sorted = [...new Set(ss)].sort((a, b) => a - b);
  if (sorted.length === steps) return per === 1 ? "every beat" : per === 2 ? "every eighth" : "every sixteenth";
  if (per > 1 && sorted.length === 4 && sorted.every((s) => s % per === 0)) return "every beat";
  if (per === 4 && sorted.length === 8 && sorted.every((s) => s % 2 === 0)) return "every eighth";
  const names = sorted.map((s) => {
    const b = Math.floor(s / per) + 1;
    const sub = s % per;
    return sub === 0 ? String(b) : `${b}${per === 2 ? "&" : ["", "e", "&", "a"][sub]}`;
  });
  return sorted.every((s) => s % per === 0) ? `${names.length > 1 ? "beats" : "beat"} ${andList(names)}` : andList(names);
}
function ruleText(r: BeatRule, steps: number): string {
  switch (r.rule) {
    case "on":
      return `Put the ${drumWord(r.row)} on ${stepsWords(r.steps, steps)}`;
    case "off":
      return `Keep the ${drumWord(r.row)} off ${stepsWords(r.steps, steps)}`;
    case "count":
      if (r.max === undefined) return r.min <= 1 ? `Use the ${drumWord(r.row)}` : `Play the ${drumWord(r.row)} at least ${timesWord(r.min)}`;
      if (r.min === r.max) return `Play the ${drumWord(r.row)} exactly ${timesWord(r.min)}`;
      if (r.min <= 0) return `Play the ${drumWord(r.row)} no more than ${timesWord(r.max)}`;
      return `Play the ${drumWord(r.row)} ${r.min} to ${r.max} times`;
    case "rows":
      return `Use at least ${r.min} different drums`;
    case "total":
      if (r.max === undefined) return `Play at least ${r.min} drum hits in all`;
      if (r.min === r.max) return `Play exactly ${r.min} drum hits in all`;
      return `Play ${r.min} to ${r.max} drum hits in all`;
  }
}

// ── Keeping a beat in the Studio ─────────────────────────────────────────────────────────────
/** A row at 8 steps a bar (the Studio's grid): 4 → each beat on its eighth, 16 → pairs merged. */
function toEighths(row: string, steps: number): string {
  if (steps === 8) return row;
  if (steps === 4) return [...row].map((c) => c + ".").join("");
  return Array.from({ length: 8 }, (_, i) => (row[2 * i] === "x" || row[2 * i + 1] === "x" ? "x" : ".")).join("");
}
function beatSong(rows: DrumId[], grid: string[], steps: number, bpm: number, swing: number): StudioSong {
  const base = newSong(`beat-${freshId()}`, { rows: rows.slice(0, 8), title: `${anyOf(SONG_ADJ)} ${anyOf(SONG_NOUN)} Groove` });
  return {
    ...base,
    bpm: Math.round(Math.max(60, Math.min(180, bpm))),
    swing: Math.min(0.35, swing),
    beat: { rows: base.beat.rows, grid: base.beat.rows.map((_, i) => toEighths(grid[i] ?? "", steps)) },
    at: nowIso(),
  };
}

export function BeatLabAct({ act: a, fx, onDone }: ActProps<"beatlab">) {
  const steps = a.steps;
  const swing = Math.max(0, Math.min(0.4, a.swing ?? 0));
  const k = loopFactor(steps, swing);
  const rules = useMemo(() => a.rules ?? [], [a.rules]);
  const target = useMemo(() => (a.target ? normGrid(a.rows, a.target, steps) : null), [a.rows, a.target, steps]);
  const start = useMemo(() => normGrid(a.rows, a.start ?? [], steps), [a.rows, a.start, steps]);
  const make = a.mode === "make" || !target;
  const voiced = fx.voice !== "keys";
  const player = usePlayer();
  const later = useLater();
  const { parts, auto } = spoken(fx, a.say, a.prompt);

  const [grid, setGrid] = useState<string[]>(start);
  const [what, setWhat] = useState<Playing>("none");
  // Copy / fix: the grid wakes once the beat has been heard.
  const [heard, setHeard] = useState(make);
  const [misses, setMisses] = useState(0);
  const [phase, setPhase] = useState<"build" | "won" | "shown">("build");
  const [msg, setMsg] = useState<{ text: string; good?: boolean; k: number } | null>(null);
  const [flag, setFlag] = useState<{ rows: number[]; k: number } | undefined>(undefined);
  const [marks, setMarks] = useState<boolean[][] | undefined>(undefined);
  const [badRule, setBadRule] = useState<{ i: number; k: number } | null>(null);
  const [saved, setSaved] = useState(false);
  const [wipe, setWipe] = useState(false);
  const gridRef = useRef(start);
  const looping = useRef(false);
  const restart = useRef<number | undefined>(undefined);
  const doneRef = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const finish = (m: number) => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone(m);
  };

  // ── Playing ──
  const stopLoop = () => {
    window.clearTimeout(restart.current);
    restart.current = undefined;
    looping.current = false;
  };
  const stopAll = () => {
    if (what === "target") setHeard(true);
    stopLoop();
    player.stop();
    setWhat("none");
  };
  const startLoop = (g: string[]) => {
    looping.current = true;
    setWhat("mine");
    player.play(gridLoop(a.rows, g, steps, a.bpm, { swing }).score, { loop: true });
  };
  const playTarget = () => {
    if (!target) return;
    stopLoop();
    setWhat("target");
    player.play(gridLoop(a.rows, target, steps, a.bpm, { swing, times: 2 }).score, {
      onEnd: () => {
        setWhat("none");
        setHeard(true);
      },
    });
  };
  /** A flourish: the beat twice through with a crash on top — then `then`. */
  const playShow = (g: string[], then: () => void) => {
    stopLoop();
    setWhat("show");
    let ran = false;
    const once = () => {
      if (ran) return;
      ran = true;
      then();
    };
    const s = gridLoop(a.rows, g, steps, a.bpm, { swing, times: 2, crash: true }).score;
    player.play(s, {
      onEnd: () => {
        setWhat("none");
        once();
      },
    });
    later(once, scoreSeconds(s) * 1000 + 2500); // never stuck
  };
  const toggleMine = () => {
    sfx("tap");
    if (what === "mine") {
      stopLoop();
      player.stop();
      setWhat("none");
      return;
    }
    if (what === "target") setHeard(true);
    startLoop(gridRef.current);
  };
  const toggleTarget = () => {
    sfx("tap");
    if (what === "target") {
      player.stop();
      setWhat("none");
      setHeard(true);
      return;
    }
    playTarget();
  };

  // A change while the beat loops joins in at the top of the next bar (no jump back to the start).
  const onGridLatest = useRef<(g: string[]) => void>(() => {});
  useEffect(() => {
    onGridLatest.current = (g: string[]) => {
      setGrid(g);
      gridRef.current = g;
      setMarks(undefined);
      setWipe(false);
      setMsg(null);
      if (!looping.current || restart.current !== undefined) return;
      const pb = player.current();
      if (!pb || pb.len <= 0) return;
      const now = audioNow();
      const lead = 0.08; // playScore starts this far ahead
      let n = Math.floor(Math.max(0, (now - pb.t0) / pb.spb) / pb.len) + 1;
      let wait = pb.timeOf(n * pb.len) - lead - now;
      if (wait < 0.03) wait = pb.timeOf(++n * pb.len) - lead - now;
      restart.current = window.setTimeout(() => {
        restart.current = undefined;
        if (looping.current) startLoop(gridRef.current);
      }, Math.max(0, wait * 1000));
    };
  });
  const onGrid = useCallback((g: string[]) => onGridLatest.current(g), []);

  // Ask (and the first time, say how), then play the beat to copy for the youngest.
  useEffect(() => {
    const how: Part[] = voiced && fx.firstTime ? [{ gap: 300 }, make ? SAY.beatlabHow : SAY.beatlabCopy] : [];
    const words: Part[] = [...parts, ...how];
    fx.setPrompt(words);
    const t = window.setTimeout(() => {
      const go = () => {
        if (!make && voiced) playTarget();
      };
      if ((auto || how.length) && words.length) void fx.say(words).then((ok) => ok && go());
      else go();
    }, 380);
    const cap = window.setTimeout(() => setHeard(true), 20000);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(cap);
      window.clearTimeout(restart.current);
      looping.current = false;
    };
    // Asked once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Checking ──
  const fails = make ? beatFails(grid, a.rows, rules) : [];
  const repair = (g: string[]): string[] => {
    const out = normGrid(a.rows, g, steps).map((r) => r.split(""));
    for (const r of rules) {
      if (r.rule !== "on" && r.rule !== "off") continue;
      const ri = a.rows.indexOf(r.row);
      if (ri >= 0) for (const s of r.steps) if (s >= 0 && s < steps) out[ri][s] = r.rule === "on" ? "x" : ".";
    }
    const fixed = out.map((r) => r.join(""));
    return beatFails(fixed, a.rows, rules).length ? (solveBeat(a.rows, steps, rules) ?? fixed) : fixed;
  };
  const win = () => {
    setPhase("won");
    setFlag(undefined);
    setMarks(undefined);
    setBadRule(null);
    const g = gridRef.current;
    fx.right(cardRef.current);
    setMsg({ text: make ? "What a groove!" : "That's the beat!", good: true, k: 0 });
    let keep = false;
    if (a.mode === "make" && fx.saveSong) {
      fx.saveSong(beatSong(a.rows, g, steps, a.bpm, swing));
      keep = true;
      setSaved(true);
    }
    const m = misses;
    later(() => {
      if (!fx.reduced) fx.burst(cardRef.current, "star", 16);
      playShow(g, () => {
        if (keep && !doneRef.current) void fx.say(SAY.songSaved).then(() => finish(m));
        else finish(m);
      });
    }, 1100);
  };
  const showAnswer = (m: number) => {
    const ans = make ? repair(gridRef.current) : (target ?? gridRef.current);
    setGrid(ans);
    gridRef.current = ans;
    setMarks(undefined);
    setFlag(undefined);
    setBadRule(null);
    setPhase("shown");
    setMsg({ text: make ? "Here's one way to do it!" : "Here's how the beat goes!", k: 99 });
    playShow(ans, () => finish(m));
  };
  const check = () => {
    if (phase !== "build") return;
    stopAll();
    const g = normGrid(a.rows, gridRef.current, steps);
    let line = "";
    let rowsBad: number[] = [];
    let cells: boolean[][] | undefined;
    if (make) {
      const f = beatFails(g, a.rows, rules);
      if (!f.length) return win();
      const first = f[0];
      line = ruleText(first, steps) + "!";
      setBadRule({ i: rules.indexOf(first), k: misses + 1 });
      if ("row" in first) {
        const ri = a.rows.indexOf(first.row);
        rowsBad = ri >= 0 ? [ri] : [];
        if ((first.rule === "on" || first.rule === "off") && ri >= 0)
          cells = a.rows.map((_, r) => Array.from({ length: steps }, (_, c) => r === ri && first.steps.includes(c) && (first.rule === "on" ? g[r][c] !== "x" : g[r][c] === "x")));
      }
    } else if (target) {
      rowsBad = a.rows.map((_, i) => i).filter((i) => g[i] !== target[i]);
      if (!rowsBad.length) return win();
      line = rowsBad.length === 1 ? `Listen to the ${drumWord(a.rows[rowsBad[0]])} again!` : "Listen again! Some drums are different.";
      cells = a.rows.map((_, r) => Array.from({ length: steps }, (_, c) => g[r][c] !== target[r][c]));
    }
    const m = misses + 1;
    setMisses(m);
    fx.miss();
    setFlag({ rows: rowsBad, k: m });
    setMsg({ text: line, k: m });
    void fx.say(line);
    // Two misses: point at the squares. Three: show it, so no one is ever stuck.
    if (m >= 2 && m < TRIES) setMarks(cells);
    if (m >= TRIES) later(() => showAnswer(m), 2600);
  };
  const clear = () => {
    if (!wipe) {
      sfx("tap");
      setWipe(true);
      later(() => setWipe(false), 2600);
      return;
    }
    sfx("pop");
    setWipe(false);
    onGrid(a.rows.map(() => ".".repeat(steps)));
  };

  // ── The playhead ──
  const beatNow = what !== "none" && player.beat !== null ? player.beat / k : null;
  const playStep = gridStep(beatNow, steps, swing);
  const building = phase === "build";
  const awake = heard && building;
  const big = fx.voice === "all";
  const hasHits = grid.some((r) => r.includes("x"));

  return (
    <div className="flex w-full max-w-[1120px] flex-col items-center gap-3">
      <PromptRow parts={parts}>{a.prompt}</PromptRow>
      <SoundOffNote />
      <div ref={cardRef} className="relative w-full">
        <BeatGrid rows={a.rows} grid={grid} steps={steps} onChange={onGrid} playStep={playStep} disabled={!awake} size={big ? "lg" : "md"} flash={what !== "target"} marks={marks} flag={flag} names={fx.voice === "keys"} />
        {!heard && building && (
          <button type="button" onClick={toggleTarget} className="absolute inset-0 flex items-center justify-center rounded-[28px]" aria-label="Hear the beat first">
            <span className="l-pop-in flex items-center gap-3 rounded-full bg-white px-6 py-3 font-display text-2xl font-extrabold text-[var(--l-ink)] shadow-[0_6px_0_rgba(0,40,80,0.25),0_0_0_6px_rgba(139,108,255,0.35)]">
              <Ear className={cn("h-8 w-8 text-[var(--l-violet)]", what === "target" && "l-hear-wiggle")} strokeWidth={2.6} />
              {what === "target" ? "Listen…" : "Hear the beat first!"}
            </span>
          </button>
        )}
      </div>

      <div className="flex h-10 items-center justify-center">
        {msg ? (
          <span key={msg.k} className={cn("l-pop-in rounded-full px-5 py-1.5 text-center font-display text-xl font-extrabold text-white shadow-[0_4px_0_rgba(0,40,80,0.2)]", msg.good ? "bg-[var(--l-green)]" : "bg-[var(--l-orange)]")}>
            {msg.text}
          </span>
        ) : saved ? null : !heard ? (
          <span className="rounded-full bg-white/95 px-5 py-1.5 font-display text-xl font-extrabold text-[var(--l-ink)]">{a.mode === "fix" ? "Listen first, then fix it!" : "Listen first, then copy it!"}</span>
        ) : null}
        {saved && (
          <span className="l-pop-in ml-3 rounded-full bg-[#d9408f] px-5 py-1.5 font-display text-xl font-extrabold text-white shadow-[0_4px_0_#a8306e]">Saved to your Studio!</span>
        )}
      </div>

      <div className="flex w-full flex-wrap items-center justify-center gap-x-6 gap-y-3">
        {/* The rules, ticking as the beat grows (for readers; the youngest hear them). */}
        {a.mode === "make" && rules.length > 0 && fx.voice !== "all" && (
          <div className="flex min-w-[320px] max-w-[700px] flex-1 flex-wrap items-center justify-center gap-2">
            {rules.map((r, i) => {
              const ok = !fails.includes(r);
              const shake = badRule?.i === i;
              return (
                <button
                  key={`${i}:${shake ? badRule?.k : 0}`}
                  type="button"
                  onClick={() => (sfx("tap"), void fx.say(ruleText(r, steps)))}
                  className={cn("flex items-center gap-1.5 rounded-full py-1 pl-1.5 pr-3.5 text-left font-display text-base font-extrabold leading-tight shadow-[0_3px_0_rgba(0,40,80,0.15)] transition-colors", ok ? "bg-[#e3fbea] text-[var(--l-green-edge)]" : shake ? "l-shake bg-[#ffe7e3] text-[var(--l-coral-edge)]" : "bg-white/95 text-[var(--l-ink)]")}
                >
                  {ok ? <CheckCircle2 key="y" className="l-pop-in h-6 w-6 shrink-0" strokeWidth={2.6} /> : <Circle className="h-6 w-6 shrink-0 opacity-50" strokeWidth={2.6} />}
                  {"row" in r && <InstrumentPic id={r.row} size={28} />}
                  {ruleText(r, steps)}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex items-center justify-center gap-5">
        {target && (
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              aria-label={what === "target" ? "Stop" : "Hear the beat"}
              onClick={toggleTarget}
              disabled={!building}
              className={cn("relative flex items-center justify-center rounded-full bg-[var(--l-violet)] text-white shadow-[0_6px_0_var(--l-violet-edge)] transition-transform active:translate-y-1 disabled:opacity-50", !heard && what !== "target" && "l-pulse")}
              style={{ width: big ? 96 : 84, height: big ? 96 : 84 }}
            >
              {what === "target" && <span className="l-hear-ring pointer-events-none absolute inset-0 rounded-full" aria-hidden />}
              <Ear className={cn(big ? "h-12 w-12" : "h-10 w-10", what === "target" && "l-hear-wiggle")} strokeWidth={2.4} />
            </button>
            {!big && <span className="font-display text-base font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.3)]">Hear it</span>}
          </div>
        )}
        <div className="flex flex-col items-center gap-1">
          <PlayButton playing={what === "mine" || what === "show"} onClick={toggleMine} size={big ? 100 : 88} pulse={awake && hasHits && what === "none" && misses === 0} className={cn(!building && "pointer-events-none")} />
          {!big && <span className="font-display text-base font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.3)]">{target ? "My beat" : "Play"}</span>}
        </div>
        {building ? (
          <>
            <Chunk tone="green" disabled={!awake} onClick={check} className={cn("flex items-center gap-2 px-8 font-display text-2xl font-extrabold disabled:opacity-50", big ? "h-[80px]" : "h-[72px]")}>
              <Check className="h-8 w-8" strokeWidth={3.5} /> Check
            </Chunk>
            <Chunk tone={wipe ? "coral" : "ghost"} disabled={!awake || !hasHits} onClick={clear} aria-label="Clear the beat" className="flex h-[60px] items-center gap-2 px-4 font-display text-lg font-extrabold disabled:opacity-40">
              <Eraser className="h-6 w-6" strokeWidth={2.6} /> {wipe ? "Tap again" : null}
            </Chunk>
          </>
        ) : (
          <Chunk tone="blue" onClick={() => (sfx("tap"), finish(misses))} className="l-pop-in flex h-[72px] items-center gap-2 px-8 font-display text-2xl font-extrabold">
            Next <ArrowRight className="h-7 w-7" strokeWidth={3} />
          </Chunk>
        )}
        </div>
      </div>
    </div>
  );
}
