"use client";

import { useEffect, useRef, useState } from "react";
import type { useKiosk } from "./useKiosk";
import { OutpostShell } from "./OutpostShell";
import { VoiceButton } from "./VoiceButton";
import { childColor } from "@/lib/kiosk/colors";
import { intensityOf } from "@/lib/kiosk/motion";

type Kiosk = ReturnType<typeof useKiosk>;

function inQuietHours(start?: string, end?: string, d = new Date()): boolean {
  if (!start || !end) return false;
  const cur = d.getHours() * 60 + d.getMinutes();
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  if (s === e) return false;
  return s < e ? cur >= s && cur < e : cur >= s || cur < e; // overnight-aware
}

/** The Lantern (HARBOR_LANTERN_DEVICE.md) — the single-child experience (reusing the Outpost
 *  child world) plus the personal-device layer: private tap-to-talk voice (§6.2) and a calm
 *  bedside clock / nightlight (§5) that rests when idle and dims at night. Anchor + the Voyage
 *  come for free from the reused ChildView. */
export function LanternShell({ kiosk, childId }: { kiosk: Kiosk; childId: string }) {
  const { state } = kiosk;
  const [resting, setResting] = useState(false);
  const [anchorActive, setAnchorActive] = useState(false);
  const lastActivity = useRef(Date.now());

  const child = state?.snapshot.children.find((c) => c.id === childId);
  const settings = (child?.settings ?? {}) as Record<string, unknown>;
  const accent = child ? childColor(child) : "#18606f";
  const intensity = intensityOf(settings.sensory);

  // This device's settings override the household defaults (idle + quiet hours).
  const eff = {
    ...((state?.snapshot.household.settings ?? {}) as Record<string, unknown>),
    ...(kiosk.deviceSettings ?? {}),
  } as Record<string, unknown>;
  const idleMs = ((eff.idleSeconds as number) || 90) * 1000;
  const quietStart = eff.quietStart as string | undefined;
  const quietEnd = eff.quietEnd as string | undefined;

  // Idle → rest as the bedside clock; any input wakes. Never rest mid-Anchor (§9.1) so
  // co-regulation is never interrupted.
  useEffect(() => {
    const onActivity = () => {
      lastActivity.current = Date.now();
      setResting((r) => (r ? false : r));
    };
    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("touchstart", onActivity, { passive: true });
    const id = window.setInterval(() => {
      if (anchorActive) return;
      if (Date.now() - lastActivity.current > idleMs) setResting(true);
    }, 5000);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("touchstart", onActivity);
    };
  }, [anchorActive, idleMs]);

  if (!state || !child) {
    // OutpostShell renders its own "this room device needs a grown-up" state.
    return <OutpostShell kiosk={kiosk} childId={childId} onAnchorActive={setAnchorActive} />;
  }

  const night = inQuietHours(quietStart, quietEnd);
  const voiceChild = settings.voiceChat === true ? childId : null;

  return (
    <div className="min-h-full">
      <OutpostShell kiosk={kiosk} childId={childId} onAnchorActive={setAnchorActive} />

      {/* Private tap-to-talk voice (§6.2), a Lantern differentiator Buddy lacks — but ONLY
          when THIS child's voice chat is on, which routes to the bounded, child-scoped
          /api/ai/voice. A Lantern must never expose the whole-household "Hey Harbor" command
          channel (childId=null → /api/ai/command), which can read/mutate siblings' data and
          would defeat the single-child isolation (§7). No voiceChat → no mic. */}
      {!resting && state.deviceSecret && voiceChild && (
        <VoiceButton deviceSecret={state.deviceSecret} childId={voiceChild} onActed={() => void kiosk.syncNow()} />
      )}

      {/* Bedside resting state (§5): a calm, glanceable clock + soft nightlight; dims at night. */}
      {resting && (
        <LanternClock
          accent={accent}
          intensity={intensity}
          night={night}
          name={child.name}
          onWake={() => {
            lastActivity.current = Date.now();
            setResting(false);
          }}
        />
      )}
    </div>
  );
}

/** The bedside clock (§5): a luminous, glanceable time face suffused with the child's accent,
 *  with a soft nightlight glow. Dims at night; tap anywhere to wake into the day. */
function LanternClock({
  accent,
  intensity,
  night,
  name,
  onWake,
}: {
  accent: string;
  intensity: number;
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
  const time = `${h12}:${String(m).padStart(2, "0")}`;
  const dateStr = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const glowAlpha = night ? "1f" : "33"; // hex alpha on the accent

  return (
    <button
      onClick={onWake}
      aria-label="Wake the Lantern"
      className="kiosk-tap fixed inset-0 z-40 flex flex-col items-center justify-center overflow-hidden bg-kbg text-ktext"
    >
      {/* soft nightlight glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(58% 48% at 50% 42%, ${accent}${glowAlpha}, transparent 72%)`,
          opacity: Math.max(0.4, intensity),
        }}
      />
      <div className="relative flex flex-col items-center transition-opacity" style={{ opacity: night ? 0.55 : 1 }}>
        <p
          className="font-display font-bold leading-none tabular-nums text-ktext"
          style={{ fontSize: "clamp(72px, 22vw, 176px)", textShadow: `0 0 44px ${accent}66` }}
        >
          {time}
          <span className="ml-3 align-top text-2xl font-semibold text-kmute sm:text-3xl">{am ? "AM" : "PM"}</span>
        </p>
        <p className="mt-3 text-lg font-medium text-kmute sm:text-xl">{dateStr}</p>
        <p className="mt-12 text-sm text-kmute/70">
          {night ? `Good night, ${name} 🌙` : `Tap to see your day, ${name}`}
        </p>
      </div>
    </button>
  );
}
