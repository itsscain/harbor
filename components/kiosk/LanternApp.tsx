"use client";

import { useState } from "react";
import { useKiosk } from "./useKiosk";
import { LanternSetup } from "./LanternSetup";
import { LanternShell } from "./LanternShell";
import { PinSetup } from "./PinSetup";
import { LightingMoment } from "./LightingMoment";
import { LighthouseMark } from "@/components/brand/Logo";
import { KButton } from "./ui";

/** The Lantern app (/lantern) — the single-child bedside device. Parallels KioskApp but
 *  uses the device-initiated setup (the Lantern shows a code, a parent claims it to a child)
 *  and always runs in single-child mode via LanternShell. */
export function LanternApp() {
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
        <h1 className="mt-6 font-display text-3xl font-bold">Let&apos;s reload the Lantern</h1>
        <p className="mt-2 max-w-sm text-kmute">
          Harbor couldn&apos;t open the device&apos;s storage. A refresh usually fixes it.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="kiosk-tap mt-8 rounded-xl bg-beacon px-10 py-4 text-lg font-semibold text-harbor shadow-k active:scale-95"
        >
          Reload
        </button>
      </div>
    );
  }

  if (kiosk.status === "unpaired") {
    return <LanternSetup onAdopt={kiosk.adopt} />;
  }

  if (!kiosk.state?.pinHash) {
    // First boot: light the lighthouse, then set the grown-up code (adopted from the
    // account if one exists, so most Lanterns skip straight past this).
    if (!lightingDone) {
      const raw = kiosk.state?.snapshot.household.name ?? "";
      const fam = raw.replace(/('s)?\s+(home|household|family)$/i, "").trim() || null;
      return <LightingMoment familyName={fam} onDone={() => setLightingDone(true)} />;
    }
    return <PinSetup onDone={kiosk.setPin} />;
  }

  // A Lantern is always an outpost bound to one child.
  if (kiosk.state.kind === "outpost" && kiosk.state.outpostChildId) {
    return <LanternShell kiosk={kiosk} childId={kiosk.state.outpostChildId} />;
  }

  // A non-outpost pairing landed on /lantern (e.g. a family-wall code entered here). Guide
  // them rather than showing a broken screen — a Lantern must be claimed to a child.
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-kbg px-6 text-center text-ktext">
      <LighthouseMark className="h-14 w-14 text-beacon" />
      <h1 className="mt-6 font-display text-2xl font-bold">This isn&apos;t set up as a Lantern yet</h1>
      <p className="mt-2 max-w-sm text-kmute">
        A Lantern belongs to one child. Ask a grown-up to remove this device and set it up again as a Lantern
        from the Harbor app.
      </p>
      <KButton variant="tonal" className="mt-6" onClick={() => void kiosk.unpair()}>
        Start setup over
      </KButton>
    </div>
  );
}
