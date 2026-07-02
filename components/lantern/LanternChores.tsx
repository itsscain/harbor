"use client";

import { useState } from "react";
import { ChevronLeft, Star, Check, ShieldCheck } from "lucide-react";
import type { useKiosk } from "@/components/kiosk/useKiosk";
import type { KioskChore } from "@/lib/kiosk/types";
import { ParentGate } from "@/components/kiosk/ParentGate";
import { Pressable } from "@/components/kiosk/Pressable";
import { tzOf } from "@/lib/kiosk/time";
import { feedback, cheer } from "@/lib/kiosk/feedback";
import { childChoresToday, doneToday, childSettings } from "@/lib/lantern/day";
import { cn } from "@/lib/cn";

type Kiosk = ReturnType<typeof useKiosk>;

/** The Lantern chores grid (§4) — big, light, pastel cards; a grown-up's OK gates the ones
 *  the parent flagged. Health/self-care chores carry no stars by the parent's choice. */
export function LanternChores({ kiosk, childId, onBack }: { kiosk: Kiosk; childId: string; onBack: () => void }) {
  const { state } = kiosk;
  const [approving, setApproving] = useState<KioskChore | null>(null);
  const child = state?.snapshot.children.find((c) => c.id === childId);
  if (!state || !child) return null;

  const settings = childSettings(child);
  const tz = tzOf(state);
  const chores = childChoresToday(state, childId, tz);
  const done = doneToday(state, childId);
  const fx = { sound: settings.sound, haptics: settings.haptics, intensity: settings.intensity };
  const doneCount = chores.filter((c) => done.includes(c.id)).length;

  function doDone(ch: KioskChore) {
    kiosk.completeChore(child!.id, ch);
    feedback("chore-complete", { ...fx, say: settings.readAloud ? cheer() : undefined });
  }
  function tap(ch: KioskChore) {
    if (done.includes(ch.id)) return;
    if (ch.requires_approval && kiosk.state?.pinHash) {
      setApproving(ch);
      return;
    }
    doDone(ch);
  }

  return (
    <div className="min-h-dvh px-4 py-4 text-harbor sm:px-6" style={{ background: `radial-gradient(130% 72% at 50% -10%, #fbeaf022, #fbfdfc 60%)` }}>
      <header className="flex items-center justify-between gap-3">
        <Pressable
          haptics={settings.haptics}
          sound={settings.sound}
          intensity={settings.intensity}
          fx="back"
          onClick={onBack}
          className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-harbor shadow-sm ring-1 ring-harbor-100"
          aria-label="Back home"
        >
          <ChevronLeft className="h-6 w-6" />
        </Pressable>
        <p className="font-display text-xl font-extrabold text-[#993556]">🧹 Chores</p>
        <span className="flex items-center gap-1.5 rounded-full bg-beacon-soft px-3 py-1.5 font-display text-sm font-extrabold text-harbor ring-1 ring-beacon/40">
          <Star className="h-4 w-4 fill-beacon text-beacon" /> {state.points[childId] ?? 0}
        </span>
      </header>

      <p className="mt-2 text-center text-sm font-semibold text-muted">{doneCount} of {chores.length} done</p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {chores.map((ch) => {
          const d = done.includes(ch.id);
          return (
            <Pressable
              key={ch.id}
              haptics={settings.haptics}
              sound={settings.sound}
              intensity={settings.intensity}
              onClick={() => tap(ch)}
              disabled={d}
              aria-label={`${ch.title}${d ? " (done)" : ""}`}
              className={cn(
                "kiosk-tap relative flex min-h-[128px] flex-col items-center justify-center gap-2 rounded-[22px] p-4 text-center ring-1 transition active:scale-[0.97]",
                d ? "bg-emerald-50 ring-emerald-200" : "bg-white ring-harbor-100 shadow-sm",
              )}
            >
              {ch.requires_approval && !d && (
                <span className="absolute left-3 top-3 text-muted" aria-label="needs a grown-up's OK">
                  <ShieldCheck className="h-4 w-4" />
                </span>
              )}
              <span className={cn("text-5xl leading-none", d && "opacity-50")}>{ch.icon ?? "✅"}</span>
              <span className={cn("font-display text-lg font-extrabold", d ? "text-emerald-700/70 line-through" : "text-harbor")}>{ch.title}</span>
              {!d && ch.points > 0 && (
                <span className="inline-flex items-center gap-1 text-sm font-bold text-harbor">
                  <Star className="h-4 w-4 fill-beacon text-beacon" /> {ch.points}
                </span>
              )}
              {d && (
                <span className="absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check className="h-5 w-5" strokeWidth={3} />
                </span>
              )}
            </Pressable>
          );
        })}
      </div>

      {chores.length === 0 && (
        <p className="mt-16 text-center text-base font-semibold text-muted">No chores today — enjoy! 🎈</p>
      )}

      {approving && (
        <ParentGate
          verify={kiosk.verifyPin}
          title="A grown-up's OK?"
          subtitle={`Enter your PIN to check off "${approving.title}".`}
          onSuccess={() => {
            const c = approving;
            setApproving(null);
            doDone(c);
          }}
          onCancel={() => setApproving(null)}
        />
      )}
    </div>
  );
}
