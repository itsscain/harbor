"use client";

import { Glyph, GlyphRow } from "./art/Glyph";
import { useEffect, type ReactNode } from "react";
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
import { Chunk, Ring, ShellIcon } from "./kit";
import { SideBoat } from "./KidBoat";
import { practiceMission, type KidLearnView } from "./learnData";
import { CreatureView } from "./tank/CreatureView";
import { DECOR_ART, artUrl, eggArt } from "./tank/art";

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
      {/* Captain card: the child's boat on its own little sea, and today at a glance */}
      <div className="l-rise relative flex flex-wrap items-stretch overflow-hidden rounded-[34px] bg-white shadow-[0_8px_0_rgba(0,50,90,0.18)]">
        <button type="button" onClick={() => (sfx("pick"), void say(SAY.shop), onOpenShop())} aria-label="Change your boat" className="relative h-[150px] w-[260px] shrink-0 overflow-hidden" style={{ background: "linear-gradient(180deg, #bdeeff 0%, #8fdcff 48%, #3fb6e8 48%, #1d93cf 100%)" }}>
          <span className="absolute right-6 top-4 h-10 w-10 rounded-full bg-[radial-gradient(circle_at_40%_40%,#fff7c2,#ffd23a)] shadow-[0_0_24px_8px_rgba(255,220,90,0.6)]" />
          <svg viewBox="0 0 260 40" preserveAspectRatio="none" className={cn("absolute inset-x-0 top-[62px] h-6 w-[200%]", !reduced && "l-wave-slow")} aria-hidden>
            <path d="M0 20 Q16 8 32 20 T64 20 T96 20 T128 20 T160 20 T192 20 T224 20 T256 20 V40 H0 Z" fill="#ffffff" opacity="0.45" />
          </svg>
          <span className="absolute bottom-3 left-1/2 -translate-x-[58%]">
            <SideBoat look={look} size={136} bob={!reduced} showTrail still={reduced} />
          </span>
          {buddy && (
            <span className="absolute bottom-1 right-3 drop-shadow-[0_3px_3px_rgba(0,30,60,0.25)]" aria-label={`Your buddy ${buddy.name}`}>
              <CreatureView id={buddy.id} size={66} animate={!reduced} />
            </span>
          )}
          <span className="absolute left-3 top-3 max-w-[230px] truncate rounded-full bg-white/85 px-2.5 py-0.5 font-display text-xs font-extrabold text-[var(--l-ink-2)]">{look.name ? `The ${look.name}` : "My boat"}</span>
        </button>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-4 px-6 py-4">
          <div className="min-w-0 flex-1">
            <p className="font-display text-[36px] font-extrabold leading-tight text-[var(--l-ink)]">Hi {name}!</p>
            <p className="mt-1 flex items-center gap-2 font-display text-lg font-bold text-[var(--l-ink-2)]">
              Captain rank
              <span className="rounded-full bg-[#efe9ff] px-3 py-0.5 text-[var(--l-violet)]">{kid.levelName}</span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Stat label={`${kid.shells} shells`} tint="#fff3df">
              <ShellIcon size={34} />
              <span className="font-display text-2xl font-extrabold tabular-nums text-[var(--l-ink)]">{kid.shells}</span>
            </Stat>
            <Stat label={`${kid.streak} day streak`} tint="#ffeee2">
              <Glyph e="🔥" size={38} className={kid.streak > 0 ? (reduced ? "" : "l-flame") : "grayscale"} />
              <span className="font-display text-2xl font-extrabold text-[var(--l-orange)]">{kid.streak}</span>
            </Stat>
            <Stat label={`Level ${kid.level}`} tint="#f0ebff">
              <Ring value={kid.xpInLevel / kid.xpPerLevel} size={48} stroke={6} color="var(--l-violet)" track="#ddd3ff">
                <span className="font-display text-lg font-extrabold text-[var(--l-violet)]">{kid.level}</span>
              </Ring>
              <span className="font-display text-sm font-extrabold leading-tight text-[var(--l-ink-2)]">
                Level
                <br />
                {kid.xpInLevel}/{kid.xpPerLevel}
              </span>
            </Stat>
            <Stat label={`${kid.todayCount} of ${profile.daily_goal} levels today`} tint="#e6faee">
              <Ring value={goalPct} size={48} stroke={6} color="var(--l-green)" track="#c9f0d6">
                <Glyph e={goalPct >= 1 ? "✅" : "🎯"} size={28} />
              </Ring>
              <span className="font-display text-xl font-extrabold text-[var(--l-ink)]">
                {Math.min(kid.todayCount, profile.daily_goal)}/{profile.daily_goal}
              </span>
            </Stat>
          </div>
        </div>
      </div>

      {/* Quick row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <QuickTile plate="#ffd86b" icon={<Glyph e="🎁" size={50} />} title={chestReady ? "Daily chest!" : "Chest opened"} sub={chestReady ? "Tap to open" : "Back tomorrow"} glow={chestReady} reduced={reduced} onClick={() => (sfx("pick"), onOpenChest())} />
        <QuickTile
          plate="#8fdcff"
          icon={
            eggs || !buddy ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={artUrl(eggArt(eggs ? "golden" : "sea"))} alt="" width={36} height={45} className="max-w-none" />
            ) : (
              <CreatureView id={buddy.id} size={58} animate={!reduced} />
            )
          }
          title="Aquarium"
          sub={eggs ? `${eggs} egg${eggs === 1 ? "" : "s"} to hatch!` : snack ? "Snack time!" : kid.hatched.length ? `${kid.hatched.length} friend${kid.hatched.length === 1 ? "" : "s"}` : "Get an egg!"}
          glow={eggs > 0}
          reduced={reduced}
          badge={eggs || undefined}
          onClick={() => (sfx("pick"), onOpenAquarium())}
        />
        <QuickTile
          plate="#ffcf8f"
          // eslint-disable-next-line @next/next/no-img-element
          icon={<img src={artUrl(DECOR_ART.chest)} alt="" width={56} height={47} className="max-w-none" />} title="Treasures" sub="Stickers & more" onClick={() => (sfx("pick"), onOpenTreasures())} />
        <QuickTile plate="#c9b8ff" icon={<Glyph e="⚡" size={48} />} title="Brain Boost" sub={due ? `${due} to refresh` : "All fresh!"} glow={due >= 4} reduced={reduced} disabled={due < 3 || limitHit} onClick={() => (sfx("pick"), onBoost())} />
        <QuickTile plate="#ffb3d1" icon={<Glyph e="🕹️" size={50} />} title="Arcade" sub="15+ games!" onClick={() => (sfx("pick"), onOpenGym())} />
        <QuickTile
          plate="#9eeadb"
          icon={<Glyph e="⛵" size={52} />}
          title="Shipyard"
          sub={
            <>
              {kid.shells} <ShellIcon size={14} className="-mt-0.5 align-middle" /> to spend
            </>
          }
          onClick={() => (sfx("pick"), void say(SAY.shop), onOpenShop())}
        />
      </div>

      {limitHit && (
        <div className="l-rise flex items-center gap-4 rounded-[28px] bg-white px-5 py-4 shadow-[0_6px_0_var(--l-line)]">
          <Glyph e="🌙" size={64} />
          <div>
            <p className="font-display text-2xl font-extrabold text-[var(--l-ink)]">That&rsquo;s all the learning for today!</p>
            <p className="font-display text-lg font-bold text-[var(--l-ink-2)]">Great job, captain. New levels open tomorrow. You can still visit the shop and your album.</p>
          </div>
        </div>
      )}

      {/* Today's mission */}
      {mission && !limitHit && (
        <MissionCard
          subject={mission.subject}
          art={<GlyphRow s={mission.emoji} size={72} />}
          label={levelLabel(mission)}
          kicker={assignment ? "Your mission" : "Up next"}
          starred={!!assignment}
          title={mission.title}
          note={assignment?.note ? `“${assignment.note}”` : assignment ? "A grown-up picked this for you" : null}
          reduced={reduced}
          onClick={() => (sfx("pick"), onStart(mission))}
        />
      )}
      {practiceSubject && practiceAssigned && !limitHit && (
        <MissionCard
          subject={practiceSubject}
          art={<Glyph e="🏝️" size={76} />}
          kicker="Your mission"
          starred
          title="Practice Cove"
          note={practiceAssigned.note ? `“${practiceAssigned.note}”` : "Practice the tricky ones — a grown-up picked this"}
          reduced={reduced}
          onClick={() => (sfx("pick"), void say(SAY.practiceCove), onPractice(practiceSubject))}
        />
      )}
      {assignments.length > 1 && !limitHit && (
        <div className="-mt-2 flex flex-wrap gap-2">
          {assignments.slice(0, 6).map((a) => {
            const l = lessonById(a.lesson_id);
            if (!l || l.id === mission?.id) return null;
            return (
              <Chunk key={a.id} tone="white" onClick={() => (sfx("pick"), onStart(l))} className="flex h-14 items-center gap-2 px-4 font-display text-lg font-bold text-[var(--l-ink)]">
                <GlyphRow s={l.emoji} size={34} /> {levelLabel(l)} {l.title}
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
          const art = compact ? 76 : 96;
          return (
            <Chunk
              key={s}
              onClick={() => {
                sfx("pick");
                void say(SAY[s]);
                onOpenSubject(s);
              }}
              className={cn("l-rise relative flex flex-col overflow-hidden text-left text-white", six ? "min-h-[178px] p-4" : "min-h-[240px] p-5")}
              style={{ "--f": sl.to, "--e": sl.ink, background: `radial-gradient(160px 120px at 88% 18%, rgba(255,255,255,0.35), transparent 70%), linear-gradient(160deg, ${sl.from}, ${sl.to})`, animationDelay: `${140 + i * 70}ms` } as React.CSSProperties}
            >
              {/* The subject's emblem on its own little island. */}
              <span className="pointer-events-none absolute right-2 top-2 flex flex-col items-center" aria-hidden>
                <span className={cn("relative z-[1] block drop-shadow-[0_6px_0_rgba(0,0,0,0.14)]", !reduced && "l-bob")} style={{ animationDelay: `${i * 0.4}s` }}>
                  <Glyph e={sl.island} size={art} />
                </span>
                <svg viewBox="0 0 120 34" width={art * 1.25} height={art * 0.36} className="-mt-3">
                  <ellipse cx="60" cy="22" rx="56" ry="10" fill="rgba(255,255,255,0.28)" />
                  <ellipse cx="60" cy="16" rx="40" ry="9" fill="#ffe3a0" stroke="#2a2f45" strokeWidth="2.5" />
                  <ellipse cx="52" cy="13" rx="14" ry="3" fill="#fff6d8" />
                </svg>
              </span>
              <span className={cn("max-w-[64%] font-display font-extrabold leading-none drop-shadow-[0_2px_0_rgba(0,0,0,0.15)]", compact ? "text-[27px]" : "text-[32px]")}>{COURSES[s].title}</span>
              {!six && <span className={cn("mt-1 font-display font-bold text-white/90", compact ? "max-w-[64%] text-sm" : "max-w-[60%] text-base")}>{COURSES[s].tagline}</span>}
              <span className={cn("mt-auto", six ? "pt-2" : "pt-4")}>
                {here && (
                  <span className={cn("flex items-center gap-1.5 font-display font-extrabold", compact ? "text-base" : "text-lg")}>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/90">
                      <GlyphRow s={here.unit.emoji} size={24} />
                    </span>
                    <span className="truncate">
                      Island {here.unit.n}: {here.unit.title}
                    </span>
                  </span>
                )}
                <span className="mt-2 flex items-center gap-2">
                  <span className="h-3.5 flex-1 overflow-hidden rounded-full bg-black/15 shadow-[inset_0_2px_0_rgba(0,0,0,0.08)]">
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

/** Today's mission: the level's picture on its subject's colors, what it is, and a big play. */
function MissionCard({ subject, art, label, kicker, starred, title, note, reduced, onClick }: { subject: SubjectId; art: ReactNode; label?: string; kicker: string; starred?: boolean; title: string; note?: string | null; reduced: boolean; onClick: () => void }) {
  const sl = SUBJECT_LOOK[subject];
  return (
    <Chunk tone="white" onClick={onClick} className="l-rise relative flex w-full items-center gap-5 overflow-hidden p-5 text-left" style={{ animationDelay: "80ms" }}>
      <span className="pointer-events-none absolute inset-y-0 left-0 w-[46%] opacity-[0.13]" style={{ background: `linear-gradient(90deg, ${sl.to}, transparent)` }} />
      <span className="relative flex h-[116px] w-[116px] shrink-0 flex-col items-center justify-center rounded-[30px] shadow-[0_5px_0_rgba(0,40,80,0.16)]" style={{ background: `linear-gradient(135deg, ${sl.from}, ${sl.to})` }}>
        <span className="absolute inset-[6px] rounded-[24px] bg-white/90" />
        <span className="relative">{art}</span>
        {label && <span className="absolute -bottom-2.5 rounded-full px-3 py-0.5 font-display text-base font-extrabold text-white shadow-[0_3px_0_rgba(0,40,80,0.2)]" style={{ background: sl.to }}>{label}</span>}
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="flex items-center gap-2 font-display text-base font-extrabold uppercase tracking-wider" style={{ color: sl.to }}>
          {starred && <Glyph e="⭐" size={24} />}
          {kicker} · {COURSES[subject].title}
        </span>
        <span className="mt-0.5 block truncate font-display text-[36px] font-extrabold leading-tight text-[var(--l-ink)]">{title}</span>
        {note && <span className="mt-1 block truncate text-lg font-semibold text-[var(--l-ink-2)]">{note}</span>}
      </span>
      <span className={cn("relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-[var(--l-green)] text-white shadow-[0_7px_0_var(--l-green-edge)]", !reduced && "l-pulse")}>
        <Play className="h-12 w-12 translate-x-1 fill-current" />
      </span>
    </Chunk>
  );
}

function Stat({ label, tint, children }: { label: string; tint?: string; children: React.ReactNode }) {
  return (
    <div aria-label={label} className="flex items-center gap-2 rounded-[20px] px-3 py-2" style={{ background: tint ?? "var(--l-card-2)" }}>
      {children}
    </div>
  );
}

function QuickTile({ icon, plate, title, sub, onClick, glow, reduced, disabled, badge }: { icon: ReactNode; plate: string; title: string; sub: ReactNode; onClick: () => void; glow?: boolean; reduced?: boolean; disabled?: boolean; badge?: number }) {
  return (
    <Chunk tone="white" disabled={disabled} onClick={onClick} className={cn("l-rise relative flex items-center gap-3 p-3 text-left lg:flex-col lg:gap-1.5 lg:px-2 lg:pb-3 lg:pt-3.5 lg:text-center", disabled && "opacity-60")}>
      {badge ? <span className="absolute -right-2 -top-2 z-[1] flex h-8 min-w-8 items-center justify-center rounded-full bg-[var(--l-coral)] px-2 font-display text-lg font-extrabold text-white shadow-[0_3px_0_var(--l-coral-edge)]">{badge}</span> : null}
      <span className={cn("relative flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-[22px] shadow-[inset_0_-4px_0_rgba(0,40,80,0.12)]", glow && !reduced && "l-chest")} style={{ background: `radial-gradient(circle at 35% 28%, #ffffffcc, ${plate})` }}>
        {icon}
      </span>
      <span className="min-w-0 lg:w-full">
        <span className="block truncate font-display text-xl font-extrabold leading-tight text-[var(--l-ink)] lg:text-[19px]">{title}</span>
        <span className="block truncate font-display text-sm font-bold text-[var(--l-ink-2)]">{sub}</span>
      </span>
    </Chunk>
  );
}
