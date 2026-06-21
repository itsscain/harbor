"use client";

import { useEffect, useState } from "react";
import { LighthouseMark } from "@/components/brand/Logo";

/** Idle screensaver: a soft clock + greeting over a gentle photo slideshow
 *  (cross-fades). Any tap wakes it. Pure on-device; works offline once cached. */
export function Screensaver({
  photos,
  onWake,
}: {
  photos: string[];
  onWake: () => void;
}) {
  const [now, setNow] = useState(() => new Date());
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (photos.length < 2) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % photos.length), 12000);
    return () => clearInterval(id);
  }, [photos.length]);

  const safeIdx = photos.length ? idx % photos.length : 0;
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <button
      onClick={onWake}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-kbg2 text-white"
      aria-label="Tap to wake"
    >
      {photos.length > 0 ? (
        photos.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src + i}
            src={src}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000"
            style={{ opacity: i === safeIdx ? 0.45 : 0 }}
          />
        ))
      ) : (
        <div className="absolute inset-0 beacon-ring opacity-40" aria-hidden />
      )}
      <div className="relative flex flex-col items-center">
        <LighthouseMark className="h-12 w-12 animate-beacon text-white/90" />
        <p className="mt-6 font-display text-7xl font-extrabold tabular-nums sm:text-8xl">
          {now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </p>
        <p className="mt-2 text-xl text-kmute">{greeting}</p>
        <p className="mt-10 text-sm text-kmute/80">Tap anywhere to begin</p>
      </div>
    </button>
  );
}

/** Night sleep mode: near-black, very dim clock so the wall isn't a glowing
 *  screen at night. Any tap wakes it. */
export function SleepMode({ onWake }: { onWake: () => void }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  return (
    <button
      onClick={onWake}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black"
      aria-label="Tap to wake"
    >
      <span className="font-display text-5xl font-bold tabular-nums text-white/25">
        {now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
      </span>
    </button>
  );
}
