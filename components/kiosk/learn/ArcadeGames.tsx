"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Band } from "@/lib/learn/types";
import { say } from "@/lib/learn/audio";
import { sfx, buzz } from "@/lib/learn/sfx";
import { ANTONYMS, DOLCH, FAMILIES, RHYME_SETS } from "@/lib/learn/readingBanks";
import { Chunk } from "./kit";
import { ClockBar, useClock } from "./BrainGym";
import { colorize } from "./lab/CodeReadAct";

// The Game Arcade's learning games: quick, replayable rounds that turn practice into play — number
// sense (make ten, bigger wins, number-line estimation, coin counting), word games (word rocket,
// rhyme time, opposites), code games (binary blitz, bug squash, robot path, loop spotter, Python
// speed run) and science games (sink or float, animal groups). Every round is short and scored against your own best; difficulty follows the
// child's grade band. Speed with accuracy (fluency) is what frees a brain up for harder thinking.

const rand = (n: number) => Math.floor(Math.random() * n);
const pickOne = <T,>(xs: readonly T[]): T => xs[rand(xs.length)];
const shuffled = <T,>(xs: readonly T[]): T[] => {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const ROUND = 50;

type GameProps = { band: Band; onEnd: (score: number) => void };

function Frame({ left, score, children, top }: { left: number; score: number; children: ReactNode; top?: ReactNode }) {
  return (
    <div className="flex w-full max-w-[1000px] flex-col items-center gap-5">
      <ClockBar left={left} total={ROUND} />
      <div className="flex items-center gap-3">
        <span key={score} className="l-pop-in rounded-full bg-white px-5 py-1.5 font-display text-2xl font-extrabold text-[var(--l-ink)]">⭐ {score}</span>
        {top}
      </div>
      {children}
    </div>
  );
}

/** Right/wrong feedback shared by the quick-answer games. */
function useHit(onRight: () => void) {
  const [flash, setFlash] = useState<{ ok: boolean; k: number } | null>(null);
  const hit = (ok: boolean) => {
    setFlash({ ok, k: Date.now() });
    if (ok) {
      sfx("correct");
      onRight();
    } else {
      sfx("soft-fail");
      buzz(25);
    }
  };
  return { flash, hit };
}

// ── Make Ten ─────────────────────────────────────────────────────────────────────────────────
const tenGoal = (band: Band) => (band === "little" ? 5 : band === "middle" ? 10 : 100);
const tenPart = (band: Band, goal: number) => (band === "big" ? (1 + rand(9)) * 10 : 1 + rand(goal - 1));
function freshBubbles(band: Band): number[] {
  const goal = tenGoal(band);
  const a = tenPart(band, goal);
  const rest = Array.from({ length: 6 }, () => tenPart(band, goal));
  return shuffled([a, goal - a, ...rest]);
}
export function MakeTen({ band, onEnd }: GameProps) {
  const goal = tenGoal(band);
  const [score, setScore] = useState(0);
  const [nums, setNums] = useState(() => freshBubbles(band));
  const [sel, setSel] = useState<number | null>(null);
  const [pop, setPop] = useState<number[]>([]);
  const left = useClock(ROUND, () => onEnd(score));
  const tap = (i: number) => {
    if (pop.length) return;
    if (sel === null) {
      sfx("pick");
      setSel(i);
      return;
    }
    if (sel === i) {
      setSel(null);
      return;
    }
    if (nums[sel] + nums[i] === goal) {
      sfx("correct");
      setPop([sel, i]);
      setScore((s) => s + 1);
      window.setTimeout(() => {
        setNums(freshBubbles(band));
        setPop([]);
      }, 380);
    } else {
      sfx("soft-fail");
      buzz(25);
    }
    setSel(null);
  };
  return (
    <Frame left={left} score={score} top={<span className="rounded-full bg-[var(--l-gold)] px-5 py-1.5 font-display text-2xl font-extrabold text-[#5a3b00]">Make {goal}!</span>}>
      <div className="grid grid-cols-4 gap-4">
        {nums.map((n, i) => (
          <button key={`${i}-${n}`} type="button" onClick={() => tap(i)} className={cn("flex h-28 w-28 items-center justify-center rounded-full font-display text-4xl font-extrabold text-white shadow-[inset_0_-8px_0_rgba(0,0,0,0.15),0_6px_0_rgba(0,40,80,0.2)] transition-transform", sel === i && "scale-110 ring-[6px] ring-[var(--l-gold)]", pop.includes(i) && "scale-0 opacity-0 duration-300")} style={{ background: `hsl(${(n * 37) % 360} 70% 55%)` }}>
            {band === "little" ? <Dots n={n} /> : n}
          </button>
        ))}
      </div>
      <p className="font-display text-lg font-bold text-white/90">Tap two that add up to {goal}.</p>
    </Frame>
  );
}
function Dots({ n }: { n: number }) {
  return (
    <span className="grid grid-cols-3 gap-1">
      {Array.from({ length: n }, (_, k) => (
        <span key={k} className="h-4 w-4 rounded-full bg-white" />
      ))}
    </span>
  );
}

// ── Bigger Wins ──────────────────────────────────────────────────────────────────────────────
type Pair = { a: number; b: number; la: string; lb: string };
const FRACS: [number, number][] = [[1, 2], [1, 3], [1, 4], [2, 3], [3, 4], [1, 5], [2, 5], [3, 5], [1, 8], [5, 8], [1, 10], [7, 10]];
function makePair(band: Band): Pair {
  if (band === "little") {
    const a = 1 + rand(9);
    let b = 1 + rand(9);
    if (b === a) b = a === 9 ? 8 : a + 1;
    return { a, b, la: String(a), lb: String(b) };
  }
  if (band === "middle") {
    const a = 10 + rand(90);
    let b = Math.max(10, a + (rand(2) ? 1 : -1) * (1 + rand(20)));
    if (b === a) b = a + 1;
    return { a, b, la: String(a), lb: String(b) };
  }
  const [x, y] = shuffled(FRACS).filter(([p, q], i, arr) => i === 0 || p / q !== arr[0][0] / arr[0][1]).slice(0, 2);
  return { a: x[0] / x[1], b: y[0] / y[1], la: `${x[0]}/${x[1]}`, lb: `${y[0]}/${y[1]}` };
}
export function BiggerWins({ band, onEnd }: GameProps) {
  const [score, setScore] = useState(0);
  const [p, setP] = useState(() => makePair(band));
  const { flash, hit } = useHit(() => setScore((s) => s + 1));
  const left = useClock(ROUND, () => onEnd(score));
  const pick = (which: "a" | "b") => {
    hit(which === "a" ? p.a > p.b : p.b > p.a);
    setP(makePair(band));
  };
  return (
    <Frame left={left} score={score} top={<span className="rounded-full bg-[var(--l-violet)] px-5 py-1.5 font-display text-2xl font-extrabold text-white">Tap the BIGGER one!</span>}>
      <div className="flex gap-8">
        {(["a", "b"] as const).map((w) => (
          <Chunk key={`${w}${p.la}${p.lb}`} tone="white" onClick={() => pick(w)} className="l-pop-in flex h-56 w-56 items-center justify-center font-display text-7xl font-extrabold text-[var(--l-ink)]">
            {band === "little" ? <BigDots n={w === "a" ? p.a : p.b} /> : w === "a" ? p.la : p.lb}
          </Chunk>
        ))}
      </div>
      {flash && <span key={flash.k} className="l-pop-in text-5xl">{flash.ok ? "✅" : "❌"}</span>}
    </Frame>
  );
}
function BigDots({ n }: { n: number }) {
  return (
    <span className="grid grid-cols-3 gap-2">
      {Array.from({ length: n }, (_, k) => (
        <span key={k} className="h-9 w-9 rounded-full bg-[var(--l-blue)]" />
      ))}
    </span>
  );
}

// ── Number Line Hop ──────────────────────────────────────────────────────────────────────────
const lineMax = (band: Band) => (band === "little" ? 10 : band === "middle" ? 100 : 1000);
export function NumberHop({ band, onEnd }: GameProps) {
  const max = lineMax(band);
  const [score, setScore] = useState(0);
  const [target, setTarget] = useState(() => 1 + rand(max - 1));
  const [mark, setMark] = useState<{ at: number; pts: number; k: number } | null>(null);
  const left = useClock(ROUND, () => onEnd(score));
  const tap = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const at = Math.round(((e.clientX - r.left) / r.width) * max);
    const off = Math.abs(at - target) / max;
    const pts = off <= 0.03 ? 3 : off <= 0.08 ? 2 : off <= 0.15 ? 1 : 0;
    sfx(pts >= 2 ? "correct" : pts === 1 ? "pick" : "soft-fail");
    setMark({ at: target, pts, k: Date.now() });
    setScore((s) => s + pts);
    window.setTimeout(() => setTarget(1 + rand(max - 1)), 650);
  };
  return (
    <Frame left={left} score={score} top={<span className="rounded-full bg-[var(--l-gold)] px-5 py-1.5 font-display text-3xl font-extrabold text-[#5a3b00]">Where is {target}?</span>}>
      <div className="relative w-full max-w-[860px] px-6 pt-10">
        <div onClick={tap} className="relative h-24 cursor-pointer" role="button" aria-label={`Tap where ${target} goes on the line`}>
          <span className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded-full bg-white" />
          {Array.from({ length: 11 }, (_, k) => (
            <span key={k} className="absolute top-1/2 flex -translate-x-1/2 flex-col items-center" style={{ left: `${k * 10}%` }}>
              <span className={cn("w-1 -translate-y-1/2 rounded-full bg-white", k % 5 === 0 ? "h-10" : "h-6")} />
              {(k % 5 === 0 || band === "little") && <span className="mt-2 font-display text-xl font-extrabold text-white">{(max / 10) * k}</span>}
            </span>
          ))}
          {mark && (
            <span key={mark.k} className="l-pop-in absolute -top-10 flex -translate-x-1/2 flex-col items-center" style={{ left: `${(mark.at / max) * 100}%` }}>
              <span className="rounded-full bg-white px-2 font-display text-lg font-extrabold text-[var(--l-ink)]">{mark.pts ? `+${mark.pts}` : "miss"}</span>
              <span className="text-3xl">📍</span>
            </span>
          )}
        </div>
      </div>
      <p className="font-display text-lg font-bold text-white/90">Tap the line where the number belongs. Closer = more stars!</p>
    </Frame>
  );
}

// ── Coin Counter ─────────────────────────────────────────────────────────────────────────────
const COIN_VAL = { p: 1, n: 5, d: 10, q: 25 } as const;
const COIN_LOOK = { p: { e: "🟤", name: "1¢" }, n: { e: "⚪", name: "5¢" }, d: { e: "⚪", name: "10¢" }, q: { e: "⚪", name: "25¢" } } as const;
function makeCoins(band: Band): { coins: (keyof typeof COIN_VAL)[]; total: number; options: number[] } {
  const kinds: (keyof typeof COIN_VAL)[] = band === "little" ? ["p"] : band === "middle" ? ["p", "n", "d"] : ["p", "n", "d", "q"];
  const coins = Array.from({ length: band === "little" ? 2 + rand(6) : 3 + rand(4) }, () => pickOne(kinds)).sort((a, b) => COIN_VAL[b] - COIN_VAL[a]);
  const total = coins.reduce((s, c) => s + COIN_VAL[c], 0);
  const wrong = [...new Set([total + 1, total - 1, total + 5, total - 5, total + 10].filter((v) => v > 0 && v !== total))];
  return { coins, total, options: shuffled([total, ...shuffled(wrong).slice(0, 2)]) };
}
export function CoinCounter({ band, onEnd }: GameProps) {
  const [score, setScore] = useState(0);
  const [q, setQ] = useState(() => makeCoins(band));
  const { flash, hit } = useHit(() => setScore((s) => s + 1));
  const left = useClock(ROUND, () => onEnd(score));
  return (
    <Frame left={left} score={score} top={<span className="rounded-full bg-[var(--l-green)] px-5 py-1.5 font-display text-2xl font-extrabold text-white">How much money?</span>}>
      <div key={q.coins.join("")} className="l-pop-in flex max-w-[760px] flex-wrap justify-center gap-3 rounded-[28px] bg-white/95 p-5">
        {q.coins.map((c, i) => (
          <span key={i} className={cn("flex items-center justify-center rounded-full font-display font-extrabold shadow-[0_4px_0_rgba(0,0,0,0.2)]", c === "p" ? "bg-[#c2410c] text-white" : "bg-[#cbd5e1] text-[#334155]")} style={{ width: c === "q" ? 92 : c === "n" ? 80 : c === "p" ? 70 : 64, height: c === "q" ? 92 : c === "n" ? 80 : c === "p" ? 70 : 64, fontSize: 22 }}>
            {COIN_LOOK[c].name}
          </span>
        ))}
      </div>
      <div className="flex gap-4">
        {q.options.map((v) => (
          <Chunk key={v} tone="white" onClick={() => (hit(v === q.total), setQ(makeCoins(band)))} className="flex h-24 w-32 items-center justify-center font-display text-4xl font-extrabold text-[var(--l-ink)]">
            {v}¢
          </Chunk>
        ))}
      </div>
      {flash && <span key={flash.k} className="l-pop-in text-5xl">{flash.ok ? "✅" : "❌"}</span>}
    </Frame>
  );
}

// ── Word Rocket ──────────────────────────────────────────────────────────────────────────────
const PICS = Object.values(FAMILIES).flat();
const SIGHT = [...new Set(Object.values(DOLCH).flat())].filter((w) => w.length >= 2);
const MISSPELL = (w: string): string[] => {
  const out = new Set<string>();
  const v = "aeiou";
  for (let k = 0; k < 12 && out.size < 2; k++) {
    const i = rand(w.length);
    const ch = w[i];
    const sub = v.includes(ch) ? v[(v.indexOf(ch) + 1 + rand(4)) % 5] : ch === ch.toUpperCase() ? ch : w[(i + 1) % w.length];
    const t = rand(2) ? w.slice(0, i) + sub + w.slice(i + 1) : w.slice(0, i) + w.slice(i + 1, i + 2) + w[i] + w.slice(i + 2);
    if (t !== w && t.length >= 2) out.add(t);
  }
  return [...out];
};
type WordQ = { say: string; answer: string; options: { id: string; face: ReactNode }[] };
function makeWord(band: Band): WordQ {
  if (band === "little") {
    const [a, b, c] = shuffled(PICS).slice(0, 3);
    return { say: a.word, answer: a.word, options: shuffled([a, b, c]).map((p) => ({ id: p.word, face: <span className="text-7xl">{p.emoji}</span> })) };
  }
  if (band === "middle") {
    const [a, b, c] = shuffled(SIGHT).slice(0, 3);
    return { say: a, answer: a, options: shuffled([a, b, c]).map((w) => ({ id: w, face: <span className="font-reading text-5xl font-bold">{w}</span> })) };
  }
  const w = pickOne([...SIGHT.filter((x) => x.length >= 4), ...PICS.map((p) => p.word).filter((x) => x.length >= 4)]);
  const wrong = MISSPELL(w);
  return { say: w, answer: w, options: shuffled([w, ...wrong]).map((x) => ({ id: x, face: <span className="font-reading text-5xl font-bold">{x}</span> })) };
}
export function WordRocket({ band, onEnd }: GameProps) {
  const [score, setScore] = useState(0);
  const [q, setQ] = useState(() => makeWord(band));
  const { flash, hit } = useHit(() => setScore((s) => s + 1));
  const left = useClock(ROUND, () => onEnd(score));
  const next = () => {
    const n = makeWord(band);
    setQ(n);
    window.setTimeout(() => void say(n.say), 250);
  };
  return (
    <Frame left={left} score={score} top={<Chunk tone="blue" onClick={() => (sfx("tap"), void say(q.say))} className="flex h-14 items-center px-5 font-display text-xl font-extrabold">🔊 Hear it</Chunk>}>
      <span className="font-display text-2xl font-extrabold text-white">{band === "big" ? "Which one is spelled right?" : band === "middle" ? "Tap the word you hear!" : "Tap the picture you hear!"}</span>
      <div className="flex gap-5">
        {q.options.map((o) => (
          <Chunk key={`${q.say}-${o.id}`} tone="white" onClick={() => (hit(o.id === q.answer), next())} className="l-rise flex h-48 w-56 flex-col items-center justify-center gap-2 text-[var(--l-ink)]">
            <span className="text-3xl">🚀</span>
            {o.face}
          </Chunk>
        ))}
      </div>
      {flash && <span key={flash.k} className="l-pop-in text-5xl">{flash.ok ? "✅" : "❌"}</span>}
      <AutoSay text={q.say} />
    </Frame>
  );
}
/** Says the first word once when the game starts. */
function AutoSay({ text }: { text: string }) {
  useEffect(() => {
    const t = window.setTimeout(() => void say(text), 400);
    return () => window.clearTimeout(t);
    // Only the opening word; later words are spoken as they appear.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// ── Rhyme Time ───────────────────────────────────────────────────────────────────────────────
type RhymeQ = { target: (typeof PICS)[number]; cards: { word: string; emoji: string; yes: boolean }[] };
function makeRhyme(): RhymeQ {
  const set = pickOne(RHYME_SETS.filter((s) => s.length >= 3));
  const [target, ...rest] = shuffled(set);
  const yes = rest.slice(0, 2);
  const others = shuffled(RHYME_SETS.filter((s) => s !== set).flat()).slice(0, 4);
  return { target, cards: shuffled([...yes.map((p) => ({ ...p, yes: true })), ...others.map((p) => ({ ...p, yes: false }))]) };
}
export function RhymeTime({ onEnd }: GameProps) {
  const [score, setScore] = useState(0);
  const [q, setQ] = useState(makeRhyme);
  const [found, setFound] = useState<string[]>([]);
  const [miss, setMiss] = useState<string | null>(null);
  const left = useClock(ROUND, () => onEnd(score));
  const tap = (c: RhymeQ["cards"][number]) => {
    if (found.includes(c.word)) return;
    void say(c.word);
    if (c.yes) {
      sfx("correct");
      setScore((s) => s + 1);
      const f = [...found, c.word];
      setFound(f);
      if (f.length >= q.cards.filter((x) => x.yes).length)
        window.setTimeout(() => {
          const n = makeRhyme();
          setQ(n);
          setFound([]);
          window.setTimeout(() => void say(n.target.word), 200);
        }, 600);
    } else {
      sfx("soft-fail");
      setMiss(c.word);
    }
  };
  return (
    <Frame left={left} score={score} top={<Chunk tone="blue" onClick={() => void say(q.target.word)} className="flex h-14 items-center gap-2 px-5 font-display text-xl font-extrabold">🔊 {q.target.emoji} {q.target.word}</Chunk>}>
      <span className="font-display text-2xl font-extrabold text-white">Tap everything that rhymes with “{q.target.word}”!</span>
      <div className="grid grid-cols-3 gap-4">
        {q.cards.map((c) => (
          <Chunk key={`${q.target.word}-${c.word}`} tone={found.includes(c.word) ? "green" : "white"} onClick={() => tap(c)} className={cn("flex h-36 w-44 flex-col items-center justify-center gap-1", miss === c.word && "l-shake")}>
            <span className="text-6xl">{c.emoji}</span>
            <span className="font-reading text-2xl font-bold">{c.word}</span>
          </Chunk>
        ))}
      </div>
      <AutoSay text={q.target.word} />
    </Frame>
  );
}

// ── Opposites ────────────────────────────────────────────────────────────────────────────────
function makeOpp() {
  const [w, a] = shuffled(ANTONYMS)[0];
  const flip = rand(2) === 1;
  const word = flip ? a : w;
  const answer = flip ? w : a;
  const wrong = shuffled(ANTONYMS.flat().filter((x) => x !== word && x !== answer)).slice(0, 2);
  return { word, answer, options: shuffled([answer, ...wrong]) };
}
export function Opposites({ onEnd }: GameProps) {
  const [score, setScore] = useState(0);
  const [q, setQ] = useState(makeOpp);
  const { flash, hit } = useHit(() => setScore((s) => s + 1));
  const left = useClock(ROUND, () => onEnd(score));
  return (
    <Frame left={left} score={score} top={<span className="rounded-full bg-[var(--l-violet)] px-5 py-1.5 font-display text-2xl font-extrabold text-white">What&apos;s the opposite?</span>}>
      <span key={q.word} className="l-pop-in rounded-[28px] bg-white px-10 py-5 font-reading text-6xl font-bold text-[var(--l-ink)] shadow-[0_8px_0_var(--l-line)]">{q.word}</span>
      <div className="flex gap-4">
        {q.options.map((o) => (
          <Chunk key={`${q.word}-${o}`} tone="white" onClick={() => (hit(o === q.answer), setQ(makeOpp()))} className="flex h-24 min-w-[180px] items-center justify-center px-5 font-reading text-4xl font-bold text-[var(--l-ink)]">
            {o}
          </Chunk>
        ))}
      </div>
      {flash && <span key={flash.k} className="l-pop-in text-5xl">{flash.ok ? "✅" : "❌"}</span>}
    </Frame>
  );
}

// ── Binary Blitz ─────────────────────────────────────────────────────────────────────────────
export function BinaryBlitz({ band, onEnd }: GameProps) {
  const bits = band === "little" ? 3 : band === "middle" ? 4 : 5;
  const vals = Array.from({ length: bits }, (_, i) => 2 ** (bits - 1 - i));
  const max = 2 ** bits - 1;
  const [score, setScore] = useState(0);
  const [target, setTarget] = useState(() => 1 + rand(max));
  const [on, setOn] = useState<number[]>(() => vals.map(() => 0));
  const left = useClock(ROUND, () => onEnd(score));
  // Little sailors count lit bulbs; older kids add place values.
  const total = band === "little" ? on.reduce((s, b) => s + b, 0) : vals.reduce((s, v, i) => s + (on[i] ? v : 0), 0);
  const goal = band === "little" ? Math.min(bits, target) : target;
  const flip = (i: number) => {
    sfx("tick");
    const next = on.map((b, k) => (k === i ? 1 - b : b));
    setOn(next);
    const t = band === "little" ? next.reduce((s, b) => s + b, 0) : vals.reduce((s, v, k) => s + (next[k] ? v : 0), 0);
    if (t === goal) {
      sfx("correct");
      setScore((s) => s + 1);
      window.setTimeout(() => {
        setOn(vals.map(() => 0));
        setTarget(1 + rand(max));
      }, 300);
    }
  };
  return (
    <Frame left={left} score={score} top={<span className="rounded-full bg-[var(--l-gold)] px-5 py-1.5 font-display text-3xl font-extrabold text-[#5a3b00]">Make {goal}!</span>}>
      <div className="flex gap-5 rounded-[28px] bg-[#1e293b] px-6 py-6">
        {vals.map((v, i) => (
          <button key={v} type="button" onClick={() => flip(i)} className="flex flex-col items-center gap-2">
            <span className={cn("text-7xl transition-all", on[i] ? "drop-shadow-[0_0_24px_rgba(250,204,21,0.95)]" : "opacity-25 grayscale")}>💡</span>
            {band !== "little" && <span className="rounded-full bg-white/15 px-3 py-0.5 font-display text-xl font-extrabold text-white">{v}</span>}
          </button>
        ))}
      </div>
      <span className="rounded-full bg-white px-5 py-1.5 font-display text-2xl font-extrabold text-[var(--l-ink)]">= {total}</span>
    </Frame>
  );
}

// ── Bug Squash ───────────────────────────────────────────────────────────────────────────────
const ARROW: Record<string, string> = { up: "⬆️", down: "⬇️", left: "⬅️", right: "➡️" };
const OPP: Record<string, string> = { up: "down", down: "up", left: "right", right: "left" };
function makeBug(band: Band) {
  const len = band === "little" ? 3 : band === "middle" ? 4 : 5;
  const path: string[] = [];
  for (let k = 0; k < len; k++) path.push(pickOne(["up", "down", "left", "right"].filter((d) => d !== OPP[path[k - 1] ?? ""])));
  const bug = rand(len);
  const prog = path.map((d, k) => (k === bug ? pickOne(["up", "down", "left", "right"].filter((x) => x !== d)) : d));
  return { path, prog, bug };
}
export function BugSquash({ band, onEnd }: GameProps) {
  const [score, setScore] = useState(0);
  const [q, setQ] = useState(() => makeBug(band));
  const { flash, hit } = useHit(() => setScore((s) => s + 1));
  const left = useClock(ROUND, () => onEnd(score));
  return (
    <Frame left={left} score={score} top={<span className="rounded-full bg-[var(--l-coral)] px-5 py-1.5 font-display text-2xl font-extrabold text-white">🐞 Tap the bug!</span>}>
      <div className="flex flex-col items-center gap-2 rounded-[24px] bg-white/95 px-6 py-4">
        <span className="font-display text-lg font-extrabold text-[var(--l-ink-2)]">The path should go:</span>
        <div className="flex gap-2 text-5xl">{q.path.map((d, k) => <span key={k}>{ARROW[d]}</span>)}</div>
      </div>
      <span className="font-display text-xl font-extrabold text-white">The program says:</span>
      <div className="flex gap-3">
        {q.prog.map((d, k) => (
          <Chunk key={`${q.path.join("")}-${k}`} tone="blue" onClick={() => (hit(k === q.bug), setQ(makeBug(band)))} className="flex h-24 w-24 items-center justify-center text-5xl">
            {ARROW[d]}
          </Chunk>
        ))}
      </div>
      {flash && <span key={flash.k} className="l-pop-in text-5xl">{flash.ok ? "✅ Squashed!" : "❌"}</span>}
    </Frame>
  );
}

// ── Sink or Float ────────────────────────────────────────────────────────────────────────────
const FLOATERS: [string, string, boolean][] = [
  ["🪵", "log", true], ["🦆", "rubber duck", true], ["🍎", "apple", true], ["🏐", "beach ball", true], ["🍃", "leaf", true], ["🧽", "sponge", true], ["🪶", "feather", true], ["🍋", "lemon", true], ["⛵", "toy boat", true], ["🧊", "ice cube", true],
  ["🪨", "rock", false], ["🔑", "key", false], ["🪙", "coin", false], ["⚓", "anchor", false], ["🔩", "bolt", false], ["🥄", "spoon", false], ["💍", "ring", false], ["🧲", "magnet", false], ["🔨", "hammer", false], ["⚙️", "metal gear", false],
];
export function SinkFloat({ onEnd }: GameProps) {
  const [score, setScore] = useState(0);
  const [q, setQ] = useState(() => pickOne(FLOATERS));
  const [drop, setDrop] = useState<{ floats: boolean; k: number } | null>(null);
  const { flash, hit } = useHit(() => setScore((s) => s + 1));
  const left = useClock(ROUND, () => onEnd(score));
  const guess = (floats: boolean) => {
    if (drop) return;
    hit(floats === q[2]);
    setDrop({ floats: q[2], k: Date.now() });
    sfx("splash");
    window.setTimeout(() => {
      setDrop(null);
      setQ(pickOne(FLOATERS.filter((x) => x !== q)));
    }, 700);
  };
  return (
    <Frame left={left} score={score} top={<span className="rounded-full bg-[var(--l-blue)] px-5 py-1.5 font-display text-2xl font-extrabold text-white">Sink or float?</span>}>
      <div className="relative h-[280px] w-[420px] overflow-hidden rounded-[28px]" style={{ background: "linear-gradient(#f0f9ff 0 32%, #7dd3fc 32%, #0284c7)" }}>
        <span key={`${q[1]}${drop?.k ?? ""}`} className="absolute left-1/2 text-7xl" style={{ top: drop ? (drop.floats ? "20%" : "72%") : "4%", transform: "translateX(-50%)", transition: drop ? "top 600ms cubic-bezier(0.34,1.4,0.64,1)" : "none" }}>
          {q[0]}
        </span>
      </div>
      <span className="font-display text-3xl font-extrabold text-white">{q[1]}</span>
      <div className="flex gap-5">
        <Chunk tone="teal" onClick={() => guess(true)} className="flex h-20 w-48 items-center justify-center font-display text-2xl font-extrabold">⛵ Floats</Chunk>
        <Chunk tone="blue" onClick={() => guess(false)} className="flex h-20 w-48 items-center justify-center font-display text-2xl font-extrabold">⬇️ Sinks</Chunk>
      </div>
      {flash && <span key={flash.k} className="l-pop-in text-4xl">{flash.ok ? "✅" : "❌"}</span>}
    </Frame>
  );
}

// ── Robot Path ───────────────────────────────────────────────────────────────────────────────
// Three programs, one robot, one star: which program gets there? The wrong ones are near misses
// (one arrow changed, one missing, one extra), so the child has to trace each step. A right answer
// plays the program: the robot walks it.
type Cell = [number, number];
const STEP: Record<string, Cell> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const DIRS = ["up", "down", "left", "right"];
function walkTo(size: number, from: Cell, prog: string[]): Cell | null {
  let [x, y] = from;
  for (const d of prog) {
    x += STEP[d][0];
    y += STEP[d][1];
    if (x < 0 || y < 0 || x >= size || y >= size) return null;
  }
  return [x, y];
}
type PathQ = { size: number; start: Cell; goal: Cell; options: string[][]; answer: number };
function makePathQ(band: Band): PathQ {
  const size = band === "little" ? 3 : 4;
  const len = band === "little" ? 2 : band === "middle" ? 3 : 4;
  for (;;) {
    const start: Cell = [rand(size), rand(size)];
    const prog: string[] = [];
    let at: Cell = start;
    for (let k = 0; k < len; k++) {
      const ok = DIRS.filter((d) => d !== OPP[prog[k - 1] ?? ""] && walkTo(size, at, [d]));
      if (!ok.length) break;
      const d = pickOne(ok);
      prog.push(d);
      at = walkTo(size, at, [d])!;
    }
    if (prog.length < len || (at[0] === start[0] && at[1] === start[1])) continue;
    const goal = at;
    const key = (p: string[]) => p.join(",");
    const wrongs = new Map<string, string[]>();
    for (let t = 0; t < 40 && wrongs.size < 2; t++) {
      const k = rand(len);
      const kind = rand(3);
      const cand = kind === 0 ? prog.map((d, i) => (i === k ? pickOne(DIRS.filter((x) => x !== d)) : d)) : kind === 1 ? prog.filter((_, i) => i !== k) : [...prog.slice(0, k + 1), prog[k], ...prog.slice(k + 1)];
      const end = walkTo(size, start, cand);
      if (key(cand) !== key(prog) && !(end && end[0] === goal[0] && end[1] === goal[1])) wrongs.set(key(cand), cand);
    }
    if (wrongs.size < 2) continue;
    const options = shuffled([prog, ...wrongs.values()]);
    return { size, start, goal, options, answer: options.indexOf(prog) };
  }
}
export function RobotPath({ band, onEnd }: GameProps) {
  const [score, setScore] = useState(0);
  const [q, setQ] = useState(() => makePathQ(band));
  const [walking, setWalking] = useState<{ prog: string[]; step: number } | null>(null);
  const { flash, hit } = useHit(() => setScore((s) => s + 1));
  const left = useClock(ROUND, () => onEnd(score));
  const C = band === "little" ? 96 : 80;
  const pick = (i: number) => {
    if (walking) return;
    const ok = i === q.answer;
    hit(ok);
    if (!ok) {
      setQ(makePathQ(band));
      return;
    }
    // Play the program: one step at a time, then the next puzzle.
    const prog = q.options[i];
    prog.forEach((_, s) => window.setTimeout(() => (setWalking({ prog, step: s + 1 }), sfx("move")), 220 * (s + 1)));
    window.setTimeout(() => {
      setWalking(null);
      setQ(makePathQ(band));
    }, 220 * (prog.length + 1) + 250);
    setWalking({ prog, step: 0 });
  };
  const bot = walking ? (walkTo(q.size, q.start, walking.prog.slice(0, walking.step)) ?? q.start) : q.start;
  return (
    <Frame left={left} score={score} top={<span className="rounded-full bg-[var(--l-blue)] px-5 py-1.5 font-display text-2xl font-extrabold text-white">🤖 Which program reaches the ⭐?</span>}>
      <div className="relative rounded-[20px] bg-white/95 p-2 shadow-[0_6px_0_rgba(0,40,80,0.16)]" style={{ width: q.size * C + 16, height: q.size * C + 16 }}>
        {Array.from({ length: q.size * q.size }, (_, i) => (
          <span key={i} className="absolute rounded-xl bg-[#e0f2fe]" style={{ left: 8 + (i % q.size) * C + 3, top: 8 + Math.floor(i / q.size) * C + 3, width: C - 6, height: C - 6 }} />
        ))}
        <span className="absolute flex items-center justify-center" style={{ left: 8 + q.goal[0] * C, top: 8 + q.goal[1] * C, width: C, height: C, fontSize: C * 0.55 }}>
          ⭐
        </span>
        <span key={`${q.start.join()}${q.goal.join()}`} className="absolute flex items-center justify-center" style={{ left: 8 + bot[0] * C, top: 8 + bot[1] * C, width: C, height: C, fontSize: C * 0.6, transition: "left 200ms ease-out, top 200ms ease-out" }}>
          🤖
        </span>
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        {q.options.map((p, i) => (
          <Chunk key={`${q.start.join()}${q.goal.join()}-${p.join()}`} tone="white" onClick={() => pick(i)} className={cn("flex h-20 items-center justify-center gap-1 px-4 text-4xl", walking && i !== q.answer && "opacity-40")}>
            {p.map((d, k) => (
              <span key={k}>{ARROW[d]}</span>
            ))}
          </Chunk>
        ))}
      </div>
      {flash && <span key={flash.k} className="l-pop-in text-4xl">{flash.ok ? "✅" : "❌"}</span>}
    </Frame>
  );
}

// ── Loop Spotter ─────────────────────────────────────────────────────────────────────────────
// A long pattern, and three loop blocks: which one makes it? Seeing the repeating unit — and
// counting the repeats — is exactly how programmers squeeze long code into a loop.
const LOOP_ICONS = ["🔴", "🔵", "🟢", "🟡", "⭐", "❤️", "🐟", "🌙"];
type LoopOpt = { unit: string[]; times: number };
type LoopQ = { seq: string[]; options: LoopOpt[]; answer: number };
function makeLoopQ(band: Band): LoopQ {
  const unitLen = band === "big" ? 2 + rand(2) : 2;
  const times = band === "little" ? 2 + rand(2) : band === "middle" ? 2 + rand(3) : 3 + rand(2);
  const unit = shuffled(LOOP_ICONS).slice(0, unitLen);
  const right: LoopOpt = { unit, times };
  const key = (o: LoopOpt) => `${o.unit.join("")}x${o.times}`;
  const other = pickOne(LOOP_ICONS.filter((x) => !unit.includes(x)));
  const pool: LoopOpt[] = shuffled([
    { unit, times: times + 1 },
    { unit, times: times - 1 },
    { unit: [...unit].reverse(), times },
    { unit: unit.map((x, i) => (i === unitLen - 1 ? other : x)), times },
  ]).filter((o) => o.times >= 1 && key(o) !== key(right));
  const wrong = pool.filter((o, i) => pool.findIndex((p) => key(p) === key(o)) === i).slice(0, 2);
  const options = shuffled([right, ...wrong]);
  return { seq: Array.from({ length: times }, () => unit).flat(), options, answer: options.indexOf(right) };
}
export function LoopSpotter({ band, onEnd }: GameProps) {
  const [score, setScore] = useState(0);
  const [q, setQ] = useState(() => makeLoopQ(band));
  const { flash, hit } = useHit(() => setScore((s) => s + 1));
  const left = useClock(ROUND, () => onEnd(score));
  const id = q.seq.join("");
  return (
    <Frame left={left} score={score} top={<span className="rounded-full bg-[#ff9149] px-5 py-1.5 font-display text-2xl font-extrabold text-white">🔁 Which loop makes this?</span>}>
      <div key={id} className="l-pop-in flex max-w-[900px] flex-wrap justify-center gap-1.5 rounded-[24px] bg-white/95 px-5 py-4 text-5xl shadow-[0_6px_0_rgba(0,40,80,0.16)]">
        {q.seq.map((x, i) => (
          <span key={i}>{x}</span>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        {q.options.map((o, i) => (
          <Chunk key={`${id}-${i}`} tone="white" onClick={() => (hit(i === q.answer), setQ(makeLoopQ(band)))} className="flex flex-col items-start p-3">
            <span className="rounded-[16px] bg-[#ff9149] px-3 pb-2 pt-1 shadow-[0_4px_0_#e26f27]">
              <span className="font-display text-xl font-extrabold text-white">🔁 Repeat ×{o.times}</span>
              <span className="mt-1 flex gap-1 rounded-xl bg-white/90 px-2 py-1 text-4xl">
                {o.unit.map((x, k) => (
                  <span key={k}>{x}</span>
                ))}
              </span>
            </span>
          </Chunk>
        ))}
      </div>
      {flash && <span key={flash.k} className="l-pop-in text-4xl">{flash.ok ? "✅" : "❌"}</span>}
    </Frame>
  );
}

// ── Python Speed Run ─────────────────────────────────────────────────────────────────────────
// One line of real Python at a time: what does it print? Order of operations, // and %, strings
// that repeat and join ("3" + "4" is 34!), len, indexes from 0, powers, max, True/False. A miss
// shows the right output, so every round teaches.
const PY_WORDS = ["SHIP", "HARBOR", "ROBOT", "CODE", "WAVE", "ANCHOR", "PIRATE"];
type PyQ = { code: string; answer: string; options: string[] };
function pyCandidate(): [string, string, string[]] {
  const a = 2 + rand(8), b = 2 + rand(8), c = 2 + rand(4);
  switch (rand(12)) {
    case 0: return [`print(${a} + ${b} * ${c})`, String(a + b * c), [String((a + b) * c), String(a + b + c)]];
    case 1: {
      const d = 2 + rand(4), q = 2 + rand(6), r = 1 + rand(d - 1);
      return [`print(${d * q + r} // ${d})`, String(q), [String(r), String(q + 1)]];
    }
    case 2: {
      const d = 3 + rand(3), q = 2 + rand(6), r = 1 + rand(d - 1);
      return [`print(${d * q + r} % ${d})`, String(r), [String(q), String(d)]];
    }
    case 3: {
      const s = pickOne(["ab", "ho", "la", "zz"]), k = 2 + rand(3);
      return [`print("${s}" * ${k})`, s.repeat(k), [`${s}${k}`, s.repeat(k + 1)]];
    }
    case 4: {
      const w = pickOne(PY_WORDS);
      return [`print(len("${w}"))`, String(w.length), [String(w.length - 1), String(w.length + 1)]];
    }
    case 5: {
      const w = pickOne(PY_WORDS), i = rand(2);
      return [`print("${w}"[${i}])`, w[i], [w[i + 1], w[i + 2]]];
    }
    case 6: {
      const x = 1 + rand(9), y = 1 + rand(9);
      return [`print("${x}" + "${y}")`, `${x}${y}`, [String(x + y), `${x} + ${y}`]];
    }
    case 7: {
      const x = 1 + rand(9), y = 1 + rand(9);
      return [`print(${x} + ${y})`, String(x + y), [`${x}${y}`, String(x * y)]];
    }
    case 8: {
      const k = 3 + rand(3);
      return [`print(2 ** ${k})`, String(2 ** k), [String(2 * k), String(k * k)]];
    }
    case 9: {
      const xs = shuffled([a, b + 10, c + 20]);
      const fn = pickOne(["max", "min"]);
      const sorted = [...xs].sort((p, q) => p - q);
      return [`print(${fn}(${xs.join(", ")}))`, String(fn === "max" ? sorted[2] : sorted[0]), [String(sorted[1]), String(fn === "max" ? sorted[0] : sorted[2])]];
    }
    case 10: {
      const y = a === b ? b + 1 : b;
      return [`print(${a} > ${y})`, a > y ? "True" : "False", [a > y ? "False" : "True"]];
    }
    default: {
      const n = 3 + rand(3);
      const xs = Array.from({ length: n }, () => 1 + rand(9));
      return [`print(len([${xs.join(", ")}]))`, String(n), [String(n - 1), String(n + 1)]];
    }
  }
}
function makePyQ(prev?: string): PyQ {
  for (;;) {
    const [code, answer, wrong] = pyCandidate();
    const options = [answer, ...wrong];
    if (code !== prev && new Set(options).size === options.length) return { code, answer, options: shuffled(options) };
  }
}
export function PySpeed({ onEnd }: GameProps) {
  const [score, setScore] = useState(0);
  const [q, setQ] = useState(() => makePyQ());
  // The last miss, with its right answer (a new question every time, so it doubles as a key).
  const [miss, setMiss] = useState<string | null>(null);
  const { flash, hit } = useHit(() => setScore((s) => s + 1));
  const left = useClock(ROUND, () => onEnd(score));
  const answer = (o: string) => {
    const ok = o === q.answer;
    hit(ok);
    setMiss(ok ? null : `${q.code} → ${q.answer}`);
    setQ(makePyQ(q.code));
  };
  return (
    <Frame left={left} score={score} top={<span className="rounded-full bg-[#0f172a] px-5 py-1.5 font-display text-2xl font-extrabold text-[#86efac]">▶ What does it print?</span>}>
      <div key={q.code} className="l-pop-in whitespace-pre rounded-[24px] bg-[#0f172a] px-8 py-5 font-mono text-[40px] text-[#e2e8f0] shadow-[0_8px_0_rgba(0,0,0,0.3)]">
        {colorize(q.code)}
      </div>
      <div className="flex flex-wrap justify-center gap-4">
        {q.options.map((o) => (
          <Chunk key={`${q.code}-${o}`} tone="white" onClick={() => answer(o)} className="flex h-24 min-w-[170px] items-center justify-center px-5 font-mono text-4xl font-bold text-[var(--l-ink)]">
            {o}
          </Chunk>
        ))}
      </div>
      {flash && (flash.ok ? <span key={flash.k} className="l-pop-in text-5xl">✅</span> : miss && <span key={miss} className="l-pop-in rounded-2xl bg-black/70 px-5 py-2 font-mono text-2xl text-[#fca5a5]">❌ {miss}</span>)}
    </Frame>
  );
}

// ── Animal Groups ────────────────────────────────────────────────────────────────────────────
const ANIMALS: [string, string, string, string][] = [
  // emoji, name, little group (land/water/sky), class
  ["🐶", "dog", "land", "mammal"], ["🐘", "elephant", "land", "mammal"], ["🦁", "lion", "land", "mammal"], ["🐳", "whale", "water", "mammal"], ["🐬", "dolphin", "water", "mammal"], ["🦇", "bat", "sky", "mammal"],
  ["🦅", "eagle", "sky", "bird"], ["🦉", "owl", "sky", "bird"], ["🐧", "penguin", "water", "bird"], ["🦜", "parrot", "sky", "bird"], ["🐔", "chicken", "land", "bird"],
  ["🐟", "fish", "water", "fish"], ["🦈", "shark", "water", "fish"], ["🐠", "clownfish", "water", "fish"],
  ["🐍", "snake", "land", "reptile"], ["🐢", "turtle", "water", "reptile"], ["🦎", "lizard", "land", "reptile"], ["🐊", "crocodile", "water", "reptile"],
  ["🐸", "frog", "water", "amphibian"], ["🦋", "butterfly", "sky", "insect"], ["🐝", "bee", "sky", "insect"], ["🐞", "ladybug", "land", "insect"], ["🐜", "ant", "land", "insect"],
];
const LITTLE_GROUPS = [["land", "🌳 Land"], ["water", "🌊 Water"], ["sky", "☁️ Sky"]] as const;
const CLASS_GROUPS = [["mammal", "🐾 Mammal"], ["bird", "🪶 Bird"], ["fish", "🐟 Fish"], ["reptile", "🦎 Reptile"], ["amphibian", "🐸 Amphibian"], ["insect", "🐜 Insect"]] as const;
export function AnimalGroups({ band, onEnd }: GameProps) {
  const [score, setScore] = useState(0);
  const [q, setQ] = useState(() => pickOne(ANIMALS));
  const { flash, hit } = useHit(() => setScore((s) => s + 1));
  const left = useClock(ROUND, () => onEnd(score));
  const groups = band === "little" ? LITTLE_GROUPS : CLASS_GROUPS;
  const answer = band === "little" ? q[2] : q[3];
  return (
    <Frame left={left} score={score} top={<span className="rounded-full bg-[var(--l-green)] px-5 py-1.5 font-display text-2xl font-extrabold text-white">{band === "little" ? "Where does it live?" : "Which animal group?"}</span>}>
      <div key={q[1]} className="l-pop-in flex flex-col items-center gap-1">
        <span className="text-9xl">{q[0]}</span>
        <span className="font-display text-3xl font-extrabold text-white">{q[1]}</span>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {groups.map(([id, label]) => (
          <Chunk key={id} tone="white" onClick={() => (hit(id === answer), setQ(pickOne(ANIMALS.filter((a) => a !== q))))} className="flex h-20 min-w-[190px] items-center justify-center px-4 font-display text-2xl font-extrabold text-[var(--l-ink)]">
            {label}
          </Chunk>
        ))}
      </div>
      {flash && <span key={flash.k} className="l-pop-in text-4xl">{flash.ok ? "✅" : "❌"}</span>}
    </Frame>
  );
}
