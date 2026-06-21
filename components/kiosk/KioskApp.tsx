"use client";

import { useKiosk } from "./useKiosk";
import { PairingScreen } from "./PairingScreen";
import { PinSetup } from "./PinSetup";
import { KioskShell } from "./KioskShell";
import { LighthouseMark } from "@/components/brand/Logo";

export function KioskApp() {
  const kiosk = useKiosk();

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
        <h1 className="mt-6 font-display text-3xl font-extrabold">Let&apos;s reload the wall</h1>
        <p className="mt-2 max-w-sm text-kmute">
          Harbor couldn&apos;t open the device&apos;s storage. A refresh usually fixes it.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="kiosk-tap mt-8 rounded-2xl bg-beacon px-10 py-5 text-xl font-bold text-harbor shadow-k active:scale-95"
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
    return <PinSetup onDone={kiosk.setPin} />;
  }

  return <KioskShell kiosk={kiosk} />;
}
