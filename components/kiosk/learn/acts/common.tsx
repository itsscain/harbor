"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Activity } from "@/lib/learn/types";
import type { Part } from "@/lib/learn/audio";
import { cn } from "@/lib/cn";
import { Chunk, SpeakerButton, type Tone } from "../kit";

// What every activity gets from the lesson player, and the small pieces most of them share.

export type LessonFx = {
  /** Speak (interrupts whatever was being said). */
  say: (parts: Part | Part[]) => Promise<boolean>;
  /** What the "hear it again" button replays. */
  setPrompt: (parts: Part[]) => void;
  /** A right answer: a combo-climbing chime, stars from the element, and praise (+ extra words). */
  right: (el?: Element | null, extra?: Part[]) => void;
  /** A miss: a soft boop, the combo resets, a gentle "try again" (then the re-prompt). */
  wrong: (el?: Element | null, reprompt?: Part[]) => void;
  /** Stars out of an element (no sound). */
  burst: (el?: Element | null, kind?: "star" | "sea" | "heart", count?: number) => void;
  /** First time this kind of activity shows up in this play (say the long instructions once). */
  firstTime: boolean;
  /** Seed for shuffles — different every play. */
  seed: string;
  reduced: boolean;
};

export type ActProps<K extends Activity["kind"]> = {
  act: Extract<Activity, { kind: K }>;
  fx: LessonFx;
  /** The activity is finished; how many misses it took (the player turns that into stars). */
  onDone: (mistakes: number) => void;
};

/** setTimeout that's cancelled automatically if the activity goes away. */
export function useLater() {
  const timers = useRef<number[]>([]);
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, []);
  return useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
}

/** Register the activity's spoken prompt and say it shortly after it appears (delay < 0: only
 *  register it for the replay button). */
export function usePrompt(fx: LessonFx, parts: Part[], delay = 380) {
  useEffect(() => {
    fx.setPrompt(parts);
    if (delay < 0) return;
    const t = window.setTimeout(() => void fx.say(parts), delay);
    return () => window.clearTimeout(t);
    // Spoken once on mount; the speaker button replays the registered prompt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** The instruction row: replay button + a short line of text (for grown-ups watching, and readers). */
export function PromptRow({ parts, children, className }: { parts: Part[] | null; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-4", className)}>
      <SpeakerButton parts={parts} />
      <p className="min-w-0 text-balance font-display text-2xl font-bold leading-tight text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.25)] sm:text-[28px]">{children}</p>
    </div>
  );
}

/** A sound shown inside a prompt line ("starts with  m"). */
export function SoundChip({ text }: { text: string }) {
  return <span className="font-reading mx-1 inline-block rounded-xl bg-white px-3 py-0.5 align-middle text-[0.95em] font-bold text-[var(--l-ink)] shadow-[0_3px_0_var(--l-line)]">{text.replace("_", "–")}</span>;
}

/** Choice state for "tap the right one" activities: the found answer, misses, which tile to shake. */
export function useChoice(answer: string, fx: LessonFx, onDone: (mistakes: number) => void, opts?: { extra?: Part[]; reprompt?: Part[]; doneDelay?: number }) {
  const [found, setFound] = useState<string | null>(null);
  const [misses, setMisses] = useState(0);
  const [shake, setShake] = useState<{ id: string; n: number } | null>(null);
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const later = useLater();
  const choose = (id: string, el: Element | null) => {
    if (found) return;
    if (id === answer) {
      setFound(id);
      fx.right(el, opts?.extra);
      later(() => onDone(misses), opts?.doneDelay ?? 1250);
    } else {
      setMisses((m) => m + 1);
      setWrongIds((w) => (w.includes(id) ? w : [...w, id]));
      setShake((s) => ({ id, n: (s?.n ?? 0) + 1 }));
      fx.wrong(el, opts?.reprompt);
    }
  };
  return { found, misses, shake, wrongIds, choose, hint: misses >= 2 && !found };
}

export type TileState = "idle" | "right" | "wrong" | "tried" | "hint" | "dim";

/** A big answer tile. */
export function ChoiceTile({
  state,
  shakeKey,
  onPick,
  children,
  className,
  style,
  tone = "white",
  label,
}: {
  state: TileState;
  shakeKey?: number;
  onPick: (el: HTMLElement) => void;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  tone?: Tone;
  label?: string;
}) {
  const t: Tone = state === "right" ? "green" : tone;
  return (
    <Chunk
      tone={t}
      aria-label={label}
      disabled={state === "dim"}
      onClick={(e) => onPick(e.currentTarget)}
      className={cn(
        "relative flex items-center justify-center transition-opacity",
        state === "right" && "l-boing",
        state === "hint" && "l-hint",
        state === "dim" && "opacity-40",
        (state === "wrong" || state === "tried") && "opacity-60",
        className,
      )}
      style={style}
    >
      <span key={shakeKey} className={cn("flex h-full w-full items-center justify-center", state === "wrong" && !!shakeKey && "l-shake")}>
        {children}
      </span>
      {state === "right" && (
        <span className="l-pop-in absolute -right-3 -top-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-2xl shadow-[0_3px_0_var(--l-green-edge)]">✅</span>
      )}
    </Chunk>
  );
}

export function tileState(id: string, c: { found: string | null; shake: { id: string; n: number } | null; hint: boolean; wrongIds: string[] }, answer: string): TileState {
  if (c.found) return id === c.found ? "right" : "dim";
  if (c.hint && id === answer) return "hint";
  if (c.shake?.id === id) return "wrong";
  if (c.wrongIds.includes(id)) return "tried";
  return "idle";
}

/** A big emoji picture on a tile. */
export function Picture({ emoji, size = 112 }: { emoji: string; size?: number }) {
  return (
    <span aria-hidden style={{ fontSize: size, lineHeight: 1 }} className="select-none">
      {emoji}
    </span>
  );
}
