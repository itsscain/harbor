"use client";

import { useCallback, useState } from "react";
import type { ButtonHTMLAttributes } from "react";
import { haptic, feedback, HAPTIC, type FeedbackEvent } from "@/lib/kiosk/feedback";
import { cn } from "@/lib/cn";

type PressOpts = {
  haptics?: boolean;
  pattern?: number | readonly number[];
  /** Name a feedback event (§3.2) → the press fires the coordinated sound+haptic via
   *  the unified bus. Omit for the legacy haptic-only press (no regression). */
  fx?: FeedbackEvent;
  sound?: boolean;
  intensity?: number;
};

/** The touch contract (HARBOR_V2 §4.2): press in quickly under the finger, fire
 *  coordinated feedback, release with a spring overshoot (the `.pressable` CSS class
 *  carries the transitions). Spread the returned props onto any tappable element
 *  that also has the `pressable` class. */
export function usePress({ haptics = true, pattern = HAPTIC.tapLight, fx, sound, intensity }: PressOpts = {}) {
  const [pressed, setPressed] = useState(false);
  const down = useCallback(() => {
    setPressed(true);
    if (fx) feedback(fx, { haptics, sound, intensity });
    else haptic(pattern, haptics);
  }, [haptics, pattern, fx, sound, intensity]);
  const up = useCallback(() => setPressed(false), []);
  return {
    "data-pressed": pressed ? "true" : undefined,
    onPointerDown: down,
    onPointerUp: up,
    onPointerLeave: up,
    onPointerCancel: up,
  } as const;
}

/** A ready-made pressable <button> for new code. Existing components can instead
 *  add the `pressable` class and spread `usePress(...)`. */
export function Pressable({
  haptics,
  pattern,
  fx,
  sound,
  intensity,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & PressOpts) {
  const press = usePress({ haptics, pattern, fx, sound, intensity });
  return (
    <button className={cn("pressable", className)} {...press} {...rest}>
      {children}
    </button>
  );
}
