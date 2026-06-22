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
} from "lucide-react";
import type { useKiosk } from "./useKiosk";
import type { KioskChild, KioskStep } from "@/lib/kiosk/types";
import { todayKey } from "@/lib/kiosk/db";
import { runsToday } from "@/lib/kiosk/calendar";
import { childColor } from "@/lib/kiosk/colors";
import { activeGroundingFor } from "@/lib/kiosk/grounding";
import { speak, chime, haptic } from "@/lib/kiosk/feedback";
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
  };
}

const THEME_BG: Record<string, string> = {
  harbor: "bg-harbor",
  water: "bg-water",
  beacon: "bg-[#b9852a]",
  seafoam: "bg-[#2f8f86]",
};

export function ChildView({
  kiosk,
  childId,
  onHome,
  onOpenCalm,
}: {
  kiosk: Kiosk;
  childId: string;
  onHome: () => void;
  onOpenCalm: () => void;
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

  const [celebrate, setCelebrate] = useState<{ points: number } | null>(null);
  const [bigCelebrate, setBigCelebrate] = useState(false);
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

  if (!state || !child || !settings) return null;

  const today = todayKey();
  const prog =
    state.progress[child.id]?.date === today ? state.progress[child.id].completed : [];
  const points = state.points[child.id] ?? 0;
  const grounding = activeGroundingFor(state.snapshot.groundings, child.id);

  function complete(step: KioskStep) {
    if (prog.includes(step.id)) return;
    kiosk.completeStep(child!.id, step);
    chime(settings!.sound);
    haptic(20, settings!.haptics);
    speak(`${step.label}. Done!`, settings!.readAloud);
    if (step.reward_points > 0) {
      setCelebrate({ points: step.reward_points });
      setTimeout(() => setCelebrate(null), 1300);
    }
    // Does this tap finish the whole routine? → the big celebration moment.
    const finishes = isFirstThen
      ? !!thenStep && step.id === thenStep.id
      : scheduleSteps.length > 0 && scheduleSteps.every((s) => s.id === step.id || prog.includes(s.id));
    if (finishes) {
      setBigCelebrate(true);
      chime(settings!.sound);
      haptic(60, settings!.haptics);
      speak(`Amazing! You finished ${activeRoutine?.name ?? "your routine"}, ${child!.name}!`, settings!.readAloud);
      setTimeout(() => setBigCelebrate(false), 4200);
    }
  }

  const scheduleSteps = steps.filter((s) => s.step_type === "task");
  const firstStep = steps.find((s) => s.step_type === "first");
  const thenStep = steps.find((s) => s.step_type === "then");
  const doneCount = scheduleSteps.filter((s) => prog.includes(s.id)).length;
  const isFirstThen = activeRoutine?.type === "first_then";
  const allDone = isFirstThen
    ? !!thenStep && prog.includes(thenStep.id)
    : scheduleSteps.length > 0 && doneCount === scheduleSteps.length;
  const headerBg = THEME_BG[settings.theme] ?? THEME_BG.harbor;

  return (
    <div className="flex min-h-dvh flex-col bg-kbg text-ktext">
      {/* Header */}
      <header
        className={cn("flex items-center justify-between gap-3 border-b-4 px-4 py-3 text-white", headerBg)}
        style={{ borderBottomColor: childColor(child) }}
      >
        <button
          onClick={onHome}
          className="kiosk-tap flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 font-semibold"
        >
          <HomeIcon className="h-5 w-5" /> Home
        </button>
        <button
          onClick={() => speak(`${child.name}'s ${activeRoutine?.name ?? "day"}`, settings.readAloud)}
          className="flex items-center gap-2.5"
        >
          <ChildAvatar child={child} size={36} />
          <span className="font-display text-xl font-bold">{child.name}</span>
        </button>
        <div className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-2">
          <Star className="h-5 w-5 fill-beacon text-beacon" />
          <span
            key={points}
            className={cn("font-display text-lg font-bold tabular-nums", !settings.reducedMotion && "animate-pop")}
          >
            {points}
          </span>
        </div>
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
        {grounding && (
          <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => speak(grounding.lastDay ? "Last day of your reset. Finish strong!" : `You have ${grounding.daysLeft} days left on your reset. ${grounding.g.note ?? ""}`)}
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
          </div>
        )}
        {activeRoutine ? (
          <>
            <NowNext steps={steps} sound={settings.sound} readAloud={settings.readAloud} />

            <div className="mb-3 flex items-center justify-between">
              <h1 className="font-display text-2xl font-bold text-ktext">
                {activeRoutine.name}
              </h1>
              {scheduleSteps.length > 0 && (
                <span className="text-sm font-semibold text-kmute">
                  {doneCount} / {scheduleSteps.length} done
                </span>
              )}
            </div>

            {scheduleSteps.length > 0 && (
              <div className="mb-4 h-3 overflow-hidden rounded-full bg-kraise">
                <div
                  className="h-full rounded-full bg-beacon transition-all"
                  style={{ width: `${(doneCount / scheduleSteps.length) * 100}%` }}
                />
              </div>
            )}

            {allDone && (
              <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/15 p-4 text-center font-display text-xl font-bold text-emerald-300">
                🎉 All done! Great job, {child.name}!
              </div>
            )}

            {activeRoutine.type === "first_then" && firstStep && thenStep ? (
              <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
                <StepCard step={firstStep} label="First" done={prog.includes(firstStep.id)} reducedMotion={settings.reducedMotion} onTap={() => complete(firstStep)} onSpeak={() => speak(firstStep.label, settings.readAloud)} big />
                <ArrowRight className="mx-auto h-10 w-10 rotate-90 text-kmute sm:rotate-0" />
                <StepCard step={thenStep} label="Then" done={prog.includes(thenStep.id)} reducedMotion={settings.reducedMotion} onTap={() => { if (prog.includes(firstStep.id)) complete(thenStep); }} onSpeak={() => speak(thenStep.label, settings.readAloud)} big muted={!prog.includes(firstStep.id)} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {scheduleSteps.map((s) => (
                  <StepCard
                    key={s.id}
                    step={s}
                    done={prog.includes(s.id)}
                    reducedMotion={settings.reducedMotion}
                    onTap={() => complete(s)}
                    onSpeak={() => speak(s.label, settings.readAloud)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-kline bg-kpanel p-10 text-center shadow-k">
            <span className="text-5xl">🗓️</span>
            <h3 className="mt-3 font-display text-xl font-bold text-ktext">No routines yet for {child.name}</h3>
            <p className="mt-1.5 max-w-sm text-kmute">
              A grown-up can add a Morning, Bedtime, or First-Then routine from the Harbor app — templates make it one tap.
            </p>
          </div>
        )}
      </main>

      {/* Footer actions */}
      <footer className="grid grid-cols-3 gap-3 border-t border-kline/50 bg-kbg2/80 p-4 backdrop-blur">
        <button
          onClick={() => setStoreOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-kraise py-3.5 text-base font-medium text-ktext ring-1 ring-kline/55 transition hover:brightness-125 active:scale-[0.98]"
        >
          <Gift className="h-5 w-5 text-beacon" /> Store
        </button>
        <button
          onClick={() => setTimerOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-kraise py-3.5 text-base font-medium text-ktext ring-1 ring-kline/55 transition hover:brightness-125 active:scale-[0.98]"
        >
          <TimerIcon className="h-5 w-5 text-kwater" /> Timer
        </button>
        <button
          onClick={onOpenCalm}
          className="flex items-center justify-center gap-2 rounded-xl bg-beacon py-3.5 text-base font-semibold text-harbor transition hover:brightness-105 active:scale-[0.98]"
        >
          <Heart className="h-5 w-5" /> Calm
        </button>
      </footer>

      {celebrate && (
        <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
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
  label,
  big = false,
  muted = false,
}: {
  step: KioskStep;
  done: boolean;
  onTap: () => void;
  onSpeak: () => void;
  reducedMotion: boolean;
  label?: string;
  big?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center gap-2 rounded-xl p-4 text-center shadow-k ring-1 transition",
        big ? "min-h-44" : "min-h-32",
        done
          ? "bg-emerald-500/15 ring-emerald-500/40"
          : muted
            ? "bg-kpanel/40 opacity-50 shadow-none ring-kline/40"
            : "bg-kpanel ring-kline/55",
      )}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSpeak();
        }}
        className="kiosk-tap absolute left-2 top-2 rounded-full p-2 text-kmute hover:bg-kraise"
        aria-label={`Read ${step.label} aloud`}
      >
        <Volume2 className="h-5 w-5" />
      </button>

      <button
        onClick={onTap}
        disabled={done || muted}
        className={cn(
          "kiosk-tap flex flex-1 flex-col items-center justify-center gap-2 active:scale-95",
          !reducedMotion && "transition",
        )}
      >
        {label && (
          <span className="absolute right-3 top-3 rounded-full bg-kraise px-2 py-0.5 text-xs font-bold uppercase text-kmute">
            {label}
          </span>
        )}
        <span className={cn(big ? "text-6xl" : "text-5xl")}>{step.icon ?? "✅"}</span>
        <span className={cn("font-display font-bold text-ktext", big ? "text-xl" : "text-lg")}>
          {step.label}
        </span>
        {step.reward_points > 0 && !done && (
          <span className="flex items-center gap-1 text-sm font-semibold text-beacon">
            <Star className="h-4 w-4 fill-beacon" /> {step.reward_points}
          </span>
        )}
      </button>

      {done && (
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-sm font-bold text-white">
          <Check className="h-4 w-4" /> Done
        </span>
      )}
    </div>
  );
}
