"use client";

import { useCallback, useState } from "react";
import type { ButtonHTMLAttributes } from "react";
import { haptic, HAPTIC } from "@/lib/kiosk/feedback";
import { cn } from "@/lib/cn";

type PressOpts = { haptics?: boolean; pattern?: number | readonly number[] };

/** The touch contract (HARBOR_V2 §4.2): press in quickly under the finger, fire
 *  a light haptic, release with a spring overshoot (the `.pressable` CSS class
 *  carries the transitions). Spread the returned props onto any tappable element
 *  that also has the `pressable` class. */
export function usePress({ haptics = true, pattern = HAPTIC.tapLight }: PressOpts = {}) {
  const [pressed, setPressed] = useState(false);
  const down = useCallback(() => {
    setPressed(true);
    haptic(pattern, haptics);
  }, [haptics, pattern]);
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
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & PressOpts) {
  const press = usePress({ haptics, pattern });
  return (
    <button className={cn("pressable", className)} {...press} {...rest}>
      {children}
    </button>
  );
}
