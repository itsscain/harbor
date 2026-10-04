"use client";

import { useEffect } from "react";
import { ChevronRight, Play } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Lesson, SubjectId } from "@/lib/learn/types";
import { COURSES, SUBJECT_LOOK, boostSkills, courseMap, lessonById, levelLabel, nextLessonFor } from "@/lib/learn/curriculum";
import type { BoatLook } from "@/lib/learn/meta";
import type { Creature } from "@/lib/learn/reef";
import { SAY } from "@/lib/learn/script";
import { say } from "@/lib/learn/audio";
import { sfx } from "@/lib/learn/sfx";
import { playHarborVoice } from "@/lib/kiosk/voice";
import { Chunk, Ring } from "./kit";
import { SideBoat } from "./KidBoat";
import { practiceMission, type KidLearnView } from "./learnData";

// The Learn home: the child's own boat (and aquarium buddy), their shells, streak, level and
// today's goal at a glance; today's mission front and center (a grown-up's pick, or simply what's
// next); then one island per subject showing which island of the voyage they're on. The daily
// chest, My Aquarium (eggs, food, decorations), Treasures (stickers, hero cards, trophies,
// verses), Brain Boost (mixed review of what's due), the Game Arcade and the Harbor Shop are one
// big tap away.

const nowMs = () => Date.now();

export function LearnHome({
  name,
  view,
  reduced,
  look,
  eggs = 0,
  snack = false,
  buddy,
  onStart,
  onOpenSubject,
  onOpenAquarium,
  onOpenTreasures,
  onOpenShop,
  onOpenGym,
  onOpenChest,
  onPractice,
  onBoost,
  greet = true,
  onGreeted,
}: {
  name: string;
  view: KidLearnView;
  reduced: boolean;
  look: BoatLook;
  /** Eggs in the aquarium nest, waiting to hatch. */
  eggs?: number;
  /** A friend in the aquarium hasn't had a treat today (and there's food). */
  snack?: boolean;
  buddy?: Creature | null;
  onStart: (lesson: Lesson) => void;
  onOpenSubject: (s: SubjectId) => void;
  onOpenAquarium: () => void;
  onOpenTreasures: () => void;
  onOpenShop: () => void;
  onOpenGym: () => void;
  onOpenChest: () => void;
  onPractice: (s: SubjectId) => void;
  onBoost: () => void;
  /** Say hello (once per visit to Learn — not every time a level ends). */
  greet?: boolean;
  onGreeted?: () => void;
}) {
  const { kid, profile, assignments, todayKey, left } = view;
  const best = (id: string) => (kid.lessons[id] ? kid.lessons[id].stars : null);
  const passed = (id: string) => (kid.lessons[id]?.stars ?? 0) >= 1;
  const assignedIds = assignments.map((a) => a.lesson_id);
  const missionAssigned = assignments.map((a) => lessonById(a.lesson_id)).find((l): l is Lesson => !!l && !passed(l.id)) ?? null;
  const practiceAssigned = assignments.find((a) => practiceMission(a.lesson_id));
  const upNext = profile.subjects.map((s) => nextLessonFor(s, profile.grade, best, assignedIds)).find(Boolean) ?? null;
  const mission = missionAssigned ?? (practiceAssigned ? null : upNext);
  const assignment = missionAssigned ? assignments.find((a) => a.lesson_id === missionAssigned.id) : null;
  const practiceSubject = !missionAssigned && practiceAssigned ? practiceMission(practiceAssigned.lesson_id) : null;
  const goalPct = kid.todayCount / profile.daily_goal;
  const chestReady = kid.dailyChest !== todayKey;
  const due = boostSkills(profile.subjects, kid.skills, nowMs()).length;
  const limitHit = left === 0;
  const compact = profile.subjects.length >= 5;
  const six = profile.subjects.length >= 6;

  useEffect(() => {
    if (!greet) return;
    // A hello in the Harbor voice (names aren't pre-recorded, so this one goes through the
    // wall's regular voice), then today's news.
    const t = window.setTimeout(() => {
      playHarborVoice(`Hi ${name}!`);
      onGreeted?.();
      if (limitHit) window.setTimeout(() => void say(SAY.dailyLimit), 1300);
      else if (chestReady) window.setTimeout(() => void say(SAY.dailyChest), 1300);
      else if (assignment) window.setTimeout(() => void say(SAY.mission), 1300);
    }, 450);
    return () => window.clearTimeout(t);
    // Greets once when Learn opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-5 px-4 pb-10 pt-2 sm:px-6">
      {/* Captain card */}
      <div className="l-rise flex flex-wrap items-center gap-4 rounded-[30px] bg-white/92 px-5 py-4 shadow-[0_7px_0_rgba(0,50,90,0.18)]">
        <button type="button" onClick={() => (sfx("pick"), void say(SAY.shop), onOpenShop())} aria-label="Change your boat" className="relative -my-3">
          <SideBoat look={look} size={104} bob={!reduced} showTrail />
          {buddy && (
            <span className={cn("absolute -bottom-1 -right-3 text-[40px] leading-none drop-shadow-[0_3px_3px_rgba(0,30,60,0.25)]", !reduced && "l-bob")} style={{ filter: buddy.tint, animationDelay: "0.6s" }} aria-label={`Your buddy ${buddy.name}`}>
              {buddy.emoji}
            </span>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[30px] font-extrabold leading-tight text-[var(--l-ink)]">Hi {name}!</p>
          <p className="font-display text-lg font-bold text-[var(--l-ink-2)]">
            Captain rank: <span className="text-[var(--l-violet)]">{kid.levelName}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Stat label={`${kid.shells} shells`}>
            <span className="text-3xl">🐚</span>
            <span className="font-display text-2xl font-extrabold tabular-nums text-[var(--l-ink)]">{kid.shells}</span>
          </Stat>
          <Stat label={`${kid.streak} day streak`}>
            <span className={cn("text-3xl", kid.streak > 0 ? "l-flame" : "grayscale")}>🔥</span>
            <span className="font-display text-2xl font-extrabold text-[var(--l-orange)]">{kid.streak}</span>
          </Stat>
          <Stat label={`Level ${kid.level}`}>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--l-violet)] font-display text-xl font-extrabold text-white shadow-[0_3px_0_var(--l-violet-edge)]">{kid.level}</span>
            <span className="h-2 w-16 overflow-hidden rounded-full bg-white">
              <span className="block h-full rounded-full bg-[var(--l-violet)]" style={{ width: `${(kid.xpInLevel / kid.xpPerLevel) * 100}%` }} />
            </span>
          </Stat>
          <Stat label={`${kid.todayCount} of ${profile.daily_goal} levels today`}>
            <Ring value={goalPct} size={46} stroke={7} color="var(--l-green)" track="#fff">
              <span className="text-lg">{goalPct >= 1 ? "✅" : "🎯"}</span>
            </Ring>
            <span className="font-display text-xl font-extrabold text-[var(--l-ink)]">
              {Math.min(kid.todayCount, profile.daily_goal)}/{profile.daily_goal}
            </span>
          </Stat>
        </div>
      </div>

      {/* Quick row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <QuickTile emoji="🎁" title={chestReady ? "Daily chest!" : "Chest opened"} sub={chestReady ? "Tap to open" : "Back tomorrow"} glow={chestReady} reduced={reduced} onClick={() => (sfx("pick"), onOpenChest())} />
        <QuickTile
          emoji={eggs ? "🥚" : "🐠"}
          title="Aquarium"
          sub={eggs ? `${eggs} egg${eggs === 1 ? "" : "s"} to hatch!` : snack ? "Snack time! 😋" : kid.hatched.length ? `${kid.hatched.length} friend${kid.hatched.length === 1 ? "" : "s"}` : "Get an egg!"}
          glow={eggs > 0}
          reduced={reduced}
          badge={eggs || undefined}
          onClick={() => (sfx("pick"), onOpenAquarium())}
        />
        <QuickTile emoji="💰" title="Treasures" sub="Stickers & more" onClick={() => (sfx("pick"), onOpenTreasures())} />
        <QuickTile emoji="⚡" title="Brain Boost" sub={due ? `${due} to refresh` : "All fresh!"} glow={due >= 4} reduced={reduced} disabled={due < 3 || limitHit} onClick={() => (sfx("pick"), onBoost())} />
        <QuickTile emoji="🕹️" title="Arcade" sub="15+ games!" onClick={() => (sfx("pick"), onOpenGym())} />
        <QuickTile emoji="🛍️" title="Shop" sub={`${kid.shells} 🐚 to spend`} onClick={() => (sfx("pick"), void say(SAY.shop), onOpenShop())} />
      </div>

      {limitHit && (
        <div className="l-rise flex items-center gap-4 rounded-[26px] bg-white px-5 py-4 shadow-[0_6px_0_var(--l-line)]">
          <span className="text-5xl">🌙</span>
          <div>
            <p className="font-display text-2xl font-extrabold text-[var(--l-ink)]">That&rsquo;s all the learning for today!</p>
            <p className="font-display text-lg font-bold text-[var(--l-ink-2)]">Great job, captain. New levels open tomorrow. You can still visit the shop and your album.</p>
          </div>
        </div>
      )}

      {/* Today's mission */}
      {mission && !limitHit && (
        <Chunk tone="white" onClick={() => (sfx("pick"), onStart(mission))} className="l-rise group flex w-full items-center gap-5 p-5 text-left" style={{ animationDelay: "80ms" }}>
          <span className="flex h-[104px] w-[104px] shrink-0 flex-col items-center justify-center rounded-[26px] text-white" style={{ background: `linear-gradient(135deg, ${SUBJECT_LOOK[mission.subject].from}, ${SUBJECT_LOOK[mission.subject].to})` }}>
            <span className="text-[56px] leading-none">{mission.emoji}</span>
            <span className="font-display text-lg font-extrabold">{levelLabel(mission)}</span>
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
      {practiceSubject && practiceAssigned && !limitHit && (
        <Chunk tone="white" onClick={() => (sfx("pick"), void say(SAY.practiceCove), onPractice(practiceSubject))} className="l-rise flex w-full items-center gap-5 p-5 text-left" style={{ animationDelay: "80ms" }}>
          <span className="flex h-[104px] w-[104px] shrink-0 items-center justify-center rounded-[26px] text-[60px]" style={{ background: `linear-gradient(135deg, ${SUBJECT_LOOK[practiceSubject].from}, ${SUBJECT_LOOK[practiceSubject].to})` }}>
            🏝️
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-base font-extrabold uppercase tracking-wide" style={{ color: SUBJECT_LOOK[practiceSubject].to }}>
              ⭐ Your mission · {COURSES[practiceSubject].title}
            </span>
            <span className="mt-0.5 block font-display text-[32px] font-extrabold leading-tight text-[var(--l-ink)]">Practice Cove</span>
            <span className="mt-1 block truncate text-lg font-semibold text-[var(--l-ink-2)]">{practiceAssigned.note ? `“${practiceAssigned.note}”` : "Practice the tricky ones — a grown-up picked this"}</span>
          </span>
          <span className={cn("flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[var(--l-green)] text-white shadow-[0_6px_0_var(--l-green-edge)]", !reduced && "l-pulse")}>
            <Play className="h-10 w-10 translate-x-0.5 fill-current" />
          </span>
        </Chunk>
      )}
      {assignments.length > 1 && !limitHit && (
        <div className="-mt-2 flex flex-wrap gap-2">
          {assignments.slice(0, 6).map((a) => {
            const l = lessonById(a.lesson_id);
            if (!l || l.id === mission?.id) return null;
            return (
              <Chunk key={a.id} tone="white" onClick={() => (sfx("pick"), onStart(l))} className="flex h-14 items-center gap-2 px-4 font-display text-lg font-bold text-[var(--l-ink)]">
                <span className="text-2xl">{l.emoji}</span> {levelLabel(l)} {l.title}
              </Chunk>
            );
          })}
        </div>
      )}

      {/* Subject islands */}
      <div className={cn("grid gap-4", profile.subjects.length >= 6 ? "sm:grid-cols-2 lg:grid-cols-3" : profile.subjects.length === 5 ? "sm:grid-cols-2 lg:grid-cols-5" : profile.subjects.length === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3")}>
        {profile.subjects.map((s, i) => {
          const sl = SUBJECT_LOOK[s];
          const map = courseMap(s, profile.grade, best, new Set(assignedIds));
          const here = map.find((u) => u.lessons.some((l) => l.state === "next")) ?? map[map.length - 1];
          const nextL = here?.lessons.find((l) => l.state === "next");
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
              className={cn("l-rise relative flex flex-col overflow-hidden text-left text-white", six ? "min-h-[150px] p-4" : "min-h-[230px] p-5")}
              style={{ "--f": sl.to, "--e": sl.ink, background: `linear-gradient(160deg, ${sl.from}, ${sl.to})`, animationDelay: `${140 + i * 70}ms` } as React.CSSProperties}
            >
              <span className={cn("absolute -right-3 -top-2 opacity-95 drop-shadow-[0_6px_0_rgba(0,0,0,0.12)]", compact ? "text-[60px]" : "text-[80px]", !reduced && "l-bob")} style={{ animationDelay: `${i * 0.4}s` }} aria-hidden>
                {sl.island}
              </span>
              <span className={cn("max-w-[72%] font-display font-extrabold leading-none drop-shadow-[0_2px_0_rgba(0,0,0,0.15)]", compact ? "text-[25px]" : "text-[30px]")}>{COURSES[s].title}</span>
              {!six && <span className={cn("mt-1 font-display font-bold text-white/90", compact ? "max-w-[80%] text-sm" : "max-w-[64%] text-base")}>{COURSES[s].tagline}</span>}
              <span className={cn("mt-auto", six ? "pt-2" : "pt-4")}>
                {here && (
                  <span className={cn("block truncate font-display font-extrabold", compact ? "text-base" : "text-lg")}>
                    Island {here.unit.n}: {here.unit.emoji} {here.unit.title}
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
                  <span className={cn("mt-2 flex items-center gap-1 font-display font-bold text-white/95", compact ? "text-sm" : "text-base")}>
                    <span className="truncate">
                      Next: {nextL.label} {nextL.lesson.title}
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0" />
                  </span>
                )}
              </span>
            </Chunk>
          );
        })}
      </div>
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

function QuickTile({ emoji, title, sub, onClick, glow, reduced, disabled, badge }: { emoji: string; title: string; sub: string; onClick: () => void; glow?: boolean; reduced?: boolean; disabled?: boolean; badge?: number }) {
  return (
    <Chunk tone="white" disabled={disabled} onClick={onClick} className={cn("l-rise relative flex items-center gap-3 p-3 text-left lg:gap-2 lg:px-2.5", disabled && "opacity-60")}>
      {badge ? <span className="absolute -right-2 -top-2 flex h-8 min-w-8 items-center justify-center rounded-full bg-[var(--l-coral)] px-2 font-display text-lg font-extrabold text-white shadow-[0_3px_0_var(--l-coral-edge)]">{badge}</span> : null}
      <span className={cn("text-[44px] leading-none lg:text-[36px]", glow && !reduced && "l-chest")}>{emoji}</span>
      <span className="min-w-0">
        <span className="block truncate font-display text-xl font-extrabold text-[var(--l-ink)] lg:text-base">{title}</span>
        <span className="block truncate font-display text-sm font-bold text-[var(--l-ink-2)] lg:text-xs">{sub}</span>
      </span>
    </Chunk>
  );
}
