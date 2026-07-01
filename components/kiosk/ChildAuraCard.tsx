"use client";

import { Check } from "lucide-react";
import type { KioskChild } from "@/lib/kiosk/types";
import type { ChildDayStatus } from "@/lib/kiosk/childStatus";
import { childColor } from "@/lib/kiosk/colors";
import { accentRamp } from "@/lib/kiosk/accent";
import { ChildAvatar } from "./ChildAvatar";
import { StreakBadge } from "./StreakBadge";
import { Pressable } from "./Pressable";
import { cn } from "@/lib/cn";

/** FAMILY hub hero (Kiosk Overhaul §6.2): a child's whole day, one glance, one tap.
 *  Avatar in a progress ring filled in their accent; glance status; next-thing hint;
 *  accent glow when active; check when done. The whole card is the tap target. */
export function ChildAuraCard({
  child,
  status,
  streak = 0,
  haptics = true,
  onSelect,
}: {
  child: KioskChild;
  status: ChildDayStatus;
  streak?: number;
  haptics?: boolean;
  onSelect: () => void;
}) {
  const color = childColor(child);
  const ramp = accentRamp(color);
  const active = status.state === "active" || status.state === "anchor";
  const done = status.state === "done";
  const deg = Math.round((status.pct / 100) * 360);

  const glance =
    status.state === "anchor"
      ? "in the calm corner 💜"
      : status.state === "reset"
        ? "on a reset day"
        : status.state === "done"
          ? "all done 🎉"
          : status.state === "upcoming"
            ? (status.routineName ?? "routine") + " is resting"
            : status.state === "active"
              ? `${status.done} of ${status.total} done`
              : "nothing today";

  return (
    <Pressable
      haptics={haptics}
      fx="navigate-in"
      onClick={onSelect}
      aria-label={`${child.name} — ${glance}`}
      className={cn(
        "kiosk-tap-xl mat-obsidian flex w-full flex-col items-center gap-3 rounded-2xl p-5 text-center transition",
      )}
      style={
        active
          ? { boxShadow: `0 0 0 1.5px ${ramp.line}, var(--lumen-raised), 0 0 48px -8px ${ramp.glow}` }
          : undefined
      }
    >
      <span className="relative inline-flex items-center justify-center">
        <span
          className="inline-flex items-center justify-center rounded-full p-[4px]"
          style={{ background: status.hasTasks ? `conic-gradient(${color} ${deg}deg, rgba(255,255,255,0.08) 0deg)` : "rgba(255,255,255,0.08)" }}
        >
          <span className="rounded-full bg-kpanel p-[3px]">
            <ChildAvatar child={child} size={84} rounded="rounded-full" />
          </span>
        </span>
        {done && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white ring-4 ring-kpanel">
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
        )}
        {streak >= 2 && (
          <span className="absolute -right-1 -top-1">
            <StreakBadge count={streak} compact />
          </span>
        )}
      </span>

      <div className="min-w-0">
        <p className="truncate font-display text-xl font-bold text-ktext">{child.name}</p>
        <p
          className="mt-0.5 text-sm font-medium"
          style={{ color: status.state === "done" ? "#6ee7b7" : active ? ramp.text : "var(--color-kmute)" }}
        >
          {glance}
        </p>
        {status.state === "active" && status.nextLabel && (
          <p className="mt-1 truncate text-sm text-kmute">
            next: <span className="text-ktext/85">{status.nextLabel}</span>
          </p>
        )}
        {status.state === "upcoming" && status.opensLabel && (
          <p className="mt-1 truncate text-sm text-amber-300/90">{status.opensLabel}</p>
        )}
      </div>
    </Pressable>
  );
}
