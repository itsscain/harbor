"use client";

import { useState } from "react";
import { useKiosk } from "./useKiosk";
import { PairingScreen } from "./PairingScreen";
import { PinSetup } from "./PinSetup";
import { KioskShell } from "./KioskShell";
import { OutpostShell } from "./OutpostShell";
import { LightingMoment } from "./LightingMoment";
import { LighthouseMark } from "@/components/brand/Logo";

export function KioskApp() {
  const kiosk = useKiosk();
  const [lightingDone, setLightingDone] = useState(false);

  if (kiosk.status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-kbg">
        <LighthouseMark className="h-16 w-16 animate-beacon text-beacon" />
      </div>
    );
  }

  if (kiosk.status === "error") {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-kbg px-6 text-center text-ktext">
        <LighthouseMark className="h-16 w-16 text-beacon" />
        <h1 className="mt-6 font-display text-3xl font-bold">Let&apos;s reload the wall</h1>
        <p className="mt-2 max-w-sm text-kmute">
          Harbor couldn&apos;t open the device&apos;s storage. A refresh usually fixes it.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="kiosk-tap mt-8 rounded-xl bg-beacon px-10 py-4 text-lg font-semibold text-harbor shadow-k active:scale-95"
        >
          Reload Harbor
        </button>
      </div>
    );
  }

  if (kiosk.status === "unpaired") {
    return <PairingScreen onPair={kiosk.pair} />;
  }

  if (!kiosk.state?.pinHash) {
    // First boot: light the lighthouse (§12.3) before the grown-up code setup.
    if (!lightingDone) {
      const raw = kiosk.state?.snapshot.household.name ?? "";
      const fam = raw.replace(/('s)?\s+(home|household|family)$/i, "").trim() || null;
      return <LightingMoment familyName={fam} onDone={() => setLightingDone(true)} />;
    }
    return <PinSetup onDone={kiosk.setPin} />;
  }

  // A device paired as an outpost shows a single child's room-device mode.
  if (kiosk.state.kind === "outpost" && kiosk.state.outpostChildId) {
    return <OutpostShell kiosk={kiosk} childId={kiosk.state.outpostChildId} />;
  }

  return <KioskShell kiosk={kiosk} />;
}
