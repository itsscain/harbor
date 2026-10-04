"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, Lock, Play, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Lesson, SubjectId } from "@/lib/learn/types";
import { COURSES, SUBJECT_LOOK, courseMap, gradeLabel, type MapLesson, type MapUnit } from "@/lib/learn/curriculum";
import { THEMES, type BoatLook } from "@/lib/learn/meta";
import { shakyCount } from "@/lib/learn/mastery";
import { SAY, welcomeTo } from "@/lib/learn/script";
import { say } from "@/lib/learn/audio";
import { sfx } from "@/lib/learn/sfx";
import { Chunk, Stars } from "./kit";
import { SideBoat } from "./KidBoat";
import type { KidLearnView } from "./learnData";

// A subject as a voyage: islands (worlds) of numbered levels — 1-1, 1-2, 1-3… — strung along a
// winding sea lane. The child's own boat waits at the next level (and sails up to it after a
// win). Passed levels show their stars, bosses are sea monsters, review levels are treasure maps,
// and later islands stay locked until the one before is finished. Grown-up picks glow with a star.

const SPACING = 124;
const WIDTH = 620;
const offsetAt = (i: number) => Math.round(Math.sin(i * 0.95) * 150);

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
  const review = map.filter((u) => u.review);
  const ahead = map.filter((u) => !u.review);
  const passed = ahead.reduce((n, u) => n + u.lessons.filter((l) => l.state === "done").length, 0);
  const total = ahead.reduce((n, u) => n + u.lessons.length, 0);
  const stars = map.reduce((n, u) => n + u.stars, 0);
  const shaky = shakyCount(kid.skills, subject);
  const current = map.find((u) => u.lessons.some((l) => l.state === "next"));

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
    const height = u.lessons.length * SPACING + 40;
    const pts = u.lessons.map((_, i) => [WIDTH / 2 + offsetAt(i), i * SPACING + 58] as const);
    const d = pts.map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `Q ${(pts[i - 1][0] + x) / 2 + (i % 2 ? 40 : -40)} ${(pts[i - 1][1] + y) / 2} ${x} ${y}`)).join(" ");
    return (
      <section key={u.unit.id} className="relative mt-8 overflow-hidden rounded-[40px] pb-6" style={{ background: `linear-gradient(180deg, ${th.sky[0]}, ${th.sea[0]} 30%, ${th.sea[1]})` }}>
        {/* scenery */}
        {th.deco.map((e, k) => (
          <span key={k} className={cn("pointer-events-none absolute select-none opacity-90", !reduced && k % 2 === 0 && "l-bob")} style={{ fontSize: 44 + (k % 3) * 10, left: k % 2 ? "4%" : "86%", top: `${12 + k * 17}%`, animationDelay: `${k * 0.5}s` }} aria-hidden>
            {e}
          </span>
        ))}
        {/* world banner */}
        <div className="relative z-[1] mx-auto mt-5 flex w-[min(92%,640px)] items-center gap-4 rounded-[28px] bg-white/92 px-5 py-4 shadow-[0_7px_0_rgba(0,40,80,0.18)]">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-[40px]" style={{ background: `linear-gradient(135deg, ${sl.from}, ${sl.to})` }}>
            {u.unlocked ? u.unit.emoji : "🔒"}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-extrabold uppercase tracking-wide" style={{ color: sl.to }}>
              Island {u.unit.n} · {th.name}
            </p>
            <p className="truncate font-display text-[26px] font-extrabold leading-tight text-[var(--l-ink)]">{u.unit.title}</p>
            <p className="truncate font-display text-base font-bold text-[var(--l-ink-2)]">{u.unlocked ? u.unit.blurb : `Finish ${prevTitle ?? "the island before"} to sail here`}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="rounded-full bg-[var(--l-card-2)] px-3 py-1 font-display text-sm font-extrabold text-[var(--l-ink-2)]">{gradeLabel(u.unit.grade)}</span>
            <span className="font-display text-sm font-extrabold text-[var(--l-gold-edge)]">
              ⭐ {u.stars}/{u.maxStars}
            </span>
          </div>
        </div>
        {/* the lane + levels */}
        <div className={cn("relative mx-auto mt-6", !u.unlocked && "opacity-60 grayscale-[0.4]")} style={{ width: WIDTH, maxWidth: "100%", height }}>
          <svg className="pointer-events-none absolute inset-0" width={WIDTH} height={height} viewBox={`0 0 ${WIDTH} ${height}`} aria-hidden>
            <path d={d} fill="none" stroke={th.path} strokeWidth="16" strokeLinecap="round" opacity="0.55" />
            <path d={d} fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 18" opacity="0.9" />
          </svg>
          {u.lessons.map((l, i) => {
            const [x, y] = pts[i];
            const isNext = l.state === "next";
            const kindIcon = l.lesson.kind === "boss" ? "🐙" : l.lesson.kind === "review" ? "🗺️" : null;
            const big = l.lesson.kind === "boss";
            const size = big ? 112 : 92;
            return (
              <div key={l.lesson.id} ref={isNext ? nextRef : undefined} className="absolute flex flex-col items-center" style={{ left: x - size / 2, top: y - size / 2, width: size }}>
                {isNext && (
                  <span className={cn("absolute -left-[104px] -top-6 z-[2]", !reduced && sailFrom ? "l-sail-in" : !reduced && "l-sail")}>
                    <SideBoat look={look} size={100} bob={false} showTrail />
                  </span>
                )}
                {isNext && (
                  <span className={cn("absolute left-full top-1/2 z-[1] ml-3 -translate-y-1/2 whitespace-nowrap rounded-2xl bg-white px-4 py-1.5 font-display text-lg font-extrabold shadow-[0_4px_0_var(--l-line)]", !reduced && "l-bob")} style={{ color: sl.to }}>
                    {l.played ? "TRY AGAIN" : "PLAY"}
                  </span>
                )}
                <button
                  type="button"
                  aria-label={`Level ${l.label}: ${l.lesson.title}${l.state === "locked" ? (big && u.unlocked && !u.complete ? ", test out to skip ahead" : ", locked") : ""}`}
                  onClick={() => tapNode(l, u.unlocked && !u.complete)}
                  className={cn("l-chunk relative flex items-center justify-center rounded-full", isNext && !reduced && "l-ring")}
                  style={
                    {
                      width: size,
                      height: size,
                      borderRadius: 999,
                      "--f": l.state === "done" ? "var(--l-gold)" : l.state === "locked" ? "#d7e3ec" : big ? "#7c3aed" : sl.to,
                      "--e": l.state === "done" ? "var(--l-gold-edge)" : l.state === "locked" ? "#b4c6d4" : big ? "#5b21b6" : sl.ink,
                    } as CSSProperties
                  }
                >
                  <span key={shake?.id === l.lesson.id ? shake.n : 0} className={cn("flex flex-col items-center leading-none", shake?.id === l.lesson.id && "l-shake")}>
                    {l.state === "locked" ? (
                      <Lock className="h-9 w-9 text-[#8aa1b3]" strokeWidth={2.6} />
                    ) : kindIcon ? (
                      <span style={{ fontSize: big ? 56 : 44 }}>{kindIcon}</span>
                    ) : (
                      <span className={cn("font-display font-extrabold tabular-nums", l.state === "done" ? "text-[#5a3b00]" : "text-white")} style={{ fontSize: 30 }}>
                        {l.label}
                      </span>
                    )}
                  </span>
                  {l.assigned && l.state !== "done" && <span className="absolute -right-1 -top-1 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--l-coral)] text-lg shadow-[0_3px_0_var(--l-coral-edge)]">⭐</span>}
                  {l.played && l.state !== "done" && l.state !== "locked" && <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-base shadow-[0_3px_0_var(--l-line)]">🔁</span>}
                  {l.state === "locked" && big && u.unlocked && !u.complete && <span className="absolute -right-2 -top-2 flex h-10 items-center rounded-full bg-[var(--l-gold)] px-2 font-display text-sm font-extrabold text-[#5a3b00] shadow-[0_3px_0_var(--l-gold-edge)]">⏩</span>}
                </button>
                {l.state === "done" ? (
                  <Stars n={l.stars} size={20} className="mt-1.5 rounded-full bg-white/80 px-1.5 py-0.5" />
                ) : (
                  kindIcon && <span className="mt-1.5 rounded-full bg-white/85 px-2 font-display text-sm font-extrabold text-[var(--l-ink)]">{l.label}</span>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col px-4 pb-40 pt-2 sm:px-6">
      <div className="sticky top-0 z-10 -mx-4 mb-2 flex items-center gap-3 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6" style={{ background: "linear-gradient(180deg, rgba(76,195,240,0.88), rgba(76,195,240,0))" }}>
        <Chunk tone="white" onClick={() => (sfx("tap"), onBack())} aria-label="Back" className="flex h-14 w-14 items-center justify-center rounded-full" style={{ borderRadius: 999 }}>
          <ArrowLeft className="h-7 w-7 text-[var(--l-ink)]" strokeWidth={3} />
        </Chunk>
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl text-4xl" style={{ background: `linear-gradient(135deg, ${sl.from}, ${sl.to})` }}>
          {sl.island}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-3xl font-extrabold leading-none text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.25)]">{COURSES[subject].title}</p>
          <p className="mt-1 font-display text-base font-bold text-white/90">
            {passed} of {total} levels · ⭐ {stars} · {gradeLabel(profile.grade)}
          </p>
        </div>
        {shaky >= 2 && (
          <Chunk tone="teal" onClick={() => (sfx("pick"), void say(SAY.practiceCove), onPractice())} className="flex h-14 items-center gap-2 px-4 font-display text-lg font-extrabold">
            🏝️ Practice
          </Chunk>
        )}
      </div>

      {review.length > 0 && (
        <div className="mt-2">
          <button type="button" onClick={() => (sfx("tap"), setShowEarlier((s) => !s))} className="flex w-full items-center justify-between rounded-[24px] bg-white/30 px-5 py-4 font-display text-xl font-extrabold text-white">
            <span>🧭 Earlier islands ({review.length}) — review anytime</span>
            <ChevronDown className={cn("h-7 w-7 transition-transform", showEarlier && "rotate-180")} strokeWidth={3} />
          </button>
          {showEarlier && review.map((u, k) => section(u, k ? review[k - 1].unit.title : null))}
        </div>
      )}
      {ahead.map((u, k) => section(u, k ? ahead[k - 1].unit.title : review[review.length - 1]?.unit.title ?? null))}

      {picked && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center p-4" onClick={() => setPicked(null)}>
          <div className="l-rise flex w-full max-w-[640px] items-center gap-4 rounded-[30px] bg-white p-5 shadow-[0_8px_0_var(--l-line),0_20px_40px_-12px_rgba(0,40,80,0.5)]" onClick={(e) => e.stopPropagation()}>
            <span className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-[22px] text-white" style={{ background: `linear-gradient(135deg, ${sl.from}, ${sl.to})` }}>
              <span className="text-4xl leading-none">{picked.lesson.emoji}</span>
              <span className="font-display text-sm font-extrabold">{picked.label}</span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[26px] font-extrabold leading-tight text-[var(--l-ink)]">{picked.lesson.title}</p>
              {picked.state === "done" ? (
                <Stars n={picked.stars} size={22} />
              ) : picked.testOut ? (
                <p className="font-display text-base font-bold text-[var(--l-ink-2)]">⏩ Already know this island? Beat the boss to skip ahead!</p>
              ) : (
                <p className="font-display text-base font-bold text-[var(--l-ink-2)]">
                  {picked.lesson.kind === "boss" ? "🐙 Boss level · " : picked.lesson.kind === "review" ? "🗺️ Treasure review · " : ""}
                  {picked.lesson.activities.length} challenges
                </p>
              )}
            </div>
            <Chunk tone="green" onClick={() => (sfx("pick"), onStart(picked.lesson))} className="flex h-20 items-center gap-2 px-7 font-display text-2xl font-extrabold">
              <Play className="h-8 w-8 fill-current" /> {picked.state === "done" ? "Again" : picked.testOut ? "Test out" : "Go!"}
            </Chunk>
          </div>
        </div>
      )}
    </div>
  );
}
