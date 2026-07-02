"use client";

import { useEffect, useRef, useState } from "react";
import { Lock, RefreshCw, LogOut } from "lucide-react";
import type { useKiosk } from "./useKiosk";
import { LanternHome } from "@/components/lantern/LanternHome";
import { LanternRoutineView } from "@/components/lantern/LanternRoutineView";
import { LanternChores } from "@/components/lantern/LanternChores";
import { LanternClock } from "@/components/lantern/LanternClock";
import { Anchor } from "./Anchor";
import { ParentGate } from "./ParentGate";
import { VoiceButton } from "./VoiceButton";
import { IdentifyFlash } from "./IdentifyFlash";
import { LighthouseMark } from "@/components/brand/Logo";
import { childColor } from "@/lib/kiosk/colors";
import { childSettings } from "@/lib/lantern/day";
import { speak } from "@/lib/kiosk/feedback";
import { cn } from "@/lib/cn";

type Kiosk = ReturnType<typeof useKiosk>;
type View = { k: "home" } | { k: "routine"; id: string } | { k: "chores" };

function inQuietHours(start?: string, end?: string, d = new Date()): boolean {
  if (!start || !end) return false;
  const cur = d.getHours() * 60 + d.getMinutes();
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const s = sh * 60 + sm;
  const e = eh * 60 + em;
  if (s === e) return false;
  return s < e ? cur >= s && cur < e : cur >= s || cur < e;
}

/** The Lantern (HARBOR_LANTERN_DEVICE.md) — a per-child bedside device with its OWN light,
 *  playful UI (NOT the dark family wall): a home hub, focused task cards, a chore grid, and a
 *  bedside clock. Plus the differentiators Buddy lacks: Anchor co-regulation + private voice. */
export function LanternShell({ kiosk, childId }: { kiosk: Kiosk; childId: string }) {
  const { state } = kiosk;
  const [view, setView] = useState<View>({ k: "home" });
  const [resting, setResting] = useState(false);
  const [anchorOpen, setAnchorOpen] = useState(false);
  const [gate, setGate] = useState(false);
  const [menu, setMenu] = useState(false);
  const lastActivity = useRef(Date.now());

  const child = state?.snapshot.children.find((c) => c.id === childId);
  const settings = child ? childSettings(child) : null;
  const accent = child ? childColor(child) : "#18606f";

  const eff = {
    ...((state?.snapshot.household.settings ?? {}) as Record<string, unknown>),
    ...(kiosk.deviceSettings ?? {}),
  } as Record<string, unknown>;
  const idleMs = ((eff.idleSeconds as number) || 90) * 1000;
  const quietStart = eff.quietStart as string | undefined;
  const quietEnd = eff.quietEnd as string | undefined;

  // Idle → rest to the bedside clock; any input wakes. Never rest during a break/modal.
  useEffect(() => {
    const onActivity = () => {
      lastActivity.current = Date.now();
      setResting((r) => (r ? false : r));
    };
    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("touchstart", onActivity, { passive: true });
    const id = window.setInterval(() => {
      if (anchorOpen || gate || menu) return;
      if (Date.now() - lastActivity.current > idleMs) setResting(true);
    }, 5000);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("touchstart", onActivity);
    };
  }, [anchorOpen, gate, menu, idleMs]);

  // If this Lantern's child was removed via sync, fall back home (then the light "needs a
  // grown-up" screen renders below).
  useEffect(() => {
    if (view.k === "routine" && state && !state.snapshot.routines.some((r) => r.id === view.id)) {
      setView({ k: "home" });
    }
  }, [view, state]);

  if (!state || !child || !settings) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#fbfdfc] px-6 text-center text-harbor">
        <LighthouseMark className="h-14 w-14 text-beacon" />
        <h1 className="mt-6 font-display text-2xl font-extrabold">This Lantern needs a grown-up</h1>
        <p className="mt-2 max-w-sm text-muted">Its child isn&apos;t set up anymore. A parent can re-assign it from the Harbor app.</p>
        <button onClick={() => setGate(true)} className="mt-6 inline-flex items-center gap-2 rounded-full bg-harbor-50 px-5 py-2.5 font-semibold text-harbor ring-1 ring-harbor-100">
          <Lock className="h-4 w-4" /> Parent options
        </button>
        {gate && <ParentGate verify={kiosk.verifyPin} onSuccess={() => { setGate(false); setMenu(true); }} onCancel={() => setGate(false)} />}
        {menu && <LanternParentMenu kiosk={kiosk} onClose={() => setMenu(false)} />}
      </div>
    );
  }

  const night = inQuietHours(quietStart, quietEnd);
  const voiceChild = settings.voiceChat ? childId : null;
  const points = state.points[childId] ?? 0;

  return (
    <div className="min-h-full">
      <IdentifyFlash at={kiosk.identifyAt} name={kiosk.deviceLabel} />

      {view.k === "home" && (
        <LanternHome
          kiosk={kiosk}
          childId={childId}
          onOpenRoutine={(id) => setView({ k: "routine", id })}
          onOpenChores={() => setView({ k: "chores" })}
          onBreak={() => setAnchorOpen(true)}
          onOpenStore={() => speak(`You have ${points} ${points === 1 ? "star" : "stars"}, ${child.name}! Keep it up.`, settings.readAloud)}
        />
      )}
      {view.k === "routine" && (
        <LanternRoutineView
          kiosk={kiosk}
          childId={childId}
          routineId={view.id}
          onBack={() => setView({ k: "home" })}
          onBreak={() => setAnchorOpen(true)}
        />
      )}
      {view.k === "chores" && <LanternChores kiosk={kiosk} childId={childId} onBack={() => setView({ k: "home" })} />}

      {/* discreet parent access (bottom-left) — PIN-gated management */}
      {!resting && (
        <button
          onClick={() => setGate(true)}
          aria-label="Parent options"
          className="fixed bottom-3 left-3 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-muted shadow-sm ring-1 ring-harbor-100 backdrop-blur"
        >
          <Lock className="h-4 w-4" />
        </button>
      )}

      {/* Private tap-to-talk voice (§6.2) — ONLY when this child's voice chat is on (bounded,
          child-scoped endpoint). A Lantern never exposes the whole-household command channel. */}
      {!resting && voiceChild && state.deviceSecret && (
        <VoiceButton deviceSecret={state.deviceSecret} childId={voiceChild} onActed={() => void kiosk.syncNow()} />
      )}

      {/* Bedside resting clock (§5) — a calm light face; dims at night. */}
      {resting && (
        <LanternClock
          accent={accent}
          night={night}
          name={child.name}
          onWake={() => {
            lastActivity.current = Date.now();
            setResting(false);
          }}
        />
      )}

      {/* Anchor co-regulation (§6.1) — a calm break dims the world, on their own device. */}
      {anchorOpen && (
        <Anchor
          childName={child.name}
          accent={accent}
          haptics={settings.haptics}
          readAloud={settings.readAloud}
          reducedMotion={settings.reducedMotion}
          sound={settings.sound}
          onFeeling={(f) => kiosk.checkIn(childId, f)}
          onSoften={() => kiosk.softenChild(childId)}
          onClose={() => setAnchorOpen(false)}
          deviceSecret={state.deviceSecret}
          childId={childId}
          voiceChat={settings.voiceChat}
        />
      )}

      {gate && <ParentGate verify={kiosk.verifyPin} onSuccess={() => { setGate(false); setMenu(true); }} onCancel={() => setGate(false)} />}
      {menu && <LanternParentMenu kiosk={kiosk} onClose={() => setMenu(false)} />}
    </div>
  );
}

/** A light parent sheet for the Lantern — refresh from cloud + unpair (management is PIN-gated). */
function LanternParentMenu({ kiosk, onClose }: { kiosk: Kiosk; onClose: () => void }) {
  const [confirmUnpair, setConfirmUnpair] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-harbor/30 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-b-none rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <h2 className="font-display text-2xl font-extrabold text-harbor">Lantern options</h2>
        <p className="mt-1 text-sm text-muted">{kiosk.online ? "Online" : "Offline — the Lantern keeps working"}</p>
        <div className="mt-5 space-y-2.5">
          <button
            onClick={() => void kiosk.syncNow(true)}
            className="flex w-full items-center gap-3 rounded-2xl bg-harbor-50 px-4 py-3.5 text-left font-semibold text-harbor"
          >
            <RefreshCw className="h-5 w-5 text-water" /> {kiosk.syncStatus === "syncing" ? "Syncing…" : "Refresh from cloud"}
          </button>
          {!confirmUnpair ? (
            <button
              onClick={() => setConfirmUnpair(true)}
              className="flex w-full items-center gap-3 rounded-2xl bg-red-50 px-4 py-3.5 text-left font-semibold text-red-700"
            >
              <LogOut className="h-5 w-5" /> Unpair this Lantern
            </button>
          ) : (
            <button
              onClick={() => void kiosk.unpair()}
              className="w-full rounded-2xl bg-red-600 px-4 py-4 font-display text-lg font-extrabold text-white"
            >
              Tap again to confirm unpair
            </button>
          )}
        </div>
        <button onClick={onClose} className={cn("mt-5 w-full rounded-2xl bg-[linear-gradient(180deg,#16586a,#0c3b47)] px-4 py-3.5 font-display text-lg font-extrabold text-white")}>
          Done
        </button>
      </div>
    </div>
  );
}
