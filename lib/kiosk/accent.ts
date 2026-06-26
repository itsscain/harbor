// Child-accent pipeline (HARBOR_V2 §3.5): each child stores ONE hex; we derive a
// full ramp at runtime so their color can suffuse their whole experience —
// surface tint, border, legible text, and a bloom/glow color. Pure (no deps).

export type AccentRamp = {
  accent: string; // the raw color
  bright: string; // +lightness — highlights, sails, lit buoys
  deep: string; // -lightness, +sat — fills / strokes / track
  bg: string; // very dark tint for surfaces
  line: string; // border / hairline
  text: string; // legible accent text on the dark wall
  glow: string; // bloom color (use as --bloom-color)
};

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

/** #RGB or #RRGGBB → [h(0-360), s(0-100), l(0-100)]. Falls back to harbor water. */
export function hexToHsl(hex: string): [number, number, number] {
  let m = (hex || "").trim().replace("#", "");
  if (m.length === 3) m = m.split("").map((c) => c + c).join("");
  if (m.length !== 6 || /[^0-9a-fA-F]/.test(m)) return [191, 67, 54]; // kwater-ish
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return [h, Math.round(s * 100), Math.round(l * 100)];
}

/** Derive the full ramp from a single stored hex. */
export function accentRamp(hex: string): AccentRamp {
  const [h, s, l] = hexToHsl(hex);
  const sat = clamp(s, 30, 95);
  return {
    accent: hex,
    bright: `hsl(${h} ${clamp(sat, 0, 100)}% ${clamp(l + 12, 0, 92)}%)`,
    deep: `hsl(${h} ${clamp(sat + 10, 0, 100)}% ${clamp(l - 18, 16, 100)}%)`,
    bg: `hsl(${h} ${Math.round(sat * 0.5)}% 11%)`,
    line: `hsl(${h} ${Math.round(sat * 0.45)}% 28%)`,
    text: `hsl(${h} ${clamp(sat + 12, 0, 96)}% ${Math.max(76, l)}%)`,
    glow: `hsl(${h} ${sat}% 55% / 0.45)`,
  };
}

/** The per-child accent ramp as CSS custom properties for the ChildView root, so
 *  the whole view (and its SVG) reads one child's color (ChildView Visual Spec §2.2).
 *  Swapping the child's hex re-suffuses everything automatically. */
export function accentVars(hex: string): Record<string, string> {
  const r = accentRamp(hex);
  const [h, s] = hexToHsl(hex);
  const sat = clamp(s, 30, 95);
  return {
    "--accent": r.accent,
    "--accent-bright": r.bright,
    "--accent-deep": r.deep,
    "--accent-glow": r.glow,
    "--accent-soft": `hsl(${h} ${sat}% 60% / 0.14)`,
    "--accent-text": r.text,
  } as Record<string, string>;
}
