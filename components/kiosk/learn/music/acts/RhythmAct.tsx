"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from "react";
import { Ear, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";
import { SAY } from "@/lib/learn/script";
import { sfx } from "@/lib/learn/sfx";
import { barBeats, cellsDurs, onsetsOf, pulses } from "@/lib/learn/mus/theory";
import { clicks, rhythm as rhythmScore, activeDur } from "@/lib/learn/mus/score";
import { judgeAlong, judgeBeat, judgeEcho, type TapMark } from "@/lib/learn/mus/judge";
import type { Meter } from "@/lib/learn/mus/types";
import { tapTime } from "@/lib/learn/mus/synth";
import { Chunk } from "../../kit";
import { PromptRow, spoken, useLater, type ActProps } from "../../acts/common";
import { GlyphRow } from "../../art/Glyph";
import { usePlayer } from "../kit/player";
import { DrumPad, MiniPlay, SoundOffNote } from "../kit/kit";
import { RhythmStrip } from "../kit/notation";

// Rhythm on a big drum — four ways to play:
//   echo      hear a rhythm, tap it back (judged on its shape, at any steady speed);
//   read      read the rhythm, watch the count-in, play it as the light moves across;
//   beat      the music plays — keep the steady beat on the drum (the drum glows on each beat at
//             first: the scaffold that fades as kids grow);
//   syllables one tap for each part of a word (but-ter-fly = three taps).
// Taps are timed from the finger's own timestamp against the audio clock, with the tablet's delay
// forgiven. Three tries; after that we play it together and move on.

const TRIES = 3;

export function RhythmAct({ act: a, fx, onDone }: ActProps<"rhythm">) {
  if (a.mode === "syllables") return <Syllables act={a} fx={fx} onDone={onDone} />;
  if (a.mode === "beat") return <BeatTap act={a} fx={fx} onDone={onDone} />;
  return <EchoRead act={a} fx={fx} onDone={onDone} />;
}

function feedbackLine(marks: TapMark[], extra: number): string {
  if (extra > 0) return SAY.rhythmTooMany;
  if (marks.includes("miss")) return SAY.rhythmTooFew;
  const early = marks.filter((m) => m === "early").length;
  const late = marks.filter((m) => m === "late").length;
  if (early > late) return SAY.rhythmEarly;
  if (late > early) return SAY.rhythmLate;
  return SAY.rhythmClose;
}

// ── Echo and read ────────────────────────────────────────────────────────────────────────────
function EchoRead({ act: a, fx, onDone }: ActProps<"rhythm">) {
  const cells = useMemo(() => a.cells ?? ["ta", "ta", "ta", "ta"], [a.cells]);
  const meter = useMemo<Meter>(() => a.meter ?? [4, 4], [a.meter]);
  const durs = useMemo(() => cellsDurs(cells), [cells]);
  const { onsets } = useMemo(() => onsetsOf(durs), [durs]);
  const bar = barBeats(meter);
  const echo = a.mode === "echo";
  const style = a.show === "none" ? null : (a.show ?? "sticks");
  const player = usePlayer();
  const later = useLater();
  const { parts, auto } = spoken(fx, a.say, a.prompt);
  const [phase, setPhase] = useState<"intro" | "listen" | "tap" | "count" | "play" | "result" | "done">("intro");
  const [misses, setMisses] = useState(0);
  const [marks, setMarks] = useState<TapMark[] | null>(null);
  const [taps, setTaps] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const tapsRef = useRef<number[]>([]);
  const waitRef = useRef<number | undefined>(undefined);
  const runRef = useRef(0);
  const pattern = useMemo(() => rhythmScore(cells, { drum: a.drum ?? "bongo", bpm: a.bpm, meter }), [cells, a.drum, a.bpm, meter]);

  const listen = (then?: () => void) => {
    setPhase("listen");
    setMarks(null);
    player.play(pattern, { onEnd: () => then?.() });
  };
  const startEcho = () => {
    listen(() => {
      tapsRef.current = [];
      setTaps(0);
      setPhase("tap");
      sfx("pick");
      if (fx.voice !== "keys") void fx.say(SAY.echoYourTurn);
    });
  };
  // Read: count-in bar of clicks, then soft clicks on every beat while the light moves.
  const startRead = () => {
    const run = ++runRef.current;
    tapsRef.current = [];
    setTaps(0);
    setMarks(null);
    const n = pulses(meter).length;
    const total = Math.round((bar + durs.reduce((s, d) => s + Math.abs(d), 0)) / (bar / n));
    setPhase("count");
    const pb = player.play(clicks(total, a.bpm, meter), {
      offset: bar,
      onEnd: () => {
        if (runRef.current !== run) return;
        const targets = onsets.map((o) => (pb ? pb.timeOf(bar + o) : 0));
        judge(judgeAlong(targets, tapsRef.current, a.bpm, fx.voice === "all" ? 0.28 : 0.22));
      },
    });
    // The count-in numbers.
    const spb = 60 / a.bpm;
    for (let k = 0; k < n; k++) later(() => runRef.current === run && setCount(k + 1), (k * bar * spb * 1000) / n + 80);
    later(() => {
      if (runRef.current !== run) return;
      setCount(null);
      setPhase("play");
    }, bar * spb * 1000 + 60);
  };
  const judge = (j: { ok: boolean; marks: TapMark[]; extra: number }) => {
    window.clearTimeout(waitRef.current);
    setMarks(j.marks);
    if (j.ok) {
      setPhase("done");
      setMsg(SAY.rhythmPerfect);
      fx.right(null, fx.voice !== "keys" ? [SAY.rhythmPerfect] : []);
      later(() => onDone(misses), 1500);
      return;
    }
    const m = misses + 1;
    setMisses(m);
    setPhase("result");
    const line = feedbackLine(j.marks, j.extra);
    setMsg(line);
    fx.miss();
    void fx.say(line);
    if (m >= TRIES) {
      // Together: play it with the light, then move on.
      later(() => {
        setMsg("Let's hear it together!");
        listen(() => later(() => onDone(m), 600));
      }, 1800);
    }
  };
  const onTap = (e: RPointerEvent<HTMLButtonElement>) => {
    if (phase !== "tap" && phase !== "play" && phase !== "count") return;
    if (phase === "count") return; // taps during the count-in don't count
    const t = tapTime(e);
    tapsRef.current = [...tapsRef.current, t];
    setTaps(tapsRef.current.length);
    if (echo) {
      window.clearTimeout(waitRef.current);
      const spb = 60 / a.bpm;
      const got = tapsRef.current.length;
      // Done when the last note is tapped (after a breath for extra taps), or the child stops.
      const wait = got >= onsets.length ? Math.max(500, spb * 1000 * 0.9) : Math.max(1600, spb * 1000 * 2.6);
      waitRef.current = window.setTimeout(() => judge(judgeEcho(onsets, tapsRef.current, a.bpm, fx.voice === "all" ? 0.3 : 0.24)), wait);
    }
  };
  useEffect(() => {
    const run = runRef;
    fx.setPrompt(parts);
    const t = window.setTimeout(() => {
      const go = () => (echo ? startEcho() : setPhase("intro"));
      if (auto && parts.length) void fx.say(parts).then(() => window.setTimeout(go, 250));
      else go();
    }, 380);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(waitRef.current);
      run.current++;
    };
    // Asked once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = phase === "listen" || phase === "play" ? activeDur(durs, player.beat) : -1;
  // Marks are per sounding note; the strip wants one per note AND rest.
  const stripMarks = marks ? (() => {
    let k = 0;
    return durs.map((d) => (d > 0 ? (marks[k++] ?? null) : null));
  })() : undefined;
  const showStrip = style && (!echo || phase === "result" || phase === "done" || misses > 0);
  const busy = phase === "listen" || phase === "count";
  return (
    <div className="flex w-full max-w-[1000px] flex-col items-center gap-4">
      <PromptRow parts={parts}>{a.prompt}</PromptRow>
      <SoundOffNote />
      <div className="relative flex min-h-[150px] w-full items-center justify-center gap-4 rounded-[30px] bg-white/95 px-5 py-4 shadow-[0_8px_0_rgba(0,40,80,0.14)]">
        {showStrip ? (
          <RhythmStrip cells={cells} style={style!} syllables meter={meter} active={active} marks={stripMarks} height={fx.voice === "all" ? 140 : 124} />
        ) : (
          <EchoDots n={onsets.length} taps={phase === "tap" ? taps : 0} marks={marks} listening={phase === "listen"} beat={player.beat} durs={durs} />
        )}
        {!echo && (phase === "intro" || phase === "result") && (
          <div className="absolute right-3 top-3">
            <MiniPlay playing={player.playing} onClick={() => (player.playing ? player.stop() : player.play(pattern))} size={56} />
          </div>
        )}
        {count !== null && (
          <span key={count} className="m-count absolute inset-0 flex items-center justify-center font-display text-[110px] font-black text-[#ff4d8d] drop-shadow-[0_4px_0_#fff]" style={{ "--beat": `${(60 / a.bpm) * (bar / pulses(meter).length)}s` } as CSSProperties}>
            {count}
          </span>
        )}
      </div>
      <div className="flex h-10 items-center justify-center">
        {msg ? (
          <span key={msg + misses} className={cn("l-pop-in rounded-full px-5 py-1.5 font-display text-xl font-extrabold text-white shadow-[0_4px_0_rgba(0,40,80,0.2)]", phase === "done" ? "bg-[var(--l-green)]" : "bg-[var(--l-orange)]")}>{msg}</span>
        ) : phase === "listen" ? (
          <span className="flex items-center gap-2 rounded-full bg-white/95 px-5 py-1.5 font-display text-xl font-extrabold text-[var(--l-ink)]"><Ear className="h-6 w-6" /> Listen…</span>
        ) : phase === "tap" ? (
          <span className="l-pop-in rounded-full bg-[#ff6fb5] px-5 py-1.5 font-display text-xl font-extrabold text-white shadow-[0_4px_0_#d9408f]">Your turn! Tap it back</span>
        ) : phase === "play" ? (
          <span className="rounded-full bg-[#ff6fb5] px-5 py-1.5 font-display text-xl font-extrabold text-white">Play!</span>
        ) : null}
      </div>
      <div className="flex items-center gap-6">
        <DrumPad drum={a.drum ?? "bongo"} onHit={onTap} size={fx.voice === "all" ? 250 : 220} disabled={busy || phase === "done"} />
        <div className="flex flex-col items-center gap-3">
          {!echo && (phase === "intro" || phase === "result") && misses < TRIES && (
            <Chunk tone="green" onClick={() => (sfx("pick"), setMsg(null), startRead())} className="l-pulse flex h-16 items-center gap-2 px-8 font-display text-2xl font-extrabold">
              {misses ? <RotateCcw className="h-7 w-7" strokeWidth={3} /> : null} {misses ? "Again" : "Ready? Go!"}
            </Chunk>
          )}
          {echo && phase === "result" && misses < TRIES && (
            <Chunk tone="blue" onClick={() => (sfx("pick"), setMsg(null), startEcho())} className="l-pulse flex h-16 items-center gap-2 px-8 font-display text-2xl font-extrabold">
              <RotateCcw className="h-7 w-7" strokeWidth={3} /> Hear it again
            </Chunk>
          )}
          <span className="font-display text-lg font-bold text-white/90">Try {Math.min(TRIES, misses + 1)} of {TRIES}</span>
        </div>
      </div>
    </div>
  );
}

/** For echo with no notes shown: a dot per note — it lights while listening and fills as you tap. */
function EchoDots({ n, taps, marks, listening, beat, durs }: { n: number; taps: number; marks: TapMark[] | null; listening: boolean; beat: number | null; durs: number[] }) {
  let cur = -1;
  if (listening) {
    const i = activeDur(durs, beat);
    if (i >= 0 && durs[i] > 0) cur = durs.slice(0, i).filter((d) => d > 0).length;
  }
  return (
    <div className="flex items-center gap-3" aria-label={`${n} notes`}>
      {Array.from({ length: n }, (_, k) => {
        const mk = marks?.[k];
        const bg = mk === "good" ? "#3ccf6e" : mk === "miss" ? "#ff7363" : mk ? "#ffc83d" : k < taps ? "#ff6fb5" : k === cur ? "#ff4d8d" : "#ffe3f0";
        return <span key={k} className={cn("block h-12 w-12 rounded-full border-[4px] border-[#2a2f45] transition-transform duration-100", k === cur && "scale-125")} style={{ background: bg }} />;
      })}
    </div>
  );
}

// ── Steady beat ──────────────────────────────────────────────────────────────────────────────
function BeatTap({ act: a, fx, onDone }: ActProps<"rhythm">) {
  const player = usePlayer();
  const later = useLater();
  const { parts, auto } = spoken(fx, a.say, a.prompt);
  const need = Math.max(4, a.beats ?? 8);
  const warm = 2;
  const spb = 60 / a.bpm;
  const [phase, setPhase] = useState<"intro" | "play" | "done" | "result">("intro");
  const [misses, setMisses] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [hits, setHits] = useState(0);
  const tapsRef = useRef<number[]>([]);
  const runRef = useRef(0);

  const start = () => {
    const run = ++runRef.current;
    tapsRef.current = [];
    setHits(0);
    setMsg(null);
    setPhase("play");
    const music = a.music ?? clicks(need + warm + 2, a.bpm);
    const pb = player.play(music, { loop: true });
    later(() => {
      if (runRef.current !== run) return;
      const beats = Array.from({ length: need }, (_, k) => (pb ? pb.timeOf(warm + k) : 0));
      player.stop();
      const j = judgeBeat(beats, tapsRef.current, a.bpm, Math.min(need, 6), fx.voice === "all" ? 0.3 : 0.24);
      if (j.ok) {
        setPhase("done");
        setMsg(SAY.beatKeep.replace("going", "going — perfect"));
        fx.right(null, fx.voice !== "keys" ? [SAY.rhythmPerfect] : []);
        later(() => onDone(misses), 1500);
      } else {
        const m = misses + 1;
        setMisses(m);
        setPhase("result");
        const line = j.tapped < Math.min(need, 6) ? SAY.rhythmTooFew : j.extra > 2 ? SAY.rhythmTooMany : SAY.rhythmClose;
        setMsg(line);
        fx.miss();
        void fx.say(line);
        if (m >= TRIES) later(() => onDone(m), 1800);
      }
    }, (warm + need + 0.6) * spb * 1000);
  };
  useEffect(() => {
    const run = runRef;
    fx.setPrompt(parts);
    const t = window.setTimeout(() => {
      if (auto && parts.length) void fx.say(parts).then(() => window.setTimeout(start, 300));
      else start();
    }, 380);
    return () => {
      window.clearTimeout(t);
      run.current++;
    };
    // Starts once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onTap = (e: RPointerEvent<HTMLButtonElement>) => {
    if (phase !== "play") return;
    tapsRef.current = [...tapsRef.current, tapTime(e)];
    setHits(tapsRef.current.length);
  };
  const beatNow = player.beat;
  const pulse = phase === "play" && beatNow !== null && beatNow >= 0 ? Math.floor(beatNow) : -1;
  const counted = Math.max(0, Math.min(need, pulse - warm + 1));
  return (
    <div className="flex w-full max-w-[1000px] flex-col items-center gap-4">
      <PromptRow parts={parts}>{a.prompt}</PromptRow>
      <SoundOffNote />
      <div className="flex items-center gap-2" aria-label={`${counted} of ${need} beats`}>
        {Array.from({ length: need }, (_, k) => (
          <span key={k} className={cn("h-5 w-5 rounded-full border-[3px] border-white transition-colors", k < counted ? "bg-[#ff6fb5]" : "bg-white/30")} />
        ))}
      </div>
      <div className="flex h-10 items-center">{msg && <span key={msg + misses} className={cn("l-pop-in rounded-full px-5 py-1.5 font-display text-xl font-extrabold text-white", phase === "done" ? "bg-[var(--l-green)]" : "bg-[var(--l-orange)]")}>{msg}</span>}</div>
      <div className="relative">
        {/* The scaffold: a ring flashes on every beat (it fades out as kids grow). */}
        {a.scaffold !== false && pulse >= 0 && <span key={pulse} className="m-beat-glow pointer-events-none absolute inset-[-4%] rounded-full" style={{ "--beat": `${spb}s` } as CSSProperties} aria-hidden />}
        <DrumPad drum={a.drum ?? "kick"} onHit={onTap} size={fx.voice === "all" ? 270 : 240} disabled={phase !== "play"} color="#8b6cff" />
      </div>
      <span className="font-display text-lg font-bold text-white/90">{hits} taps</span>
      {phase === "result" && misses < TRIES && (
        <Chunk tone="green" onClick={() => (sfx("pick"), start())} className="l-pulse flex h-16 items-center gap-2 px-8 font-display text-2xl font-extrabold">
          <RotateCcw className="h-7 w-7" strokeWidth={3} /> Again
        </Chunk>
      )}
    </div>
  );
}

// ── Syllables ────────────────────────────────────────────────────────────────────────────────
function Syllables({ act: a, fx, onDone }: ActProps<"rhythm">) {
  const words = a.words ?? [];
  const later = useLater();
  const { parts, auto } = spoken(fx, a.say, a.prompt);
  const [i, setI] = useState(0);
  const [taps, setTaps] = useState(0);
  const [misses, setMisses] = useState(0);
  const [show, setShow] = useState<null | "right" | "wrong">(null);
  const waitRef = useRef<number | undefined>(undefined);
  const w = words[i];
  const sayWord = (k: number) => {
    const ww = words[k];
    if (ww) void fx.say([ww.text]);
  };
  useEffect(() => {
    fx.setPrompt(parts);
    const t = window.setTimeout(() => {
      if (auto && parts.length) void fx.say(parts).then(() => window.setTimeout(() => sayWord(0), 200));
      else sayWord(0);
    }, 380);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(waitRef.current);
    };
    // Asked once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onTap = () => {
    if (!w || show) return;
    const n = taps + 1;
    setTaps(n);
    window.clearTimeout(waitRef.current);
    waitRef.current = window.setTimeout(() => {
      if (n === w.syllables) {
        setShow("right");
        fx.right(null, [w.text]);
        later(() => {
          setShow(null);
          setTaps(0);
          if (i + 1 < words.length) {
            setI(i + 1);
            later(() => sayWord(i + 1), 300);
          } else onDone(misses);
        }, 1500);
      } else {
        setShow("wrong");
        setMisses((m) => m + 1);
        fx.miss();
        void fx.say([w.text]);
        later(() => {
          setShow(null);
          setTaps(0);
        }, 1700);
      }
    }, 1100);
  };
  if (!w) return null;
  return (
    <div className="flex w-full max-w-[900px] flex-col items-center gap-4">
      <PromptRow parts={parts}>{a.prompt}</PromptRow>
      <SoundOffNote />
      <button type="button" onClick={() => sayWord(i)} className="l-pop-in flex flex-col items-center gap-2 rounded-[30px] bg-white/95 px-8 py-4 shadow-[0_8px_0_rgba(0,40,80,0.14)]" aria-label={`Hear ${w.text}`}>
        {w.emoji && <GlyphRow s={w.emoji} size={120} />}
        {fx.voice !== "all" && <span className="font-reading text-4xl font-bold text-[var(--l-ink)]">{w.text}</span>}
      </button>
      <div className="flex h-14 items-center gap-3">
        {Array.from({ length: Math.max(taps, show === "wrong" ? w.syllables : 0) }, (_, k) => (
          <span key={k} className={cn("l-pop-in block h-11 w-11 rounded-full border-[4px] border-[#2a2f45]", show === "wrong" ? (k < w.syllables ? "bg-[#ffc83d]" : "bg-[#ff7363]") : show === "right" ? "bg-[#3ccf6e]" : "bg-[#ff6fb5]")} />
        ))}
      </div>
      <DrumPad drum="conga" onHit={onTap} size={fx.voice === "all" ? 250 : 220} disabled={!!show} color="#22c59b" />
      <span className="font-display text-lg font-bold text-white/90">Word {i + 1} of {words.length}</span>
    </div>
  );
}
