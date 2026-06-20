"use client";

import { useState } from "react";
import { Delete } from "lucide-react";
import { cn } from "@/lib/cn";

/** Reusable numeric PIN pad. Calls onComplete when `length` digits are entered. */
export function PinPad({
  onComplete,
  length = 4,
  shake = false,
}: {
  onComplete: (pin: string) => void;
  length?: number;
  shake?: boolean;
}) {
  const [pin, setPin] = useState("");

  function press(d: string) {
    if (pin.length >= length) return;
    const next = pin + d;
    setPin(next);
    if (next.length === length) {
      onComplete(next);
      setTimeout(() => setPin(""), 250);
    }
  }

  return (
    <div className={cn("w-full max-w-xs", shake && "animate-[reward-pop_0.3s]")}>
      <div className="mb-6 flex justify-center gap-3">
        {Array.from({ length }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-4 w-4 rounded-full border-2",
              i < pin.length
                ? "border-harbor bg-harbor"
                : "border-harbor/30 bg-transparent",
            )}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => press(String(n))}
            className="kiosk-tap rounded-2xl bg-harbor-50 py-5 text-2xl font-bold text-harbor active:bg-harbor active:text-white"
          >
            {n}
          </button>
        ))}
        <span />
        <button
          type="button"
          onClick={() => press("0")}
          className="kiosk-tap rounded-2xl bg-harbor-50 py-5 text-2xl font-bold text-harbor active:bg-harbor active:text-white"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => setPin((p) => p.slice(0, -1))}
          className="kiosk-tap flex items-center justify-center rounded-2xl py-5 text-harbor active:bg-harbor-50"
          aria-label="Delete"
        >
          <Delete className="h-7 w-7" />
        </button>
      </div>
    </div>
  );
}
