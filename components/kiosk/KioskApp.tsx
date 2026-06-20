"use client";

import { useKiosk } from "./useKiosk";
import { PairingScreen } from "./PairingScreen";
import { PinSetup } from "./PinSetup";
import { KidShell } from "./KidShell";
import { LighthouseMark } from "@/components/brand/Logo";

export function KioskApp() {
  const kiosk = useKiosk();

  if (kiosk.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-harbor">
        <LighthouseMark className="h-16 w-16 animate-beacon text-white" />
      </div>
    );
  }

  if (kiosk.status === "unpaired") {
    return <PairingScreen onPair={kiosk.pair} />;
  }

  if (!kiosk.state?.pinHash) {
    return <PinSetup onDone={kiosk.setPin} />;
  }

  return <KidShell kiosk={kiosk} />;
}
