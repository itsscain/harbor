"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Star, Check, Volume2, Sparkles, ArrowRight } from "lucide-react";
import type { useKiosk } from "@/components/kiosk/useKiosk";
import type { KioskStep } from "@/lib/kiosk/types";
import { Confetti } from "@/components/kiosk/Confetti";
import { ParentGate } from "@/components/kiosk/ParentGate";
import { Pressable } from "@/components/kiosk/Pressable";
import { childColor } from "@/lib/kiosk/colors";
import { tzOf } from "@/lib/kiosk/time";
import { formatCountdown } from "@/lib/kiosk/calendar";
import { effectiveLevel } from "@/lib/kiosk/skill";
import { scaleCount } from "@/lib/kiosk/motion";
import { feedback, speak, cheer, doneLine } from "@/lib/kiosk/feedback";
import { routineWindow, routineProgress, doneToday, childSettings } from "@/lib/lantern/day";
import { routineTheme } from "@/lib/lantern/theme";
import { LanternBuddy } from "./LanternBuddy";
import { cn } from "@/lib/cn";

type Kiosk = ReturnType<typeof useKiosk>;

function spoken(s: KioskStep): string {
  const r = s.read_aloud?.trim();
  return r && r.length ? r : s.label;
}
function opts(v: unknown): { icon: string; label: string }[] {
  if (!Array.isArray(v)) return [];
  return v.map((o) => {
    const r = (o ?? {}) as Record<string, unknown>;
    return { icon: r.icon ? String(r.icon) : "", label: r.label ? String(r.label) : "" };
  });
}

/** The Lantern routine flow — a butter-smooth swipeable carousel of task cards (native
 *  scroll-snap), Beam the buddy cheering along, and a satisfying complete. Reuses the wall's
 *  window / catch-up / order / approval / skill logic; light + playful presentation. */
export function LanternRoutineView({
  kiosk,
  childId,
  routineId,
  onBack,
  onBreak,
}: {
  kiosk: Kiosk;
  childId: string;
  routineId: string;
  onBack: () => void;
  onBreak: () => void;
}) {
  const { state } = kiosk;
  const [subProgress, setSubProgress] = useState<Record<string, number[]>>({});
  const [approvingStep, setApprovingStep] = useState<KioskStep | null>(null);
  const [celebrate, setCelebrate] = useState<{ points: number; n: number } | null>(null);
  const [finished, setFinished] = useState(false);
  const [cheerN, setCheerN] = useState(0);
  const [justCheered, setJustCheered] = useState(false);
  const [bloomId, setBloomId] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const burstRef = useRef(0);

  const child = state?.snapshot.children.find((c) => c.id === childId);
  const routine = state?.snapshot.routines.find((r) => r.id === routineId);

  const settings = child ? childSettings(child) : null;
  const prog = state && child ? doneToday(state, childId) : [];
  const rp = state && routine ? routineProgress(state, routine, prog) : null;
  const flowSteps = rp ? (rp.isFirstThen ? ([rp.firstStep, rp.thenStep].filter(Boolean) as KioskStep[]) : rp.taskSteps) : [];
  const doneCount = flowSteps.filter((s) => prog.includes(s.id)).length;

  // Auto-center the first not-done step on open + after each completion (manual swipes untouched).
  useEffect(() => {
    const next = flowSteps.find((s) => !prog.includes(s.id)) ?? flowSteps[flowSteps.length - 1];
    if (next) cardRefs.current[next.id]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneCount, routineId]);

  if (!state || !child || !routine || !settings || !rp) return null;

  const accent = childColor(child);
  const t = routineTheme(routine.name, routine.type);
  const tz = tzOf(state);
  const win = routineWindow(state, routine, childId, tz);
  const allDone = rp.complete;
  const notYetOpen = win.kind === "upcoming";
  const catchUp = win.kind === "catchup";
  const fx = { sound: settings.sound, haptics: settings.haptics, intensity: settings.intensity };
  const lockSpeech = notYetOpen
    ? `${routine.name} opens ${win.untilOpenMin != null ? `in ${formatCountdown(win.untilOpenMin)}` : (win.opensAt ?? "later")}. Let's come back then!`
    : "";

  function doComplete(step: KioskStep) {
    if (prog.includes(step.id)) return;
    kiosk.completeStep(child!.id, step);
    setBloomId(step.id);
    setCheerN((n) => n + 1);
    // Let Beam bounce on EVERY completion, not just the last one (mood is otherwise "happy" mid-routine).
    setJustCheered(true);
    window.setTimeout(() => setJustCheered(false), 950);
    // This tap finishes the routine when every step is now done (this one + the rest already were).
    const finishes = flowSteps.length > 0 && flowSteps.every((s) => s.id === step.id || prog.includes(s.id));
    if (finishes) {
      setFinished(true);
      kiosk.bumpStreak(child!.id);
      feedback("arrival", { ...fx, say: settings!.readAloud ? doneLine() : undefined });
    } else {
      feedback("step-complete", { ...fx, say: settings!.readAloud ? cheer() : undefined });
    }
    if (step.reward_points > 0) {
      burstRef.current += 1;
      setCelebrate({ points: step.reward_points, n: burstRef.current });
      window.setTimeout(() => setCelebrate(null), 1300);
    }
    setSubProgress((p) => (p[step.id] ? { ...p, [step.id]: [] } : p));
  }

  // No silent no-op (§5): every tap answers — resting → explain; out-of-order → nudge; approval → PIN.
  function complete(step: KioskStep) {
    if (prog.includes(step.id)) return;
    if (notYetOpen) {
      feedback("soft-error", fx);
      if (settings!.readAloud && lockSpeech) speak(lockSpeech);
      return;
    }
    if (rp!.isFirstThen) {
      if (step === rp!.thenStep && rp!.firstStep && !prog.includes(rp!.firstStep.id)) {
        feedback("soft-error", fx);
        if (settings!.readAloud) speak(`Let's do "${spoken(rp!.firstStep)}" first!`);
        return;
      }
    } else if (routine!.strict_order) {
      const expected = flowSteps.find((s) => !prog.includes(s.id));
      if (expected && expected.id !== step.id) {
        feedback("soft-error", fx);
        if (settings!.readAloud) speak(`Let's do "${spoken(expected)}" first!`);
        if (expected) cardRefs.current[expected.id]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        return;
      }
    }
    if (step.kind === "approval" && kiosk.state?.pinHash) {
      setApprovingStep(step);
      return;
    }
    doComplete(step);
  }

  function toggleSub(step: KioskStep, i: number) {
    const list = opts(step.substeps);
    if (list.length === 0) return;
    if (notYetOpen) {
      complete(step);
      return;
    }
    const cur = subProgress[step.id] ?? [];
    const adding = !cur.includes(i);
    const next = adding ? [...cur, i] : cur.filter((x) => x !== i);
    if (adding && next.length >= list.length) {
      // Final tick: hand off to complete() rather than persisting a full-ticked state first — if an
      // order gate refuses (strict/First-Then), the child gets the nudge and the ticks stay where they
      // were, instead of the card getting stuck showing "N of N done" on an incomplete step.
      complete(step);
    } else {
      if (adding) feedback("step-complete", fx);
      setSubProgress((p) => ({ ...p, [step.id]: next }));
    }
  }

  const scrollBy = (dir: 1 | -1) => {
    const el = carouselRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.86, behavior: "smooth" });
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden px-4 py-3 text-harbor sm:px-6" style={{ background: `radial-gradient(130% 72% at 50% -10%, ${t.soft}, #fbfdfc 60%)` }}>
      {/* top bar */}
      <header className="flex shrink-0 items-center justify-between gap-3">
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
        <div className="flex items-center gap-2">
          {flowSteps.map((s) => (
            <span key={s.id} className="h-2.5 w-2.5 rounded-full transition-colors" style={{ background: prog.includes(s.id) ? t.fg : t.soft }} />
          ))}
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-beacon-soft px-3 py-1.5 font-display text-sm font-extrabold text-harbor ring-1 ring-beacon/40">
          <Star className="h-4 w-4 fill-beacon text-beacon" /> {state.points[childId] ?? 0}
        </span>
      </header>

      {/* buddy + routine name */}
      <div className="mt-1 flex shrink-0 items-center justify-center gap-2">
        <LanternBuddy mood={finished || allDone || justCheered ? "cheer" : "happy"} accent={accent} size={52} reducedMotion={settings.reducedMotion} cheerKey={cheerN} />
        <p className="font-display text-lg font-extrabold" style={{ color: t.fg }}>
          {t.emoji} {routine.name}
        </p>
      </div>

      <main className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
       {/* m-auto centers when there's room; when a tall card exceeds a short/landscape screen the
           auto-margins collapse and main scrolls instead of clipping the complete button (§ fit-any-screen). */}
       <div className="m-auto w-full">
        {/* not-yet-open — warm resting, not a lock (§6) */}
        {notYetOpen && !allDone && (
          <div className="mx-auto max-w-md rounded-[26px] bg-white p-6 text-center shadow-sm ring-1 ring-harbor-100">
            <LanternBuddy mood="sleepy" accent={accent} size={92} reducedMotion={settings.reducedMotion} />
            <p className="mt-2 font-display text-2xl font-extrabold text-harbor">{routine.name} is resting</p>
            <p className="mt-1 text-base font-semibold" style={{ color: t.fg }}>
              {win.untilOpenMin != null ? `Opens in ${formatCountdown(win.untilOpenMin)}` : (win.opensAt ?? "Come back a little later")}
            </p>
            <Pressable haptics={settings.haptics} sound={settings.sound} intensity={settings.intensity} fx="break" onClick={onBreak} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#eef1fb] px-5 py-2.5 font-semibold text-[#3c3489]">
              <Sparkles className="h-4 w-4" /> Take a calm break
            </Pressable>
          </div>
        )}

        {catchUp && !allDone && (
          <div className="mx-auto mb-2 flex max-w-md shrink-0 items-center gap-3 rounded-2xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-harbor-100">
            <span className="text-2xl">💪</span>
            <p className="text-sm font-bold" style={{ color: t.fg }}>
              Let&apos;s catch up on {routine.name}! {doneCount > 0 ? `${rp.total - doneCount} to go.` : "You can still finish it."}
            </p>
          </div>
        )}

        {allDone ? (
          <div className="mx-auto max-w-md rounded-[28px] bg-white p-7 text-center shadow-sm ring-1 ring-harbor-100">
            <LanternBuddy mood="cheer" accent={accent} size={112} reducedMotion={settings.reducedMotion} cheerKey={cheerN} />
            <p className="mt-2 font-display text-3xl font-extrabold text-harbor">You did it, {child.name}!</p>
            <p className="mt-1 text-base font-semibold" style={{ color: t.fg }}>{routine.name} — all done.</p>
            <Pressable haptics={settings.haptics} sound={settings.sound} intensity={settings.intensity} onClick={onBack} className="mt-5 inline-flex items-center gap-2 rounded-full px-6 py-3 font-display text-lg font-extrabold text-white" style={{ background: t.fg }}>
              Back home <ArrowRight className="h-5 w-5" />
            </Pressable>
          </div>
        ) : notYetOpen ? null : flowSteps.length === 0 ? (
          <div className="mx-auto max-w-md rounded-[26px] bg-white p-8 text-center shadow-sm ring-1 ring-harbor-100">
            <span className="text-5xl">🗓️</span>
            <p className="mt-3 font-display text-2xl font-extrabold text-harbor">Nothing here yet</p>
            <p className="mt-1 text-muted">A grown-up can add steps in the Harbor app.</p>
            <Pressable haptics={settings.haptics} sound={settings.sound} intensity={settings.intensity} onClick={onBack} className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 font-display text-lg font-extrabold text-white" style={{ background: t.fg }}>
              Back home <ArrowRight className="h-5 w-5" />
            </Pressable>
          </div>
        ) : (
          <>
            {/* the buttery swipe carousel — native scroll-snap, momentum, peek of neighbors */}
            <div
              ref={carouselRef}
              className="flex snap-x snap-mandatory items-stretch gap-4 overflow-x-auto overflow-y-hidden px-[7%] py-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {flowSteps.map((step) => (
                <div
                  key={step.id}
                  ref={(el) => { cardRefs.current[step.id] = el; }}
                  className="flex w-[86%] shrink-0 snap-center items-center justify-center"
                >
                  <StepCard
                    step={step}
                    done={prog.includes(step.id)}
                    bloom={bloomId === step.id}
                    level={effectiveLevel(state, childId, step)}
                    theme={t}
                    reducedMotion={settings.reducedMotion}
                    subDone={subProgress[step.id] ?? []}
                    onComplete={() => complete(step)}
                    onToggleSub={(i) => toggleSub(step, i)}
                    onSpeak={() => speak(spoken(step), settings.readAloud)}
                  />
                </div>
              ))}
            </div>

            {/* arrows (a11y + non-touch) */}
            {flowSteps.length > 1 && (
              <>
                <button onClick={() => scrollBy(-1)} aria-label="Previous" className="absolute left-0 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-harbor shadow-sm ring-1 ring-harbor-100 backdrop-blur sm:flex">
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button onClick={() => scrollBy(1)} aria-label="Next" className="absolute right-0 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-harbor shadow-sm ring-1 ring-harbor-100 backdrop-blur sm:flex">
                  <ChevronRight className="h-6 w-6" />
                </button>
                <p className="mt-1 shrink-0 text-center text-xs font-medium text-muted">← swipe through your steps →</p>
              </>
            )}
          </>
        )}
       </div>
      </main>

      {/* points burst */}
      {celebrate && (
        <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
          {!settings.reducedMotion && <Confetti key={celebrate.n} count={scaleCount(24, settings.intensity)} accent={accent} />}
          <div className="rounded-full bg-beacon px-9 py-7 text-center shadow-2xl">
            <Star className="mx-auto h-11 w-11 fill-harbor text-harbor" />
            <p className="mt-1 font-display text-3xl font-extrabold text-harbor">+{celebrate.points}</p>
          </div>
        </div>
      )}
      {finished && !settings.reducedMotion && (
        <div className="pointer-events-none fixed inset-0 z-20 flex items-start justify-center">
          <Confetti count={scaleCount(56, settings.intensity)} spread={520} accent={accent} />
        </div>
      )}

      {approvingStep && (
        <ParentGate
          verify={kiosk.verifyPin}
          title="A grown-up's OK?"
          subtitle={`Enter your PIN to finish "${approvingStep.label}".`}
          onSuccess={() => {
            const s = approvingStep;
            setApprovingStep(null);
            doComplete(s);
          }}
          onCancel={() => setApprovingStep(null)}
        />
      )}
    </div>
  );
}

/** One task card in the carousel. */
function StepCard({
  step,
  done,
  bloom,
  level,
  theme: t,
  reducedMotion,
  subDone,
  onComplete,
  onToggleSub,
  onSpeak,
}: {
  step: KioskStep;
  done: boolean;
  bloom: boolean;
  level: number;
  theme: { emoji: string; bg: string; fg: string; soft: string };
  reducedMotion: boolean;
  subDone: number[];
  onComplete: () => void;
  onToggleSub: (i: number) => void;
  onSpeak: () => void;
}) {
  const choices = step.kind === "choice" ? opts(step.choice_options) : [];
  const subs = step.kind === "substep" ? opts(step.substeps) : [];
  const isChoice = choices.length > 0;
  const isSub = subs.length > 0;

  return (
    <div className={cn("relative flex w-full flex-col items-center overflow-hidden rounded-[28px] bg-white p-4 text-center ring-1 ring-harbor-100 transition", done ? "opacity-95 ring-emerald-200" : "shadow-[0_18px_40px_-24px_rgba(12,59,71,.5)]")}>
      {bloom && !reducedMotion && (
        <span aria-hidden className="animate-radial-fill pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: `radial-gradient(circle, ${t.fg}, transparent 70%)` }} />
      )}
      <span className={cn("relative flex aspect-square w-[clamp(64px,13vh,104px)] items-center justify-center rounded-[26px] text-[clamp(38px,8vh,60px)] leading-none", done && "opacity-60", level >= 4 && !done && "opacity-70")} style={{ background: done ? "#e9f8f0" : t.bg, color: done ? "#0f6e56" : t.fg }}>
        {done ? <Check className="h-[52%] w-[52%]" strokeWidth={3} /> : (step.icon ?? "✅")}
      </span>
      <p className={cn("relative mt-2.5 font-display text-[clamp(22px,5vw,31px)] font-extrabold leading-tight", done ? "text-emerald-700/70 line-through" : "text-harbor")}>{step.label}</p>

      {done ? (
        <p className="relative mt-2 font-display text-lg font-bold text-emerald-600">Nice work! 🎉</p>
      ) : (
        <>
          {step.hint && <p className="relative mt-2 text-base font-medium text-muted">💡 {step.hint}</p>}
          {step.duration_min ? (
            <span className="relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-harbor-50 px-3 py-1 text-sm font-semibold text-water">⏱ {step.duration_min} min</span>
          ) : null}

          {isChoice ? (
            <div className="relative mt-4 grid w-full grid-cols-2 gap-2.5">
              {choices.map((o, i) => (
                <button key={i} onClick={onComplete} className="flex flex-col items-center gap-1.5 rounded-2xl px-3 py-4 ring-1 transition active:scale-95" style={{ background: t.bg, borderColor: t.soft, color: t.fg }}>
                  <span className="text-4xl">{o.icon || "•"}</span>
                  <span className="font-display text-base font-bold" style={{ color: t.fg }}>{o.label}</span>
                </button>
              ))}
            </div>
          ) : isSub ? (
            <div className="relative mt-4 w-full space-y-2">
              <p className="text-sm font-bold" style={{ color: t.fg }}>{subDone.length} of {subs.length} done</p>
              {subs.map((o, i) => {
                const d = subDone.includes(i);
                return (
                  <button key={i} onClick={() => onToggleSub(i)} className={cn("flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left ring-1 transition", d ? "bg-emerald-50 ring-emerald-200" : "bg-harbor-50 ring-harbor-100")}>
                    <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-2", d ? "bg-emerald-500 text-white ring-emerald-300" : "ring-harbor-200")}>{d && <Check className="h-4 w-4" strokeWidth={3} />}</span>
                    <span className="text-2xl">{o.icon || "•"}</span>
                    <span className={cn("font-display text-lg font-bold", d ? "text-emerald-700/70 line-through" : "text-harbor")}>{o.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              {step.reward_points > 0 && (
                <span className="relative mt-3 inline-flex items-center gap-1.5 font-display text-base font-extrabold text-harbor">
                  <Star className="h-5 w-5 fill-beacon text-beacon" /> {step.reward_points}
                </span>
              )}
              <Pressable haptics={!reducedMotion} onClick={onComplete} aria-label={`Done: ${step.label}`} className="relative mt-[clamp(8px,2vh,16px)] flex aspect-square w-[clamp(64px,11vh,92px)] items-center justify-center rounded-full text-white transition active:scale-90" style={{ background: t.fg, boxShadow: `0 12px 26px -8px ${t.fg}` }}>
                <Check className="h-[52%] w-[52%]" strokeWidth={3} />
              </Pressable>
              <p className="relative mt-2.5 text-sm font-semibold" style={{ color: t.fg }}>
                {step.kind === "approval" ? "Tap — a grown-up says OK" : level >= 4 ? "🧭 You've got this!" : "Tap when you're done"}
              </p>
            </>
          )}

          {level <= 2 && !isSub && (
            <button onClick={onSpeak} aria-label="Read aloud" className="relative mt-3 flex h-9 w-9 items-center justify-center rounded-full bg-harbor-50 text-water ring-1 ring-harbor-100">
              <Volume2 className="h-4 w-4" />
            </button>
          )}
        </>
      )}
    </div>
  );
}
