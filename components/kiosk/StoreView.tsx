"use client";

import { useState } from "react";
import { Star, X, Check } from "lucide-react";
import type { useKiosk } from "./useKiosk";
import type { KioskStoreItem } from "@/lib/kiosk/types";
import { chime, haptic, speak } from "@/lib/kiosk/feedback";
import { cn } from "@/lib/cn";

type Kiosk = ReturnType<typeof useKiosk>;
type Settings = { sound: boolean; haptics: boolean; readAloud: boolean };

export function StoreView({
  kiosk,
  childId,
  settings,
  onClose,
}: {
  kiosk: Kiosk;
  childId: string;
  settings: Settings;
  onClose: () => void;
}) {
  const { state } = kiosk;
  const [bought, setBought] = useState<string | null>(null);
  if (!state) return null;

  const points = state.points[childId] ?? 0;
  const items = (state.snapshot.store_items ?? [])
    .filter((s) => s.enabled && (s.child_id === null || s.child_id === childId))
    .sort((a, b) => a.sort_order - b.sort_order);

  function buy(item: KioskStoreItem) {
    if (item.kind === "goal") return;
    if (item.cost_points > points) return;
    kiosk.redeemStoreItem(childId, item);
    chime(settings.sound);
    haptic([20, 40, 20], settings.haptics);
    speak(`You got ${item.label}!`, settings.readAloud);
    setBought(item.id);
    setTimeout(() => setBought(null), 1600);
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-gradient-to-b from-[#10454f] to-harbor text-white">
      <div className="flex items-center justify-between p-5">
        <span className="font-display text-xl font-bold">Reward Store</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2">
            <Star className="h-5 w-5 fill-beacon text-beacon" />
            <span className="font-display text-lg font-extrabold tabular-nums">{points}</span>
          </span>
          <button onClick={onClose} className="kiosk-tap rounded-full bg-white/15 p-3" aria-label="Close store">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {items.length === 0 ? (
          <p className="mt-10 text-center text-seafoam">
            No rewards yet. A grown-up can add some in the Harbor app.
          </p>
        ) : (
          <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
            {items.map((item) => {
              const affordable = points >= item.cost_points;
              const isGoal = item.kind === "goal";
              const pct = Math.min(100, item.cost_points ? (points / item.cost_points) * 100 : 100);
              return (
                <div key={item.id} className="rounded-3xl bg-white/10 p-5">
                  <div className="flex items-center gap-4">
                    <span className="text-5xl">{item.emoji ?? "🎁"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-xl font-bold">{item.label}</p>
                      <p className="flex items-center gap-1 text-seafoam">
                        <Star className="h-4 w-4 fill-beacon text-beacon" /> {item.cost_points}
                        {isGoal && <span className="ml-1">goal</span>}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/15">
                    <div className="h-full rounded-full bg-beacon transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  {!isGoal && (
                    <button
                      onClick={() => buy(item)}
                      disabled={!affordable}
                      className={cn(
                        "kiosk-tap mt-4 w-full rounded-2xl py-4 text-lg font-bold transition active:scale-[0.98]",
                        bought === item.id
                          ? "bg-emerald-500 text-white"
                          : affordable
                            ? "bg-beacon text-harbor"
                            : "bg-white/10 text-seafoam",
                      )}
                    >
                      {bought === item.id ? (
                        <span className="inline-flex items-center gap-2">
                          <Check className="h-5 w-5" /> Enjoy!
                        </span>
                      ) : affordable ? (
                        "Get it"
                      ) : (
                        `${item.cost_points - points} more stars`
                      )}
                    </button>
                  )}
                  {isGoal && (
                    <p className="mt-3 text-center text-sm text-seafoam">
                      {affordable ? "Goal reached! 🎉" : `${item.cost_points - points} stars to go`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
