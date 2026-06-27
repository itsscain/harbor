"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Heart } from "lucide-react";
import type { useKiosk } from "./useKiosk";
import type { KioskStep } from "@/lib/kiosk/types";
import { todayKey } from "@/lib/kiosk/db";
import { runsToday } from "@/lib/kiosk/calendar";
import { chime, haptic, HAPTIC } from "@/lib/kiosk/feedback";
import { Pressable } from "./Pressable";
import { cn } from "@/lib/cn";

type Kiosk = ReturnType<typeof useKiosk>;

/** The parent/caregiver "in the boat" view (§4.1–4.2). Their own routine, rendered calm
 *  and dignified — NO stars, NO points. A quiet sense of completion + modeling. */
export function ParentView({
  kiosk,
  personId,
  onHome,
}: {
  kiosk: Kiosk;
  personId: string;
  onHome: () => void;
}) {
  const { state } = kiosk;
  const person = state?.snapshot.people?.find((p) => p.id === personId);

  // Re-render across midnight so "today" stays correct on an always-on wall.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const routines = useMemo(() => {
    if (!state || !person) return [];
    return state.snapshot.routines
      .filter((r) => r.person_id === person.id && r.active && runsToday(r.days_of_week))
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [state, person]);

  if (!state || !person) return null;

  const accent = person.color || "#6b8aa6";
  const today = todayKey();
  const prog = state.personProgress?.[person.id]?.date === today ? state.personProgress![person.id].completed : [];
  const childName = (id?: string | null) => state.snapshot.children.find((c) => c.id === id)?.name ?? null;

  const stepsFor = (routineId: string) =>
    state.snapshot.steps.filter((s) => s.routine_id === routineId).sort((a, b) => a.order_index - b.order_index);

  function complete(step: KioskStep) {
    if (prog.includes(step.id)) return;
    kiosk.completePersonStep(person!.id, step);
    chime(true);
    haptic(HAPTIC.stepDone, true);
  }

  return (
    <div className="relative min-h-dvh px-5 pb-10 pt-4" style={{ ["--accent" as string]: accent }}>
      <button onClick={onHome} aria-label="Back to Harbor" className="kiosk-tap mb-3 flex items-center gap-1.5 text-kmute">
        <ArrowLeft className="h-5 w-5" />
        <span className="text-sm font-semibold">Harbor</span>
      </button>

      {/* keeper header */}
      <div className="flex items-center gap-4">
        <span
          className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl ring-2"
          style={{ background: `${accent}22`, color: accent, borderColor: `${accent}55` }}
        >
          {person.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={person.photo_url} alt="" className="h-full w-full rounded-2xl object-cover" />
          ) : (
            person.avatar || "💙"
          )}
        </span>
        <div>
          <h1 className="font-display text-3xl font-bold text-ktext">{person.name}</h1>
          <p className="text-sm text-kmute">Your rhythm — no stars, just a calm beat.</p>
        </div>
      </div>

      {routines.length === 0 && (
        <div className="mt-10 rounded-2xl bg-kraise p-6 text-center text-kmute">
          Nothing on your wall today. Add a routine from the Helm to model a calm rhythm.
        </div>
      )}

      <div className="mt-6 space-y-6">
        {routines.map((r) => {
          const steps = stepsFor(r.id);
          const withChild = r.together ? childName(r.with_child_id) : null;
          const doneCount = steps.filter((s) => prog.includes(s.id)).length;
          return (
            <section key={r.id}>
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="font-display text-xl font-semibold text-ktext">{r.name}</h2>
                {r.together && (
                  <span
                    className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                    style={{ background: `${accent}1f`, color: accent }}
                  >
                    <Heart className="h-3.5 w-3.5" />
                    {withChild ? `Together with ${withChild}` : "Together"}
                  </span>
                )}
              </div>
              <div className="space-y-2.5">
                {steps.map((s) => {
                  const done = prog.includes(s.id);
                  return (
                    <Pressable
                      key={s.id}
                      onClick={() => complete(s)}
                      className={cn(
                        "flex w-full items-center gap-4 rounded-2xl px-4 py-4 text-left ring-1 transition",
                        done ? "bg-kraise/60 ring-kline/40" : "bg-kraise ring-kline/55",
                      )}
                    >
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl"
                        style={done ? { background: accent, color: "#fff" } : { background: `${accent}1a` }}
                      >
                        {done ? <Check className="h-6 w-6" /> : s.icon || "•"}
                      </span>
                      <span className={cn("flex-1 text-lg font-semibold", done ? "text-kmute line-through" : "text-ktext")}>
                        {s.label}
                      </span>
                    </Pressable>
                  );
                })}
              </div>
              {steps.length > 0 && doneCount === steps.length && (
                <p className="mt-3 px-1 text-sm font-semibold" style={{ color: accent }}>
                  All done — nicely modeled. ⚓
                </p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
