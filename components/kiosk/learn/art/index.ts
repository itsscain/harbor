// Every picture in Harbor Learn, keyed by the emoji the content uses for it. Content stays plain
// (an item says "🍎"), and the UI shows the drawing for it — never the emoji font. Each category
// file is a list of [emoji, name, drawing]; pictures are drawn the first time they're shown.

import { draw, type Art, type Pen } from "./pen";
import { PEOPLE } from "./pics/people";
import { FACES } from "./pics/faces";
import { ANIMALS } from "./pics/animals";
import { WILD } from "./pics/wild";
import { FOOD } from "./pics/food";
import { NATURE } from "./pics/nature";
import { HOME } from "./pics/home";
import { PLAY } from "./pics/play";
import { TOOLS } from "./pics/tools";
import { SCHOOL } from "./pics/school";
import { PLACES } from "./pics/places";
import { SYMBOLS } from "./pics/symbols";

/** One picture: the emoji it stands for, a plain name (also its alt text), and how to draw it. */
export type PicDef = [emoji: string, name: string, draw: (d: Pen) => void];

export const CATEGORIES: Record<string, PicDef[]> = {
  people: PEOPLE,
  faces: FACES,
  animals: ANIMALS,
  wild: WILD,
  food: FOOD,
  nature: NATURE,
  home: HOME,
  play: PLAY,
  tools: TOOLS,
  school: SCHOOL,
  places: PLACES,
  symbols: SYMBOLS,
};

/** The lookup key: no variation selectors or skin-tone modifiers (our people have their own). */
export const picKey = (e: string) => e.replace(/️/g, "").replace(/[\u{1F3FB}-\u{1F3FF}]/gu, "").trim();

const BY = new Map<string, PicDef>();
for (const list of Object.values(CATEGORIES)) for (const def of list) if (!BY.has(picKey(def[0]))) BY.set(picKey(def[0]), def);
const cache = new Map<string, Art>();

/** The drawing for an emoji, or null if it hasn't been drawn yet. */
export function picFor(e: string): Art | null {
  const k = picKey(e);
  const hit = cache.get(k);
  if (hit) return hit;
  const def = BY.get(k);
  if (!def) return null;
  const art = draw(def[2]);
  cache.set(k, art);
  return art;
}
export const hasPic = (e: string) => BY.has(picKey(e));
/** The plain name of a picture ("apple"), for alt text. */
export const picName = (e: string) => BY.get(picKey(e))?.[1] ?? "";
export const picCount = () => BY.size;

const SEG = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
const EMOJI = /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u;
/** Split a string into graphemes (an emoji with modifiers or joiners counts as one). */
export function graphemes(s: string): string[] {
  if (SEG) return [...SEG.segment(s)].map((x) => x.segment);
  return [...s];
}
export const isEmoji = (g: string) => EMOJI.test(g);
/** The emoji in a string, in order. */
export const emojisIn = (s: string) => graphemes(s).filter(isEmoji);
