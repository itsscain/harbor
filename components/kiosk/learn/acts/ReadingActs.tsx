"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Check, Volume2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { SAY, sndKey } from "@/lib/learn/script";
import { SOUNDS, soundOut, graphemes } from "@/lib/learn/sounds";
import { clipMs, say, type Part } from "@/lib/learn/audio";
import { sfx } from "@/lib/learn/sfx";
import { Chunk, useDrag, useShuffled, shuffleSeeded } from "../kit";
import { ChoiceTile, Picture, PromptRow, SoundChip, tileState, useChoice, useLater, usePrompt, type ActProps } from "./common";

const show = (g: string) => g.replace("_", "–");
const isGroup = (g: string) => g.replace("_", "").length > 1;
const hi = "outline outline-[6px] outline-offset-4 outline-white";

// ── Meet a letter ────────────────────────────────────────────────────────────────────────
export function MeetAct({ act, fx, onDone }: ActProps<"meet">) {
  const snd = sndKey(act.letter);
  const intro = isGroup(act.letter) ? SAY.theseLettersSay : SAY.thisLetterSays;
  const [glow, setGlow] = useState(0);
  const [tapped, setTapped] = useState<string[]>([]);
  const later = useLater();
  const letterRef = useRef<HTMLButtonElement>(null);
  const parts: Part[] = [intro, { key: snd, onStart: () => setGlow((g) => g + 1) }, { gap: 350 }, { key: snd, onStart: () => setGlow((g) => g + 1) }, { gap: 450 }, SAY.tapEachPicture];
  usePrompt(fx, parts);

  const tapPic = (word: string, el: HTMLElement) => {
    sfx("pick");
    void say([snd, { gap: 120 }, word]);
    fx.burst(el, "star", 6);
    if (tapped.includes(word)) return;
    const next = [...tapped, word];
    setTapped(next);
    if (next.length === act.pics.length) {
      later(() => fx.right(letterRef.current, [snd]), 1400);
      later(() => onDone(0), 2800);
    }
  };
  const upper = act.letter.length === 1 ? act.letter.toUpperCase() : null;

  return (
    <div className="flex w-full flex-col items-center gap-7">
      <PromptRow parts={parts}>
        {intro.replace(",", "")} <SoundChip text={act.letter} />
      </PromptRow>
      <Chunk
        ref={letterRef}
        aria-label={`The letter ${act.letter}`}
        onClick={(e) => {
          sfx("tap");
          setGlow((g) => g + 1);
          fx.burst(e.currentTarget, "star", 5);
          void say(snd);
        }}
        className="relative flex h-[clamp(190px,30vh,280px)] min-w-[clamp(220px,34vh,330px)] items-center justify-center px-6"
      >
        <span key={glow} className={cn("font-reading font-bold leading-none text-[var(--l-ink)]", glow > 0 && "l-boing")} style={{ fontSize: "clamp(120px, 21vh, 200px)" }}>
          {show(act.letter)}
        </span>
        {upper && <span className="font-reading absolute left-5 top-3 text-4xl font-bold text-[var(--l-ink-2)]">{upper}</span>}
        <span className="absolute bottom-3 right-4 text-[var(--l-blue)]">
          <Volume2 className="h-7 w-7" strokeWidth={2.6} />
        </span>
      </Chunk>
      <div className="flex flex-wrap justify-center gap-5">
        {act.pics.map((p) => {
          const done = tapped.includes(p.word);
          return (
            <Chunk key={p.word} tone={done ? "green" : "white"} onClick={(e) => tapPic(p.word, e.currentTarget)} aria-label={p.word} className={cn("relative flex h-[clamp(130px,19vh,180px)] w-[clamp(130px,19vh,180px)] flex-col items-center justify-center", done && "l-boing")}>
              <Picture emoji={p.emoji} size={86} />
              {done && <span className="mt-1 font-reading text-2xl font-bold">{p.word}</span>}
            </Chunk>
          );
        })}
      </div>
    </div>
  );
}

// ── Find the letter that makes a sound ───────────────────────────────────────────────────
export function FindLetterAct({ act, fx, onDone }: ActProps<"find-letter">) {
  const snd = sndKey(act.letter);
  const parts: Part[] = [SAY.tapLetterThatSays, snd];
  usePrompt(fx, parts);
  const options = useShuffled(act.options, `${fx.seed}:fl`);
  const c = useChoice(act.letter, fx, onDone, { extra: [snd], reprompt: [snd] });
  return (
    <div className="flex w-full flex-col items-center gap-9">
      <PromptRow parts={parts}>
        Tap the letter that says <SoundChip text={act.letter} />
      </PromptRow>
      <div className="flex flex-wrap justify-center gap-6">
        {options.map((l) => (
          <ChoiceTile key={l} label={`letter ${l}`} state={tileState(l, c, act.letter)} shakeKey={c.shake?.id === l ? c.shake.n : undefined} onPick={(el) => c.choose(l, el)} className="h-[clamp(160px,26vh,230px)] min-w-[clamp(160px,26vh,230px)] px-4">
            <span className="font-reading font-bold leading-none" style={{ fontSize: "clamp(96px, 16vh, 150px)" }}>
              {show(SOUNDS[l]?.graph ?? l)}
            </span>
          </ChoiceTile>
        ))}
      </div>
    </div>
  );
}

// ── Which picture starts with the sound ──────────────────────────────────────────────────
export function FirstSoundAct({ act, fx, onDone }: ActProps<"first-sound">) {
  const snd = sndKey(act.letter);
  const options = useShuffled(act.options, `${fx.seed}:fs`);
  const [lit, setLit] = useState<string | null>(null);
  const parts: Part[] = [
    SAY.whichStartsWith,
    snd,
    { gap: 450 },
    ...options.flatMap((o, i): Part[] => [{ key: o.word, onStart: () => setLit(o.word) }, { gap: i < options.length - 1 ? 260 : 500 }]),
    { key: snd, onStart: () => setLit(null) },
  ];
  usePrompt(fx, parts);
  const c = useChoice(act.answer, fx, onDone, { extra: [act.answer], reprompt: [SAY.whichStartsWith, snd] });
  return (
    <div className="flex w-full flex-col items-center gap-9">
      <PromptRow parts={parts}>
        Which one starts with <SoundChip text={act.letter} />?
      </PromptRow>
      <div className="flex flex-wrap justify-center gap-6">
        {options.map((o) => (
          <ChoiceTile key={o.word} label={o.word} state={tileState(o.word, c, act.answer)} shakeKey={c.shake?.id === o.word ? c.shake.n : undefined} onPick={(el) => c.choose(o.word, el)} className={cn("h-[clamp(170px,27vh,240px)] w-[clamp(170px,27vh,240px)] flex-col", lit === o.word && hi)}>
            <Picture emoji={o.emoji} size={110} />
            {c.found === o.word && <span className="mt-1 font-reading text-3xl font-bold">{o.word}</span>}
          </ChoiceTile>
        ))}
      </div>
    </div>
  );
}

// ── Which picture rhymes ─────────────────────────────────────────────────────────────────
export function RhymeAct({ act, fx, onDone }: ActProps<"rhyme">) {
  const options = useShuffled(act.options, `${fx.seed}:rh`);
  const [lit, setLit] = useState<string | null>(null);
  const parts: Part[] = [
    SAY.whichRhymesWith,
    act.target.word,
    { gap: 450 },
    ...options.flatMap((o, i): Part[] => [{ key: o.word, onStart: () => setLit(o.word) }, { gap: i < options.length - 1 ? 260 : 300 }]),
  ];
  usePrompt(fx, parts);
  useEffect(() => {
    if (!lit) return;
    const t = window.setTimeout(() => setLit(null), 900);
    return () => window.clearTimeout(t);
  }, [lit]);
  const c = useChoice(act.answer, fx, onDone, { extra: [act.target.word, act.answer], reprompt: [SAY.whichRhymesWith, act.target.word] });
  return (
    <div className="flex w-full flex-col items-center gap-7">
      <PromptRow parts={parts}>
        Which one rhymes with <span className="font-reading">{act.target.word}</span>?
      </PromptRow>
      <Chunk tone="gold" onClick={() => void say(act.target.word)} className="flex h-36 w-36 items-center justify-center" aria-label={act.target.word}>
        <Picture emoji={act.target.emoji} size={92} />
      </Chunk>
      <div className="flex flex-wrap justify-center gap-6">
        {options.map((o) => (
          <ChoiceTile key={o.word} label={o.word} state={tileState(o.word, c, act.answer)} shakeKey={c.shake?.id === o.word ? c.shake.n : undefined} onPick={(el) => c.choose(o.word, el)} className={cn("h-[clamp(150px,23vh,210px)] w-[clamp(150px,23vh,210px)] flex-col", lit === o.word && hi)}>
            <Picture emoji={o.emoji} size={96} />
            {c.found === o.word && <span className="mt-1 font-reading text-3xl font-bold">{o.word}</span>}
          </ChoiceTile>
        ))}
      </div>
    </div>
  );
}

// ── Read a word (no pictures — real decoding) ────────────────────────────────────────────
export function ReadWordAct({ act, fx, onDone }: ActProps<"read-word">) {
  const parts: Part[] = [SAY.findTheWord, act.word];
  usePrompt(fx, parts);
  const options = useShuffled(act.options, `${fx.seed}:rw`);
  const c = useChoice(act.word, fx, onDone, { extra: [act.word], reprompt: [SAY.findTheWord, act.word] });
  return (
    <div className="flex w-full flex-col items-center gap-9">
      <PromptRow parts={parts}>Find the word you hear</PromptRow>
      <div className="flex flex-wrap justify-center gap-6">
        {options.map((w) => (
          <ChoiceTile key={w} label={w} state={tileState(w, c, act.word)} shakeKey={c.shake?.id === w ? c.shake.n : undefined} onPick={(el) => c.choose(w, el)} className="h-[clamp(130px,20vh,170px)] min-w-[clamp(190px,28vh,260px)] px-8">
            <span className="font-reading font-bold leading-none" style={{ fontSize: "clamp(56px, 9vh, 84px)" }}>
              {w}
            </span>
          </ChoiceTile>
        ))}
      </div>
    </div>
  );
}

// ── Build (spell) a word by dragging letter tiles ────────────────────────────────────────
type Tile = { id: number; g: string };

export function BuildAct({ act, fx, onDone }: ActProps<"build">) {
  const word = act.word.word;
  const need = useMemo(() => graphemes(word), [word]);
  const units = useMemo(() => soundOut(word), [word]);
  const [tiles] = useState<Tile[]>(() => shuffleSeeded(act.tiles.map((g, i) => ({ id: i, g })), `${fx.seed}:bd`));
  const [slots, setSlots] = useState<(Tile | null)[]>(() => need.map(() => null));
  const [shakeTile, setShakeTile] = useState<{ id: number; n: number } | null>(null);
  const [lit, setLit] = useState<number | null>(null);
  const [complete, setComplete] = useState(false);
  const [misses, setMisses] = useState(0);
  const slotsRef = useRef<HTMLDivElement>(null);
  const later = useLater();
  const parts: Part[] = fx.firstTime ? [SAY.spellIt, word, { gap: 350 }, SAY.dragLetters] : [SAY.spellIt, word];
  usePrompt(fx, parts);
  const used = new Set(slots.filter((t): t is Tile => !!t).map((t) => t.id));

  const place = (tile: Tile, slot: number) => {
    const next = slots.map((s, i) => (i === slot ? tile : s));
    setSlots(next);
    sfx("snap");
    // The sound this letter makes in THIS word (the a in "cake" says its name; magic e is silent).
    const u = units[slot];
    if (u && u.text === tile.g && !u.sound) sfx("sticker");
    else void say(sndKey(u && u.text === tile.g && u.sound ? u.sound : tile.g));
    if (next.every(Boolean)) {
      setComplete(true);
      later(async () => {
        const blend: Part[] = [];
        units.forEach((un, i) => {
          if (un.sound) blend.push({ key: sndKey(un.sound), onStart: () => setLit(i) }, { gap: 160 });
        });
        blend.push({ gap: 250 }, { key: word, onStart: () => setLit(-1) });
        await say(blend);
        fx.right(slotsRef.current, [word]);
        later(() => onDone(misses), 1500);
      }, 450);
    }
  };
  const miss = (tile: Tile) => {
    setMisses((m) => m + 1);
    setShakeTile((s) => ({ id: tile.id, n: (s?.n ?? 0) + 1 }));
    fx.wrong(null, [word]);
  };
  const drop = (tile: Tile, target: HTMLElement | null) => {
    if (complete) return;
    const slot = target ? Number(target.dataset.slot) : NaN;
    if (Number.isNaN(slot)) return; // dropped somewhere else: it just floats back
    if (!slots[slot] && need[slot] === tile.g) place(tile, slot);
    else miss(tile);
  };
  const tap = (tile: Tile) => {
    if (complete) return;
    const slot = slots.findIndex((s, i) => !s && need[i] === tile.g);
    if (slot >= 0) place(tile, slot);
    else miss(tile);
  };

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <PromptRow parts={parts}>
        Spell <span className="font-reading">{complete ? word : "the word"}</span>
      </PromptRow>
      <Chunk onClick={() => void say(word)} aria-label={word} className="flex h-[clamp(120px,18vh,170px)] w-[clamp(120px,18vh,170px)] items-center justify-center">
        <Picture emoji={act.word.emoji} size={100} />
      </Chunk>
      <div ref={slotsRef} className="flex flex-wrap justify-center gap-3">
        {need.map((g, i) => {
          const t = slots[i];
          const glowing = lit === i || lit === -1;
          return (
            <div
              key={i}
              data-drop="slot"
              data-slot={i}
              className={cn(
                "flex h-[clamp(100px,15vh,132px)] min-w-[clamp(88px,13vh,116px)] items-center justify-center rounded-[22px] px-3 transition-all duration-200",
                glowing ? "-translate-y-2 bg-[var(--l-gold)] shadow-[0_6px_0_var(--l-gold-edge)]" : t ? "bg-white shadow-[0_6px_0_var(--l-green-edge)]" : "border-[5px] border-dashed border-white/80 bg-white/15",
              )}
            >
              {t && (
                <span className="l-pop-in font-reading font-bold leading-none text-[var(--l-ink)]" style={{ fontSize: "clamp(56px, 9vh, 80px)" }}>
                  {t.g}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex min-h-[clamp(96px,14vh,120px)] flex-wrap justify-center gap-4">
        {tiles.map((t) =>
          used.has(t.id) ? (
            <span key={t.id} className="h-[clamp(92px,13vh,112px)] w-[clamp(92px,13vh,112px)] rounded-[22px] bg-black/10" aria-hidden />
          ) : (
            <DragTile key={t.id} tile={t} shakeN={shakeTile?.id === t.id ? shakeTile.n : 0} onDrop={drop} onTap={tap} disabled={complete} />
          ),
        )}
      </div>
    </div>
  );
}

function DragTile({ tile, shakeN, onDrop, onTap, disabled }: { tile: Tile; shakeN: number; onDrop: (t: Tile, target: HTMLElement | null) => void; onTap: (t: Tile) => void; disabled: boolean }) {
  const { handlers, dragging } = useDrag({ onDrop: (target) => onDrop(tile, target), onTap: () => onTap(tile), onLift: () => sfx("lift"), disabled });
  return (
    <div
      {...handlers}
      data-dragging={dragging}
      role="button"
      aria-label={`letter ${tile.g}`}
      className="l-drag l-chunk relative flex h-[clamp(92px,13vh,112px)] min-w-[clamp(92px,13vh,112px)] items-center justify-center px-2"
      style={{ "--f": "var(--l-card)", "--e": "var(--l-blue-edge)" } as CSSProperties}
    >
      <span key={shakeN} className={cn("font-reading font-bold leading-none text-[var(--l-ink)]", shakeN > 0 && "l-shake")} style={{ fontSize: "clamp(52px, 8vh, 72px)" }}>
        {tile.g}
      </span>
    </div>
  );
}

// ── Blend: slide the boat under the word to sound it out, then pick its picture ──────────
const BOAT = 84;
type Slide = { id: number; grab: number; downX: number; width: number; centers: number[]; next: number };

export function BlendAct({ act, fx, onDone }: ActProps<"blend">) {
  const word = act.word.word;
  const units = useMemo(() => soundOut(word), [word]);
  const parts: Part[] = [SAY.slideToBlend];
  usePrompt(fx, parts);
  const [x, setX] = useState(0);
  const [heard, setHeard] = useState(-1); // last unit sounded
  const [phase, setPhase] = useState<"slide" | "pick">("slide");
  const trackRef = useRef<HTMLDivElement>(null);
  const unitRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const slide = useRef<Slide | null>(null);
  const finished = useRef(false);
  const later = useLater();
  const options = useShuffled(act.options, `${fx.seed}:bl`);
  const c = useChoice(word, fx, onDone, { extra: [word], reprompt: [SAY.whichPicture] });

  const measure = () => {
    const track = trackRef.current!.getBoundingClientRect();
    const centers = unitRefs.current.map((el) => {
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      return r.left + r.width / 2 - track.left;
    });
    return { left: track.left, width: track.width - BOAT, centers };
  };
  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    slide.current = null;
    setHeard(units.length);
    setPhase("pick");
    fx.setPrompt([word, { gap: 400 }, SAY.whichPicture]);
    later(() => void say([word, { gap: 500 }, SAY.whichPicture]), 300);
  };
  /** Move the boat; sound each letter group as the boat passes under it. */
  const reach = (px: number, s: Slide) => {
    setX(px);
    while (s.next < units.length && px + BOAT / 2 >= s.centers[s.next]) {
      const u = units[s.next];
      if (u.sound) void say(sndKey(u.sound));
      else sfx("sticker"); // the silent magic e twinkles
      setHeard(s.next);
      s.next++;
    }
    if (s.next >= units.length && px >= s.width - 4) later(finish, 450);
  };
  /** Tap the boat (instead of dragging): it sails across by itself. */
  const autoSail = () => {
    if (finished.current) return;
    const m = measure();
    const s: Slide = { id: -1, grab: 0, downX: 0, width: m.width, centers: m.centers, next: 0 };
    slide.current = s;
    const steps = 36;
    for (let i = 1; i <= steps; i++) later(() => slide.current === s && reach((m.width * i) / steps, s), i * 55);
  };

  return (
    <div className="flex w-full flex-col items-center gap-7">
      <PromptRow parts={phase === "slide" ? parts : [word, SAY.whichPicture]}>{phase === "slide" ? "Slide the boat to sound it out" : "Which picture is it?"}</PromptRow>
      <div className="rounded-[28px] bg-white px-8 pb-6 pt-7 shadow-[0_8px_0_var(--l-line)]">
        <div className="flex items-end justify-center gap-2">
          {units.map((u, i) => (
            <span
              key={i}
              ref={(el) => {
                unitRefs.current[i] = el;
              }}
              className={cn(
                "font-reading rounded-2xl px-2 font-bold leading-none transition-all duration-200",
                phase === "pick" ? "text-[var(--l-green-edge)]" : i <= heard ? (u.sound ? "-translate-y-1.5 text-[var(--l-orange)]" : "text-[var(--l-violet)] opacity-70") : "text-[var(--l-ink)]",
              )}
              style={{ fontSize: "clamp(80px, 14vh, 128px)" }}
            >
              {u.text}
            </span>
          ))}
        </div>
        <div ref={trackRef} className="relative mt-4 h-[96px] rounded-full bg-[var(--l-card-2)]" style={{ minWidth: Math.max(340, units.length * 124) }}>
          <div className="absolute inset-x-10 top-[42px] h-3 rounded-full bg-[var(--l-line)]" />
          <div className="absolute left-10 top-[42px] h-3 rounded-full bg-[var(--l-orange)]" style={{ width: Math.max(0, x) }} />
          <div
            role="button"
            aria-label="Slide to sound it out"
            className={cn("l-drag absolute left-0 top-[6px] flex items-center justify-center rounded-full bg-[var(--l-blue)] shadow-[0_5px_0_var(--l-blue-edge)]", phase === "slide" && x === 0 && "l-ring")}
            style={{ width: BOAT, height: BOAT, transform: `translateX(${x}px)`, fontSize: 46 }}
            onPointerDown={(e) => {
              if (finished.current || (slide.current && slide.current.id === -1)) return;
              const m = measure();
              slide.current = { id: e.pointerId, grab: e.clientX - x, downX: e.clientX, width: m.width, centers: m.centers, next: slide.current?.next ?? 0 };
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                /* ignore */
              }
            }}
            onPointerMove={(e) => {
              const s = slide.current;
              if (!s || s.id !== e.pointerId) return;
              reach(Math.max(0, Math.min(s.width, e.clientX - s.grab)), s);
            }}
            onPointerUp={(e) => {
              const s = slide.current;
              if (!s || s.id !== e.pointerId) return;
              if (Math.abs(e.clientX - s.downX) < 6 && x < 6) autoSail(); // a tap: sail by itself
            }}
          >
            ⛵
          </div>
        </div>
      </div>
      {phase === "pick" && (
        <div className="l-rise flex flex-wrap justify-center gap-6">
          {options.map((o) => (
            <ChoiceTile key={o.word} label="picture" state={tileState(o.word, c, word)} shakeKey={c.shake?.id === o.word ? c.shake.n : undefined} onPick={(el) => c.choose(o.word, el)} className="h-[clamp(140px,21vh,190px)] w-[clamp(140px,21vh,190px)]">
              <Picture emoji={o.emoji} size={96} />
            </ChoiceTile>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Pop the bubbles that say a heart word ────────────────────────────────────────────────
type Bubble = { id: number; word: string; lane: number; dur: number; wobble: number };
const NEED = 3;

export function PopAct({ act, fx, onDone }: ActProps<"pop">) {
  const parts: Part[] = [SAY.popEvery, act.word];
  usePrompt(fx, parts);
  // Reduced motion: a calm, still field of bubbles. Otherwise they float up from the sea floor.
  const [bubbles, setBubbles] = useState<Bubble[]>(() =>
    fx.reduced ? shuffleSeeded([...Array<string>(NEED).fill(act.word), ...act.others.slice(0, 5)], `${fx.seed}:pf`).map((w, i) => ({ id: 1000 + i, word: w, lane: i, dur: 0, wobble: 0 })) : [],
  );
  const [popped, setPopped] = useState(0);
  const [shake, setShake] = useState<{ id: number; n: number } | null>(null);
  const [misses, setMisses] = useState(0);
  const counter = useRef(0);
  const later = useLater();
  const done = popped >= NEED;

  useEffect(() => {
    if (fx.reduced || done) return;
    const spawn = () => {
      const k = counter.current++;
      setBubbles((bs) => {
        if (bs.length >= 9) return bs; // never a pile-up (e.g. if the screen stops animating)
        const targetsUp = bs.filter((b) => b.word === act.word).length;
        const word = targetsUp === 0 || k % 3 === 0 ? act.word : act.others[k % act.others.length];
        return [...bs, { id: k, word, lane: (k * 2) % 5, dur: 8.5 + ((k * 7) % 5) * 0.5, wobble: 10 + ((k * 13) % 14) }];
      });
    };
    const first = window.setTimeout(spawn, 250);
    const id = window.setInterval(spawn, 1250);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [act.word, act.others, fx.reduced, done]);

  const tap = (b: Bubble, el: HTMLElement) => {
    if (done) return;
    if (b.word === act.word) {
      sfx("pop");
      fx.burst(el, "sea", 8);
      setBubbles((bs) => bs.filter((x) => x.id !== b.id));
      const n = popped + 1;
      setPopped(n);
      if (n >= NEED) {
        fx.right(el, [act.word]);
        later(() => onDone(misses), 1500);
      } else void say(act.word);
    } else {
      setMisses((m) => m + 1);
      setShake((s) => ({ id: b.id, n: (s?.n ?? 0) + 1 }));
      fx.miss();
      void say(b.word);
    }
  };

  const body = (b: Bubble) => (
    <button
      type="button"
      onPointerDown={(e) => tap(b, e.currentTarget)}
      className="flex items-center justify-center rounded-full"
      style={{
        width: "clamp(120px, 17vh, 156px)",
        height: "clamp(120px, 17vh, 156px)",
        background: "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95), rgba(255,255,255,0.55) 22%, rgba(214,242,255,0.35) 55%, rgba(120,200,240,0.35) 100%)",
        boxShadow: "inset 0 0 0 3px rgba(255,255,255,0.85), inset -8px -10px 24px rgba(0,120,190,0.25), 0 10px 24px -10px rgba(0,50,90,0.4)",
      }}
    >
      <span key={shake?.id === b.id ? shake.n : 0} className={cn("font-reading font-bold leading-none text-[var(--l-ink)]", shake?.id === b.id && "l-shake")} style={{ fontSize: "clamp(36px, 6vh, 50px)" }}>
        {b.word}
      </span>
    </button>
  );

  return (
    <div className="flex h-full w-full flex-col items-center gap-4">
      <PromptRow parts={parts}>
        Pop every <span className="font-reading rounded-xl bg-white px-3 text-[var(--l-ink)]">{act.word}</span>
      </PromptRow>
      <div className="flex gap-2" aria-label={`${popped} of ${NEED} popped`}>
        {Array.from({ length: NEED }, (_, i) => (
          <span key={i} className={cn("flex h-11 w-11 items-center justify-center rounded-full text-2xl transition-all", i < popped ? "l-pop-in bg-[var(--l-gold)] shadow-[0_4px_0_var(--l-gold-edge)]" : "bg-white/25")}>
            {i < popped ? "⭐" : ""}
          </span>
        ))}
      </div>
      {fx.reduced ? (
        <div className="grid grid-cols-4 gap-5">
          {bubbles.map((b) => (
            <div key={b.id}>{body(b)}</div>
          ))}
        </div>
      ) : (
        <div className="relative w-full flex-1 overflow-hidden" style={{ minHeight: "52vh" }}>
          {bubbles.map((b) => (
            <div
              key={b.id}
              className="l-bubble-up absolute bottom-[-180px]"
              style={{ left: `${4 + b.lane * 19}%`, "--dur": `${b.dur}s`, "--rise": "calc(-52vh - 360px)" } as CSSProperties}
              onAnimationEnd={(e) => {
                if (e.target === e.currentTarget) setBubbles((bs) => bs.filter((x) => x.id !== b.id));
              }}
            >
              <div className="l-wobble" style={{ "--wx": `${b.wobble}px`, "--wd": `${2.2 + (b.id % 3) * 0.5}s` } as CSSProperties}>
                {body(b)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Read a sentence (tap any word for help), then answer about it ────────────────────────
export function SentenceAct({ act, fx, onDone }: ActProps<"sentence">) {
  const words = useMemo(() => act.text.split(/\s+/), [act.text]);
  // Kids read it themselves: the instructions are spoken the first time, never the sentence.
  usePrompt(fx, [SAY.readSentence], fx.firstTime ? 380 : -1);
  const [lit, setLit] = useState<number | null>(null);
  const [phase, setPhase] = useState<"read" | "question">("read");
  const later = useLater();
  const q = act.question;
  const options = useShuffled(q?.options ?? [], `${fx.seed}:sq`);
  const c = useChoice(q?.answer ?? "", fx, onDone, { extra: q ? [q.answer] : [], reprompt: q ? [q.prompt] : [] });

  const readToMe = async () => {
    sfx("tap");
    const ms = clipMs(act.text);
    const chars = words.map((w) => w.length + 1);
    const total = chars.reduce((a, b) => a + b, 0);
    await say({
      key: act.text,
      onStart: () => {
        if (!ms) return;
        let acc = 0;
        words.forEach((_, i) => {
          later(() => setLit(i), (acc / total) * ms);
          acc += chars[i];
        });
      },
    });
    setLit(null);
  };
  const toQuestion = () => {
    sfx("pick");
    if (!q) {
      fx.right(null, []);
      later(() => onDone(0), 1100);
      return;
    }
    setPhase("question");
    fx.setPrompt([q.prompt]);
    later(() => void say(q.prompt), 250);
  };

  return (
    <div className="flex w-full flex-col items-center gap-7">
      {phase === "read" ? (
        <>
          <PromptRow parts={[SAY.readSentence]}>Read it! Tap a word for help.</PromptRow>
          <div className="flex max-w-[960px] flex-col items-center gap-5 rounded-[30px] bg-white px-8 py-7 shadow-[0_8px_0_var(--l-line)]">
            <span style={{ fontSize: 88, lineHeight: 1 }} aria-hidden>
              {act.emoji}
            </span>
            <p className="flex flex-wrap justify-center gap-x-4 gap-y-2">
              {words.map((w, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    sfx("tap");
                    setLit(i);
                    void say(w.replace(/[^A-Za-z']/g, ""));
                    later(() => setLit((l) => (l === i ? null : l)), 900);
                  }}
                  className={cn("font-reading rounded-2xl px-2 font-bold leading-tight text-[var(--l-ink)] transition-all", lit === i ? "-translate-y-1 bg-[var(--l-gold)]" : "active:bg-[var(--l-card-2)]")}
                  style={{ fontSize: "clamp(48px, 7.5vh, 70px)" }}
                >
                  {w}
                </button>
              ))}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-5">
            <Chunk tone="white" onClick={() => void readToMe()} className="flex h-20 items-center gap-3 px-8 font-display text-2xl font-bold">
              <Volume2 className="h-8 w-8 text-[var(--l-blue)]" strokeWidth={2.6} /> Read it to me
            </Chunk>
            <Chunk tone="green" onClick={toQuestion} className="flex h-20 items-center gap-3 px-9 font-display text-2xl font-bold">
              <Check className="h-8 w-8" strokeWidth={3} /> I read it!
            </Chunk>
          </div>
        </>
      ) : (
        q && (
          <>
            <PromptRow parts={[q.prompt]}>{q.prompt}</PromptRow>
            <p className="font-reading rounded-2xl bg-white/90 px-5 py-2 text-3xl font-bold text-[var(--l-ink)]">{act.text}</p>
            <div className="flex flex-wrap justify-center gap-6">
              {options.map((o) => (
                <ChoiceTile key={o.word} label={o.word} state={tileState(o.word, c, q.answer)} shakeKey={c.shake?.id === o.word ? c.shake.n : undefined} onPick={(el) => c.choose(o.word, el)} className="h-[clamp(150px,23vh,210px)] w-[clamp(150px,23vh,210px)] flex-col">
                  <Picture emoji={o.emoji} size={96} />
                  {c.found === o.word && <span className="mt-1 font-reading text-3xl font-bold">{o.word}</span>}
                </ChoiceTile>
              ))}
            </div>
          </>
        )
      )}
    </div>
  );
}
