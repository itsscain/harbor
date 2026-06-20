"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export function TransitionTimer({
  seconds,
  label = "Get ready…",
  onClose,
}: {
  seconds: number;
  label?: string;
  onClose: () => void;
}) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);

  const pct = Math.max(0, left / seconds);
  const R = 130;
  const C = 2 * Math.PI * R;
  const mins = Math.floor(left / 60);
  const secs = left % 60;
  const done = left <= 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-harbor px-6 text-white">
      <button
        onClick={onClose}
        className="kiosk-tap absolute right-5 top-5 rounded-full bg-white/15 p-3"
        aria-label="Close timer"
      >
        <X className="h-6 w-6" />
      </button>

      <p className="mb-8 font-display text-3xl font-extrabold">
        {done ? "All done!" : label}
      </p>

      <div className="relative h-80 w-80">
        <svg viewBox="0 0 300 300" className="h-full w-full -rotate-90">
          <circle cx="150" cy="150" r={R} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="18" />
          <circle
            cx="150"
            cy="150"
            r={R}
            fill="none"
            stroke="#F6B23D"
            strokeWidth="18"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct)}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-display text-6xl font-extrabold tabular-nums">
            {done ? "✓" : `${mins}:${String(secs).padStart(2, "0")}`}
          </span>
        </div>
      </div>

      {done && (
        <button
          onClick={onClose}
          className="kiosk-tap mt-10 rounded-2xl bg-beacon px-10 py-5 text-xl font-bold text-harbor active:scale-95"
        >
          Done
        </button>
      )}
    </div>
  );
}
