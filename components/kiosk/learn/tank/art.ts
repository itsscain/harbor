import type { EggTier } from "@/lib/learn/reef";
import type { FoodKind } from "@/lib/learn/aquarium";

// The aquarium's illustrations, as SVG: every decoration, the three eggs, the foods. The same
// art is drawn into the tank canvas and shown in the shop panels (no emoji anywhere). Each
// decoration sits on the middle of its bottom edge.

const OL = "#2a2f45";

export type Art = { svg: string; w: number; h: number };

const svg = (w: number, h: number, body: string): Art => ({
  w,
  h,
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 4}" height="${h * 4}">${body}</svg>`,
});
const lin = (id: string, stops: [number, string][], x2 = 0, y2 = 1) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("")}</linearGradient>`;
const rad = (id: string, stops: [number, string, number?][], cx = 0.35, cy = 0.3, r = 0.8) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a ?? 1}"/>`).join("")}</radialGradient>`;
const shine = (cx: number, cy: number, rx: number, ry: number, a = 0.45) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" opacity="${a}"/>`;

export const DECOR_ART: Record<string, Art> = {
  grass: svg(100, 100, `${lin("g", [[0, "#7ee07a"], [1, "#1f8a4c"]])}
    ${[[30, -18], [42, -6], [52, 4], [62, 14], [72, 22]].map(([x, b], i) => `<path d="M${x} 100 Q${x + b * 0.4} ${60 - i * 4} ${x + b} ${12 + (i % 2) * 10}" stroke="url(#g)" stroke-width="${9 - (i % 2) * 2}" fill="none" stroke-linecap="round"/>`).join("")}
    <path d="M18 100 Q22 70 12 40" stroke="#3fae5f" stroke-width="7" fill="none" stroke-linecap="round"/>`),
  flower: svg(110, 100, `${rad("a", [[0, "#ffd1ec"], [1, "#e44a9b"]], 0.5, 0.2, 0.9)}${lin("b", [[0, "#ffb0d6"], [1, "#c03a82"]])}
    <path d="M40 100 L44 70 Q55 62 66 70 L70 100 Z" fill="url(#b)" stroke="${OL}" stroke-width="2.5"/>
    ${Array.from({ length: 13 }, (_, i) => { const a = Math.PI * (0.08 + (i / 12) * 0.84); const x = 55 - Math.cos(a) * 38; const y = 66 - Math.sin(a) * 42; return `<path d="M55 68 Q${(55 + x) / 2 + (i % 2 ? 4 : -4)} ${(66 + y) / 2} ${x.toFixed(1)} ${y.toFixed(1)}" stroke="url(#a)" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="#ffe3f2" stroke="${OL}" stroke-width="1.5"/>`; }).join("")}`),
  rock: svg(120, 80, `${lin("r", [[0, "#b9c6d6"], [0.6, "#7e8ea5"], [1, "#55627a"]])}
    <path d="M6 80 Q4 50 24 34 Q38 14 62 16 Q92 12 108 36 Q120 56 114 80 Z" fill="url(#r)" stroke="${OL}" stroke-width="3"/>
    <path d="M44 30 Q52 44 46 58 M80 26 Q76 40 86 50" stroke="#5b6880" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M20 44 Q30 34 44 36 Q38 46 22 50 Z" fill="#6fbf62" opacity="0.85"/>${shine(70, 28, 22, 7, 0.4)}`),
  shell: svg(120, 90, `${lin("s", [[0, "#ffe6ef"], [1, "#f39bb7"]])}${lin("i", [[0, "#ffd0de"], [1, "#e98aa8"]])}
    <path d="M10 82 Q8 70 18 66 L102 66 Q112 70 110 82 Z" fill="url(#i)" stroke="${OL}" stroke-width="2.5"/>
    <circle cx="60" cy="62" r="11" fill="#fdfbff" stroke="${OL}" stroke-width="2"/>${shine(56, 58, 4, 3, 0.9)}
    <path d="M12 66 Q14 14 60 10 Q106 14 108 66 Z" fill="url(#s)" stroke="${OL}" stroke-width="3"/>
    ${[22, 36, 50, 60, 70, 84, 98].map((x) => `<path d="M60 64 L${x} ${x < 60 ? 20 + (60 - x) * 0.3 : 20 + (x - 60) * 0.3}" stroke="#e57aa0" stroke-width="2" opacity="0.8"/>`).join("")}${shine(48, 24, 16, 6, 0.5)}`),
  star: svg(100, 60, `${lin("st", [[0, "#ffb26b"], [1, "#f06a2b"]])}
    <path d="M50 6 L60 26 L92 26 L66 38 L76 58 L50 46 L24 58 L34 38 L8 26 L40 26 Z" fill="url(#st)" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>
    ${[[50, 18], [62, 31], [38, 31], [56, 44], [44, 44], [50, 32]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#ffe3c2"/>`).join("")}${shine(46, 18, 8, 3, 0.5)}`),
  mushroom: svg(100, 100, `${rad("m", [[0, "#e9fffb"], [0.5, "#5ef2d2"], [1, "#11a88e"]], 0.4, 0.3, 0.8)}${lin("st", [[0, "#fff8ec"], [1, "#d9c9ad"]])}
    <circle cx="44" cy="42" r="40" fill="#5ef2d2" opacity="0.18"/>
    <path d="M38 100 Q36 70 42 50 L54 50 Q58 74 56 100 Z" fill="url(#st)" stroke="${OL}" stroke-width="2.5"/>
    <path d="M12 52 Q14 16 47 14 Q80 16 82 52 Q47 60 12 52 Z" fill="url(#m)" stroke="${OL}" stroke-width="3"/>
    ${[[30, 32, 5], [50, 26, 6], [66, 38, 4], [44, 44, 3.5]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#e9fffb"/>`).join("")}
    <path d="M70 100 Q69 86 72 78 L80 78 Q82 90 81 100 Z" fill="url(#st)" stroke="${OL}" stroke-width="2"/>
    <path d="M60 80 Q62 62 76 61 Q90 62 92 80 Q76 84 60 80 Z" fill="url(#m)" stroke="${OL}" stroke-width="2.5"/>${shine(36, 24, 12, 5, 0.6)}`),
  anchor: svg(100, 110, `${lin("a", [[0, "#9aa7b8"], [1, "#4f5b6d"]], 1, 1)}
    <g transform="rotate(-14 50 60)">
    <rect x="45" y="16" width="10" height="78" rx="4" fill="url(#a)" stroke="${OL}" stroke-width="2.5"/>
    <circle cx="50" cy="13" r="9" fill="none" stroke="${OL}" stroke-width="8"/><circle cx="50" cy="13" r="9" fill="none" stroke="#7b8799" stroke-width="5"/>
    <rect x="26" y="28" width="48" height="9" rx="4" fill="url(#a)" stroke="${OL}" stroke-width="2.5"/>
    <path d="M14 70 Q22 96 50 98 Q78 96 86 70 L78 74 Q72 88 50 90 Q28 88 22 74 Z" fill="url(#a)" stroke="${OL}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M10 66 L20 76 L22 64 Z M90 66 L80 76 L78 64 Z" fill="#6b7789" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="58" cy="50" r="4" fill="#b5713a" opacity="0.8"/><circle cx="44" cy="80" r="3" fill="#b5713a" opacity="0.7"/></g>
    <path d="M36 22 Q20 40 30 60 Q40 74 28 92" stroke="#c9a46a" stroke-width="4" fill="none" stroke-linecap="round"/>`),
  chest: svg(120, 100, `${lin("w", [[0, "#c98a4b"], [1, "#7a4a22"]])}${lin("l", [[0, "#d99a58"], [1, "#9a5f2c"]])}${rad("gl", [[0, "#fff5b0"], [1, "#ffd23a", 0]], 0.5, 0.6, 0.6)}
    <ellipse cx="60" cy="44" rx="46" ry="26" fill="url(#gl)"/>
    <rect x="12" y="46" width="96" height="50" rx="6" fill="url(#w)" stroke="${OL}" stroke-width="3"/>
    <path d="M14 60 H106 M14 76 H106" stroke="#5e3716" stroke-width="2" opacity="0.6"/>
    <path d="M10 48 Q12 20 60 18 Q108 20 110 48 Z" fill="url(#l)" stroke="${OL}" stroke-width="3" transform="rotate(-12 12 48)"/>
    <rect x="12" y="44" width="96" height="8" fill="#ffcf3a" stroke="${OL}" stroke-width="2.5"/>
    <rect x="54" y="52" width="12" height="16" rx="2" fill="#ffcf3a" stroke="${OL}" stroke-width="2.5"/>
    <circle cx="44" cy="40" r="5" fill="#ffe07a" stroke="${OL}" stroke-width="1.5"/><circle cx="58" cy="36" r="5" fill="#ffe07a" stroke="${OL}" stroke-width="1.5"/><circle cx="72" cy="40" r="5" fill="#ffe07a" stroke="${OL}" stroke-width="1.5"/>`),
  pineapple: svg(110, 150, `${lin("p", [[0, "#ffd75a"], [1, "#e9a21a"]], 1, 1)}${lin("lf", [[0, "#6fe07a"], [1, "#1f8a4c"]])}
    <path d="M55 46 Q40 20 26 8 Q48 14 55 30 Q60 6 72 0 Q66 22 60 38 Q76 18 92 14 Q76 30 62 48 Z" fill="url(#lf)" stroke="${OL}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M14 150 Q8 96 22 70 Q38 44 55 44 Q72 44 88 70 Q102 96 96 150 Z" fill="url(#p)" stroke="${OL}" stroke-width="3"/>
    <path d="M24 64 L92 132 M18 92 L74 148 M40 52 L100 112 M86 64 L18 132 M92 92 L36 148 M70 52 L10 112" stroke="#c98a12" stroke-width="2.2" opacity="0.7"/>
    <path d="M40 150 V122 Q40 106 55 106 Q70 106 70 122 V150 Z" fill="#5b8fd6" stroke="${OL}" stroke-width="2.5"/>
    <circle cx="64" cy="128" r="2.5" fill="#ffd23a"/>
    <circle cx="72" cy="80" r="11" fill="#bfe8ff" stroke="${OL}" stroke-width="3"/>${shine(69, 77, 4, 3, 0.8)}${shine(36, 70, 8, 14, 0.25)}`),
  castle: svg(170, 150, `${lin("c", [[0, "#ffe6b0"], [1, "#d9a85a"]])}${lin("d", [[0, "#fff1cf"], [1, "#e6b96d"]])}
    <path d="M8 150 L8 96 L30 96 L30 150 Z M140 150 L140 96 L162 96 L162 150 Z" fill="url(#c)" stroke="${OL}" stroke-width="3"/>
    ${[8, 140].map((x) => `<path d="M${x - 2} 96 L${x - 2} 86 L${x + 5} 86 L${x + 5} 92 L${x + 11} 92 L${x + 11} 86 L${x + 18} 86 L${x + 18} 92 L${x + 24} 92 L${x + 24} 86 L${x + 24} 96 Z" fill="url(#d)" stroke="${OL}" stroke-width="2.5"/>`).join("")}
    <path d="M30 150 L30 72 L140 72 L140 150 Z" fill="url(#c)" stroke="${OL}" stroke-width="3"/>
    <path d="M28 72 L28 60 L40 60 L40 66 L52 66 L52 60 L64 60 L64 66 L76 66 L76 60 L94 60 L94 66 L106 66 L106 60 L118 60 L118 66 L130 66 L130 60 L142 60 L142 72 Z" fill="url(#d)" stroke="${OL}" stroke-width="2.5"/>
    <path d="M62 72 L62 30 L108 30 L108 72 Z" fill="url(#c)" stroke="${OL}" stroke-width="3"/>
    <path d="M58 30 L85 6 L112 30 Z" fill="#ff7a59" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M85 7 V1 L97 4 L85 7" stroke="${OL}" stroke-width="2" fill="#ff4f7b" stroke-linejoin="round"/>
    <path d="M70 150 V118 Q70 100 85 100 Q100 100 100 118 V150 Z" fill="#6b4a2a" stroke="${OL}" stroke-width="3"/>
    ${[[78, 44], [92, 44], [46, 92], [124, 92], [19, 112], [151, 112]].map(([x, y]) => `<path d="M${x - 5} ${y + 10} V${y + 3} Q${x - 5} ${y - 3} ${x} ${y - 3} Q${x + 5} ${y - 3} ${x + 5} ${y + 3} V${y + 10} Z" fill="#4a3a6a" stroke="${OL}" stroke-width="2"/>`).join("")}
    ${shine(46, 82, 10, 3, 0.4)}${[[40, 120], [120, 130], [56, 136]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="#c99a4a"/>`).join("")}`),
  palm: svg(160, 170, `${lin("sand", [[0, "#ffe9b0"], [1, "#e0b46a"]])}${lin("tr", [[0, "#b9844f"], [1, "#7a5230"]], 1, 0)}${lin("lv", [[0, "#7be27e"], [1, "#1f8a4c"]])}
    <path d="M20 170 Q14 120 50 108 Q80 98 110 108 Q146 120 140 170 Z" fill="#8f9bb0" stroke="${OL}" stroke-width="3"/>
    <path d="M24 120 Q80 92 136 120 Q120 132 80 132 Q40 132 24 120 Z" fill="url(#sand)" stroke="${OL}" stroke-width="3"/>
    <path d="M78 122 Q70 80 84 40" stroke="${OL}" stroke-width="13" fill="none" stroke-linecap="round"/><path d="M78 122 Q70 80 84 40" stroke="url(#tr)" stroke-width="9" fill="none" stroke-linecap="round"/>
    ${[[-1, 0.2], [-1, 0.9], [1, 0.1], [1, 0.8], [0, 0]].map(([dx, k]) => `<path d="M84 40 Q${84 + dx * 30} ${22 + k * 12} ${84 + dx * 62} ${40 + k * 26} Q${84 + dx * 34} ${34 + k * 14} 84 44 Z" fill="url(#lv)" stroke="${OL}" stroke-width="2.5" stroke-linejoin="round"/>`).join("")}
    <circle cx="80" cy="46" r="6" fill="#8a5a2a" stroke="${OL}" stroke-width="2"/><circle cx="90" cy="48" r="6" fill="#8a5a2a" stroke="${OL}" stroke-width="2"/>`),
  volcano: svg(170, 130, `${lin("v", [[0, "#8a7a8f"], [1, "#4a3f55"]])}${rad("lava", [[0, "#fff1a8"], [0.5, "#ff8a3d"], [1, "#ff4f2a", 0]], 0.5, 0.5, 0.5)}
    <ellipse cx="85" cy="20" rx="34" ry="20" fill="url(#lava)"/>
    <path d="M6 130 Q30 104 52 60 Q62 34 70 22 L100 22 Q108 34 118 60 Q140 104 164 130 Z" fill="url(#v)" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M70 22 Q85 30 100 22 Q85 14 70 22 Z" fill="#ffb347" stroke="${OL}" stroke-width="2.5"/>
    <path d="M78 26 Q74 50 82 70 Q86 56 92 28 Z" fill="#ff8a3d" opacity="0.9"/>
    <path d="M40 110 Q60 96 56 80 M120 104 Q112 90 118 76" stroke="#3b3346" stroke-width="2.5" fill="none" stroke-linecap="round"/>${shine(62, 70, 8, 22, 0.18)}`),
  statue: svg(110, 160, `${lin("st", [[0, "#a9b3bf"], [1, "#5f6b78"]], 1, 1)}
    <path d="M18 160 L22 50 Q24 14 56 10 Q90 12 92 48 L96 160 Z" fill="url(#st)" stroke="${OL}" stroke-width="3"/>
    <path d="M26 50 Q56 40 88 50" stroke="#4a5562" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M30 62 Q38 56 46 62 L44 70 Q38 66 32 70 Z M66 62 Q74 56 82 62 L80 70 Q74 66 68 70 Z" fill="#3e4855"/>
    <path d="M54 62 Q48 92 60 96 Q66 96 64 90" stroke="#4a5562" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M40 112 Q58 120 76 112" stroke="#3e4855" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M22 130 Q34 120 46 132 Q34 140 22 138 Z M70 30 Q82 22 90 34 Q80 38 70 36 Z" fill="#6fbf62" opacity="0.85"/>${shine(40, 30, 10, 6, 0.3)}`),
  mermaid: svg(120, 170, `${lin("m", [[0, "#c9d2dc"], [1, "#7b8794"]], 1, 1)}${lin("rk", [[0, "#9aa6b6"], [1, "#5b6676"]])}
    <path d="M6 170 Q8 136 40 128 Q74 122 108 136 Q118 150 114 170 Z" fill="url(#rk)" stroke="${OL}" stroke-width="3"/>
    <path d="M52 132 Q34 120 40 96 Q46 78 56 74 Q50 98 62 116 Q76 134 100 124 Q92 142 70 140 Z" fill="url(#m)" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M96 124 Q110 112 112 96 Q102 108 92 110 Q100 100 98 88 Q90 104 84 118 Z" fill="url(#m)" stroke="${OL}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M44 80 Q40 60 50 50 L62 50 Q70 62 64 80 Z" fill="url(#m)" stroke="${OL}" stroke-width="3"/>
    <circle cx="56" cy="38" r="13" fill="url(#m)" stroke="${OL}" stroke-width="3"/>
    <path d="M43 36 Q40 58 30 70 Q42 66 46 52 M69 36 Q74 56 80 66 Q70 62 66 50" stroke="#8d99a6" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M62 58 Q78 46 82 30" stroke="url(#m)" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M62 58 Q78 46 82 30" stroke="${OL}" stroke-width="2" fill="none" opacity="0.4"/>
    <path d="M58 130 Q66 122 74 130" stroke="#6b7684" stroke-width="2" fill="none"/>${shine(50, 32, 4, 3, 0.4)}`),
  ship: svg(230, 150, `${lin("h", [[0, "#9a6a3e"], [1, "#4e3218"]])}${lin("sl", [[0, "#efe6d2"], [1, "#c9bda2"]])}
    <g transform="rotate(-8 115 120)">
    <path d="M10 92 L220 92 Q214 122 190 140 L40 140 Q18 122 10 92 Z" fill="url(#h)" stroke="${OL}" stroke-width="3"/>
    <path d="M10 92 L220 92 L224 82 L6 82 Z" fill="#6e4726" stroke="${OL}" stroke-width="2.5"/>
    <path d="M18 104 H210 M26 118 H200" stroke="#3a2410" stroke-width="2" opacity="0.6"/>
    ${[60, 100, 140, 180].map((x) => `<circle cx="${x}" cy="108" r="7" fill="#1f3550" stroke="#c9a14a" stroke-width="2.5"/>`).join("")}
    <rect x="108" y="10" width="7" height="74" fill="#5e3a1c" stroke="${OL}" stroke-width="2"/>
    <path d="M115 18 Q150 30 146 58 L118 64 Z" fill="url(#sl)" stroke="${OL}" stroke-width="2.5" opacity="0.92"/>
    <path d="M130 40 L138 48 L132 52 Z" fill="#ffffff" opacity="0.7"/>
    <path d="M150 92 L170 70 L176 80 L160 96 Z" fill="#2a3a4f" opacity="0.9"/></g>
    <path d="M30 150 Q50 128 70 150 M170 150 Q186 132 204 150" stroke="#6fbf62" stroke-width="6" fill="none" stroke-linecap="round"/>`),
  crystal: svg(150, 120, `${lin("c1", [[0, "#f3d9ff"], [1, "#9b5cf0"]], 1, 1)}${lin("c2", [[0, "#ffe0f3"], [1, "#e055b0"]], 1, 1)}${lin("rk", [[0, "#8b97aa"], [1, "#4f5a6c"]])}${rad("gl", [[0, "#e7c8ff", 0.9], [1, "#b98bff", 0]], 0.5, 0.6, 0.55)}
    <ellipse cx="75" cy="66" rx="70" ry="50" fill="url(#gl)"/>
    <path d="M60 104 L50 34 L66 14 L78 36 L72 104 Z" fill="url(#c1)" stroke="${OL}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M78 104 L86 46 L100 34 L108 54 L94 104 Z" fill="url(#c2)" stroke="${OL}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M36 104 L30 64 L42 52 L52 70 L50 104 Z" fill="url(#c2)" stroke="${OL}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M100 104 L108 72 L120 64 L124 84 L114 104 Z" fill="url(#c1)" stroke="${OL}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M58 34 L66 16 L68 60 Z M90 50 L100 36 L98 70 Z" fill="#ffffff" opacity="0.55"/>
    <path d="M10 120 Q14 98 40 96 L112 96 Q138 98 142 120 Z" fill="url(#rk)" stroke="${OL}" stroke-width="3"/>`),
  trident: svg(80, 170, `${lin("g", [[0, "#fff1a0"], [0.5, "#ffc928"], [1, "#d48a00"]], 1, 0)}
    <rect x="35" y="44" width="10" height="126" rx="4" fill="url(#g)" stroke="${OL}" stroke-width="2.5"/>
    <path d="M14 46 Q12 20 18 6 L24 20 L24 40 Q40 46 56 40 L56 20 L62 6 Q68 20 66 46 Q40 58 14 46 Z" fill="url(#g)" stroke="${OL}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M40 46 L40 4 L33 16 M40 4 L47 16" stroke="${OL}" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M34 46 L40 2 L46 46 Z" fill="url(#g)" stroke="${OL}" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="40" cy="58" r="6" fill="#3ad1ff" stroke="${OL}" stroke-width="2"/>${shine(38, 56, 2, 1.6, 0.9)}${shine(38, 100, 2, 30, 0.35)}`),
  balloon: svg(80, 140, `${rad("b", [[0, "#ffb0b0"], [0.6, "#ff4a5a"], [1, "#c81e3a"]], 0.35, 0.3, 0.75)}
    <path d="M40 66 Q36 90 44 104 Q36 118 42 134" stroke="#ffffff" stroke-width="2" fill="none"/>
    <ellipse cx="40" cy="36" rx="30" ry="34" fill="url(#b)" stroke="${OL}" stroke-width="3"/>
    <path d="M36 70 L44 70 L40 64 Z" fill="#c81e3a" stroke="${OL}" stroke-width="2"/>${shine(30, 22, 7, 11, 0.6)}
    <rect x="34" y="132" width="12" height="8" rx="2" fill="#7b8794" stroke="${OL}" stroke-width="2"/>`),
  moon: svg(100, 100, `${rad("g", [[0, "#fff8d0", 0.8], [1, "#fff2a0", 0]], 0.5, 0.5, 0.5)}${lin("m", [[0, "#fffbe0"], [1, "#ffd560"]], 1, 1)}
    <circle cx="50" cy="50" r="48" fill="url(#g)"/>
    <path d="M62 14 Q30 20 28 50 Q30 80 62 86 Q34 92 18 70 Q4 48 18 28 Q34 8 62 14 Z" fill="url(#m)" stroke="${OL}" stroke-width="3"/>
    <circle cx="26" cy="44" r="3" fill="#e9c050"/><circle cx="30" cy="62" r="2.4" fill="#e9c050"/>
    <path d="M24 50 Q27 54 30 50" stroke="${OL}" stroke-width="2" fill="none" stroke-linecap="round"/>`),
  rainbow: svg(190, 110, `${["#ff5d5d", "#ff9f43", "#ffd93d", "#4cd964", "#2fb5ff", "#8b6cff"].map((c, i) => `<path d="M${20 + i * 9} 96 A${75 - i * 9} ${75 - i * 9} 0 0 1 ${170 - i * 9} 96" stroke="${c}" stroke-width="9.5" fill="none"/>`).join("")}
    ${[[22, 92], [168, 92]].map(([x, y]) => `<g><circle cx="${x - 12}" cy="${y}" r="12" fill="#fff" stroke="${OL}" stroke-width="2.5"/><circle cx="${x + 6}" cy="${y - 6}" r="15" fill="#fff" stroke="${OL}" stroke-width="2.5"/><circle cx="${x + 20}" cy="${y + 2}" r="11" fill="#fff" stroke="${OL}" stroke-width="2.5"/><rect x="${x - 22}" y="${y}" width="50" height="12" fill="#fff"/></g>`).join("")}`),
  sparkles: svg(100, 100, `${rad("g", [[0, "#fff6c8", 0.9], [1, "#ffe27a", 0]], 0.5, 0.5, 0.5)}<circle cx="50" cy="50" r="46" fill="url(#g)"/>
    ${[[50, 48, 22], [24, 26, 10], [76, 30, 12], [70, 76, 9], [28, 72, 8]].map(([x, y, s]) => `<path d="M${x} ${y - s} Q${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y} Q${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s} Q${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y} Q${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s} Z" fill="#fff4a8" stroke="#e0a800" stroke-width="1.8"/>`).join("")}`),
  crown: svg(110, 80, `${lin("g", [[0, "#fff3a0"], [0.5, "#ffd23a"], [1, "#e09a00"]])}
    <path d="M10 76 L8 24 L32 46 L55 8 L78 46 L102 24 L100 76 Z" fill="url(#g)" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="8" y="62" width="94" height="14" rx="3" fill="#ffc21a" stroke="${OL}" stroke-width="2.5"/>
    <circle cx="55" cy="69" r="5" fill="#ff4f7b" stroke="${OL}" stroke-width="1.5"/><circle cx="30" cy="69" r="4" fill="#3ad1ff" stroke="${OL}" stroke-width="1.5"/><circle cx="80" cy="69" r="4" fill="#4cd964" stroke="${OL}" stroke-width="1.5"/>
    ${[[8, 22], [55, 6], [102, 22]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#ffffff" stroke="${OL}" stroke-width="2"/>`).join("")}${shine(40, 40, 6, 10, 0.4)}`),
};

/** Extra life for decorations in the tank: glows, bubbles and sparkles they give off, bobbing. */
export const DECOR_FX: Record<string, { glow?: string; emit?: "bubbles" | "sparkles"; at?: [number, number]; bob?: number }> = {
  mushroom: { glow: "#5ef2d2" },
  chest: { emit: "bubbles", at: [0.5, 0.42] },
  volcano: { emit: "bubbles", at: [0.5, 0.16], glow: "#ff8a3d" },
  ship: { emit: "bubbles", at: [0.47, 0.1] },
  crystal: { glow: "#c08bff", emit: "sparkles", at: [0.5, 0.35] },
  trident: { emit: "sparkles", at: [0.5, 0.15] },
  balloon: { bob: 0.06 },
  moon: { glow: "#fff2a0", bob: 0.04 },
  crown: { glow: "#ffd23a", bob: 0.05, emit: "sparkles", at: [0.5, 0.4] },
  sparkles: { emit: "sparkles", at: [0.5, 0.5], bob: 0.05 },
  rainbow: { bob: 0.02 },
  statue: {},
  mermaid: {},
  shell: { emit: "bubbles", at: [0.5, 0.75] },
};

// ── Eggs ─────────────────────────────────────────────────────────────────────────────────────
export const EGG_COLORS: Record<EggTier, { a: string; b: string; c: string; spot: string }> = {
  sea: { a: "#e9f7ff", b: "#9fd6ff", c: "#4aa3e8", spot: "#3b8fd6" },
  rare: { a: "#e8fff6", b: "#7fe6c3", c: "#1fae84", spot: "#178f6b" },
  golden: { a: "#fffbe0", b: "#ffd75a", c: "#e09a00", spot: "#fff6c4" },
};
export function eggArt(tier: EggTier): Art {
  const k = EGG_COLORS[tier];
  const spots =
    tier === "golden"
      ? `<path d="M32 30 L35 37 L42 40 L35 43 L32 50 L29 43 L22 40 L29 37 Z" fill="#fffbe6"/><path d="M48 56 L50 60 L54 62 L50 64 L48 68 L46 64 L42 62 L46 60 Z" fill="#fffbe6"/>`
      : tier === "rare"
        ? `<path d="M14 56 Q30 44 50 54 Q60 60 66 52" stroke="${k.spot}" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.75"/><path d="M18 70 Q34 62 52 70" stroke="${k.spot}" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.6"/>`
        : [[26, 34, 4], [46, 28, 3], [52, 50, 4.5], [30, 58, 3.5], [40, 72, 3], [20, 50, 2.5]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${k.spot}" opacity="0.6"/>`).join("");
  return svg(
    72,
    90,
    `${rad("e", [[0, k.a], [0.55, k.b], [1, k.c]], 0.36, 0.3, 0.85)}
    <path d="M36 4 C58 4 70 36 70 56 C70 76 56 88 36 88 C16 88 2 76 2 56 C2 36 14 4 36 4 Z" fill="url(#e)" stroke="${OL}" stroke-width="3"/>
    ${spots}${shine(24, 24, 7, 12, 0.6)}`,
  );
}

// ── Food ─────────────────────────────────────────────────────────────────────────────────────
export const FOOD_ART: Record<FoodKind, Art> = {
  flakes: svg(90, 90, `${lin("t", [[0, "#5fb8ff"], [1, "#1f6fd1"]])}${lin("lid", [[0, "#ffe07a"], [1, "#f0a800"]])}
    <path d="M14 30 L76 30 L70 84 Q45 90 20 84 Z" fill="url(#t)" stroke="${OL}" stroke-width="3"/>
    <rect x="10" y="20" width="70" height="14" rx="5" fill="url(#lid)" stroke="${OL}" stroke-width="3"/>
    <path d="M30 56 Q42 44 56 56 Q42 68 30 56 Z M56 56 L64 50 L64 62 Z" fill="#ffd23a" stroke="${OL}" stroke-width="2"/><circle cx="36" cy="54" r="1.8" fill="${OL}"/>
    ${[[24, 12, "#ff5d5d"], [40, 8, "#ffd23a"], [56, 13, "#ff9f43"], [66, 6, "#ff5d5d"], [32, 4, "#ff9f43"]].map(([x, y, c]) => `<path d="M${x} ${y} l7 -2 l-2 6 z" fill="${c}" stroke="${OL}" stroke-width="1.2"/>`).join("")}${shine(26, 46, 4, 12, 0.35)}`),
  shrimp: svg(90, 90, `${lin("s", [[0, "#ffb3c7"], [1, "#ff6f91"]])}
    ${[[14, 52, -20], [34, 66, 10], [52, 46, -8]].map(([x, y, r]) => `<g transform="rotate(${r} ${x + 14} ${y})"><path d="M${x} ${y} Q${x + 14} ${y - 22} ${x + 30} ${y - 6} Q${x + 20} ${y - 12} ${x + 12} ${y + 2} Z" fill="url(#s)" stroke="${OL}" stroke-width="2.5" stroke-linejoin="round"/><path d="M${x + 8} ${y - 8} L${x + 12} ${y - 14} M${x + 15} ${y - 10} L${x + 19} ${y - 15}" stroke="#ff4f7b" stroke-width="2"/></g>`).join("")}
    <path d="M10 84 Q45 72 80 84" stroke="${OL}" stroke-width="3" fill="#ffe0ea"/>`),
  golden: svg(90, 90, `${rad("g", [[0, "#fffbe0"], [0.5, "#ffd23a"], [1, "#d48a00"]], 0.35, 0.3, 0.75)}
    ${[[30, 60, 13], [54, 64, 12], [42, 42, 13], [66, 44, 9], [20, 40, 8]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#g)" stroke="${OL}" stroke-width="2.5"/><ellipse cx="${x - r * 0.35}" cy="${y - r * 0.4}" rx="${r * 0.3}" ry="${r * 0.2}" fill="#fff" opacity="0.8"/>`).join("")}
    <path d="M70 16 Q72 24 80 26 Q72 28 70 36 Q68 28 60 26 Q68 24 70 16 Z" fill="#fff4a8" stroke="#e0a800" stroke-width="1.5"/>`),
};

// ── Small icons ──────────────────────────────────────────────────────────────────────────────
export const ICON_ART = {
  shell: svg(40, 40, `${lin("s", [[0, "#ffe3d0"], [1, "#f29a74"]])}<path d="M20 4 Q34 6 37 22 Q38 32 30 36 L10 36 Q2 32 3 22 Q6 6 20 4 Z" fill="url(#s)" stroke="${OL}" stroke-width="2.6"/>
    <path d="M20 34 L20 8 M20 34 L11 10 M20 34 L29 10 M20 34 L5 20 M20 34 L35 20" stroke="#d9734a" stroke-width="1.8" opacity="0.85"/><rect x="12" y="34" width="16" height="4" rx="2" fill="#f29a74" stroke="${OL}" stroke-width="2"/>`),
  heart: svg(40, 40, `${lin("h", [[0, "#ff8fb1"], [1, "#ff3f73"]])}<path d="M20 35 C6 26 3 18 6 11 C9 5 17 5 20 11 C23 5 31 5 34 11 C37 18 34 26 20 35 Z" fill="url(#h)" stroke="${OL}" stroke-width="2.6"/>${shine(13, 13, 3, 2, 0.7)}`),
  heartEmpty: svg(40, 40, `<path d="M20 35 C6 26 3 18 6 11 C9 5 17 5 20 11 C23 5 31 5 34 11 C37 18 34 26 20 35 Z" fill="#ffffff" stroke="#c7d3e0" stroke-width="2.6"/>`),
  sprout: svg(40, 40, `<path d="M20 36 V18" stroke="#2f9e44" stroke-width="3.5" stroke-linecap="round"/><path d="M20 20 Q8 20 6 8 Q18 8 20 20 Z M20 18 Q30 16 34 6 Q22 6 20 18 Z" fill="#4cd964" stroke="${OL}" stroke-width="2.2"/>`),
  book: svg(40, 40, `${lin("b", [[0, "#8b6cff"], [1, "#5a3fd6"]])}<path d="M6 8 Q14 5 20 9 Q26 5 34 8 V34 Q26 31 20 35 Q14 31 6 34 Z" fill="url(#b)" stroke="${OL}" stroke-width="2.4"/><path d="M20 9 V35" stroke="${OL}" stroke-width="2"/><path d="M9 18 Q12 14 16 18 Q12 22 9 18 Z" fill="#ffd23a"/><path d="M24 22 Q27 18 31 22 Q27 26 24 22 Z" fill="#7cd3ff"/>`),
  tank: svg(40, 40, `${lin("w", [[0, "#9ee7ff"], [1, "#1f8fd1"]])}<rect x="4" y="8" width="32" height="26" rx="5" fill="url(#w)" stroke="${OL}" stroke-width="2.4"/><path d="M4 28 Q20 24 36 28 V34 H4 Z" fill="#f3d79a"/><path d="M14 18 Q20 13 26 18 Q20 23 14 18 Z M26 18 L30 15 L30 21 Z" fill="#ff8a24" stroke="${OL}" stroke-width="1.5"/><path d="M8 13 H14" stroke="#fff" stroke-width="2" opacity="0.7" stroke-linecap="round"/>`),
  /** A friendly pointing hand (points up and to the left). */
  hand: svg(60, 64, `${lin("h", [[0, "#fff1e2"], [1, "#ffd3ad"]])}
    <path d="M14 6 Q14 0 20 0 Q26 0 26 6 L26 26 Q30 22 35 24 Q39 21 44 24 Q49 22 53 27 L53 44 Q53 60 38 62 L28 62 Q18 62 13 52 L4 36 Q1 30 6 28 Q11 26 14 32 Z" fill="url(#h)" stroke="${OL}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M26 26 L26 38 M35 24 L35 37 M44 24 L44 37" stroke="#c98b5a" stroke-width="2" stroke-linecap="round"/>
    <path d="M16 6 Q18 3 21 4" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`),
  decor: svg(40, 40, `${lin("c", [[0, "#ffe6b0"], [1, "#d9a85a"]])}<path d="M6 36 V18 H12 V14 H16 V18 H24 V14 H28 V18 H34 V36 Z" fill="url(#c)" stroke="${OL}" stroke-width="2.3"/><path d="M16 36 V28 Q20 23 24 28 V36 Z" fill="#6b4a2a" stroke="${OL}" stroke-width="1.8"/><path d="M20 14 V4 L28 7 L20 10" fill="#ff4f7b" stroke="${OL}" stroke-width="1.6"/>`),
};

// ── Turning art into something drawable ──────────────────────────────────────────────────────
const urls = new Map<string, string>();
export function artUrl(a: Art): string {
  let u = urls.get(a.svg);
  if (!u) {
    u = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(a.svg)}`;
    urls.set(a.svg, u);
  }
  return u;
}

const images = new Map<string, HTMLImageElement>();
/** The art as an image for the canvas (null until it has loaded; `onLoad` fires once it has). */
export function artImage(a: Art, onLoad?: () => void): HTMLImageElement | null {
  let img = images.get(a.svg);
  if (!img) {
    img = new Image();
    img.decoding = "async";
    img.src = artUrl(a);
    images.set(a.svg, img);
  }
  if (img.complete && img.naturalWidth > 0) return img;
  if (onLoad) img.addEventListener("load", onLoad, { once: true });
  return null;
}
