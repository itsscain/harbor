"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type Ref } from "react";
import { ArrowLeft, Play, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { GRADES, type Lesson, type SubjectId } from "@/lib/learn/types";
import { COURSES, SUBJECT_LOOK, courseMap, gradeLabel, type MapLesson, type MapUnit } from "@/lib/learn/curriculum";
import { THEMES, type BoatLook } from "@/lib/learn/meta";
import { shakyCount } from "@/lib/learn/mastery";
import { SAY, welcomeTo } from "@/lib/learn/script";
import { say } from "@/lib/learn/audio";
import { sfx } from "@/lib/learn/sfx";
import { Chunk } from "./kit";
import { SideBoat } from "./KidBoat";
import { Glyph, GlyphRow } from "./art/Glyph";
import type { KidLearnView } from "./learnData";

// A subject as a voyage: islands (worlds) of numbered levels — 1-1, 1-2, 1-3… — strung along a
// winding sea lane across a sea chart that looks like its island (palms and crabs in the
// shallows, icebergs in the fjords, a kraken in the deep). The child's own boat waits at the next
// level (and sails up to it after a win). Passed levels are gold with their stars, bosses are sea
// monsters, review levels are treasure maps, later islands stay locked until the one before is
// finished, and grown-up picks glow with a star.

const SPACING = 128;
const hash = (s: string, k: number) => {
  let h = 2166136261 ^ k;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
};

export function VoyageMap({
  subject,
  view,
  reduced,
  look,
  sailFrom,
  onBack,
  onStart,
  onPractice,
}: {
  subject: SubjectId;
  view: KidLearnView;
  reduced: boolean;
  look: BoatLook;
  /** The level just passed — the boat sails from there to the next one. */
  sailFrom?: string | null;
  onBack: () => void;
  onStart: (l: Lesson) => void;
  onPractice: () => void;
}) {
  const { kid, profile, assignments } = view;
  const sl = SUBJECT_LOOK[subject];
  const assigned = new Set(assignments.map((a) => a.lesson_id));
  const best = (id: string) => (kid.lessons[id] ? kid.lessons[id].stars : null);
  const map = courseMap(subject, profile.grade, best, assigned);
  const [picked, setPicked] = useState<(MapLesson & { testOut?: boolean }) | null>(null);
  const [shake, setShake] = useState<{ id: string; n: number } | null>(null);
  const [showEarlier, setShowEarlier] = useState(false);
  const nextRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(900);
  const review = map.filter((u) => u.review);
  const ahead = map.filter((u) => !u.review);
  const passed = ahead.reduce((n, u) => n + u.lessons.filter((l) => l.state === "done").length, 0);
  const total = ahead.reduce((n, u) => n + u.lessons.length, 0);
  const stars = map.reduce((n, u) => n + u.stars, 0);
  const shaky = shakyCount(kid.skills, subject);
  const current = map.find((u) => u.lessons.some((l) => l.state === "next"));

  // The chart is as wide as the screen allows (the lane winds wider on a big wall).
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fit = () => setW(Math.max(340, Math.min(1080, el.clientWidth)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    nextRef.current?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
    if (sailFrom) {
      const t = window.setTimeout(() => {
        sfx("whoosh");
        void say(SAY.sailOn);
      }, 450);
      return () => window.clearTimeout(t);
    }
    if (current) void say(welcomeTo(current.unit.theme));
    // Once when the map opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tapNode = (l: MapLesson, islandOpen: boolean) => {
    // A locked boss on an open island is a test-out: beat it to skip ahead.
    const testOut = l.state === "locked" && islandOpen && l.lesson.kind === "boss";
    if (l.state === "locked" && !testOut) {
      sfx("wrong");
      setShake((s) => ({ id: l.lesson.id, n: (s?.n ?? 0) + 1 }));
      void say(SAY.locked);
      return;
    }
    sfx("pick");
    setPicked({ ...l, testOut });
  };

  const section = (u: MapUnit, prevTitle: string | null) => {
    const th = THEMES[u.unit.theme];
    const amp = Math.min(W * 0.3, 320);
    const height = u.lessons.length * SPACING + 60;
    const pts = u.lessons.map((_, i) => [W / 2 + Math.sin(i * 0.95 + 0.4) * amp, i * SPACING + 74] as const);
    const seg = (i: number) => {
      const [x0, y0] = pts[i - 1];
      const [x, y] = pts[i];
      return `Q ${(x0 + x) / 2 + (i % 2 ? 50 : -50)} ${(y0 + y) / 2} ${x} ${y}`;
    };
    const d = pts.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : seg(i))).join(" ");
    const doneUpTo = u.lessons.reduce((k, l, i) => (l.state === "done" ? i : k), -1);
    const dDone = doneUpTo > 0 ? pts.slice(0, doneUpTo + 1).map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : seg(i))).join(" ") : "";
    // Scenery: the island's things, scattered along the side of the chart away from the lane.
    const deco = Array.from({ length: Math.max(4, Math.round(u.lessons.length * 1.3)) }, (_, k) => {
      const y = 40 + ((k + 0.5) / Math.max(4, Math.round(u.lessons.length * 1.3))) * (height - 60);
      const laneX = W / 2 + Math.sin((y - 74) / SPACING * 0.95 + 0.4) * amp;
      const left = laneX > W / 2;
      const margin = Math.max(70, W / 2 - amp - 40);
      const x = left ? 20 + hash(u.unit.id, k) * Math.max(40, laneX - 140 - 20) : laneX + 120 + hash(u.unit.id, k) * Math.max(40, W - laneX - 160);
      return { e: th.deco[k % th.deco.length], x: Math.min(W - 70, Math.max(10, x)), y, s: 58 + hash(u.unit.id, k + 50) * 34, motion: k % 3, margin };
    });
    return (
      <section key={u.unit.id} className="relative mt-8 overflow-hidden rounded-[44px] pb-8 shadow-[0_10px_0_rgba(0,40,80,0.16)]" style={{ background: `linear-gradient(180deg, ${th.sky[0]} 0%, ${th.sky[1]} 14%, ${th.sea[0]} 38%, ${th.sea[1]} 100%)` }}>
        {/* Wave ripples across the chart. */}
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(ellipse 34px 8px at 50% 50%, transparent 60%, rgba(255,255,255,0.7) 62%, transparent 72%)", backgroundSize: "120px 64px", backgroundPosition: "0 0, 60px 32px" }} aria-hidden />
        {/* Island banner. */}
        <div className="relative z-[2] mx-auto mt-6 flex w-[min(94%,760px)] items-center gap-5 rounded-[32px] bg-white/95 px-5 py-4 shadow-[0_8px_0_rgba(0,40,80,0.16)]">
          <span className="relative flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-full shadow-[0_5px_0_rgba(0,40,80,0.15)]" style={{ background: `radial-gradient(circle at 35% 30%, ${sl.from}, ${sl.to})` }}>
            <span className="absolute inset-[6px] rounded-full bg-white/90" />
            {u.unlocked ? <GlyphRow s={u.unit.emoji} size={58} className="relative" /> : <Glyph e="🔒" size={50} className="relative" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-extrabold uppercase tracking-wider" style={{ color: sl.to }}>
              Island {u.unit.n} · {th.name}
            </p>
            <p className="truncate font-display text-[30px] font-extrabold leading-tight text-[var(--l-ink)]">{u.unit.title}</p>
            <p className="truncate font-display text-base font-bold text-[var(--l-ink-2)]">{u.unlocked ? u.unit.blurb : `Finish ${prevTitle ?? "the island before"} to sail here`}</p>
            {u.unlocked && (
              <div className="mt-2 h-3 w-full max-w-[360px] overflow-hidden rounded-full bg-[var(--l-card-2)]">
                <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${(u.lessons.filter((l) => l.state === "done").length / Math.max(1, u.lessons.length)) * 100}%`, background: `linear-gradient(90deg, ${sl.from}, ${sl.to})` }} />
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="rounded-full bg-[var(--l-card-2)] px-3 py-1 font-display text-sm font-extrabold text-[var(--l-ink-2)]">{gradeLabel(u.unit.grade)}</span>
            <span className="flex items-center gap-1 rounded-full bg-[#fff6d6] px-3 py-1 font-display text-base font-extrabold text-[var(--l-gold-edge)]">
              <Glyph e="⭐" size={22} /> {u.stars}/{u.maxStars}
            </span>
          </div>
        </div>
        {/* The lane, the scenery and the levels. */}
        <div className={cn("relative mx-auto mt-4", !u.unlocked && "opacity-70 grayscale-[0.45]")} style={{ width: W, height }}>
          {deco.map((g, k) => (
            <span key={k} className={cn("pointer-events-none absolute block drop-shadow-[0_6px_6px_rgba(0,30,60,0.18)]", !reduced && (g.motion === 0 ? "l-bob" : g.motion === 1 ? "l-sway" : ""))} style={{ left: g.x, top: g.y - g.s / 2, animationDelay: `${k * 0.45}s` } as CSSProperties} aria-hidden>
              <Glyph e={g.e} size={g.s} />
            </span>
          ))}
          <svg className="pointer-events-none absolute inset-0" width={W} height={height} viewBox={`0 0 ${W} ${height}`} aria-hidden>
            <path d={d} fill="none" stroke="rgba(0,40,80,0.18)" strokeWidth="26" strokeLinecap="round" transform="translate(0 4)" />
            <path d={d} fill="none" stroke={th.path} strokeWidth="22" strokeLinecap="round" opacity="0.75" />
            {dDone && <path d={dDone} fill="none" stroke="#ffd23a" strokeWidth="12" strokeLinecap="round" opacity="0.95" />}
            <path d={d} fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" strokeDasharray="1 20" opacity="0.95" />
          </svg>
          {u.lessons.map((l, i) => {
            const [x, y] = pts[i];
            return <Node key={l.lesson.id} l={l} x={x} y={y} sl={sl} unitOpen={u.unlocked && !u.complete} look={look} reduced={reduced} sailIn={!!sailFrom} shakeN={shake?.id === l.lesson.id ? shake.n : 0} nodeRef={l.state === "next" ? nextRef : undefined} onTap={() => tapNode(l, u.unlocked && !u.complete)} />;
          })}
        </div>
      </section>
    );
  };

  return (
    <div ref={wrapRef} className="mx-auto flex w-full max-w-[1120px] flex-col px-4 pb-44 pt-2 sm:px-6">
      {/* Header: back · the subject · how far · practice */}
      <div className="sticky top-0 z-10 -mx-4 mb-1 flex items-center gap-4 rounded-b-[28px] px-4 py-3 shadow-[0_8px_24px_rgba(0,50,90,0.18)] backdrop-blur-md sm:-mx-6 sm:px-6" style={{ background: "linear-gradient(180deg, rgba(64,186,236,0.97), rgba(46,170,226,0.94))" }}>
        <Chunk tone="white" onClick={() => (sfx("tap"), onBack())} aria-label="Back" className="flex h-14 w-14 items-center justify-center rounded-full" style={{ borderRadius: 999 }}>
          <ArrowLeft className="h-7 w-7 text-[var(--l-ink)]" strokeWidth={3} />
        </Chunk>
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full shadow-[0_4px_0_rgba(0,40,80,0.18)]" style={{ background: `radial-gradient(circle at 35% 30%, ${sl.from}, ${sl.to})` }}>
          <span className="absolute inset-[5px] rounded-full bg-white/90" />
          <Glyph e={sl.island} size={44} className="relative" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[34px] font-extrabold leading-none text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.28)]">{COURSES[subject].title}</p>
          <p className="mt-1.5 flex items-center gap-2 font-display text-lg font-bold text-white/95">
            {passed} of {total} levels
            <span className="flex items-center gap-1 rounded-full bg-white/25 px-2.5 py-0.5">
              <Glyph e="⭐" size={20} /> {stars}
            </span>
            <span className="rounded-full bg-white/25 px-2.5 py-0.5">{GRADES.find((g) => g.id === profile.grade)?.label ?? gradeLabel(profile.grade)}</span>
          </p>
        </div>
        {shaky >= 2 && (
          <Chunk tone="teal" onClick={() => (sfx("pick"), void say(SAY.practiceCove), onPractice())} className="flex h-16 items-center gap-2 px-5 font-display text-xl font-extrabold">
            <Glyph e="🏝️" size={40} /> Practice
          </Chunk>
        )}
      </div>

      {review.length > 0 && (
        <div className="mt-2">
          <button type="button" onClick={() => (sfx("tap"), setShowEarlier((s) => !s))} className="flex w-full items-center justify-between rounded-[26px] bg-white/30 px-5 py-4 font-display text-xl font-extrabold text-white">
            <span className="flex items-center gap-2">
              <Glyph e="🧭" size={34} /> Earlier islands ({review.length}) — review anytime
            </span>
            <ChevronDown className={cn("h-7 w-7 transition-transform", showEarlier && "rotate-180")} strokeWidth={3} />
          </button>
          {showEarlier && review.map((u, k) => section(u, k ? review[k - 1].unit.title : null))}
        </div>
      )}
      {ahead.map((u, k) => section(u, k ? ahead[k - 1].unit.title : review[review.length - 1]?.unit.title ?? null))}

      {picked && <LevelSheet picked={picked} sl={sl} onClose={() => setPicked(null)} onStart={() => (sfx("pick"), onStart(picked.lesson))} />}
    </div>
  );
}

/** One level on the lane: gold when passed (with its stars), the subject's color when it's next
 *  (the boat waits beside it), frosted and locked when it isn't open yet. */
function Node({
  l,
  x,
  y,
  sl,
  unitOpen,
  look,
  reduced,
  sailIn,
  shakeN,
  nodeRef,
  onTap,
}: {
  l: MapLesson;
  x: number;
  y: number;
  sl: (typeof SUBJECT_LOOK)[SubjectId];
  unitOpen: boolean;
  look: BoatLook;
  reduced: boolean;
  sailIn: boolean;
  shakeN: number;
  nodeRef?: Ref<HTMLDivElement>;
  onTap: () => void;
}) {
  const isNext = l.state === "next";
  const done = l.state === "done";
  const locked = l.state === "locked";
  const boss = l.lesson.kind === "boss";
  const review = l.lesson.kind === "review";
  const size = boss ? 124 : isNext ? 108 : 96;
  const testOut = locked && boss && unitOpen;
  const face = done ? ["#fff3a8", "#ffd23a", "#e09a00"] : locked ? ["#f4f8fb", "#dbe5ee", "#b7c7d6"] : boss ? ["#c4a6ff", "#7c3aed", "#5b21b6"] : [sl.from, sl.to, sl.ink];
  return (
    <div ref={nodeRef} className="absolute z-[1] flex flex-col items-center" style={{ left: x - size / 2, top: y - size / 2, width: size }}>
      {isNext && (
        <span className={cn("absolute -left-[116px] -top-7 z-[2]", !reduced && (sailIn ? "l-sail-in" : "l-sail"))}>
          <SideBoat look={look} size={108} bob={false} showTrail />
        </span>
      )}
      {isNext && (
        <span className={cn("absolute left-full top-1/2 z-[3] ml-3 -translate-y-1/2 whitespace-nowrap rounded-2xl bg-white px-4 py-2 font-display text-xl font-extrabold shadow-[0_5px_0_var(--l-line)]", !reduced && "l-bob")} style={{ color: sl.to }}>
          {l.played ? "TRY AGAIN" : "PLAY"}
          <span className="absolute -left-2 top-1/2 h-4 w-4 -translate-y-1/2 rotate-45 bg-white" />
        </span>
      )}
      <button
        type="button"
        aria-label={`Level ${l.label}: ${l.lesson.title}${locked ? (testOut ? ", test out to skip ahead" : ", locked") : ""}`}
        onClick={onTap}
        className={cn("l-chunk relative flex items-center justify-center rounded-full", isNext && !reduced && "l-ring")}
        style={{ width: size, height: size, borderRadius: 999, "--f": face[1], "--e": face[2], backgroundImage: `radial-gradient(circle at 34% 28%, ${face[0]} 0%, ${face[1]} 58%, ${face[2]} 100%)` } as CSSProperties}
      >
        {/* A white ring inside the button, like a buoy. */}
        <span className="pointer-events-none absolute inset-[7px] rounded-full border-[3px] border-white/70" />
        <span key={shakeN} className={cn("relative flex flex-col items-center leading-none", shakeN > 0 && "l-shake")}>
          {locked && !testOut ? (
            <Glyph e="🔒" size={44} className="opacity-80" />
          ) : boss ? (
            <Glyph e="🐙" size={78} />
          ) : review ? (
            <Glyph e="🗺️" size={58} />
          ) : (
            <span className={cn("font-display font-extrabold tabular-nums drop-shadow-[0_2px_0_rgba(0,0,0,0.12)]", done ? "text-[#6b4400]" : "text-white")} style={{ fontSize: isNext ? 34 : 30 }}>
              {l.label}
            </span>
          )}
        </span>
        {l.assigned && !done && (
          <span className="absolute -right-1 -top-1 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--l-coral)] shadow-[0_3px_0_var(--l-coral-edge)]">
            <Glyph e="⭐" size={28} />
          </span>
        )}
        {l.played && !done && !locked && (
          <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-[0_3px_0_var(--l-line)]">
            <Glyph e="🔁" size={24} />
          </span>
        )}
        {testOut && (
          <span className="absolute -right-3 -top-3 flex h-11 items-center gap-1 rounded-full bg-[var(--l-gold)] px-2.5 font-display text-base font-extrabold text-[#5a3b00] shadow-[0_3px_0_var(--l-gold-edge)]">
            <Glyph e="⏩" size={22} /> Skip
          </span>
        )}
      </button>
      {done ? (
        <span className="mt-1.5 flex items-end gap-0.5 rounded-full bg-white/90 px-2 py-0.5 shadow-[0_3px_0_rgba(0,40,80,0.12)]" aria-label={`${l.stars} of 3 stars`}>
          {[0, 1, 2].map((k) => (
            <Glyph key={k} e="⭐" size={k === 1 ? 26 : 21} style={{ filter: k < l.stars ? "none" : "grayscale(1) opacity(0.35)" }} />
          ))}
        </span>
      ) : (
        (boss || review) && <span className="mt-1.5 rounded-full bg-white/90 px-2.5 font-display text-sm font-extrabold text-[var(--l-ink)] shadow-[0_3px_0_rgba(0,40,80,0.12)]">{boss ? `Boss ${l.label}` : l.label}</span>
      )}
    </div>
  );
}

/** The card that opens when a level is tapped. */
function LevelSheet({ picked, sl, onClose, onStart }: { picked: MapLesson & { testOut?: boolean }; sl: (typeof SUBJECT_LOOK)[SubjectId]; onClose: () => void; onStart: () => void }) {
  const l = picked.lesson;
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-[#0b2340]/25 p-4" onClick={onClose}>
      <div className="l-rise relative flex w-full max-w-[720px] items-center gap-5 overflow-hidden rounded-[34px] bg-white p-5 pl-6 shadow-[0_10px_0_var(--l-line),0_24px_50px_-12px_rgba(0,40,80,0.55)]" onClick={(e) => e.stopPropagation()}>
        <span className="pointer-events-none absolute inset-y-0 left-0 w-2" style={{ background: `linear-gradient(180deg, ${sl.from}, ${sl.to})` }} />
        <span className="relative flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-[26px] shadow-[0_5px_0_rgba(0,40,80,0.15)]" style={{ background: `linear-gradient(135deg, ${sl.from}, ${sl.to})` }}>
          <span className="absolute inset-[5px] rounded-[21px] bg-white/90" />
          <GlyphRow s={l.emoji} size={60} className="relative" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-extrabold uppercase tracking-wider" style={{ color: sl.to }}>
            Level {picked.label}
            {l.kind === "boss" ? " · Boss" : l.kind === "review" ? " · Treasure review" : ""}
          </p>
          <p className="truncate font-display text-[30px] font-extrabold leading-tight text-[var(--l-ink)]">{l.title}</p>
          {picked.state === "done" ? (
            <span className="mt-1 flex items-end gap-1" aria-label={`${picked.stars} of 3 stars`}>
              {[0, 1, 2].map((k) => (
                <Glyph key={k} e="⭐" size={k === 1 ? 34 : 28} style={{ filter: k < picked.stars ? "none" : "grayscale(1) opacity(0.35)" }} />
              ))}
            </span>
          ) : picked.testOut ? (
            <p className="mt-1 flex items-center gap-1.5 font-display text-base font-bold text-[var(--l-ink-2)]">
              <Glyph e="⏩" size={24} /> Already know this island? Beat the boss to skip ahead!
            </p>
          ) : (
            <p className="mt-1 flex items-center gap-1.5 font-display text-base font-bold text-[var(--l-ink-2)]">
              <Glyph e={l.kind === "boss" ? "🐙" : l.kind === "review" ? "🗺️" : "🎯"} size={24} /> {l.activities.length} challenges
            </p>
          )}
        </div>
        <Chunk tone="green" onClick={onStart} className="flex h-20 items-center gap-2 px-8 font-display text-2xl font-extrabold">
          <Play className="h-8 w-8 fill-current" /> {picked.state === "done" ? "Again" : picked.testOut ? "Test out" : "Go!"}
        </Chunk>
      </div>
    </div>
  );
}
