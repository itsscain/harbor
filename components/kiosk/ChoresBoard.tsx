"use client";

import { useState } from "react";
import { Star, Check, Info } from "lucide-react";
import type { useKiosk } from "./useKiosk";
import type { KioskChild, KioskChore } from "@/lib/kiosk/types";
import { todayKey } from "@/lib/kiosk/db";
import { runsToday } from "@/lib/kiosk/calendar";
import { childColor } from "@/lib/kiosk/colors";
import { activeGroundingFor } from "@/lib/kiosk/grounding";
import { chime, haptic, speak } from "@/lib/kiosk/feedback";
import { readChildSettings } from "./ChildView";
import { ChildAvatar } from "./ChildAvatar";
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
  const [celebrate, setCelebrate] = useState<{ id: string; points: number } | null>(null);
  if (!state) return null;

  const snap = state.snapshot;
  const today = todayKey();
  const children = [...snap.children].sort((a, b) => a.sort_order - b.sort_order);
  const allChores = snap.chores ?? [];

  const choresFor = (childId: string) =>
    allChores
      .filter((c) => c.child_id === childId && c.active && runsToday(c.days_of_week))
      .sort((a, b) => a.sort_order - b.sort_order);

  const completedToday = (childId: string) =>
    state.progress[childId]?.date === today ? state.progress[childId].completed : [];

  function tap(child: KioskChild, chore: KioskChore) {
    const done = completedToday(child.id).includes(chore.id);
    if (done) return;
    kiosk.completeChore(child.id, chore);
    const s = readChildSettings(child);
    chime(s.sound);
    haptic(20, s.haptics);
    speak(`${chore.title}. Done!`, s.readAloud);
    if (chore.points > 0) {
      setCelebrate({ id: chore.id, points: chore.points });
      setTimeout(() => setCelebrate(null), 1100);
    }
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
        return (
          <div key={child.id} className="rounded-xl bg-kpanel p-4 ring-1 ring-kline/55">
            <div className="flex items-center gap-3">
              <button onClick={() => onSelectChild(child.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <ChildAvatar child={child} size={variant === "full" ? 44 : 38} />
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
              <span className="flex shrink-0 items-center gap-1.5 text-beacon">
                <Star className="h-4 w-4 fill-beacon" />
                <span className="font-display text-base font-bold tabular-nums">{state.points[child.id] ?? 0}</span>
              </span>
            </div>

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
                {(reset.g.reason || reset.g.note) && (
                  <button
                    onClick={() =>
                      speak(
                        `${reset.g.reason ? `This reset is about ${reset.g.reason}. ` : ""}${reset.g.note ?? ""}`.trim() ||
                          "Hang in there — you've got this.",
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
                    <button
                      key={chore.id}
                      onClick={() => tap(child, chore)}
                      disabled={isDone}
                      aria-label={`${chore.title}${isDone ? " (done)" : ""}`}
                      className={cn(
                        "kiosk-tap relative flex h-12 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-medium transition active:scale-95",
                        isDone ? "" : "bg-kraise text-ktext ring-1 ring-kline/55",
                        celebrating && "animate-pop",
                      )}
                      style={isDone ? { background: color, color: "#0c1014" } : undefined}
                    >
                      <span className="text-lg leading-none">{chore.icon ?? "✅"}</span>
                      <span className="whitespace-nowrap">{chore.title}</span>
                      {isDone && (
                        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-kpanel">
                          <Check className="h-2.5 w-2.5" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
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
      <ChoresBoard kiosk={kiosk} onSelectChild={onSelectChild} variant="full" />
    </div>
  );
}
