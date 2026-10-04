"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Band } from "@/lib/learn/types";
import { SAY } from "@/lib/learn/script";
import { say } from "@/lib/learn/audio";
import { note, sfx, buzz } from "@/lib/learn/sfx";
import { Shape } from "./acts/Visual";
import { Chunk } from "./kit";
import { AnimalGroups, BiggerWins, BinaryBlitz, BugSquash, CoinCounter, LoopSpotter, MakeTen, NumberHop, Opposites, PySpeed, RhymeTime, RobotPath, SinkFloat, WordRocket } from "./ArcadeGames";

// The Brain Gym: short, fun workouts for the skills behind all learning — holding things in mind
// (working memory), stopping yourself (inhibitory control), switching rules (flexible thinking),
// seeing amounts at a glance, and fact fluency. Each round is under a minute, scored against
// your own best (beating your past self, not other kids). A few rounds a day pay shells.
// Honest framing: these are practice for focus and memory, not magic IQ boosters — the deep
// learning lives in the lessons, the spacing and the review.
//
// The Game Arcade around it adds learning games by subject (numbers, words, code, science) —
// quick fluency rounds with the same rules: under a minute, beat your own best.

export type GymGame = "lights" | "fish" | "switch" | "count" | "grid" | "ten" | "bigger" | "hop" | "coins" | "rocket" | "rhyme" | "opposites" | "bits" | "bugsquash" | "robot" | "loopspot" | "pyspeed" | "sinkfloat" | "animals";
export type ArcadeCat = "brain" | "numbers" | "words" | "code" | "science";
export const ARCADE_CATS: { id: ArcadeCat; label: string; emoji: string }[] = [
  { id: "brain", label: "Brain", emoji: "🧠" },
  { id: "numbers", label: "Numbers", emoji: "🔢" },
  { id: "words", label: "Words", emoji: "🔤" },
  { id: "code", label: "Code", emoji: "💻" },
  { id: "science", label: "Science", emoji: "🔬" },
];
export const GYM: { id: GymGame; cat: ArcadeCat; name: string; emoji: string; skill: string; how: string; color: string; intro: string; bands?: Band[] }[] = [
  { id: "lights", cat: "brain", name: "Lighthouse Lights", emoji: "💡", skill: "Memory", how: "Watch the lights flash, then tap them in the same order.", color: "#ffc83d", intro: SAY.gymLights },
  { id: "fish", cat: "brain", name: "Fish or Shark?", emoji: "🐟", skill: "Focus", how: "Tap every fish — but DON'T tap the sharks!", color: "#1cb0f6", intro: SAY.gymFish },
  { id: "switch", cat: "brain", name: "Switch!", emoji: "🔀", skill: "Flexible thinking", how: "Sort each card by color or by shape. Watch the rule — it switches!", color: "#8b6cff", intro: SAY.gymSwitch },
  { id: "count", cat: "brain", name: "Quick Count", emoji: "⚡", skill: "Number sense", how: "How many? Look fast — then tap the answer.", color: "#3ccf6e", intro: SAY.gymCount },
  { id: "grid", cat: "brain", name: "Star Grid", emoji: "✨", skill: "Picture memory", how: "Remember where the stars light up, then tap those spots.", color: "#ff9149", intro: SAY.gymGrid },
  { id: "ten", cat: "numbers", name: "Make Ten", emoji: "🔟", skill: "Number bonds", how: "Tap two bubbles that add up to the goal number.", color: "#ff6aa2", intro: SAY.gameTen },
  { id: "bigger", cat: "numbers", name: "Bigger Wins", emoji: "⚖️", skill: "Comparing", how: "Two numbers — tap the bigger one, fast!", color: "#8b6cff", intro: SAY.gameBigger },
  { id: "hop", cat: "numbers", name: "Number Line Hop", emoji: "📏", skill: "Estimation", how: "Tap where the number belongs on the line. Closer = more stars.", color: "#22c59b", intro: SAY.gameHop },
  { id: "coins", cat: "numbers", name: "Coin Counter", emoji: "🪙", skill: "Money", how: "Count the coins and tap the total.", color: "#ffc83d", intro: SAY.gameCoins },
  { id: "rocket", cat: "words", name: "Word Rocket", emoji: "🚀", skill: "Reading", how: "Listen to the word, then tap the right rocket.", color: "#1cb0f6", intro: SAY.gameRocket },
  { id: "rhyme", cat: "words", name: "Rhyme Time", emoji: "🎵", skill: "Rhyming", how: "Tap every picture that rhymes with the word.", color: "#ff9149", intro: SAY.gameRhyme, bands: ["little", "middle"] },
  { id: "opposites", cat: "words", name: "Opposites", emoji: "🔄", skill: "Vocabulary", how: "Tap the word that means the opposite.", color: "#8b6cff", intro: SAY.gameOpposites, bands: ["middle", "big"] },
  { id: "bits", cat: "code", name: "Binary Blitz", emoji: "💡", skill: "Binary", how: "Turn on lights to make the number. How many can you make?", color: "#ffc83d", intro: SAY.gameBits },
  { id: "bugsquash", cat: "code", name: "Bug Squash", emoji: "🐞", skill: "Debugging", how: "One arrow in the program is wrong. Find it and squash it!", color: "#ff5d5d", intro: SAY.gameBugs },
  { id: "robot", cat: "code", name: "Robot Path", emoji: "🤖", skill: "Sequencing", how: "Three programs — which one gets the robot to the star? Trace each step!", color: "#1cb0f6", intro: SAY.gameRobot },
  { id: "loopspot", cat: "code", name: "Loop Spotter", emoji: "🔁", skill: "Loops", how: "Find the part that repeats. Which loop makes the pattern?", color: "#ff9149", intro: SAY.gameLoops },
  { id: "pyspeed", cat: "code", name: "Python Speed Run", emoji: "🐍", skill: "Reading code", how: "One line of real Python — tap what it prints. Go fast!", color: "#22c59b", intro: SAY.gamePython, bands: ["big"] },
  { id: "sinkfloat", cat: "science", name: "Sink or Float?", emoji: "⛵", skill: "Science", how: "Will it sink or float? Decide fast!", color: "#1cb0f6", intro: SAY.gameFloat },
  { id: "animals", cat: "science", name: "Animal Groups", emoji: "🐾", skill: "Life science", how: "Put each animal in its group.", color: "#3ccf6e", intro: SAY.gameAnimals },
];
export const GYM_PAID_PER_DAY = 3;
export const gymShells = (score: number) => Math.min(15, 5 + Math.floor(score / 2));

// Randomness lives out here (module helpers), never in render.
const rand = (n: number) => Math.floor(Math.random() * n);
const coin = (p: number) => Math.random() < p;
const between = (a: number, b: number) => a + Math.random() * (b - a);
const randomCard = (): Card => ({ shape: coin(0.5) ? "heart" : "star", color: coin(0.5) ? "red" : "blue" });
type Question = { n: number; show: "dots" | "fact"; label: string; answer: number };
function makeQuestion(band: Band): Question {
  if (band === "little") {
    const n = 1 + rand(6);
    return { n, show: "dots", label: "", answer: n };
  }
  if (band === "middle") {
    const a = 1 + rand(10);
    const b = 1 + rand(10);
    return coin(0.6) ? { n: 0, show: "fact", label: `${a} + ${b}`, answer: a + b } : { n: 0, show: "fact", label: `${a + b} − ${b}`, answer: a };
  }
  const a = 2 + rand(9);
  const b = 2 + rand(9);
  return coin(0.65) ? { n: 0, show: "fact", label: `${a} × ${b}`, answer: a * b } : { n: 0, show: "fact", label: `${a * b} ÷ ${b}`, answer: a };
}

export function BrainGym({ band, bests, paidToday, reduced, onBack, onResult }: { band: Band; bests: Record<string, number>; paidToday: number; reduced: boolean; onBack: () => void; onResult: (game: GymGame, score: number, shells: number) => void }) {
  const [game, setGame] = useState<GymGame | null>(null);
  const [cat, setCat] = useState<ArcadeCat>("brain");
  const [phase, setPhase] = useState<"intro" | "play" | "done">("intro");
  const [score, setScore] = useState(0);
  const [paid, setPaid] = useState(0);
  const g = GYM.find((x) => x.id === game);

  useEffect(() => {
    void say(SAY.arcade);
  }, []);

  const finish = (s: number) => {
    const shells = s > 0 && paidToday < GYM_PAID_PER_DAY ? gymShells(s) : 0;
    setScore(s);
    setPaid(shells);
    setPhase("done");
    const record = s > (bests[game!] ?? 0);
    sfx(record ? "levelup" : "goal");
    if (record) window.setTimeout(() => void say(SAY.newRecord), 400);
    onResult(game!, s, shells);
  };

  if (!g)
    return (
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 px-4 pb-10 pt-2 sm:px-6">
        <div className="flex items-center gap-3">
          <Chunk tone="white" onClick={() => (sfx("tap"), onBack())} aria-label="Back" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full" style={{ borderRadius: 999 }}>
            <ArrowLeft className="h-7 w-7 text-[var(--l-ink)]" strokeWidth={3} />
          </Chunk>
          <div>
            <p className="font-display text-3xl font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.25)]">🕹️ Game Arcade</p>
            <p className="font-display text-base font-bold text-white/90">Beat your own best! {paidToday < GYM_PAID_PER_DAY ? `${GYM_PAID_PER_DAY - paidToday} shell round${GYM_PAID_PER_DAY - paidToday === 1 ? "" : "s"} left today` : "Shell rounds done today — play for records!"}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {ARCADE_CATS.map((c) => (
            <Chunk key={c.id} tone={cat === c.id ? "gold" : "ghost"} onClick={() => (sfx("tap"), setCat(c.id))} className="flex h-14 items-center gap-2 px-5 font-display text-xl font-extrabold">
              <span className="text-2xl">{c.emoji}</span> {c.label}
            </Chunk>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GYM.filter((x) => x.cat === cat && (!x.bands || x.bands.includes(band))).map((x, i) => (
            <Chunk
              key={x.id}
              tone="white"
              onClick={() => {
                sfx("pick");
                setGame(x.id);
                setPhase("intro");
                void say(x.intro);
              }}
              className="l-rise flex flex-col items-start gap-2 p-5 text-left"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="flex w-full items-center justify-between">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl text-[40px]" style={{ background: `${x.color}33` }}>
                  {x.emoji}
                </span>
                <span className="rounded-full px-3 py-1 font-display text-sm font-extrabold text-white" style={{ background: x.color }}>
                  {x.skill}
                </span>
              </span>
              <span className="font-display text-2xl font-extrabold text-[var(--l-ink)]">{x.name}</span>
              <span className="font-display text-base font-bold leading-snug text-[var(--l-ink-2)]">{x.how}</span>
              <span className="font-display text-lg font-extrabold text-[var(--l-violet)]">🏅 Best: {bests[x.id] ?? "—"}</span>
            </Chunk>
          ))}
        </div>
      </div>
    );

  return (
    <div className="fixed inset-0 z-[45] flex flex-col" style={{ background: "var(--l-bg)" }}>
      <div className="flex items-center gap-3 px-5 pt-4 sm:px-8">
        <Chunk tone="ghost" onClick={() => (sfx("tap"), setGame(null))} aria-label="Leave the game" className="flex h-14 w-14 items-center justify-center rounded-full" style={{ borderRadius: 999 }}>
          <ArrowLeft className="h-7 w-7" strokeWidth={3} />
        </Chunk>
        <p className="font-display text-3xl font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.25)]">
          {g.emoji} {g.name}
        </p>
        <span className="ml-auto rounded-full bg-white/90 px-4 py-1.5 font-display text-lg font-extrabold text-[var(--l-ink)]">🏅 Best {bests[g.id] ?? 0}</span>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-5">
        {phase === "intro" && (
          <div className="l-pop-in flex max-w-lg flex-col items-center gap-4 rounded-[34px] bg-white p-8 text-center shadow-[0_10px_0_var(--l-line)]">
            <span className="text-[96px] leading-none">{g.emoji}</span>
            <p className="font-display text-2xl font-bold text-[var(--l-ink)]">{g.how}</p>
            <Chunk tone="green" onClick={() => (sfx("pick"), void say(SAY.ready), setPhase("play"))} className={cn("flex h-20 w-64 items-center justify-center font-display text-3xl font-extrabold", !reduced && "l-pulse")}>
              Go!
            </Chunk>
          </div>
        )}
        {phase === "play" && g.id === "lights" && <Lights band={band} onEnd={finish} />}
        {phase === "play" && g.id === "fish" && <FishShark band={band} reduced={reduced} onEnd={finish} />}
        {phase === "play" && g.id === "switch" && <Switch band={band} onEnd={finish} />}
        {phase === "play" && g.id === "count" && <QuickCount band={band} onEnd={finish} />}
        {phase === "play" && g.id === "grid" && <StarGrid band={band} onEnd={finish} />}
        {phase === "play" && g.id === "ten" && <MakeTen band={band} onEnd={finish} />}
        {phase === "play" && g.id === "bigger" && <BiggerWins band={band} onEnd={finish} />}
        {phase === "play" && g.id === "hop" && <NumberHop band={band} onEnd={finish} />}
        {phase === "play" && g.id === "coins" && <CoinCounter band={band} onEnd={finish} />}
        {phase === "play" && g.id === "rocket" && <WordRocket band={band} onEnd={finish} />}
        {phase === "play" && g.id === "rhyme" && <RhymeTime band={band} onEnd={finish} />}
        {phase === "play" && g.id === "opposites" && <Opposites band={band} onEnd={finish} />}
        {phase === "play" && g.id === "bits" && <BinaryBlitz band={band} onEnd={finish} />}
        {phase === "play" && g.id === "bugsquash" && <BugSquash band={band} onEnd={finish} />}
        {phase === "play" && g.id === "robot" && <RobotPath band={band} onEnd={finish} />}
        {phase === "play" && g.id === "loopspot" && <LoopSpotter band={band} onEnd={finish} />}
        {phase === "play" && g.id === "pyspeed" && <PySpeed band={band} onEnd={finish} />}
        {phase === "play" && g.id === "sinkfloat" && <SinkFloat band={band} onEnd={finish} />}
        {phase === "play" && g.id === "animals" && <AnimalGroups band={band} onEnd={finish} />}
        {phase === "done" && (
          <div className="l-pop-in flex max-w-lg flex-col items-center gap-4 rounded-[34px] bg-white p-8 text-center shadow-[0_10px_0_var(--l-line)]">
            <p className="font-display text-xl font-extrabold uppercase tracking-wide text-[var(--l-ink-2)]">{SAY.timesUp.replace("!", "")}</p>
            <p className="font-display text-[80px] font-extrabold leading-none text-[var(--l-ink)]">{score}</p>
            {score > (bests[g.id] ?? 0) ? <p className="l-pop-in rounded-full bg-[var(--l-gold)] px-5 py-2 font-display text-2xl font-extrabold text-[#5a3b00]">🏆 New record!</p> : <p className="font-display text-lg font-bold text-[var(--l-ink-2)]">Your best is {bests[g.id]}. Try again to beat it!</p>}
            {paid > 0 && <p className="font-display text-2xl font-extrabold text-[var(--l-ink)]">🐚 +{paid} shells</p>}
            <div className="flex gap-3">
              <Chunk tone="green" onClick={() => (sfx("pick"), setPhase("play"))} className="flex h-16 items-center px-8 font-display text-2xl font-extrabold">
                Play again
              </Chunk>
              <Chunk tone="white" onClick={() => (sfx("tap"), setGame(null))} className="flex h-16 items-center px-6 font-display text-xl font-bold text-[var(--l-ink)]">
                Other games
              </Chunk>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** A countdown bar for timed games. */
export function useClock(seconds: number, onEnd: () => void) {
  const [left, setLeft] = useState(seconds);
  const end = useRef(onEnd);
  useEffect(() => {
    end.current = onEnd;
  });
  useEffect(() => {
    const t0 = performance.now();
    const id = window.setInterval(() => {
      const l = Math.max(0, seconds - (performance.now() - t0) / 1000);
      setLeft(l);
      if (l <= 0) {
        window.clearInterval(id);
        end.current();
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [seconds]);
  return left;
}
export function ClockBar({ left, total }: { left: number; total: number }) {
  return (
    <div className="h-4 w-full max-w-[720px] overflow-hidden rounded-full bg-white/25">
      <div className={cn("h-full rounded-full transition-[width] duration-100", left < 8 ? "bg-[var(--l-coral)]" : "bg-[var(--l-gold)]")} style={{ width: `${(left / total) * 100}%` }} />
    </div>
  );
}

// ── Lighthouse Lights: copy a growing sequence ─────────────────────────────────────────────
const LIGHTS = [
  { c: "#ff5d5d", n: "C" },
  { c: "#3fa9ff", n: "E" },
  { c: "#3ccf6e", n: "G" },
  { c: "#ffc83d", n: "A" },
];
function Lights({ band, onEnd }: { band: Band; onEnd: (score: number) => void }) {
  const [seq, setSeq] = useState<number[]>(() => Array.from({ length: band === "little" ? 2 : 3 }, () => rand(4)));
  const [lit, setLit] = useState<number | null>(null);
  const [showing, setShowing] = useState(true);
  const [pos, setPos] = useState(0);
  const [best, setBest] = useState(0);
  const timers = useRef<number[]>([]);
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);
  useEffect(() => {
    // Play the sequence (`showing` is already on: it starts on, and a finished round turns it on).
    const step = Math.max(380, 650 - seq.length * 25);
    seq.forEach((k, i) => {
      timers.current.push(window.setTimeout(() => (setLit(k), note(LIGHTS[k].n, 0.4)), 700 + i * step));
      timers.current.push(window.setTimeout(() => setLit(null), 700 + i * step + step * 0.7));
    });
    timers.current.push(window.setTimeout(() => (setShowing(false), setPos(0)), 700 + seq.length * step));
  }, [seq]);
  const tap = (k: number) => {
    if (showing) return;
    note(LIGHTS[k].n, 0.35);
    setLit(k);
    timers.current.push(window.setTimeout(() => setLit(null), 220));
    if (seq[pos] !== k) {
      buzz([0, 40, 60, 40]);
      sfx("soft-fail");
      timers.current.push(window.setTimeout(() => onEnd(best), 700));
      return;
    }
    if (pos + 1 === seq.length) {
      const b = seq.length;
      setBest(b);
      sfx("star");
      timers.current.push(window.setTimeout(() => setSeq((s) => [...s, rand(4)]), 600));
      setShowing(true);
    } else setPos(pos + 1);
  };
  return (
    <div className="flex flex-col items-center gap-6">
      <p className="font-display text-3xl font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.25)]">{showing ? "👀 Watch…" : "👆 Your turn!"}</p>
      <div className="grid grid-cols-2 gap-5">
        {LIGHTS.map((l, k) => (
          <button key={k} type="button" onClick={() => tap(k)} className="h-[170px] w-[170px] rounded-[40px] transition-all duration-150" style={{ background: l.c, opacity: lit === k ? 1 : 0.45, transform: lit === k ? "scale(1.06)" : "none", boxShadow: lit === k ? `0 0 40px 10px ${l.c}, 0 8px 0 rgba(0,0,0,0.2)` : "0 8px 0 rgba(0,0,0,0.2)" }} aria-label={`Light ${k + 1}`} />
        ))}
      </div>
      <p className="font-display text-2xl font-extrabold text-white">Score: {best}</p>
    </div>
  );
}

// ── Fish or Shark: tap fish, hold back on sharks ───────────────────────────────────────────
type Pop = { id: number; x: number; y: number; shark: boolean; e: string };
function FishShark({ band, reduced, onEnd }: { band: Band; reduced: boolean; onEnd: (score: number) => void }) {
  const total = 40;
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [pops, setPops] = useState<Pop[]>([]);
  const [flash, setFlash] = useState<{ id: number; ok: boolean } | null>(null);
  const left = useClock(total, () => onEnd(Math.max(0, scoreRef.current)));
  const nextId = useRef(1);
  useEffect(() => {
    let alive = true;
    const spawn = () => {
      if (!alive) return;
      const elapsed = total - left;
      const shark = coin(band === "little" ? 0.2 : 0.3);
      const id = nextId.current++;
      const p: Pop = { id, x: between(8, 92), y: between(14, 80), shark, e: shark ? "🦈" : ["🐟", "🐠", "🐡"][rand(3)] };
      setPops((ps) => [...ps.slice(-5), p]);
      const life = Math.max(band === "little" ? 1100 : 800, 1500 - elapsed * 15);
      window.setTimeout(() => setPops((ps) => ps.filter((q) => q.id !== id)), life);
      window.setTimeout(spawn, Math.max(band === "little" ? 650 : 450, 950 - elapsed * 12));
    };
    const t = window.setTimeout(spawn, 500);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
    // Spawning loop runs for the round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const tap = (p: Pop) => {
    setPops((ps) => ps.filter((q) => q.id !== p.id));
    if (p.shark) {
      scoreRef.current -= 1;
      buzz([0, 50, 40, 50]);
      sfx("bump");
    } else {
      scoreRef.current += 1;
      sfx("pop");
    }
    setScore(scoreRef.current);
    setFlash({ id: p.id, ok: !p.shark });
  };
  return (
    <div className="flex h-full w-full max-w-[1000px] flex-col items-center gap-3">
      <ClockBar left={left} total={total} />
      <p className="font-display text-2xl font-extrabold text-white">Score: {score}</p>
      <div className="reef-tank relative w-full flex-1 overflow-hidden rounded-[34px]">
        {pops.map((p) => (
          <button key={p.id} type="button" onClick={() => tap(p)} className={cn("absolute -translate-x-1/2 -translate-y-1/2 text-[84px] leading-none", !reduced && "l-pop-in")} style={{ left: `${p.x}%`, top: `${p.y}%` }} aria-label={p.shark ? "shark" : "fish"}>
            {p.e}
          </button>
        ))}
        {flash && (
          <span key={flash.id} className="l-float-num pointer-events-none absolute left-1/2 top-6 font-display text-4xl font-extrabold" style={{ color: flash.ok ? "#fff" : "#ffb3a8" }}>
            {flash.ok ? "+1" : "−1 🦈"}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Switch!: sort by color, then by shape (the rule switches) ──────────────────────────────
type Card = { shape: "heart" | "star"; color: "red" | "blue" };
const COLORS = { red: "#ff5d5d", blue: "#3fa9ff" };
function Switch({ band, onEnd }: { band: Band; onEnd: (score: number) => void }) {
  const total = 45;
  const [rule, setRule] = useState<"color" | "shape">("color");
  const [card, setCard] = useState<Card>(randomCard);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [count, setCount] = useState(0);
  const [shake, setShake] = useState(0);
  const left = useClock(total, () => onEnd(scoreRef.current));
  const every = band === "little" ? 6 : band === "middle" ? 5 : 4;
  // Left bin = red / heart, right bin = blue / star.
  const pick = (side: "left" | "right") => {
    const right = rule === "color" ? (card.color === "red" ? "left" : "right") : card.shape === "heart" ? "left" : "right";
    if (side === right) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      sfx("snap");
    } else {
      setShake((s) => s + 1);
      sfx("wrong");
      buzz(30);
    }
    const n = count + 1;
    setCount(n);
    if (n % every === 0 || (band === "big" && coin(0.12))) {
      setRule((r) => (r === "color" ? "shape" : "color"));
      sfx("whoosh");
    }
    setCard(randomCard());
  };
  useEffect(() => {
    void say(rule === "color" ? SAY.gymByColor : SAY.gymByShape);
  }, [rule]);
  return (
    <div className="flex w-full max-w-[1000px] flex-col items-center gap-5">
      <ClockBar left={left} total={total} />
      <p key={rule} className="l-pop-in rounded-full bg-white px-7 py-3 font-display text-3xl font-extrabold text-[var(--l-ink)] shadow-[0_5px_0_var(--l-line)]">{rule === "color" ? "🎨 Sort by COLOR" : "🔷 Sort by SHAPE"}</p>
      <div key={`${count}:${shake}`} className={cn("rounded-[30px] bg-white p-5 shadow-[0_8px_0_var(--l-line)]", shake ? "l-shake" : "l-pop-in")}>
        <Shape shape={card.shape} color={COLORS[card.color]} px={150} />
      </div>
      <div className="grid w-full grid-cols-2 gap-5">
        {(["left", "right"] as const).map((side) => (
          <Chunk key={side} tone="white" onClick={() => pick(side)} className="flex h-[150px] items-center justify-center gap-4">
            <Shape shape={side === "left" ? "heart" : "star"} color={side === "left" ? COLORS.red : COLORS.blue} px={90} />
            <span className="font-display text-xl font-extrabold text-[var(--l-ink-2)]">{side === "left" ? (rule === "color" ? "Red" : "Hearts") : rule === "color" ? "Blue" : "Stars"}</span>
          </Chunk>
        ))}
      </div>
      <p className="font-display text-2xl font-extrabold text-white">Score: {score}</p>
    </div>
  );
}

// ── Quick Count: dots at a glance (little) · fact sprint (bigger) ──────────────────────────
function QuickCount({ band, onEnd }: { band: Band; onEnd: (score: number) => void }) {
  const total = band === "little" ? 40 : 50;
  const [q, setQ] = useState(() => makeQuestion(band));
  const [visible, setVisible] = useState(true);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [shake, setShake] = useState(0);
  const left = useClock(total, () => onEnd(scoreRef.current));
  const [opts, setOpts] = useState<number[]>(() => optionsFor(q.answer));
  const dots = Array.from({ length: q.show === "dots" ? q.n : 0 }, (_, i) => ({ x: 18 + ((i * 47) % 64), y: 18 + ((i * 29) % 64) }));
  useEffect(() => {
    if (q.show !== "dots") return;
    const t = window.setTimeout(() => setVisible(false), 1200);
    return () => window.clearTimeout(t);
  }, [q]);
  const answer = (v: number) => {
    if (v === q.answer) {
      scoreRef.current += 1;
      setScore(scoreRef.current);
      sfx("correct", Math.min(8, scoreRef.current));
      const nq = makeQuestion(band);
      setQ(nq);
      setVisible(true);
      setOpts(optionsFor(nq.answer));
    } else {
      setShake((s) => s + 1);
      sfx("wrong");
    }
  };
  return (
    <div className="flex w-full max-w-[900px] flex-col items-center gap-5">
      <ClockBar left={left} total={total} />
      <div key={`${score}:${shake}`} className={cn("flex h-[230px] w-[360px] items-center justify-center rounded-[34px] bg-white shadow-[0_8px_0_var(--l-line)]", shake ? "l-shake" : "l-pop-in")}>
        {q.show === "dots" ? (
          <div className="relative h-[190px] w-[300px]">
            {visible ? dots.map((d, i) => <span key={i} className="absolute h-12 w-12 rounded-full bg-[var(--l-coral)] shadow-[inset_0_-5px_0_rgba(0,0,0,0.15)]" style={{ left: `${d.x}%`, top: `${d.y}%` }} />) : <span className="flex h-full items-center justify-center font-display text-6xl font-extrabold text-[var(--l-ink)]/25">?</span>}
          </div>
        ) : (
          <span className="font-display text-[72px] font-extrabold tabular-nums text-[var(--l-ink)]">{q.label}</span>
        )}
      </div>
      <div className="grid w-full grid-cols-3 gap-4">
        {opts.map((v) => (
          <Chunk key={v} tone="white" onClick={() => answer(v)} className="flex h-[110px] items-center justify-center font-display text-[52px] font-extrabold tabular-nums text-[var(--l-ink)]">
            {v}
          </Chunk>
        ))}
      </div>
      <p className="font-display text-2xl font-extrabold text-white">Score: {score}</p>
    </div>
  );
}
function optionsFor(a: number): number[] {
  const set = new Set([a]);
  while (set.size < 3) {
    const d = (1 + rand(3)) * (coin(0.5) ? -1 : 1);
    if (a + d >= 0) set.add(a + d);
  }
  return [...set].sort((x, y) => x - y);
}

// ── Star Grid: remember where the stars were ───────────────────────────────────────────────
/** n distinct cells of a size×size grid. */
function pickCells(size: number, n: number): number[] {
  const s: number[] = [];
  while (s.length < Math.min(n, size * size - 1)) {
    const k = rand(size * size);
    if (!s.includes(k)) s.push(k);
  }
  return s;
}

function StarGrid({ band, onEnd }: { band: Band; onEnd: (score: number) => void }) {
  const size = band === "little" ? 3 : 4;
  const [round, setRound] = useState(() => ({ k: 0, stars: pickCells(size, band === "little" ? 2 : 3) }));
  const [showing, setShowing] = useState(true);
  const [picked, setPicked] = useState<number[]>([]);
  const [lives, setLives] = useState(2);
  const [best, setBest] = useState(0);
  const stars = round.stars;
  // Each round: show the stars, then hide them.
  useEffect(() => {
    const t = window.setTimeout(() => setShowing(false), 1200 + round.stars.length * 250);
    return () => window.clearTimeout(t);
  }, [round]);
  const next = (count: number) => {
    setPicked([]);
    setShowing(true);
    setRound((r) => ({ k: r.k + 1, stars: pickCells(size, count) }));
  };
  const tap = (i: number) => {
    if (showing || picked.includes(i)) return;
    if (!stars.includes(i)) {
      sfx("wrong");
      buzz(40);
      if (lives <= 1) return onEnd(best);
      setLives((l) => l - 1);
      next(stars.length);
      return;
    }
    sfx("pop");
    const now = [...picked, i];
    setPicked(now);
    if (now.length === stars.length) {
      sfx("star");
      setBest(stars.length);
      window.setTimeout(() => next(stars.length + 1), 500);
    }
  };
  return (
    <div className="flex flex-col items-center gap-5">
      <p className="font-display text-3xl font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.25)]">
        {showing ? "👀 Remember!" : "👆 Where were they?"} {"❤️".repeat(lives)}
      </p>
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
        {Array.from({ length: size * size }, (_, i) => {
          const isStar = stars.includes(i);
          const on = (showing && isStar) || picked.includes(i);
          return (
            <button key={i} type="button" onClick={() => tap(i)} className={cn("flex h-[104px] w-[104px] items-center justify-center rounded-[24px] text-[56px] transition-colors", on ? "bg-[var(--l-gold)]" : "bg-white/85")} aria-label={`Spot ${i + 1}`}>
              {on ? "⭐" : ""}
            </button>
          );
        })}
      </div>
      <p className="font-display text-2xl font-extrabold text-white">Score: {best}</p>
    </div>
  );
}
