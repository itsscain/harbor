"use client";

import { useEffect, useState } from "react";
import { LighthouseMark } from "@/components/brand/Logo";

type BriefMeal = { title: string; emoji: string | null; meal_type: string };

/** Idle screensaver: a soft clock + greeting over a gentle photo slideshow
 *  (cross-fades), plus today's meals and an AI daily brief. Any tap wakes it. */
export function Screensaver({
  photos,
  onWake,
  deviceSecret,
}: {
  photos: string[];
  onWake: () => void;
  deviceSecret?: string;
}) {
  const [now, setNow] = useState(() => new Date());
  const [idx, setIdx] = useState(0);
  const [brief, setBrief] = useState<string | null>(null);
  const [meals, setMeals] = useState<BriefMeal[]>([]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(id);
  }, []);

  // Pull today's meals + the cached AI brief (server keeps the key; generated
  // at most once/day). Silently no-ops offline or without AI configured.
  useEffect(() => {
    if (!deviceSecret) return;
    const d = new Date();
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    let alive = true;
    fetch("/api/ai/brief", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ device_secret: deviceSecret, date, tzOffsetMinutes: d.getTimezoneOffset() }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive || !data) return;
        setBrief(typeof data.brief === "string" ? data.brief : null);
        setMeals(Array.isArray(data.meals) ? data.meals : []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [deviceSecret]);

  const dinner = meals.find((m) => m.meal_type === "dinner") ?? meals[0];

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
        <p className="mt-6 font-display text-6xl font-bold tabular-nums sm:text-8xl">
          {now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </p>
        <p className="mt-2 text-xl text-kmute">{greeting}</p>

        {(dinner || brief) && (
          <div className="mt-8 w-[min(34rem,86vw)] space-y-2.5 text-center">
            {dinner && (
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-base text-white/90 ring-1 ring-white/15 backdrop-blur-sm">
                <span className="text-xl">{dinner.emoji ?? "🍽️"}</span>
                <span>
                  <span className="text-white/60">Tonight: </span>
                  {dinner.title}
                </span>
              </div>
            )}
            {brief && (
              <p className="text-pretty text-lg leading-relaxed text-white/85">{brief}</p>
            )}
          </div>
        )}

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
      <span className="font-display text-3xl font-bold tabular-nums text-white/25">
        {now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
      </span>
    </button>
  );
}
