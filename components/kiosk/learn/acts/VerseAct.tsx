"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Mic } from "lucide-react";
import { cn } from "@/lib/cn";
import { WORD_PIC, refSpoken, verseWords } from "@/lib/learn/bible";
import { SAY } from "@/lib/learn/script";
import { clipMs, stopIfStill, voiceToken, type Part } from "@/lib/learn/audio";
import { sfx, buzz } from "@/lib/learn/sfx";
import { Chunk, shuffleSeeded, useShuffled, useShuffledApart } from "../kit";
import { ChoiceTile, Hearable, PromptRow, tileState, useChoice, useLater, usePrompt, type ActProps, type LessonFx } from "./common";
import { Glyph, GlyphRow } from "../art/Glyph";

// Scripture memory, one rung of the ladder at a time. The verse sits on a scroll with its
// reference ribbon. Listen: the Harbor voice reads it while each word lights up (karaoke), then
// again so the child says it along. Fill: the missing word (with a picture for pre-readers).
// Build: tap the pieces in order. Recall: every other word fades to its first letter. Then where
// it lives and what it means. Each finished verse is read back as the reward — hearing it whole,
// right after recalling it, is what locks it in.

type Step<S extends string> = Extract<ActProps<"verse">["act"]["v"], { step: S }>;

export function VerseAct(props: ActProps<"verse">) {
  const v = props.act.v;
  switch (v.step) {
    case "listen":
      return <Listen {...props} />;
    case "blanks":
      return <Blanks {...props} v={v} />;
    case "tiles":
      return <Tiles {...props} v={v} />;
    case "ref":
      return <RefPick {...props} v={v} />;
    case "meaning":
      return <MeaningPick {...props} v={v} />;
  }
}

/** The scroll the verse sits on. */
function Scroll({ refText, pic, children, glow }: { refText: string; pic?: string; children: ReactNode; glow?: boolean }) {
  return (
    <div className={cn("l-pop-in relative w-full max-w-[980px] rounded-[30px] border-[5px] border-[#f1dfb6] bg-[#fffaf0] px-7 pb-6 pt-9 shadow-[0_9px_0_#e3c98e]", glow && "l-verse-glow")}>
      <span className="absolute -top-5 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-[var(--l-gold)] px-5 py-1.5 font-display text-xl font-extrabold text-[#5a3b00] shadow-[0_4px_0_var(--l-gold-edge)]">
        <Glyph e="📜" size={30} className="mr-1.5 align-[-0.35em]" />
        {refText}
      </span>
      {pic && (
        <span className="absolute -left-5 -top-8 block rotate-[-8deg] drop-shadow-[0_4px_0_rgba(0,0,0,0.12)]">
          <GlyphRow s={pic} size={72} />
        </span>
      )}
      {children}
    </div>
  );
}

const sizeFor = (text: string) => (text.length > 220 ? 23 : text.length > 150 ? 26 : text.length > 90 ? 30 : text.length > 40 ? 36 : 44);

function Words({ text, render }: { text: string; render: (w: { pre: string; core: string; post: string }, i: number) => ReactNode }) {
  const words = verseWords(text);
  return (
    <p className="text-balance text-center font-reading font-bold leading-[1.6] text-[#3b2a14]" style={{ fontSize: sizeFor(text) }}>
      {words.map((w, i) => (
        <span key={i}>
          {i > 0 && " "}
          {render(w, i)}
        </span>
      ))}
    </p>
  );
}

// ── Listen: karaoke, then say it along, then what it means ─────────────────────────────────
function Listen({ act: a, fx, onDone }: ActProps<"verse">) {
  const words = useMemo(() => verseWords(a.text), [a.text]);
  // When each word starts, as a fraction of the clip (by letters — close enough for a child's eye).
  const starts = useMemo(() => {
    const lens = words.map((w) => w.core.length + w.post.length + 1);
    const total = lens.reduce((s, n) => s + n, 0);
    return lens.map((_, i) => lens.slice(0, i).reduce((s, n) => s + n, 0) / total);
  }, [words]);
  const [hi, setHi] = useState(-1);
  const [phase, setPhase] = useState<"listen" | "say" | "meaning">("listen");
  const timer = useRef<number | null>(null);
  const later = useLater();
  const voiced = fx.voice !== "keys";

  const highlight = () => {
    const ms = clipMs(a.text) ?? Math.max(1800, a.text.length * 62);
    const t0 = performance.now();
    if (timer.current) window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      const f = (performance.now() - t0) / ms;
      let k = 0;
      while (k + 1 < starts.length && starts[k + 1] <= f) k++;
      setHi(f >= 1 ? words.length : k);
      if (f >= 1 && timer.current) {
        window.clearInterval(timer.current);
        timer.current = null;
      }
    }, 50);
  };
  const read = (lead: string) => fx.say([lead, { gap: 300 }, { key: a.text, onStart: highlight }, { gap: 250 }, refSpoken(a.ref)]);

  useEffect(() => {
    fx.setPrompt([{ key: a.text, onStart: highlight }]);
    const t = window.setTimeout(() => void read(SAY.listenVerse).then(() => setPhase("say")), 420);
    return () => {
      window.clearTimeout(t);
      if (timer.current) window.clearInterval(timer.current);
    };
    // Plays once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sayAlong = () => {
    sfx("pick");
    setHi(-1);
    void read(SAY.sayItWithMe).then(() => {
      setPhase("meaning");
      if (voiced && a.meaning) later(() => void fx.say([a.meaning!]), 300);
    });
  };

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <Scroll refText={a.ref} pic={a.pic} glow={phase === "meaning"}>
        <Words text={a.text} render={(w, i) => <span className={cn("rounded-lg px-0.5 transition-colors duration-150", i <= hi && hi >= 0 ? "bg-[var(--l-gold)]/45 text-[#3b2a14]" : hi >= 0 ? "text-[#3b2a14]/45" : "")}>{w.pre + w.core + w.post}</span>} />
      </Scroll>
      {phase === "say" && (
        <Chunk tone="violet" onClick={sayAlong} className={cn("l-rise flex h-20 items-center gap-3 px-8 font-display text-[28px] font-extrabold", !fx.reduced && "l-pulse")}>
          <Mic className="h-9 w-9" strokeWidth={2.8} /> Say it with me!
        </Chunk>
      )}
      {phase === "meaning" && (
        <div className="l-rise flex w-full max-w-[880px] flex-col items-center gap-4">
          {a.meaning && (
            <div className="flex items-center gap-4 rounded-[26px] bg-white px-6 py-4 shadow-[0_6px_0_var(--l-line)]">
              <GlyphRow s={a.pic ?? "💡"} size={64} />
              <p className="font-display text-2xl font-bold leading-snug text-[var(--l-ink)]">
                <span className="text-[var(--l-violet)]">What it means: </span>
                {a.meaning}
              </p>
            </div>
          )}
          <Chunk tone="green" onClick={() => (sfx("pick"), onDone(0))} className="flex h-16 items-center gap-2 px-10 font-display text-2xl font-extrabold">
            I&apos;ve got it! ✓
          </Chunk>
        </div>
      )}
    </div>
  );
}

/** Read the whole verse back as the reward, then finish. */
function useFinish(fx: LessonFx, text: string, refText: string, onDone: (m: number) => void) {
  const later = useLater();
  return (misses: number, el: Element | null) => {
    fx.right(el);
    later(() => void fx.say([text, { gap: 250 }, refSpoken(refText)]).then(() => onDone(misses)), 900);
  };
}

// ── Fill the missing word(s) ───────────────────────────────────────────────────────────────
/** Play a verse up to (not including) word `at` — "In the beginning God …" — so a child who can't
 *  read yet hears exactly where the gap is. Timing is by letters, stopped a hair early. */
function playUntil(fx: LessonFx, text: string, at: number, lead: Part[] = []) {
  const words = verseWords(text);
  const lens = words.map((w) => w.core.length + w.post.length + 1);
  const total = lens.reduce((s, n) => s + n, 0);
  const frac = lens.slice(0, at).reduce((s, n) => s + n, 0) / total;
  if (frac <= 0) return void fx.say(lead);
  void fx.say([
    ...lead,
    {
      key: text,
      onStart: () => {
        const tok = voiceToken();
        window.setTimeout(() => stopIfStill(tok), Math.max(200, frac * (clipMs(text) ?? text.length * 62) - 90));
      },
    },
  ]);
}

function Blanks({ act: a, fx, onDone, v }: ActProps<"verse"> & { v: Step<"blanks"> }) {
  const voiced = fx.voice !== "keys";
  const prompt = v.blanks.length > 1 ? "Fill in the missing words" : SAY.whichWord;
  const [k, setK] = useState(0); // which blank we're on
  const [misses, setMisses] = useState(0);
  const [shake, setShake] = useState<{ id: string; n: number } | null>(null);
  const [wrong, setWrong] = useState<string[]>([]);
  const finish = useFinish(fx, a.text, a.ref, onDone);
  const done = k >= v.blanks.length;
  const cur = v.blanks[Math.min(k, v.blanks.length - 1)];
  const words = verseWords(a.text);
  const opts = useMemo(() => shuffleSeeded(cur.options, `${fx.seed}:${k}`), [cur, fx.seed, k]);
  // Pre-readers hear the verse up to each gap (the replay button does it again).
  useEffect(() => {
    if (done) return;
    fx.setPrompt([SAY.whichWord]);
    if (!voiced) return;
    const t = window.setTimeout(() => playUntil(fx, a.text, cur.at, k === 0 ? [SAY.whichWord, { gap: 300 }] : []), k === 0 ? 400 : 900);
    return () => window.clearTimeout(t);
    // Per blank.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k]);

  const pick = (o: string, el: HTMLElement) => {
    if (done) return;
    if (o === words[cur.at].core) {
      sfx("snap");
      buzz(14);
      fx.burst(el, "star", 8);
      setWrong([]);
      const n = k + 1;
      setK(n);
      if (n >= v.blanks.length) finish(misses, el);
    } else {
      setMisses((m) => m + 1);
      setWrong((w) => [...w, o]);
      setShake((s) => ({ id: o, n: (s?.n ?? 0) + 1 }));
      fx.wrong(el);
    }
  };
  const blankIndex = (i: number) => v.blanks.findIndex((b) => b.at === i);
  return (
    <div className="flex w-full flex-col items-center gap-6">
      <PromptRow parts={[SAY.whichWord]}>{prompt}</PromptRow>
      <Scroll refText={a.ref} pic={a.pic} glow={done}>
        <Words
          text={a.text}
          render={(w, i) => {
            const b = blankIndex(i);
            if (b >= 0) {
              const filled = b < k;
              return (
                <>
                  {w.pre}
                  <span className={cn("inline-block min-w-[3.2em] rounded-xl border-b-[5px] px-2 text-center", filled ? "l-pop-in border-[var(--l-green)] bg-[var(--l-green)]/15 text-[var(--l-green-edge)]" : b === k ? "l-blank border-[var(--l-gold-edge)] bg-[var(--l-gold)]/25 text-transparent" : "border-[#d9c497] text-transparent")}>
                    {filled ? w.core : "____"}
                  </span>
                  {w.post}
                </>
              );
            }
            if (v.cue === "letters" && !done) return <span className="text-[#3b2a14]/80">{w.pre + (w.core ? w.core[0] + "_".repeat(Math.min(6, Math.max(1, w.core.length - 1))) : "") + w.post}</span>;
            return <span className={cn(v.cue === "letters" && "l-reveal")}>{w.pre + w.core + w.post}</span>;
          }}
        />
      </Scroll>
      {!done && (
        <div className="grid w-full max-w-[860px] gap-4" style={{ gridTemplateColumns: `repeat(${opts.length}, minmax(0, 1fr))` }}>
          {opts.map((o, i) => (
            <div key={`${k}:${o}`} className="l-rise relative" style={{ animationDelay: `${80 + i * 60}ms` }}>
              <Hearable parts={voiced ? [o] : null} side="below">
                <ChoiceTile
                  state={misses >= 2 && wrong.length >= 1 && o === words[cur.at].core ? "hint" : shake?.id === o ? "wrong" : wrong.includes(o) ? "tried" : "idle"}
                  shakeKey={shake?.id === o ? shake.n : undefined}
                  onPick={(el) => (sfx("pick"), pick(o, el))}
                  label={o}
                  className="min-h-[112px] w-full text-[var(--l-ink)]"
                >
                  <span className="flex flex-col items-center gap-1">
                    {voiced && WORD_PIC[o] && <span className="text-[44px] leading-none">{WORD_PIC[o]}</span>}
                    <span className="font-reading text-[32px] font-bold">{o}</span>
                  </span>
                </ChoiceTile>
              </Hearable>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Build it from pieces ──────────────────────────────────────────────────────────────────
function Tiles({ act: a, fx, onDone, v }: ActProps<"verse"> & { v: Step<"tiles"> }) {
  const voiced = fx.voice !== "keys";
  usePrompt(fx, [SAY.buildVerse], voiced ? 380 : -1);
  const pool = useShuffledApart(
    [...v.chunks.map((text, i) => ({ id: `c${i}`, text })), ...(v.decoys ?? []).map((text, i) => ({ id: `d${i}`, text }))],
    fx.seed,
  );
  const [placed, setPlaced] = useState<string[]>([]);
  const [misses, setMisses] = useState(0);
  const [shake, setShake] = useState<{ id: string; n: number } | null>(null);
  const finish = useFinish(fx, a.text, a.ref, onDone);
  const n = placed.length;
  const done = n >= v.chunks.length;
  const tap = (t: { id: string; text: string }, el: HTMLElement) => {
    if (done || placed.includes(t.id)) return;
    if (t.text === v.chunks[n]) {
      sfx("snap");
      buzz(12);
      fx.burst(el, "star", 6);
      const now = [...placed, t.id];
      setPlaced(now);
      if (now.length >= v.chunks.length) finish(misses, el);
    } else {
      setMisses((m) => m + 1);
      setShake((s) => ({ id: t.id, n: (s?.n ?? 0) + 1 }));
      fx.wrong(el);
    }
  };
  const hintText = misses >= 2 && !done ? v.chunks[n] : null;
  return (
    <div className="flex w-full flex-col items-center gap-5">
      <PromptRow parts={[SAY.buildVerse]}>Build the verse — tap the pieces in order</PromptRow>
      <Scroll refText={a.ref} pic={a.pic} glow={done}>
        <p className="min-h-[1.6em] text-balance text-center font-reading font-bold leading-[1.6] text-[#3b2a14]" style={{ fontSize: sizeFor(a.text) }}>
          {v.chunks.slice(0, n).map((c, i) => (
            <span key={i} className="l-pop-in">
              {i > 0 && " "}
              {c}
            </span>
          ))}
          {!done && <span className="l-caret ml-1 inline-block h-[1em] w-[0.35em] translate-y-[0.15em] rounded bg-[var(--l-gold-edge)]" />}
        </p>
      </Scroll>
      {!done && (
        <div className="flex max-w-[1000px] flex-wrap justify-center gap-3">
          {pool.map((t) =>
            placed.includes(t.id) ? null : (
              <Hearable key={t.id} parts={voiced ? [t.text] : null} side="below">
                <Chunk tone="white" onClick={(e) => (sfx("pick"), tap(t, e.currentTarget))} className={cn("flex min-h-[78px] w-full items-center justify-center px-5 py-3", hintText === t.text && "l-hint")}>
                  <span key={shake?.id === t.id ? shake.n : 0} className={cn("font-reading text-[26px] font-bold text-[var(--l-ink)]", shake?.id === t.id && "l-shake")}>
                    {t.text}
                  </span>
                </Chunk>
              </Hearable>
            ),
          )}
        </div>
      )}
    </div>
  );
}

// ── Where is it found? ─────────────────────────────────────────────────────────────────────
function RefPick({ act: a, fx, onDone, v }: ActProps<"verse"> & { v: Step<"ref"> }) {
  const voiced = fx.voice !== "keys";
  usePrompt(fx, voiced ? [SAY.whereVerse, { gap: 300 }, a.text] : [SAY.whereVerse], voiced ? 380 : -1);
  const c = useChoice(a.ref, fx, onDone, { extra: [refSpoken(a.ref)] });
  const opts = useShuffled(v.options, fx.seed);
  return (
    <div className="flex w-full flex-col items-center gap-6">
      <PromptRow parts={[SAY.whereVerse]}>Where is this verse found?</PromptRow>
      <Scroll refText="?">
        <Words text={a.text} render={(w) => w.pre + w.core + w.post} />
      </Scroll>
      <div className="grid w-full max-w-[900px] gap-4" style={{ gridTemplateColumns: `repeat(${opts.length}, minmax(0, 1fr))` }}>
        {opts.map((o, i) => (
          <div key={o} className="l-rise relative" style={{ animationDelay: `${100 + i * 60}ms` }}>
            <Hearable parts={voiced ? [refSpoken(o)] : null} side="below">
              <ChoiceTile state={tileState(o, c, a.ref)} shakeKey={c.shake?.id === o ? c.shake.n : undefined} onPick={(el) => (sfx("pick"), c.choose(o, el))} label={o} className="min-h-[104px] w-full text-[var(--l-ink)]">
                <span className="flex items-center gap-2 font-display text-[28px] font-extrabold">
                  <Glyph e="📖" size={38} /> {o}
                </span>
              </ChoiceTile>
            </Hearable>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── What does it mean? ─────────────────────────────────────────────────────────────────────
function MeaningPick({ act: a, fx, onDone, v }: ActProps<"verse"> & { v: Step<"meaning"> }) {
  const voiced = fx.voice !== "keys";
  usePrompt(fx, voiced ? [SAY.meaningVerse, { gap: 300 }, a.text] : [SAY.meaningVerse], voiced ? 380 : -1);
  const c = useChoice(v.answer, fx, onDone, { why: `It means: ${v.answer}`, whyParts: voiced ? [v.answer] : undefined });
  const opts = useShuffled(v.options, fx.seed);
  return (
    <div className="flex w-full flex-col items-center gap-5">
      <PromptRow parts={[SAY.meaningVerse]}>What does this verse mean?</PromptRow>
      <Scroll refText={a.ref} pic={a.pic}>
        <Words text={a.text} render={(w) => w.pre + w.core + w.post} />
      </Scroll>
      <div className="grid w-full max-w-[860px] grid-cols-1 gap-3">
        {opts.map((o, i) => (
          <div key={o} className="l-rise relative" style={{ animationDelay: `${100 + i * 70}ms` }}>
            <Hearable parts={voiced ? [o] : null}>
              <ChoiceTile state={tileState(o, c, v.answer)} shakeKey={c.shake?.id === o ? c.shake.n : undefined} onPick={(el) => (sfx("pick"), c.choose(o, el))} label={o} className="min-h-[80px] w-full justify-start px-5 py-3 text-left text-[var(--l-ink)]">
                <span className="w-full font-reading text-[24px] font-bold leading-snug">{o}</span>
              </ChoiceTile>
            </Hearable>
          </div>
        ))}
      </div>
    </div>
  );
}
