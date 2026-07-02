"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { skipperLine, type SkipperCategory, type SkipperContext } from "@/lib/lantern/skipper-lines";
import { cn } from "@/lib/cn";

const ALL: SkipperCategory[] = ["greet", "cheer", "tip", "joke", "mindful", "celebrate"];

/** Group the device's cached AI lines by category so they blend into the curated pools. */
function groupByCategory(lines?: { text: string; category: string }[]): Partial<Record<SkipperCategory, string[]>> {
  if (!lines || lines.length === 0) return {};
  const out: Partial<Record<SkipperCategory, string[]>> = {};
  for (const l of lines) {
    const cat = (ALL.includes(l.category as SkipperCategory) ? l.category : "cheer") as SkipperCategory;
    (out[cat] ??= []).push(l.text);
  }
  return out;
}

/** Skipper's little brain: rotates a line every ~9s and lets the caller `bump` an event (a step
 *  completion, finishing the day, opening a routine) to change what he's thinking right away. */
export function useSkipperTalk(
  ctx: { name: string; hour: number; done: number; total: number; routine?: string; night?: boolean },
  aiLines?: { text: string; category: string }[],
) {
  const { name, hour, done, total, routine, night } = ctx;
  const [tick, setTick] = useState(1);
  const [event, setEvent] = useState<SkipperContext["event"]>("open");

  useEffect(() => {
    const id = window.setInterval(() => {
      setEvent("idle");
      setTick((t) => t + 1);
    }, 9000);
    return () => window.clearInterval(id);
  }, []);

  const bump = useCallback((e: SkipperContext["event"]) => {
    setEvent(e);
    setTick((t) => t + 1);
  }, []);

  const extra = useMemo(() => groupByCategory(aiLines), [aiLines]);
  const line = useMemo(
    () => skipperLine({ name, hour, done, total, routine, night, event }, tick, extra),
    [name, hour, done, total, routine, night, event, tick, extra],
  );

  return { line, bump };
}

const TINT: Record<SkipperCategory, string> = {
  greet: "#18606f",
  cheer: "#18606f",
  tip: "#0f6e56",
  joke: "#b06a10",
  mindful: "#534ab7",
  celebrate: "#b06a10",
};

/** A cute thought bubble for Skipper. Tap it for another line. Pops in when the text changes;
 *  fully still under reduced motion. The two trailing dots read as a thought-bubble tail. */
export function SkipperBubble({
  text,
  category = "cheer",
  reducedMotion = false,
  onTap,
  className,
}: {
  text: string;
  category?: SkipperCategory;
  reducedMotion?: boolean;
  onTap?: () => void;
  className?: string;
}) {
  if (!text) return null;
  return (
    <button
      type="button"
      onClick={onTap}
      aria-label="Skipper says — tap for another"
      className={cn("group relative block max-w-[min(78vw,360px)] text-left", className)}
    >
      <div
        key={text}
        className={cn(
          "relative rounded-2xl rounded-bl-md bg-white px-3.5 py-2 shadow-sm ring-1 ring-harbor-100",
          !reducedMotion && "sk-pop",
        )}
      >
        <p className="text-[clamp(12px,1.9vh,14.5px)] font-semibold leading-snug" style={{ color: TINT[category] }}>
          {text}
        </p>
      </div>
      {/* thought-bubble tail — two little dots trailing toward Skipper */}
      <span className="absolute -bottom-1 left-2 h-2.5 w-2.5 rounded-full bg-white ring-1 ring-harbor-100" />
      <span className="absolute -bottom-2.5 left-0 h-1.5 w-1.5 rounded-full bg-white ring-1 ring-harbor-100" />
    </button>
  );
}

/** Self-contained bubble that rotates its own lines — for places (like the Home hero) that don't
 *  need to drive Skipper from outside. Tapping it shows another thought. */
export function SkipperSays({
  name,
  hour,
  done,
  total,
  routine,
  night,
  aiLines,
  reducedMotion,
  className,
}: {
  name: string;
  hour: number;
  done: number;
  total: number;
  routine?: string;
  night?: boolean;
  aiLines?: { text: string; category: string }[];
  reducedMotion?: boolean;
  className?: string;
}) {
  const { line, bump } = useSkipperTalk({ name, hour, done, total, routine, night }, aiLines);
  return (
    <SkipperBubble
      text={line.text}
      category={line.category}
      reducedMotion={reducedMotion}
      onTap={() => bump("idle")}
      className={className}
    />
  );
}
