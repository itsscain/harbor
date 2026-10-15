"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Part } from "@/lib/learn/audio";
import type { DrumId, InstId, Score } from "@/lib/learn/mus/types";
import { INSTRUMENTS, isInst, soundName } from "@/lib/learn/mus/catalog";
import { melody, rhythm } from "@/lib/learn/mus/score";
import { SAY } from "@/lib/learn/script";
import { buzz, sfx } from "@/lib/learn/sfx";
import { Chunk, useDrag, useShuffled } from "../../kit";
import { HearButton, PromptRow, spoken, useLater, type ActProps } from "../../acts/common";
import { Glyph, GlyphRow, WithGlyphs } from "../../art/Glyph";
import { usePlayer } from "../kit/player";
import { InstrumentPic, MiniPlay, SoundOffNote } from "../kit/kit";

// Sort the sounds: every card is a sound (tap it, or its play button, to hear it — carrying a card
// plays it too, so you always know what's in your hand). Drag each one into its group — or tap a
// card, then tap a group. Nothing is judged until Check: the right ones lock in green, the wrong
// ones shake and hop back out to be heard again. After three tries the helper shows where every
// sound goes, so no one is ever stuck.

type Item = ActProps<"soundsort">["act"]["items"][number];
type Bin = ActProps<"soundsort">["act"]["bins"][number];

const TRIES = 3;
/** Drums that ring (one hit and listen) and drums you shake (quick and busy). */
const RINGING: DrumId[] = ["crash", "cymbals", "gong", "triangle", "ride", "openhat"];
const SHAKEN: DrumId[] = ["shaker", "maracas", "tamb", "hat"];

/** A short sample of an instrument or drum: a little arpeggio in its range, or a drum pattern. */
function sampleOf(id: InstId | DrumId): Score {
  if (isInst(id)) {
    const info = INSTRUMENTS[id];
    const c = Math.max(info.lo, Math.min(info.hi - 12, 60));
    return melody([c, c + 4, c + 7, c + 12, c + 7, c].map((p) => Math.min(info.hi, p)), [0.5, 0.5, 0.5, 1, 0.5, 1.5], id, 108);
  }
  const d = id as DrumId;
  return rhythm(RINGING.includes(d) ? ["ta", "z", "taa"] : SHAKEN.includes(d) ? ["titi", "titi", "titi", "ta"] : ["ta", "titi", "ta", "ta"], { drum: d, bpm: 112 });
}
const soundOf = (x: { sound?: Score; inst?: InstId | DrumId }): Score | null => x.sound ?? (x.inst ? sampleOf(x.inst) : null);
const labelOf = (it: Item) => it.label ?? (it.inst && !it.emoji ? soundName(it.inst) : undefined);

export function SoundSortAct({ act, fx, onDone }: ActProps<"soundsort">) {
  const player = usePlayer();
  const later = useLater();
  const voiced = fx.voice !== "keys";
  const little = fx.voice === "all";
  const { parts, auto } = spoken(fx, act.say, act.prompt);
  const intro: Part[] = fx.firstTime && voiced ? [...parts, "~", SAY.soundsortHow] : parts;
  const items = useShuffled(act.items, fx.seed);
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [locked, setLocked] = useState<string[]>([]);
  const [bad, setBad] = useState<{ ids: string[]; k: number } | null>(null);
  const [shown, setShown] = useState<string[]>([]); // placed by the helper after three tries
  const [selected, setSelected] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null); // an item id, or "bin:<id>"
  const [misses, setMisses] = useState(0);
  const [phase, setPhase] = useState<"sort" | "checking" | "done" | "reveal">("sort");
  const [note, setNote] = useState<string | null>(null);
  // The card in a finger's grip rides above everything else.
  const [lifted, setLifted] = useState<string | null>(null);

  useEffect(() => {
    fx.setPrompt(intro);
    const t = window.setTimeout(() => {
      if (auto && intro.length) void fx.say(intro);
    }, 380);
    return () => window.clearTimeout(t);
    // Asked once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const play = (key: string, s: Score | null, toggle: boolean) => {
    if (!s) return;
    if (toggle && playing === key && player.playing) {
      player.stop();
      setPlaying(null);
      return;
    }
    setPlaying(key);
    player.play(s, { onEnd: () => setPlaying((p) => (p === key ? null : p)) });
  };
  const playItem = (it: Item, toggle = false) => play(it.id, soundOf(it), toggle);

  const canMove = (id: string) => phase === "sort" && !locked.includes(id);
  const put = (id: string, bin: string | null) => {
    if (!canMove(id)) return;
    setSelected(null);
    if (!bin) return; // dropped on nothing: it floats back
    if (bin === "tray") {
      if (placed[id]) {
        setPlaced(Object.fromEntries(Object.entries(placed).filter(([k]) => k !== id)));
        sfx("pop");
      }
      return;
    }
    if (!act.bins.some((b) => b.id === bin) || placed[id] === bin) return;
    setPlaced({ ...placed, [id]: bin });
    setNote(null);
    sfx("snap");
    buzz(12);
  };
  const tapCard = (it: Item) => {
    playItem(it);
    if (!canMove(it.id)) return;
    setSelected((s) => (s === it.id ? null : it.id));
  };
  const tapBin = (b: Bin) => {
    if (selected) put(selected, b.id);
    else if (voiced) void fx.say([b.label]);
  };

  const allPlaced = act.items.every((it) => placed[it.id]);
  const check = (el: HTMLElement) => {
    if (phase !== "sort") return;
    if (!allPlaced) {
      sfx("soft-fail");
      setNote("Put every card in a group first!");
      return;
    }
    player.stop();
    setPlaying(null);
    setSelected(null);
    const wrong = act.items.filter((it) => placed[it.id] !== it.bin).map((it) => it.id);
    if (!wrong.length) {
      setLocked(act.items.map((it) => it.id));
      setPhase("done");
      setNote(null);
      fx.right(el);
      later(() => onDone(misses), 1700);
      return;
    }
    const m = misses + 1;
    setMisses(m);
    setLocked(act.items.filter((it) => placed[it.id] === it.bin).map((it) => it.id));
    setBad((b) => ({ ids: wrong, k: (b?.k ?? 0) + 1 }));
    setPhase("checking");
    const line = wrong.length === 1 ? "One sound is in the wrong group. Listen to it again!" : `${wrong.length} sounds are in the wrong groups. Listen to them again!`;
    setNote(line);
    fx.miss();
    if (voiced) void fx.say(line);
    later(() => {
      setBad(null);
      if (m >= TRIES) {
        // The helper shows where each sound goes.
        setPlaced(Object.fromEntries(act.items.map((it) => [it.id, it.bin])));
        setLocked(act.items.map((it) => it.id));
        setShown(wrong);
        setPhase("reveal");
        const help = "Here's where those sounds go. Listen!";
        setNote(help);
        if (voiced) void fx.say(help);
        later(() => onDone(m), 3200);
      } else {
        setPlaced((p) => Object.fromEntries(Object.entries(p).filter(([k]) => !wrong.includes(k))));
        setPhase("sort");
      }
    }, 1400);
  };

  const unplaced = items.filter((it) => !placed[it.id]);
  const compact = act.items.length > 6;
  const cols = act.bins.length <= 4 ? act.bins.length : 3;
  const card = (it: Item, small: boolean) => (
    <div key={it.id} className={cn("l-pop-in relative flex items-center", small ? "gap-1.5" : "gap-2", lifted === it.id && "z-[60]")}>
      <MiniPlay playing={playing === it.id && player.playing} onClick={() => playItem(it, true)} size={small ? 46 : little ? 64 : 56} />
      <SoundCard
        it={it}
        small={small || compact}
        selected={selected === it.id}
        playing={playing === it.id && player.playing}
        bpm={soundOf(it)?.bpm ?? 100}
        locked={locked.includes(it.id)}
        bad={bad?.ids.includes(it.id) ? bad.k : 0}
        hint={shown.includes(it.id)}
        disabled={!canMove(it.id)}
        onTap={() => tapCard(it)}
        onLift={() => {
          sfx("lift");
          setLifted(it.id);
          playItem(it);
        }}
        onDrop={(bin) => {
          setLifted(null);
          put(it.id, bin);
        }}
      />
    </div>
  );

  return (
    <div className="relative flex w-full max-w-[1140px] flex-col items-center gap-3">
      <PromptRow parts={intro}>{act.prompt}</PromptRow>
      <SoundOffNote />
      {/* The cards still to sort (drop a card back here to take it out of a group). A sorted card
          leaves a faded ghost behind, so nothing on the screen jumps around. */}
      <div
        data-drop="tray"
        onClick={() => selected && placed[selected] && put(selected, "tray")}
        className={cn("relative flex min-h-[104px] w-full flex-wrap items-center justify-center gap-x-5 gap-y-3 rounded-[28px] px-3 py-2 transition-colors", selected && placed[selected] && "bg-white/15")}
      >
        {items.map((it) => (placed[it.id] ? <Ghost key={it.id} it={it} small={compact} play={little ? 64 : 56} /> : card(it, false)))}
        {!unplaced.length && (phase === "sort" || phase === "done") && (
          <span className="l-pop-in absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-white px-5 py-2 font-display text-xl font-extrabold text-[var(--l-ink)] shadow-[0_4px_0_rgba(0,40,80,0.15)]">
            <Glyph e={phase === "done" ? "🎉" : "👆"} size={30} />
            {phase === "done" ? "Every sound found its group!" : "All sorted! Now press Check."}
          </span>
        )}
      </div>
      {/* The groups */}
      <div className="grid w-full gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {act.bins.map((b) => {
          const inBin = act.items.filter((it) => placed[it.id] === b.id);
          return (
            <div
              key={b.id}
              data-drop={b.id}
              role="button"
              tabIndex={0}
              aria-label={`Group: ${b.label}`}
              onClick={() => tapBin(b)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") tapBin(b);
              }}
              className={cn("flex flex-col items-center gap-2.5 rounded-[28px] border-[4px] border-dashed p-3 transition-colors", compact ? "min-h-[160px]" : "min-h-[180px]", phase === "done" ? "border-[var(--l-green)] bg-white/40" : selected ? "border-white bg-white/40" : "border-white/80 bg-white/20", phase === "done" && "l-boing")}
            >
              <div className="flex items-center gap-2">
                {b.inst && <MiniPlay playing={playing === `bin:${b.id}` && player.playing} onClick={() => play(`bin:${b.id}`, sampleOf(b.inst!), true)} size={46} />}
                <span className="flex items-center gap-2 rounded-full bg-white px-4 py-1.5 font-display text-2xl font-extrabold text-[var(--l-ink)] shadow-[0_4px_0_var(--l-line)]">
                  {b.emoji ? <GlyphRow s={b.emoji} size={40} /> : b.inst ? <InstrumentPic id={b.inst} size={44} /> : null}
                  <WithGlyphs text={b.label} />
                </span>
                {voiced && <HearButton parts={[b.label]} size={44} label={`Hear: ${b.label}`} />}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5">{inBin.map((it) => card(it, true))}</div>
            </div>
          );
        })}
      </div>
      {/* Check stays put; what it found sits beside it (a button never slides away from a finger). */}
      <div className="relative flex min-h-[72px] items-center justify-center">
        {phase === "sort" || phase === "checking" ? (
          <>
            <Chunk tone="green" onClick={(e) => check(e.currentTarget)} disabled={phase !== "sort"} className={cn("flex h-[68px] items-center gap-2 px-8 font-display text-2xl font-extrabold transition-opacity", allPlaced && phase === "sort" ? "l-pulse" : "opacity-70")}>
              <Check className="h-8 w-8" strokeWidth={3.5} /> Check
            </Chunk>
            {note ? (
              <span key={note} className="l-pop-in absolute right-full top-1/2 mr-4 w-max max-w-[400px] -translate-y-1/2 rounded-[20px] bg-[var(--l-orange)] px-5 py-2 text-center font-display text-lg font-extrabold leading-tight text-white shadow-[0_4px_0_rgba(0,40,80,0.2)]">
                {note}
              </span>
            ) : (
              <span className="absolute right-full top-1/2 mr-4 -translate-y-1/2 whitespace-nowrap font-display text-lg font-extrabold text-white/95">
                {Object.keys(placed).length} of {act.items.length} sorted
              </span>
            )}
            {misses > 0 && phase === "sort" && <span className="absolute left-full top-1/2 ml-4 -translate-y-1/2 whitespace-nowrap font-display text-base font-bold text-white/85">Try {misses + 1} of {TRIES}</span>}
          </>
        ) : (
          note && (
            <span key={note} className="l-pop-in max-w-[560px] rounded-[20px] bg-[var(--l-violet)] px-5 py-2 text-center font-display text-lg font-extrabold leading-tight text-white shadow-[0_4px_0_rgba(0,40,80,0.2)]">
              {note}
            </span>
          )
        )}
      </div>
    </div>
  );
}

/** One sound card: a picture (and its name), draggable to a group. */
function SoundCard({
  it,
  small,
  selected,
  playing,
  bpm,
  locked,
  bad,
  hint,
  disabled,
  onTap,
  onLift,
  onDrop,
}: {
  it: Item;
  small: boolean;
  selected: boolean;
  playing: boolean;
  bpm: number;
  locked: boolean;
  bad: number;
  hint: boolean;
  disabled: boolean;
  onTap: () => void;
  onLift: () => void;
  onDrop: (bin: string | null) => void;
}) {
  const { handlers, dragging } = useDrag({ onTap, onLift, onDrop: (t) => onDrop(t?.dataset.drop ?? null), disabled });
  const label = labelOf(it);
  const edge = bad ? "var(--l-coral-edge)" : locked ? "var(--l-green-edge)" : "var(--l-line)";
  const glow = playing ? ", 0 0 0 5px #ff6fb5, 0 0 26px rgba(255,111,181,0.6)" : locked ? ", 0 0 0 4px var(--l-green)" : "";
  return (
    <div
      {...handlers}
      onClick={(e) => {
        e.stopPropagation();
        if (disabled) onTap();
      }}
      data-dragging={dragging}
      role="button"
      aria-label={label ?? "a sound"}
      className={cn("l-drag l-chunk relative flex items-center", small ? "min-h-[62px] gap-1.5 px-2.5 py-1" : "min-h-[88px] min-w-[132px] gap-2 px-3 py-2", selected && "outline outline-[5px] outline-offset-2 outline-[var(--l-gold)]", hint && "l-hint")}
      style={{ "--f": bad ? "#fff1ef" : "var(--l-card)", "--e": edge, "--beat": `${60 / Math.max(40, bpm)}s`, boxShadow: `0 6px 0 ${edge}${glow}` } as CSSProperties}
    >
      <span key={bad} className={cn("flex items-center", small ? "gap-1.5" : "gap-2", bad > 0 && "l-shake")}>
        <CardFace it={it} small={small} dance={playing} />
      </span>
      {locked && !bad && (
        <span className="l-pop-in absolute -right-2.5 -top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-[0_3px_0_var(--l-green-edge)]">
          <Glyph e="✅" size={28} />
        </span>
      )}
      {bad > 0 && (
        <span className="l-pop-in absolute -right-2.5 -top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-[0_3px_0_var(--l-line)]">
          <Glyph e="❌" size={22} />
        </span>
      )}
    </div>
  );
}

/** What a card shows: its picture (or a note for a mystery sound) and its name. */
function CardFace({ it, small, dance }: { it: Item; small: boolean; dance?: boolean }) {
  const label = labelOf(it);
  return (
    <>
      <span className={cn("block", dance && "m-groove")}>{it.emoji ? <GlyphRow s={it.emoji} size={small ? 44 : 62} /> : it.inst ? <InstrumentPic id={it.inst} size={small ? 46 : 66} /> : <Glyph e="🎵" size={small ? 40 : 56} />}</span>
      {label && (
        <span className={cn("max-w-[170px] font-display font-extrabold leading-tight text-[var(--l-ink)]", small ? "text-base" : "text-xl")}>
          <WithGlyphs text={label} />
        </span>
      )}
    </>
  );
}

/** Where a sorted card used to sit: same size, faded, so the tray never jumps. */
function Ghost({ it, small, play }: { it: Item; small: boolean; play: number }) {
  return (
    <div className="pointer-events-none flex items-center gap-2 opacity-25 grayscale" aria-hidden>
      <span className="shrink-0 rounded-full bg-white/80" style={{ width: play, height: play }} />
      <span className={cn("flex items-center rounded-[22px] border-[3px] border-dashed border-white bg-white/50", small ? "min-h-[62px] gap-1.5 px-2.5 py-1" : "min-h-[88px] min-w-[132px] gap-2 px-3 py-2")}>
        <CardFace it={it} small={small} />
      </span>
    </div>
  );
}
