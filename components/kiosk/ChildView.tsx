"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Star,
  Check,
  Volume2,
  Timer as TimerIcon,
  Heart,
  Gift,
  Home as HomeIcon,
  ArrowRight,
  Ban,
  ShieldCheck,
  Pill,
} from "lucide-react";
import type { useKiosk } from "./useKiosk";
import type { KioskChild, KioskStep, KioskChore, KioskMedication } from "@/lib/kiosk/types";
import { dueDoses } from "@/lib/kiosk/medication";
import { effectiveLevel, SUPPORT_LABELS } from "@/lib/kiosk/skill";
import { MedMoment } from "./MedMoment";
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
import { accentRamp, accentVars } from "@/lib/kiosk/accent";
import { activeGroundingFor } from "@/lib/kiosk/grounding";
import { speak, chime, haptic, cheer, greetLine, doneLine, play, HAPTIC } from "@/lib/kiosk/feedback";
import { activeStreak } from "@/lib/kiosk/streak";
import { StreakBadge } from "./StreakBadge";
import { sensoryOf, intensityOf, scaleCount } from "@/lib/kiosk/motion";
import { StoreView } from "./StoreView";
import { TransitionTimer } from "./TransitionTimer";
import { ChildAvatar } from "./ChildAvatar";
import { cn } from "@/lib/cn";

type Kiosk = ReturnType<typeof useKiosk>;

export function readChildSettings(child: KioskChild) {
  const s = (child.settings ?? {}) as Record<string, unknown>;
  const soundOn = s.sound !== false;
  return {
    // Voice requires BOTH read-aloud AND sound on — "sound off" is a master mute.
    readAloud: s.readAloud !== false && soundOn,
    autoRead: s.autoRead === true,
    sound: soundOn,
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
  const [medOpen, setMedOpen] = useState<{ med: KioskMedication; time: string } | null>(null);
  const [levelUp, setLevelUp] = useState<string | null>(null);
  const lastLevelN = useRef(0);
  // A calm, proud independence moment (§4.4) — NOT the points confetti.
  useEffect(() => {
    const lu = state?.lastLevelUp;
    if (!lu || lu.childId !== childId || lu.n === lastLevelN.current) return;
    lastLevelN.current = lu.n;
    const label = state?.snapshot.steps.find((s) => s.id === lu.stepId)?.label ?? "that";
    setLevelUp(label);
    speak("Look at you go", settings?.readAloud ?? false);
    const t = setTimeout(() => setLevelUp(null), 4500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.lastLevelUp?.n, childId]);

  // Honor the per-child "auto-read on open" accessibility setting: speak the
  // routine name once when it opens (not on every render).
  const activeRoutineId = activeRoutine?.id;
  useEffect(() => {
    if (settings?.autoRead && child && activeRoutineId) {
      const r = routines.find((x) => x.id === activeRoutineId);
      if (r) speak("Ready for the day", settings.readAloud);
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
    speak(greetLine(), settings.readAloud);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  if (!state || !child || !settings) return null;

  const today = todayKey();
  const prog =
    state.progress[child.id]?.date === today ? state.progress[child.id].completed : [];
  const points = state.points[child.id] ?? 0;
  const grounding = activeGroundingFor(state.snapshot.groundings, child.id);
  const due = dueDoses(state, child.id); // §4.3 medication doses due now (calm, separate)
  const lvl = (s: KioskStep) => effectiveLevel(state, child!.id, s); // §4.4 effective skill level
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
    speak(cheer(), settings!.readAloud);
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
      speak(doneLine(), settings!.readAloud);
      kiosk.bumpStreak(child!.id); // finishing the routine keeps the streak alive
      setTimeout(() => setBigCelebrate(false), 4200);
    }
  }

  function doCompleteChore(chore: KioskChore) {
    kiosk.completeChore(child!.id, chore);
    chime(settings!.sound);
    haptic(HAPTIC.choreDone, settings!.haptics);
    speak(cheer(), settings!.readAloud);
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
  // Per-child accent ramp + CSS vars suffuse the whole view (Visual Spec §2.2);
  // the Voyage scene tracks the time of day (§3.5).
  const ramp = accentRamp(color);
  const accentStyle = accentVars(color) as React.CSSProperties;
  const hr = new Date().getHours();
  const scene: "day" | "golden" | "night" = hr >= 21 || hr < 6 ? "night" : hr >= 18 ? "golden" : "day";
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
    <div
      className="relative min-h-dvh text-ktext"
      style={{
        ...accentStyle,
        // Living ambient (§3): the child's accent washes the upper-right, deep water
        // rises from the bottom — warm depth instead of flat near-black.
        background:
          "radial-gradient(760px 520px at 78% 4%, var(--accent-soft), transparent 56%), radial-gradient(1100px 820px at 50% 122%, #0c1a30 0%, #0a1424 45%, #070a0d 82%)",
      }}
    >
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
          onClick={() => speak("What's next", settings.readAloud)}
          className="mt-3.5 flex w-full items-center gap-4 text-left"
        >
          <span
            className="shrink-0 rounded-2xl"
            style={{ boxShadow: "0 0 0 2px var(--accent), 0 0 22px -2px var(--accent-glow)" }}
          >
            <ChildAvatar child={child} size={64} rounded="rounded-2xl" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-2xl font-bold tracking-tight text-ktext">
              {activeRoutine ? `${child.name}'s ${activeRoutine.name}` : child.name}
            </h1>
            <p className="mt-0.5 text-sm text-ktext/70">{activeRoutine ? progressMsg : `Hi, ${child.name}!`}</p>
            {activeRoutine && progressTotal > 0 && (
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--accent-deep), var(--accent-bright))", boxShadow: "0 0 14px -1px var(--accent-glow)" }}
                />
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
        {/* Encouragement + the always-present break door, one row (§6). */}
        <div className="mb-4 flex items-center justify-end gap-4">
          {encLine && (
            <p
              className="min-w-0 flex-1 font-display text-base font-semibold leading-snug sm:text-lg"
              style={{ color: "var(--accent-text)", textShadow: "0 0 24px var(--accent-glow)" }}
            >
              {encLine}
            </p>
          )}
          <Pressable
            haptics={settings.haptics}
            onClick={() => setAnchorOpen(true)}
            className="flex shrink-0 items-center gap-2.5 rounded-full px-5 py-2.5 font-semibold text-[#d3daff] ring-1 backdrop-blur"
            style={{
              background: "linear-gradient(180deg, var(--accent-soft), rgba(255,255,255,0.04))",
              borderColor: "var(--accent-glow)",
              boxShadow: "0 0 26px -6px var(--accent-glow)",
            }}
          >
            <span
              className={cn("h-2.5 w-2.5 rounded-full", !settings.reducedMotion && "k-glow")}
              style={{ background: "var(--accent)", boxShadow: "0 0 10px var(--accent-glow)" }}
            />
            I need a break
          </Pressable>
        </div>
        {softenedToday && (
          <p className="mb-4 flex items-center justify-center gap-2 rounded-2xl bg-violet-400/10 py-2.5 text-sm font-medium text-violet-200 ring-1 ring-violet-400/20">
            🌙 Taking it easy today
          </p>
        )}
        {/* Independence level-up (§4.4) — calm + proud, not bribed. */}
        {levelUp && (
          <div
            className="mb-4 flex items-center justify-center gap-3 rounded-2xl p-4 text-center font-display text-xl font-bold text-ktext ring-1"
            style={{ background: "var(--accent-soft)", borderColor: "var(--accent-glow)" }}
          >
            <span className="text-2xl">🧭</span>
            You&apos;re doing <span style={{ color: "var(--accent-text)" }}>{levelUp}</span> with less help now — look at you go!
          </div>
        )}
        {/* Medicine time (§4.3) — calm + separate from steps. No points, ever. */}
        {due.length > 0 && (
          <div className="mb-4 rounded-2xl bg-kraise p-4 ring-1 ring-kline/40">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-kmute">
              <Pill className="h-4 w-4" /> Medicine time
            </p>
            <div className="space-y-2">
              {due.map(({ med, time }) => (
                <Pressable
                  key={med.id + time}
                  haptics={settings.haptics}
                  onClick={() => setMedOpen({ med, time })}
                  className="flex w-full items-center gap-3 rounded-xl bg-kpanel px-3 py-3 text-left ring-1 ring-kline/45"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg text-xl" style={{ background: `${color}1a` }}>
                    {med.icon || "💊"}
                  </span>
                  <span className="flex-1">
                    <span className="block font-semibold text-ktext">{med.name}</span>
                    {med.dose && <span className="block text-xs text-kmute">{med.dose}</span>}
                  </span>
                  <span className="text-sm font-semibold" style={{ color }}>
                    Tap
                  </span>
                </Pressable>
              ))}
            </div>
          </div>
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
            {activeRoutine.type !== "first_then" && (
              <Voyage steps={scheduleSteps} doneIds={new Set(prog)} ramp={ramp} scene={scene} reducedMotion={settings.reducedMotion} />
            )}

            {activeRoutine.type === "first_then" && firstStep && thenStep ? (
              <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
                <StepCard step={firstStep} label="First" level={lvl(firstStep)} done={prog.includes(firstStep.id)} reducedMotion={settings.reducedMotion} haptics={settings.haptics} accent={color} onTap={() => complete(firstStep)} onSpeak={() => speak(firstStep.label, settings.readAloud)} big />
                <ArrowRight className="mx-auto h-10 w-10 rotate-90 text-kmute sm:rotate-0" />
                <StepCard step={thenStep} label="Then" level={lvl(thenStep)} done={prog.includes(thenStep.id)} reducedMotion={settings.reducedMotion} haptics={settings.haptics} accent={color} onTap={() => { if (prog.includes(firstStep.id)) complete(thenStep); }} onSpeak={() => speak(thenStep.label, settings.readAloud)} big muted={!prog.includes(firstStep.id)} />
              </div>
            ) : allDone ? (
              <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/15 p-4 text-center font-display text-xl font-bold text-emerald-300">
                🎉 All done! Great job, {child.name}!
              </div>
            ) : (
              (() => {
                // The current step is the glowing "do this now" focal (§8); the rest
                // (done + upcoming) recede into a calmer secondary row (§9).
                const current = scheduleSteps.find((s) => !prog.includes(s.id));
                const others = scheduleSteps.filter((s) => s !== current);
                return (
                  <>
                    {current && (
                      <NowCard
                        step={current}
                        level={lvl(current)}
                        reducedMotion={settings.reducedMotion}
                        onTap={() => complete(current)}
                        onSpeak={() => speak(current.label, settings.readAloud)}
                      />
                    )}
                    {others.length > 0 && (
                      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                        {others.map((s) => (
                          <StepCard
                            key={s.id}
                            step={s}
                            level={lvl(s)}
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
                );
              })()
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
          className="flex items-center justify-center gap-2 rounded-xl py-3.5 text-base font-semibold ring-1 transition hover:brightness-110"
          style={{
            background: "linear-gradient(180deg, var(--accent-soft), rgba(255,255,255,0.04))",
            borderColor: "var(--accent-glow)",
            color: "var(--accent-text)",
          }}
        >
          <Heart className="h-5 w-5" /> Calm Tools
        </Pressable>
      </footer>
      </div>
      {/* ── Overlays — siblings of the world, so they stay crisp when it recedes ── */}
      {medOpen && (
        <MedMoment
          med={medOpen.med}
          doseTime={medOpen.time}
          accent={color}
          verifyPin={kiosk.verifyPin}
          readAloud={settings.readAloud}
          onConfirm={(by) => {
            kiosk.takeMedication(child.id, medOpen.med, medOpen.time, by);
            setMedOpen(null);
          }}
          onClose={() => setMedOpen(null)}
        />
      )}

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

/** The now-card (Visual Spec §8) — the single, unmistakable "do this now": large,
 *  accent-bordered, gently breathing, accent-suffused (reads --accent-* from the
 *  ChildView root). A div (not a button) so the read-aloud control can nest. */
function NowCard({
  step,
  onTap,
  onSpeak,
  reducedMotion,
  level = 1,
}: {
  step: KioskStep;
  onTap: () => void;
  onSpeak: () => void;
  reducedMotion: boolean;
  level?: number;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onTap}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onTap();
      }}
      className={cn(
        "relative mb-3 flex w-full cursor-pointer items-center gap-5 overflow-hidden rounded-[24px] p-5 text-left transition active:scale-[0.985] sm:gap-7 sm:p-6",
        !reducedMotion && "now-breathe",
      )}
      style={{
        background:
          "radial-gradient(420px 220px at 18% 0%, var(--accent-soft), transparent 70%), linear-gradient(165deg,#1c2740 0%,#141c2e 60%,#121826 100%)",
        border: "1.5px solid var(--accent-glow)",
      }}
    >
      <span
        className="absolute right-4 top-4 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em]"
        style={{ color: "var(--accent-text)" }}
      >
        {level >= 4 ? (
          <>🧭 On your own</>
        ) : level === 3 ? (
          <>Just a reminder</>
        ) : (
          <>
            <span className={cn("h-1.5 w-1.5 rounded-full", !reducedMotion && "k-glow")} style={{ background: "var(--accent)" }} /> Do this now
          </>
        )}
      </span>
      <span
        className="flex aspect-square w-[clamp(72px,16vw,108px)] shrink-0 items-center justify-center rounded-[22px] text-[clamp(40px,9vw,62px)] leading-none"
        style={{
          background: "radial-gradient(circle at 50% 35%, var(--accent-soft), rgba(13,18,30,.6))",
          boxShadow: "inset 0 0 30px var(--accent-soft), 0 0 0 1px var(--accent-glow)",
        }}
      >
        {step.icon ?? "✅"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-display text-[clamp(26px,5.5vw,52px)] font-extrabold leading-none tracking-tight text-white">{step.label}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {step.reward_points > 0 && (
            <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums text-beacon">
              <Star className="h-5 w-5 fill-beacon text-beacon" /> {step.reward_points}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: "var(--accent-text)" }}>
            Tap when you&apos;re done <ArrowRight className={cn("h-4 w-4", !reducedMotion && "nudge-x")} />
          </span>
        </div>
      </div>
      {level <= 2 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSpeak();
          }}
          aria-label="Read aloud"
          className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-ktext/70 ring-1 ring-white/10 transition active:scale-90"
        >
          <Volume2 className="h-4 w-4" />
        </button>
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
  level = 1,
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
  level?: number;
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
        {level >= 4 && !done && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/25 px-2 py-0.5 text-[11px] font-bold text-ktext/70">
            🧭 On your own
          </span>
        )}
        <span className={cn("leading-none", big ? "text-7xl" : "text-6xl", done && "opacity-50", level >= 4 && "text-4xl opacity-40", level === 3 && "opacity-80")}>
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
      {/* Read-aloud fades out as the child needs fewer prompts (§4.4). */}
      {!done && !muted && level <= 2 && (
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
