import { twMerge } from "tailwind-merge";

/** className combiner that resolves conflicting Tailwind utilities (later wins),
 *  so component overrides via `className` reliably beat base classes. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return twMerge(parts.filter(Boolean).join(" "));
}
