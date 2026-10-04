"use client";

import { useEffect } from "react";
import { ChevronRight, Play } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Lesson, SubjectId } from "@/lib/learn/types";
import { COURSES, SUBJECT_LOOK, courseMap, lessonById, nextLessonFor } from "@/lib/learn/curriculum";
import { STICKERS } from "@/lib/learn/stickers";
import { SAY } from "@/lib/learn/script";
import { say } from "@/lib/learn/audio";
import { sfx } from "@/lib/learn/sfx";
import { playHarborVoice } from "@/lib/kiosk/voice";
import { LanternBuddy } from "@/components/lantern/LanternBuddy";
import { Chunk, Ring } from "./kit";
import type { KidLearnView } from "./learnData";

// The Learn home: who's learning, their streak, level and today's goal at a glance, today's
// mission front and center (a grown-up's pick, or simply what's next), then one island per
// subject. Everything a five-year-old needs is one big tap away.

export function LearnHome({
  name,
  accent,
  view,
  reduced,
  onStart,
  onOpenSubject,
  onOpenStickers,
}: {
  name: string;
  accent: string;
  view: KidLearnView;
  reduced: boolean;
  onStart: (lesson: Lesson) => void;
  onOpenSubject: (s: SubjectId) => void;
  onOpenStickers: () => void;
}) {
  const { kid, profile, assignments } = view;
  const done = (id: string) => (kid.lessons[id]?.stars ?? 0) > 0;
  const assignedIds = assignments.map((a) => a.lesson_id);
  const missionAssigned = assignments.map((a) => lessonById(a.lesson_id)).find((l): l is Lesson => !!l && !done(l.id)) ?? assignments.map((a) => lessonById(a.lesson_id)).find((l): l is Lesson => !!l) ?? null;
  const upNext = profile.subjects.map((s) => nextLessonFor(s, profile.grade, done, assignedIds)).find(Boolean) ?? null;
  const mission = missionAssigned ?? upNext;
  const assignment = missionAssigned ? assignments.find((a) => a.lesson_id === missionAssigned.id) : null;
  const goalPct = kid.todayCount / profile.daily_goal;
  const mine = STICKERS.filter((s) => kid.stickers[s.id]);
  const owned = mine.length;
  const recent = mine.slice(-4);

  useEffect(() => {
    // A hello in the Harbor voice (names aren't pre-recorded, so this one goes through the
    // wall's regular voice), then today's mission.
    const t = window.setTimeout(() => {
      playHarborVoice(`Hi ${name}!`);
      if (assignment) window.setTimeout(() => void say(SAY.mission), 1300);
    }, 450);
    return () => window.clearTimeout(t);
    // Greets once when Learn opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5 px-4 pb-10 pt-2 sm:px-6">
      {/* Hello + stats */}
      <div className="l-rise flex flex-wrap items-center gap-4 rounded-[30px] bg-white/90 px-5 py-4 shadow-[0_7px_0_rgba(0,50,90,0.18)]">
        <LanternBuddy mood="wave" accent={accent} size={74} reducedMotion={reduced} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[30px] font-extrabold leading-tight text-[var(--l-ink)]">Hi {name}!</p>
          <p className="font-display text-lg font-bold text-[var(--l-ink-2)]">{kid.doneToday ? "Look at you go!" : "Ready to learn something new?"}</p>
        </div>
        <div className="flex items-center gap-3">
          <Stat label={`${kid.streak} day streak`}>
            <span className={cn("text-3xl", kid.streak > 0 ? "l-flame" : "grayscale")}>🔥</span>
            <span className="font-display text-2xl font-extrabold text-[var(--l-orange)]">{kid.streak}</span>
          </Stat>
          <Stat label={`Level ${kid.level}`}>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--l-violet)] font-display text-xl font-extrabold text-white shadow-[0_3px_0_var(--l-violet-edge)]">{kid.level}</span>
            <span className="hidden flex-col sm:flex">
              <span className="font-display text-sm font-extrabold leading-none text-[var(--l-violet)]">{kid.levelName}</span>
              <span className="mt-1 h-2 w-20 overflow-hidden rounded-full bg-[var(--l-card-2)]">
                <span className="block h-full rounded-full bg-[var(--l-violet)]" style={{ width: `${(kid.xpInLevel / kid.xpPerLevel) * 100}%` }} />
              </span>
            </span>
          </Stat>
          <Stat label={`${kid.todayCount} of ${profile.daily_goal} lessons today`}>
            <Ring value={goalPct} size={48} stroke={7} color="var(--l-green)" track="var(--l-card-2)">
              <span className="text-lg">{goalPct >= 1 ? "✅" : "🎯"}</span>
            </Ring>
            <span className="font-display text-xl font-extrabold text-[var(--l-ink)]">
              {Math.min(kid.todayCount, profile.daily_goal)}/{profile.daily_goal}
            </span>
          </Stat>
        </div>
      </div>

      {/* Today's mission */}
      {mission && (
        <Chunk
          tone="white"
          onClick={() => {
            sfx("pick");
            onStart(mission);
          }}
          className="l-rise group flex w-full items-center gap-5 p-5 text-left"
          style={{ animationDelay: "80ms" }}
        >
          <span className="flex h-[104px] w-[104px] shrink-0 items-center justify-center rounded-[26px] text-[64px]" style={{ background: `linear-gradient(135deg, ${SUBJECT_LOOK[mission.subject].from}, ${SUBJECT_LOOK[mission.subject].to})` }}>
            {mission.emoji}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 font-display text-base font-extrabold uppercase tracking-wide" style={{ color: SUBJECT_LOOK[mission.subject].to }}>
              {assignment ? "⭐ Your mission" : "Up next"} · {COURSES[mission.subject].title}
            </span>
            <span className="mt-0.5 block truncate font-display text-[32px] font-extrabold leading-tight text-[var(--l-ink)]">{mission.title}</span>
            {assignment?.note ? (
              <span className="mt-1 block truncate text-lg font-semibold text-[var(--l-ink-2)]">“{assignment.note}”</span>
            ) : assignment ? (
              <span className="mt-1 block text-lg font-semibold text-[var(--l-ink-2)]">A grown-up picked this for you</span>
            ) : null}
          </span>
          <span className={cn("flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[var(--l-green)] text-white shadow-[0_6px_0_var(--l-green-edge)]", !reduced && "l-pulse")}>
            <Play className="h-10 w-10 translate-x-0.5 fill-current" />
          </span>
        </Chunk>
      )}
      {assignments.length > 1 && (
        <div className="-mt-2 flex flex-wrap gap-2">
          {assignments.slice(1, 5).map((a) => {
            const l = lessonById(a.lesson_id);
            if (!l || l.id === mission?.id) return null;
            return (
              <Chunk key={a.id} tone="white" onClick={() => (sfx("pick"), onStart(l))} className="flex h-14 items-center gap-2 px-4 font-display text-lg font-bold text-[var(--l-ink)]">
                <span className="text-2xl">{l.emoji}</span> {l.title}
              </Chunk>
            );
          })}
        </div>
      )}

      {/* Subject islands */}
      <div className="grid gap-4 sm:grid-cols-3">
        {profile.subjects.map((s, i) => {
          const look = SUBJECT_LOOK[s];
          const map = courseMap(s, profile.grade, done, new Set(assignedIds));
          const lessons = map.flatMap((u) => u.lessons);
          const nextL = lessons.find((l) => l.state === "next")?.lesson;
          // Progress where the child is now (the unit they're in), so the bar actually moves.
          const here = map.find((u) => u.lessons.some((l) => l.state === "next")) ?? map[map.length - 1];
          const unit = here?.unit;
          const unitDone = here ? here.lessons.filter((l) => l.state === "done").length : 0;
          const unitTotal = here ? here.lessons.length : 0;
          return (
            <Chunk
              key={s}
              onClick={() => {
                sfx("pick");
                void say(SAY[s]);
                onOpenSubject(s);
              }}
              className="l-rise relative flex min-h-[230px] flex-col overflow-hidden p-5 text-left text-white"
              style={{ "--f": look.to, "--e": look.ink, background: `linear-gradient(160deg, ${look.from}, ${look.to})`, animationDelay: `${140 + i * 70}ms` } as React.CSSProperties}
            >
              <span className={cn("absolute -right-4 -top-3 text-[110px] opacity-95 drop-shadow-[0_6px_0_rgba(0,0,0,0.12)]", !reduced && "l-bob")} style={{ animationDelay: `${i * 0.4}s` }} aria-hidden>
                {look.island}
              </span>
              <span className="font-display text-[34px] font-extrabold leading-none drop-shadow-[0_2px_0_rgba(0,0,0,0.15)]">{COURSES[s].title}</span>
              <span className="mt-1 max-w-[70%] font-display text-base font-bold text-white/90">{COURSES[s].tagline}</span>
              <span className="mt-auto pt-4">
                {unit && (
                  <span className="block truncate font-display text-lg font-extrabold">
                    {unit.emoji} {unit.title}
                  </span>
                )}
                <span className="mt-2 flex items-center gap-2">
                  <span className="h-3.5 flex-1 overflow-hidden rounded-full bg-black/15">
                    <span className="block h-full rounded-full bg-white" style={{ width: `${unitTotal ? (unitDone / unitTotal) * 100 : 0}%` }} />
                  </span>
                  <span className="font-display text-sm font-extrabold">
                    {unitDone}/{unitTotal}
                  </span>
                </span>
                {nextL && (
                  <span className="mt-2 flex items-center gap-1 font-display text-base font-bold text-white/95">
                    Next: {nextL.title} <ChevronRight className="h-5 w-5" />
                  </span>
                )}
              </span>
            </Chunk>
          );
        })}
      </div>

      {/* Sticker book */}
      <Chunk tone="white" onClick={() => (sfx("pick"), void say(SAY.stickerBook), onOpenStickers())} className="l-rise flex items-center gap-4 p-4 text-left" style={{ animationDelay: "360ms" }}>
        <span className="flex -space-x-3 text-[44px]">
          {(recent.length ? recent.map((x) => x.emoji) : ["🐚"]).map((e, k) => (
            <span key={k} className="drop-shadow-[0_3px_0_rgba(0,40,80,0.12)]">
              {e}
            </span>
          ))}
        </span>
        <span className="flex-1">
          <span className="block font-display text-2xl font-extrabold text-[var(--l-ink)]">Sticker book</span>
          <span className="font-display text-lg font-bold text-[var(--l-ink-2)]">
            {owned} of {STICKERS.length} found{owned < STICKERS.length ? " — finish lessons to find more!" : " — you found them all!"}
          </span>
        </span>
        <ChevronRight className="h-8 w-8 text-[var(--l-ink-2)]" />
      </Chunk>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div aria-label={label} className="flex items-center gap-2 rounded-2xl bg-[var(--l-card-2)] px-3 py-2">
      {children}
    </div>
  );
}
