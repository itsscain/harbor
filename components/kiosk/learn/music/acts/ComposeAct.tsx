"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, CheckCircle2, Circle, Eraser, Volume2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Part } from "@/lib/learn/audio";
import type { ComposeRule, Score } from "@/lib/learn/mus/types";
import { SCALES, noteColor, noteName, pcOf, solfegeWords, type ScaleKind } from "@/lib/learn/mus/theory";
import { layer, melody, scoreSeconds } from "@/lib/learn/mus/score";
import { composeFails, solveCompose } from "@/lib/learn/mus/check";
import { SONG_ADJ, SONG_NOUN, newSong, type StudioSong } from "@/lib/learn/mus/song";
import { SAY } from "@/lib/learn/script";
import { sfx } from "@/lib/learn/sfx";
import { Chunk } from "../../kit";
import { PromptRow, spoken, useLater, type ActProps } from "../../acts/common";
import { usePlayer } from "../kit/player";
import { PlayButton, SoundOffNote } from "../kit/kit";
import { MelodyGrid, type MelodyNote } from "../kit/MelodyGrid";

// Write a tune. The notes sit on a grid (one note or a rest per slot — tap to place, tap again for
// a rest, or drag across to draw a tune), and Play sings it with the band underneath. The rules are
// a checklist that ticks itself as the tune changes ("End on do", "Use 6 notes", "Only steps"), but
// only Check finishes it: a broken rule is named (and pointed at), three misses show one way it
// could go. A tune that follows the rules is played back big — and kept in the child's Studio.

const TRIES = 3;
const freshId = () => Math.random().toString(36).slice(2, 8);
const nowIso = () => new Date().toISOString();
const anyOf = (list: readonly string[]) => list[Math.floor(Math.random() * list.length)];
const hashSeed = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) % 100000;
};
const andList = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const FLAT_TONICS = new Set([1, 3, 5, 6, 8, 10]);

type Playing = "none" | "mine" | "show";
type A = ActProps<"compose">["act"];

/** A note's name in kid words: "low la", "do", "high do" — or its letter. */
function noteWords(p: number, a: A): string {
  return a.labels === "letters" ? noteName(p, { flats: FLAT_TONICS.has(pcOf(a.tonic)) }) : solfegeWords(p, a.tonic);
}
function ruleText(r: ComposeRule, a: A): string {
  switch (r.rule) {
    case "start":
      return `Start on ${noteWords(r.p, a)}`;
    case "end":
      return `End on ${noteWords(r.p, a)}${pcOf(r.p - a.tonic) === 0 ? " (home)" : ""}`;
    case "use":
      return `Use ${andList(r.pitches.map((p) => noteWords(p, a)))}`;
    case "notes":
      if (r.max === undefined) return `Use at least ${r.min} notes`;
      if (r.min === r.max) return `Use exactly ${r.min} notes`;
      if (r.min <= 1) return `Use no more than ${r.max} notes`;
      return `Use ${r.min} to ${r.max} notes`;
    case "steps":
      return "Only steps — no skips";
    case "leap":
      return r.min <= 2 ? "Make a skip somewhere" : `Make one big jump (${r.min} notes or more)`;
    case "rests":
      return r.min <= 1 ? "Put in a rest (a quiet spot)" : `Put in ${r.min} rests (quiet spots)`;
    case "repeat":
      return `Play your first ${r.len} again later`;
    case "contour":
      return r.dir === "up" ? "End higher than you start" : "End lower than you start";
    case "arch":
      return "Put your highest note in the middle";
  }
}
/** The notes a rule is about (shown as colored dots on its chip). */
const ruleDots = (r: ComposeRule): number[] => (r.rule === "start" || r.rule === "end" ? [r.p] : r.rule === "use" ? r.pitches : []);

/** The narrowest scale that holds every offered note (the Studio's Melody Maker opens in it). */
function scaleFor(pitches: number[], tonic: number): ScaleKind {
  const pcs = [...new Set(pitches.map((p) => pcOf(p - tonic)))];
  const order: ScaleKind[] = ["sml", "dmsl", "penta", "major", "minorPenta", "minor", "blues", "dorian", "mixolydian", "chromatic"];
  return order.find((k) => pcs.every((pc) => SCALES[k].includes(pc))) ?? "chromatic";
}
/** The tune as a Studio song: semitones above do in eighth-note slots (a longer note holds). */
function tuneSong(a: A, notes: (number | null)[]): StudioSong {
  const each = Math.max(1, Math.round(a.dur * 2));
  const flat: (number | "-" | null)[] = notes.flatMap((p) => [p === null ? null : p - a.tonic, ...Array.from({ length: each - 1 }, () => (p === null ? null : ("-" as const)))]);
  const bars: 1 | 2 | 4 = flat.length <= 8 ? 1 : flat.length <= 16 ? 2 : 4;
  const inst = a.inst ?? "bells";
  const base = newSong(`tune-${freshId()}`, { inst, scale: scaleFor(a.pitches, a.tonic), title: `${anyOf(SONG_ADJ)} ${anyOf(SONG_NOUN)} ${anyOf(["Song", "Tune"])}` });
  const words = (a.lyric ?? []).filter((x) => x?.trim()).join(" ").replace(/-\s+/g, "").trim();
  return {
    ...base,
    bpm: Math.round(Math.max(60, Math.min(180, a.bpm))),
    key: a.tonic,
    bars,
    beat: { rows: base.beat.rows, grid: base.beat.rows.map(() => ".".repeat(bars * 8)) },
    melody: { inst, notes: Array.from({ length: bars * 8 }, (_, i) => flat[i] ?? null) },
    lyrics: words ? [words.slice(0, 60)] : [],
    at: nowIso(),
  };
}

export function ComposeAct({ act: a, fx, onDone }: ActProps<"compose">) {
  const inst = a.inst ?? "bells";
  const labels = a.labels ?? "solfege";
  const voiced = fx.voice !== "keys";
  const big = fx.voice === "all";
  const start = useMemo(
    () =>
      Array.from({ length: a.slots }, (_, i) => {
        const v = a.start?.[i];
        return typeof v === "number" && a.pitches.includes(v) ? v : null;
      }),
    [a.slots, a.start, a.pitches],
  );
  const player = usePlayer();
  const later = useLater();
  const { parts, auto } = spoken(fx, a.say, a.prompt);
  const [notes, setNotes] = useState<(number | null)[]>(start);
  const [what, setWhat] = useState<Playing>("none");
  const [misses, setMisses] = useState(0);
  const [phase, setPhase] = useState<"build" | "won" | "shown">("build");
  const [msg, setMsg] = useState<{ text: string; good?: boolean; k: number } | null>(null);
  const [badRule, setBadRule] = useState<{ i: number; k: number } | null>(null);
  const [marks, setMarks] = useState<number[] | undefined>(undefined);
  const [saved, setSaved] = useState(false);
  const [wipe, setWipe] = useState(false);
  const doneRef = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const building = phase === "build";

  const finish = (m: number) => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone(m);
  };
  const tuneScore = (ns: (number | null)[]): Score => {
    const mel = melody(ns, a.dur, inst, a.bpm);
    return a.backing ? layer(mel, a.backing) : mel;
  };
  const play = (ns: (number | null)[], kind: Playing, then?: () => void) => {
    setWhat(kind);
    player.play(tuneScore(ns), {
      onEnd: () => {
        setWhat("none");
        then?.();
      },
    });
  };
  const toggle = () => {
    sfx("tap");
    if (what !== "none") {
      player.stop();
      setWhat("none");
      return;
    }
    play(notes, "mine");
  };
  const onGrid = useCallback((n: MelodyNote[]) => {
    setNotes(n.map((x) => (typeof x === "number" ? x : null)));
    setMarks(undefined);
    setWipe(false);
    setMsg(null);
  }, []);

  // Ask (the first time, say how); a tune that's already begun is played for the youngest.
  useEffect(() => {
    const how: Part[] = voiced && fx.firstTime ? [{ gap: 300 }, SAY.composeHow] : [];
    const words: Part[] = [...parts, ...how];
    fx.setPrompt(words);
    const t = window.setTimeout(() => {
      const go = () => {
        if (voiced && start.some((p) => p !== null)) play(start, "mine");
      };
      if ((auto || how.length) && words.length) void fx.say(words).then((ok) => ok && go());
      else go();
    }, 380);
    return () => window.clearTimeout(t);
    // Asked once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Checking ──
  const fails = composeFails(notes, a.rules, a.pitches);
  const firstNote = notes.findIndex((p) => p !== null);
  const lastNote = notes.reduce<number>((acc, p, i) => (p !== null ? i : acc), -1);
  const pointAt = (r: ComposeRule): number[] | undefined => {
    if (r.rule === "start") return [Math.max(0, firstNote)];
    if (r.rule === "end") return [lastNote >= 0 ? lastNote : a.slots - 1];
    if (r.rule === "contour") return firstNote >= 0 ? [firstNote, lastNote] : undefined;
    if (r.rule === "repeat") return Array.from({ length: Math.min(r.len, a.slots) }, (_, i) => i);
    return undefined;
  };
  const repair = (mel: (number | null)[]): (number | null)[] => {
    const out = [...mel];
    for (const r of a.rules) {
      if (r.rule === "start") out[Math.max(0, out.findIndex((p) => p !== null))] = r.p;
      if (r.rule === "end") out[Math.max(0, out.reduce<number>((acc, p, i) => (p !== null ? i : acc), a.slots - 1))] = r.p;
    }
    if (!composeFails(out, a.rules, a.pitches).length) return out;
    return solveCompose(a.pitches, a.slots, a.rules, 1 + hashSeed(fx.seed)) ?? out;
  };
  const win = () => {
    setPhase("won");
    setBadRule(null);
    setMarks(undefined);
    fx.right(cardRef.current);
    setMsg({ text: "What a tune!", good: true, k: 0 });
    let keep = false;
    if (fx.saveSong) {
      fx.saveSong(tuneSong(a, notes));
      keep = true;
      setSaved(true);
    }
    const ns = notes;
    const m = misses;
    let ran = false;
    const after = () => {
      if (ran) return;
      ran = true;
      if (keep) void fx.say(SAY.songSaved).then(() => finish(m));
      else finish(m);
    };
    later(() => {
      if (!fx.reduced) fx.burst(cardRef.current, "star", 18);
      play(ns, "show", after);
      if (!fx.reduced) later(() => fx.burst(cardRef.current, "heart", 10), Math.min(2400, (scoreSeconds(tuneScore(ns)) * 1000) / 2));
    }, 1100);
    later(after, 1100 + scoreSeconds(tuneScore(ns)) * 1000 + 3000);
  };
  const reveal = (m: number) => {
    const ans = repair(notes);
    setNotes(ans);
    setMarks(undefined);
    setBadRule(null);
    setPhase("shown");
    setMsg({ text: "Here's one way it could go — listen!", k: 99 });
    play(ans, "show", () => later(() => finish(m), 600));
    later(() => finish(m), scoreSeconds(tuneScore(ans)) * 1000 + 3500);
  };
  const check = () => {
    if (!building) return;
    player.stop();
    setWhat("none");
    const f = composeFails(notes, a.rules, a.pitches);
    if (!f.length) return win();
    const first = f[0];
    const line = `${ruleText(first, a)}!`;
    const m = misses + 1;
    setMisses(m);
    fx.miss();
    setBadRule({ i: a.rules.indexOf(first), k: m });
    setMarks(pointAt(first));
    setMsg({ text: line, k: m });
    void fx.say(line);
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
    setNotes(Array.from({ length: a.slots }, () => null));
  };

  // ── Following the tune ──
  const beat = what !== "none" ? player.beat : null;
  const playSlot = beat !== null && beat >= 0 && beat < a.slots * a.dur ? Math.floor(beat / a.dur + 1e-6) : -1;
  const perBar = Math.round(4 / a.dur);
  const bar = perBar >= 2 && perBar < a.slots && Math.abs(4 / a.dur - perBar) < 1e-6 ? perBar : 4;
  const hasNotes = notes.some((p) => p !== null);

  return (
    <div className="flex w-full max-w-[1140px] flex-col items-center gap-3">
      <PromptRow parts={parts}>{a.prompt}</PromptRow>
      <SoundOffNote />
      <div className="flex w-full items-stretch gap-4">
        <div ref={cardRef} className="relative min-w-0 flex-1 rounded-[30px] bg-white/95 p-4 shadow-[0_8px_0_rgba(0,40,80,0.14)]">
          <MelodyGrid pitches={a.pitches} notes={notes} onChange={onGrid} tonic={a.tonic} labels={labels} inst={inst} playSlot={playSlot} lyric={a.lyric} bar={bar} marks={marks} disabled={!building} size={big ? "lg" : "md"} />
        </div>
        <div className="flex w-[min(32%,320px)] shrink-0 flex-col gap-2.5">
          {/* The rules, ticking themselves as the tune changes (tap one to hear it). */}
          <div className="flex flex-col gap-2 rounded-[26px] bg-white/30 p-2.5">
            {a.rules.map((r, i) => {
              const ok = !fails.includes(r);
              const shaking = badRule?.i === i;
              const text = ruleText(r, a);
              return (
                <button
                  key={`${i}:${shaking ? badRule?.k : 0}`}
                  type="button"
                  onClick={() => (sfx("tap"), void fx.say(text))}
                  className={cn(
                    "flex min-h-[52px] items-center gap-2 rounded-[18px] px-3 py-1.5 text-left font-display text-lg font-extrabold leading-tight shadow-[0_3px_0_rgba(0,40,80,0.14)] transition-colors",
                    ok ? "bg-[#e3fbea] text-[var(--l-green-edge)]" : shaking ? "l-shake bg-[#ffe7e3] text-[var(--l-coral-edge)]" : "bg-white text-[var(--l-ink)]",
                  )}
                >
                  {ok ? <CheckCircle2 key="y" className="l-pop-in h-7 w-7 shrink-0" strokeWidth={2.6} /> : <Circle className="h-7 w-7 shrink-0 opacity-45" strokeWidth={2.6} />}
                  <span className="min-w-0 flex-1">{text}</span>
                  {ruleDots(r).map((p) => (
                    <span key={p} className="h-5 w-5 shrink-0 rounded-full border-[3px] border-[#2a2f45]/60" style={{ background: noteColor(p) }} aria-hidden />
                  ))}
                  {voiced && <Volume2 className="h-5 w-5 shrink-0 opacity-50" strokeWidth={2.6} aria-hidden />}
                </button>
              );
            })}
          </div>
          <div className="flex min-h-11 flex-wrap items-center justify-center gap-2">
            {msg && (
              <span key={msg.k} className={cn("l-pop-in rounded-[18px] px-4 py-1.5 text-center font-display text-lg font-extrabold leading-tight text-white shadow-[0_4px_0_rgba(0,40,80,0.2)]", msg.good ? "bg-[var(--l-green)]" : "bg-[var(--l-orange)]")}>
                {msg.text}
              </span>
            )}
            {saved && <span className="l-pop-in rounded-[18px] bg-[#d9408f] px-4 py-1.5 font-display text-lg font-extrabold text-white shadow-[0_4px_0_#a8306e]">Saved to your Studio!</span>}
          </div>
          <div className="mt-auto flex items-center justify-center gap-3">
            <PlayButton playing={what !== "none"} onClick={toggle} size={big ? 100 : 88} pulse={building && hasNotes && what === "none" && misses === 0} className={cn(!building && "pointer-events-none")} />
            {building ? (
              <div className="flex flex-col gap-2">
                <Chunk tone="green" onClick={check} className={cn("flex items-center gap-2 px-6 font-display text-2xl font-extrabold", big ? "h-[76px]" : "h-[68px]")}>
                  <Check className="h-8 w-8" strokeWidth={3.5} /> Check
                </Chunk>
                <Chunk tone={wipe ? "coral" : "ghost"} disabled={!hasNotes} onClick={clear} aria-label="Clear the tune" className="flex h-12 items-center justify-center gap-2 px-4 font-display text-lg font-extrabold disabled:opacity-40">
                  <Eraser className="h-6 w-6" strokeWidth={2.6} /> {wipe ? "Tap again" : "Clear"}
                </Chunk>
              </div>
            ) : (
              <Chunk tone="blue" onClick={() => (sfx("tap"), finish(misses))} className="l-pop-in flex h-[68px] items-center gap-2 px-6 font-display text-2xl font-extrabold">
                Next <ArrowRight className="h-7 w-7" strokeWidth={3} />
              </Chunk>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
