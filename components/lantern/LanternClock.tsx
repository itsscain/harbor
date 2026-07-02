"use client";

import { useEffect, useState } from "react";

/** The Lantern's bedside clock (§5) — a calm, glanceable flip-clock. Light and lovely by day;
 *  dims to a warm night face during quiet hours, with a soft accent nightlight. Tap to wake. */
export function LanternClock({
  accent,
  night,
  name,
  onWake,
}: {
  accent: string;
  night: boolean;
  name: string;
  onWake: () => void;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 10_000);
    return () => window.clearInterval(id);
  }, []);

  const h = now.getHours();
  const m = now.getMinutes();
  const am = h < 12;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const dateStr = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const bg = night ? "#0d1a2c" : "#fbfdfc";
  const tileBg = night ? "#17273e" : "#ffffff";
  const digit = night ? "#e8f0fb" : "#0c3b47";
  const sub = night ? "#8fa6c4" : "#5c7178";
  const ring = night ? "rgba(255,255,255,.06)" : "#dceaed";

  const tile: React.CSSProperties = {
    background: tileBg,
    color: digit,
    borderRadius: 18,
    padding: "10px 20px",
    fontFamily: "var(--font-display, sans-serif)",
    fontWeight: 800,
    fontSize: "clamp(66px, 20vw, 150px)",
    lineHeight: 1,
    boxShadow: night ? "inset 0 0 0 1px " + ring : "0 10px 26px -16px rgba(12,59,71,.45), inset 0 0 0 1px " + ring,
    fontVariantNumeric: "tabular-nums",
  };

  return (
    <button
      onClick={onWake}
      aria-label="Wake the Lantern"
      className="kiosk-tap fixed inset-0 z-40 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: bg }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(58% 46% at 50% 42%, ${accent}${night ? "33" : "1c"}, transparent 72%)` }}
      />
      <p className="relative text-base font-semibold" style={{ color: sub }}>{dateStr}</p>
      <div className="relative mt-4 flex items-center gap-3">
        <span style={tile}>{h12}</span>
        <span style={{ color: accent, fontWeight: 800, fontSize: "clamp(48px,12vw,96px)" }}>:</span>
        <span style={tile}>{String(m).padStart(2, "0")}</span>
        <span className="self-start font-display text-2xl font-extrabold sm:text-3xl" style={{ color: sub, marginTop: 8 }}>
          {am ? "AM" : "PM"}
        </span>
      </div>
      <p className="relative mt-12 text-sm font-medium" style={{ color: sub }}>
        {night ? `Good night, ${name} 🌙` : `Tap to see your day, ${name}`}
      </p>
    </button>
  );
}
