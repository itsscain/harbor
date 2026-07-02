"use client";

import { useEffect, useState } from "react";
import { Star, Wind, Check, Clock } from "lucide-react";
import type { useKiosk } from "@/components/kiosk/useKiosk";
import { ChildAvatar } from "@/components/kiosk/ChildAvatar";
import { Pressable } from "@/components/kiosk/Pressable";
import { childColor } from "@/lib/kiosk/colors";
import { tzOf } from "@/lib/kiosk/time";
import { formatCountdown } from "@/lib/kiosk/calendar";
import {
  childRoutinesToday,
  doneToday,
  pickNowRoutineId,
  routineWindow,
  routineProgress,
  childChoresToday,
  childSettings,
} from "@/lib/lantern/day";
import { routineTheme, greetingFor } from "@/lib/lantern/theme";
import { LanternBuddy } from "./LanternBuddy";
import { SkipperSays } from "./SkipperBubble";
import { cn } from "@/lib/cn";

type Kiosk = ReturnType<typeof useKiosk>;

/** The Lantern home (HARBOR_LANTERN_DEVICE.md §4) — a light, playful hub in the child's own
 *  world: their avatar as the friendly face, a star balance to spend, and big rounded routine
 *  tiles that reflect each window (do-it-now / opens-at / catch-up / all-done). */
export function LanternHome({
  kiosk,
  childId,
  onOpenRoutine,
  onOpenChores,
  onBreak,
  onOpenStore,
}: {
  kiosk: Kiosk;
  childId: string;
  onOpenRoutine: (id: string) => void;
  onOpenChores: () => void;
  onBreak: () => void;
  onOpenStore: () => void;
}) {
  const { state, refreshSkipperLines } = kiosk;
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 20_000);
    return () => window.clearInterval(id);
  }, []);
  // Warm Skipper's AI thought-bubble batch for the day (Plus + AI; guarded + offline-safe).
  useEffect(() => {
    refreshSkipperLines(childId);
  }, [childId, refreshSkipperLines]);

  const child = state?.snapshot.children.find((c) => c.id === childId);
  if (!state || !child) return null;
  const settings = childSettings(child);
  const accent = childColor(child);
  const tz = tzOf(state);
  const routines = childRoutinesToday(state, childId, tz);
  const done = doneToday(state, childId);
  const nowId = pickNowRoutineId(state, routines, childId, tz);
  const points = state.points[childId] ?? 0;
  const chores = childChoresToday(state, childId, tz);
  const choresDone = chores.filter((c) => done.includes(c.id)).length;

  // Beam's mood + line come from the whole day's progress.
  const progresses = routines.map((r) => routineProgress(state, r, done));
  const totalSteps = progresses.reduce((n, p) => n + p.total, 0);
  const totalDone = progresses.reduce((n, p) => n + p.done, 0);
  const dayDone =
    routines.length > 0 &&
    progresses.every((p) => p.complete) &&
    (chores.length === 0 || choresDone >= chores.length);

  const h = now.getHours();
  const m = now.getMinutes();
  const time = `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  const dateStr = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  return (
    <div
      className="flex h-dvh flex-col overflow-hidden px-4 py-3 text-harbor sm:px-6"
      style={{ background: `radial-gradient(130% 72% at 50% -10%, ${accent}1f, #fbfdfc 60%)` }}
    >
      {/* top bar */}
      <header className="flex shrink-0 items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className="shrink-0 rounded-2xl"
            style={{ boxShadow: `0 0 0 2px #fff, 0 0 0 4px ${accent}` }}
          >
            <ChildAvatar child={child} size={40} rounded="rounded-2xl" />
          </span>
          <div className="leading-tight">
            <p className="font-display text-lg font-extrabold tabular-nums text-harbor">{time}</p>
            <p className="text-xs font-medium text-muted">{dateStr}</p>
          </div>
        </div>
        <Pressable
          haptics={settings.haptics}
          sound={settings.sound}
          intensity={settings.intensity}
          onClick={onOpenStore}
          className="flex items-center gap-1.5 rounded-full bg-beacon-soft px-3.5 py-2 font-display text-base font-extrabold text-harbor ring-1 ring-beacon/40"
        >
          <Star className="h-5 w-5 fill-beacon text-beacon" /> {points}
        </Pressable>
      </header>

      {/* hero — Skipper greets the child and shares a thought */}
      <div className="mt-1 flex shrink-0 items-center gap-3">
        <div className="shrink-0">
          <LanternBuddy mood={dayDone ? "cheer" : "happy"} accent={accent} size={100} reducedMotion={settings.reducedMotion} cheerKey={totalDone} />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-[clamp(20px,4.6vw,28px)] font-extrabold leading-tight text-harbor">
            {greetingFor(child.name, now)}
          </h1>
          <SkipperSays
            name={child.name}
            hour={now.getHours()}
            done={totalDone}
            total={totalSteps}
            night={now.getHours() >= 20 || now.getHours() < 6}
            aiLines={state.skipperLines?.[childId]?.lines}
            reducedMotion={settings.reducedMotion}
            className="mt-1.5"
          />
        </div>
      </div>

      {/* tiles — fill the rest of the screen; responsive columns so it fits any tablet, with a
          gentle scroll only if a big crew has many routines. */}
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
      <div className="grid content-start gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        {routines.map((r) => {
          const w = routineWindow(state, r, childId, tz);
          const p = routineProgress(state, r, done);
          const t = routineTheme(r.name, r.type);
          const suggested = r.id === nowId && !p.complete;
          const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
          return (
            <Pressable
              key={r.id}
              haptics={settings.haptics}
              sound={settings.sound}
              intensity={settings.intensity}
              onClick={() => onOpenRoutine(r.id)}
              className={cn(
                "kiosk-tap flex min-h-[118px] flex-col rounded-[22px] p-4 text-left transition active:scale-[0.98]",
                suggested && "ring-2 ring-offset-2",
              )}
              style={{ background: t.bg, color: t.fg, "--tw-ring-color": suggested ? t.fg : undefined } as React.CSSProperties}
            >
              <div className="flex items-start justify-between">
                <span className="text-4xl leading-none">{t.emoji}</span>
                {suggested && (
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-bold" style={{ color: t.fg }}>
                    Start here
                  </span>
                )}
              </div>
              <p className="mt-2 font-display text-xl font-extrabold" style={{ color: t.fg }}>
                {r.name}
              </p>
              <div className="mt-auto pt-2">
                {p.complete ? (
                  <span className="inline-flex items-center gap-1 text-sm font-bold" style={{ color: t.fg }}>
                    <Check className="h-4 w-4" strokeWidth={3} /> All done!
                  </span>
                ) : w.kind === "upcoming" ? (
                  <span className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: t.fg }}>
                    <Clock className="h-3.5 w-3.5" />{" "}
                    {w.untilOpenMin != null ? `Opens in ${formatCountdown(w.untilOpenMin)}` : (w.opensAt ?? "Later")}
                  </span>
                ) : (
                  <>
                    <div className="h-2 overflow-hidden rounded-full" style={{ background: t.soft }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: t.fg }} />
                    </div>
                    <p className="mt-1.5 text-sm font-semibold" style={{ color: t.fg }}>
                      {w.kind === "catchup" && p.done === 0 ? "Let's catch up!" : `${p.done} of ${p.total} done`}
                    </p>
                  </>
                )}
              </div>
            </Pressable>
          );
        })}

        {chores.length > 0 && (
          <Pressable
            haptics={settings.haptics}
            sound={settings.sound}
            intensity={settings.intensity}
            onClick={onOpenChores}
            className="kiosk-tap flex min-h-[118px] flex-col rounded-[22px] p-4 text-left transition active:scale-[0.98]"
            style={{ background: "#fbeaf0", color: "#993556" }}
          >
            <span className="text-4xl leading-none">🧹</span>
            <p className="mt-2 font-display text-xl font-extrabold text-[#993556]">Chores</p>
            <div className="mt-auto pt-2">
              {choresDone >= chores.length ? (
                <span className="inline-flex items-center gap-1 text-sm font-bold text-[#993556]">
                  <Check className="h-4 w-4" strokeWidth={3} /> All done!
                </span>
              ) : (
                <p className="text-sm font-semibold text-[#993556]">{chores.length - choresDone} to do</p>
              )}
            </div>
          </Pressable>
        )}

        {/* Take a break — always one tap away (§6.1). Full width if it lands on its own row. */}
        <Pressable
          haptics={settings.haptics}
          sound={settings.sound}
          intensity={settings.intensity}
          fx="break"
          onClick={onBreak}
          className="kiosk-tap flex min-h-[92px] flex-col justify-center gap-2 rounded-[22px] p-4 text-left transition active:scale-[0.98]"
          style={{ background: "#eef1fb", color: "#3c3489" }}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/70">
            <Wind className="h-6 w-6 text-[#534ab7]" />
          </span>
          <div>
            <p className="font-display text-lg font-extrabold text-[#3c3489]">I need a break</p>
            <p className="text-sm font-medium text-[#534ab7]">Anytime you need</p>
          </div>
        </Pressable>
      </div>
      </div>
    </div>
  );
}
