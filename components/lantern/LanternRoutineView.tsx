"use client";

import { useState } from "react";
import { ChevronLeft, Star, Check, Volume2, Moon, Sparkles, ArrowRight } from "lucide-react";
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

/** The Lantern routine flow (§4/§8) — one focused task at a time, light + playful, with a big
 *  satisfying complete. Reuses the wall's window/catch-up/order/skill logic; new presentation. */
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
  const [focusId, setFocusId] = useState<string | null>(null);
  const [subProgress, setSubProgress] = useState<Record<string, number[]>>({});
  const [approvingStep, setApprovingStep] = useState<KioskStep | null>(null);
  const [celebrate, setCelebrate] = useState<{ points: number; n: number } | null>(null);
  const [finished, setFinished] = useState(false);

  const child = state?.snapshot.children.find((c) => c.id === childId);
  const routine = state?.snapshot.routines.find((r) => r.id === routineId);
  if (!state || !child || !routine) return null;

  const settings = childSettings(child);
  const accent = childColor(child);
  const t = routineTheme(routine.name, routine.type);
  const tz = tzOf(state);
  const win = routineWindow(state, routine, childId, tz);
  const prog = doneToday(state, childId);
  const rp = routineProgress(state, routine, prog);
  const flowSteps = rp.isFirstThen ? ([rp.firstStep, rp.thenStep].filter(Boolean) as KioskStep[]) : rp.taskSteps;
  const allDone = rp.complete;
  const notYetOpen = win.kind === "upcoming";
  const catchUp = win.kind === "catchup";
  const fx = { sound: settings.sound, haptics: settings.haptics, intensity: settings.intensity };

  const lockSpeech = notYetOpen
    ? `${routine.name} opens ${win.untilOpenMin != null ? `in ${formatCountdown(win.untilOpenMin)}` : (win.opensAt ?? "later")}. Let's come back then!`
    : "";

  // The focused step: an explicit skip pick, else the first not-done in flow order.
  const current =
    (focusId ? flowSteps.find((s) => s.id === focusId && !prog.includes(s.id)) : undefined) ??
    flowSteps.find((s) => !prog.includes(s.id)) ??
    null;

  function doComplete(step: KioskStep) {
    if (prog.includes(step.id)) return;
    kiosk.completeStep(child!.id, step);
    // Match ChildView exactly: a First/Then routine finishes ONLY when the (existing) Then step
    // completes — so a degenerate first-only routine never fires a false "you did it" + streak.
    const finishes = rp.isFirstThen
      ? !!rp.thenStep && step.id === rp.thenStep.id
      : flowSteps.length > 0 && flowSteps.every((s) => s.id === step.id || prog.includes(s.id));
    if (finishes) {
      setFinished(true);
      kiosk.bumpStreak(child!.id);
      feedback("arrival", { ...fx, say: settings.readAloud ? doneLine() : undefined });
    } else {
      feedback("step-complete", { ...fx, say: settings.readAloud ? cheer() : undefined });
    }
    if (step.reward_points > 0) {
      setCelebrate({ points: step.reward_points, n: Date.now() });
      window.setTimeout(() => setCelebrate(null), 1300);
    }
    setSubProgress((p) => (p[step.id] ? { ...p, [step.id]: [] } : p));
    setFocusId(null);
  }

  // Every tap answers (no silent no-op §5): resting → explain; out-of-order → nudge; approval → PIN.
  function complete(step: KioskStep) {
    if (prog.includes(step.id)) return;
    if (notYetOpen) {
      feedback("soft-error", fx);
      if (settings.readAloud && lockSpeech) speak(lockSpeech);
      return;
    }
    if (rp.isFirstThen) {
      if (step === rp.thenStep && rp.firstStep && !prog.includes(rp.firstStep.id)) {
        feedback("soft-error", fx);
        if (settings.readAloud) speak(`Let's do "${spoken(rp.firstStep)}" first!`);
        return;
      }
    } else if (routine!.strict_order) {
      const expected = flowSteps.find((s) => !prog.includes(s.id));
      if (expected && expected.id !== step.id) {
        feedback("soft-error", fx);
        if (settings.readAloud) speak(`Let's do "${spoken(expected)}" first!`);
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
      setSubProgress((p) => ({ ...p, [step.id]: next }));
      complete(step);
    } else {
      if (adding) feedback("step-complete", fx);
      setSubProgress((p) => ({ ...p, [step.id]: next }));
    }
  }

  function skip() {
    if (!current) return;
    const rest = flowSteps.filter((s) => !prog.includes(s.id));
    const idx = rest.findIndex((s) => s.id === current.id);
    const nextStep = rest[(idx + 1) % rest.length];
    if (nextStep) {
      setFocusId(nextStep.id);
      feedback("tab-switch", fx);
    }
  }

  const level = current ? effectiveLevel(state, childId, current) : 1;
  const choices = current?.kind === "choice" ? opts(current.choice_options) : [];
  const subs = current?.kind === "substep" ? opts(current.substeps) : [];
  const isChoice = choices.length > 0;
  const isSub = subs.length > 0;
  const doneCount = flowSteps.filter((s) => prog.includes(s.id)).length;

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
            <span
              key={s.id}
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: prog.includes(s.id) ? t.fg : t.soft }}
            />
          ))}
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-beacon-soft px-3 py-1.5 font-display text-sm font-extrabold text-harbor ring-1 ring-beacon/40">
          <Star className="h-4 w-4 fill-beacon text-beacon" /> {state.points[childId] ?? 0}
        </span>
      </header>

      <p className="mt-2 shrink-0 text-center font-display text-lg font-extrabold" style={{ color: t.fg }}>
        {t.emoji} {routine.name}
      </p>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto py-2">
        {/* not-yet-open — a warm resting state, not a lock (§6). */}
        {notYetOpen && !allDone && (
          <div className="mx-auto max-w-md rounded-[26px] bg-white p-6 text-center shadow-sm ring-1 ring-harbor-100">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full" style={{ background: t.bg, color: t.fg }}>
              <Moon className="h-8 w-8" />
            </span>
            <p className="mt-3 font-display text-2xl font-extrabold text-harbor">{routine.name} is resting</p>
            <p className="mt-1 text-base font-semibold" style={{ color: t.fg }}>
              {win.untilOpenMin != null ? `Opens in ${formatCountdown(win.untilOpenMin)}` : (win.opensAt ?? "Come back a little later")}
            </p>
            <Pressable
              haptics={settings.haptics}
              sound={settings.sound}
              intensity={settings.intensity}
              fx="break"
              onClick={onBreak}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#eef1fb] px-5 py-2.5 font-semibold text-[#3c3489]"
            >
              <Sparkles className="h-4 w-4" /> Take a calm break
            </Pressable>
          </div>
        )}

        {/* catch-up — invite, don't punish (the missed-morning fix). */}
        {catchUp && !allDone && current && (
          <div className="mx-auto mb-4 flex max-w-md items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-harbor-100">
            <span className="text-2xl">💪</span>
            <p className="text-sm font-bold" style={{ color: t.fg }}>
              Let&apos;s catch up on {routine.name}! {doneCount > 0 ? `${rp.total - doneCount} to go.` : "You can still finish it."}
            </p>
          </div>
        )}

        {allDone ? (
          <div className="mx-auto max-w-md rounded-[28px] bg-white p-8 text-center shadow-sm ring-1 ring-harbor-100">
            <span className="text-6xl">🎉</span>
            <p className="mt-3 font-display text-3xl font-extrabold text-harbor">You did it, {child.name}!</p>
            <p className="mt-1 text-base font-semibold" style={{ color: t.fg }}>
              {routine.name} — all done.
            </p>
            <Pressable
              haptics={settings.haptics}
              sound={settings.sound}
              intensity={settings.intensity}
              onClick={onBack}
              className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 font-display text-lg font-extrabold text-white"
              style={{ background: t.fg }}
            >
              Back home <ArrowRight className="h-5 w-5" />
            </Pressable>
          </div>
        ) : notYetOpen ? null : flowSteps.length === 0 ? (
          <div className="mx-auto max-w-md rounded-[26px] bg-white p-8 text-center shadow-sm ring-1 ring-harbor-100">
            <span className="text-5xl">🗓️</span>
            <p className="mt-3 font-display text-2xl font-extrabold text-harbor">Nothing here yet</p>
            <p className="mt-1 text-muted">A grown-up can add steps in the Harbor app.</p>
            <Pressable
              haptics={settings.haptics}
              sound={settings.sound}
              intensity={settings.intensity}
              onClick={onBack}
              className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 font-display text-lg font-extrabold text-white"
              style={{ background: t.fg }}
            >
              Back home <ArrowRight className="h-5 w-5" />
            </Pressable>
          </div>
        ) : current ? (
          <div className="mx-auto flex w-full max-w-md flex-col items-center rounded-[28px] bg-white p-6 text-center shadow-[0_18px_40px_-24px_rgba(12,59,71,.5)] ring-1 ring-harbor-100">
            <span
              className={cn("flex h-[112px] w-[112px] items-center justify-center rounded-[28px] text-[64px] leading-none", level >= 4 && "opacity-60")}
              style={{ background: t.bg, color: t.fg }}
            >
              {current.icon ?? "✅"}
            </span>
            <p className="mt-4 font-display text-[clamp(26px,7vw,36px)] font-extrabold leading-tight text-harbor">{current.label}</p>
            {current.hint && <p className="mt-2 text-base font-medium text-muted">💡 {current.hint}</p>}
            {current.duration_min ? (
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-harbor-50 px-3 py-1 text-sm font-semibold text-water">
                ⏱ {current.duration_min} min
              </span>
            ) : null}

            {isChoice ? (
              <div className="mt-5 grid w-full grid-cols-2 gap-2.5">
                {choices.map((o, i) => (
                  <Pressable
                    key={i}
                    haptics={settings.haptics}
                    sound={settings.sound}
                    intensity={settings.intensity}
                    onClick={() => complete(current)}
                    className="flex flex-col items-center gap-1.5 rounded-2xl px-3 py-4 ring-1 transition active:scale-95"
                    style={{ background: t.bg, borderColor: t.soft, color: t.fg }}
                  >
                    <span className="text-4xl">{o.icon || "•"}</span>
                    <span className="font-display text-base font-bold" style={{ color: t.fg }}>{o.label}</span>
                  </Pressable>
                ))}
              </div>
            ) : isSub ? (
              <div className="mt-5 w-full space-y-2">
                <p className="text-sm font-bold" style={{ color: t.fg }}>
                  {(subProgress[current.id] ?? []).length} of {subs.length} done
                </p>
                {subs.map((o, i) => {
                  const d = (subProgress[current.id] ?? []).includes(i);
                  return (
                    <Pressable
                      key={i}
                      haptics={settings.haptics}
                      sound={settings.sound}
                      intensity={settings.intensity}
                      onClick={() => toggleSub(current, i)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left ring-1 transition",
                        d ? "bg-emerald-50 ring-emerald-200" : "bg-harbor-50 ring-harbor-100",
                      )}
                    >
                      <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-2", d ? "bg-emerald-500 text-white ring-emerald-300" : "ring-harbor-200")}>
                        {d && <Check className="h-4 w-4" strokeWidth={3} />}
                      </span>
                      <span className="text-2xl">{o.icon || "•"}</span>
                      <span className={cn("font-display text-lg font-bold", d ? "text-emerald-700/70 line-through" : "text-harbor")}>{o.label}</span>
                    </Pressable>
                  );
                })}
              </div>
            ) : (
              <>
                {current.reward_points > 0 && (
                  <span className="mt-3 inline-flex items-center gap-1.5 font-display text-base font-extrabold text-harbor">
                    <Star className="h-5 w-5 fill-beacon text-beacon" /> {current.reward_points}
                  </span>
                )}
                <Pressable
                  haptics={settings.haptics}
                  sound={settings.sound}
                  intensity={settings.intensity}
                  onClick={() => complete(current)}
                  aria-label={`Done: ${current.label}`}
                  className="mt-5 flex h-24 w-24 items-center justify-center rounded-full text-white transition active:scale-90"
                  style={{ background: t.fg, boxShadow: `0 12px 26px -8px ${t.fg}` }}
                >
                  <Check className="h-12 w-12" strokeWidth={3} />
                </Pressable>
                <p className="mt-3 text-sm font-semibold" style={{ color: t.fg }}>
                  {current.kind === "approval" ? "Tap — a grown-up says OK" : level >= 4 ? "🧭 You've got this on your own" : "Tap when you're done"}
                </p>
              </>
            )}

            <div className="mt-4 flex items-center gap-4">
              {level <= 2 && (
                <button
                  onClick={() => speak(spoken(current), settings.readAloud)}
                  aria-label="Read aloud"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-harbor-50 text-water ring-1 ring-harbor-100"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              )}
              {flowSteps.filter((s) => !prog.includes(s.id)).length > 1 && (
                <button onClick={skip} className="text-sm font-semibold text-muted underline-offset-2 hover:underline">
                  Skip for now
                </button>
              )}
            </div>
          </div>
        ) : null}
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
