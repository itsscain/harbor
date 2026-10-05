"use client";

import { Fragment, memo, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { artUrl } from "./pen";
import { graphemes, isEmoji, picFor, picName } from ".";

// How Harbor Learn shows a picture: content says "🍎", the screen shows the drawing of an apple.
// (Until a picture is drawn, the emoji stands in — `node scripts/learn-art.mjs missing` lists them.)

type Size = number | string;
const px = (s: Size) => (typeof s === "number" ? `${s}px` : s);

/** One picture. `size` is pixels, or a CSS length like "1.2em" to follow the text around it. */
export const Glyph = memo(function Glyph({ e, size, className, style, label }: { e: string; size: Size; className?: string; style?: CSSProperties; label?: string }) {
  const art = picFor(e);
  const box: CSSProperties = { width: px(size), height: px(size), ...style };
  if (!art)
    return (
      <span aria-hidden={label ? undefined : true} aria-label={label} role={label ? "img" : undefined} className={cn("inline-flex shrink-0 select-none items-center justify-center leading-none", className)} style={{ ...box, fontSize: typeof size === "number" ? size * 0.84 : `calc(${size} * 0.84)` }}>
        {e}
      </span>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={artUrl(art)} alt={label ?? ""} aria-hidden={label ? undefined : true} draggable={false} className={cn("pointer-events-none inline-block max-w-none shrink-0 select-none", className)} style={box} />
  );
});

/** Several pictures side by side ("🧔🐑🐑"); anything that isn't an emoji is skipped. */
export function GlyphRow({ s, size, gap = 0.06, className, style }: { s: string; size: Size; gap?: number; className?: string; style?: CSSProperties }) {
  const list = graphemes(s).filter(isEmoji);
  return (
    <span className={cn("inline-flex items-end justify-center", className)} style={{ gap: typeof size === "number" ? size * gap : `calc(${size} * ${gap})`, ...style }}>
      {list.map((g, i) => (
        <Glyph key={i} e={g} size={size} />
      ))}
    </span>
  );
}

/** Text that may hold emoji: the words stay words and each emoji becomes its picture, sized to
 *  the text (pass `size` to override). */
export function WithGlyphs({ text, size = "1.25em", className }: { text: string; size?: Size; className?: string }): ReactNode {
  const parts = graphemes(text);
  if (!parts.some(isEmoji)) return text;
  const out: ReactNode[] = [];
  let buf = "";
  parts.forEach((g, i) => {
    if (isEmoji(g)) {
      if (buf) out.push(<Fragment key={`t${i}`}>{buf}</Fragment>);
      buf = "";
      out.push(<Glyph key={`g${i}`} e={g} size={size} className="mx-[0.06em] align-[-0.28em]" />);
    } else buf += g;
  });
  if (buf) out.push(<Fragment key="end">{buf}</Fragment>);
  return <span className={className}>{out}</span>;
}

/** A picture inside an <svg>, centered on (x, y). */
export function SvgGlyph({ e, x, y, size, className, style }: { e: string; x: number; y: number; size: number; className?: string; style?: CSSProperties }) {
  const art = picFor(e);
  if (!art)
    return (
      <text x={x} y={y + size * 0.32} textAnchor="middle" fontSize={size * 0.84} className={className} style={style}>
        {e}
      </text>
    );
  return <image href={artUrl(art)} x={x - size / 2} y={y - size / 2} width={size} height={size} className={className} style={style} />;
}

/** A string with its emoji taken out (for titles that used to start with one). */
export const withoutEmoji = (s: string) =>
  graphemes(s)
    .filter((g) => !isEmoji(g))
    .join("")
    .replace(/\s{2,}/g, " ")
    .trim();
/** The first emoji in a string, if any. */
export const firstEmoji = (s: string) => graphemes(s).find(isEmoji) ?? "";
export { picName };
