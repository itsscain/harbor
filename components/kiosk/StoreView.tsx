"use client";

import { useRef, useState } from "react";
import { Star, X, Check } from "lucide-react";
import type { useKiosk } from "./useKiosk";
import type { KioskStoreItem } from "@/lib/kiosk/types";
import { activeGroundingFor } from "@/lib/kiosk/grounding";
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
  const [redeemed, setRedeemed] = useState<KioskStoreItem | null>(null);
  const redeeming = useRef<Set<string>>(new Set());
  if (!state) return null;

  const points = state.points[childId] ?? 0;
  const reset = activeGroundingFor(state.snapshot.groundings, childId);
  const storePaused = !!reset?.g.pause_rewards;
  const items = (state.snapshot.store_items ?? [])
    .filter((s) => s.enabled && (s.child_id === null || s.child_id === childId))
    .sort((a, b) => a.sort_order - b.sort_order);

  function buy(item: KioskStoreItem) {
    if (item.kind === "goal") return;
    if (item.cost_points > points) return;
    if (redeeming.current.has(item.id)) return; // double-tap guard — never spend twice
    redeeming.current.add(item.id);
    setTimeout(() => redeeming.current.delete(item.id), 2200);
    kiosk.redeemStoreItem(childId, item);
    chime(settings.sound);
    haptic([20, 40, 20], settings.haptics);
    speak(`You got ${item.label}!`, settings.readAloud);
    setBought(item.id);
    setTimeout(() => setBought(null), 1600);
    setRedeemed(item);
    setTimeout(() => setRedeemed(null), 2200);
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-kbg text-ktext">
      <div className="flex items-center justify-between p-5">
        <span className="font-display text-xl font-bold">Reward Store</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full bg-kraise px-4 py-2">
            <Star className="h-5 w-5 fill-beacon text-beacon" />
            <span className="font-display text-lg font-extrabold tabular-nums">{points}</span>
          </span>
          <button onClick={onClose} className="kiosk-tap rounded-full bg-kraise p-3" aria-label="Close store">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {storePaused && reset ? (
          <div className="mx-auto mt-10 max-w-md rounded-3xl border border-amber-400/30 bg-amber-400/10 p-8 text-center">
            <span className="text-5xl">🌱</span>
            <p className="mt-4 font-display text-2xl font-extrabold text-amber-200">The store is taking a short break</p>
            <p className="mt-2 text-kmute">
              {reset.lastDay
                ? "Back tomorrow — you're almost done!"
                : `Back in ${reset.daysLeft} days. Finish your routines — you've got this.`}
            </p>
          </div>
        ) : items.length === 0 ? (
          <p className="mt-10 text-center text-kmute">
            No rewards yet. A grown-up can add some in the Harbor app.
          </p>
        ) : (
          <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
            {items.map((item) => {
              const affordable = points >= item.cost_points;
              const isGoal = item.kind === "goal";
              const pct = Math.min(100, item.cost_points ? (points / item.cost_points) * 100 : 100);
              return (
                <div key={item.id} className="rounded-3xl bg-kpanel ring-1 ring-kline p-5">
                  <div className="flex items-center gap-4">
                    <span className="text-5xl">{item.emoji ?? "🎁"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-xl font-bold">{item.label}</p>
                      <p className="flex items-center gap-1 text-kmute">
                        <Star className="h-4 w-4 fill-beacon text-beacon" /> {item.cost_points}
                        {isGoal && <span className="ml-1">goal</span>}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-kraise">
                    <div className="h-full rounded-full bg-beacon transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  {!isGoal && (
                    <button
                      onClick={() => buy(item)}
                      disabled={!affordable || bought === item.id}
                      className={cn(
                        "kiosk-tap mt-4 w-full rounded-2xl py-4 text-lg font-bold transition active:scale-[0.98]",
                        bought === item.id
                          ? "bg-emerald-500 text-white"
                          : affordable
                            ? "bg-beacon text-harbor"
                            : "bg-kpanel ring-1 ring-kline text-kmute",
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
                    <p className="mt-3 text-center text-sm text-kmute">
                      {affordable ? "Goal reached! 🎉" : `${item.cost_points - points} stars to go`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {redeemed && (
        <button
          onClick={() => setRedeemed(null)}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-kbg2/97 px-6 text-center backdrop-blur-sm"
          aria-label="Continue"
        >
          <span className="absolute inset-x-0 top-1/4 mx-auto h-72 w-72 beacon-ring" aria-hidden />
          <span className="animate-pop relative text-8xl">{redeemed.emoji ?? "🎁"}</span>
          <p className="relative mt-4 font-display text-4xl font-extrabold sm:text-5xl">You got it!</p>
          <p className="relative mt-2 text-xl text-kmute">{redeemed.label}</p>
          <p className="relative mt-10 text-sm text-kmute/70">Tap to keep going</p>
        </button>
      )}
    </div>
  );
}
