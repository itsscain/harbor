"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { haptic, HAPTIC, speak, stopSpeaking, play } from "@/lib/kiosk/feedback";
import { Confetti } from "./Confetti";

/** Anchor — the guided co-regulation engine (HARBOR_V2 §9.1.1). The wall recedes,
 *  the child breathes with synchronized visual + breath-paced haptics (and spoken
 *  cues), optionally names a feeling, then a warm, non-shaming re-entry. Reachable
 *  in one tap from any ChildView ("I need a break") and from an active corner.
 *  Co-regulation, never punishment — all copy is warm and present-tense. */

type Phase = { key: "in" | "hold" | "out"; secs: number; label: string; scale: number };
const PHASES: Phase[] = [
  { key: "in", secs: 4, label: "Breathe in…", scale: 1 },
  { key: "hold", secs: 4, label: "Hold…", scale: 1 },
  { key: "out", secs: 4, label: "Breathe out…", scale: 0.55 },
];
const BREATHS = 5;

const FEELINGS = [
  { emoji: "😡", label: "Mad" },
  { emoji: "😢", label: "Sad" },
  { emoji: "😟", label: "Scared" },
  { emoji: "🫨", label: "Too much" },
  { emoji: "😴", label: "Tired" },
  { emoji: "🙂", label: "Okay" },
];

export function Anchor({
  childName,
  accent,
  haptics,
  readAloud,
  reducedMotion,
  sound = true,
  onClose,
  onFeeling,
}: {
  childName: string;
  accent: string;
  haptics: boolean;
  readAloud: boolean;
  reducedMotion: boolean;
  sound?: boolean;
  onClose: () => void;
  onFeeling?: (feeling: string) => void;
}) {
  const [stage, setStage] = useState<"breathe" | "feelings" | "done">("breathe");
  const [pi, setPi] = useState(0);
  const [breaths, setBreaths] = useState(0);
  const phase = PHASES[pi];

  // Drive the breathing cycle. Each phase boundary fires its breath-paced haptic
  // and (once) a spoken cue, then schedules the next phase.
  useEffect(() => {
    if (stage !== "breathe") return;
    const p = PHASES[pi];
    haptic(p.key === "in" ? HAPTIC.breathIn : p.key === "hold" ? HAPTIC.breathHold : HAPTIC.breathOut, haptics);
    if (readAloud) speak(p.label, true);
    const t = setTimeout(() => {
      if (pi === PHASES.length - 1) {
        const n = breaths + 1;
        if (n >= BREATHS) {
          setStage("feelings");
          return;
        }
        setBreaths(n);
        setPi(0);
      } else {
        setPi(pi + 1);
      }
    }, p.secs * 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, pi]);

  useEffect(() => () => stopSpeaking(), []);

  function finish() {
    setStage("done");
    haptic(HAPTIC.arrive, haptics);
    play("arrive", sound);
    if (readAloud) speak(`Welcome back, ${childName}. Fresh start.`, true);
  }

  const scale = reducedMotion ? 0.8 : phase.scale;

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center overflow-hidden px-6 text-center"
      style={{ background: `radial-gradient(120% 100% at 50% 28%, ${accent}22, #0a1622 55%, #070d16)` }}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="kiosk-tap absolute right-4 top-4 rounded-full bg-white/10 p-3 text-white/70 active:scale-95"
      >
        <X className="h-6 w-6" />
      </button>

      {stage === "breathe" && (
        <>
          <p className="mb-10 font-display text-3xl font-semibold text-white/90 sm:text-4xl">{phase.label}</p>
          <div className="relative flex h-72 w-72 items-center justify-center">
            <span className="absolute inset-6 rounded-full" style={{ border: `2px solid ${accent}44` }} />
            <span
              className="rounded-full"
              style={{
                width: 224,
                height: 224,
                background: `radial-gradient(circle at 50% 38%, ${accent}, ${accent}66 58%, transparent 76%)`,
                transform: `scale(${scale})`,
                transition: reducedMotion ? "none" : `transform ${phase.secs}s var(--ease-harbor-calm)`,
                boxShadow: `0 0 90px -10px ${accent}aa`,
              }}
            />
          </div>
          <p className="mt-10 text-lg text-white/50">
            Breath {Math.min(breaths + 1, BREATHS)} of {BREATHS}
          </p>
          <button
            onClick={() => setStage("feelings")}
            className="kiosk-tap mt-5 rounded-full px-6 py-2 text-base text-white/55 hover:underline"
          >
            I&apos;m ready
          </button>
        </>
      )}

      {stage === "feelings" && (
        <>
          <p className="mb-2 font-display text-3xl font-bold text-white sm:text-4xl">How are you feeling, {childName}?</p>
          <p className="mb-8 text-white/55">Any way is okay. Tap one — or just breathe.</p>
          <div className="grid grid-cols-3 gap-4">
            {FEELINGS.map((f) => (
              <button
                key={f.label}
                onClick={() => {
                  onFeeling?.(f.label);
                  finish();
                }}
                className="kiosk-tap flex flex-col items-center gap-2 rounded-2xl bg-white/8 p-5 text-white ring-1 ring-white/10 active:scale-95"
              >
                <span className="text-5xl leading-none">{f.emoji}</span>
                <span className="text-base font-medium">{f.label}</span>
              </button>
            ))}
          </div>
          <button onClick={finish} className="kiosk-tap mt-8 rounded-full px-6 py-2 text-base text-white/55 hover:underline">
            Skip — I just wanted to breathe
          </button>
        </>
      )}

      {stage === "done" && (
        <>
          {!reducedMotion && <Confetti count={20} />}
          <p className="font-display text-5xl font-bold text-white">Welcome back 💙</p>
          <p className="mt-3 text-xl text-white/70">Fresh start, {childName}.</p>
          <button
            onClick={onClose}
            className="kiosk-tap mt-10 rounded-full bg-white/15 px-10 py-4 font-display text-lg font-bold text-white active:scale-95"
          >
            I&apos;m ready
          </button>
        </>
      )}
    </div>
  );
}
