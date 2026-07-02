"use client";

import { useState } from "react";
import { Lock, RefreshCw, LogOut } from "lucide-react";
import type { useKiosk } from "./useKiosk";
import { ChildView } from "./ChildView";
import { CalmCorner } from "./CalmCorner";
import { ParentGate } from "./ParentGate";
import { LivingAmbient } from "./LivingAmbient";
import { BeaconLight } from "./BeaconLight";
import { IdentifyFlash } from "./IdentifyFlash";
import { KButton, KCard } from "./ui";
import { LighthouseMark } from "@/components/brand/Logo";
import { childColor } from "@/lib/kiosk/colors";
import { intensityOf } from "@/lib/kiosk/motion";
import { cn } from "@/lib/cn";

type Kiosk = ReturnType<typeof useKiosk>;

/** Outpost mode (HARBOR_V2 §9.1.4) — a spare tablet as a per-child room device:
 *  just that child's routine, chores, Anchor, Calm Tools, and bedtime. No family
 *  Home, no other children, no parent chrome — gated parent access for managing it. */
export function OutpostShell({
  kiosk,
  childId,
  onAnchorActive,
}: {
  kiosk: Kiosk;
  childId: string;
  /** Bubbles Anchor open/close up to a wrapper (the Lantern uses it to never rest to the
   *  bedside clock mid-co-regulation). */
  onAnchorActive?: (active: boolean) => void;
}) {
  const { state } = kiosk;
  const [calmOpen, setCalmOpen] = useState(false);
  const [gate, setGate] = useState(false);
  const [menu, setMenu] = useState(false);
  const [anchorActive, setAnchorActive] = useState(false);
  const handleAnchorActive = (a: boolean) => {
    setAnchorActive(a);
    onAnchorActive?.(a);
  };
  if (!state) return null;

  const child = state.snapshot.children.find((c) => c.id === childId);
  if (!child) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-kbg px-6 text-center text-ktext">
        <LighthouseMark className="h-14 w-14 text-beacon" />
        <h1 className="mt-6 font-display text-2xl font-bold">This room device needs a grown-up</h1>
        <p className="mt-2 max-w-sm text-kmute">Its child isn&apos;t set up anymore. A parent can re-pair it from the Harbor app.</p>
        <KButton variant="tonal" className="mt-6" onClick={() => setGate(true)}>
          <Lock className="h-4 w-4" /> Parent options
        </KButton>
        {gate && <ParentGate verify={kiosk.verifyPin} onSuccess={() => { setGate(false); setMenu(true); }} onCancel={() => setGate(false)} />}
        {menu && <OutpostMenu kiosk={kiosk} onClose={() => setMenu(false)} />}
      </div>
    );
  }

  const accent = childColor(child);
  const ambIntensity = intensityOf(child.settings?.sensory);
  const ambReduced = child.settings?.reducedMotion === true;

  return (
    <div className="min-h-full">
      <IdentifyFlash at={kiosk.identifyAt} name={kiosk.deviceLabel} />
      {/* Duck the lit world during Anchor so the room quiets while the child regulates (§9.1). */}
      <div className={cn("transition-opacity duration-700 ease-[var(--ease-harbor-calm)]", anchorActive && "opacity-30")}>
        <LivingAmbient />
        <div
          className="lumen-caustics"
          aria-hidden
          style={{ opacity: 0.06 * ambIntensity, ...(ambReduced ? { animationPlayState: "paused" } : null) }}
        />
        <BeaconLight accent={accent} active intensity={ambIntensity} reduced={ambReduced} />
        <div className="grain-overlay" aria-hidden style={{ opacity: 0.025 * ambIntensity }} />
        <div className="lumen-vignette" aria-hidden />
      </div>

      <div className="relative z-10">
        <ChildView
          kiosk={kiosk}
          childId={childId}
          hideHome
          onHome={() => setGate(true)}
          onOpenCalm={() => setCalmOpen(true)}
          onAnchorActive={handleAnchorActive}
        />

        {/* discreet parent access for managing / unpairing the room device */}
        <button
          onClick={() => setGate(true)}
          aria-label="Parent options"
          className="kiosk-tap fixed bottom-3 left-3 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-kpanel/70 text-kmute ring-1 ring-kline/55 backdrop-blur"
        >
          <Lock className="h-4 w-4" />
        </button>

        {calmOpen && (
          <CalmCorner
            tools={state.snapshot.calm_tools}
            onCheckIn={(f) => kiosk.checkIn(childId, f)}
            onClose={() => setCalmOpen(false)}
          />
        )}
        {gate && (
          <ParentGate verify={kiosk.verifyPin} onSuccess={() => { setGate(false); setMenu(true); }} onCancel={() => setGate(false)} />
        )}
        {menu && <OutpostMenu kiosk={kiosk} onClose={() => setMenu(false)} />}
      </div>
    </div>
  );
}

function OutpostMenu({ kiosk, onClose }: { kiosk: Kiosk; onClose: () => void }) {
  const [confirmUnpair, setConfirmUnpair] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <KCard className="w-full max-w-md rounded-b-none rounded-t-xl p-5 shadow-k-pop sm:rounded-xl">
        <h2 className="font-display text-2xl font-bold text-ktext">Room device</h2>
        <p className="mt-1 text-sm text-kmute">{kiosk.online ? "Online" : "Offline — the device keeps working"}</p>
        <div className="mt-5 space-y-2.5">
          <button
            onClick={() => void kiosk.syncNow(true)}
            className={cn("kiosk-tap flex w-full items-center gap-3 rounded-xl bg-kraise px-4 py-3.5 text-left font-semibold text-ktext")}
          >
            <RefreshCw className="h-5 w-5" /> {kiosk.syncStatus === "syncing" ? "Syncing…" : "Refresh from cloud"}
          </button>
          {!confirmUnpair ? (
            <button
              onClick={() => setConfirmUnpair(true)}
              className="kiosk-tap flex w-full items-center gap-3 rounded-xl bg-red-500/10 px-4 py-3.5 text-left font-semibold text-red-300"
            >
              <LogOut className="h-5 w-5" /> Unpair this device
            </button>
          ) : (
            <KButton variant="danger" className="h-16 w-full" onClick={() => void kiosk.unpair()}>
              Tap again to confirm unpair
            </KButton>
          )}
        </div>
        <KButton variant="primary" size="lg" className="mt-5 w-full" onClick={onClose}>
          Done
        </KButton>
      </KCard>
    </div>
  );
}
