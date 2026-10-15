"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Ear } from "lucide-react";
import { cn } from "@/lib/cn";
import { speakingNow, subscribeVoice, type Part } from "@/lib/learn/audio";
import { SAY } from "@/lib/learn/script";
import { sfx } from "@/lib/learn/sfx";
import type { InstId, Score, StaffNote } from "@/lib/learn/mus/types";
import { NATURAL_PC, keyAcc, noteColor, pcOf, solfege, spell, spelledName } from "@/lib/learn/mus/theory";
import { activeAt, melody, note1, timeline } from "@/lib/learn/mus/score";
import { prefixMatch, samePitches } from "@/lib/learn/mus/judge";
import { PromptRow, spoken, useLater, type ActProps } from "../../acts/common";
import { Glyph } from "../../art/Glyph";
import { usePlayer } from "../kit/player";
import { Bells, Keyboard, Ladder, MiniPlay, PlayButton, SoundOffNote } from "../kit/kit";
import { Staff } from "../kit/notation";

// Melody on the bells (or a piano) — three ways to play:
//   echo  hear a little tune (each bell lights as it rings), then play it back. A wrong note is a
//         gentle "oops", and the tune plays again from the top;
//   read  the notes are written (a staff, or the solfège ladder): play them in order — the next one
//         glows. "Hear it" plays the tune for anyone who wants to check;
//   find  play the one note asked for (it glows after two misses).
// Three slips and we play it together (the bells light in time), then sail on. A tune that's
// played right comes back as a little concert: the child's own notes, the bells lighting in time.

// ── Small shared pieces (the staff and keyboard screens use them too) ─────────────────────────

/** Run `fn` once Learn's voice is quiet, no sooner than `min` ms from now (playing music stops the
 *  voice, so music waits its turn). Anything still waiting is dropped when the activity goes away. */
export function useWhenQuiet() {
  const pending = useRef<(() => void)[]>([]);
  useEffect(() => {
    const list = pending.current;
    return () => list.forEach((cancel) => cancel());
  }, []);
  return useCallback((fn: () => void, min = 0) => {
    let done = false;
    let unsub: (() => void) | null = null;
    const timers: number[] = [];
    const stop = () => {
      done = true;
      unsub?.();
      timers.forEach((t) => window.clearTimeout(t));
    };
    const fire = () => {
      if (done) return;
      stop();
      fn();
    };
    timers.push(
      window.setTimeout(() => {
        if (done) return;
        if (!speakingNow()) return fire();
        unsub = subscribeVoice(() => {
          if (!speakingNow()) timers.push(window.setTimeout(() => !speakingNow() && fire(), 160));
        });
      }, min),
    );
    timers.push(window.setTimeout(fire, min + 9000)); // never wait forever
    pending.current.push(stop);
  }, []);
}

/** The words for a note name: "F♯" → "F sharp", "B♭" → "B flat" (recorded music words). */
export const noteWords = (name: string) => name.replace("♯", " sharp").replace("♭", " flat");

export const isBlackKey = (m: number) => !NATURAL_PC.includes(pcOf(m));

/** Keeps a finger from gliding across a keyboard: in a quiz, a slide would press every key it crosses. */
export function NoGlide({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={className} onPointerMoveCapture={(e) => e.stopPropagation()}>
      {children}
    </div>
  );
}

/** What's sounding in a score at a beat: the note's index in its line and its pitches. A note is lit
 *  for most of its length (not all of it), so a repeated note blinks between strikes. */
export function soundingAt(score: Score | null, beat: number | null): { i: number; ps: number[] } {
  if (!score || beat === null || beat < 0) return { i: -1, ps: [] };
  const track = score.tracks.find((t) => t.kind === "notes");
  if (!track) return { i: -1, ps: [] };
  const tl = timeline(track);
  const i = activeAt(tl, beat);
  if (i < 0 || beat - tl[i].t > tl[i].d * 0.86) return { i: -1, ps: [] };
  const p = tl[i].p;
  return { i, ps: p === null ? [] : Array.isArray(p) ? p : [p] };
}

/** A clock for "was that the same slip of the hand?" (kept out of render). */
export const clock = () => (typeof performance !== "undefined" ? performance.now() : 0);

/** Where the kit's Staff draws each note (x, in staff units: one space = 10) and how wide the staff
 *  comes out — mirrored from notation.tsx (no time signature), so a box can be sized to it and a
 *  layer on top can point at notes, lines and spaces exactly. */
export function staffLayout(notes: StaffNote[], keySig: number, minWidth: number) {
  const nk = Math.min(7, Math.abs(keySig));
  let x = 8 + 36 + nk * 10 + (nk ? 6 : 0) + 6;
  const xs: number[] = [];
  for (const nt of notes) {
    const ps = nt.p === null ? [] : Array.isArray(nt.p) ? nt.p : [nt.p];
    const acc =
      !!nt.acc ||
      ps.some((p) => {
        const s = spell(p, keySig);
        return s.acc !== keyAcc(keySig, s.letter);
      });
    if (acc) x += 10;
    xs.push(x + 8);
    x += 22 + 16 * Math.sqrt(Math.max(0.25, nt.d));
  }
  return { xs, width: Math.max(minWidth, x + 14) };
}

/** The kit's Staff in a box of its own exact size (an SVG that's only told its height collapses
 *  inside a shrink-to-fit card). */
export function StaffBox(props: ComponentProps<typeof Staff>) {
  const h = props.height ?? 170;
  const { width } = staffLayout(props.notes, props.keySig ?? 0, props.minWidth ?? 360);
  return (
    <div className="max-w-full shrink-0" style={{ width: (width * h) / 108, height: h }}>
      <Staff {...props} className={cn("block", props.className)} />
    </div>
  );
}

// ── The activity ─────────────────────────────────────────────────────────────────────────────
const TRIES = 3;
type Phase = "intro" | "demo" | "turn" | "hear" | "oops" | "won" | "together";
type Msg = { text: string; tone: "good" | "oops" | "info" };

/** A piano range around the pads: from a white key to a white key, at least five white keys. */
function keyRange(pads: number[]): [number, number] {
  let lo = Math.min(...pads);
  let hi = Math.max(...pads);
  if (isBlackKey(lo)) lo--;
  if (isBlackKey(hi)) hi++;
  const whites = () => {
    let n = 0;
    for (let m = lo; m <= hi; m++) if (!isBlackKey(m)) n++;
    return n;
  };
  for (let k = 0; whites() < 5 && k < 12; k++) {
    if (k % 2 === 0 && hi < 108) {
      hi++;
      while (isBlackKey(hi)) hi++;
    } else if (lo > 21) {
      lo--;
      while (isBlackKey(lo)) lo--;
    }
  }
  return [lo, hi];
}

export function MelodyAct({ act: a, fx, onDone }: ActProps<"melody">) {
  const mode = a.mode;
  const onKeys = a.on === "keys";
  const inst: InstId = a.inst ?? (onKeys ? "piano" : "bells");
  const tonic = a.tonic ?? 60;
  const labels = a.labels ?? (a.tonic !== undefined ? "solfege" : "colors");
  const show = a.show ?? "none";
  const clef = a.clef ?? "treble";
  const bpm = a.bpm ?? 92;
  const target = a.notes[0];
  const voiced = fx.voice !== "keys";
  const little = fx.voice === "all";
  const durs = useMemo(() => a.notes.map((_, i) => a.durs?.[i] ?? 1), [a.notes, a.durs]);
  const example = useMemo(() => melody(a.notes, durs, inst, bpm), [a.notes, durs, inst, bpm]);
  const slow = useMemo(() => melody(a.notes, durs, inst, Math.round(bpm * 0.8)), [a.notes, durs, inst, bpm]);
  const one = useMemo(() => note1(target, inst, 1.5, 72), [target, inst]);
  const range = useMemo(() => keyRange(a.pads), [a.pads]);
  const player = usePlayer();
  const later = useLater();
  const whenQuiet = useWhenQuiet();

  // The question, and (the first time) how this game works.
  const { parts, auto } = spoken(fx, a.say, a.prompt);
  const howTo = mode === "echo" ? (onKeys ? null : SAY.melodyEcho) : mode === "read" ? SAY.melodyRead : null;
  const intro: Part[] = voiced && fx.firstTime && howTo && a.prompt !== howTo && !parts.includes(howTo) ? [...parts, "~", howTo] : parts;

  const [phase, setPhase] = useState<Phase>("intro");
  const [got, setGot] = useState<number[]>([]);
  const [fails, setFails] = useState(0);
  const [flash, setFlash] = useState<number | null>(null);
  const [msg, setMsg] = useState<Msg | null>(null);
  const gotRef = useRef<number[]>([]);
  const failsRef = useRef(0);
  const runRef = useRef(0);
  const alive = useRef(true);
  const saidWrong = useRef(false);
  const saidTurn = useRef(false);
  const doneRef = useRef(false);
  const flashKey = useRef(0);
  const lastSlip = useRef(-1e9);
  const stageRef = useRef<HTMLDivElement>(null);
  const padsRef = useRef<HTMLDivElement>(null);

  /** Spoken name of a note (for praise): "so", "F sharp" — when the pads are labeled that way. */
  const nameOf = (m: number) => (labels === "solfege" ? solfege(m, tonic, false) : labels === "letters" ? spelledName(m) : null);

  const finish = (m: number) => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone(m);
  };
  const flashPad = (m: number) => {
    const k = ++flashKey.current;
    setFlash(m);
    later(() => flashKey.current === k && setFlash(null), 650);
  };

  // Echo: the tune plays (each bell lights as it rings), then it's the child's turn.
  const demo = () => {
    const run = ++runRef.current;
    gotRef.current = [];
    setGot([]);
    setMsg(null);
    setPhase("demo");
    player.play(example, {
      onEnd: () => {
        if (!alive.current || runRef.current !== run) return;
        setPhase("turn");
        sfx("pick");
        if (voiced && !saidTurn.current) {
          saidTurn.current = true;
          void fx.say(SAY.echoYourTurn);
        }
      },
    });
  };
  const playTarget = () => {
    const run = ++runRef.current;
    setPhase("hear");
    player.play(one, { onEnd: () => alive.current && runRef.current === run && setPhase("turn") });
  };
  const begin = () => {
    if (mode === "echo") demo();
    // Little ones hear the note they're looking for first.
    else if (mode === "find" && voiced) playTarget();
    else setPhase("turn");
  };

  useEffect(() => {
    alive.current = true;
    fx.setPrompt(intro);
    const t = window.setTimeout(() => {
      const go = () => alive.current && begin();
      if (auto && intro.length) void fx.say(intro).then(() => whenQuiet(go, 250));
      else go();
    }, 380);
    return () => {
      alive.current = false;
      window.clearTimeout(t);
    };
    // Asked once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** The play / hear-it-again button. In echo, hearing it again starts the copy over (no cost). */
  const hearAgain = () => {
    sfx("tap");
    if (phase === "demo" || phase === "hear") {
      ++runRef.current;
      player.stop();
      setPhase("turn");
      return;
    }
    if (phase !== "turn") return;
    if (mode === "echo") return demo();
    if (mode === "find") return playTarget();
    const run = ++runRef.current;
    setPhase("hear");
    player.play(example, { onEnd: () => alive.current && runRef.current === run && setPhase("turn") });
  };

  // Three slips: play it together — slower, every bell lighting in time (and playing along is welcome).
  const together = () => {
    const run = ++runRef.current;
    gotRef.current = [];
    setGot([]);
    setPhase("together");
    setMsg({ text: "Let's play it together!", tone: "info" });
    whenQuiet(() => {
      if (!alive.current || runRef.current !== run) return;
      const go = () => {
        if (!alive.current || runRef.current !== run) return;
        player.play(slow, { onEnd: () => later(() => finish(failsRef.current), 700) });
      };
      if (voiced) void fx.say(SAY.showMe).then(go);
      else go();
    }, 700);
  };
  // Find, three slips: here it is (it rings and glows), then on we go.
  const showIt = () => {
    const run = ++runRef.current;
    setPhase("together");
    setMsg({ text: "Here it is!", tone: "info" });
    whenQuiet(() => {
      if (!alive.current || runRef.current !== run) return;
      player.play(one, { onEnd: () => later(() => finish(failsRef.current), 700) });
    }, 600);
  };
  // Played it all: the chime, then the child's own tune comes back as a little concert.
  const win = (played: number[]) => {
    const run = ++runRef.current;
    setPhase("won");
    setMsg({ text: mode === "read" ? "You read it and played it!" : "You played it!", tone: "good" });
    fx.right(stageRef.current);
    whenQuiet(() => {
      if (!alive.current || runRef.current !== run) return;
      setMsg({ text: "Here's your tune!", tone: "good" });
      player.play(melody(played, durs, inst, bpm), {
        onEnd: () => {
          if (!alive.current) return;
          sfx("star");
          fx.burst(stageRef.current, "star", 14);
          later(() => finish(failsRef.current), 1000);
        },
      });
    }, 450);
  };
  const slip = (m: number) => {
    const run = ++runRef.current;
    flashPad(m);
    const f = failsRef.current + 1;
    failsRef.current = f;
    setFails(f);
    if (f >= TRIES) {
      fx.miss();
      together();
      return;
    }
    if (mode === "read") {
      // Reading: stay on this note and look again.
      fx.wrong(null);
      setMsg({ text: "Not that one — look again!", tone: "oops" });
      setPhase("oops");
      later(() => {
        if (!alive.current || runRef.current !== run) return;
        setMsg(null);
        setPhase("turn");
      }, 1000);
      return;
    }
    // Echo: a gentle oops, then the tune again from the top.
    fx.miss();
    setMsg({ text: "Oops! Listen again…", tone: "oops" });
    setPhase("oops");
    if (!saidWrong.current) {
      saidWrong.current = true;
      void fx.say(SAY.melodyWrong);
    }
    whenQuiet(() => alive.current && runRef.current === run && demo(), 800);
  };
  const pressFind = (m: number) => {
    if (m === target) {
      ++runRef.current;
      setPhase("won");
      const w = nameOf(target);
      setMsg({ text: w ? `Yes — that's ${w}!` : "You found it!", tone: "good" });
      fx.right(padsRef.current, w ? [noteWords(w)] : []);
      later(() => finish(failsRef.current), 1600);
      return;
    }
    const t = clock();
    if (t - lastSlip.current < 450) return; // one slip of the hand is one mistake
    lastSlip.current = t;
    flashPad(m);
    const f = failsRef.current + 1;
    failsRef.current = f;
    setFails(f);
    if (f >= TRIES) {
      fx.miss();
      showIt();
      return;
    }
    fx.wrong(null);
    if (f >= 2) setMsg({ text: "Look — it's glowing!", tone: "info" });
  };
  const press = (m: number) => {
    if (phase !== "turn") return; // (playing along "together" is welcome — nothing to judge)
    if (mode === "find") return pressFind(m);
    const next = [...gotRef.current, m];
    if (prefixMatch(a.notes, next) === next.length) {
      gotRef.current = next;
      setGot(next);
      if (samePitches(a.notes, next)) win(next);
      return;
    }
    slip(m);
  };

  // What lights up: whatever is sounding, and (find) the note asked for once it's a hint.
  const s = soundingAt(player.playing ? player.score : null, player.beat);
  const listening = phase === "demo" || phase === "hear";
  const accepting = phase === "turn" || phase === "together";
  const hint = mode === "find" && ((fails >= 2 && phase === "turn") || phase === "won" || phase === "together");
  const lit = [...s.ps, ...(hint && !s.ps.includes(target) ? [target] : [])];
  const wrong = flash !== null ? [flash] : [];
  const cur = mode !== "find" && player.playing ? s.i : -1;
  const next = mode === "read" && phase === "turn" ? got.length : -1;
  const padH = onKeys ? (little ? 250 : 220) : little ? 260 : 232;

  const keyMarks = useMemo(() => {
    const out: Record<number, string> = {};
    const some = range[1] - range[0] + 1 > a.pads.length;
    for (const p of a.pads) {
      const t = labels === "letters" ? spelledName(p) : labels === "solfege" ? solfege(p, tonic, false) : some ? "•" : "";
      if (t) out[p] = t;
    }
    return out;
  }, [range, a.pads, labels, tonic]);
  let whites = 0;
  for (let m = range[0]; m <= range[1]; m++) if (!isBlackKey(m)) whites++;

  const ladderSteps = [...new Set(a.pads.map((p) => p - tonic))].sort((x, y) => x - y);
  const ladderActive = s.ps.length ? s.ps[0] - tonic : mode === "find" ? target - tonic : next >= 0 ? a.notes[next] - tonic : null;

  // The written tune / the note asked for / the dots that count the notes.
  let written: ReactNode = null;
  if (mode === "find") {
    if (show === "staff") written = <StaffBox notes={[{ p: target, d: 4, mark: true }]} clef={clef} active={s.ps.length ? 0 : -1} colored={labels === "colors"} height={little ? 150 : 140} minWidth={170} />;
    else if (show !== "ladder" && nameOf(target))
      written = <span className="flex h-24 min-w-24 items-center justify-center rounded-[26px] bg-[#fff0f7] px-7 font-display text-6xl font-black text-[#d9408f] shadow-[0_5px_0_#f5b8d6]">{nameOf(target)}</span>;
    else if (show !== "ladder") written = <Glyph e={onKeys ? "🎹" : "🔔"} size={96} />;
  } else if (show === "staff") {
    const notes: StaffNote[] = a.notes.map((p, k) => ({ p, d: durs[k], mark: k === next }));
    written = <StaffBox notes={notes} clef={clef} active={cur >= 0 ? cur : next} colored={labels === "colors"} height={little ? 150 : 140} minWidth={300} />;
  } else if (show === "none" && mode === "read") {
    written = <NoteChips notes={a.notes} text={(m) => nameOf(m) ?? ""} next={next} cur={cur} done={got.length} />;
  }
  // Dots count the notes (echo, and reading from the ladder); a staff or note blocks show the way
  // themselves (the next note glows).
  const dots = (mode === "echo" || (mode === "read" && show === "ladder")) && (
    <NoteDots notes={a.notes} got={got} cur={cur} won={phase === "won"} oops={phase === "oops" && mode === "echo"} size={written ? 30 : a.notes.length <= 6 ? (little ? 58 : 52) : a.notes.length <= 10 ? 42 : 32} />
  );

  const pads = onKeys ? (
    <NoGlide className="w-full">
      <Keyboard lo={range[0]} hi={range[1]} inst={inst} onPress={press} lit={lit} held={s.ps} wrong={wrong} labels="none" marks={keyMarks} tonic={tonic} height={padH} />
    </NoGlide>
  ) : (
    <Bells pitches={a.pads} inst={inst} onPress={press} labels={labels} tonic={tonic} lit={lit} wrong={wrong} height={padH} />
  );

  const pill = msg ? (
    <span key={msg.text + fails} className={cn("l-pop-in rounded-full px-5 py-1.5 font-display text-xl font-extrabold text-white shadow-[0_4px_0_rgba(0,40,80,0.2)]", msg.tone === "good" ? "bg-[var(--l-green)]" : msg.tone === "oops" ? "bg-[var(--l-orange)]" : "bg-[var(--l-violet)]")}>
      {msg.text}
    </span>
  ) : listening ? (
    <span className="flex items-center gap-2 rounded-full bg-white/95 px-5 py-1.5 font-display text-xl font-extrabold text-[var(--l-ink)] shadow-[0_3px_0_rgba(0,40,80,0.15)]">
      <Ear className="h-6 w-6" /> Listen…
    </span>
  ) : phase === "turn" ? (
    <span key={`turn${fails}`} className="l-pop-in rounded-full bg-[#ff6fb5] px-5 py-1.5 font-display text-xl font-extrabold text-white shadow-[0_4px_0_#d9408f]">
      {mode === "echo" ? "Your turn! Play it back" : mode === "read" ? "Play the notes you see" : `Find it on the ${onKeys ? "keys" : "bells"}!`}
    </span>
  ) : null;

  return (
    <div className="flex w-full max-w-[1100px] flex-col items-center gap-3">
      <PromptRow parts={intro}>{a.prompt}</PromptRow>
      <SoundOffNote />
      <div ref={stageRef} className="relative flex w-fit min-w-[min(100%,560px)] max-w-full flex-col items-center gap-2 rounded-[30px] bg-white/95 px-8 py-3 shadow-[0_8px_0_rgba(0,40,80,0.14)]">
        {mode !== "find" && (
          <span className="absolute right-5 top-2.5 font-display text-sm font-extrabold text-[var(--l-ink-2)]">
            Try {Math.min(TRIES, fails + 1)} of {TRIES}
          </span>
        )}
        <div className="flex w-full items-center justify-center gap-6">
          {mode === "echo" ? (
            <PlayButton size={little ? 92 : 80} playing={phase === "demo"} onClick={hearAgain} className={cn(phase !== "turn" && phase !== "demo" && "opacity-50")} />
          ) : (
            <span className={cn("flex shrink-0 flex-col items-center gap-1", phase !== "turn" && phase !== "hear" && "opacity-50")}>
              <MiniPlay playing={phase === "hear"} onClick={hearAgain} size={little ? 68 : 60} />
              <span className="font-display text-base font-extrabold text-[var(--l-ink-2)]">Hear it</span>
            </span>
          )}
          {written && <div className="flex min-w-0 items-center justify-center">{written}</div>}
          {!written && dots}
        </div>
        {written && dots}
      </div>
      <div className="flex h-10 items-center justify-center">{pill}</div>
      <div className="flex w-full items-end justify-center gap-5">
        {show === "ladder" && (
          <div className="w-[220px] shrink-0 rounded-[26px] bg-white/95 px-2 py-3 shadow-[0_8px_0_rgba(0,40,80,0.14)]">
            <Ladder tonic={tonic} steps={ladderSteps} lit={mode === "read" ? [...new Set(a.notes.map((p) => p - tonic))] : []} active={ladderActive} height={padH} />
          </div>
        )}
        <div
          ref={padsRef}
          aria-disabled={!accepting}
          className={cn(
            "min-w-0 flex-1 transition-opacity duration-200",
            !accepting && "pointer-events-none",
            phase === "oops" && "opacity-75",
            // The bell that's ringing jumps up and shines (the kit's slow glow is for hints).
            s.ps.length > 0 && "[&_.m-bell-glow]:-translate-y-3 [&_.m-bell-glow]:brightness-125 [&_.m-bell-glow]:drop-shadow-[0_0_20px_rgba(255,255,255,0.95)] [&_.m-bell-glow]:[animation:none]!",
          )}
          style={{ maxWidth: onKeys ? Math.min(960, whites * (little ? 118 : 100)) : 820 }}
        >
          {pads}
        </div>
      </div>
    </div>
  );
}

/** One dot per note: the one sounding lights up, and each fills with its bell's color as it's played. */
function NoteDots({ notes, got, cur, won, oops, size }: { notes: number[]; got: number[]; cur: number; won: boolean; oops: boolean; size: number }) {
  return (
    <div key={oops ? "oops" : "ok"} className={cn("flex flex-wrap items-center justify-center", oops && "l-shake")} style={{ gap: Math.max(8, size * 0.24) }} role="img" aria-label={`${got.length} of ${notes.length} notes`}>
      {notes.map((_, k) => {
        const done = k < got.length;
        const on = k === cur;
        return (
          <span
            key={k}
            className={cn("block rounded-full border-[4px] border-[#2a2f45] transition-transform duration-100", on && "scale-125", done && !won && "l-pop-in", won && on && "l-boing")}
            style={{ width: size, height: size, background: done ? noteColor(got[k]) : on ? "#ff4d8d" : "#ffe3f0", boxShadow: on ? "0 0 18px rgba(255,77,141,0.7)" : undefined }}
          />
        );
      })}
    </div>
  );
}

/** A tune written as colored note blocks (when there's no staff or ladder to read from). */
function NoteChips({ notes, text, next, cur, done }: { notes: number[]; text: (m: number) => string; next: number; cur: number; done: number }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5">
      {notes.map((m, k) => (
        <span
          key={k}
          className={cn("flex h-16 min-w-16 items-center justify-center rounded-[18px] border-[3px] border-[#2a2f45] px-3 font-display text-2xl font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.2)] transition-transform", (k === cur || (cur < 0 && k === next)) && "scale-110 shadow-[0_0_0_4px_#fff,0_0_22px_rgba(255,77,141,0.75)]", k < done && cur < 0 && "opacity-55")}
          style={{ background: noteColor(m) }}
        >
          {text(m)}
        </span>
      ))}
    </div>
  );
}
