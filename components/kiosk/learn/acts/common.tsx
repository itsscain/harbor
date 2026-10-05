"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { Volume2 } from "lucide-react";
import type { Activity } from "@/lib/learn/types";
import type { VoiceLevel } from "@/lib/learn/script";
import type { BoatLook } from "@/lib/learn/meta";
import { partsKey, say, speakingNow, subscribeVoice, type Part } from "@/lib/learn/audio";
import { cn } from "@/lib/cn";
import { sfx } from "@/lib/learn/sfx";
import { Chunk, SpeakerButton, type Tone } from "../kit";
import { Glyph, GlyphRow, WithGlyphs } from "../art/Glyph";

// What every activity gets from the lesson player, and the small pieces most of them share.

export type LessonFx = {
  /** How much this child hears without asking: all (can't read yet) · core · keys (reads alone). */
  voice: VoiceLevel;
  /** The child's boat (it sails the coding puzzles). */
  look?: BoatLook;
  /** A miss without words (the activity says what went wrong itself): resets the combo. */
  miss: () => void;
  /** Show a short "here's why" bubble (spoken for children who need it); resolves when it's done. */
  explain: (text: string, parts?: Part[]) => Promise<void>;
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
  /** Has this child finished a tutorial (e.g. "boat")? Unskippable tutorials run until they have. */
  tutorialDone: (id: string) => boolean;
  completeTutorial: (id: string) => void;
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

/** What to say for an item's prompt: its named voice keys, or its text for children who need
 *  everything read. `auto` = say it on arrival (a reader just gets the replay button). */
export function spoken(fx: LessonFx, say: Part[] | undefined, text: string): { parts: Part[]; auto: boolean } {
  if (say?.length) return { parts: say, auto: true };
  return { parts: text ? [text] : [], auto: fx.voice !== "keys" };
}
export function useSpokenPrompt(fx: LessonFx, say: Part[] | undefined, text: string, delay = 380) {
  const { parts, auto } = spoken(fx, say, text);
  usePrompt(fx, parts, auto ? delay : -1);
  return parts;
}

/** How much this child hears (set by the lesson player), so shared pieces can size themselves:
 *  a child who can't read gets bigger speaker buttons. */
export const VoiceCtx = createContext<VoiceLevel>("keys");

/** True while exactly these words are being spoken. */
export function useSpeaking(parts: Part[] | null | undefined): boolean {
  const now = useSyncExternalStore(subscribeVoice, speakingNow, () => null);
  return !!parts?.length && now === partsKey(parts);
}

/** A big "hear it" button. It lights up (rings ripple out) while its words play. */
export function HearButton({ parts, size = 64, label = "Hear this answer", className }: { parts: Part[]; size?: number; label?: string; className?: string }) {
  const on = useSpeaking(parts);
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        sfx("tap");
        void say(parts);
      }}
      className={cn("relative flex shrink-0 items-center justify-center rounded-full text-white transition-transform active:translate-y-1", on ? "bg-[var(--l-violet)] shadow-[0_5px_0_var(--l-violet-edge)]" : "bg-[var(--l-blue)] shadow-[0_5px_0_var(--l-blue-edge)]", className)}
      style={{ width: size, height: size }}
    >
      {on && <span className="l-hear-ring pointer-events-none absolute inset-0 rounded-full" aria-hidden />}
      <Volume2 style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={2.6} className={cn(on && "l-hear-wiggle")} />
    </button>
  );
}

/** An answer with its own "hear it" button OUTSIDE it — beside it (`left`) or under it (`below`),
 *  with a real gap — so a child who can't read can listen to every choice without picking one by
 *  accident. While its words play, the answer glows too, so the sound and the choice connect. */
export function Hearable({ parts, side = "left", children, className }: { parts: Part[] | null | undefined; side?: "left" | "below"; children: ReactNode; className?: string }) {
  const voice = useContext(VoiceCtx);
  const on = useSpeaking(parts);
  if (!parts?.length) return <div className={cn("relative", className)}>{children}</div>;
  const size = voice === "all" ? 64 : 56;
  return (
    <div className={cn("flex", side === "left" ? "flex-row items-center gap-3" : "flex-col items-center gap-2.5", className)}>
      {side === "left" && <HearButton parts={parts} size={size} />}
      <div className={cn("relative w-full min-w-0 flex-1 rounded-[24px] transition-shadow duration-200", on && "shadow-[0_0_0_5px_var(--l-violet),0_0_28px_rgba(139,108,255,0.55)]")}>{children}</div>
      {side === "below" && <HearButton parts={parts} size={size} />}
    </div>
  );
}

/** A little round "hear this one" button that sits on a card that ISN'T an answer (a sentence, a
 *  story line). Answers use Hearable, which keeps the button clear of the thing you tap to answer. */
export function MiniSpeaker({ parts, className, light }: { parts: Part[]; className?: string; light?: boolean }) {
  return (
    <button
      type="button"
      aria-label="Hear it"
      onClick={(e) => {
        e.stopPropagation();
        sfx("tap");
        void say(parts);
      }}
      className={cn("absolute z-[2] flex h-10 w-10 items-center justify-center rounded-full shadow-[0_3px_0_rgba(0,40,80,0.18)]", light ? "bg-white/90 text-[var(--l-blue)]" : "bg-[var(--l-blue)] text-white", className)}
    >
      <Volume2 className="h-5 w-5" strokeWidth={2.6} />
    </button>
  );
}

/** The question card: the replay button and the question, on white so it reads on any sea. */
export function PromptRow({ parts, children, className }: { parts: Part[] | null; children: ReactNode; className?: string }) {
  // A child who can't read leans on this button the most: make it big.
  const voice = useContext(VoiceCtx);
  return (
    <div className={cn("l-prompt-in flex max-w-[min(94vw,940px)] items-center gap-4 rounded-[32px] bg-white/95 py-2.5 pl-2.5 pr-7 shadow-[0_6px_0_rgba(0,40,80,0.14),0_16px_34px_rgba(0,40,80,0.14)]", className)}>
      <SpeakerButton parts={parts} size={voice === "all" ? 70 : voice === "core" ? 62 : 56} />
      <p className="min-w-0 text-balance font-display text-2xl font-extrabold leading-tight text-[var(--l-ink)] sm:text-[28px]">{typeof children === "string" ? <WithGlyphs text={children} /> : children}</p>
    </div>
  );
}

/** A sound shown inside a prompt line ("starts with  m"). */
export function SoundChip({ text }: { text: string }) {
  return <span className="font-reading mx-1 inline-block rounded-xl bg-[#fff3c4] px-3 py-0.5 align-middle text-[0.95em] font-bold text-[var(--l-ink)] shadow-[0_3px_0_#f2d27a]">{text.replace("_", "–")}</span>;
}

/** Choice state for "tap the right one" activities: the found answer, misses, which tile to shake.
 *  After a miss, the right answer comes with its "why" (that's when it teaches the most). */
export function useChoice(answer: string, fx: LessonFx, onDone: (mistakes: number) => void, opts?: { extra?: Part[]; reprompt?: Part[]; doneDelay?: number; why?: string; whyParts?: Part[] }) {
  const [found, setFound] = useState<string | null>(null);
  const [misses, setMisses] = useState(0);
  const [shake, setShake] = useState<{ id: string; n: number } | null>(null);
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const later = useLater();
  const choose = (id: string, el: Element | null) => {
    if (found) return;
    // Tapping an answer that already turned out wrong just wiggles it — it isn't another guess.
    if (wrongIds.includes(id)) {
      setShake((s) => ({ id, n: (s?.n ?? 0) + 1 }));
      sfx("soft-fail");
      return;
    }
    if (id === answer) {
      setFound(id);
      fx.right(el, opts?.extra);
      if (misses > 0 && opts?.why) {
        const why = opts.why;
        later(() => void fx.explain(why, opts.whyParts).then(() => onDone(misses)), 1100);
      } else later(() => onDone(misses), opts?.doneDelay ?? 1250);
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
        "l-tile relative flex items-center justify-center transition-[opacity,filter] duration-200",
        state === "right" && "l-boing",
        state === "hint" && "l-hint",
        state === "dim" && "opacity-40 saturate-50",
        (state === "wrong" || state === "tried") && "opacity-55 saturate-[0.35]",
        className,
      )}
      style={style}
    >
      <span key={shakeKey} className={cn("flex h-full w-full items-center justify-center", state === "wrong" && !!shakeKey && "l-shake")}>
        {children}
      </span>
      {state === "right" && (
        <span className="l-pop-in absolute -right-3 -top-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-[0_3px_0_var(--l-green-edge)]">
          <Glyph e="✅" size={40} />
        </span>
      )}
      {(state === "wrong" || state === "tried") && (
        <span className="l-pop-in absolute -right-2.5 -top-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-[0_3px_0_var(--l-line)]">
          <Glyph e="❌" size={26} />
        </span>
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

/** A big picture on a tile (the drawing for the content's emoji) — drawn pictures have their own
 *  margin, so they're shown a good deal bigger than the emoji font was. */
export function Picture({ emoji, size = 112 }: { emoji: string; size?: number }) {
  return <GlyphRow s={emoji} size={size * 1.32} />;
}
