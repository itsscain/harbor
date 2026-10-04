"use client";

import { GraduationCap, Sun } from "lucide-react";
import { cn } from "@/lib/cn";

export type WallMode = "day" | "learn";

/** The "My Day | Learn" switch at the top of a child's wall screen — one tap (or a swipe) flips
 *  between their routines and Harbor Learn. A small badge on Learn says something's waiting. */
export function ModeSwitch({ mode, onChange, tone, badge }: { mode: WallMode; onChange: (m: WallMode) => void; tone: "dark" | "light"; badge?: number | "dot" | null }) {
  const light = tone === "light";
  const seg = (m: WallMode, icon: React.ReactNode, label: string) => {
    const on = mode === m;
    return (
      <button
        type="button"
        role="tab"
        aria-selected={on}
        onClick={() => !on && onChange(m)}
        className={cn(
          "kiosk-tap relative z-[1] flex h-11 items-center justify-center gap-2 rounded-full px-4 font-display text-[17px] font-bold transition-colors duration-200 sm:px-5",
          on ? (light ? "text-[var(--l-ink)]" : "text-[#0c2233]") : light ? "text-white" : "text-ktext/80",
        )}
      >
        {icon}
        {label}
        {m === "learn" && badge && !on && (
          <span className={cn("absolute -right-1 -top-1 flex items-center justify-center rounded-full bg-[#ffc83d] font-display font-extrabold text-[#5a3b00] ring-2", light ? "ring-white" : "ring-[#0c2233]", badge === "dot" ? "h-3.5 w-3.5" : "h-6 min-w-6 px-1.5 text-sm")}>
            {badge === "dot" ? "" : badge}
          </span>
        )}
      </button>
    );
  };
  return (
    <div role="tablist" aria-label="My Day or Learn" className={cn("relative grid grid-cols-2 items-center rounded-full p-1", light ? "bg-white/30 shadow-[inset_0_2px_0_rgba(0,40,80,0.12)]" : "bg-white/12 ring-1 ring-white/10")}>
      {/* sliding pill */}
      <span
        aria-hidden
        className={cn("absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-full transition-transform duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)]", light ? "bg-white shadow-[0_3px_0_rgba(0,40,80,0.15)]" : "bg-white")}
        style={{ left: 4, transform: mode === "learn" ? "translateX(100%)" : "none" }}
      />
      {seg("day", <Sun className="h-5 w-5" strokeWidth={2.6} />, "My Day")}
      {seg("learn", <GraduationCap className="h-5 w-5" strokeWidth={2.6} />, "Learn")}
    </div>
  );
}
