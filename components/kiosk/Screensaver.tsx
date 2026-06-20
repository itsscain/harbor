"use client";

import { useEffect, useState } from "react";
import { LighthouseMark } from "@/components/brand/Logo";

/** Idle screensaver: a soft clock + greeting (and optional family photo). Any
 *  tap wakes it. Pure on-device; works offline. */
export function Screensaver({
  photoUrl,
  onWake,
}: {
  photoUrl?: string | null;
  onWake: () => void;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(id);
  }, []);

  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <button
      onClick={onWake}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-harbor text-white"
      aria-label="Tap to wake"
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
      ) : (
        <div className="absolute inset-0 beacon-ring opacity-40" aria-hidden />
      )}
      <div className="relative flex flex-col items-center">
        <LighthouseMark className="h-12 w-12 animate-beacon text-white/90" />
        <p className="mt-6 font-display text-7xl font-extrabold tabular-nums sm:text-8xl">
          {now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </p>
        <p className="mt-2 text-xl text-seafoam">{greeting}</p>
        <p className="mt-10 text-sm text-seafoam/70">Tap anywhere to begin</p>
      </div>
    </button>
  );
}
