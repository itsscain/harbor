"use client";

import { useMemo, useState } from "react";
import {
  Star,
  Lock,
  Timer as TimerIcon,
  Heart,
  Check,
  RotateCcw,
  RefreshCw,
  LogOut,
  Gift,
  Wifi,
  WifiOff,
  ArrowRight,
} from "lucide-react";
import type { useKiosk } from "./useKiosk";
import type { KioskStep } from "@/lib/kiosk/types";
import { todayKey } from "@/lib/kiosk/db";
import { CalmCorner } from "./CalmCorner";
import { ParentGate } from "./ParentGate";
import { TransitionTimer } from "./TransitionTimer";
import { cn } from "@/lib/cn";

type Kiosk = ReturnType<typeof useKiosk>;

export function KidShell({ kiosk }: { kiosk: Kiosk }) {
  const { state, online } = kiosk;
  const children = useMemo(
    () => [...(state?.snapshot.children ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [state],
  );
  const [childId, setChildId] = useState(children[0]?.id ?? "");
  const activeChild = children.find((c) => c.id === childId) ?? children[0];

  const [calmOpen, setCalmOpen] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [gate, setGate] = useState(false);
  const [parentMenu, setParentMenu] = useState(false);
  const [celebrate, setCelebrate] = useState<{ points: number } | null>(null);

  const routines = useMemo(() => {
    if (!state || !activeChild) return [];
    return state.snapshot.routines
      .filter((r) => r.child_id === activeChild.id && r.active)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [state, activeChild]);

  const [routineId, setRoutineId] = useState<string | null>(null);
  const activeRoutine = routines.find((r) => r.id === routineId) ?? routines[0];

  const steps = useMemo(() => {
    if (!state || !activeRoutine) return [];
    return state.snapshot.steps
      .filter((s) => s.routine_id === activeRoutine.id)
      .sort((a, b) => a.order_index - b.order_index);
  }, [state, activeRoutine]);

  if (!state || !activeChild) return null;

  const today = todayKey();
  const prog =
    state.progress[activeChild.id]?.date === today
      ? state.progress[activeChild.id].completed
      : [];
  const points = state.points[activeChild.id] ?? 0;

  function doComplete(step: KioskStep) {
    if (prog.includes(step.id)) return;
    kiosk.completeStep(activeChild.id, step);
    if (step.reward_points > 0) {
      setCelebrate({ points: step.reward_points });
      setTimeout(() => setCelebrate(null), 1300);
    }
  }

  const scheduleSteps = steps.filter((s) => s.step_type === "task");
  const firstStep = steps.find((s) => s.step_type === "first");
  const thenStep = steps.find((s) => s.step_type === "then");
  const doneCount = scheduleSteps.filter((s) => prog.includes(s.id)).length;
  const allDone = scheduleSteps.length > 0 && doneCount === scheduleSteps.length;

  return (
    <div className="flex min-h-screen flex-col bg-seafog">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-3 border-b border-harbor-100 bg-white px-4 py-3">
        {/* Child switcher */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setChildId(c.id);
                setRoutineId(null);
              }}
              className={cn(
                "kiosk-tap flex items-center gap-2 rounded-2xl px-3 py-2 transition",
                c.id === activeChild.id
                  ? "bg-harbor text-white"
                  : "bg-harbor-50 text-harbor",
              )}
            >
              <span className="text-2xl">{c.avatar ?? "🙂"}</span>
              <span className="font-display text-lg font-bold">{c.name}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-beacon-soft px-3 py-2">
            <Star className="h-5 w-5 fill-beacon text-beacon" />
            <span className="font-display text-lg font-extrabold text-harbor tabular-nums">
              {points}
            </span>
          </div>
          <span title={online ? "Online" : "Offline — still working"}>
            {online ? (
              <Wifi className="h-5 w-5 text-emerald-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-muted" />
            )}
          </span>
          <button
            onClick={() => setGate(true)}
            className="kiosk-tap rounded-full bg-harbor-50 p-2.5 text-harbor"
            aria-label="Parent menu"
          >
            <Lock className="h-5 w-5" />
          </button>
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
                "kiosk-tap whitespace-nowrap rounded-full px-4 py-2 font-semibold",
                r.id === activeRoutine?.id
                  ? "bg-water text-white"
                  : "bg-white text-harbor",
              )}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}

      {/* Main */}
      <main className="flex-1 p-4 sm:p-6">
        {activeRoutine ? (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h1 className="font-display text-2xl font-extrabold text-harbor">
                {activeRoutine.name}
              </h1>
              {scheduleSteps.length > 0 && (
                <span className="text-sm font-semibold text-muted">
                  {doneCount} / {scheduleSteps.length} done
                </span>
              )}
            </div>

            {scheduleSteps.length > 0 && (
              <div className="mb-4 h-3 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-beacon transition-all"
                  style={{ width: `${(doneCount / scheduleSteps.length) * 100}%` }}
                />
              </div>
            )}

            {allDone && (
              <div className="mb-4 rounded-2xl bg-emerald-50 p-4 text-center font-display text-xl font-bold text-emerald-700">
                🎉 All done with {activeRoutine.name}! Great job!
              </div>
            )}

            {/* First-then board */}
            {activeRoutine.type === "first_then" && firstStep && thenStep ? (
              <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
                <StepCard
                  step={firstStep}
                  label="First"
                  done={prog.includes(firstStep.id)}
                  onTap={() => doComplete(firstStep)}
                  big
                />
                <ArrowRight className="mx-auto h-10 w-10 rotate-90 text-muted sm:rotate-0" />
                <StepCard
                  step={thenStep}
                  label="Then"
                  done={prog.includes(firstStep.id)}
                  onTap={() => {}}
                  big
                  muted={!prog.includes(firstStep.id)}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {scheduleSteps.map((s) => (
                  <StepCard
                    key={s.id}
                    step={s}
                    done={prog.includes(s.id)}
                    onTap={() => doComplete(s)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-center text-muted">
            <p>No routines yet for {activeChild.name}. A grown-up can add some in the Harbor app.</p>
          </div>
        )}
      </main>

      {/* Bottom actions */}
      <footer className="grid grid-cols-2 gap-3 border-t border-harbor-100 bg-white p-4">
        <button
          onClick={() => setTimerOpen(true)}
          className="kiosk-tap flex items-center justify-center gap-2 rounded-2xl bg-water py-5 text-lg font-bold text-white active:scale-[0.98]"
        >
          <TimerIcon className="h-6 w-6" /> Timer
        </button>
        <button
          onClick={() => setCalmOpen(true)}
          className="kiosk-tap flex items-center justify-center gap-2 rounded-2xl bg-beacon py-5 text-lg font-bold text-harbor active:scale-[0.98]"
        >
          <Heart className="h-6 w-6" /> Calm Corner
        </button>
      </footer>

      {/* Overlays */}
      {celebrate && (
        <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
          <div className="animate-reward rounded-full bg-beacon px-10 py-8 text-center shadow-2xl">
            <Star className="mx-auto h-12 w-12 fill-harbor text-harbor" />
            <p className="mt-1 font-display text-3xl font-extrabold text-harbor">
              +{celebrate.points}
            </p>
          </div>
        </div>
      )}

      {calmOpen && (
        <CalmCorner
          tools={state.snapshot.calm_tools}
          onCheckIn={(f) => kiosk.checkIn(activeChild.id, f)}
          onClose={() => setCalmOpen(false)}
        />
      )}

      {timerOpen && (
        <TransitionTimer seconds={120} label="Transition time" onClose={() => setTimerOpen(false)} />
      )}

      {gate && (
        <ParentGate
          verify={kiosk.verifyPin}
          onSuccess={() => {
            setGate(false);
            setParentMenu(true);
          }}
          onCancel={() => setGate(false)}
        />
      )}

      {parentMenu && (
        <ParentMenu
          kiosk={kiosk}
          childId={activeChild.id}
          childName={activeChild.name}
          points={points}
          onClose={() => setParentMenu(false)}
        />
      )}
    </div>
  );
}

function StepCard({
  step,
  done,
  onTap,
  label,
  big = false,
  muted = false,
}: {
  step: KioskStep;
  done: boolean;
  onTap: () => void;
  label?: string;
  big?: boolean;
  muted?: boolean;
}) {
  return (
    <button
      onClick={onTap}
      disabled={done || muted}
      className={cn(
        "kiosk-tap relative flex flex-col items-center justify-center gap-2 rounded-3xl border-2 p-4 text-center transition active:scale-95",
        big ? "min-h-52" : "min-h-36",
        done
          ? "border-emerald-300 bg-emerald-50"
          : muted
            ? "border-harbor-100 bg-white/50 opacity-50"
            : "border-harbor-100 bg-white",
      )}
    >
      {label && (
        <span className="absolute left-3 top-3 rounded-full bg-harbor-50 px-2 py-0.5 text-xs font-bold uppercase text-harbor">
          {label}
        </span>
      )}
      <span className={cn(big ? "text-7xl" : "text-5xl")}>{step.icon ?? "✅"}</span>
      <span className={cn("font-display font-bold text-ink", big ? "text-2xl" : "text-lg")}>
        {step.label}
      </span>
      {step.reward_points > 0 && !done && (
        <span className="flex items-center gap-1 text-sm font-semibold text-beacon">
          <Star className="h-4 w-4 fill-beacon" /> {step.reward_points}
        </span>
      )}
      {done && (
        <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white">
          <Check className="h-5 w-5" />
        </span>
      )}
    </button>
  );
}

function ParentMenu({
  kiosk,
  childId,
  childName,
  points,
  onClose,
}: {
  kiosk: Kiosk;
  childId: string;
  childName: string;
  points: number;
  onClose: () => void;
}) {
  const [confirmUnpair, setConfirmUnpair] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 sm:rounded-3xl">
        <h2 className="font-display text-xl font-extrabold text-harbor">
          Parent menu
        </h2>
        <p className="mt-1 text-sm text-muted">
          {childName} · {points} points
        </p>

        <div className="mt-5 space-y-2">
          <MenuRow
            icon={RotateCcw}
            label="Reset today's checkmarks"
            onClick={() => kiosk.resetDay(childId)}
          />
          <MenuRow
            icon={Gift}
            label="Redeem 10 points"
            disabled={points < 10}
            onClick={() => kiosk.redeem(childId, 10, "reward")}
          />
          <MenuRow
            icon={Gift}
            label="Redeem 25 points"
            disabled={points < 25}
            onClick={() => kiosk.redeem(childId, 25, "reward")}
          />
          <MenuRow icon={RefreshCw} label="Sync now" onClick={() => void kiosk.syncNow()} />
          {!confirmUnpair ? (
            <MenuRow
              icon={LogOut}
              label="Unpair this device"
              danger
              onClick={() => setConfirmUnpair(true)}
            />
          ) : (
            <button
              onClick={() => void kiosk.unpair()}
              className="kiosk-tap w-full rounded-2xl bg-red-600 py-4 font-bold text-white"
            >
              Tap again to confirm unpair
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className="kiosk-tap mt-5 w-full rounded-2xl bg-harbor py-4 font-bold text-white"
        >
          Done
        </button>
      </div>
    </div>
  );
}

function MenuRow({
  icon: Icon,
  label,
  onClick,
  danger = false,
  disabled = false,
}: {
  icon: typeof Star;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "kiosk-tap flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left font-semibold transition disabled:opacity-40",
        danger ? "bg-red-50 text-red-700" : "bg-harbor-50 text-harbor",
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}
