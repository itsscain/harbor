// Product feature switches.
//
// `ai` — every AI helper (Ask Harbor, flyer scanning, meal planning, patterns, AI profiles,
// voice chat, the wall's voice button) currently needs a parent-pasted Anthropic key, which is a
// dead end for most families. They stay hidden until Harbor ships built-in AI (a platform key,
// offered with Plus) — then flip this on. Code and stored data are untouched while it's off.
export const FEATURES = {
  ai: false,
} as const;
