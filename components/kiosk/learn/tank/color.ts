// Small color math for the tank renderer: hex ↔ rgb, mixing (depth fog, night), shading.

type RGB = [number, number, number];

const cache = new Map<string, RGB>();

export function rgb(hex: string): RGB {
  const hit = cache.get(hex);
  if (hit) return hit;
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const v: RGB = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  cache.set(hex, v);
  return v;
}

const hex2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
export const toHex = ([r, g, b]: RGB) => `#${hex2(r)}${hex2(g)}${hex2(b)}`;

/** a → b by t (0..1). */
export function mix(a: string, b: string, t: number): string {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const x = rgb(a);
  const y = rgb(b);
  return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

/** Lighter (amt > 0, toward white) or darker (amt < 0, toward a deep blue-black, so shadows stay
 *  watery instead of muddy). */
export function shade(c: string, amt: number): string {
  return amt >= 0 ? mix(c, "#ffffff", amt) : mix(c, "#0a1630", -amt);
}

export function rgba(c: string, a: number): string {
  const [r, g, b] = rgb(c);
  return `rgba(${r},${g},${b},${a})`;
}
