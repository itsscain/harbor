"use client";

import { cn } from "@/lib/cn";

export type FamilyGoalConfig = { label: string; emoji?: string; target: number; reward?: string | null };

/** Family Goal (§9.2.9) — a cooperative jar the whole family's stars fill together.
 *  On-brand with the cooperative reframe (no leaderboard); progress is the kids'
 *  combined points. Celebrates when reached. */
export function FamilyGoal({
  goal,
  current,
  reducedMotion = false,
}: {
  goal: FamilyGoalConfig;
  current: number;
  reducedMotion?: boolean;
}) {
  const pct = goal.target > 0 ? Math.min(100, Math.round((current / goal.target) * 100)) : 0;
  const done = current >= goal.target;

  return (
    <div className="rounded-2xl bg-kpanel p-4 shadow-k ring-1 ring-kline/55">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl leading-none">{goal.emoji || "🎉"}</span>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-bold text-ktext">Family goal: {goal.label}</p>
            <p className="text-sm text-kmute">
              {done ? "We did it — together! 🎉" : `${current} of ${goal.target} stars · everyone helps`}
            </p>
          </div>
        </div>
        {goal.reward && (
          <span className="shrink-0 rounded-full bg-beacon/15 px-3 py-1 text-sm font-semibold text-beacon">🎁 {goal.reward}</span>
        )}
      </div>
      <div className="mt-3 h-4 overflow-hidden rounded-full bg-kraise ring-1 ring-kline/40">
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r from-beacon to-amber-300",
            !reducedMotion && "transition-all duration-700",
            done && !reducedMotion && "k-glow",
          )}
          style={{ width: `${Math.max(pct, current > 0 ? 4 : 0)}%` }}
        />
      </div>
    </div>
  );
}
