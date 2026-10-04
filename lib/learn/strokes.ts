// How to write each lowercase letter, stroke by stroke, the way kindergarten handwriting is
// taught (ball-and-stick: start at the top, circles go counter-clockwise). Coordinates live in a
// 100×100 box on handwriting lines: top 8, dashed middle 40, baseline 76, tail 98. Each stroke
// is a run of points ~2.5 apart; a one-point stroke is a dot (tap it).

export type Pt = { x: number; y: number };
export type Stroke = Pt[];

export const LINES = { top: 8, mid: 40, base: 76, tail: 98 };

const STEP = 2.5;

function line(x1: number, y1: number, x2: number, y2: number): Pt[] {
  const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / STEP));
  return Array.from({ length: n + 1 }, (_, i) => ({ x: x1 + ((x2 - x1) * i) / n, y: y1 + ((y2 - y1) * i) / n }));
}

/** An elliptical arc; angles in degrees, 0 = 3 o'clock, increasing = clockwise on screen. */
function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number): Pt[] {
  const len = (Math.abs(a1 - a0) * Math.PI * (rx + ry)) / 360;
  const n = Math.max(2, Math.round(len / STEP));
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  });
}

const join = (...segs: Pt[][]): Pt[] => segs.flatMap((s, i) => (i === 0 ? s : s.slice(1)));
const dot = (x: number, y: number): Stroke => [{ x, y }];

// The round letters share one "magic c" circle that starts at two o'clock.
const ball = (cx = 48) => arc(cx, 58, 16, 18, -30, -390);

export const STROKES: Record<string, Stroke[]> = {
  a: [ball(), line(64, 40, 64, 76)],
  b: [line(34, 8, 34, 76), arc(50, 58, 16, 18, 180, 540)],
  c: [arc(52, 58, 16, 18, -40, -320)],
  d: [ball(), line(64, 8, 64, 76)],
  e: [join(line(34, 58, 66, 58), arc(50, 58, 16, 18, 0, -320))],
  f: [join(arc(56, 18, 10, 10, -20, -180), line(46, 18, 46, 76)), line(34, 40, 60, 40)],
  g: [ball(), join(line(64, 40, 64, 90), arc(53, 90, 11, 8, 0, 165))],
  h: [line(34, 8, 34, 76), join(arc(50, 56, 16, 16, 180, 360), line(66, 56, 66, 76))],
  i: [line(50, 40, 50, 76), dot(50, 24)],
  j: [join(line(54, 40, 54, 90), arc(44, 90, 10, 8, 0, 165)), dot(54, 24)],
  k: [line(36, 8, 36, 76), join(line(64, 40, 37, 60), line(37, 60, 66, 76))],
  l: [line(50, 8, 50, 76)],
  m: [line(28, 40, 28, 76), join(arc(38, 52, 10, 12, 180, 360), line(48, 52, 48, 76)), join(arc(58, 52, 10, 12, 180, 360), line(68, 52, 68, 76))],
  n: [line(34, 40, 34, 76), join(arc(50, 54, 16, 14, 180, 360), line(66, 54, 66, 76))],
  o: [arc(50, 58, 16, 18, -90, -450)],
  p: [line(34, 40, 34, 98), arc(50, 58, 16, 18, 180, 540)],
  q: [ball(), line(64, 40, 64, 98)],
  r: [line(36, 40, 36, 76), arc(50, 54, 14, 12, 180, 310)],
  s: [join(arc(50, 49, 13, 9, -20, -270), arc(50, 67, 13, 9, -90, 160))],
  t: [join(line(48, 12, 48, 68), arc(56, 68, 8, 8, 180, 30)), line(36, 40, 62, 40)],
  u: [join(line(34, 40, 34, 60), arc(50, 60, 16, 16, 180, 0), line(66, 60, 66, 40)), line(66, 40, 66, 76)],
  v: [join(line(34, 40, 50, 76), line(50, 76, 66, 40))],
  w: [join(line(24, 40, 37, 76), line(37, 76, 50, 48), line(50, 48, 63, 76), line(63, 76, 76, 40))],
  x: [line(34, 40, 66, 76), line(66, 40, 34, 76)],
  y: [line(34, 40, 51, 70), line(66, 40, 40, 98)],
  z: [join(line(34, 40, 66, 40), line(66, 40, 34, 76), line(34, 76, 66, 76))],
};

/** SVG path for a stroke ("M x y L …"). */
export function strokePath(s: Stroke): string {
  return s.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
}

/** The direction a stroke starts in (for the little arrow at its start dot), in degrees. */
export function startAngle(s: Stroke): number {
  const a = s[0];
  const b = s[Math.min(s.length - 1, 3)];
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}
