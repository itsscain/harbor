"use client";

import { useMemo, useRef, useState, type CSSProperties } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { SAY, numberWord, plusLine, putInNet } from "@/lib/learn/script";
import { say, type Part } from "@/lib/learn/audio";
import { sfx } from "@/lib/learn/sfx";
import { Chunk, useDrag, useShuffled } from "../kit";
import { ChoiceTile, PromptRow, tileState, useChoice, useLater, usePrompt, type ActProps } from "./common";

// Math you can touch: count things by tapping them, fill a net by dragging, push two groups
// together to add. Counting walks up a musical scale, so every count is a tiny tune.

/** A pleasant, deterministic scatter of n spots inside a box (percent coordinates). */
function scatter(n: number, seed: number): { x: number; y: number }[] {
  const cols = n <= 3 ? n : n <= 6 ? 3 : n <= 8 ? 4 : 5;
  const rows = Math.ceil(n / cols);
  let h = seed * 2654435761;
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    return ((h >>> 0) % 1000) / 1000;
  };
  return Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / cols);
    const inRow = r === rows - 1 ? n - r * cols : cols;
    const c = i % cols;
    return { x: ((c + 0.5) / inRow) * 100 + (rand() - 0.5) * (40 / inRow), y: ((r + 0.5) / rows) * 100 + (rand() - 0.5) * (30 / rows) };
  });
}

function NumberTiles({ options, answer, c }: { options: number[]; answer: number; c: ReturnType<typeof useChoice> }) {
  const shuffled = useShuffled(options, `nums:${options.join(",")}:${answer}`);
  return (
    <div className="flex flex-wrap justify-center gap-5">
      {shuffled.map((n) => (
        <ChoiceTile key={n} label={String(n)} state={tileState(String(n), c, String(answer))} shakeKey={c.shake?.id === String(n) ? c.shake.n : undefined} onPick={(el) => c.choose(String(n), el)} className="h-[clamp(110px,16vh,140px)] w-[clamp(110px,16vh,140px)]">
          <span className="font-display font-extrabold leading-none" style={{ fontSize: "clamp(64px, 10vh, 88px)" }}>
            {n}
          </span>
        </ChoiceTile>
      ))}
    </div>
  );
}

// ── Count: tap each thing, then pick how many ────────────────────────────────────────────
export function CountAct({ act, fx, onDone }: ActProps<"count">) {
  const spots = useMemo(() => scatter(act.n, act.n * 7 + act.emoji.length), [act.n, act.emoji]);
  const [counted, setCounted] = useState<number[]>([]);
  const later = useLater();
  const parts: Part[] = fx.firstTime ? [SAY.tapToCount] : [SAY.howMany];
  usePrompt(fx, parts);
  const c = useChoice(String(act.n), fx, onDone, { extra: [numberWord(act.n)], reprompt: [SAY.howMany] });

  const tap = (i: number, el: HTMLElement) => {
    if (counted.includes(i) || c.found) return;
    const k = counted.length + 1;
    setCounted([...counted, i]);
    sfx("count", k);
    fx.burst(el, "star", 4);
    void say(numberWord(k));
    if (k === act.n) {
      fx.setPrompt([SAY.howMany]);
      later(() => void say(SAY.howMany), 900);
    }
  };

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <PromptRow parts={parts}>{counted.length < act.n ? "Tap each one to count" : "How many are there?"}</PromptRow>
      <div className="relative h-[clamp(240px,38vh,360px)] w-[min(92vw,820px)] rounded-[32px] bg-white/25 shadow-[inset_0_0_0_4px_rgba(255,255,255,0.45)]">
        {spots.map((s, i) => {
          const k = counted.indexOf(i);
          return (
            <button
              key={i}
              type="button"
              onClick={(e) => tap(i, e.currentTarget)}
              className={cn("absolute -translate-x-1/2 -translate-y-1/2 select-none transition-transform", k >= 0 ? "scale-110" : "active:scale-95")}
              style={{ left: `${s.x}%`, top: `${s.y}%`, fontSize: "clamp(58px, 9vh, 84px)", lineHeight: 1 }}
              aria-label={k >= 0 ? `counted ${k + 1}` : "count me"}
            >
              <span className={cn("block", k >= 0 && "l-boing")}>{act.emoji}</span>
              {k >= 0 && (
                <span className="l-pop-in absolute -right-3 -top-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--l-gold)] font-display text-xl font-extrabold text-[#5a3b00] shadow-[0_3px_0_var(--l-gold-edge)]">
                  {k + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <NumberTiles options={act.options} answer={act.n} c={c} />
    </div>
  );
}

// ── Make: put things in the net, then check — exactly the number ─────────────────────────
// The net never fills itself up or stops at the number: more can go in than you need, and the
// child decides when it's right and taps the check. Tapping everything gives "Too many!", so the
// only way through is to count.
export function MakeAct({ act, fx, onDone }: ActProps<"make">) {
  const total = act.n + 3;
  const [inNet, setInNet] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [misses, setMisses] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const netRef = useRef<HTMLDivElement>(null);
  const later = useLater();
  const parts: Part[] = [putInNet(act.n), { gap: 250 }, SAY.netCheck];
  usePrompt(fx, parts);

  const add = (id: number) => {
    if (done || inNet.includes(id)) return;
    const next = [...inNet, id];
    setInNet(next);
    setNote(null);
    sfx("count", next.length);
    void say(numberWord(next.length));
  };
  const remove = (id: number) => {
    if (done) return;
    sfx("lift");
    const next = inNet.filter((x) => x !== id);
    setInNet(next);
    setNote(null);
    if (next.length) void say(numberWord(next.length));
  };
  const check = (el: HTMLElement) => {
    if (done || !inNet.length) return;
    if (inNet.length === act.n) {
      setDone(true);
      fx.right(netRef.current ?? el, [numberWord(act.n)]);
      later(() => onDone(misses), 2000);
      return;
    }
    setMisses((m) => m + 1);
    const over = inNet.length - act.n;
    setNote(over > 0 ? `Too many! Take ${over} out.` : `Not enough — put ${-over} more in.`);
    fx.wrong(el, [over > 0 ? SAY.netTooMany : SAY.netNotEnough]);
  };

  return (
    <div className="flex w-full flex-col items-center gap-5">
      <PromptRow parts={parts}>
        Put <span className="font-display">{act.n}</span> in the net, then tap ✓
      </PromptRow>
      <div
        ref={netRef}
        data-drop="net"
        className={cn(
          "relative flex min-h-[clamp(190px,30vh,260px)] w-[min(90vw,720px)] flex-wrap content-center items-center justify-center gap-3 rounded-[36px] border-[6px] border-dashed p-5 transition-colors",
          done ? "border-[var(--l-green)] bg-[var(--l-green)]/20" : "border-white/85 bg-white/15",
        )}
        style={{ backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.12) 0 2px, transparent 2px 22px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.12) 0 2px, transparent 2px 22px)" }}
      >
        {inNet.length === 0 && <span className="pointer-events-none text-6xl opacity-80">🥅</span>}
        {inNet.map((id) => (
          <button key={id} type="button" onClick={() => remove(id)} className="l-pop-in select-none" style={{ fontSize: "clamp(52px, 8vh, 72px)", lineHeight: 1 }} aria-label="take it out">
            {act.emoji}
          </button>
        ))}
        <span className="absolute -top-6 right-6 flex h-14 min-w-14 items-center justify-center rounded-full bg-white px-3 font-display text-3xl font-extrabold text-[var(--l-ink)] shadow-[0_4px_0_var(--l-line)]">{inNet.length}</span>
      </div>
      <div className="flex min-h-[clamp(90px,13vh,110px)] flex-wrap justify-center gap-4">
        {Array.from({ length: total }, (_, id) =>
          inNet.includes(id) ? (
            <span key={id} className="h-[clamp(84px,12vh,100px)] w-[clamp(84px,12vh,100px)] rounded-[22px] bg-black/10" aria-hidden />
          ) : (
            <Thing key={id} emoji={act.emoji} onPut={(target) => target?.dataset.drop === "net" && add(id)} onTap={() => add(id)} disabled={done} />
          ),
        )}
      </div>
      <div className="flex items-center gap-4">
        {note && !done && (
          <span key={`${note}${misses}`} className="l-pop-in rounded-full bg-white px-5 py-2.5 font-display text-2xl font-extrabold text-[var(--l-coral-edge)] shadow-[0_4px_0_var(--l-line)]">
            {note}
          </span>
        )}
        <Chunk tone="green" disabled={done || !inNet.length} onClick={(e) => check(e.currentTarget)} aria-label="Check" className={cn("flex h-20 items-center gap-2 px-9 font-display text-3xl font-extrabold", (done || !inNet.length) && "opacity-50")}>
          <Check className="h-9 w-9" strokeWidth={3.5} /> Check
        </Chunk>
      </div>
    </div>
  );
}

function Thing({ emoji, onPut, onTap, disabled }: { emoji: string; onPut: (t: HTMLElement | null) => void; onTap: () => void; disabled: boolean }) {
  const { handlers, dragging } = useDrag({ onDrop: onPut, onTap, onLift: () => sfx("lift"), disabled });
  return (
    <div {...handlers} data-dragging={dragging} role="button" aria-label="drag me" className="l-drag l-chunk flex h-[clamp(84px,12vh,100px)] w-[clamp(84px,12vh,100px)] items-center justify-center" style={{ fontSize: "clamp(50px, 7.5vh, 64px)", lineHeight: 1 } as CSSProperties}>
      {emoji}
    </div>
  );
}

// ── Add: push two groups together, count them all, pick the total ────────────────────────
export function AddAct({ act, fx, onDone }: ActProps<"add">) {
  const sum = act.a + act.b;
  const [merged, setMerged] = useState(false);
  const [lit, setLit] = useState(-1);
  const [ready, setReady] = useState(false);
  const later = useLater();
  const parts: Part[] = [plusLine(act.a, act.b), { gap: 350 }, SAY.pushTogether];
  usePrompt(fx, parts);
  const c = useChoice(String(sum), fx, onDone, { extra: [numberWord(sum)], reprompt: [SAY.howManyInAll] });
  const { handlers, dragging } = useDrag({ onDrop: (t) => t?.dataset.drop === "left" && merge(), onTap: () => merge(), onLift: () => sfx("lift"), disabled: merged });

  function merge() {
    if (merged) return;
    setMerged(true);
    sfx("whoosh");
    later(async () => {
      const countAlong: Part[] = [];
      for (let i = 1; i <= sum; i++) countAlong.push({ key: numberWord(i), onStart: () => (setLit(i - 1), sfx("count", i)) }, { gap: 140 });
      countAlong.push({ gap: 300 }, SAY.howManyInAll);
      fx.setPrompt([SAY.howManyInAll]);
      await say(countAlong);
      setReady(true);
    }, 650);
  }

  const item = (i: number, extraClass?: string) => (
    <span key={i} className={cn("inline-block select-none transition-transform duration-200", lit >= i && "-translate-y-2 scale-110", extraClass)} style={{ fontSize: "clamp(50px, 8vh, 70px)", lineHeight: 1 }}>
      {act.emoji}
    </span>
  );

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <PromptRow parts={parts}>
        <span className="font-display">
          {act.a} + {act.b}
        </span>
        {merged ? " — how many in all?" : " — push them together!"}
      </PromptRow>
      {!merged ? (
        <div className="flex items-center gap-5">
          <div data-drop="left" className="flex min-h-[200px] min-w-[200px] max-w-[360px] flex-wrap items-center justify-center gap-2 rounded-[32px] border-[5px] border-dashed border-white/85 bg-white/15 p-5">
            {Array.from({ length: act.a }, (_, i) => item(i))}
          </div>
          <span className="font-display text-7xl font-extrabold text-white drop-shadow-[0_3px_0_rgba(0,40,80,0.3)]">+</span>
          <div {...handlers} data-dragging={dragging} role="button" aria-label="push together" className="l-drag l-chunk flex min-h-[200px] min-w-[200px] max-w-[360px] flex-wrap items-center justify-center gap-2 p-5" style={{ "--f": "var(--l-card)", "--e": "var(--l-violet-edge)" } as CSSProperties}>
            {Array.from({ length: act.b }, (_, i) => item(act.a + i))}
          </div>
        </div>
      ) : (
        <div className="l-pop-in flex min-h-[200px] max-w-[760px] flex-wrap items-center justify-center gap-3 rounded-[32px] bg-white px-8 py-6 shadow-[0_8px_0_var(--l-line)]">
          {Array.from({ length: sum }, (_, i) => item(i))}
        </div>
      )}
      {!merged && (
        <Chunk tone="violet" onClick={merge} className="flex h-20 items-center gap-3 px-9 font-display text-2xl font-bold">
          👐 Push together
        </Chunk>
      )}
      {merged && (
        <div className={cn("transition-opacity duration-300", ready || c.found ? "opacity-100" : "pointer-events-none opacity-0")}>
          <NumberTiles options={act.options} answer={sum} c={c} />
        </div>
      )}
    </div>
  );
}
