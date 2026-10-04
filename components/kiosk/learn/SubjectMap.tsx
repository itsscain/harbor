"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Lock, Play } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Lesson, SubjectId } from "@/lib/learn/types";
import { GRADES } from "@/lib/learn/types";
import { COURSES, SUBJECT_LOOK, courseMap, type LessonState } from "@/lib/learn/curriculum";
import { SAY } from "@/lib/learn/script";
import { say } from "@/lib/learn/audio";
import { sfx } from "@/lib/learn/sfx";
import { Chunk, Stars } from "./kit";
import type { KidLearnView } from "./learnData";

// One subject as a voyage: units are islands along a winding path of lesson stops. Done stops
// show their stars, the next one glows with the boat waiting beside it, later ones are locked
// until the path reaches them (assigned lessons are always open).

const ZIG = [0, 70, 110, 70, 0, -70, -110, -70];

export function SubjectMap({ subject, view, reduced, onBack, onStart }: { subject: SubjectId; view: KidLearnView; reduced: boolean; onBack: () => void; onStart: (l: Lesson) => void }) {
  const { kid, profile, assignments } = view;
  const look = SUBJECT_LOOK[subject];
  const assigned = new Set(assignments.map((a) => a.lesson_id));
  const map = courseMap(subject, profile.grade, (id) => (kid.lessons[id]?.stars ?? 0) > 0, assigned);
  const [picked, setPicked] = useState<{ lesson: Lesson; state: LessonState } | null>(null);
  const [shake, setShake] = useState<{ id: string; n: number } | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const all = map.flatMap((u) => u.lessons);
  const doneN = all.filter((l) => l.state === "done").length;

  useEffect(() => {
    nextRef.current?.scrollIntoView({ block: "center", behavior: reduced ? "auto" : "smooth" });
  }, [reduced]);

  const offset = new Map(all.map((l, i) => [l.lesson.id, ZIG[i % ZIG.length]]));
  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col px-4 pb-40 pt-2 sm:px-6">
      <div className="sticky top-0 z-10 -mx-4 mb-2 flex items-center gap-3 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6" style={{ background: "linear-gradient(180deg, rgba(76,195,240,0.85), rgba(76,195,240,0))" }}>
        <Chunk tone="white" onClick={() => (sfx("tap"), onBack())} aria-label="Back" className="flex h-14 w-14 items-center justify-center rounded-full" style={{ borderRadius: 999 }}>
          <ArrowLeft className="h-7 w-7 text-[var(--l-ink)]" strokeWidth={3} />
        </Chunk>
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl text-4xl" style={{ background: `linear-gradient(135deg, ${look.from}, ${look.to})` }}>
          {look.island}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-3xl font-extrabold leading-none text-white drop-shadow-[0_2px_0_rgba(0,40,80,0.25)]">{COURSES[subject].title}</p>
          <p className="mt-1 font-display text-base font-bold text-white/90">
            {doneN} of {all.length} lessons · {GRADES.find((g) => g.id === profile.grade)?.label}
          </p>
        </div>
      </div>

      {map.map(({ unit, unlocked, lessons }) => (
        <section key={unit.id} className="mt-6 flex flex-col items-center">
          <div className={cn("flex w-full max-w-[620px] items-center gap-4 rounded-[26px] px-5 py-4 shadow-[0_6px_0_rgba(0,40,80,0.2)]", unlocked ? "text-white" : "bg-white/35 text-white/90")} style={unlocked ? { background: `linear-gradient(135deg, ${look.from}, ${look.to})` } : undefined}>
            <span className="text-5xl">{unlocked ? unit.emoji : "🔒"}</span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-2xl font-extrabold leading-tight">{unit.title}</p>
              <p className="font-display text-base font-bold opacity-90">{unit.blurb}</p>
            </div>
            <span className="rounded-full bg-white/25 px-3 py-1 font-display text-sm font-extrabold">{GRADES.find((g) => g.id === unit.grade)?.short}</span>
          </div>
          <div className="mt-4 flex w-full flex-col items-center gap-4">
            {lessons.map(({ lesson, state }) => {
              const off = offset.get(lesson.id) ?? 0;
              const stars = kid.lessons[lesson.id]?.stars ?? 0;
              const isNext = state === "next";
              const isAssigned = assigned.has(lesson.id);
              return (
                <div key={lesson.id} className="relative flex flex-col items-center" style={{ transform: `translateX(${off}px)` }}>
                  {isNext && (
                    <span className={cn("absolute -top-11 z-[1] whitespace-nowrap rounded-2xl bg-white px-4 py-1.5 font-display text-lg font-extrabold shadow-[0_4px_0_var(--l-line)]", !reduced && "l-bob")} style={{ color: look.to }}>
                      START
                    </span>
                  )}
                  <button
                    ref={isNext ? nextRef : undefined}
                    type="button"
                    aria-label={`${lesson.title}${state === "locked" ? ", locked" : ""}`}
                    onClick={() => {
                      if (state === "locked") {
                        sfx("wrong");
                        setShake((s) => ({ id: lesson.id, n: (s?.n ?? 0) + 1 }));
                        void say(SAY.locked);
                        return;
                      }
                      sfx("pick");
                      setPicked({ lesson, state });
                    }}
                    className={cn("l-chunk relative flex h-[96px] w-[96px] items-center justify-center rounded-full", isNext && !reduced && "l-ring")}
                    style={
                      {
                        borderRadius: 999,
                        "--f": state === "done" ? "var(--l-gold)" : state === "locked" ? "#d7e3ec" : look.to,
                        "--e": state === "done" ? "var(--l-gold-edge)" : state === "locked" ? "#b4c6d4" : look.ink,
                      } as React.CSSProperties
                    }
                  >
                    <span key={shake?.id === lesson.id ? shake.n : 0} className={cn("text-[46px] leading-none", shake?.id === lesson.id && "l-shake", state === "locked" && "opacity-50 grayscale")}>
                      {state === "locked" ? <Lock className="h-10 w-10 text-[#8aa1b3]" strokeWidth={2.6} /> : lesson.emoji}
                    </span>
                    {isAssigned && state !== "done" && <span className="absolute -right-1 -top-1 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--l-coral)] text-lg shadow-[0_3px_0_var(--l-coral-edge)]">⭐</span>}
                    {isNext && <span className={cn("absolute -left-16 top-4 text-5xl", !reduced && "l-bob")}>⛵</span>}
                  </button>
                  {state === "done" && <Stars n={stars} size={20} className="mt-2" />}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {picked && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center p-4" onClick={() => setPicked(null)}>
          <div className="l-rise flex w-full max-w-[620px] items-center gap-4 rounded-[30px] bg-white p-5 shadow-[0_8px_0_var(--l-line),0_20px_40px_-12px_rgba(0,40,80,0.5)]" onClick={(e) => e.stopPropagation()}>
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[22px] text-5xl" style={{ background: `linear-gradient(135deg, ${look.from}, ${look.to})` }}>
              {picked.lesson.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[26px] font-extrabold leading-tight text-[var(--l-ink)]">{picked.lesson.title}</p>
              {picked.state === "done" ? <Stars n={kid.lessons[picked.lesson.id]?.stars ?? 0} size={22} /> : <p className="font-display text-base font-bold text-[var(--l-ink-2)]">{picked.lesson.activities.length} activities</p>}
            </div>
            <Chunk tone="green" onClick={() => (sfx("pick"), onStart(picked.lesson))} className="flex h-20 items-center gap-2 px-7 font-display text-2xl font-extrabold">
              <Play className="h-8 w-8 fill-current" /> {picked.state === "done" ? "Again" : "Start"}
            </Chunk>
          </div>
        </div>
      )}
    </div>
  );
}
