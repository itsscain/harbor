"use client";

import { useState } from "react";
import { X, Star, ArrowRight, Check, RotateCcw, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";

type PStep = {
  id: string;
  label: string;
  icon: string | null;
  reward_points: number;
  kind?: string | null;
  step_type?: string;
  hint?: string | null;
  choice_options?: unknown;
  substeps?: unknown;
};

function opts(v: unknown): { icon: string; label: string }[] {
  if (!Array.isArray(v)) return [];
  return v.map((o) => {
    const r = (o ?? {}) as Record<string, unknown>;
    return { icon: r.icon ? String(r.icon) : "", label: r.label ? String(r.label) : "" };
  });
}

/** "See it on the wall" (§10) — a faithful mini-render of the child's kiosk view for this
 *  routine. The parent steps through it exactly as the child will: the now-card, choice &
 *  sub-step interactions, hints, points, and the finish. No saving blind. */
export function RoutinePreview({
  routine,
  steps,
  accent = "#18606f",
  onClose,
}: {
  routine: { name: string; type?: string; strict_order?: boolean | null };
  steps: PStep[];
  accent?: string;
  onClose: () => void;
}) {
  const isFT = routine.type === "first_then";
  const shown = isFT
    ? steps.filter((s) => s.step_type === "first" || s.step_type === "then")
    : steps.filter((s) => s.step_type !== "first" && s.step_type !== "then");
  const [done, setDone] = useState<string[]>([]);
  const [subDone, setSubDone] = useState<Record<string, number[]>>({});

  const total = shown.length;
  const doneN = shown.filter((s) => done.includes(s.id)).length;
  const allDone = total > 0 && doneN === total;
  const current = shown.find((s) => !done.includes(s.id)) ?? null;
  const others = shown.filter((s) => s !== current);
  const pct = total ? Math.round((doneN / total) * 100) : 0;

  const complete = (s: PStep) => setDone((d) => (d.includes(s.id) ? d : [...d, s.id]));
  const toggleSub = (s: PStep, i: number) => {
    const list = opts(s.substeps);
    const cur = subDone[s.id] ?? [];
    const next = cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i];
    setSubDone((p) => ({ ...p, [s.id]: next }));
    if (next.length >= list.length) complete(s);
  };
  const reset = () => {
    setDone([]);
    setSubDone({});
  };

  const choices = current ? opts(current.choice_options) : [];
  const subs = current ? opts(current.substeps) : [];
  const isChoice = current?.kind === "choice" && choices.length > 0;
  const isSub = current?.kind === "substep" && subs.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Routine preview"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-3xl text-white shadow-2xl ring-1 ring-white/10"
        style={{
          ["--a" as string]: accent,
          background: "radial-gradient(680px 460px at 78% 2%, color-mix(in srgb, var(--a) 26%, transparent), transparent 56%), radial-gradient(900px 700px at 50% 120%, #0c1a30, #0a1424 46%, #070a0d 82%)",
        }}
      >
        {/* header */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/50">On the wall</p>
            <h3 className="truncate font-display text-lg font-bold">{routine.name || "Routine"}</h3>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={reset} aria-label="Reset preview" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20">
              <RotateCcw className="h-4 w-4" />
            </button>
            <button onClick={onClose} aria-label="Close preview" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* progress */}
        <div className="px-4 pt-3">
          <div className="flex items-center justify-between text-xs font-semibold text-white/70">
            <span>{allDone ? "All done — amazing! 🎉" : total === 0 ? "No steps yet" : doneN === 0 ? "Let's get started!" : `${doneN} of ${total} done`}</span>
            <span className="tabular-nums">{pct}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "linear-gradient(90deg, color-mix(in srgb, var(--a) 60%, #000), var(--a))" }} />
          </div>
        </div>

        {/* body */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {total === 0 && <p className="py-10 text-center text-sm text-white/60">Add some steps and they&apos;ll show up here.</p>}

          {allDone && total > 0 && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/15 p-5 text-center font-display text-xl font-bold text-emerald-300">
              🎉 All done! Great job!
            </div>
          )}

          {current && (
            <div
              className="relative overflow-hidden rounded-3xl p-4"
              style={{
                background: "radial-gradient(360px 200px at 18% 0%, color-mix(in srgb, var(--a) 22%, transparent), transparent 70%), linear-gradient(165deg,#1c2740,#141c2e 60%,#121826)",
                border: "1.5px solid color-mix(in srgb, var(--a) 55%, transparent)",
                boxShadow: "0 0 40px -14px color-mix(in srgb, var(--a) 60%, transparent)",
              }}
            >
              <div className="flex items-start gap-3">
                <span className="grid aspect-square w-16 shrink-0 place-items-center rounded-2xl text-4xl" style={{ background: "radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--a) 22%, transparent), rgba(13,18,30,.6))", boxShadow: "inset 0 0 24px color-mix(in srgb, var(--a) 22%, transparent)" }}>
                  {current.icon ?? "✅"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-2xl font-extrabold leading-tight">{current.label}</p>
                  {current.hint && <p className="mt-1.5 text-sm text-white/75">💡 {current.hint}</p>}
                  {!isChoice && !isSub && (
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      {current.reward_points > 0 && (
                        <span className="inline-flex items-center gap-1 font-semibold text-beacon"><Star className="h-4 w-4 fill-beacon" /> {current.reward_points}</span>
                      )}
                      <span className="inline-flex items-center gap-1 text-white/70">
                        {current.kind === "approval" ? (<><ShieldCheck className="h-4 w-4" /> grown-up says OK</>) : (<>Tap when done <ArrowRight className="h-4 w-4" /></>)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {isChoice ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {choices.map((o, i) => (
                    <button key={i} onClick={() => complete(current)} className="flex flex-col items-center gap-1 rounded-xl px-2 py-3 ring-1 transition hover:brightness-110 active:scale-95" style={{ background: "color-mix(in srgb, var(--a) 20%, transparent)", borderColor: "color-mix(in srgb, var(--a) 50%, transparent)" }}>
                      <span className="text-3xl">{o.icon || "•"}</span>
                      <span className="text-sm font-bold">{o.label}</span>
                    </button>
                  ))}
                </div>
              ) : isSub ? (
                <div className="mt-3 space-y-2">
                  {subs.map((o, i) => {
                    const d = (subDone[current.id] ?? []).includes(i);
                    return (
                      <button key={i} onClick={() => toggleSub(current, i)} className={cn("flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left ring-1 transition", d ? "bg-emerald-500/15 ring-emerald-500/40" : "bg-white/5 ring-white/10 hover:bg-white/10")}>
                        <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full ring-2", d ? "bg-emerald-500 text-white ring-emerald-400/40" : "ring-white/25")}>{d && <Check className="h-3.5 w-3.5" strokeWidth={3} />}</span>
                        <span className="text-lg">{o.icon || "•"}</span>
                        <span className={cn("font-semibold", d && "text-emerald-200/80 line-through")}>{o.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <button onClick={() => complete(current)} className="mt-3 w-full rounded-xl py-2.5 text-sm font-bold ring-1 transition hover:brightness-110 active:scale-[0.99]" style={{ background: "color-mix(in srgb, var(--a) 22%, transparent)", borderColor: "color-mix(in srgb, var(--a) 50%, transparent)" }}>
                  Tap to complete
                </button>
              )}
            </div>
          )}

          {/* remaining + done */}
          {others.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {others.map((s) => {
                const d = done.includes(s.id);
                return (
                  <div key={s.id} className={cn("relative flex flex-col items-center justify-center gap-1 rounded-xl p-2.5 text-center ring-1", d ? "bg-emerald-500/15 ring-emerald-500/40" : "bg-white/5 ring-white/10")}>
                    <span className={cn("text-2xl", d && "opacity-50")}>{s.icon ?? "✅"}</span>
                    <span className={cn("text-xs font-semibold leading-tight", d ? "text-emerald-200/70 line-through" : "text-white/80")}>{s.label}</span>
                    {d && <span className="absolute right-1 top-1 text-emerald-400"><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p className="border-t border-white/10 px-4 py-2.5 text-center text-xs text-white/50">This is exactly what your child sees. Tap to try it.</p>
      </div>
    </div>
  );
}
