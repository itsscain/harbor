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
  Moon,
  Sparkles,
} from "lucide-react";
import type { useKiosk } from "./useKiosk";
import type { KioskChild, KioskStep, KioskChore, KioskMedication, KioskRoutine } from "@/lib/kiosk/types";
import { dueDoses } from "@/lib/kiosk/medication";
import { effectiveLevel } from "@/lib/kiosk/skill";
import { MedMoment } from "./MedMoment";
import { todayKey } from "@/lib/kiosk/db";
import { runsToday, withinWindow, windowLabel, windowCountdown, opensAtLabel, formatCountdown } from "@/lib/kiosk/calendar";
import { routineForChild, effectiveSchedule } from "@/lib/kiosk/schedule";
import { trustedNow, tzOf, serviceDay } from "@/lib/kiosk/time";
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
import { daypartFor } from "@/lib/kiosk/daypart";
import { activeGroundingFor } from "@/lib/kiosk/grounding";
import { speak, cheer, greetLine, doneLine, feedback } from "@/lib/kiosk/feedback";
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

/** Spoken text for a step — the custom read-aloud if set, else the label (§8.2). */
function spoken(step: KioskStep): string {
  const r = step.read_aloud?.trim();
  return r && r.length ? r : step.label;
}
/** "HH:MM[:SS]" → minutes since midnight (for time-of-day routine ranking). */
function clockMin(t: string | null | undefined): number {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}
/** Sanitize a jsonb choice/substep options blob into {icon,label} rows. */
function stepOptions(v: unknown): { icon: string; label: string }[] {
  if (!Array.isArray(v)) return [];
  return v.map((o) => {
    const r = (o ?? {}) as Record<string, unknown>;
    return { icon: r.icon ? String(r.icon) : "", label: r.label ? String(r.label) : "" };
  });
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

  // Re-render across midnight so "today" + day-of-week filtering stay correct on an
  // always-on wall. The tick also refreshes the time-of-day routine pick + window state
  // each minute so the wall keeps guiding as the day moves.
  const [dayTick, setDayTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setDayTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);


  const tz = tzOf(state);
  // Family-wide scheduling (P2): a child's wall shows their own routines PLUS shared
  // routines they're assigned to, each through the per-child effective window
  // (override → template → own schedule) so "define once" really applies to everyone.
  const routines = useMemo(() => {
    if (!state || !child) return [];
    return state.snapshot.routines
      .filter((r) => {
        if (!r.active || !routineForChild(r, child.id)) return false;
        const eff = effectiveSchedule(r, child.id, state.snapshot);
        return !eff.disabled && runsToday(eff.days_of_week, tz);
      })
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [state, child, tz]);

  // Time-of-day guidance (get in the kid's head): when the child hasn't picked a tab, open
  // on the routine that matters NOW. Priority: an OPEN routine they haven't finished →
  // one to CATCH UP on (window passed, still undone — pick the most recently missed) →
  // the SOONEST upcoming. So the wall never sits on a finished morning at bedtime, nor a
  // not-yet bedtime in the morning. Recomputes each minute via dayTick.
  const smartRoutineId = useMemo(() => {
    void dayTick;
    if (!state || !child || routines.length === 0) return null;
    const now = trustedNow(state);
    const day = serviceDay(state);
    const done = state.progress[child.id]?.date === day ? state.progress[child.id].completed : [];
    const isDone = (r: KioskRoutine) => {
      const st = state.snapshot.steps.filter((s) => s.routine_id === r.id);
      if (r.type === "first_then") {
        const th = st.find((s) => s.step_type === "then");
        return !!th && done.includes(th.id);
      }
      const tasks = st.filter((s) => s.step_type === "task");
      return tasks.length > 0 && tasks.every((s) => done.includes(s.id));
    };
    let best: { id: string; rank: number; key: number } | null = null;
    for (const r of routines) {
      const w = effectiveSchedule(r, child.id, state.snapshot);
      const hasWin = !!(w.start_time || w.end_time);
      const open = !hasWin || withinWindow(w, now, tz);
      const wc = hasWin ? windowCountdown(w, now, tz) : { untilOpenMin: null, untilCloseMin: null };
      const finished = isDone(r);
      const startMin = clockMin(w.start_time);
      let rank: number, key: number;
      if (open && !finished && hasWin) { rank = 0; key = startMin; }                   // WINDOWED & open now — the thing to do
      else if (!open && wc.untilOpenMin == null && !finished) { rank = 1; key = 1440 - startMin; } // catch-up (most recently missed)
      else if (open && !finished) { rank = 2; key = startMin; }                        // windowless "anytime" — doable, lower priority than a timed one
      else if (!open && wc.untilOpenMin != null) { rank = 3; key = wc.untilOpenMin; }  // upcoming (soonest)
      else if (open && finished) { rank = 4; key = startMin; }                         // open but done
      else { rank = 5; key = startMin; }                                              // past + done
      if (!best || rank < best.rank || (rank === best.rank && key < best.key)) best = { id: r.id, rank, key };
    }
    return best?.id ?? null;
  }, [state, child, routines, tz, dayTick]);

  const [routineId, setRoutineId] = useState<string | null>(null);
  // A manual tab pick wins; otherwise the time-of-day choice; otherwise the first routine.
  const activeRoutine =
    (routineId ? routines.find((r) => r.id === routineId) : undefined) ??
    routines.find((r) => r.id === smartRoutineId) ??
    routines[0];

  // The PER-CHILD effective window (P2: override → template → own schedule), vs trusted
  // (tamper-resistant) time in the family tz.
  const activeWindow =
    state && child && activeRoutine ? effectiveSchedule(activeRoutine, child.id, state.snapshot) : null;
  const nowWc = state && activeWindow ? windowCountdown(activeWindow, trustedNow(state), tz) : null;
  const hasWindow = !!activeWindow && !!(activeWindow.start_time || activeWindow.end_time);
  const inWindow = !state || !activeWindow || withinWindow(activeWindow, trustedNow(state), tz);
  // The ONLY hard lock is a routine that hasn't OPENED yet (e.g. bedtime at noon) — it's
  // genuinely "not time." A routine whose window has PASSED is NOT locked: the child simply
  // forgot, so Harbor lets them CATCH UP and finish it (the 11am-missed-morning fix) rather
  // than punishing a forgetful kid — routines exist to HELP them do the thing, not gate it.
  const notYetOpen = !!state && hasWindow && !inWindow && !!nowWc && nowWc.untilOpenMin != null;
  const catchUp = !!state && hasWindow && !inWindow && (!nowWc || nowWc.untilOpenMin == null);
  const routineLocked = notYetOpen;
  const lockLabel = activeWindow ? windowLabel(activeWindow) : null;
  // No silent no-op (§5–§7): when not-yet-open, Harbor explains WHY — gently, with a live
  // countdown — and offers the calm corner. Recomputes on the 60s dayTick above.
  const lockCountdown = notYetOpen ? nowWc : null;
  const lockOpensAt = activeWindow ? opensAtLabel(activeWindow) : null;
  // A short, warm spoken line for a blocked tap — voiced only if read-aloud is on.
  const lockSpeech = (() => {
    if (!activeRoutine) return "";
    const name = activeRoutine.name;
    if (lockCountdown?.untilOpenMin != null) {
      return `${name} opens in ${formatCountdown(lockCountdown.untilOpenMin)}. Let's come back then!`;
    }
    if (lockOpensAt) return `${name} ${lockOpensAt}. Let's come back then!`;
    return `${name} is resting right now. Let's come back later!`;
  })();
  // "Closing soon" heads-up (§7): only meaningful while genuinely open.
  const CLOSING_SOON_MIN = 20;
  const closeMin = inWindow && hasWindow && nowWc ? nowWc.untilCloseMin : null;
  const closingSoonMin = closeMin != null && closeMin > 0 && closeMin <= CLOSING_SOON_MIN ? closeMin : null;

  const steps = useMemo(() => {
    if (!state || !activeRoutine) return [];
    return state.snapshot.steps
      .filter((s) => s.routine_id === activeRoutine.id)
      .sort((a, b) => a.order_index - b.order_index);
  }, [state, activeRoutine]);

  const [celebrate, setCelebrate] = useState<{ points: number; n: number } | null>(null);
  const [approvingChore, setApprovingChore] = useState<KioskChore | null>(null);
  // Advanced steps (§8.2): a step awaiting a grown-up's PIN, and local (unsynced)
  // sub-step ticks keyed by step id — completing all of them finishes the parent step.
  const [approvingStep, setApprovingStep] = useState<KioskStep | null>(null);
  const [subProgress, setSubProgress] = useState<Record<string, number[]>>({});
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

  const today = serviceDay(state); // family-tz day → matches what completeStep writes
  const prog =
    state.progress[child.id]?.date === today ? state.progress[child.id].completed : [];
  const points = state.points[child.id] ?? 0;
  const grounding = activeGroundingFor(state.snapshot.groundings, child.id);
  const due = dueDoses(state, child.id); // §4.3 medication doses due now (calm, separate)
  const lvl = (s: KioskStep) => effectiveLevel(state, child!.id, s); // §4.4 effective skill level
  const corner = (state.snapshot.corners ?? []).find((c) => c.child_id === child.id && c.status === "active") ?? null;
  // Auto-soften (§9.1.3): after a rough Anchor today, run gentler celebration.
  const softenedToday = state.autoSoften?.[child.id] === today;
  // A routine can override the child's sensory intensity for just this routine (§8.2).
  const baseIntensity = activeRoutine?.sensory_intensity
    ? intensityOf(activeRoutine.sensory_intensity)
    : settings.intensity;
  const fxIntensity = softenedToday ? Math.min(0.6, baseIntensity) : baseIntensity;
  const streak = activeStreak(state.streaks, child.id);
  // Personalized encouragement from the child's AI profile (offline; rotates daily).
  const encLines = child.ai_profile?.encouragement ?? [];
  const encLine = encLines.length ? encLines[new Date().getDate() % encLines.length] : null;

  // One coordinated beat per completion (§3.6): sound + haptic + the keeper's voice,
  // gated by the child's settings and scaled by today's sensory intensity.
  const fx = { sound: settings!.sound, haptics: settings!.haptics, intensity: fxIntensity };

  // Gate a tap, then complete. Advanced kinds (§8.2) add gentle, ALWAYS-explained gates
  // (§5, never a silent no-op); choice/substep call doComplete once their control resolves.
  function complete(step: KioskStep) {
    if (prog.includes(step.id)) return;
    // Time-locked routine: never a silent no-op (§5). Gently refuse outside its window —
    // no completion, no points — with a soft cue AND a spoken reason so the child always
    // knows the tap registered and why nothing happened.
    if (routineLocked) {
      feedback("soft-error", fx);
      if (settings!.readAloud && lockSpeech) speak(lockSpeech);
      return;
    }
    // Strict order (§8.2): only the current step completes; tapping ahead is answered
    // with a soft cue + a spoken nudge back to the right step — not silently eaten.
    if (activeRoutine?.strict_order && !isFirstThen) {
      const expected = scheduleSteps.find((s) => !prog.includes(s.id));
      if (expected && expected.id !== step.id) {
        feedback("soft-error", fx);
        if (settings!.readAloud) speak(`Let's do "${spoken(expected)}" first!`);
        return;
      }
    }
    // Approval (§8.2): needs a grown-up's OK before the stars. Only gate when a PIN
    // actually exists (else verifyPin auto-passes = a fake gate).
    if (step.kind === "approval" && kiosk.state?.pinHash) {
      setApprovingStep(step);
      return;
    }
    doComplete(step);
  }

  function doComplete(step: KioskStep) {
    if (prog.includes(step.id)) return;
    // Pin the routine the moment they start doing it, so the minute-by-minute time-of-day
    // pick can never yank a mid-task child onto a different routine (a fresh open re-picks).
    if (!routineId && activeRoutine) setRoutineId(activeRoutine.id);
    kiosk.completeStep(child!.id, step);
    // Does this tap finish the whole routine? → the big "you're home" arrival moment.
    const finishes = isFirstThen
      ? !!thenStep && step.id === thenStep.id
      : scheduleSteps.length > 0 && scheduleSteps.every((s) => s.id === step.id || prog.includes(s.id));
    // celebration_style (§8.2): 'calm'/'voyage' keep the finish quiet (the Voyage arrival
    // flare owns the moment); 'confetti'/'auto'/unset play the full-screen cheer.
    const celeb = activeRoutine?.celebration_style;
    const bigOverlay = celeb !== "calm" && celeb !== "voyage";
    // One beat per completion: a finishing step plays ONLY the arrival bell (not the
    // step chime + bell on top of each other, nor two voice lines).
    if (finishes) {
      if (bigOverlay) setBigCelebrate(true);
      feedback("arrival", { ...fx, say: settings!.readAloud ? doneLine() : undefined });
      kiosk.bumpStreak(child!.id); // finishing the routine keeps the streak alive
      if (bigOverlay) setTimeout(() => setBigCelebrate(false), 4200);
    } else {
      feedback("step-complete", { ...fx, say: settings!.readAloud ? cheer() : undefined });
    }
    if (step.reward_points > 0) {
      setCelebrate({ points: step.reward_points, n: Date.now() });
      setTimeout(() => setCelebrate(null), 1300);
    }
    setSubProgress((p) => (p[step.id] ? { ...p, [step.id]: [] } : p));
  }

  // Sub-stepped step (§8.2): tick a small part; all ticked → the parent step completes.
  // Ticks are local-only (not synced) — the step completion is what syncs. Every tap gets
  // a light beat, so it's never a silent no-op.
  function toggleSub(step: KioskStep, i: number) {
    const opts = stepOptions(step.substeps);
    if (opts.length === 0) return;
    // A not-yet-open routine gates completion (§6.3). Route the tap through complete() so it
    // gets the explained "resting" feedback + spoken reason, and never optimistically ticks —
    // otherwise the sub-steps would show a stuck "all done 🎉" while the step stays incomplete.
    if (routineLocked) {
      complete(step);
      return;
    }
    const cur = subProgress[step.id] ?? [];
    const adding = !cur.includes(i);
    const next = adding ? [...cur, i] : cur.filter((x) => x !== i);
    if (adding && next.length >= opts.length) {
      setSubProgress((p) => ({ ...p, [step.id]: next }));
      complete(step); // runs the approval/strict gates, then doComplete
    } else {
      if (adding) feedback("step-complete", { sound: settings!.sound, haptics: settings!.haptics, intensity: fxIntensity });
      setSubProgress((p) => ({ ...p, [step.id]: next }));
    }
  }

  // First→Then order guard, made audible (§5): tapping "Then" before "First" is done is
  // never a silent no-op — Harbor nudges the child back to First with a cue + a spoken hint.
  function tapThen(firstStep: KioskStep, thenStep: KioskStep) {
    if (prog.includes(thenStep.id)) return;
    if (!prog.includes(firstStep.id)) {
      feedback("soft-error", fx);
      if (settings!.readAloud) speak(`Let's do "${spoken(firstStep)}" first!`);
      return;
    }
    complete(thenStep);
  }

  function doCompleteChore(chore: KioskChore) {
    kiosk.completeChore(child!.id, chore);
    feedback("chore-complete", { ...fx, say: settings!.readAloud ? cheer() : undefined });
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
    .filter((c) => c.active && runsToday(c.days_of_week, tz) && choreAssignee(c, new Set(state.snapshot.children.map((k) => k.id))) === child.id)
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
  const daypart = daypartFor();
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
              fx="back"
              sound={settings.sound}
              intensity={settings.intensity}
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
          onClick={() => speak(routineLocked && lockSpeech ? lockSpeech : "What's next", settings.readAloud)}
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
              onClick={() => {
                feedback("tab-switch", { sound: settings.sound, haptics: settings.haptics, intensity: settings.intensity });
                setRoutineId(r.id);
              }}
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
            fx="break"
            sound={settings.sound}
            intensity={settings.intensity}
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
            {routineLocked && !allDone && (
              // A resting state, not an error (§6): warm, explains WHY with a live countdown,
              // and offers the calm corner as the forward path — never a dead end. (When the
              // routine is both closed AND finished, the "all done" celebration owns the moment.)
              <div className="mb-4 flex flex-col items-center gap-3 rounded-2xl bg-amber-400/10 px-5 py-4 text-center ring-1 ring-amber-400/25 sm:flex-row sm:justify-between sm:text-left">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-amber-200">
                    <Moon className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-lg font-bold text-amber-100">
                      {activeRoutine.name} is resting
                    </p>
                    <p className="text-sm font-semibold text-amber-200/90">
                      {lockCountdown?.untilOpenMin != null
                        ? `Opens in ${formatCountdown(lockCountdown.untilOpenMin)}`
                        : lockOpensAt
                          ? lockOpensAt.charAt(0).toUpperCase() + lockOpensAt.slice(1)
                          : lockLabel
                            ? `Available ${lockLabel}`
                            : "Come back a little later"}
                    </p>
                  </div>
                </div>
                <Pressable
                  haptics={settings.haptics}
                  fx="break"
                  sound={settings.sound}
                  intensity={settings.intensity}
                  onClick={() => setAnchorOpen(true)}
                  className="flex shrink-0 items-center gap-2 rounded-full bg-amber-400/20 px-4 py-2 font-semibold text-amber-100 ring-1 ring-amber-400/30"
                >
                  <Sparkles className="h-4 w-4" />
                  Take a calm break
                </Pressable>
              </div>
            )}
            {catchUp && !allDone && (
              // Catch-up (the missed-morning fix): the window passed but the child forgot —
              // so this is a warm invitation to finish, NOT a lock. Steps stay fully tappable.
              <div className="mb-4 flex flex-col items-center gap-3 rounded-2xl bg-kwater/10 px-5 py-4 text-center ring-1 ring-kwater/25 sm:flex-row sm:justify-between sm:text-left">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-kwater/15 text-kwater">
                    <Sparkles className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-lg font-bold text-ktext">Let&apos;s catch up on {activeRoutine.name}!</p>
                    <p className="text-sm font-semibold text-kwater">
                      {progressDone > 0
                        ? `${progressTotal - progressDone} to go — you've got this 💪`
                        : "You can still finish it — start right here 💪"}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {closingSoonMin != null && !allDone && (
              // "Closing soon" heads-up (§7): calm and supportive, never a stressful clock.
              <div className="mb-4 flex items-center justify-center gap-2.5 rounded-2xl bg-kwater/10 px-4 py-2.5 text-center text-sm font-semibold text-kwater ring-1 ring-kwater/25">
                <TimerIcon className="h-4 w-4 shrink-0" />
                <span>
                  About {formatCountdown(closingSoonMin)} left for {activeRoutine.name} — no rush 🌊
                </span>
              </div>
            )}
            {activeRoutine.type !== "first_then" && (
              <Voyage
                steps={scheduleSteps}
                doneIds={new Set(prog)}
                ramp={ramp}
                daypart={daypart}
                reducedMotion={settings.reducedMotion}
                intensity={fxIntensity}
                arrivalSignal={celebrate?.n}
                uid={child.id}
              />
            )}

            {activeRoutine.type === "first_then" && firstStep && thenStep ? (
              <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
                <StepCard step={firstStep} label="First" level={lvl(firstStep)} done={prog.includes(firstStep.id)} reducedMotion={settings.reducedMotion} haptics={settings.haptics} accent={color} onTap={() => complete(firstStep)} onSpeak={() => speak(spoken(firstStep), settings.readAloud)} big />
                <ArrowRight className="mx-auto h-10 w-10 rotate-90 text-kmute sm:rotate-0" />
                <StepCard step={thenStep} label="Then" level={lvl(thenStep)} done={prog.includes(thenStep.id)} reducedMotion={settings.reducedMotion} haptics={settings.haptics} accent={color} onTap={() => tapThen(firstStep, thenStep)} onSpeak={() => speak(spoken(thenStep), settings.readAloud)} big muted={!prog.includes(firstStep.id)} />
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
                        onSpeak={() => speak(spoken(current), settings.readAloud)}
                        subDone={subProgress[current.id] ?? []}
                        onToggleSub={(i) => toggleSub(current, i)}
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
                            onSpeak={() => speak(spoken(s), settings.readAloud)}
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
          deviceSecret={kiosk.state?.deviceSecret}
          childId={child.id}
          voiceChat={(child.settings as Record<string, unknown> | null)?.voiceChat === true}
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

      {approvingStep && (
        <ParentGate
          verify={kiosk.verifyPin}
          title="A grown-up's OK?"
          subtitle={`Enter your PIN to finish "${approvingStep.label}".`}
          onSuccess={() => {
            const s = approvingStep;
            setApprovingStep(null);
            doComplete(s);
          }}
          onCancel={() => setApprovingStep(null)}
        />
      )}

      {celebrate && (
        <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
          {!settings.reducedMotion && <Confetti key={celebrate.n} count={scaleCount(24, fxIntensity)} accent={ramp.accent} />}
          <div
            className={cn("rounded-full bg-beacon px-10 py-8 text-center shadow-2xl", !settings.reducedMotion && "animate-reward")}
            style={{ boxShadow: "0 0 60px -6px rgba(246,178,61,.8), 0 24px 48px -12px rgba(0,0,0,.6)" }}
          >
            <Star className="mx-auto h-12 w-12 fill-harbor text-harbor" style={{ filter: "drop-shadow(0 0 10px rgba(255,255,255,.6))" }} />
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
          {!settings.reducedMotion && <Confetti count={scaleCount(64, fxIntensity)} spread={560} accent={ramp.accent} />}
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
 *  ChildView root). Renders the step's kind (§8.2): a plain tap, a Choice ("pick one"),
 *  or Sub-steps (tick each). A div (not a button) so nested controls can nest. */
function NowCard({
  step,
  onTap,
  onSpeak,
  reducedMotion,
  level = 1,
  subDone = [],
  onToggleSub,
}: {
  step: KioskStep;
  onTap: () => void;
  onSpeak: () => void;
  reducedMotion: boolean;
  level?: number;
  /** For a sub-stepped step: which sub-step indices are ticked. */
  subDone?: number[];
  onToggleSub?: (i: number) => void;
}) {
  const choices = step.kind === "choice" ? stepOptions(step.choice_options) : [];
  const subs = step.kind === "substep" ? stepOptions(step.substeps) : [];
  const isChoice = choices.length > 0;
  const isSub = subs.length > 0;
  // With inner controls, the WHOLE card no longer completes on tap — the child must pick
  // an option / tick the parts. Keeps a stray tap from skipping the choice.
  const wholeTap = !isChoice && !isSub;
  const together = step.kind === "together";

  return (
    <div
      role={wholeTap ? "button" : undefined}
      tabIndex={wholeTap ? 0 : undefined}
      onClick={wholeTap ? onTap : undefined}
      onKeyDown={
        wholeTap
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onTap();
            }
          : undefined
      }
      className={cn(
        "relative mb-3 flex w-full items-start gap-5 overflow-hidden rounded-[24px] p-5 text-left transition sm:gap-7 sm:p-6",
        wholeTap && "cursor-pointer active:scale-[0.985]",
        !reducedMotion && "now-breathe",
      )}
      style={{
        background:
          "radial-gradient(420px 220px at 18% 0%, var(--accent-soft), transparent 70%), linear-gradient(165deg,#1c2740 0%,#141c2e 60%,#121826 100%)",
        border: "1.5px solid var(--accent-glow)",
        // Lumen §10.3/§2.5 — liquid-light rim: the now-card emits, not just bordered.
        boxShadow:
          "0 0 0 1px var(--accent-line), 0 0 44px -14px var(--accent-glow), inset 0 1px 0 rgba(255,250,240,.08)",
      }}
    >
      <span
        className="absolute right-4 top-4 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em]"
        style={{ color: "var(--accent-text)" }}
      >
        {together ? (
          <>🤝 Together</>
        ) : level >= 4 ? (
          <>🧭 On your own</>
        ) : level === 3 ? (
          <>Just a reminder</>
        ) : isChoice ? (
          <>Your choice</>
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
        <p className="font-display text-[clamp(24px,5.2vw,48px)] font-extrabold leading-none tracking-tight text-white">{step.label}</p>
        {step.hint && (
          <p className="mt-2.5 flex items-start gap-1.5 text-sm font-medium text-white/75 sm:text-base">
            <span aria-hidden>💡</span>
            <span>{step.hint}</span>
          </p>
        )}

        {isChoice ? (
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {choices.map((o, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  onTap();
                }}
                className="kiosk-tap flex flex-col items-center justify-center gap-1.5 rounded-2xl px-3 py-4 text-center ring-1 transition hover:brightness-110 active:scale-95"
                style={{ background: "var(--accent-soft)", borderColor: "var(--accent-glow)", boxShadow: "0 0 0 1px var(--accent-line)" }}
              >
                <span className="text-4xl leading-none">{o.icon || "•"}</span>
                <span className="font-display text-base font-bold text-white">{o.label}</span>
              </button>
            ))}
          </div>
        ) : isSub ? (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-semibold" style={{ color: "var(--accent-text)" }}>
              {subDone.length} of {subs.length} done{subDone.length === subs.length ? " 🎉" : ""}
            </p>
            {subs.map((o, i) => {
              const d = subDone.includes(i);
              return (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSub?.(i);
                  }}
                  className={cn(
                    "kiosk-tap flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left ring-1 transition active:scale-[0.99]",
                    d ? "bg-emerald-500/15 ring-emerald-500/40" : "bg-white/5 ring-white/10 hover:bg-white/10",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-2",
                      d ? "bg-emerald-500 text-white ring-emerald-400/40" : "ring-white/25",
                    )}
                  >
                    {d && <Check className="h-4 w-4" strokeWidth={3} />}
                  </span>
                  <span className="text-2xl leading-none">{o.icon || "•"}</span>
                  <span className={cn("font-display text-lg font-bold", d ? "text-emerald-200/80 line-through" : "text-white")}>{o.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {step.reward_points > 0 && (
              <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums text-beacon">
                <Star className="h-5 w-5 fill-beacon text-beacon" /> {step.reward_points}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: "var(--accent-text)" }}>
              {step.kind === "approval" ? (
                <>
                  <ShieldCheck className="h-4 w-4" /> Tap — a grown-up says OK
                </>
              ) : (
                <>
                  Tap when you&apos;re done <ArrowRight className={cn("h-4 w-4", !reducedMotion && "nudge-x")} />
                </>
              )}
            </span>
          </div>
        )}
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
        // Only a DONE step is truly inert. A `muted` (not-yet) step stays tappable so its
        // handler can answer back (§5) — e.g. "Let's do First first!" — never a silent no-op.
        disabled={done}
        aria-disabled={muted || undefined}
        aria-label={`${step.label}${done ? " — done" : ""}`}
        {...press}
        className={cn(
          "pressable relative flex w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl p-4 text-center",
          big ? "min-h-52" : "min-h-40",
          done
            ? "bg-emerald-500/15 ring-1 ring-emerald-500/45"
            : muted
              ? "bg-kpanel/40 opacity-50 shadow-none ring-1 ring-kline/40"
              : "mat-obsidian hover:brightness-110", // Lumen §3.1 — was a flat bg-kpanel fill
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
        {step.kind === "together" && !done && (
          <span className="text-xs font-semibold text-ktext/70">🤝 Together</span>
        )}
        {step.reward_points > 0 && !done && (
          <span className="flex items-center gap-1 text-sm font-semibold text-beacon">
            <Star className="h-4 w-4 fill-beacon" /> {step.reward_points}
          </span>
        )}
        {done && (
          <span
            className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-kpanel"
            style={{ boxShadow: "0 0 18px -2px rgba(16,185,129,.85)" }} /* §10.5 — the checkmark emits light */
          >
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
