"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as RKeyboardEvent, type PointerEvent as RPointerEvent } from "react";
import { cn } from "@/lib/cn";
import { speakingNow, type Part } from "@/lib/learn/audio";
import type { DrumId, InstId, MHit, MNote, MTrack, Score } from "@/lib/learn/mus/types";
import { DYNAMICS, TEMPO_WORDS, barBeats, tempoWord } from "@/lib/learn/mus/theory";
import { tapTempo } from "@/lib/learn/mus/judge";
import { audioNow, playDrum } from "@/lib/learn/mus/synth";
import { SAY } from "@/lib/learn/script";
import { PromptRow, spoken, useLater, type ActProps } from "../../acts/common";
import { Glyph } from "../../art/Glyph";
import { usePlayer } from "../kit/player";
import { BeatDots, InstrumentPic, SoundOffNote } from "../kit/kit";
import { SymbolView } from "../kit/notation";

// Be the conductor! The band plays — and follows YOU. Tap the baton to set the beat: once your taps
// are steady, the band picks up your tempo on its very next beat (mid-song, no starting over). Raise
// your hand for loud, lower it for soft. The goal is a green zone on the speed gauge and on the hand
// slider; keep the band inside it for two bars and the concert is yours. Tempo (with its Italian
// words) and dynamics, learned by feel. A hint comes after a while, and after 45 seconds the band
// shows how it should sound, so no one is ever stuck.

const clock = () => performance.now();
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const EPS = 1e-6;
/** Where the band's loudness starts (the content checker promises the goal isn't already met). */
const START_LOUD = 0.55;
/** playScore's lead: a new playback starts this long after it's asked for. */
const LEAD = 0.08;
/** The hand's height (0–1) → the band's gain. */
const gainOf = (v: number) => 0.06 + v * 1.04;
const BPM_LO = 40;
const BPM_HI = 208;
/** Position on the speed gauge (log scale, so slow tempos get room too), 0–100. */
const gx = (b: number) => (Math.log(clamp(b, BPM_LO, BPM_HI) / BPM_LO) / Math.log(BPM_HI / BPM_LO)) * 100;

// ── The band's music ───────────────────────────────────────────────────────────────────────────
/** One pass of the music in beats, rounded up to whole bars (what the band loops). */
function passLen(s: Score): number {
  const bar = barBeats(s.meter ?? [4, 4]);
  let raw = 0;
  for (const t of s.tracks) {
    if (t.kind === "notes") raw = Math.max(raw, (t.at ?? 0) + t.notes.reduce((a, n) => a + n.d, 0));
    else if (t.hits.length) raw = Math.max(raw, Math.max(...t.hits.map((h) => h.t)) + 0.05);
  }
  return Math.max(bar, Math.ceil(raw / bar - EPS) * bar);
}

/** The band's music from `from` beats into a pass, for `total` beats, at `bpm`: the loop unrolled
 *  into one long score, so the band can pick up mid-song at a new tempo or loudness. A note that's
 *  already sounding at `from` comes back in for what's left of it. */
function bandScore(s: Score, len: number, from: number, total: number, bpm: number): Score {
  const tracks: MTrack[] = [];
  const passes = Math.ceil((from + total) / len) + 1;
  for (const t of s.tracks) {
    if (t.kind === "drums") {
      const hits: MHit[] = [];
      for (let k = 0; k < passes; k++)
        for (const h of t.hits) {
          const at = h.t + k * len - from;
          if (at > -EPS && at < total) hits.push({ ...h, t: Math.max(0, at) });
        }
      if (hits.length) tracks.push({ ...t, hits });
      continue;
    }
    for (let k = 0; k < passes; k++) {
      let at = (t.at ?? 0) + k * len - from;
      let first = -1;
      const keep: MNote[] = [];
      for (const n of t.notes) {
        const end = at + n.d;
        if (at > -EPS && at < total) {
          if (first < 0) first = Math.max(0, at);
          keep.push(n);
        } else if (at < 0 && end > 0.5 && !keep.length) {
          first = 0;
          keep.push({ ...n, d: end });
        }
        at = end;
      }
      if (keep.some((n) => n.p !== null)) tracks.push({ ...t, at: first, notes: keep });
    }
  }
  if (!tracks.length) tracks.push({ kind: "drums", hits: [{ t: 0, k: "sticks", v: 0 }] });
  return { ...s, bpm, tracks };
}

/** Who's in the band: the instruments of the notes tracks, and a drum for the drum track. */
const DRUM_FACE: DrumId[] = ["snare", "kick", "bassdrum", "tom", "conga", "bongo", "tamb", "shaker", "cymbals", "triangle"];
function bandOf(s: Score): (InstId | DrumId)[] {
  const out: (InstId | DrumId)[] = [];
  const add = (id: InstId | DrumId) => {
    if (!out.includes(id)) out.push(id);
  };
  for (const t of s.tracks) if (t.kind === "notes") add(t.inst);
  for (const t of s.tracks)
    if (t.kind === "drums" && t.hits.length) {
      const ks = new Set(t.hits.map((h) => h.k));
      add(DRUM_FACE.find((d) => ks.has(d)) ?? t.hits[0].k);
    }
  return out.length ? out.slice(0, 4) : ["piano"];
}

/** The tempo a run of baton taps sets — only when the last few taps are steady. */
function steadyTempo(taps: number[]): number | null {
  const t = tapTempo(taps);
  if (t === null) return null;
  const recent = taps.slice(-4);
  const want = 60 / t;
  const gaps = recent.slice(1).map((x, i) => x - recent[i]);
  return gaps.every((g) => Math.abs(g - want) <= want * 0.25) ? t : null;
}

// ── The goal in kid words ───────────────────────────────────────────────────────────────────────
type Speed = "slow" | "walk" | "fast";
type Loud = "soft" | "mid" | "loud";
const speedOf = (r: [number, number]): Speed => (r[1] <= 90 ? "slow" : r[0] >= 112 ? "fast" : "walk");
const loudOf = (r: [number, number]): Loud => (r[1] <= 0.45 ? "soft" : r[0] >= 0.62 ? "loud" : "mid");
const SPEED: Record<Speed, { word: string; like: string; e: string }> = {
  slow: { word: "SLOW", like: "like a turtle", e: "🐢" },
  walk: { word: "WALKING SPEED", like: "like your feet walking", e: "🚶" },
  fast: { word: "FAST", like: "like a hopping bunny", e: "🐇" },
};
const LOUD: Record<Loud, { word: string; like: string; e: string }> = {
  soft: { word: "SOFT", like: "like a tiny mouse", e: "🐭" },
  mid: { word: "MEDIUM LOUD", like: "not too loud, not too soft", e: "👂" },
  loud: { word: "LOUD", like: "like a big elephant", e: "🐘" },
};
/** The dynamic marking nearest a loudness (pp … ff). */
const dynOf = (v: number) => DYNAMICS.reduce((b, d) => (Math.abs(d.gain - v) < Math.abs(b.gain - v) ? d : b), DYNAMICS[0]);
const mid = (r: [number, number]) => (r[0] + r[1]) / 2;

type Goal = { tempo?: [number, number]; dyn?: [number, number] };
function hintFor(goal: Goal, bpm: number, loud: number, taps: number): { text: string; on: "baton" | "hand" } {
  if (goal.tempo && (bpm < goal.tempo[0] || bpm > goal.tempo[1])) {
    if (taps < 3) return { text: "Tap the baton again and again — tap, tap, tap — like a ticking clock.", on: "baton" };
    return bpm > goal.tempo[1] ? { text: "Tap slower — like a turtle. Wait longer between taps.", on: "baton" } : { text: "Tap faster — like a bunny hopping!", on: "baton" };
  }
  if (goal.dyn && (loud < goal.dyn[0] || loud > goal.dyn[1])) return loud > goal.dyn[1] ? { text: "Lower your hand to make the band softer.", on: "hand" } : { text: "Raise your hand up high to make the band louder!", on: "hand" };
  return { text: "That's it — now keep it right there!", on: goal.tempo ? "baton" : "hand" };
}

type Phase = "intro" | "play" | "won" | "show";

export function ConductAct({ act, fx, onDone }: ActProps<"conduct">) {
  const music = act.music;
  const goal = act.goal;
  const bar = barBeats(music.meter ?? [4, 4]);
  const perBar = Math.max(2, Math.round(bar));
  const len = useMemo(() => passLen(music), [music]);
  const band = useMemo(() => bandOf(music), [music]);
  const player = usePlayer();
  const later = useLater();
  const voiced = fx.voice !== "keys";
  const little = fx.voice === "all";
  const { parts, auto } = spoken(fx, act.say, act.prompt);
  const intro: Part[] = fx.firstTime && voiced ? [...parts, "~", SAY.conductHow] : parts;

  const [phase, setPhase] = useState<Phase>("intro");
  const [bpm, setBpm] = useState(music.bpm); // the tempo the band is playing
  const [from, setFrom] = useState(0); // where in the music the current playback began (beats)
  const [live, setLive] = useState<number | null>(null); // the steady tempo the baton is tapping
  const [loud, setLoud] = useState(START_LOUD);
  const [taps, setTaps] = useState(0);
  const [run, setRun] = useState(0); // taps in the current run (a long pause starts a new one)
  const [steady, setSteady] = useState(true);
  const [swing, setSwing] = useState(1);
  const [hold, setHold] = useState(0);
  const [tip, setTip] = useState<{ text: string; k: number; on: "baton" | "hand" } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  // What handlers and timers need right now (state lags a render behind).
  const r = useRef({
    phase: "intro" as Phase,
    bpm: music.bpm,
    loud: START_LOUD,
    gain: START_LOUD,
    from: 0,
    taps: [] as number[],
    pend: null as number | null,
    steadyN: 0,
    scheduled: false,
    timer: 0,
    debounce: 0,
    followed: false,
    noAudio: false,
    hints: 0,
    started: 0,
    hold: 0,
    /** The child has conducted (a hold only counts after they've done something). */
    touched: false,
  });

  /** Start the band at `pos` beats into the music, at the current tempo and loudness. */
  const startBand = (pos: number) => {
    const s = r.current;
    const span = Math.max(len, Math.round(s.bpm * 0.8));
    s.from = pos;
    setFrom(pos);
    const pb = player.play(bandScore(music, len, pos, span, s.bpm), {
      gain: gainOf(s.gain),
      onEnd: () => {
        if (!s.noAudio && s.phase !== "intro") startBand((pos + span) % len);
      },
    });
    if (!pb) s.noAudio = true;
  };

  /** The band follows the baton and the hand on its next beat (and never talks over the voice). */
  const follow = () => {
    const s = r.current;
    if (s.scheduled || s.phase !== "play") return;
    s.scheduled = true;
    const apply = () => {
      s.scheduled = false;
      const changed = s.pend !== null && s.pend !== s.bpm;
      if (s.pend !== null) {
        s.bpm = s.pend;
        setBpm(s.pend);
        s.pend = null;
      }
      s.gain = s.loud;
      return changed;
    };
    const go = () => {
      if (s.phase !== "play") {
        s.scheduled = false;
        return;
      }
      if (speakingNow()) {
        s.timer = window.setTimeout(go, 250);
        return;
      }
      const pb = player.current();
      if (!pb || s.noAudio) {
        apply();
        return;
      }
      const nowB = (audioNow() - pb.t0) / pb.spb;
      let next = Math.ceil(s.from + nowB + 0.05);
      let wait = pb.timeOf(next - s.from) - audioNow() - LEAD;
      if (wait < 0.04) {
        next += 1;
        wait = pb.timeOf(next - s.from) - audioNow() - LEAD;
      }
      s.timer = window.setTimeout(() => {
        if (s.phase !== "play") {
          s.scheduled = false;
          return;
        }
        const changed = apply();
        startBand(next % len);
        if (changed && !s.followed) {
          s.followed = true;
          if (voiced) s.timer = window.setTimeout(() => void fx.say(SAY.conductFollow), 220);
        }
      }, Math.max(0, wait * 1000));
    };
    go();
  };

  const onBaton = (e: RPointerEvent<HTMLButtonElement>) => {
    const s = r.current;
    if (s.phase !== "play") return;
    playDrum("sticks", 0.55);
    s.touched = true;
    const t = e.timeStamp / 1000;
    const prev = s.taps;
    s.taps = prev.length && t - prev[prev.length - 1] > 2 ? [t] : [...prev, t].slice(-8);
    setTaps((n) => n + 1);
    setRun(s.taps.length);
    setSwing((w) => -w);
    window.clearTimeout(s.debounce);
    const tt = steadyTempo(s.taps);
    if (tt === null) {
      s.steadyN = 0;
      setSteady(s.taps.length < 3);
      return;
    }
    const bt = Math.round(clamp(tt, BPM_LO, BPM_HI));
    setLive(bt);
    setSteady(true);
    s.steadyN += 1;
    if (Math.abs(bt - s.bpm) >= Math.max(3, s.bpm * 0.04)) {
      s.pend = bt;
      // A pause hands the tempo to the band; so does conducting on steadily.
      if (s.steadyN >= 2) follow();
      else s.debounce = window.setTimeout(follow, 600);
    } else s.pend = null;
  };

  const onLoud = (v: number) => {
    const s = r.current;
    if (s.phase !== "play") return;
    s.touched = true;
    s.loud = v;
    setLoud(v);
    if (Math.abs(v - s.gain) >= 0.06) follow();
  };

  const win = () => {
    const s = r.current;
    if (s.phase !== "play") return;
    s.phase = "won";
    setPhase("won");
    window.clearTimeout(s.timer);
    window.clearTimeout(s.debounce);
    s.scheduled = false;
    setTip(null);
    fx.right(stageRef.current, voiced && act.word ? [act.word] : []);
    later(() => player.stop(), 2800);
    later(() => onDone(s.hints), 3200);
  };

  const hint = () => {
    const s = r.current;
    s.hints += 1;
    const h = hintFor(goal, s.bpm, s.loud, s.taps.length);
    setTip({ text: h.text, k: s.hints, on: h.on });
    if (voiced) void fx.say(h.text);
  };

  /** Out of time: the band shows how it should sound, then we move on. */
  const showMe = () => {
    const s = r.current;
    if (s.phase !== "play") return;
    s.phase = "show";
    setPhase("show");
    window.clearTimeout(s.timer);
    window.clearTimeout(s.debounce);
    s.scheduled = false;
    s.pend = null;
    const tb = goal.tempo ? Math.round(mid(goal.tempo)) : s.bpm;
    const tl = goal.dyn ? mid(goal.dyn) : s.loud;
    s.bpm = tb;
    s.loud = tl;
    s.gain = tl;
    setBpm(tb);
    setLoud(tl);
    setLive(null);
    const line = "Listen — this is how it sounds!";
    setTip({ text: line, k: 99, on: goal.tempo ? "baton" : "hand" });
    const pb = player.current();
    if (!s.noAudio) startBand(pb ? Math.ceil(s.from + (audioNow() - pb.t0) / pb.spb) % len : s.from);
    if (voiced) later(() => void fx.say(line), 250);
    const secs = clamp((2 * bar * 60) / tb, 3.5, 7);
    later(() => player.stop(), secs * 1000);
    later(() => onDone(s.hints + 1), secs * 1000 + 600);
  };

  // Ask (and, the first time, say how), then the band starts.
  useEffect(() => {
    const s = r.current;
    let alive = true;
    fx.setPrompt(intro);
    const begin = () => {
      if (!alive || s.phase !== "intro") return;
      s.phase = "play";
      s.started = clock();
      setPhase("play");
      startBand(0);
    };
    const t = window.setTimeout(() => {
      if (auto && intro.length) void fx.say(intro).then(() => window.setTimeout(begin, 250));
      else begin();
    }, 380);
    const cap = window.setTimeout(begin, 16000);
    return () => {
      alive = false;
      window.clearTimeout(t);
      window.clearTimeout(cap);
      window.clearTimeout(s.timer);
      window.clearTimeout(s.debounce);
    };
    // Asked once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // While the band plays: is it on the goal (and for how long)? Hints when it's taking a while.
  useEffect(() => {
    if (phase !== "play") return;
    const s = r.current;
    let last = clock();
    const iv = window.setInterval(() => {
      if (s.phase !== "play") return;
      const t = clock();
      const dt = Math.min(400, t - last);
      last = t;
      const okT = !goal.tempo || (s.bpm >= goal.tempo[0] - 1 && s.bpm <= goal.tempo[1] + 1);
      const okD = !goal.dyn || (s.loud >= goal.dyn[0] - 0.02 && s.loud <= goal.dyn[1] + 0.02);
      s.hold = okT && okD && s.touched ? s.hold + dt : 0;
      const need = clamp((2 * bar * 60000) / s.bpm, 2500, 6000);
      const h = Math.min(1, s.hold / need);
      setHold(h);
      if (h >= 1) {
        win();
        return;
      }
      const el = t - s.started;
      // Never interrupt a child who's holding it right now.
      if (s.hold > 0) {
        if (el > 60000) showMe();
        return;
      }
      if ((s.hints === 0 && el > 16000) || (s.hints === 1 && el > 30000)) hint();
      else if (el > 45000) showMe();
    }, 150);
    return () => window.clearInterval(iv);
    // The checks read the live values from the ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const playing = player.playing;
  const mus = player.beat !== null && player.beat >= 0 ? from + player.beat : null;
  const word = act.word ?? (fx.voice === "keys" ? (goal.tempo ? tempoWord(mid(goal.tempo)) : goal.dyn ? dynOf(mid(goal.dyn)).word : null) : null);
  const active = phase === "play";
  const size = little ? 112 : band.length > 3 ? 92 : 104;
  const status =
    phase === "intro"
      ? "Get ready…"
      : phase === "won"
        ? "Bravo!"
        : phase === "show"
          ? "Like this!"
          : run === 0
            ? "Tap the baton!"
            : run < 3
              ? "Keep tapping…"
              : !steady
                ? "Keep it steady!"
                : live !== null && Math.abs(live - bpm) >= 3
                  ? "The band is catching up…"
                  : "The band follows you!";

  return (
    <div className="relative flex w-full max-w-[1140px] flex-col items-center gap-3">
      <PromptRow parts={intro}>{act.prompt}</PromptRow>
      <SoundOffNote />
      <GoalCard goal={goal} word={word} little={little} keys={fx.voice === "keys"} hold={hold} phase={phase} />
      <div className="flex w-full items-stretch justify-center gap-4">
        <LoudSlider value={loud} onChange={onLoud} goal={goal.dyn} little={little} disabled={!active} nudge={!!tip && tip.on === "hand" && active} />
        <div ref={stageRef} className={cn("relative flex min-w-0 flex-1 flex-col items-center justify-between gap-2 overflow-hidden rounded-[30px] bg-white/95 px-5 pb-4 pt-2 shadow-[0_8px_0_rgba(0,40,80,0.14)] transition-shadow duration-300", phase === "won" && "shadow-[0_8px_0_var(--l-green-edge),0_0_0_6px_var(--l-green)]")}>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-b from-transparent to-[#ffe3f0]" aria-hidden />
          {tip && (
            <span key={tip.k} className="l-pop-in absolute left-1/2 top-2 z-[2] max-w-[92%] -translate-x-1/2 rounded-full bg-[var(--l-orange)] px-4 py-1.5 text-center font-display text-lg font-extrabold leading-tight text-white shadow-[0_4px_0_var(--l-orange-edge)]">
              {tip.text}
            </span>
          )}
          <Band ids={band} beat={mus} playing={playing} bpm={bpm} loud={loud} size={size} won={phase === "won"} />
          <div className="relative">
            <BeatDots n={perBar} beat={playing ? mus : null} accent={[0]} size={little ? 34 : 28} />
          </div>
          <TempoGauge bpm={bpm} live={active ? live : null} goal={goal.tempo} little={little} words={!little} />
        </div>
        <div className="flex w-[230px] shrink-0 flex-col items-center justify-center gap-2.5">
          <button
            type="button"
            aria-label="The baton: tap it on every beat"
            disabled={!active}
            onPointerDown={onBaton}
            className={cn("relative flex shrink-0 touch-none select-none items-center justify-center rounded-full transition-[filter,opacity] active:translate-y-1", !active && "opacity-60 saturate-50", !!tip && tip.on === "baton" && active && "l-hint", active && run === 0 && "l-pulse")}
            style={{ width: little ? 196 : 176, height: little ? 196 : 176, background: "radial-gradient(circle at 35% 30%, #a593ff, #6b4fe0)", boxShadow: "0 9px 0 #4b33b8, 0 16px 28px rgba(60,20,120,0.3)" }}
          >
            {taps > 0 && <span key={taps} className="m-ripple pointer-events-none absolute inset-0 rounded-full border-[6px] border-white/70" aria-hidden />}
            <svg viewBox="0 0 120 120" className="h-[80%] w-[80%] transition-transform duration-100 ease-out" style={{ transform: `rotate(${swing * 16}deg)`, transformOrigin: "34% 76%" }} aria-hidden>
              <path d="M30 34 Q24 40 30 46 M22 26 Q12 40 22 54" stroke="#fff" strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.55} />
              <line x1={40} y1={84} x2={100} y2={20} stroke="#2a2f45" strokeWidth={11} strokeLinecap="round" />
              <line x1={40} y1={84} x2={100} y2={20} stroke="#ffffff" strokeWidth={6} strokeLinecap="round" />
              <ellipse cx={36} cy={89} rx={15} ry={11} transform="rotate(-47 36 89)" fill="#c98a4a" stroke="#2a2f45" strokeWidth={4.5} />
              <ellipse cx={32} cy={85} rx={5} ry={3} transform="rotate(-47 32 85)" fill="#fff" opacity={0.55} />
            </svg>
          </button>
          <div className="flex items-center gap-1 rounded-full bg-white/95 py-0.5 pl-1 pr-4 shadow-[0_4px_0_rgba(0,40,80,0.15)]" aria-label={`${bpm} beats per minute`}>
            <SymbolView sym="quarter" size={40} />
            <span className="font-display text-3xl font-extrabold tabular-nums text-[var(--l-ink)]">= {bpm}</span>
          </div>
          {!little && (
            <span className="text-center font-[Georgia,serif] text-2xl font-black italic leading-none text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.35)]">
              {tempoWord(bpm)}
              {fx.voice === "core" && <span className="mt-1 block font-display text-base font-bold not-italic text-white/90">{TEMPO_WORDS.find((w) => w.word === tempoWord(bpm))?.kid}</span>}
            </span>
          )}
          <span key={status} className="l-pop-in rounded-full bg-[#d9408f] px-4 py-1 text-center font-display text-lg font-extrabold leading-tight text-white shadow-[0_3px_0_#a8306e]">
            {status}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Pieces ─────────────────────────────────────────────────────────────────────────────────────
function GoalCard({ goal, word, little, keys, hold, phase }: { goal: Goal; word: string | null; little: boolean; keys: boolean; hold: number; phase: Phase }) {
  const sp = goal.tempo ? SPEED[speedOf(goal.tempo)] : null;
  const ld = goal.dyn ? LOUD[loudOf(goal.dyn)] : null;
  const words = [sp?.word, ld?.word].filter(Boolean).join(" and ");
  const like = sp && ld ? null : (sp?.like ?? ld?.like);
  return (
    <div className={cn("relative flex w-full max-w-[880px] items-center gap-4 rounded-[26px] bg-white/95 px-5 py-2 shadow-[0_6px_0_rgba(0,40,80,0.14)] transition-shadow", phase === "won" && "shadow-[0_6px_0_var(--l-green-edge)]")}>
      <span className="flex shrink-0 items-end gap-1">
        {sp && <Glyph e={sp.e} size={little ? 64 : 52} className={cn(phase === "won" && "l-boing")} />}
        {ld && <Glyph e={ld.e} size={little ? 64 : 52} className={cn(phase === "won" && "l-boing")} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[22px] font-extrabold leading-tight text-[var(--l-ink)] sm:text-2xl">
          Make the band <span className="text-[#d9408f]">{words}</span>
          {like && <span className="text-[var(--l-ink-2)]"> — {like}</span>}
        </p>
        {keys && (
          <p className="flex flex-wrap items-center gap-x-4 font-display text-base font-bold text-[var(--l-ink-2)]">
            {goal.tempo && (
              <span className="inline-flex items-center">
                <SymbolView sym="quarter" size={24} /> = {goal.tempo[0]}–{goal.tempo[1]}
              </span>
            )}
            {goal.dyn && (
              <span className="font-[Georgia,serif] font-black italic">
                {dynOf(goal.dyn[0]).mark}
                {dynOf(goal.dyn[0]).mark !== dynOf(goal.dyn[1]).mark ? ` – ${dynOf(goal.dyn[1]).mark}` : ""}
              </span>
            )}
          </p>
        )}
        <div className="mt-1.5 flex items-center gap-2">
          <div className="relative h-3.5 flex-1 overflow-hidden rounded-full bg-[#ffe3f0]">
            <div className={cn("absolute inset-y-0 left-0 rounded-full transition-[width] duration-150", phase === "won" ? "bg-[var(--l-green)]" : "bg-gradient-to-r from-[#ff6fb5] to-[var(--l-green)]")} style={{ width: `${(phase === "won" ? 1 : hold) * 100}%` }} />
          </div>
          <span className="w-[120px] shrink-0 font-display text-sm font-extrabold text-[var(--l-ink-2)]">{phase === "won" ? "You did it!" : hold > 0 ? "Keep it there!" : "Hold it 2 bars"}</span>
        </div>
      </div>
      {word && <span className="shrink-0 font-[Georgia,serif] text-[32px] font-black italic leading-none text-[#6b4fe0]">{word}</span>}
      {phase === "won" && <Glyph e="✅" size={46} className="l-pop-in absolute -right-3 -top-3" />}
    </div>
  );
}

function Band({ ids, beat, playing, bpm, loud, size, won }: { ids: (InstId | DrumId)[]; beat: number | null; playing: boolean; bpm: number; loud: number; size: number; won: boolean }) {
  const k = beat !== null ? Math.floor(beat + EPS) : -1;
  const sc = 0.8 + loud * 0.34;
  return (
    <div className="relative flex w-full items-end justify-center gap-[5%] pt-11" style={{ "--beat": `${60 / Math.max(30, bpm)}s` } as CSSProperties}>
      {ids.map((id, i) => {
        const note = playing && k >= 0 && (k % ids.length === i || (loud > 0.72 && ids.length > 2 && (k + 2) % ids.length === i));
        return (
          <div key={id} className="relative flex flex-col items-center">
            {note && (
              <span key={k} className="m-tap pointer-events-none absolute -top-9 left-1/2" aria-hidden>
                <Glyph e={(k + i) % 2 ? "🎶" : "🎵"} size={Math.round(size * 0.4)} />
              </span>
            )}
            <span className={cn("block", playing && "m-groove", won && "l-hop")} style={{ animationDelay: playing ? `${-i * 0.17}s` : undefined }}>
              <span className="block transition-transform duration-300" style={{ transform: `scale(${sc})`, transformOrigin: "50% 100%" }}>
                <InstrumentPic id={id} size={size} />
              </span>
            </span>
            <span className="-mt-1 h-3 rounded-[50%] bg-[#2a2f45]/10" style={{ width: size * 0.8 }} aria-hidden />
          </div>
        );
      })}
    </div>
  );
}

function TempoGauge({ bpm, live, goal, little, words }: { bpm: number; live: number | null; goal?: [number, number]; little: boolean; words: boolean }) {
  const x = (b: number) => `${gx(b)}%`;
  return (
    <div className="relative flex w-full items-center gap-2.5" role="img" aria-label={`Speed: ${bpm} beats per minute`}>
      <Glyph e="🐢" size={little ? 50 : 42} />
      <div className="relative h-11 flex-1">
        <div className="absolute inset-0 overflow-hidden rounded-full bg-gradient-to-r from-[#d8f3e6] via-[#fff3c4] to-[#ffd2cd] shadow-[inset_0_3px_0_rgba(0,40,80,0.1)]">
          {words &&
            TEMPO_WORDS.map((w, i) => (
              <span key={w.word} className="absolute inset-y-0 flex items-center justify-center" style={{ left: x(Math.max(BPM_LO, w.lo)), width: `${gx(w.hi + 1) - gx(Math.max(BPM_LO, w.lo))}%`, borderLeft: i ? "2px solid rgba(42,47,69,0.12)" : undefined }}>
                {gx(w.hi + 1) - gx(w.lo) > 11 && <span className="font-[Georgia,serif] text-[13px] font-black italic text-[#2a2f45]/45">{w.word}</span>}
              </span>
            ))}
        </div>
        {goal && <span className="absolute -inset-y-1.5 rounded-full border-[3px] border-dashed border-[var(--l-green-edge)] bg-[var(--l-green)]/30" style={{ left: x(goal[0]), width: `${gx(goal[1]) - gx(goal[0])}%` }} aria-hidden />}
        {live !== null && <span className="absolute -bottom-2 -top-2 w-2 -translate-x-1/2 rounded-full bg-[#8b6cff]/55 transition-[left] duration-200" style={{ left: x(live) }} aria-hidden />}
        <span className="absolute -bottom-3 -top-3 w-2.5 -translate-x-1/2 rounded-full bg-[#d9408f] shadow-[0_0_0_3px_#fff,0_3px_6px_rgba(0,40,80,0.3)] transition-[left] duration-500 ease-out" style={{ left: x(bpm) }} aria-hidden />
      </div>
      <Glyph e="🐇" size={little ? 50 : 42} />
    </div>
  );
}

/** "Hand up = loud, hand down = soft": a tall slider you drag with a finger. */
function LoudSlider({ value, onChange, goal, little, disabled, nudge }: { value: number; onChange: (v: number) => void; goal?: [number, number]; little: boolean; disabled: boolean; nudge: boolean }) {
  const area = useRef<HTMLDivElement>(null);
  const setAt = (y: number) => {
    const el = area.current;
    if (!el) return;
    const rc = el.getBoundingClientRect();
    onChange(clamp(1 - (y - rc.top) / rc.height, 0, 1));
  };
  const key = (e: RKeyboardEvent) => {
    if (disabled) return;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") onChange(clamp(value + 0.05, 0, 1));
    if (e.key === "ArrowDown" || e.key === "ArrowLeft") onChange(clamp(value - 0.05, 0, 1));
  };
  const d = dynOf(value);
  const thumb = little ? 86 : 78;
  return (
    <div className="flex w-[118px] shrink-0 flex-col items-center gap-1">
      <Glyph e="🐘" size={little ? 50 : 40} />
      <div
        role="slider"
        tabIndex={0}
        aria-label="Loudness: hand up for loud, down for soft"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        aria-disabled={disabled}
        onKeyDown={key}
        onPointerDown={(e) => {
          if (disabled) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          setAt(e.clientY);
        }}
        onPointerMove={(e) => {
          if (!disabled && e.currentTarget.hasPointerCapture(e.pointerId)) setAt(e.clientY);
        }}
        className={cn("relative w-[88px] flex-1 touch-none select-none rounded-[44px] shadow-[inset_0_4px_0_rgba(0,40,80,0.12),0_5px_0_rgba(0,40,80,0.18)]", disabled && "opacity-60 saturate-50", nudge && "l-hint")}
        style={{ minHeight: 210, background: "linear-gradient(0deg, #fff0f7 0%, #ffb3d6 45%, #ff6fb5 75%, #d9408f 100%)" }}
      >
        <div ref={area} className="absolute inset-x-0" style={{ top: thumb / 2, bottom: thumb / 2 }}>
          {goal && <span className="absolute -inset-x-2 rounded-[18px] border-[3px] border-dashed border-[var(--l-green-edge)] bg-[var(--l-green)]/35" style={{ bottom: `${goal[0] * 100}%`, height: `${(goal[1] - goal[0]) * 100}%` }} aria-hidden />}
          {!little &&
            DYNAMICS.map((m) => (
              <span key={m.mark} className="absolute left-full ml-1 translate-y-1/2 font-[Georgia,serif] text-[15px] font-black italic leading-none text-white drop-shadow-[0_1px_0_rgba(0,40,80,0.5)]" style={{ bottom: `${m.gain * 100}%` }} aria-hidden>
                {m.mark}
              </span>
            ))}
          <span className="absolute left-1/2 flex -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full bg-white shadow-[0_5px_0_rgba(0,40,80,0.22)]" style={{ bottom: `${value * 100}%`, width: thumb, height: thumb }} aria-hidden>
            <Glyph e="✋" size={thumb * 0.7} />
          </span>
        </div>
      </div>
      <Glyph e="🐭" size={little ? 50 : 40} />
      <span className="text-center font-display text-base font-extrabold leading-tight text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.3)]">
        {little ? (
          d.kid
        ) : (
          <>
            <span className="font-[Georgia,serif] italic">{d.mark}</span> · {d.word}
          </>
        )}
      </span>
    </div>
  );
}
