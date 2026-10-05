"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/cn";
import { SHOP_BY_ID, modelOf, type BoatLook } from "@/lib/learn/boats";
import { boatSound, petVoice, sfx } from "@/lib/learn/sfx";
import { SAY } from "@/lib/learn/script";
import { say } from "@/lib/learn/audio";
import { Glyph } from "../art/Glyph";
import { Chunk } from "../kit";
import { SideBoat } from "./Boat";
import { RIG_BY_ID } from "./pets";
import type { PetReact } from "./Pet";

// Sail mode: the boat, out on the open sea, just for fun. Tap the water to sail there; toot the
// horn, jump a wave, make the pet do a trick, fire the boat's special (a galleon's confetti cannon,
// a longship's oars, a ducky's squeak…), turn day into sunset into night, call up rain, snow or a
// rainbow, and say hello to the dolphins. No shells here — it's the reward, not the work.

type Time = "day" | "dusk" | "night";
type Sky = "sun" | "rain" | "snow" | "rainbow";
const SKY: Record<Time, [string, string, string]> = {
  day: ["#9ee3ff", "#d6f3ff", "#2aa7df"],
  dusk: ["#ff9b7a", "#ffd59e", "#3b6fb5"],
  night: ["#11204d", "#2e3f86", "#0e3a6e"],
};
// Deterministic scatter (no randomness while rendering).
const scatter = (n: number, seed: number) => Array.from({ length: n }, (_, i) => ({ x: (i * 37.7 + seed * 13) % 100, y: (i * 53.3 + seed * 7) % 100, d: ((i * 17) % 10) / 10 }));
const STARS = scatter(36, 3);
const DROPS = scatter(46, 5);
const FLAKES = scatter(34, 9);
const SPECIAL: Record<string, { label: string; icon: string }> = {
  galleon: { label: "Cannon!", icon: "🎉" },
  viking: { label: "Row!", icon: "🌊" },
  duck: { label: "Squeak!", icon: "🦆" },
  tug: { label: "Puff!", icon: "💨" },
  paddle: { label: "Full steam!", icon: "💨" },
  default: { label: "Gust!", icon: "🌬️" },
};
const FRIENDS = ["🐬", "🐋", "🐠", "🐳", "🦭", "🐢"];
const now = () => Date.now();

export function SailMode({ look, onBack }: { look: BoatLook; onBack: () => void }) {
  const [x, setX] = useState(42);
  const [faceLeft, setFaceLeft] = useState(false);
  const [time, setTime] = useState<Time>("day");
  const [sky, setSky] = useState<Sky>("sun");
  const [hop, setHop] = useState(0);
  const [petReact, setPetReact] = useState<PetReact>(null);
  const [burst, setBurst] = useState<{ k: number; kind: "notes" | "confetti" | "splash" | "bubbles" } | null>(null);
  const [friend, setFriend] = useState<{ k: number; e: string; left: boolean } | null>(null);
  const [fast, setFast] = useState(0);
  const model = modelOf(look);
  const special = SPECIAL[model] ?? SPECIAL.default;
  const [top, mid, sea] = SKY[time];
  const night = time === "night";
  useEffect(() => {
    void say(SAY.sailHello);
  }, []);

  const sailTo = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const to = Math.max(6, Math.min(78, ((e.clientX - r.left) / r.width) * 100 - 11));
    if (Math.abs(to - x) < 2) return;
    setFaceLeft(to < x);
    setX(to);
    sfx("whoosh");
  };
  const fire = (kind: NonNullable<typeof burst>["kind"]) => setBurst({ k: now(), kind });
  const horn = () => {
    boatSound(model === "tug" ? "toot" : model === "duck" ? "duck" : "horn");
    fire("notes");
  };
  const jump = () => {
    setHop((h) => h + 1);
    boatSound("splash");
    window.setTimeout(() => fire("splash"), 700);
  };
  const trick = () => {
    if (!look.pet) return;
    const rig = RIG_BY_ID.get(look.pet);
    if (rig) petVoice(rig.voice);
    setPetReact((r) => ({ mood: "cheer", k: (r?.k ?? 0) + 1 }));
  };
  const doSpecial = () => {
    if (model === "galleon") {
      boatSound("cannon");
      fire("confetti");
    } else if (model === "duck") {
      boatSound("duck");
      fire("bubbles");
    } else if (model === "viking" || model === "tug" || model === "paddle") {
      boatSound(model === "viking" ? "splash" : "toot");
      // Full speed for a moment (a newer press keeps it going).
      const k = now();
      setFast(k);
      window.setTimeout(() => setFast((f) => (f === k ? 0 : f)), 2600);
    } else {
      boatSound("sail");
      setHop((h) => h + 1);
    }
  };
  const cycleTime = () => {
    sfx("pick");
    setTime((t) => (t === "day" ? "dusk" : t === "dusk" ? "night" : "day"));
  };
  const cycleSky = () => {
    sfx("pick");
    setSky((s) => (s === "sun" ? "rain" : s === "rain" ? "rainbow" : s === "rainbow" ? "snow" : "sun"));
  };
  const callFriend = () => {
    const k = now();
    sfx("splash");
    setFriend({ k, e: FRIENDS[k % FRIENDS.length], left: k % 2 === 0 });
  };

  return (
    <div className="fixed inset-0 z-[45] overflow-hidden select-none" style={{ background: `linear-gradient(180deg, ${top} 0%, ${mid} 58%, ${sea} 58%)`, transition: "background 1.2s" }}>
      {/* Sky: sun or moon, stars, clouds, a rainbow, gulls. */}
      {night ? (
        <>
          {STARS.map((s, i) => (
            <span key={i} className="sm-twinkle absolute rounded-full bg-white" style={{ left: `${s.x}%`, top: `${s.y * 0.5}%`, width: 3 + (i % 3), height: 3 + (i % 3), animationDelay: `${s.d * 3}s` }} />
          ))}
          <span className="absolute right-[12%] top-[8%] h-24 w-24 rounded-full bg-[radial-gradient(circle_at_38%_38%,#fffbe6,#ffe58a)] shadow-[0_0_60px_18px_rgba(255,240,170,0.35)]" />
        </>
      ) : (
        <span className={cn("absolute right-[12%] top-[7%] h-28 w-28 rounded-full shadow-[0_0_70px_24px_rgba(255,220,90,0.55)]", time === "dusk" ? "bg-[radial-gradient(circle_at_40%_40%,#fff1c2,#ff8a4c)]" : "bg-[radial-gradient(circle_at_40%_40%,#fff7c2,#ffd23a)]")} />
      )}
      {sky === "rainbow" && (
        <svg viewBox="0 0 400 200" className="pointer-events-none absolute left-[8%] top-[6%] w-[60%] opacity-80" aria-hidden>
          {["#ff5d5d", "#ff9f43", "#ffd93d", "#4cd964", "#2fb5ff", "#8b6cff"].map((c, i) => (
            <path key={c} d={`M${30 + i * 9} 200 A${170 - i * 9} ${170 - i * 9} 0 0 1 ${370 - i * 9} 200`} fill="none" stroke={c} strokeWidth="9" />
          ))}
        </svg>
      )}
      {[0, 1, 2].map((i) => (
        <svg key={i} viewBox="0 0 120 50" className="l-cloud pointer-events-none absolute" style={{ top: `${8 + i * 9}%`, width: 170 - i * 30, animationDuration: `${70 + i * 25}s`, animationDelay: `${-i * 22}s`, opacity: sky === "rain" || sky === "snow" ? 1 : 0.92 } as CSSProperties} aria-hidden>
          <path d="M14 40 Q14 24 32 26 Q38 10 58 16 Q74 6 86 24 Q106 24 104 40 Z" fill={sky === "rain" || sky === "snow" ? "#c3ccd8" : night ? "#6b7aa8" : "#fff"} />
        </svg>
      ))}
      {!night &&
        [0, 1].map((i) => (
          <svg key={i} viewBox="0 0 30 12" className="sm-gull pointer-events-none absolute" style={{ top: `${20 + i * 8}%`, width: 34 - i * 8, animationDelay: `${-i * 9}s` }} aria-hidden>
            <path d="M2 8 Q8 1 15 7 Q22 1 28 8" fill="none" stroke="#3d4360" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        ))}
      {/* Far islands and a lighthouse (its beam sweeps at night). */}
      <svg viewBox="0 0 1000 120" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 top-[47%] h-[12%] w-full" aria-hidden>
        <path d="M60 120 Q140 40 240 120 Z M640 120 Q720 56 820 120 Z" fill={night ? "#23356b" : time === "dusk" ? "#8a5a7a" : "#5fb98a"} />
        <path d="M860 120 L872 46 L888 46 L900 120 Z" fill={night ? "#d9e1ea" : "#fff"} stroke="#2a2f45" strokeWidth="3" />
        <path d="M866 84 L894 84 M868 66 L892 66" stroke="#ff4d5e" strokeWidth="7" />
        <rect x="868" y="34" width="24" height="14" rx="3" fill={night ? "#ffe58a" : "#ffd23a"} stroke="#2a2f45" strokeWidth="3" />
      </svg>
      {night && <span className="sm-beam pointer-events-none absolute" style={{ left: "88%", top: "51%" }} />}
      {/* Weather. */}
      {sky === "rain" && DROPS.map((d, i) => <span key={i} className="sm-rain pointer-events-none absolute h-6 w-[3px] rounded-full bg-white/70" style={{ left: `${d.x}%`, top: "-5%", animationDelay: `${d.d * 1.2}s` }} />)}
      {sky === "snow" && FLAKES.map((d, i) => <span key={i} className="sm-snow pointer-events-none absolute h-3 w-3 rounded-full bg-white" style={{ left: `${d.x}%`, top: "-5%", animationDelay: `${d.d * 5}s` }} />)}

      {/* The sea: tap it to sail there. */}
      <div className="absolute inset-x-0 bottom-0 top-[58%]" onPointerDown={sailTo}>
        {[0, 1, 2].map((i) => (
          <svg key={i} viewBox="0 0 400 30" preserveAspectRatio="none" className={cn("pointer-events-none absolute left-0 w-[200%]", i % 2 ? "l-wave-fast" : "l-wave-slow")} style={{ top: `${4 + i * 26}%`, height: 30 + i * 6, opacity: 0.25 + i * 0.12 }} aria-hidden>
            <path d="M0 15 Q25 3 50 15 T100 15 T150 15 T200 15 T250 15 T300 15 T350 15 T400 15 V30 H0 Z" fill="#fff" />
          </svg>
        ))}
        {friend && (
          <span key={friend.k} className={cn("pointer-events-none absolute top-[6%]", friend.left ? "sm-swim-left" : "sm-swim-right")}>
            <span className="sm-leap block">
              <Glyph e={friend.e} size={110} />
            </span>
          </span>
        )}
      </div>

      {/* The boat. */}
      <div className="pointer-events-none absolute bottom-[10%] transition-[left] duration-[1600ms] ease-in-out" style={{ left: `${x}%` }}>
        <div className="relative" style={{ transform: faceLeft ? "scaleX(-1)" : undefined, transition: "transform 0.5s" }}>
          <span key={hop} className={cn("pointer-events-auto block", hop > 0 && "bt-hop")} style={{ transformOrigin: "50% 85%" }}>
            <SideBoat look={look} size={340} sea showTrail night={night} petReact={petReact} petTappable className={fast ? "sm-fast" : undefined} />
          </span>
          {burst && <Burst key={burst.k} kind={burst.kind} />}
        </div>
      </div>

      {/* Top: back, and the boat's name. */}
      <div className="absolute inset-x-0 top-0 flex items-center gap-3 p-5">
        <Chunk tone="white" onClick={() => (sfx("tap"), onBack())} aria-label="Back to the Shipyard" className="flex h-14 w-14 items-center justify-center rounded-full" style={{ borderRadius: 999 }}>
          <ArrowLeft className="h-7 w-7 text-[var(--l-ink)]" strokeWidth={3} />
        </Chunk>
        <span className="rounded-full bg-white/85 px-5 py-2 font-display text-2xl font-extrabold text-[var(--l-ink)] shadow-[0_4px_0_rgba(0,40,80,0.15)]">{look.name ? `The ${look.name}` : SHOP_BY_ID.get(look.boat)?.name ?? "My boat"}</span>
        <span className="ml-auto rounded-full bg-black/20 px-4 py-2 font-display text-lg font-bold text-white">Tap the water to sail!</span>
      </div>

      {/* Bottom: things to do. */}
      <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-center gap-3 p-4">
        {[
          { label: "Horn", icon: model === "duck" ? "🦆" : "📯", go: horn },
          { label: "Jump", icon: "🌊", go: jump },
          { label: look.pet ? "Pet trick" : "No pet yet", icon: "🦜", go: trick, off: !look.pet },
          { label: special.label, icon: special.icon, go: doSpecial },
          { label: time === "day" ? "Sunset" : time === "dusk" ? "Night" : "Morning", icon: time === "day" ? "🌅" : time === "dusk" ? "🌙" : "☀️", go: cycleTime },
          { label: sky === "sun" ? "Rain" : sky === "rain" ? "Rainbow" : sky === "rainbow" ? "Snow" : "Sunshine", icon: sky === "sun" ? "🌧️" : sky === "rain" ? "🌈" : sky === "rainbow" ? "❄️" : "☀️", go: cycleSky },
          { label: "Sea friends", icon: "🐬", go: callFriend },
        ].map((b) => (
          <Chunk key={b.label} tone="white" disabled={b.off} onClick={b.go} className="flex h-[92px] w-[108px] flex-col items-center justify-center gap-1 font-display text-base font-extrabold text-[var(--l-ink)]">
            <Glyph e={b.icon} size={44} />
            {b.label}
          </Chunk>
        ))}
      </div>
    </div>
  );
}

/** A little burst from the boat: horn notes, confetti, a splash or bubbles. */
function Burst({ kind }: { kind: "notes" | "confetti" | "splash" | "bubbles" }) {
  const bits = kind === "confetti" ? 18 : 7;
  const pic = kind === "notes" ? "🎵" : kind === "bubbles" || kind === "splash" ? "💧" : null;
  const colors = ["#ff5d5d", "#ffd93d", "#4cd964", "#2fb5ff", "#8b6cff", "#ff9f43"];
  return (
    <span className="pointer-events-none absolute inset-0">
      {Array.from({ length: bits }, (_, i) => {
        const dx = Math.round(Math.cos((i / bits) * Math.PI * 2) * (kind === "confetti" ? 150 : 90));
        const dy = Math.round(-60 - ((i * 37) % 80));
        const style = { left: kind === "confetti" ? "72%" : "50%", top: kind === "splash" ? "80%" : "25%", "--dx": `${dx}px`, "--dy": `${dy}px`, animationDelay: `${(i % 4) * 0.05}s` } as CSSProperties;
        return pic ? (
          <span key={i} className="sm-burst absolute" style={style}>
            <Glyph e={pic} size={kind === "notes" ? 34 : 26} />
          </span>
        ) : (
          <span key={i} className="sm-burst absolute h-3 w-2 rounded-sm" style={{ ...style, background: colors[i % colors.length] }} />
        );
      })}
    </span>
  );
}
