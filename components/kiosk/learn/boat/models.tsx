import type { ReactNode } from "react";
import type { BoatModel, DeckSpot } from "@/lib/learn/boats";

// The boat models, drawn side-on on a 140×140 board with the bow pointing RIGHT (the way every
// voyage sails). Each model gives its hull shape (the paint job is clipped to it), its sails, the
// spots where things attach (figurehead, pet, deck gear, flags), and its own details — portholes,
// a wheelhouse and smokestack, a paddle wheel, shields and oars, a duck's head.
//
// Layers (Boat.tsx): back → masts → sails → deck gear + pet (so the hull's top edge hides their
// feet) → hull + paint → details → figurehead + side gear → flags → the sea.

export const OL = "#2a2f45";
export type Pt = [number, number];
export type Ctx = {
  /** Unique id prefix for this boat's gradients/clips. */
  id: string;
  hull: string;
  hullHi: string;
  hullLo: string;
  /** The sail fill (a pattern) and its two colors (tugs and steamers wear them on the stacks). */
  sailFill: string;
  sail: string;
  sail2: string;
  night: boolean;
  /** No moving parts (catalog thumbnails). */
  still: boolean;
};
export type Sail = { d: string; c: Pt; r: number; o: Pt };
export type Model = {
  hull: string;
  /** A light rail along the sheer (and where a racing stripe runs). */
  rail?: string;
  bow: Pt;
  pet: Pt;
  petSize: number;
  spots: Record<DeckSpot, Pt>;
  /** Flagpole tops — the first flies the chosen flag, the others small pennants. */
  flags: Pt[];
  sails: Sail[];
  noFigure?: boolean;
  /** For the paint job: the hull's top and bottom, and where its front is. */
  box: { top: number; bottom: number };
  back?: (c: Ctx) => ReactNode;
  rig?: (c: Ctx) => ReactNode;
  details?: (c: Ctx) => ReactNode;
  front?: (c: Ctx) => ReactNode;
};

const WOOD = "#b47b43";
const WOOD_LO = "#7d5127";
const GLASS = "#bfe8ff";
const LIT = "#ffe58a";
const GOLD = "#ffd23a";
const GOLD_LO = "#c98a0c";

/** An outlined pole (mast, boom, yard, bowsprit). */
export function Pole({ d, w = 4.4, color = WOOD }: { d: string; w?: number; color?: string }) {
  return (
    <>
      <path d={d} fill="none" stroke={OL} strokeWidth={w + 4.4} strokeLinecap="round" />
      <path d={d} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" />
    </>
  );
}
const Mast = ({ x, top, bottom }: { x: number; top: number; bottom: number }) => <Pole d={`M${x} ${bottom} L${x} ${top}`} w={4.2} />;
const Port = ({ x, y, r = 3.4, lit }: { x: number; y: number; r?: number; lit?: boolean }) => (
  <g>
    <circle cx={x} cy={y} r={r + 1.2} fill="#e8eef6" stroke={OL} strokeWidth="1.8" />
    <circle cx={x} cy={y} r={r * 0.72} fill={lit ? LIT : GLASS} stroke={OL} strokeWidth="1.2" />
    {!lit && <circle cx={x - r * 0.25} cy={y - r * 0.25} r={r * 0.22} fill="#fff" />}
  </g>
);
const Win = ({ x, y, w, h, lit, r = 2 }: { x: number; y: number; w: number; h: number; lit?: boolean; r?: number }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx={r} fill={lit ? LIT : GLASS} stroke={OL} strokeWidth="1.6" />
    {!lit && <path d={`M${x + 1.5} ${y + h - 1.5} L${x + w * 0.55} ${y + 1.5}`} stroke="#fff" strokeOpacity="0.7" strokeWidth="1.4" strokeLinecap="round" />}
  </g>
);
/** Puffs of smoke rising from (x, y). */
const Smoke = ({ x, y, still }: { x: number; y: number; still: boolean }) =>
  still ? null : (
    <g pointerEvents="none">
      {[0, 0.9, 1.8].map((delay, i) => (
        <circle key={i} cx={x} cy={y} r={5.2} fill="#f4f7fb" stroke="#c3ccd8" strokeWidth="1.4" className="bt-smoke" style={{ animationDelay: `${delay}s`, transformOrigin: `${x}px ${y}px` }} />
      ))}
    </g>
  );

export const MODELS: Record<BoatModel, Model> = {
  // ── Little Sloop: one mast, a mainsail and a jib. ──
  sloop: {
    hull: "M14 93 Q70 99 128 88 Q121 116 100 120 L40 120 Q20 116 14 93 Z",
    rail: "M17.5 98.6 Q70 104.4 124.6 93.6",
    bow: [128, 88],
    pet: [37, 97.5],
    petSize: 41,
    spots: { bow: [108, 92.5], mid: [88, 95], stern: [24, 95.5], mast: [64.7, 44], side: [97, 108] },
    flags: [[64.7, 14.5]],
    box: { top: 88, bottom: 120 },
    sails: [
      { d: "M62 18 L62 83 L21 83 Q29 48 62 18 Z", c: [48, 62], r: 15, o: [62, 83] },
      { d: "M68 24 Q96 52 114 86 L70 86 Q72 58 68 24 Z", c: [82, 68], r: 11, o: [68, 86] },
    ],
    rig: () => (
      <>
        <Mast x={64.7} top={16} bottom={96} />
        <Pole d="M64 84 L19 84" w={3.4} />
      </>
    ),
    details: (c) => [48, 64, 80].map((x) => <Port key={x} x={x} y={108.5} lit={c.night} />),
  },

  // ── Catamaran: two slim hulls under one deck, a tall mast. ──
  catamaran: {
    hull: "M10 99 Q70 103.5 132 93 Q128 113 110 116 L28 116 Q14 112 10 99 Z",
    rail: "M13.6 104.4 Q70 108.6 128.4 98.4",
    bow: [132, 93],
    pet: [40, 98],
    petSize: 38,
    spots: { bow: [114, 93.5], mid: [96, 95.5], stern: [22, 97.5], mast: [74.7, 40], side: [100, 109] },
    flags: [[74.7, 7]],
    box: { top: 93, bottom: 116 },
    sails: [
      { d: "M72 10 L72 87 L23 87 Q31 44 72 10 Z", c: [56, 60], r: 16, o: [72, 87] },
      { d: "M78 18 Q105 50 121 89 L80 89 Q82 56 78 18 Z", c: [92, 66], r: 11, o: [78, 89] },
    ],
    back: (c) => (
      <g>
        {/* The far hull, peeking out behind, in shade; the deck that joins them. */}
        <path d="M22 92 Q74 95 130 86 Q127 100 112 103 L38 103 Q26 100 22 92 Z" fill={c.hullLo} stroke={OL} strokeWidth="2.8" strokeLinejoin="round" />
        <path d="M16 96.5 L127 90.6" stroke={OL} strokeWidth="7.4" strokeLinecap="round" />
        <path d="M16 96.5 L127 90.6" stroke={WOOD} strokeWidth="3.6" strokeLinecap="round" />
      </g>
    ),
    rig: () => (
      <>
        <Mast x={74.7} top={8} bottom={96} />
        <Pole d="M74 88 L21 88" w={3.4} />
      </>
    ),
    details: (c) => [44, 60, 76, 92].map((x) => <Port key={x} x={x} y={109.4} r={2.8} lit={c.night} />),
  },

  // ── Tug Toot: a chunky hull, a wheelhouse, a smokestack wearing the sail colors, tire bumpers. ──
  tug: {
    hull: "M12 90 Q70 95.5 126 84 Q126 112 106 120 L34 120 Q14 116 12 90 Z",
    rail: "M15 95.4 Q70 100.6 122.4 89.4",
    bow: [126, 84],
    pet: [69, 53],
    petSize: 33,
    spots: { bow: [114, 87.5], mid: [100, 89.5], stern: [22, 91.5], mast: [89, 44], side: [114, 101] },
    flags: [[89, 33]],
    box: { top: 84, bottom: 120 },
    sails: [],
    back: (c) => (
      <g>
        {/* Smokestack (its band wears the sail), then the wheelhouse. */}
        <path d="M32 92 L33.5 42 L46.5 42 L48 92 Z" fill="#e8eef6" stroke={OL} strokeWidth="2.6" strokeLinejoin="round" />
        <rect x="32.6" y="47" width="14.8" height="12" fill={c.sailFill} stroke={OL} strokeWidth="2" />
        <rect x="31" y="38" width="18" height="6" rx="2" fill="#3d4360" stroke={OL} strokeWidth="2.4" />
        <Smoke x={38} y={33} still={c.still} />
        <rect x="50" y="58" width="40" height="36" rx="4" fill="#f4f7fb" stroke={OL} strokeWidth="2.8" />
        <path d="M50 66 L90 66" stroke="#dde5ef" strokeWidth="1.6" />
        {[54, 66.5, 79].map((x) => (
          <Win key={x} x={x} y={63} w={8} h={10} lit={c.night} />
        ))}
        <rect x="46" y="52" width="48" height="8" rx="3" fill={c.sail} stroke={OL} strokeWidth="2.6" />
        <rect x="47.5" y="53.2" width="45" height="2.2" rx="1" fill="#fff" opacity="0.5" />
        <Pole d="M89 52 L89 34" w={2.6} />
      </g>
    ),
    details: () =>
      [30, 52, 74, 96].map((x) => (
        <g key={x}>
          <circle cx={x} cy={105} r={4.8} fill="#3d4360" stroke={OL} strokeWidth="2" />
          <circle cx={x} cy={105} r={2} fill="#6b7190" />
        </g>
      )),
  },

  // ── Schooner: two masts (the aft one taller), gaff sails, a jib on the bowsprit. ──
  schooner: {
    hull: "M6 91 Q70 98 132 84 Q125 116 102 120 L32 120 Q12 116 6 91 Z",
    rail: "M9.4 96.6 Q70 103.4 128 90",
    bow: [132, 84],
    pet: [64, 98],
    petSize: 36,
    spots: { bow: [116, 89.5], mid: [98, 93], stern: [18, 94.5], mast: [44.2, 42], side: [106, 107] },
    flags: [[44.2, 6.5], [84.2, 14.5]],
    box: { top: 84, bottom: 120 },
    sails: [
      { d: "M42 12 L42 85 L9 85 Q13 44 42 12 Z", c: [31, 60], r: 12, o: [42, 85] },
      { d: "M82 20 L82 86 L49 86 Q53 50 82 20 Z", c: [70, 64], r: 11, o: [82, 86] },
      { d: "M87 26 Q114 54 133 84 L90 87 Q92 58 87 26 Z", c: [100, 70], r: 9, o: [87, 87] },
    ],
    rig: () => (
      <>
        <Pole d="M129 85.5 L139 79.5" w={3.2} />
        <Mast x={44.2} top={8} bottom={97} />
        <Mast x={84.2} top={16} bottom={95} />
        <Pole d="M43.6 86 L7 86" w={3.2} />
        <Pole d="M83.6 87 L47 87" w={3.2} />
      </>
    ),
    details: (c) => [36, 52, 68, 84, 100].map((x) => <Port key={x} x={x} y={108.6} r={3} lit={c.night} />),
  },

  // ── Paddle Steamer: two decks, two tall stacks, a big wheel at the stern that turns. ──
  paddle: {
    hull: "M22 100 Q72 103.4 132 96 Q128 116 108 118 L40 118 Q26 114 22 100 Z",
    rail: "M25 104.6 Q72 108 128.4 100.6",
    bow: [132, 96],
    pet: [106, 81],
    petSize: 32,
    spots: { bow: [124, 95], mid: [37, 80.5], stern: [50, 62.5], mast: [122, 84], side: [96, 110] },
    flags: [[122, 73]],
    box: { top: 96, bottom: 118 },
    sails: [],
    back: (c) => (
      <g>
        {/* The stern wheel: a red ring with paddles, turning as the boat goes. */}
        <path d="M16 102 L34 96 M16 102 L34 108" stroke={OL} strokeWidth="2.4" />
        <g className={c.still ? undefined : "bt-wheel"} style={{ transformOrigin: "16px 102px" }}>
          <circle cx="16" cy="102" r="15" fill="none" stroke={OL} strokeWidth="6.4" />
          <circle cx="16" cy="102" r="15" fill="none" stroke={c.hull} strokeWidth="3" />
          {Array.from({ length: 8 }, (_, k) => {
            const a = (k * Math.PI) / 4;
            const x2 = 16 + Math.cos(a) * 17.5;
            const y2 = 102 + Math.sin(a) * 17.5;
            return <path key={k} d={`M16 102 L${x2.toFixed(2)} ${y2.toFixed(2)}`} stroke={OL} strokeWidth="2.6" strokeLinecap="round" />;
          })}
          <circle cx="16" cy="102" r="3.4" fill={GOLD} stroke={OL} strokeWidth="1.8" />
        </g>
        {/* Two stacks with bands in the sail colors, smoking. */}
        {[56, 74].map((x) => (
          <g key={x}>
            <rect x={x} y="26" width="9" height="40" fill="#3d4360" stroke={OL} strokeWidth="2.4" />
            <rect x={x} y="34" width="9" height="7" fill={c.sailFill} stroke={OL} strokeWidth="1.8" />
            <path d={`M${x - 2} 26 L${x - 1} 21 L${x + 1.5} 24 L${x + 4.5} 20 L${x + 7.5} 24 L${x + 10} 21 L${x + 11} 26 Z`} fill={GOLD} stroke={OL} strokeWidth="1.8" strokeLinejoin="round" />
            <Smoke x={x + 4.5} y={16} still={c.still} />
          </g>
        ))}
        {/* Upper deck, then the long lower deck with its row of windows. */}
        <rect x="42" y="64" width="58" height="18" rx="3" fill="#f4f7fb" stroke={OL} strokeWidth="2.6" />
        {[48, 59, 70, 81, 92].map((x) => (
          <Win key={x} x={x} y={68} w={6} h={8} lit={c.night} r={1.6} />
        ))}
        <rect x="38" y="60.5" width="66" height="5" rx="2" fill={c.sail} stroke={OL} strokeWidth="2.2" />
        <rect x="28" y="80" width="86" height="22" rx="3" fill="#f4f7fb" stroke={OL} strokeWidth="2.6" />
        {[33, 43, 53, 63, 73, 83, 93, 103].map((x) => (
          <Win key={x} x={x} y={85} w={6} h={8} lit={c.night} r={1.6} />
        ))}
        <path d="M28 82.5 L114 82.5" stroke={c.hull} strokeWidth="2.6" />
        <Pole d="M122 98 L122 74" w={2.4} />
      </g>
    ),
  },

  // ── Longship: low and long, both ends curling up, a striped square sail, shields and oars. ──
  viking: {
    hull: "M9 64 Q11 88 27 98 L113 98 Q129 88 131 64 Q138 72 134.5 85 Q128 106 110 112 L30 112 Q12 106 5.5 85 Q2 72 9 64 Z",
    bow: [131.5, 64],
    pet: [52, 99],
    petSize: 35,
    spots: { bow: [116, 96.5], mid: [90, 97.5], stern: [24, 96.5], mast: [70.2, 46], side: [119, 103] },
    flags: [[70.2, 12]],
    box: { top: 64, bottom: 112 },
    sails: [{ d: "M37 23 Q70 19 103 23 L107 78 Q70 86 33 78 Z", c: [70, 50], r: 16, o: [70, 23] }],
    rig: () => (
      <>
        <Mast x={70.2} top={12} bottom={98} />
        <Pole d="M33 22 L107 22" w={3.6} />
      </>
    ),
    details: (c) => (
      <g>
        {/* The stern post curls (and so does the prow, unless a figurehead sits there). */}
        <path d="M9 64 Q5 58 10 55 Q15 54 14 59" fill="none" stroke={OL} strokeWidth="5.4" strokeLinecap="round" />
        <path d="M9 64 Q5 58 10 55 Q15 54 14 59" fill="none" stroke={c.hull} strokeWidth="2.2" strokeLinecap="round" />
        {/* Oars dipping into the water, rowing. */}
        {[40, 54, 68, 82, 96].map((x, i) => (
          <g key={x} className={c.still ? undefined : "bt-oar"} style={{ transformOrigin: `${x}px 103px`, animationDelay: `${i * 0.08}s` }}>
            <path d={`M${x} 103 L${x - 12} 126`} stroke={OL} strokeWidth="5" strokeLinecap="round" />
            <path d={`M${x} 103 L${x - 12} 126`} stroke={WOOD} strokeWidth="2.2" strokeLinecap="round" />
            <ellipse cx={x - 12.5} cy={126} rx={2.4} ry={4.4} transform={`rotate(28 ${x - 12.5} 126)`} fill={WOOD} stroke={OL} strokeWidth="1.8" />
          </g>
        ))}
        {/* Round shields along the side. */}
        {[34, 46, 58, 70, 82, 94, 106].map((x, i) => (
          <g key={x}>
            <circle cx={x} cy={98.5} r={6.2} fill={i % 2 ? c.sail2 : c.sail} stroke={OL} strokeWidth="2.2" />
            <path d={`M${x - 6} 98.5 L${x + 6} 98.5 M${x} 92.5 L${x} 104.5`} stroke={OL} strokeOpacity="0.25" strokeWidth="1.6" />
            <circle cx={x} cy={98.5} r={1.9} fill={GOLD} stroke={OL} strokeWidth="1.2" />
          </g>
        ))}
      </g>
    ),
  },

  // ── Rubber Ducky: the hull IS a duck — tail up at the back, a head at the bow, a little sail. ──
  duck: {
    hull: "M12 84 Q9 70 16 61 Q24 70 36 76 Q60 82 92 78 Q100 77 104 72 L110 84 Q124 92 126 104 Q120 119 98 121 L36 121 Q13 115 12 84 Z",
    bow: [126, 96],
    pet: [80, 81],
    petSize: 33,
    noFigure: true,
    spots: { bow: [94, 79.5], mid: [44, 80], stern: [22, 74.5], mast: [60, 48], side: [52, 107] },
    flags: [[60, 23.5]],
    box: { top: 61, bottom: 121 },
    sails: [{ d: "M58 28 L58 76 L30 76 Q36 50 58 28 Z", c: [48, 58], r: 8, o: [58, 76] }],
    rig: () => <Mast x={60} top={25} bottom={80} />,
    details: (c) => (
      <g>
        {/* A wing on its side. */}
        <path d="M42 92 Q60 82 84 91 Q72 106 50 102 Q42 99 42 92 Z" fill={c.hullLo} stroke={OL} strokeWidth="2.4" strokeLinejoin="round" opacity="0.9" />
        <path d="M50 96 Q60 93 70 96" fill="none" stroke={OL} strokeOpacity="0.35" strokeWidth="1.6" strokeLinecap="round" />
      </g>
    ),
    front: (c) => (
      <g>
        {/* The head with its big eye and orange beak. */}
        <circle cx="105" cy="52" r="19.5" fill={`url(#${c.id}hb)`} stroke={OL} strokeWidth="3" />
        <ellipse cx="99" cy="42" rx="5.4" ry="3" fill="#fff" opacity="0.5" transform="rotate(-25 99 42)" />
        <path d="M118 52 Q132 49 137 55 Q131 60 119 60 Z" fill="#ff9f43" stroke={OL} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M120 56 Q128 56.5 134 55.4" fill="none" stroke={OL} strokeWidth="1.6" strokeLinecap="round" />
        <ellipse cx="110" cy="46" rx="3.4" ry="4.2" fill={OL} />
        <circle cx="109" cy="44.4" r="1.4" fill="#fff" />
        <ellipse cx="114" cy="56" rx="3" ry="1.9" fill="#ff7a9a" opacity="0.45" />
      </g>
    ),
  },

  // ── Galleon: three masts of square sails, a tall stern castle, gold trim, cannon ports. ──
  galleon: {
    hull: "M4 74 L28 74 L30 86 Q70 94 120 84 L134 76 Q132 92 126 104 Q116 120 96 122 L36 122 Q14 118 8 104 Q4 92 4 74 Z",
    rail: "M31 92 Q70 100 121 90",
    bow: [134, 76],
    pet: [84, 90],
    petSize: 33,
    spots: { bow: [118, 86.5], mid: [48, 90], stern: [16, 74.5], mast: [66.2, 47], side: [60, 112] },
    flags: [[66.2, 5.5], [100.2, 15.5], [32.2, 27.5]],
    box: { top: 74, bottom: 122 },
    sails: [
      { d: "M32 34 L32 78 L9 76 Q13 52 32 34 Z", c: [24, 60], r: 7, o: [32, 78] },
      { d: "M51 21 Q66 18.5 81 21 L83 45 Q66 49 49 45 Z", c: [66, 33], r: 8, o: [66, 21] },
      { d: "M47 50 Q66 47 85 50 L87 80 Q66 86 45 80 Z", c: [66, 65], r: 11, o: [66, 50] },
      { d: "M89 27 Q100 25 111 27 L112.5 48 Q100 51 87.5 48 Z", c: [100, 37], r: 6, o: [100, 27] },
      { d: "M86 53 Q100 50.5 114 53 L116 82 Q100 87 84 82 Z", c: [100, 67], r: 9, o: [100, 53] },
    ],
    rig: () => (
      <>
        <Pole d="M128 80 L140 66" w={3.2} />
        <Mast x={32.2} top={29} bottom={86} />
        <Mast x={66.2} top={7} bottom={92} />
        <Mast x={100.2} top={17} bottom={89} />
        {[
          [47, 20.4, 85],
          [43, 49.4, 89],
          [86.5, 26.4, 113.5],
          [82, 52.4, 118],
        ].map(([x1, y, x2], i) => (
          <Pole key={i} d={`M${x1} ${y} L${x2} ${y}`} w={2.8} />
        ))}
      </>
    ),
    details: (c) => (
      <g>
        {/* Gold rails, stern windows, a stern lantern, cannon ports with gold rims. */}
        <path d="M8.5 99 Q70 109 127 96.5" fill="none" stroke={GOLD} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M4.5 78.5 L28.5 78.5" stroke={GOLD} strokeWidth="2.4" strokeLinecap="round" />
        {[
          [8, 82],
          [17, 82],
          [8, 90],
          [17, 90],
        ].map(([x, y]) => (
          <Win key={`${x}-${y}`} x={x} y={y} w={6.5} h={6} lit={c.night} r={1.2} />
        ))}
        <rect x="3" y="65" width="5" height="7" rx="1.5" fill={c.night ? LIT : "#fff3b0"} stroke={OL} strokeWidth="1.6" />
        <path d="M5.5 65 L5.5 62" stroke={OL} strokeWidth="1.6" />
        {[42, 56, 70, 84, 98, 112].map((x) => (
          <g key={x}>
            <circle cx={x} cy={105} r={3.6} fill="#2f3242" stroke={GOLD_LO} strokeWidth="2" />
            <circle cx={x - 1} cy={104} r={1} fill="#6b7190" />
          </g>
        ))}
      </g>
    ),
  },
};

export { GOLD, WOOD, WOOD_LO };
