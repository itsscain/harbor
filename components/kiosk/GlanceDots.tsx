"use client";

import { Check, Heart } from "lucide-react";
import type { KioskChild } from "@/lib/kiosk/types";
import type { ChildDayStatus } from "@/lib/kiosk/childStatus";
import { childColor } from "@/lib/kiosk/colors";
import { ChildAvatar } from "./ChildAvatar";

/** AMBIENT glance dots (Kiosk Overhaul §5.4) — a parent's across-the-room read of
 *  every kid's status, no interaction needed. Each child's accent encodes state via
 *  the ring + glyph: partial ring = on a routine · full + check = done · heart = in
 *  Anchor · hollow/dim = nothing or a reset day. Tapping a dot wakes into that CHILD. */
export function GlanceDots({
  children,
  statusFor,
  onSelect,
}: {
  children: KioskChild[];
  statusFor: (id: string) => ChildDayStatus;
  onSelect: (id: string) => void;
}) {
  if (children.length === 0) return null;
  return (
    <div className="flex flex-wrap items-start justify-center gap-x-6 gap-y-4">
      {children.map((c) => {
        const st = statusFor(c.id);
        const color = childColor(c);
        const ringDeg = st.state === "done" ? 360 : st.state === "active" || st.state === "reset" ? Math.round((st.pct / 100) * 360) : 0;
        const dim = st.state === "idle";
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            aria-label={`Open ${c.name}`}
            className="kiosk-tap flex flex-col items-center gap-1.5"
          >
            <span
              className="relative inline-flex items-center justify-center rounded-full p-[3px]"
              style={{
                background: ringDeg > 0 ? `conic-gradient(${color} ${ringDeg}deg, rgba(255,255,255,0.10) 0deg)` : "transparent",
                boxShadow: dim ? undefined : `0 0 16px -5px ${color}`,
              }}
            >
              <span className="rounded-full bg-kbg2 p-[2px]" style={dim ? { boxShadow: `inset 0 0 0 2px ${color}55` } : undefined}>
                <ChildAvatar child={c} size={42} rounded="rounded-full" className={dim ? "opacity-50" : undefined} />
              </span>
              {st.state === "done" && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-kbg2">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
              {st.state === "anchor" && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-white ring-2 ring-kbg2">
                  <Heart className="h-3 w-3" fill="currentColor" />
                </span>
              )}
            </span>
            <span className="text-sm font-medium text-white/70">{c.name}</span>
          </button>
        );
      })}
    </div>
  );
}
