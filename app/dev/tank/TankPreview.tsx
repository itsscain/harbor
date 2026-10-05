"use client";

import { useState } from "react";
import { CREATURES } from "@/lib/learn/reef";
import { CreatureView } from "@/components/kiosk/learn/tank/CreatureView";

export function TankPreview({ stage, big, only }: { stage: number; big: boolean; only: string[] | null }) {
  const [react, setReact] = useState<Record<string, number>>({});
  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#3cc4ee] to-[#0b5fa5] p-6">
      <div className={big ? "grid grid-cols-3 gap-4" : "grid grid-cols-4 gap-4 lg:grid-cols-7"}>
        {CREATURES.filter((c) => !only || only.includes(c.id)).map((c) => (
          <button key={c.id} type="button" onClick={() => setReact((r) => ({ ...r, [c.id]: (r[c.id] ?? 0) + 1 }))} className="flex flex-col items-center rounded-3xl bg-white/15 p-2 text-white">
            <CreatureView id={c.id} size={big ? 380 : 160} stage={stage} royal={stage === 3} react={react[c.id] ?? 0} />
            <span className="font-display text-sm font-extrabold">{c.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
