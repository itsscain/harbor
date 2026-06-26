"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Star,
  Check,
  Volume2,
  Timer as TimerIcon,
  Heart,
  Gift,
  Home as HomeIcon,
  ArrowRight,
  Sparkles,
  Ban,
  ShieldCheck,
} from "lucide-react";
import type { useKiosk } from "./useKiosk";
import type { KioskChild, KioskStep, KioskChore } from "@/lib/kiosk/types";
import { todayKey } from "@/lib/kiosk/db";
import { runsToday } from "@/lib/kiosk/calendar";
import { choreAssignee } from "@/lib/kiosk/chores";
import { BedtimeCountdown } from "./BedtimeCountdown";
import { Confetti } from "./Confetti";
import { ParentGate } from "./ParentGate";
import { MiniGame } from "./MiniGame";
import { CornerTimer } from "./CornerTimer";
import { Anchor } from "./Anchor";
import { Voyage } from "./Voyage";
import { Pressable, usePress } from "./Pressable";
import { childColor } from "@/lib/kiosk/colors";
import { activeGroundingFor } from "@/lib/kiosk/grounding";
import { speak, chime, haptic, cheer, play, HAPTIC } from "@/lib/kiosk/feedback";
import { activeStreak } from "@/lib/kiosk/streak";
import { StreakBadge } from "./StreakBadge";
import { sensoryOf, intensityOf, scaleCount } from "@/lib/kiosk/motion";
import { NowNext } from "./NowNext";
import { StoreView } from "./StoreView";
import { TransitionTimer } from "./TransitionTimer";
import { ChildAvatar } from "./ChildAvatar";
import { cn } from "@/lib/cn";

type Kiosk = ReturnType<typeof useKiosk>;

export function readChildSettings(child: KioskChild) {
  const s = (child.settings ?? {}) as Record<string, unknown>;
  return {
    readAloud: s.readAloud !== false,
    autoRead: s.autoRead === true,
    sound: s.sound !== false,
    haptics: s.haptics !== false,
    reducedMotion: s.reducedMotion === true,
    theme: typeof s.theme === "string" ? (s.theme as string) : "harbor",
    bedtime: typeof s.bedtime === "string" ? (s.bedtime as string) : null,
    sensory: sensoryOf(s.sensory),
    intensity: intensityOf(s.sensory),
  };
}

export function ChildView({
  kiosk,
  childId,
  onHome,
  onOpenCalm,
  onAnchorActive,
  autoAnchor = false,
  hideHome = false,
}: {
  kiosk: Kiosk;
  childId: string;
  onHome: () => void;
  onOpenCalm: () => void;
  /** Signals the shell when Anchor opens/closes (ducks ambient; blocks idle sleep). */
  onAnchorActive?: (active: boolean) => void;
  /** Open Anchor immediately on mount (parent's "Quick Anchor" from the wall). */
  autoAnchor?: boolean;
  /** Outpost (room-device) mode hides the family Home button. */
  hideHome?: boolean;
}) {
  const { state } = kiosk;
  const child = state?.snapshot.children.find((c) => c.id === childId);
  const settings = child ? readChildSettings(child) : null;

  // Re-render across midnight so "today" + day-of-week filtering stay correct
  // on an always-on wall.
  const [, setDayTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setDayTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const routines = useMemo(() => {
    if (!state || !child) return [];
    return state.snapshot.routines
      .filter((r) => r.child_id === child.id && r.active && runsToday(r.days_of_week))
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [state, child]);

  const [routineId, setRoutineId] = useState<string | null>(null);
  const activeRoutine = routines.find((r) => r.id === routineId) ?? routines[0];

  const steps = useMemo(() => {
    if (!state || !activeRoutine) return [];
    return state.snapshot.steps
      .filter((s) => s.routine_id === activeRoutine.id)
      .sort((a, b) => a.order_index - b.order_index);
  }, [state, activeRoutine]);

  const [celebrate, setCelebrate] = useState<{ points: number; n: number } | null>(null);
  const [approvingChore, setApprovingChore] = useState<KioskChore | null>(null);
  const [bigCelebrate, setBigCelebrate] = useState(false);
  const [gameOpen, setGameOpen] = useState(false);
  const [anchorOpen, setAnchorOpen] = useState(autoAnchor);
  // Tell the shell when Anchor is active so it ducks the ambient + never sleeps
  // mid-session (co-regulation completes first — §9.1). Clears on unmount too.
  useEffect(() => {
    onAnchorActive?.(anchorOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorOpen]);
  useEffect(() => () => onAnchorActive?.(false), []); // eslint-disable-line react-hooks/exhaustive-deps
  // Reward minigame can be played once per day, only after everything's done.
  const [gamePlayed, setGamePlayed] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      return localStorage.getItem(`harbor-game-${childId}`) === todayKey();
    } catch {
      return false;
    }
  });
  const [storeOpen, setStoreOpen] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);

  // Honor the per-child "auto-read on open" accessibility setting: speak the
  // routine name once when it opens (not on every render).
  const activeRoutineId = activeRoutine?.id;
  useEffect(() => {
    if (settings?.autoRead && child && activeRoutineId) {
      const r = routines.find((x) => x.id === activeRoutineId);
      if (r) speak(`${child.name}'s ${r.name}`, settings.readAloud);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoutineId]);

  // Harbor greets the child warmly when they open their screen (read-aloud only,
  // and not while an active calm corner is speaking its own plan).
  const openId = child?.id;
  useEffect(() => {
    if (!child || !settings?.readAloud) return;
    const inCorner = (state?.snapshot.corners ?? []).some((c) => c.child_id === child.id && c.status === "active");
    if (inCorner) return;
    const lines = child.ai_profile?.encouragement ?? [];
    const enc = lines.length ? lines[new Date().getDate() % lines.length] : "Let's have a great day!";
    speak(`Hi ${child.name}! ${enc}`, settings.readAloud);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  if (!state || !child || !settings) return null;

  const today = todayKey();
  const prog =
    state.progress[child.id]?.date === today ? state.progress[child.id].completed : [];
  const points = state.points[child.id] ?? 0;
  const grounding = activeGroundingFor(state.snapshot.groundings, child.id);
  const corner = (state.snapshot.corners ?? []).find((c) => c.child_id === child.id && c.status === "active") ?? null;
  // Auto-soften (§9.1.3): after a rough Anchor today, run gentler celebration.
  const softenedToday = state.autoSoften?.[child.id] === today;
  const fxIntensity = softenedToday ? 0.6 : settings.intensity;
  const streak = activeStreak(state.streaks, child.id);
  // Personalized encouragement from the child's AI profile (offline; rotates daily).
  const encLines = child.ai_profile?.encouragement ?? [];
  const encLine = encLines.length ? encLines[new Date().getDate() % encLines.length] : null;

  function complete(step: KioskStep) {
    if (prog.includes(step.id)) return;
    kiosk.completeStep(child!.id, step);
    chime(settings!.sound);
    haptic(HAPTIC.stepDone, settings!.haptics);
    speak(`${cheer()}! ${step.label} done!`, settings!.readAloud);
    if (step.reward_points > 0) {
      setCelebrate({ points: step.reward_points, n: Date.now() });
      setTimeout(() => setCelebrate(null), 1300);
    }
    // Does this tap finish the whole routine? → the big celebration moment.
    const finishes = isFirstThen
      ? !!thenStep && step.id === thenStep.id
      : scheduleSteps.length > 0 && scheduleSteps.every((s) => s.id === step.id || prog.includes(s.id));
    if (finishes) {
      setBigCelebrate(true);
      play("routine", settings!.sound);
      haptic(HAPTIC.routineDone, settings!.haptics);
      speak(`Amazing! You finished ${activeRoutine?.name ?? "your routine"}, ${child!.name}!`, settings!.readAloud);
      kiosk.bumpStreak(child!.id); // finishing the routine keeps the streak alive
      setTimeout(() => setBigCelebrate(false), 4200);
    }
  }

  function doCompleteChore(chore: KioskChore) {
    kiosk.completeChore(child!.id, chore);
    chime(settings!.sound);
    haptic(HAPTIC.choreDone, settings!.haptics);
    speak(`${cheer()}! ${chore.title} done!`, settings!.readAloud);
    if (chore.points > 0) {
      setCelebrate({ points: chore.points, n: Date.now() });
      setTimeout(() => setCelebrate(null), 1300);
    }
    // Chore-only kids (no routine) earn the day's streak by clearing all chores.
    if (!activeRoutine && childChores.length > 0) {
      const remaining = childChores.filter((c) => c.id !== chore.id && !prog.includes(c.id)).length;
      if (remaining === 0) kiosk.bumpStreak(child!.id);
    }
  }

  function tapChore(chore: KioskChore) {
    if (prog.includes(chore.id)) return;
    // Only gate when a PIN exists (otherwise verifyPin auto-passes = fake gate).
    if (chore.requires_approval && kiosk.state?.pinHash) {
      setApprovingChore(chore);
      return;
    }
    doCompleteChore(chore);
  }

  const childChores = (state.snapshot.chores ?? [])
    .filter((c) => c.active && runsToday(c.days_of_week) && choreAssignee(c, new Set(state.snapshot.children.map((k) => k.id))) === child.id)
    .sort((a, b) => a.sort_order - b.sort_order);
  const choresDone = childChores.filter((c) => prog.includes(c.id)).length;

  const scheduleSteps = steps.filter((s) => s.step_type === "task");
  const firstStep = steps.find((s) => s.step_type === "first");
  const thenStep = steps.find((s) => s.step_type === "then");
  const doneCount = scheduleSteps.filter((s) => prog.includes(s.id)).length;
  const isFirstThen = activeRoutine?.type === "first_then";
  const allDone = isFirstThen
    ? !!thenStep && prog.includes(thenStep.id)
    : scheduleSteps.length > 0 && doneCount === scheduleSteps.length;
  // Everything for the day finished (routine + chores) → unlocks the reward game.
  const choresAllDone = childChores.length === 0 || choresDone === childChores.length;
  const hasTasks = !!activeRoutine || childChores.length > 0;
  const dayComplete = hasTasks && choresAllDone && (activeRoutine ? allDone : true);
  const color = childColor(child);
  const progressTotal = isFirstThen ? [firstStep, thenStep].filter(Boolean).length : scheduleSteps.length;
  const progressDone = isFirstThen
    ? [firstStep, thenStep].filter((s) => s && prog.includes(s.id)).length
    : doneCount;
  const pct = progressTotal > 0 ? Math.round((progressDone / progressTotal) * 100) : 0;
  const progressMsg = allDone
    ? "All done — amazing! 🎉"
    : progressDone === 0
      ? "Let's get started!"
      : `${progressDone} of ${progressTotal} done${pct >= 60 ? " — almost there!" : ""}`;

  return (
    <div className="relative min-h-dvh bg-kbg text-ktext">
      {/* The "world" — recedes (blurs + desaturates) when Anchor opens (§9.1). */}
      <div className={cn("anchor-world animate-enter flex min-h-dvh flex-col", anchorOpen && "is-receded")}>
      {/* Header — per-child color tint, photo, and the day's progress */}
      <header className="px-4 pb-4 pt-3" style={{ background: `linear-gradient(180deg, ${color}38, ${color}0d)` }}>
        <div className="flex items-center justify-between gap-3">
          {hideHome ? (
            <span className="w-10" aria-hidden />
          ) : (
            <Pressable
              haptics={settings.haptics}
              onClick={onHome}
              className="kiosk-tap flex items-center gap-2 rounded-xl bg-white/12 px-3.5 py-2 font-semibold text-ktext"
            >
              <HomeIcon className="h-5 w-5" /> Home
            </Pressable>
          )}
          <div className="flex items-center gap-2">
            <StreakBadge count={streak} />
            <span className="flex items-center gap-1.5 rounded-full bg-white/12 px-3.5 py-2">
              <Star className="h-5 w-5 fill-beacon text-beacon" />
              <span
                key={points}
                className={cn("font-display text-lg font-bold tabular-nums text-ktext", !settings.reducedMotion && "animate-pop")}
              >
                {points}
              </span>
            </span>
          </div>
        </div>
        <button
          onClick={() => speak(`${child.name}'s ${activeRoutine?.name ?? "day"}. ${activeRoutine ? progressMsg : ""}`, settings.readAloud)}
          className="mt-3.5 flex w-full items-center gap-4 text-left"
        >
          <ChildAvatar child={child} size={64} rounded="rounded-2xl" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-2xl font-bold text-ktext">
              {activeRoutine ? `${child.name}'s ${activeRoutine.name}` : child.name}
            </h1>
            <p className="mt-0.5 text-sm text-ktext/70">{activeRoutine ? progressMsg : `Hi, ${child.name}!`}</p>
            {activeRoutine && progressTotal > 0 && (
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-black/25">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
              </div>
            )}
          </div>
        </button>
      </header>

      {/* Routine tabs */}
      {routines.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 pt-3">
          {routines.map((r) => (
            <button
              key={r.id}
              onClick={() => setRoutineId(r.id)}
              className={cn(
                "kiosk-tap whitespace-nowrap rounded-full px-4 py-2 font-semibold transition",
                r.id === activeRoutine?.id ? "bg-kwater text-harbor shadow-k" : "bg-kpanel text-ktext ring-1 ring-kline/55 hover:brightness-125",
              )}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}

      <main className="flex-1 p-4 sm:p-6">
        {/* The regulation door — always one tap away on every child screen (§7.2). */}
        <Pressable
          haptics={settings.haptics}
          onClick={() => setAnchorOpen(true)}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-kpanel/70 py-3 text-base font-semibold text-kmute ring-1 ring-kline/55 transition hover:text-ktext"
        >
          <span className="text-xl">🫧</span> I need a break
        </Pressable>
        {softenedToday && (
          <p className="mb-4 flex items-center justify-center gap-2 rounded-2xl bg-violet-400/10 py-2.5 text-sm font-medium text-violet-200 ring-1 ring-violet-400/20">
            🌙 Taking it easy today
          </p>
        )}
        {corner && (
          <div className="mb-4">
            <CornerTimer
              corner={corner}
              childName={child.name}
              readAloud={settings.readAloud}
              reducedMotion={settings.reducedMotion}
              onBreathe={() => setAnchorOpen(true)}
            />
          </div>
        )}
        {dayComplete && !gamePlayed && (
          <Pressable
            haptics={settings.haptics}
            onClick={() => {
              // Mark played on OPEN (not close) so it can't be replayed by bailing.
              setGamePlayed(true);
              try {
                localStorage.setItem(`harbor-game-${child.id}`, todayKey());
              } catch {
                /* ignore */
              }
              setGameOpen(true);
            }}
            className="k-glow mb-4 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-beacon/30 to-kwater/20 p-4 text-center font-display text-xl font-bold text-ktext shadow-k ring-1 ring-beacon/40"
          >
            <span className="text-3xl">🎮</span> You finished everything — tap for Play Time!
          </Pressable>
        )}
        {settings.bedtime && (
          <BedtimeCountdown
            bedtime={settings.bedtime}
            variant="full"
            color={color}
            onSpeak={(t) => speak(t, settings.readAloud)}
            className="mb-4"
          />
        )}
        {encLine && (
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-kwater/10 p-3.5 ring-1 ring-kwater/25">
            <Sparkles className="h-5 w-5 shrink-0 text-kwater" />
            <p className="text-base font-medium text-ktext">{encLine}</p>
          </div>
        )}
        {grounding && (
          <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() =>
                  speak(
                    (grounding.lastDay ? "Last day of your reset. Finish strong!" : `You have ${grounding.daysLeft} days left on your reset.`) +
                      (grounding.g.note ? ` ${grounding.g.note}` : "") +
                      ((grounding.g.privileges_lost ?? []).length ? ` Paused for now: ${(grounding.g.privileges_lost ?? []).join(", ")}.` : ""),
                  )
                }
                className="flex min-w-0 items-center gap-3 text-left"
              >
                <span className="text-3xl">🌱</span>
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold text-amber-200">
                    On a reset · Day {grounding.dayNum} of {grounding.total}
                  </p>
                  <p className="truncate text-sm text-amber-100/80">
                    {grounding.lastDay ? "Last day — finish strong! 💪" : `${grounding.daysLeft} days to go`}
                    {grounding.g.note ? ` · ${grounding.g.note}` : ""}
                  </p>
                </div>
              </button>
              <div className="hidden shrink-0 gap-1.5 sm:flex">
                {Array.from({ length: Math.min(grounding.total, 12) }).map((_, i) => (
                  <span key={i} className={cn("h-3 w-3 rounded-full", i < grounding.dayNum ? "bg-amber-400" : "bg-amber-400/25")} />
                ))}
              </div>
            </div>
            {(grounding.g.privileges_lost ?? []).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(grounding.g.privileges_lost ?? []).map((p) => (
                  <span
                    key={p}
                    className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-medium text-amber-200 ring-1 ring-amber-400/30"
                  >
                    <Ban className="h-3 w-3" /> {p}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        {activeRoutine ? (
          <>
            <NowNext steps={steps} sound={settings.sound} readAloud={settings.readAloud} />

            {allDone && (
              <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/15 p-4 text-center font-display text-xl font-bold text-emerald-300">
                🎉 All done! Great job, {child.name}!
              </div>
            )}

            {activeRoutine.type !== "first_then" && (
              <Voyage steps={scheduleSteps} doneIds={new Set(prog)} accent={color} reducedMotion={settings.reducedMotion} />
            )}

            {activeRoutine.type === "first_then" && firstStep && thenStep ? (
              <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
                <StepCard step={firstStep} label="First" done={prog.includes(firstStep.id)} reducedMotion={settings.reducedMotion} haptics={settings.haptics} accent={color} onTap={() => complete(firstStep)} onSpeak={() => speak(firstStep.label, settings.readAloud)} big />
                <ArrowRight className="mx-auto h-10 w-10 rotate-90 text-kmute sm:rotate-0" />
                <StepCard step={thenStep} label="Then" done={prog.includes(thenStep.id)} reducedMotion={settings.reducedMotion} haptics={settings.haptics} accent={color} onTap={() => { if (prog.includes(firstStep.id)) complete(thenStep); }} onSpeak={() => speak(thenStep.label, settings.readAloud)} big muted={!prog.includes(firstStep.id)} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {scheduleSteps.map((s) => (
                  <StepCard
                    key={s.id}
                    step={s}
                    done={prog.includes(s.id)}
                    reducedMotion={settings.reducedMotion}
                    haptics={settings.haptics}
                    accent={color}
                    onTap={() => complete(s)}
                    onSpeak={() => speak(s.label, settings.readAloud)}
                  />
                ))}
              </div>
            )}
          </>
        ) : childChores.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl bg-kpanel p-10 text-center shadow-k ring-1 ring-kline/55">
            <span className="text-5xl">🗓️</span>
            <h3 className="mt-3 font-display text-xl font-bold text-ktext">Nothing set up yet for {child.name}</h3>
            <p className="mt-1.5 max-w-sm text-kmute">
              A grown-up can add routines or chores from the Harbor app — templates make it one tap.
            </p>
          </div>
        ) : null}

        {childChores.length > 0 && (
          <div className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold text-ktext">Chores</h2>
              <span className="text-sm font-semibold text-kmute">{choresDone} / {childChores.length} done</span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {childChores.map((chore) => {
                const done = prog.includes(chore.id);
                return (
                  <Pressable
                    key={chore.id}
                    haptics={settings.haptics}
                    onClick={() => tapChore(chore)}
                    disabled={done}
                    aria-label={`${chore.title}${done ? " (done)" : ""}`}
                    className={cn(
                      "kiosk-tap relative flex min-h-32 flex-col items-center justify-center gap-2 overflow-hidden rounded-xl p-4 text-center shadow-k ring-1",
                      done ? "bg-emerald-500/15 ring-emerald-500/40" : "bg-kpanel ring-kline/55",
                    )}
                  >
                    {done && !settings.reducedMotion && (
                      <span
                        aria-hidden
                        className="animate-radial-fill pointer-events-none absolute left-1/2 top-1/2 h-28 w-28 rounded-full"
                        style={{ background: `radial-gradient(circle, ${color}, transparent 70%)` }}
                      />
                    )}
                    <span className="text-5xl">{chore.icon ?? "✅"}</span>
                    <span className="font-display text-lg font-bold text-ktext">{chore.title}</span>
                    {chore.requires_approval && !done && (
                      <span className="absolute left-2.5 top-2.5 text-kmute" aria-label="needs a grown-up's OK">
                        <ShieldCheck className="h-4 w-4" />
                      </span>
                    )}
                    {chore.points > 0 && !done && (
                      <span className="flex items-center gap-1 text-sm font-semibold text-beacon">
                        <Star className="h-4 w-4 fill-beacon" /> {chore.points}
                      </span>
                    )}
                    {done && (
                      <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-sm font-bold text-white">
                        <Check className="h-4 w-4" /> Done
                      </span>
                    )}
                  </Pressable>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer actions */}
      <footer className="grid grid-cols-3 gap-3 border-t border-kline/55 bg-kbg2/80 p-4 backdrop-blur">
        <Pressable
          haptics={settings.haptics}
          onClick={() => setStoreOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-kraise py-3.5 text-base font-medium text-ktext ring-1 ring-kline/55 transition hover:brightness-125"
        >
          <Gift className="h-5 w-5 text-beacon" /> Store
        </Pressable>
        <Pressable
          haptics={settings.haptics}
          onClick={() => setTimerOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-kraise py-3.5 text-base font-medium text-ktext ring-1 ring-kline/55 transition hover:brightness-125"
        >
          <TimerIcon className="h-5 w-5 text-kwater" /> Timer
        </Pressable>
        <Pressable
          haptics={settings.haptics}
          onClick={onOpenCalm}
          className="flex items-center justify-center gap-2 rounded-xl bg-beacon py-3.5 text-base font-semibold text-harbor transition hover:brightness-105"
        >
          <Heart className="h-5 w-5" /> Calm Tools
        </Pressable>
      </footer>
      </div>
      {/* ── Overlays — siblings of the world, so they stay crisp when it recedes ── */}
      {anchorOpen && (
        <Anchor
          childName={child.name}
          accent={color}
          haptics={settings.haptics}
          readAloud={settings.readAloud}
          reducedMotion={settings.reducedMotion}
          sound={settings.sound}
          onFeeling={(f) => kiosk.checkIn(child.id, f)}
          onSoften={() => kiosk.softenChild(child.id)}
          onClose={() => setAnchorOpen(false)}
        />
      )}

      {gameOpen && (
        <MiniGame
          childName={child.name}
          onClose={() => {
            setGameOpen(false);
            setGamePlayed(true);
            try {
              localStorage.setItem(`harbor-game-${child.id}`, todayKey());
            } catch {
              /* ignore */
            }
          }}
        />
      )}

      {approvingChore && (
        <ParentGate
          verify={kiosk.verifyPin}
          title="A grown-up's OK?"
          subtitle={`Enter your PIN to check off "${approvingChore.title}".`}
          onSuccess={() => {
            const c = approvingChore;
            setApprovingChore(null);
            doCompleteChore(c);
          }}
          onCancel={() => setApprovingChore(null)}
        />
      )}

      {celebrate && (
        <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
          {!settings.reducedMotion && <Confetti key={celebrate.n} count={scaleCount(24, fxIntensity)} />}
          <div className={cn("rounded-full bg-beacon px-10 py-8 text-center shadow-2xl", !settings.reducedMotion && "animate-reward")}>
            <Star className="mx-auto h-12 w-12 fill-harbor text-harbor" />
            <p className="mt-1 font-display text-3xl font-bold text-harbor">
              +{celebrate.points}
            </p>
          </div>
        </div>
      )}

      {bigCelebrate && (
        <button
          onClick={() => setBigCelebrate(false)}
          className="fixed inset-0 z-40 flex flex-col items-center justify-center overflow-hidden bg-kbg2/97 px-6 text-center text-white backdrop-blur-sm"
          aria-label="Continue"
        >
          {!settings.reducedMotion && <Confetti count={scaleCount(64, fxIntensity)} spread={560} />}
          <span className="absolute inset-x-0 top-1/4 mx-auto h-72 w-72 beacon-ring" aria-hidden />
          <span className={cn("relative text-8xl", !settings.reducedMotion && "animate-pop")}>{child.avatar ?? "🎉"}</span>
          <p className="relative mt-4 font-display text-4xl font-bold sm:text-5xl">You did it, {child.name}!</p>
          <p className="relative mt-2 text-xl text-seafoam">{activeRoutine?.name} complete</p>
          <div className={cn("relative mt-6 flex items-center gap-2 rounded-full bg-white/15 px-6 py-3", !settings.reducedMotion && "animate-reward")}>
            <Star className="h-7 w-7 fill-beacon text-beacon" />
            <span className="font-display text-2xl font-bold">{points} stars</span>
          </div>
          <p className="relative mt-10 text-sm text-seafoam/70">Tap to keep going</p>
        </button>
      )}

      {storeOpen && (
        <StoreView kiosk={kiosk} childId={child.id} settings={settings} onClose={() => setStoreOpen(false)} />
      )}
      {timerOpen && (
        <TransitionTimer seconds={120} label="Transition time" onClose={() => setTimerOpen(false)} />
      )}
    </div>
  );
}

function StepCard({
  step,
  done,
  onTap,
  onSpeak,
  reducedMotion,
  haptics = true,
  accent,
  label,
  big = false,
  muted = false,
}: {
  step: KioskStep;
  done: boolean;
  onTap: () => void;
  onSpeak: () => void;
  reducedMotion: boolean;
  haptics?: boolean;
  accent?: string;
  label?: string;
  big?: boolean;
  muted?: boolean;
}) {
  const press = usePress({ haptics });
  return (
    <div className="relative">
      {/* The whole card is one big tap target — effortless to check off. */}
      <button
        onClick={onTap}
        disabled={done || muted}
        aria-label={`${step.label}${done ? " — done" : ""}`}
        {...press}
        className={cn(
          "pressable relative flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl p-4 text-center ring-1",
          big ? "min-h-52" : "min-h-40",
          done
            ? "bg-emerald-500/15 ring-emerald-500/45"
            : muted
              ? "bg-kpanel/40 opacity-50 shadow-none ring-kline/40"
              : "bg-kpanel shadow-k ring-kline/55 hover:brightness-110",
        )}
      >
        {done && !reducedMotion && (
          <span
            aria-hidden
            className="animate-radial-fill pointer-events-none absolute left-1/2 top-1/2 h-32 w-32 rounded-full"
            style={{ background: `radial-gradient(circle, ${accent ?? "#34d399"}, transparent 70%)` }}
          />
        )}
        {label && (
          <span className="absolute left-3 top-3 rounded-full bg-black/25 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-ktext/70">
            {label}
          </span>
        )}
        <span className={cn("leading-none", big ? "text-7xl" : "text-6xl", done && "opacity-50")}>
          {step.icon ?? "✅"}
        </span>
        <span
          className={cn(
            "font-display font-bold",
            big ? "text-2xl" : "text-lg",
            done ? "text-emerald-300/80 line-through" : "text-ktext",
          )}
        >
          {step.label}
        </span>
        {step.reward_points > 0 && !done && (
          <span className="flex items-center gap-1 text-sm font-semibold text-beacon">
            <Star className="h-4 w-4 fill-beacon" /> {step.reward_points}
          </span>
        )}
        {done && (
          <span className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-kpanel">
            <Check className="h-5 w-5" strokeWidth={3} />
          </span>
        )}
      </button>
      {/* Read-aloud — a sibling button (not nested), tucked in a corner. */}
      {!done && !muted && (
        <button
          onClick={onSpeak}
          aria-label={`Read ${step.label} aloud`}
          className="absolute bottom-2 right-2 rounded-full bg-black/20 p-2 text-ktext/60 transition hover:bg-black/40 hover:text-ktext"
        >
          <Volume2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
