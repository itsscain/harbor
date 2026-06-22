"use client";

import { useState } from "react";
import { Delete } from "lucide-react";
import { cn } from "@/lib/cn";
import { KButton } from "./ui";

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
              "h-4 w-4 rounded-full ring-2 transition",
              i < pin.length
                ? "bg-kwater ring-kwater"
                : "bg-transparent ring-kline/55",
            )}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <KButton
            key={n}
            type="button"
            variant="tonal"
            onClick={() => press(String(n))}
            className="kiosk-tap h-auto py-3.5 text-2xl font-bold active:bg-kwater active:text-harbor"
          >
            {n}
          </KButton>
        ))}
        <span />
        <KButton
          type="button"
          variant="tonal"
          onClick={() => press("0")}
          className="kiosk-tap h-auto py-3.5 text-2xl font-bold active:bg-kwater active:text-harbor"
        >
          0
        </KButton>
        <KButton
          type="button"
          variant="ghost"
          onClick={() => setPin((p) => p.slice(0, -1))}
          className="kiosk-tap h-auto py-3.5"
          aria-label="Delete"
        >
          <Delete className="h-7 w-7" />
        </KButton>
      </div>
    </div>
  );
}
