"use client";

import { useState } from "react";
import { Star, Check, Info, RotateCw, ShieldCheck } from "lucide-react";
import type { useKiosk } from "./useKiosk";
import type { KioskChild, KioskChore } from "@/lib/kiosk/types";
import { todayKey } from "@/lib/kiosk/db";
import { runsToday } from "@/lib/kiosk/calendar";
import { choreAssignee, isRotating } from "@/lib/kiosk/chores";
import { childColor } from "@/lib/kiosk/colors";
import { activeGroundingFor } from "@/lib/kiosk/grounding";
import { activeStreak } from "@/lib/kiosk/streak";
import { familyChoreProgress } from "@/lib/kiosk/childStatus";
import { StreakBadge } from "./StreakBadge";
import { chime, haptic, speak, cheer, HAPTIC } from "@/lib/kiosk/feedback";
import { scaleCount } from "@/lib/kiosk/motion";
import { Pressable } from "./Pressable";
import { readChildSettings } from "./ChildView";
import { ChildAvatar } from "./ChildAvatar";
import { BedtimeCountdown } from "./BedtimeCountdown";
import { Confetti } from "./Confetti";
import { ParentGate } from "./ParentGate";
import { KEyebrow } from "./ui";
import { cn } from "@/lib/cn";

type Kiosk = ReturnType<typeof useKiosk>;

/** Family chore board. `variant="home"` is the compact dashboard card (only kids
 *  who have chores today); `variant="full"` is the standalone Chores tab. */
export function ChoresBoard({
  kiosk,
  onSelectChild,
  variant = "home",
}: {
  kiosk: Kiosk;
  onSelectChild: (id: string) => void;
  variant?: "home" | "full";
}) {
  const { state } = kiosk;
  const [celebrate, setCelebrate] = useState<{ id: string; points: number; intensity: number; reducedMotion: boolean } | null>(null);
  const [approving, setApproving] = useState<{ child: KioskChild; chore: KioskChore } | null>(null);
  if (!state) return null;

  const snap = state.snapshot;
  const today = todayKey();
  const children = [...snap.children].sort((a, b) => a.sort_order - b.sort_order);
  const allChores = snap.chores ?? [];
  const validIds = new Set(children.map((c) => c.id));

  const choresFor = (childId: string) =>
    allChores
      .filter((c) => c.active && runsToday(c.days_of_week) && choreAssignee(c, validIds) === childId)
      .sort((a, b) => a.sort_order - b.sort_order);

  const completedToday = (childId: string) =>
    state.progress[childId]?.date === today ? state.progress[childId].completed : [];

  function doComplete(child: KioskChild, chore: KioskChore) {
    kiosk.completeChore(child.id, chore);
    const s = readChildSettings(child);
    chime(s.sound);
    haptic(HAPTIC.choreDone, s.haptics);
    speak(`${cheer()}! ${chore.title} done!`, s.readAloud);
    if (chore.points > 0) {
      setCelebrate({ id: chore.id, points: chore.points, intensity: s.intensity, reducedMotion: s.reducedMotion });
      setTimeout(() => setCelebrate(null), 1100);
    }
  }

  function tap(child: KioskChild, chore: KioskChore) {
    if (completedToday(child.id).includes(chore.id)) return;
    // Chores flagged "needs a grown-up's OK" require the parent PIN to check off,
    // so kids can't claim credit for things they didn't do. Only gate when a PIN
    // actually exists — otherwise verifyPin auto-passes, which would be a fake gate.
    if (chore.requires_approval && state?.pinHash) {
      setApproving({ child, chore });
      return;
    }
    doComplete(child, chore);
  }

  // Always show every child so each is tappable into their screen (routines +
  // chores), even on a day with no chores assigned.
  const rows = children.map((c) => ({ child: c, chores: choresFor(c.id) }));

  return (
    <div className="space-y-3">
      {rows.length === 0 && (
        <p className="rounded-xl bg-kpanel p-6 text-center text-kmute ring-1 ring-kline/55">
          No kids yet. A grown-up can add them in the Harbor app.
        </p>
      )}
      {rows.map(({ child, chores }) => {
        const done = completedToday(child.id);
        const doneCount = chores.filter((c) => done.includes(c.id)).length;
        const color = childColor(child);
        const allDone = chores.length > 0 && doneCount === chores.length;
        const reset = activeGroundingFor(snap.groundings, child.id);
        const corner = (snap.corners ?? []).find((c) => c.child_id === child.id && c.status === "active");
        const cs = readChildSettings(child);
        const bedtime = cs.bedtime;
        return (
          <div key={child.id} className="rounded-xl bg-kpanel p-4 shadow-k ring-1 ring-kline/55 transition hover:ring-kline">

            <div className="flex items-center gap-3">
              <button onClick={() => onSelectChild(child.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span
                  className="relative inline-flex shrink-0 items-center justify-center rounded-full p-[3px] transition-all"
                  style={
                    chores.length > 0
                      ? { background: `conic-gradient(${color} ${Math.round((doneCount / chores.length) * 360)}deg, rgba(255,255,255,0.09) 0deg)` }
                      : undefined
                  }
                >
                  <span className="rounded-full bg-kpanel p-[2px]">
                    <ChildAvatar child={child} size={variant === "full" ? 44 : 38} rounded="rounded-full" />
                  </span>
                  {allDone && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-kpanel">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-bold text-ktext">{child.name}</p>
                  <p className="text-sm text-kmute">
                    {chores.length === 0 ? (
                      "No chores today"
                    ) : (
                      <span className={allDone ? "font-medium text-emerald-300" : undefined}>
                        {allDone ? "All done" : `${doneCount} of ${chores.length} done`}
                      </span>
                    )}
                  </p>
                </div>
              </button>
              <div className="flex shrink-0 items-center gap-2">
                <StreakBadge count={activeStreak(state.streaks, child.id)} compact />
                <span className="flex items-center gap-1.5 text-beacon">
                  <Star className="h-4 w-4 fill-beacon" />
                  <span className="font-display text-base font-bold tabular-nums">{state.points[child.id] ?? 0}</span>
                </span>
              </div>
            </div>

            {bedtime && <BedtimeCountdown bedtime={bedtime} color={color} className="mt-2.5" />}

            {corner && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-violet-400/15 px-3 py-1 text-sm font-medium text-violet-200">
                💜 In Anchor
              </div>
            )}

            {reset && (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-amber-400/10 p-2.5">
                <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-sm font-semibold text-amber-200">
                  🌱 {reset.lastDay ? "Last day of reset" : `Reset · ${reset.daysLeft} ${reset.daysLeft === 1 ? "day" : "days"} left`}
                </span>
                {reset.g.pause_screen_time && (
                  <span className="rounded-full bg-kraise px-2.5 py-1 text-xs font-medium text-kmute ring-1 ring-kline/55">No screen time</span>
                )}
                {reset.g.pause_rewards && (
                  <span className="rounded-full bg-kraise px-2.5 py-1 text-xs font-medium text-kmute ring-1 ring-kline/55">No rewards store</span>
                )}
                {(reset.g.privileges_lost ?? []).map((p) => (
                  <span key={p} className="rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-medium text-amber-200 ring-1 ring-amber-400/30">
                    {p}
                  </span>
                ))}
                {(reset.g.reason || reset.g.note || (reset.g.privileges_lost ?? []).length > 0) && (
                  <button
                    onClick={() =>
                      speak(
                        `${reset.g.reason ? `This reset is about ${reset.g.reason}. ` : ""}${reset.g.note ?? ""}${
                          (reset.g.privileges_lost ?? []).length ? ` Paused for now: ${(reset.g.privileges_lost ?? []).join(", ")}.` : ""
                        }`.trim() || "Hang in there — you've got this.",
                      )
                    }
                    aria-label={`Why is ${child.name} on a reset?`}
                    className="kiosk-tap ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-kraise text-kmute ring-1 ring-kline/55"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {chores.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {chores.map((chore) => {
                  const isDone = done.includes(chore.id);
                  const celebrating = celebrate?.id === chore.id;
                  return (
                    <Pressable
                      key={chore.id}
                      haptics={cs.haptics}
                      onClick={() => tap(child, chore)}
                      disabled={isDone}
                      aria-label={`${chore.title}${isDone ? " (done)" : ""}`}
                      className={cn(
                        "kiosk-tap relative flex h-12 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-medium",
                        isDone ? "" : "bg-kraise text-ktext ring-1 ring-kline/55",
                        celebrating && "animate-pop",
                      )}
                      style={isDone ? { background: color, color: "#0c1014" } : undefined}
                    >
                      <span className="text-lg leading-none">{chore.icon ?? "✅"}</span>
                      <span className="whitespace-nowrap">{chore.title}</span>
                      {isRotating(chore) && !isDone && <RotateCw className="h-3.5 w-3.5 shrink-0 text-kmute" aria-label="rotates between kids" />}
                      {chore.requires_approval && !isDone && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-kmute" aria-label="needs a grown-up's OK" />}
                      {isDone && (
                        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-kpanel">
                          <Check className="h-2.5 w-2.5" strokeWidth={3} />
                        </span>
                      )}
                    </Pressable>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {celebrate && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center">
          {!celebrate.reducedMotion && <Confetti key={celebrate.id} count={scaleCount(20, celebrate.intensity)} spread={200} />}
          {celebrate.points > 0 && (
            <span className="animate-floatup font-display text-5xl font-bold text-beacon drop-shadow-[0_2px_12px_rgba(246,178,61,0.5)]">
              +{celebrate.points}
            </span>
          )}
        </div>
      )}

      {approving && (
        <ParentGate
          verify={kiosk.verifyPin}
          title="A grown-up's OK?"
          subtitle={`Enter your PIN to check off "${approving.chore.title}".`}
          onSuccess={() => {
            const a = approving;
            setApproving(null);
            doComplete(a.child, a.chore);
          }}
          onCancel={() => setApproving(null)}
        />
      )}
    </div>
  );
}

/** Full-screen Chores tab wrapper (header + the board). */
export function ChoresView({ kiosk, onSelectChild }: { kiosk: Kiosk; onSelectChild: (id: string) => void }) {
  return (
    <div className="animate-enter mx-auto w-full max-w-2xl px-5 pb-28 pt-6 sm:px-6 sm:pt-8">
      <header className="mb-5">
        <KEyebrow>Tap to check off</KEyebrow>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Chores</h1>
      </header>
      {kiosk.state &&
        (() => {
          const fp = familyChoreProgress(kiosk.state);
          if (fp.total === 0) return null;
          const allDone = fp.done === fp.total;
          return (
            <div className="mb-4 rounded-2xl bg-kpanel p-4 shadow-k ring-1 ring-kline/55">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-kmute">Family teamwork</span>
                <span className="font-display font-bold tabular-nums text-ktext">
                  {fp.done} <span className="text-kmute">of {fp.total}</span>
                </span>
              </div>
              <div className="mt-2.5 h-3 overflow-hidden rounded-full bg-kraise">
                <div className="h-full rounded-full bg-seafoam transition-all" style={{ width: `${fp.pct}%` }} />
              </div>
              <p className="mt-2 text-xs text-kmute">
                {allDone ? "The whole family did it! 🎉" : "Every chore helps the whole family."}
              </p>
            </div>
          );
        })()}
      <ChoresBoard kiosk={kiosk} onSelectChild={onSelectChild} variant="full" />
    </div>
  );
}
