"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, Check, RotateCcw, Star } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Part } from "@/lib/learn/audio";
import type { Meter, MHit, Score } from "@/lib/learn/mus/types";
import { RHYTHM, barBeats, barFull, cellBeats, cellsBeats, cellsDurs, near, onsetsOf, pulses } from "@/lib/learn/mus/theory";
import { activeDur, scoreSeconds } from "@/lib/learn/mus/score";
import { measureDone } from "@/lib/learn/mus/check";
import { playDrum } from "@/lib/learn/mus/synth";
import { SAY } from "@/lib/learn/script";
import { sfx } from "@/lib/learn/sfx";
import { Chunk, useDrag } from "../../kit";
import { PromptRow, spoken, useLater, type ActProps } from "../../acts/common";
import { usePlayer } from "../kit/player";
import { PlayButton, SoundOffNote } from "../kit/kit";
import { RhythmStrip, TimeSigBig } from "../kit/notation";

// Rhythm cards into measures — every bar holds exactly the beats the time signature says.
//   fill       fill every bar (some may start with cards in them);
//   fix        one bar has too many or too few beats — find it and repair it;
//   dictation  hear a rhythm, then write it with the cards;
//   create     your own rhythm — it must use the starred cards.
// Tap a bar to pick it, then tap cards to drop them in (or drag a card onto any bar); tap a card in
// a bar to take it out. Each bar's beat meter fills as cards go in: green when it's exactly full,
// red when it's too full. Play to hear what you built (bar by bar over a soft click, the notes
// lighting up as they sound). Check judges it — and says which bar is wrong and why.

const TRIES = 3;
const DRUM = "bongo" as const;
type Placed = { id: number; c: string };
type Playing = "none" | "mine" | "target" | "show";

const cellsOf = (b: Placed[]) => b.map((x) => x.c);

/** Bar by bar: each bar starts on its own downbeat (a short bar leaves a gap, a crowded one spills
 *  into the next — you can HEAR what's wrong), over a soft click on every beat. */
function barsScore(bars: string[][], meter: Meter, bpm: number): Score {
  const per = barBeats(meter);
  const hits: MHit[] = [];
  bars.forEach((cells, i) => {
    let t = i * per;
    for (const d of cellsDurs(cells)) {
      if (d > 0) hits.push({ t, k: DRUM, v: 0.85 });
      t += Math.abs(d);
    }
    let c = i * per;
    pulses(meter).forEach((p, j) => {
      hits.push({ t: c, k: "sticks", v: j === 0 ? 0.34 : 0.2 });
      c += p;
    });
  });
  return { bpm, meter, tracks: [{ kind: "drums", hits }] };
}
/** Do two bars sound the same (both full, hits at the same moments)? */
function sameSound(a: string[], b: string[], m: Meter): boolean {
  if (!barFull(a, m) || !barFull(b, m)) return false;
  const x = onsetsOf(cellsDurs(a)).onsets;
  const y = onsetsOf(cellsDurs(b)).onsets;
  return x.length === y.length && x.every((t, i) => near(t, y[i]));
}
/** Finish a bar with the cards: keep what fits, then fill the rest exactly (`prefer` cards first). */
function completeBar(have: string[], cards: string[], m: Meter, prefer: string[] = []): string[] {
  const unit = 12; // twelfths of a beat, so triplets fit
  const goal = Math.round(barBeats(m) * unit);
  const order = [...new Set([...prefer, ...cards])].filter((c) => c in RHYTHM);
  const size = (c: string) => Math.round(cellBeats(c) * unit);
  const fill = (left: number): string[] | null => {
    const dead = new Set<number>();
    const out: string[] = [];
    const go = (l: number): boolean => {
      if (l === 0) return true;
      if (dead.has(l) || out.length > 24) return false;
      for (const c of order) {
        const s = size(c);
        if (s <= 0 || s > l) continue;
        out.push(c);
        if (go(l - s)) return true;
        out.pop();
      }
      dead.add(l);
      return false;
    };
    return go(left) ? out : null;
  };
  const keep = [...have];
  while (keep.length && cellsBeats(keep) > barBeats(m) + 1e-6) keep.pop();
  const rest = fill(goal - Math.round(cellsBeats(keep) * unit));
  if (rest) return [...keep, ...rest];
  return fill(goal) ?? keep;
}
/** The first bar from `from` on (wrapping) that isn't full yet. */
function firstOpen(bars: Placed[][], m: Meter, from = 0): number {
  for (let k = 0; k < bars.length; k++) {
    const i = (from + k) % bars.length;
    if (!barFull(cellsOf(bars[i]), m)) return i;
  }
  return Math.min(from, bars.length - 1);
}
/** "2½" for 2.5 (beats count in halves; triplets round). */
const beatsText = (b: number) => {
  const w = Math.floor(b + 1e-6);
  const f = b - w;
  return near(f, 0) ? String(w) : near(f, 0.5) ? (w ? `${w}½` : "½") : b.toFixed(1);
};

export function MeasureAct({ act: a, fx, onDone }: ActProps<"measure">) {
  const meter = a.meter;
  const per = barBeats(meter);
  const unit = 4 / meter[1];
  const bpm = a.bpm ?? 84;
  const dict = a.mode === "dictation";
  const must = useMemo(() => a.must ?? [], [a.must]);
  const cards = useMemo(() => [...new Set(a.cards)].filter((c) => c in RHYTHM), [a.cards]);
  const style: "sticks" | "notes" = fx.voice === "keys" ? "notes" : "sticks";
  const big = fx.voice === "all";
  const voiced = fx.voice !== "keys";
  const player = usePlayer();
  const later = useLater();
  const { parts, auto } = spoken(fx, a.say, a.prompt);
  const fresh = (): Placed[][] => Array.from({ length: a.bars }, (_, i) => (a.given?.[i] ?? []).filter((c) => c in RHYTHM).map((c, j) => ({ id: i * 100 + j + 1, c })));
  const [bars, setBars] = useState<Placed[][]>(fresh);
  const [sel, setSel] = useState(() => firstOpen(fresh(), meter));
  const [what, setWhat] = useState<Playing>("none");
  const [heard, setHeard] = useState(!dict);
  const [misses, setMisses] = useState(0);
  const [phase, setPhase] = useState<"build" | "won" | "shown">("build");
  const [msg, setMsg] = useState<{ text: string; good?: boolean; k: number } | null>(null);
  const [bad, setBad] = useState<{ bar: number; k: number } | null>(null);
  const [glowCards, setGlowCards] = useState<string[]>([]);
  const [wipe, setWipe] = useState(false);
  const idRef = useRef(10000);
  const doneRef = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const building = phase === "build";
  const awake = heard && building;

  const finish = (m: number) => {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone(m);
  };
  const hearCell = (c: string) => {
    const spb = 60 / bpm;
    onsetsOf(RHYTHM[c].durs).onsets.forEach((t) => (t === 0 ? playDrum(DRUM, 0.9) : later(() => playDrum(DRUM, 0.8), t * spb * 1000)));
  };

  // ── Playing ──
  const play = (bs: string[][], kind: Playing, then?: () => void) => {
    setWhat(kind);
    player.play(barsScore(bs, meter, bpm), {
      onEnd: () => {
        setWhat("none");
        if (kind === "target") setHeard(true);
        then?.();
      },
    });
  };
  const stop = () => {
    if (what === "target") setHeard(true);
    player.stop();
    setWhat("none");
  };
  const toggleTarget = () => {
    sfx("tap");
    if (what === "target") return stop();
    play(a.target ?? [], "target");
  };
  const toggleMine = () => {
    sfx("tap");
    if (what === "mine") return stop();
    if (what === "target") setHeard(true);
    play(bars.map(cellsOf), "mine");
  };

  // Ask (the first time, say how), then play the rhythm to write down for the youngest.
  useEffect(() => {
    const how: Part[] = voiced && fx.firstTime ? [{ gap: 300 }, SAY.measureHow] : [];
    const words: Part[] = [...parts, ...how];
    fx.setPrompt(words);
    const t = window.setTimeout(() => {
      const go = () => {
        if (dict && voiced) play(a.target ?? [], "target");
      };
      if ((auto || how.length) && words.length) void fx.say(words).then((ok) => ok && go());
      else go();
    }, 380);
    const cap = window.setTimeout(() => setHeard(true), 20000);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(cap);
    };
    // Asked once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Building ──
  const edit = (next: Placed[][], focus: number) => {
    setBars(next);
    setBad(null);
    setGlowCards([]);
    setWipe(false);
    setMsg(null);
    if (what === "mine") stop();
    // A bar that just got full hands the turn to the next one that isn't.
    setSel(barFull(cellsOf(next[focus]), meter) ? firstOpen(next, meter, focus) : focus);
  };
  const add = (i: number, c: string) => {
    if (!awake || i < 0 || i >= bars.length) return;
    sfx("snap");
    hearCell(c);
    edit(bars.map((b, j) => (j === i ? [...b, { id: ++idRef.current, c }] : b)), i);
  };
  const remove = (i: number, id: number) => {
    if (!awake) return;
    sfx("pop");
    edit(bars.map((b, j) => (j === i ? b.filter((x) => x.id !== id) : b)), i);
  };
  const moveTo = (i: number, id: number, to: number | null) => {
    if (!awake || to === i) return;
    const chip = bars[i].find((x) => x.id === id);
    if (!chip) return;
    if (to === null) return remove(i, id);
    sfx("snap");
    edit(bars.map((b, j) => (j === i ? b.filter((x) => x.id !== id) : j === to ? [...b, chip] : b)), to);
  };
  const barOf = (drop: string | null) => {
    const m = /^m:(\d+)$/.exec(drop ?? "");
    return m ? Number(m[1]) : null;
  };
  const startOver = () => {
    if (!wipe) {
      sfx("tap");
      setWipe(true);
      later(() => setWipe(false), 2600);
      return;
    }
    sfx("pop");
    const next = fresh();
    edit(next, 0);
    setSel(firstOpen(next, meter));
  };

  // ── Checking ──
  const win = () => {
    setPhase("won");
    setBad(null);
    setGlowCards([]);
    fx.right(cardRef.current);
    setMsg({ text: dict ? "You wrote what you heard!" : a.mode === "create" ? "What a cool rhythm!" : "Every bar is just right!", good: true, k: 0 });
    const bs = bars.map(cellsOf);
    const m = misses;
    later(() => {
      if (!fx.reduced) fx.burst(cardRef.current, "star", 14);
      play(bs, "show", () => later(() => finish(m), 500));
    }, 1100);
    later(() => finish(m), 1100 + scoreSeconds(barsScore(bs, meter, bpm)) * 1000 + 3000);
  };
  const reveal = (m: number) => {
    let ans: string[][];
    if (dict) ans = (a.target ?? []).map((b) => [...b]);
    else {
      ans = bars.map((b) => (barFull(cellsOf(b), meter) ? cellsOf(b) : completeBar(cellsOf(b), cards, meter, must)));
      const missing = must.filter((c) => !ans.flat().includes(c));
      if (a.mode === "create" && missing.length && ans.length) ans[0] = completeBar([], cards, meter, missing);
    }
    setBars(ans.map((b) => b.map((c) => ({ id: ++idRef.current, c }))));
    setPhase("shown");
    setBad(null);
    setGlowCards([]);
    setMsg({ text: "Here's one way — listen!", k: 99 });
    play(ans, "show", () => later(() => finish(m), 600));
    later(() => finish(m), scoreSeconds(barsScore(ans, meter, bpm)) * 1000 + 3500);
  };
  const check = () => {
    if (!building) return;
    stop();
    const bs = bars.map(cellsOf);
    let at = -1;
    let line = "";
    const tooFew = (b: string[]) => cellsBeats(b) < per - 1e-6;
    if (dict) {
      const target = a.target ?? [];
      at = bs.findIndex((b, i) => !sameSound(b, target[i] ?? [], meter));
      if (at >= 0) line = barFull(bs[at], meter) ? `Listen again! Bar ${at + 1} sounds different.` : tooFew(bs[at]) ? SAY.measureTooFew : SAY.measureTooMany;
    } else {
      at = bs.findIndex((b) => !barFull(b, meter));
      if (at >= 0) line = tooFew(bs[at]) ? SAY.measureTooFew : SAY.measureTooMany;
    }
    let missing: string[] = [];
    if (at < 0 && a.mode === "create") {
      missing = must.filter((c) => !bs.flat().includes(c));
      if (missing.length) line = missing.length === 1 ? "Use the card with the star too!" : "Use the cards with stars too!";
    }
    if (at < 0 && !missing.length && measureDone(bs, meter)) return win();
    const m = misses + 1;
    setMisses(m);
    fx.miss();
    if (at >= 0) {
      setBad({ bar: at, k: m });
      setSel(at);
    }
    setGlowCards(missing);
    setMsg({ text: line, k: m });
    void fx.say(line);
    if (m >= TRIES) later(() => reveal(m), 2600);
  };

  // ── Following the music ──
  const beatNow = what !== "none" ? player.beat : null;
  const notesLit = what === "mine" || what === "show";
  // Four bars sit in one row for readers (two rows of two for the youngest) with smaller notation.
  const cols = a.bars <= 3 ? a.bars : big ? 2 : 4;
  const stripH = a.bars >= 4 ? 72 : big ? 100 : fx.voice === "core" ? 88 : 76;

  return (
    <div className="flex w-full max-w-[1120px] flex-col items-center gap-3">
      <PromptRow parts={parts}>{a.prompt}</PromptRow>
      <SoundOffNote />
      <div ref={cardRef} className="relative flex w-full items-stretch gap-4 rounded-[30px] bg-white/95 p-4 shadow-[0_8px_0_rgba(0,40,80,0.14)]">
        <div className="flex shrink-0 flex-col items-center justify-center gap-3">
          <TimeSigBig meter={meter} size={big ? 132 : 108} />
          {dict && (
            <div className="flex flex-col items-center gap-1">
              <PlayButton playing={what === "target"} onClick={toggleTarget} size={big ? 92 : 80} pulse={!heard} className={cn(!building && "pointer-events-none opacity-50")} />
              <span className="font-display text-base font-extrabold text-[var(--l-ink-2)]">Hear it</span>
            </div>
          )}
        </div>
        <div className="relative grid min-w-0 flex-1 gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {!heard && building && (
            <div className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center rounded-[24px] bg-white/60">
              <span className="l-pop-in rounded-full bg-[var(--l-violet)] px-5 py-2 font-display text-xl font-extrabold text-white shadow-[0_4px_0_var(--l-violet-edge)]">{what === "target" ? "Listen…" : "Tap play to hear it first!"}</span>
            </div>
          )}
          {bars.map((b, i) => {
            const local = beatNow !== null && beatNow >= 0 ? beatNow - i * per : null;
            const cursor = local !== null && local >= 0 && local < per ? Math.floor(local / unit + 1e-6) : -1;
            const lit = notesLit && local !== null ? activeDur(cellsDurs(cellsOf(b)), local) : -1;
            return (
              <BarBox
                key={i}
                i={i}
                cells={b}
                meter={meter}
                selected={awake && sel === i}
                cursor={cursor}
                lit={lit}
                shake={bad?.bar === i ? bad.k : 0}
                showCount={fx.voice !== "all"}
                style={style}
                stripH={stripH}
                disabled={!awake}
                onSelect={() => {
                  if (!awake || sel === i) return;
                  sfx("tap");
                  setSel(i);
                }}
                onTapChip={(id) => remove(i, id)}
                onDropChip={(id, drop) => moveTo(i, id, barOf(drop))}
              />
            );
          })}
        </div>
      </div>

      <div className="flex min-h-11 items-center justify-center">
        {msg && (
          <span key={msg.k} className={cn("l-pop-in rounded-full px-5 py-1.5 text-center font-display text-xl font-extrabold text-white shadow-[0_4px_0_rgba(0,40,80,0.2)]", msg.good ? "bg-[var(--l-green)]" : "bg-[var(--l-orange)]")}>
            {msg.text}
          </span>
        )}
      </div>

      <div className="flex w-full flex-wrap items-center justify-center gap-4">
        <div className={cn("flex flex-wrap items-center justify-center gap-3 rounded-[28px] bg-white/30 px-4 py-3", !awake && "opacity-60")}>
          {cards.map((c) => (
            <RhythmCard
              key={c}
              c={c}
              style={style}
              stripH={stripH}
              must={must.includes(c)}
              glow={glowCards.includes(c)}
              disabled={!awake}
              onTap={() => add(sel, c)}
              onDrop={(drop) => {
                const i = barOf(drop);
                if (i !== null) {
                  setSel(i);
                  add(i, c);
                }
              }}
            />
          ))}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <PlayButton playing={what === "mine" || what === "show"} onClick={toggleMine} size={big ? 92 : 80} tone={dict ? "blue" : "pink"} className={cn(!building && "pointer-events-none")} />
            <span className="font-display text-base font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.3)]">{dict ? "Mine" : "Play"}</span>
          </div>
          {building ? (
            <>
              <Chunk tone="green" disabled={!awake} onClick={check} className={cn("flex items-center gap-2 px-8 font-display text-2xl font-extrabold disabled:opacity-50", big ? "h-[80px]" : "h-[72px]")}>
                <Check className="h-8 w-8" strokeWidth={3.5} /> Check
              </Chunk>
              <Chunk tone={wipe ? "coral" : "ghost"} disabled={!awake} onClick={startOver} aria-label="Start over" className="flex h-[60px] items-center gap-2 px-4 font-display text-lg font-extrabold disabled:opacity-40">
                <RotateCcw className="h-6 w-6" strokeWidth={2.8} /> {wipe ? "Tap again" : null}
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

// ── A bar ────────────────────────────────────────────────────────────────────────────────────
function BarBox({
  i,
  cells,
  meter,
  selected,
  cursor,
  lit,
  shake,
  showCount,
  style,
  stripH,
  disabled,
  onSelect,
  onTapChip,
  onDropChip,
}: {
  i: number;
  cells: Placed[];
  meter: Meter;
  selected: boolean;
  /** The beat being heard in this bar (−1 = none). */
  cursor: number;
  /** The note being heard (index over the bar's notes and rests; −1 = none). */
  lit: number;
  shake: number;
  showCount: boolean;
  style: "sticks" | "notes";
  stripH: number;
  disabled: boolean;
  onSelect: () => void;
  onTapChip: (id: number) => void;
  onDropChip: (id: number, drop: string | null) => void;
}) {
  const per = barBeats(meter);
  const used = cellsBeats(cellsOf(cells));
  const state = near(used, per) ? "full" : used > per ? "over" : "open";
  const u = 4 / meter[1];
  // Where each card's notes start in the bar's run of notes and rests (to light the one sounding).
  const starts: number[] = [];
  for (let j = 0, at = 0; j < cells.length; j++) {
    starts.push(at);
    at += RHYTHM[cells[j].c]?.durs.length ?? 1;
  }
  return (
    <div
      data-drop={`m:${i}`}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={`Bar ${i + 1}: ${beatsText(used / u)} of ${meter[0]} beats`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
      className={cn(
        "relative flex min-w-0 flex-col gap-2 rounded-[24px] border-[4px] bg-white px-2.5 pb-2.5 pt-6 transition-[box-shadow,border-color,background-color] duration-150",
        state === "full" ? "border-[var(--l-green)] bg-[#f3fdf6]" : state === "over" ? "border-[var(--l-coral)] bg-[#fff5f3]" : selected ? "border-[#ff6fb5]" : "border-dashed border-[#c9d6e3]",
        selected && "shadow-[0_0_0_6px_rgba(255,111,181,0.3)]",
        cursor >= 0 && "shadow-[0_0_0_6px_rgba(255,111,181,0.45)]",
      )}
    >
      <span className="absolute left-3 top-1 font-display text-base font-extrabold text-[var(--l-ink-2)]/70">{i + 1}</span>
      {state === "full" && <span className="l-pop-in absolute right-2 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--l-green)] text-white"><Check className="h-5 w-5" strokeWidth={3.5} /></span>}
      <span key={shake} className={cn("flex flex-1 flex-wrap content-center items-center justify-center gap-1.5", shake > 0 && "l-shake")} style={{ minHeight: stripH + 8 }}>
        {cells.length ? (
          cells.map((x, j) => {
            const n = RHYTHM[x.c]?.durs.length ?? 1;
            const from = starts[j];
            const act = lit >= from && lit < from + n ? lit - from : -1;
            return <PlacedChip key={x.id} c={x.c} style={style} stripH={stripH} active={act} disabled={disabled} onTap={() => onTapChip(x.id)} onDrop={(drop) => onDropChip(x.id, drop)} />;
          })
        ) : (
          <span className={cn("font-display text-lg font-bold", selected ? "text-[#d9408f]" : "text-[var(--l-ink-2)]/50")}>{selected ? "Put cards here" : "Empty"}</span>
        )}
      </span>
      <BeatMeter meter={meter} used={used} cursor={cursor} />
      {showCount && (
        <span className={cn("text-center font-display text-base font-extrabold leading-none", state === "full" ? "text-[var(--l-green-edge)]" : state === "over" ? "text-[var(--l-coral-edge)]" : "text-[var(--l-ink-2)]")}>
          {state === "over" ? `Too full! ${beatsText(used / u)} of ${meter[0]}` : `${beatsText(used / u)} of ${meter[0]} ${meter[1] === 8 ? "eighths" : "beats"}`}
        </span>
      )}
    </div>
  );
}

/** The beats of a bar as segments that fill up: pink while filling, green when full, red when
 *  there's too much (the extra spills out past the end). */
function BeatMeter({ meter, used, cursor }: { meter: Meter; used: number; cursor: number }) {
  const n = meter[0];
  const u = 4 / meter[1];
  const per = n * u;
  const state = near(used, per) ? "full" : used > per ? "over" : "open";
  const fill = state === "full" ? "#3ccf6e" : state === "over" ? "#ff7363" : "#ff6fb5";
  const over = Math.max(0, used - per) / u;
  return (
    <div className="flex h-5 items-center gap-1" aria-hidden>
      {Array.from({ length: n }, (_, k) => {
        const f = Math.max(0, Math.min(1, (used - k * u) / u));
        return (
          <span key={k} className={cn("relative h-full min-w-0 flex-1 overflow-hidden rounded-full bg-[#e6eef6] transition-transform duration-100", k === cursor && "scale-y-125 ring-[3px] ring-[#ff6fb5]")}>
            <span className="absolute inset-y-0 left-0 rounded-full transition-[width,background-color] duration-200" style={{ width: `${f * 100}%`, background: fill }} />
          </span>
        );
      })}
      {over > 0 && <span className="l-pop-in h-full shrink-0 rounded-full bg-[#ff7363] shadow-[0_0_10px_rgba(255,115,99,0.8)]" style={{ width: Math.min(4, over) * 16 }} />}
    </div>
  );
}

/** How long a card lasts, as little beat pills (one per beat, half a pill for half a beat). */
function BeatPips({ beats }: { beats: number }) {
  const whole = Math.floor(beats + 1e-6);
  const part = beats - whole;
  return (
    <span className="flex h-3 items-center gap-1" aria-hidden>
      {Array.from({ length: whole }, (_, k) => (
        <span key={k} className="block h-full w-6 rounded-full bg-[#ff6fb5]" />
      ))}
      {part > 1e-6 && <span className="block h-full rounded-full bg-[#ff6fb5]" style={{ width: Math.max(5, part * 24) }} />}
    </span>
  );
}

/** A card in the tray (an endless supply: tap it to drop one in the picked bar, or drag it). */
function RhythmCard({ c, style, stripH, must, glow, disabled, onTap, onDrop }: { c: string; style: "sticks" | "notes"; stripH: number; must: boolean; glow: boolean; disabled: boolean; onTap: () => void; onDrop: (drop: string | null) => void }) {
  const { handlers, dragging } = useDrag({ onTap, onLift: () => sfx("lift"), onDrop: (t) => onDrop(t?.dataset.drop ?? null), disabled });
  return (
    <div
      {...handlers}
      data-dragging={dragging}
      role="button"
      aria-label={RHYTHM[c]?.name ?? c}
      className={cn("l-drag l-chunk relative flex min-w-[84px] flex-col items-center gap-1 px-4 pb-3 pt-1", glow && "l-hint")}
      style={{ "--f": "#ffffff", "--e": "#f5b8d6" } as CSSProperties}
    >
      <RhythmStrip cells={[c]} style={style} syllables height={stripH} />
      <BeatPips beats={cellBeats(c)} />
      {must && (
        <span className="absolute -right-2.5 -top-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--l-gold)] shadow-[0_3px_0_var(--l-gold-edge)]" aria-label="Use this card">
          <Star className="h-5 w-5 text-white" fill="currentColor" strokeWidth={2} />
        </span>
      )}
    </div>
  );
}

/** A card sitting in a bar: tap it to take it out, drag it to another bar (or away). */
function PlacedChip({ c, style, stripH, active, disabled, onTap, onDrop }: { c: string; style: "sticks" | "notes"; stripH: number; active: number; disabled: boolean; onTap: () => void; onDrop: (drop: string | null) => void }) {
  const { handlers, dragging } = useDrag({ onTap, onLift: () => sfx("lift"), onDrop: (t) => onDrop(t?.dataset.drop ?? null), disabled });
  return (
    <div
      {...handlers}
      data-dragging={dragging}
      role="button"
      aria-label={`${RHYTHM[c]?.name ?? c} — tap to take it out`}
      className={cn("l-drag l-boing relative rounded-[16px] px-1 transition-[background-color,box-shadow] duration-100", active >= 0 ? "bg-[#ffe0ef] shadow-[0_0_0_3px_#ff6fb5]" : "bg-[#fff0f7] shadow-[0_3px_0_#f5b8d6]")}
    >
      <RhythmStrip cells={[c]} style={style} syllables active={active} height={stripH} />
    </div>
  );
}
