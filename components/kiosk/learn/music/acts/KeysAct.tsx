"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Eraser, Lock, Play, Square } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Part } from "@/lib/learn/audio";
import { SAY } from "@/lib/learn/script";
import { sfx } from "@/lib/learn/sfx";
import type { Score } from "@/lib/learn/mus/types";
import { LETTERS, intervalName, keyAcc, pcOf, spell, spelledName } from "@/lib/learn/mus/theory";
import { arpeggio, chordSound, melody } from "@/lib/learn/mus/score";
import { Chunk } from "../../kit";
import { HearButton, PromptRow, spoken, useLater, useSpokenPrompt, type ActProps } from "../../acts/common";
import { usePlayer } from "../kit/player";
import { Keyboard, SoundOffNote } from "../kit/kit";
import { NoGlide, clock, isBlackKey, noteWords, soundingAt, useWhenQuiet } from "./MelodyAct";

// The keyboard, up close:
//   find      tap the key asked for (any octave counts when the item says so) — a right key glows
//             green, a wrong one flashes red, and after two misses the right key glows as a hint;
//   chord · scale · interval
//             build it: tap keys to hold them (tap again to let go; given keys are locked in), Play
//             to hear what you're holding, then Check. A wrong check says what's off — which notes
//             don't belong, how many are missing (then which), how big the interval is — and the
//             third one shows the answer lit up. Get it right and it plays with a flourish.

type Msg = { text: string; tone: "good" | "oops" | "info" };

/** Where the kit's Keyboard draws each key, as percentages of its key bed (mirrors kit.tsx). */
function keyBoxes(lo: number, hi: number) {
  const whites: number[] = [];
  for (let m = lo; m <= hi; m++) if (!isBlackKey(m)) whites.push(m);
  const W = 100 / Math.max(1, whites.length);
  const boxes: { m: number; left: number; width: number; height: number; black: boolean }[] = [];
  whites.forEach((m, i) => {
    boxes.push({ m, left: i * W, width: W, height: 100, black: false });
    const b = m + 1;
    if (b <= hi && isBlackKey(b)) boxes.push({ m: b, left: (i + 1) * W - W * 0.31, width: W * 0.62, height: 60, black: true });
  });
  return { boxes, whites: whites.length };
}

/** Key names to print on the keys: white keys by letter, black keys spelled for the key in play. */
function keyNames(lo: number, hi: number, fifths: number): Record<number, string> {
  const out: Record<number, string> = {};
  for (let m = lo; m <= hi; m++) out[m] = isBlackKey(m) ? spelledName(m, fifths) : LETTERS[spell(m).letter];
  return out;
}

/** The key signature that spells a set of notes best: fewest notes outside it, then the simplest. */
function bestFifths(ps: number[]): number {
  if (!ps.length) return 0;
  const low = Math.min(...ps);
  let best = 0;
  let bestScore = Infinity;
  for (let f = -7; f <= 7; f++) {
    const outside = ps.filter((p) => {
      const s = spell(p, f);
      return s.acc !== keyAcc(f, s.letter);
    }).length;
    const score = outside * 100 + Math.abs(f) + (spelledName(low, f) === spelledName(low) ? 0 : 3);
    if (score < bestScore) {
      bestScore = score;
      best = f;
    }
  }
  return best;
}

const article = (s: string) => (/^[aeiou]/i.test(s) ? "an " : "a ") + s;
const sizeName = (semis: number) => (semis > 12 ? "more than an octave" : article(intervalName(semis)));
const byPitch = (x: number, y: number) => x - y;

export function KeysAct({ act, fx, onDone }: ActProps<"keys">) {
  if (act.task === "find") return <FindKeys act={act} fx={fx} onDone={onDone} />;
  return <BuildKeys act={act} fx={fx} onDone={onDone} />;
}

/** Green glows on keys that are right, colored dots on keys being held (a lock on given ones), and an
 *  invisible anchor per key (stars burst from the key itself). Laid exactly over the kit's Keyboard. */
function KeyLayer({ lo, hi, right = [], held = [], given = [], nudge }: { lo: number; hi: number; right?: number[]; held?: number[]; given?: number[]; nudge?: { m: number; k: number } | null }) {
  const { boxes } = keyBoxes(lo, hi);
  return (
    <div className="pointer-events-none absolute bottom-1.5 left-1.5 right-1.5 top-2 z-[3]" aria-hidden>
      {boxes.map((b) => {
        const ok = right.includes(b.m);
        const isGiven = given.includes(b.m);
        const isHeld = isGiven || held.includes(b.m);
        return (
          <div key={b.m} data-key={b.m} className="absolute top-0" style={{ left: `${b.left}%`, width: `${b.width}%`, height: `${b.height}%` }}>
            {ok &&
              (b.black ? (
                <span className="l-pop-in absolute inset-0 rounded-b-[8px] border-[3px] border-[#5cf28f] shadow-[0_0_18px_rgba(60,207,110,0.95)]" />
              ) : (
                <span className="l-pop-in absolute inset-x-[7%] bottom-[3%] top-[63%] rounded-[12px] border-[4px] border-[#25a552] bg-[#3ccf6e]/25 shadow-[0_0_18px_rgba(60,207,110,0.9)]" />
              ))}
            {ok && (
              <span className={cn("l-pop-in absolute left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full bg-[#3ccf6e] shadow-[0_2px_0_#25a552]", b.black ? "top-[58%]" : "top-[57%]")}>
                <Check className="h-4.5 w-4.5 text-white" strokeWidth={3.6} />
              </span>
            )}
            {!ok && isHeld && (
              <span
                key={nudge?.m === b.m ? nudge.k : 0}
                className={cn("absolute left-1/2 flex -translate-x-1/2 items-center justify-center rounded-full border-[3px] border-white shadow-[0_2px_4px_rgba(0,30,60,0.35)]", isGiven ? "h-7 w-7 bg-[var(--l-violet)]" : "l-pop-in h-5 w-5 bg-[#ff4d8d]", b.black ? "top-[60%]" : "top-[44%]", nudge?.m === b.m && "l-shake")}
              >
                {isGiven && <Lock className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MsgPill({ msg, k, hearable }: { msg: Msg | null; k: number; hearable: boolean }) {
  if (!msg) return null;
  return (
    <span key={msg.text + k} className="l-pop-in flex items-center gap-2">
      <span className={cn("max-w-[820px] text-balance rounded-[22px] px-5 py-1.5 text-center font-display text-xl font-extrabold text-white shadow-[0_4px_0_rgba(0,40,80,0.2)]", msg.tone === "good" ? "bg-[var(--l-green)]" : msg.tone === "oops" ? "bg-[var(--l-orange)]" : "bg-[var(--l-violet)]")}>{msg.text}</span>
      {hearable && <HearButton parts={[msg.text]} size={46} label="Hear it" />}
    </span>
  );
}

// ── Find the key ─────────────────────────────────────────────────────────────────────────────
function FindKeys({ act: a, fx, onDone }: ActProps<"keys">) {
  const lo = isBlackKey(a.lo) ? a.lo - 1 : a.lo;
  const hi = a.hi;
  const pcs = !!a.octaveFree;
  const goals = useMemo(() => [...new Set(a.answer.map((p) => (pcs ? pcOf(p) : p)))], [a.answer, pcs]);
  const goalOf = (m: number) => (pcs ? pcOf(m) : m);
  const voiced = fx.voice !== "keys";
  const little = fx.voice === "all";
  const later = useLater();
  const parts = useSpokenPrompt(fx, a.say, a.prompt);
  const [found, setFound] = useState<number[]>([]);
  const [misses, setMisses] = useState(0);
  const [flash, setFlash] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);
  const foundRef = useRef<number[]>([]);
  const missRef = useRef(0);
  const lastSlip = useRef(-1e9);
  const flashKey = useRef(0);
  const doneRef = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);

  const anchor = (m: number) => boardRef.current?.querySelector(`[data-key="${m}"]`) ?? null;
  const finish = (m: number) => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone(m);
  };
  const press = (m: number) => {
    if (done) return;
    const g = goalOf(m);
    if (goals.includes(g)) {
      if (foundRef.current.some((f) => goalOf(f) === g)) return; // found already — it just plays
      const next = [...foundRef.current, m];
      foundRef.current = next;
      setFound(next);
      if (goals.every((x) => next.some((f) => goalOf(f) === x))) {
        setDone(true);
        setMsg({ text: goals.length > 1 ? "You found them all!" : `Yes — that's ${spelledName(m)}!`, tone: "good" });
        fx.right(anchor(m), voiced && goals.length === 1 ? [noteWords(spelledName(m))] : []);
        later(() => finish(missRef.current), 1500);
      } else {
        fx.burst(anchor(m), "star", 6);
        setMsg({ text: `${spelledName(m)}! Now find the ${goals.length - next.length === 1 ? "last one" : "next one"}.`, tone: "good" });
      }
      return;
    }
    const t = clock();
    if (t - lastSlip.current < 450) return; // one slip of the hand is one mistake
    lastSlip.current = t;
    const k = ++flashKey.current;
    setFlash(m);
    later(() => flashKey.current === k && setFlash(null), 700);
    const f = missRef.current + 1;
    missRef.current = f;
    setMisses(f);
    setMsg({ text: `That's ${spelledName(m)}.${f >= 2 ? " Look for the glowing key!" : " Try again!"}`, tone: "oops" });
    fx.wrong(anchor(m));
  };

  const { whites } = keyBoxes(lo, hi);
  const unfound = goals.filter((g) => !found.some((f) => goalOf(f) === g));
  const lit: number[] = [];
  if (!done && misses >= 2) for (let m = lo; m <= hi; m++) if (unfound.includes(goalOf(m))) lit.push(m);
  const kbH = little ? 260 : 240;
  return (
    <div className="flex w-full max-w-[1120px] flex-col items-center gap-4">
      <PromptRow parts={parts}>{a.prompt}</PromptRow>
      <SoundOffNote />
      <div className="flex min-h-12 items-center justify-center">
        {msg ? (
          <MsgPill msg={msg} k={misses * 10 + found.length} hearable={false} />
        ) : goals.length > 1 ? (
          <span className="rounded-full bg-white/95 px-5 py-1.5 font-display text-xl font-extrabold text-[var(--l-ink)] shadow-[0_3px_0_rgba(0,40,80,0.15)]">
            Found {found.length} of {goals.length}
          </span>
        ) : null}
      </div>
      <div ref={boardRef} className="relative w-full" style={{ maxWidth: Math.min(1100, whites * (little ? 104 : 86)) }}>
        <NoGlide>
          <Keyboard lo={lo} hi={hi} onPress={press} lit={lit} wrong={flash !== null ? [flash] : []} labels="none" marks={a.labels ? keyNames(lo, hi, 0) : undefined} height={kbH} />
        </NoGlide>
        <KeyLayer lo={lo} hi={hi} right={found} />
      </div>
    </div>
  );
}

// ── Build a chord, a scale or an interval ────────────────────────────────────────────────────
type Verdict = { ok: boolean; extra: number[]; missing: number[] };

/** Is what's held the chord / scale / interval asked for — and if not, which keys don't belong and
 *  which notes are missing? A chord is a set (any octave and order when `octaveFree`); a scale or an
 *  interval is the same notes low → high (moved by whole octaves when `octaveFree`). */
function judgeBuild(task: "chord" | "scale" | "interval", heldIn: number[], answer: number[], octaveFree: boolean): Verdict {
  const held = [...new Set(heldIn)].sort(byPitch);
  if (task === "chord") {
    if (octaveFree) {
      const hp = new Set(held.map(pcOf));
      const ap = new Set(answer.map(pcOf));
      const extra = held.filter((m) => !ap.has(pcOf(m)));
      const missing = answer.filter((m) => !hp.has(pcOf(m)));
      return { ok: !extra.length && !missing.length, extra, missing };
    }
    const extra = held.filter((m) => !answer.includes(m));
    const missing = answer.filter((m) => !held.includes(m));
    return { ok: !extra.length && !missing.length, extra, missing };
  }
  const shift = octaveFree && held.length ? Math.round((held[0] - answer[0]) / 12) * 12 : 0;
  const want = answer.map((m) => m + shift);
  const extra = held.filter((m) => !want.includes(m));
  const missing = want.filter((m) => !held.includes(m));
  return { ok: !extra.length && !missing.length, extra, missing };
}

/** The win: a chord rolls up and rings together; a scale runs up and back down; an interval plays
 *  its two notes one after the other, then together. One line of notes, so the keys light in time. */
function flourish(task: "chord" | "scale" | "interval", ps: number[]): Score {
  const s = [...new Set(ps)].sort(byPitch);
  if (task === "chord") return arpeggio(s, "piano", 104);
  if (task === "scale") {
    const run = [...s, ...s.slice(0, -1).reverse()];
    return melody(run, run.map((_, i) => (i === run.length - 1 ? 1.5 : 0.5)), "piano", 138);
  }
  return melody([...s, s], [...s.map(() => 0.75), 2], "piano", 84);
}

function BuildKeys({ act: a, fx, onDone }: ActProps<"keys">) {
  const task = a.task === "find" ? "chord" : a.task;
  const lo = isBlackKey(a.lo) ? a.lo - 1 : a.lo;
  const hi = a.hi;
  const given = useMemo(() => [...new Set(a.given ?? [])].sort(byPitch), [a.given]);
  const answer = useMemo(() => [...new Set(a.answer)].sort(byPitch), [a.answer]);
  // Chords follow the content's spelling (sharps, like their names); scales and intervals are
  // spelled in their own key (F major has a B♭, not an A♯).
  const fifths = useMemo(() => (task === "chord" ? 0 : bestFifths(answer)), [task, answer]);
  const nm = (m: number) => spelledName(m, fifths);
  const voiced = fx.voice !== "keys";
  const little = fx.voice === "all";
  const player = usePlayer();
  const later = useLater();
  const whenQuiet = useWhenQuiet();
  const { parts, auto } = spoken(fx, a.say, a.prompt);
  const intro: Part[] = voiced && fx.firstTime && a.prompt !== SAY.keysCheck && !parts.includes(SAY.keysCheck) ? [...parts, "~", SAY.keysCheck] : parts;

  const [held, setHeld] = useState<number[]>(given);
  const [phase, setPhase] = useState<"edit" | "won" | "shown">("edit");
  const [checks, setChecks] = useState(0);
  const [bad, setBad] = useState<number[]>([]);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [nudge, setNudge] = useState<{ m: number; k: number } | null>(null);
  // What was held at the last wrong check (Check wakes up again once something changes).
  const [lastWrong, setLastWrong] = useState<string | null>(null);
  const checksRef = useRef(0);
  const alive = useRef(true);
  const doneRef = useRef(false);
  const toldLock = useRef(false);

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

  const editing = phase === "edit";
  const finish = (m: number) => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone(m);
  };
  const toggle = (m: number) => {
    if (!editing) return;
    if (given.includes(m)) {
      setNudge((n) => ({ m, k: (n?.k ?? 0) + 1 }));
      if (!toldLock.current) {
        toldLock.current = true;
        setMsg({ text: "That key is given — build on it!", tone: "info" });
      }
      return;
    }
    setHeld((h) => (h.includes(m) ? h.filter((x) => x !== m) : [...h, m].sort(byPitch)));
    setBad((b) => b.filter((x) => x !== m));
  };
  const playHeld = () => {
    sfx("tap");
    if (player.playing) {
      player.stop();
      return;
    }
    if (!held.length) return;
    player.play(task === "chord" ? chordSound(held, "piano", 2.5, 70) : melody(held, 0.6, "piano", 100));
  };
  const clear = () => {
    if (!editing) return;
    sfx("tap");
    player.stop();
    setHeld(given);
    setBad([]);
  };

  const list = (ms: number[]) => {
    const xs = [...new Set(ms.map(nm))];
    return xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
  };
  /** What a wrong check says: the notes that don't belong (named — they're the child's own), how many
   *  are missing (named from the second check), or how big the interval is. */
  const explain = (v: Verdict, k: number, h: number[]): string => {
    if (task === "interval") {
      if (h.length !== 2) return `An interval is two notes — you're holding ${h.length}.`;
      const span = h[1] - h[0];
      const want = answer[answer.length - 1] - answer[0];
      if (span !== want) return `That's ${sizeName(span)} — you need ${sizeName(want)}.${k >= 2 && v.missing.length ? ` Try ${list(v.missing)}.` : ""}`;
      return `Right size! Now start on ${list([v.missing[0] ?? answer[0]])}.`;
    }
    const samePcs = new Set(h.map(pcOf)).size === new Set(answer.map(pcOf)).size && h.every((m) => answer.some((x) => pcOf(x) === pcOf(m)));
    if (task === "scale" && samePcs && !v.extra.length) return `Right notes! A scale goes up in order — start on ${nm(answer[0])} and end on ${nm(answer[answer.length - 1])}.`;
    const out: string[] = [];
    if (v.extra.length) out.push(`${list(v.extra)} ${new Set(v.extra.map(nm)).size > 1 ? "don't" : "doesn't"} belong — take ${v.extra.length > 1 ? "them" : "it"} out.`);
    if (v.missing.length) out.push(k >= 2 ? `You still need ${list(v.missing)}.` : v.missing.length === 1 ? "One note is still missing." : `${v.missing.length} notes are still missing.`);
    return out.join(" ") || "Not quite — look again.";
  };
  const afterWin = (m: number, alwaysWhy: boolean) => {
    if (!alive.current) return;
    if (a.why && (alwaysWhy || m > 0)) void fx.explain(a.why, fx.voice === "all" ? [a.why] : undefined).then(() => finish(m));
    else later(() => finish(m), 600);
  };
  const win = (el: HTMLElement) => {
    setPhase("won");
    setBad([]);
    setMsg({ text: `That's it! ${held.map(nm).join(" – ")}`, tone: "good" });
    fx.right(el);
    const notes = [...held];
    whenQuiet(() => {
      if (!alive.current) return;
      player.play(flourish(task, notes), { onEnd: () => afterWin(checksRef.current, false) });
    }, 400);
  };
  // Third wrong check: here it is, lit up and played — then on we go.
  const reveal = () => {
    setPhase("shown");
    setBad([]);
    setHeld(answer);
    setMsg({ text: `Here it is: ${answer.map(nm).join(" – ")}`, tone: "info" });
    whenQuiet(() => {
      if (!alive.current) return;
      player.play(flourish(task, answer), { onEnd: () => afterWin(checksRef.current, true) });
    }, 600);
  };
  const check = (el: HTMLElement) => {
    if (!editing || held.join() === lastWrong) return;
    player.stop();
    const v = judgeBuild(task, held, answer, !!a.octaveFree);
    if (v.ok) return win(el);
    const k = checksRef.current + 1;
    checksRef.current = k;
    setChecks(k);
    setBad(v.extra);
    setLastWrong(held.join());
    if (k >= 3) {
      fx.miss();
      reveal();
      return;
    }
    setMsg({ text: explain(v, k, [...new Set(held)].sort(byPitch)), tone: "oops" });
    fx.wrong(el);
  };

  const s = soundingAt(player.playing ? player.score : null, player.beat);
  const lit = phase === "shown" ? [...new Set([...answer, ...s.ps])] : s.ps;
  const ready = editing && held.length > given.length && held.join() !== lastWrong;
  const { whites } = keyBoxes(lo, hi);
  const kbH = little ? 260 : 236;
  return (
    <div className="flex w-full max-w-[1120px] flex-col items-center gap-3">
      <PromptRow parts={intro}>{a.prompt}</PromptRow>
      <SoundOffNote />
      {/* What's being held. */}
      <div className="flex min-h-12 flex-wrap items-center justify-center gap-2">
        {held.length === 0 ? (
          <span className="font-display text-xl font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.3)]">Tap keys to hold them — tap again to let go.</span>
        ) : a.labels || !editing ? (
          held.map((m) => (
            <span key={m} className={cn("l-pop-in flex items-center gap-1 rounded-full px-4 py-1 font-display text-2xl font-extrabold text-white shadow-[0_3px_0_rgba(0,40,80,0.2)]", bad.includes(m) ? "bg-[var(--l-coral)]" : given.includes(m) ? "bg-[var(--l-violet)]" : "bg-[#ff4d8d]")}>
              {given.includes(m) && <Lock className="h-4 w-4" strokeWidth={3} />}
              {nm(m)}
            </span>
          ))
        ) : (
          <span className="rounded-full bg-white/95 px-5 py-1.5 font-display text-xl font-extrabold text-[var(--l-ink)] shadow-[0_3px_0_rgba(0,40,80,0.15)]">
            Holding {held.length} {held.length === 1 ? "key" : "keys"}
          </span>
        )}
      </div>
      <div className="relative w-full" style={{ maxWidth: Math.min(1100, whites * (little ? 100 : 82)) }}>
        <NoGlide className={cn(!editing && "pointer-events-none")}>
          <Keyboard lo={lo} hi={hi} onPress={toggle} held={held} lit={lit} wrong={bad} labels="none" marks={a.labels ? keyNames(lo, hi, fifths) : undefined} height={kbH} />
        </NoGlide>
        <KeyLayer lo={lo} hi={hi} right={phase === "won" ? held : []} held={held} given={given} nudge={nudge} />
      </div>
      <div className="flex min-h-11 items-center justify-center">
        <MsgPill msg={msg} k={checks} hearable={voiced && msg?.tone === "oops"} />
      </div>
      <div className="flex items-center justify-center gap-3">
        <Chunk tone="violet" disabled={!held.length} onClick={playHeld} className={cn("flex h-16 items-center gap-2 px-6 font-display text-2xl font-extrabold", !held.length && "opacity-50")}>
          {player.playing ? <Square className="h-6 w-6 fill-current" strokeWidth={0} /> : <Play className="h-7 w-7 fill-current" strokeWidth={0} />} {player.playing ? "Stop" : "Play"}
        </Chunk>
        <Chunk tone="white" disabled={!editing || held.length === given.length} onClick={clear} className={cn("flex h-16 items-center gap-2 px-6 font-display text-xl font-extrabold text-[var(--l-ink-2)]", (!editing || held.length === given.length) && "opacity-50")}>
          <Eraser className="h-6 w-6" strokeWidth={2.6} /> Clear
        </Chunk>
        <Chunk tone="green" disabled={!ready} onClick={(e) => check(e.currentTarget)} className={cn("flex h-16 items-center gap-2 px-8 font-display text-2xl font-extrabold", ready ? "l-pulse" : "opacity-60")}>
          <Check className="h-8 w-8" strokeWidth={3.2} /> Check
        </Chunk>
      </div>
    </div>
  );
}
