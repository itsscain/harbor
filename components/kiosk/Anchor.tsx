"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Mic, Loader2 } from "lucide-react";
import { haptic, HAPTIC, speak, stopSpeaking, play } from "@/lib/kiosk/feedback";
import { useTapToTalk } from "@/lib/kiosk/useTapToTalk";
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

const STRATEGIES = [
  { emoji: "🤲", text: "Squeeze your hands tight… then let them go soft." },
  { emoji: "👀", text: "Name three things you can see right now." },
  { emoji: "🐢", text: "Push your feet into the floor, slow and steady." },
  { emoji: "💧", text: "Take a slow sip of water." },
  { emoji: "🫧", text: "Blow out like you're cooling warm soup." },
];

const FEELINGS = [
  { emoji: "😡", label: "Mad", big: true },
  { emoji: "😢", label: "Sad", big: false },
  { emoji: "😟", label: "Scared", big: true },
  { emoji: "🫨", label: "Too much", big: true },
  { emoji: "😴", label: "Tired", big: false },
  { emoji: "🙂", label: "Okay", big: false },
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
  onSoften,
  deviceSecret,
  childId,
  voiceChat = false,
}: {
  childName: string;
  accent: string;
  haptics: boolean;
  readAloud: boolean;
  reducedMotion: boolean;
  sound?: boolean;
  onClose: () => void;
  onFeeling?: (feeling: string) => void;
  /** Called when the child is still dysregulated at re-entry → auto-soften the day. */
  onSoften?: () => void;
  /** AI-led co-regulation (Voice §3.2): when voiceChat is on, the child can talk and Harbor
   *  leads adaptive, bounded co-regulation (distress → escalates to the parent). */
  deviceSecret?: string;
  childId?: string;
  voiceChat?: boolean;
}) {
  const [stage, setStage] = useState<"breathe" | "feelings" | "strategy" | "done">("breathe");
  const [strategy] = useState(() => STRATEGIES[Math.floor(Math.random() * STRATEGIES.length)]);
  const [pi, setPi] = useState(0);
  const [breaths, setBreaths] = useState(0);
  const phase = PHASES[pi];

  // AI-led co-regulation (Voice §3.2) — the child can talk; Harbor leads bounded, adaptive
  // co-regulation through /api/ai/voice (anchor mode), and distress escalates to the parent.
  const aiOn = voiceChat && !!deviceSecret && !!childId;
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSaid, setAiSaid] = useState<string | null>(null);
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [aiDistress, setAiDistress] = useState(false);

  const runAnchorVoice = useCallback(
    async (text: string) => {
      if (!deviceSecret || !childId) return;
      setAiBusy(true);
      setAiSaid(text);
      setAiReply(null);
      try {
        const res = await fetch("/api/ai/voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device_secret: deviceSecret, child_id: childId, text, anchor: true }),
        });
        const data = (await res.json().catch(() => ({}))) as { speech?: string; distress?: boolean; disabled?: boolean };
        const reply = data.speech || (data.disabled ? "" : "I'm right here with you.");
        if (reply) {
          setAiReply(reply);
          stopSpeaking(); // don't talk over a breathing cue
          speak(reply);
        }
        if (data.distress) {
          setAiDistress(true);
          onSoften?.(); // a hard moment → soften the rest of the day too
        }
      } catch {
        const fb = "Let's just breathe together.";
        setAiReply(fb);
        stopSpeaking();
        speak(fb);
      } finally {
        setAiBusy(false);
      }
    },
    [deviceSecret, childId, onSoften],
  );
  const talk = useTapToTalk(runAnchorVoice);

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
    if (readAloud) speak("Welcome back", true);
  }

  const scale = reducedMotion ? 0.8 : phase.scale;

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="anchor-veil fixed inset-0 z-[80] flex flex-col items-center justify-center overflow-hidden px-6 text-center backdrop-blur-2xl"
      style={{
        // A translucent calming-blue veil (desaturated toward blue per §9.1), so the
        // receded world is faintly visible behind — the cinematic "fade back."
        background:
          "radial-gradient(120% 100% at 50% 28%, rgba(60,124,148,0.34), rgba(10,22,34,0.80) 52%, rgba(7,13,22,0.92))",
      }}
    >
      {/* §5.7 — the deep water rises to fill the screen as the world dissolves away. */}
      <div className="anchor-water" aria-hidden />

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
          {/* Lumen §10.4 — concentric rings of soft light expanding and contracting like a
              slow water ripple meeting a lighthouse-beam pulse: a warm luminous core that
              swells on the inhale and settles on the exhale, calming-blue rings rippling
              out behind it (staggered, follow-through §7.2). The most intentional element. */}
          <div className="relative flex h-80 w-80 items-center justify-center">
            {/* §5.7 — slow water ripples rolling out behind the core (the living-water quality) */}
            {!reducedMotion &&
              [0, 1, 2].map((i) => (
                <span
                  key={`rip${i}`}
                  className="anchor-ripple"
                  aria-hidden
                  style={{ width: 160, height: 160, ["--rip-delay" as string]: `${i * 2.3}s` }}
                />
              ))}
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="absolute rounded-full"
                aria-hidden
                style={{
                  width: 150 + i * 50,
                  height: 150 + i * 50,
                  border: "1.5px solid rgba(150, 200, 225, 1)",
                  opacity: 0.46 - i * 0.1,
                  boxShadow: "0 0 26px -8px rgba(150,200,225,.9)",
                  transform: `scale(${scale})`,
                  transition: reducedMotion
                    ? "none"
                    : `transform ${phase.secs}s var(--ease-harbor-calm) ${i * 0.12}s, opacity ${phase.secs}s var(--ease-harbor-calm)`,
                }}
              />
            ))}
            <span
              className="rounded-full"
              aria-hidden
              style={{
                width: 150,
                height: 150,
                background: `radial-gradient(circle at 50% 32%, #fff6e8 0%, ${accent} 46%, ${accent}66 72%, transparent 84%)`,
                transform: `scale(${scale})`,
                transition: reducedMotion ? "none" : `transform ${phase.secs}s var(--ease-harbor-calm)`,
                boxShadow: `0 0 72px -8px ${accent}, 0 0 150px -28px rgba(150,200,225,.55)`,
              }}
            />
          </div>
          <p className="mt-10 text-lg text-white/50">
            Breath {Math.min(breaths + 1, BREATHS)} of {BREATHS}
          </p>

          {aiOn && talk.supported && (
            <div className="mt-6 flex flex-col items-center gap-2.5">
              {(talk.interim || aiSaid || aiReply) && (
                <div className="max-w-md rounded-2xl bg-white/8 px-4 py-2.5 text-center ring-1 ring-white/10">
                  {(talk.interim || aiSaid) && <p className="text-sm text-white/55">{talk.interim || aiSaid}</p>}
                  {aiReply && (
                    <p className={"mt-0.5 text-base " + (aiDistress ? "text-amber-200" : "text-white/90")}>{aiReply}</p>
                  )}
                </div>
              )}
              <button
                onClick={() => talk.start()}
                disabled={talk.listening || aiBusy}
                aria-label="Talk to Harbor"
                className="kiosk-tap flex items-center gap-2 rounded-full bg-white/12 px-5 py-3 text-base font-semibold text-white ring-1 ring-white/20 active:scale-95 disabled:opacity-70"
              >
                {aiBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Mic className="h-5 w-5" />}
                {talk.listening ? "Listening…" : aiBusy ? "…" : "Talk to me"}
              </button>
            </div>
          )}

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
                  if (f.big) onSoften?.();
                  setStage("strategy");
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

      {stage === "strategy" && (
        <>
          <p className="mb-2 font-display text-2xl font-bold text-white sm:text-3xl">One thing that can help</p>
          <p className="mb-8 text-white/55">Try this with me — or tap ready.</p>
          <div className="flex max-w-md flex-col items-center gap-4 rounded-3xl bg-white/8 p-8 ring-1 ring-white/10">
            <span className="text-6xl leading-none">{strategy.emoji}</span>
            <p className="text-pretty text-xl font-medium leading-relaxed text-white/90">{strategy.text}</p>
          </div>
          <button
            onClick={finish}
            className="kiosk-tap mt-9 rounded-full bg-white/15 px-10 py-4 font-display text-lg font-bold text-white active:scale-95"
          >
            I&apos;m ready
          </button>
        </>
      )}

      {stage === "done" && (
        <>
          {/* §5.7 — warmth + color flow back in. */}
          <div className="anchor-warm" aria-hidden />
          {!reducedMotion && <Confetti count={20} accent={accent} />}
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
