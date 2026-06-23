"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { chime, haptic } from "@/lib/kiosk/feedback";

const TREATS = ["⭐", "🌟", "✨", "🎈", "🫧", "🍪", "🦄", "🌈", "🍭", "🎉", "🐢", "🦊"];
const DURATION = 35; // capped fun — 35s, then it's done

type Bubble = { id: number; emoji: string; x: number; y: number; size: number };

/** A short reward minigame ("Star Catch") kids unlock by finishing everything.
 *  Tap the floating treats for 35 seconds. Self-contained; no real points so it
 *  can't be farmed — it's pure celebration. */
export function MiniGame({ childName, onClose }: { childName: string; onClose: () => void }) {
  const [time, setTime] = useState(DURATION);
  const [score, setScore] = useState(0);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [done, setDone] = useState(false);
  const idRef = useRef(0);
  const timers = useRef<number[]>([]);

  // Countdown.
  useEffect(() => {
    if (done) return;
    if (time <= 0) {
      setDone(true);
      return;
    }
    const t = setTimeout(() => setTime((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [time, done]);

  // Spawn treats; each removes itself after its life (works under reduced-motion).
  useEffect(() => {
    if (done) return;
    const spawn = setInterval(() => {
      idRef.current += 1;
      const id = idRef.current;
      const b: Bubble = {
        id,
        emoji: TREATS[Math.floor(Math.random() * TREATS.length)],
        x: 8 + Math.random() * 84,
        y: 16 + Math.random() * 70,
        size: 46 + Math.round(Math.random() * 40),
      };
      setBubbles((bs) => [...bs.slice(-9), b]);
      const t = window.setTimeout(() => setBubbles((bs) => bs.filter((x) => x.id !== id)), 3200);
      timers.current.push(t);
    }, 600);
    return () => {
      clearInterval(spawn);
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [done]);

  function pop(b: Bubble) {
    setScore((s) => s + 1);
    setBubbles((bs) => bs.filter((x) => x.id !== b.id));
    chime(true);
    haptic(15, true);
  }

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[70] overflow-hidden bg-gradient-to-b from-[#0b1320] via-[#10202a] to-[#0c1014] text-white"
    >
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4">
        <span className="rounded-full bg-white/12 px-4 py-2 font-display text-xl font-bold tabular-nums">⏱ {time}s</span>
        <span className="rounded-full bg-beacon/20 px-4 py-2 font-display text-xl font-bold text-beacon tabular-nums">⭐ {score}</span>
        <button onClick={onClose} aria-label="Close game" className="kiosk-tap rounded-full bg-white/12 p-2 active:scale-95">
          <X className="h-6 w-6" />
        </button>
      </div>

      {!done ? (
        <>
          {time === DURATION && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <p className="animate-pop font-display text-3xl font-bold text-white/90">Catch the stars! ✨</p>
            </div>
          )}
          {bubbles.map((b) => (
            <button
              key={b.id}
              onClick={() => pop(b)}
              aria-label="treat"
              className="animate-bubble absolute select-none leading-none active:scale-90"
              style={{ left: `${b.x}%`, top: `${b.y}%`, fontSize: b.size }}
            >
              {b.emoji}
            </button>
          ))}
        </>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
          <span className="animate-pop text-8xl">🎉</span>
          <p className="font-display text-4xl font-bold">Nice one, {childName}!</p>
          <p className="text-2xl text-seafoam">
            You caught {score} {score === 1 ? "star" : "stars"}!
          </p>
          <button
            onClick={onClose}
            className="kiosk-tap mt-4 rounded-full bg-kwater px-10 py-4 font-display text-lg font-bold text-harbor transition active:scale-95"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
