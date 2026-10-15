"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, CheckCircle2, Circle, Ear, Eraser } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Part } from "@/lib/learn/audio";
import type { ChordRule, MTrack, Score } from "@/lib/learn/mus/types";
import { parseRoman } from "@/lib/learn/mus/theory";
import { progression, scoreSeconds } from "@/lib/learn/mus/score";
import { chordFails, solveChords } from "@/lib/learn/mus/check";
import { SAY } from "@/lib/learn/script";
import { sfx } from "@/lib/learn/sfx";
import { Chunk } from "../../kit";
import { PromptRow, spoken, useLater, type ActProps } from "../../acts/common";
import { usePlayer } from "../kit/player";
import { PlayButton, SoundOffNote } from "../kit/kit";
import { ChordStrip } from "../kit/ChordStrip";

// Chords, the harmony under a song. Chord cards go into bars (tap a card, then a bar — or drag it),
// and Play strums the progression with a bass line (and a drum groove when the level has a beat),
// the bar being played glowing.
//   match  hear a progression, then rebuild it — Check says which bars sound different;
//   build  make your own that follows the rules ("Start on I", "End strong: V then I") — the rules
//          tick themselves as you go, but only Check finishes it.
// Three misses show the answer (or one way to follow the rules) so no one is ever stuck. A finished
// progression is played back with the band.

const TRIES = 3;
type Playing = "none" | "mine" | "answer" | "show";
type A = ActProps<"chords">["act"];

const andList = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const NUM = ["one", "two", "three", "four", "five", "six", "seven"];
function degreeOf(c: string): number {
  try {
    const x = parseRoman(c);
    return x.shift === 0 ? x.degree : -1;
  } catch {
    return -1;
  }
}
/** A roman numeral as it's said: "five", "five seven", "flat seven". */
function sayRoman(c: string): string {
  try {
    const x = parseRoman(c);
    return `${x.shift < 0 ? "flat " : x.shift > 0 ? "sharp " : ""}${NUM[x.degree]}${/7$/.test(c) ? " seven" : ""}`;
  } catch {
    return c;
  }
}
/** A chord rule in kid words — to show (`speak` = false) or to say (numerals as number words). */
function ruleText(r: ChordRule, a: A, speak = false): string {
  const nm = (c: string) => (speak ? sayRoman(c) : c);
  const deg = (d: number) => nm(a.palette.find((c) => degreeOf(c) === d) ?? (a.scale === "minor" ? ["i", "ii°", "III", "iv", "V", "VI", "VII"] : ["I", "ii", "iii", "IV", "V", "vi", "vii°"])[d]);
  const home = (c: string) => (degreeOf(c) === 0 ? " (home)" : "");
  switch (r.rule) {
    case "start":
      return `Start on ${nm(r.chord)}${home(r.chord)}`;
    case "end":
      return `End on ${nm(r.chord)}${home(r.chord)}`;
    case "use":
      return `Use ${andList(r.chords.map(nm))}`;
    case "cadence":
      if (r.kind === "authentic") return `End strong: ${deg(4)} then ${deg(0)}`;
      if (r.kind === "plagal") return `End with an "Amen": ${deg(3)} then ${deg(0)}`;
      if (r.kind === "half") return `End on ${deg(4)}, like a question`;
      return `End with a surprise: ${deg(4)} then ${deg(5)}`;
  }
}

export function ChordsAct({ act: a, fx, onDone }: ActProps<"chords">) {
  const per = a.bars >= 8 ? 2 : 4;
  const inst = a.inst ?? "piano";
  const match = a.mode === "match" && !!a.answer?.length;
  const rules = useMemo(() => a.rules ?? [], [a.rules]);
  const voiced = fx.voice !== "keys";
  const big = fx.voice === "all";
  const player = usePlayer();
  const later = useLater();
  const { parts, auto } = spoken(fx, a.say, a.prompt);
  const empty = useMemo(() => Array.from({ length: a.bars }, () => null as string | null), [a.bars]);
  const [prog, setProg] = useState<(string | null)[]>(empty);
  const [what, setWhat] = useState<Playing>("none");
  const [heard, setHeard] = useState(!match);
  const [misses, setMisses] = useState(0);
  const [phase, setPhase] = useState<"build" | "won" | "shown">("build");
  const [msg, setMsg] = useState<{ text: string; good?: boolean; k: number } | null>(null);
  const [marks, setMarks] = useState<{ bars: number[]; k: number } | undefined>(undefined);
  const [badRule, setBadRule] = useState<{ i: number; k: number } | null>(null);
  const [wipe, setWipe] = useState(false);
  const doneRef = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const tick = useRef(0);
  const building = phase === "build";
  const awake = heard && building;

  const finish = (m: number) => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone(m);
  };
  /** The progression with the band; bars with no chord yet stay quiet (the groove keeps going). */
  const progScore = (p: (string | null)[], drums: boolean): Score => {
    const s = progression(
      p.map((r) => r ?? a.palette[0] ?? "I"),
      a.tonic,
      a.scale,
      { bpm: a.bpm, per, inst, style: "strum", bass: true, drums: drums ? "pop" : null },
    );
    if (p.every(Boolean)) return s;
    const quiet = (t: Extract<MTrack, { kind: "notes" }>) => {
      let at = t.at ?? 0;
      return {
        ...t,
        notes: t.notes.map((x) => {
          const barIx = Math.floor(at / per + 1e-6);
          at += x.d;
          return p[barIx] ? x : { ...x, p: null };
        }),
      };
    };
    return { ...s, tracks: s.tracks.map((t) => (t.kind === "notes" ? quiet(t) : t)) };
  };
  const play = (p: (string | null)[], kind: Playing, drums: boolean, then?: () => void) => {
    setWhat(kind);
    player.play(progScore(p, drums), {
      onEnd: () => {
        setWhat("none");
        if (kind === "answer") setHeard(true);
        then?.();
      },
    });
  };
  const stop = () => {
    if (what === "answer") setHeard(true);
    player.stop();
    setWhat("none");
  };
  const toggleAnswer = () => {
    sfx("tap");
    if (what === "answer") return stop();
    play(a.answer ?? [], "answer", !!a.beat);
  };
  const toggleMine = () => {
    sfx("tap");
    if (what === "mine") return stop();
    if (what === "answer") setHeard(true);
    play(prog, "mine", !!a.beat);
  };
  const onStrip = useCallback((v: (string | null)[]) => {
    setProg(v);
    setMarks(undefined);
    setWipe(false);
    setMsg(null);
  }, []);

  // Ask (the first time, say how), then play the progression to rebuild for the youngest.
  useEffect(() => {
    const how: Part[] = voiced && fx.firstTime ? [{ gap: 300 }, SAY.chordsHow] : [];
    const words: Part[] = [...parts, ...how];
    fx.setPrompt(words);
    const t = window.setTimeout(() => {
      const go = () => {
        if (match && voiced) play(a.answer ?? [], "answer", !!a.beat);
      };
      if ((auto || how.length) && words.length) void fx.say(words).then((ok) => ok && go());
      else go();
    }, 380);
    const cap = window.setTimeout(() => setHeard(true), 22000);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(cap);
    };
    // Asked once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Checking ──
  const full = prog.every(Boolean);
  // Live ticks, even while bars are still empty (a cadence needs its last two bars filled first).
  const fails = match
    ? []
    : rules.filter((r) => {
        if (r.rule !== "cadence") return chordFails(prog.map((c) => c ?? ""), [r]).length > 0;
        const x = prog[a.bars - 2];
        const y = prog[a.bars - 1];
        return !x || !y || chordFails([x, y], [r]).length > 0;
      });
  const repair = (p: (string | null)[]): string[] => {
    const out = p.map((r) => r ?? a.palette[0] ?? "I");
    const byDeg = (d: number) => a.palette.find((c) => degreeOf(c) === d);
    for (const r of rules) {
      if (r.rule === "start") out[0] = r.chord;
      if (r.rule === "end") out[out.length - 1] = r.chord;
      if (r.rule === "cadence" && out.length >= 2) {
        const [x, y] = r.kind === "authentic" ? [4, 0] : r.kind === "plagal" ? [3, 0] : r.kind === "deceptive" ? [4, 5] : [-1, 4];
        const cx = x >= 0 ? byDeg(x) : undefined;
        const cy = byDeg(y);
        if (cx) out[out.length - 2] = cx;
        if (cy) out[out.length - 1] = cy;
      }
    }
    for (const r of rules) {
      if (r.rule !== "use") continue;
      let k = 1;
      for (const c of r.chords.filter((c) => !out.includes(c))) if (k < out.length - 2) out[k++] = c;
    }
    return chordFails(out, rules).length ? (solveChords(a.palette, a.bars, rules) ?? out) : out;
  };
  const win = () => {
    setPhase("won");
    setMarks(undefined);
    setBadRule(null);
    fx.right(cardRef.current);
    setMsg({ text: match ? "You rebuilt it by ear!" : "Sounds like a real song!", good: true, k: 0 });
    const p = prog;
    const m = misses;
    later(() => {
      if (!fx.reduced) fx.burst(cardRef.current, "star", 16);
      play(p, "show", true, () => later(() => finish(m), 500));
    }, 1100);
    later(() => finish(m), 1100 + scoreSeconds(progScore(p, true)) * 1000 + 3000);
  };
  const reveal = (m: number) => {
    const ans = match ? [...(a.answer ?? [])] : repair(prog);
    setProg(ans);
    setMarks(undefined);
    setBadRule(null);
    setPhase("shown");
    setMsg({ text: match ? "Here's how it goes — listen!" : "Here's one way — listen!", k: 99 });
    play(ans, "show", true, () => later(() => finish(m), 600));
    later(() => finish(m), scoreSeconds(progScore(ans, true)) * 1000 + 3500);
  };
  const check = () => {
    if (!building) return;
    stop();
    // Not finished yet isn't wrong: point at the empty bars.
    const holes = prog.flatMap((r, i) => (r ? [] : [i]));
    if (holes.length) {
      sfx("soft-fail");
      const line = "Put a chord in every bar first!";
      const k = 1000 + ++tick.current;
      setMarks({ bars: holes, k });
      setMsg({ text: line, k });
      void fx.say(line);
      return;
    }
    const p = prog as string[];
    let line = "";
    let point: number[] = [];
    let sayIt = "";
    if (match) {
      const ans = a.answer ?? [];
      point = p.flatMap((r, i) => (r === ans[i] ? [] : [i]));
      if (!point.length) return win();
      line = point.length === 1 ? `Listen again! Bar ${point[0] + 1} sounds different.` : "Listen again! The red bars sound different.";
      sayIt = line;
    } else {
      const f = chordFails(p, rules);
      if (!f.length) return win();
      const first = f[0];
      line = `${ruleText(first, a)}!`;
      sayIt = `${ruleText(first, a, true)}!`;
      setBadRule({ i: rules.indexOf(first), k: misses + 1 });
      point = first.rule === "start" ? [0] : first.rule === "end" ? [a.bars - 1] : first.rule === "cadence" ? [a.bars - 2, a.bars - 1].filter((i) => i >= 0) : [];
    }
    const m = misses + 1;
    setMisses(m);
    fx.miss();
    setMarks(point.length ? { bars: point, k: m } : undefined);
    setMsg({ text: line, k: m });
    void fx.say(sayIt);
    if (m >= TRIES) later(() => reveal(m), 2600);
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
    setMarks(undefined);
    setProg(empty);
  };

  // ── Following the music ──
  const beat = what !== "none" ? player.beat : null;
  const playBar = beat !== null && beat >= 0 && beat < a.bars * per ? Math.floor(beat / per + 1e-6) : -1;
  const any = prog.some(Boolean);

  return (
    <div className="flex w-full max-w-[1120px] flex-col items-center gap-3">
      <PromptRow parts={parts}>{a.prompt}</PromptRow>
      <SoundOffNote />
      <div ref={cardRef} className="relative w-full rounded-[30px] bg-white/95 p-4 shadow-[0_8px_0_rgba(0,40,80,0.14)]">
        <ChordStrip palette={a.palette} value={prog} onChange={onStrip} tonic={a.tonic} scale={a.scale} playBar={playBar} inst={inst} disabled={!awake} marks={marks} size={big ? "lg" : "md"} />
        {!heard && building && (
          <button type="button" onClick={toggleAnswer} className="absolute inset-0 flex items-center justify-center rounded-[30px] bg-white/55" aria-label="Hear it first">
            <span className="l-pop-in flex items-center gap-3 rounded-full bg-[var(--l-violet)] px-6 py-3 font-display text-2xl font-extrabold text-white shadow-[0_5px_0_var(--l-violet-edge)]">
              <Ear className={cn("h-8 w-8", what === "answer" && "l-hear-wiggle")} strokeWidth={2.6} />
              {what === "answer" ? "Listen…" : "Hear it first!"}
            </span>
          </button>
        )}
      </div>

      {/* The rules, ticking themselves as the chords go in (tap one to hear it). */}
      {!match && rules.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {rules.map((r, i) => {
            const ok = !fails.includes(r);
            const shaking = badRule?.i === i;
            return (
              <button
                key={`${i}:${shaking ? badRule?.k : 0}`}
                type="button"
                onClick={() => (sfx("tap"), void fx.say(ruleText(r, a, true)))}
                className={cn("flex items-center gap-2 rounded-full py-1.5 pl-2 pr-4 font-display text-lg font-extrabold shadow-[0_3px_0_rgba(0,40,80,0.15)] transition-colors", ok ? "bg-[#e3fbea] text-[var(--l-green-edge)]" : shaking ? "l-shake bg-[#ffe7e3] text-[var(--l-coral-edge)]" : "bg-white/95 text-[var(--l-ink)]")}
              >
                {ok ? <CheckCircle2 key="y" className="l-pop-in h-7 w-7" strokeWidth={2.6} /> : <Circle className="h-7 w-7 opacity-50" strokeWidth={2.6} />}
                {ruleText(r, a)}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex min-h-11 items-center justify-center">
        {msg && (
          <span key={msg.k} className={cn("l-pop-in rounded-full px-5 py-1.5 text-center font-display text-xl font-extrabold text-white shadow-[0_4px_0_rgba(0,40,80,0.2)]", msg.good ? "bg-[var(--l-green)]" : "bg-[var(--l-orange)]")}>
            {msg.text}
          </span>
        )}
      </div>

      <div className="flex items-center justify-center gap-5">
        {match && (
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              aria-label={what === "answer" ? "Stop" : "Hear it"}
              onClick={toggleAnswer}
              disabled={!building}
              className={cn("relative flex items-center justify-center rounded-full bg-[var(--l-violet)] text-white shadow-[0_6px_0_var(--l-violet-edge)] transition-transform active:translate-y-1 disabled:opacity-50", !heard && what !== "answer" && "l-pulse")}
              style={{ width: big ? 96 : 84, height: big ? 96 : 84 }}
            >
              {what === "answer" && <span className="l-hear-ring pointer-events-none absolute inset-0 rounded-full" aria-hidden />}
              <Ear className={cn(big ? "h-12 w-12" : "h-10 w-10", what === "answer" && "l-hear-wiggle")} strokeWidth={2.4} />
            </button>
            <span className="font-display text-base font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.3)]">Hear it</span>
          </div>
        )}
        <div className="flex flex-col items-center gap-1">
          <PlayButton playing={what === "mine" || what === "show"} onClick={toggleMine} size={big ? 104 : 92} pulse={awake && full && what === "none" && misses === 0} className={cn(!building && "pointer-events-none", building && !any && "pointer-events-none opacity-50")} />
          <span className="font-display text-base font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.3)]">{match ? "Mine" : "Play"}</span>
        </div>
        {building ? (
          <>
            <Chunk tone="green" disabled={!awake} onClick={check} className={cn("flex items-center gap-2 px-8 font-display text-2xl font-extrabold disabled:opacity-50", big ? "h-[80px]" : "h-[72px]")}>
              <Check className="h-8 w-8" strokeWidth={3.5} /> Check
            </Chunk>
            <Chunk tone={wipe ? "coral" : "ghost"} disabled={!awake || !any} onClick={clear} aria-label="Clear the chords" className="flex h-[60px] items-center gap-2 px-4 font-display text-lg font-extrabold disabled:opacity-40">
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
  );
}
