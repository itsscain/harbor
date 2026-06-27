"use client";

import { useEffect } from "react";
import { LighthouseMark } from "@/components/brand/Logo";
import { captureError } from "@/lib/observability";

// Kiosk runs unattended on a wall — a render error must offer a big, obvious
// recovery rather than a white screen.
export default function KioskError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => captureError(error, { boundary: "kiosk" }), [error]);
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-harbor px-6 text-center text-white">
      <LighthouseMark className="h-16 w-16 text-white" />
      <h1 className="mt-6 font-display text-3xl font-extrabold">Let&apos;s reload the wall</h1>
      <p className="mt-2 text-seafoam">A quick refresh should fix it. Your data is safe on the device.</p>
      <button
        onClick={() => {
          reset();
          if (typeof window !== "undefined") window.location.reload();
        }}
        className="kiosk-tap mt-8 rounded-2xl bg-beacon px-10 py-5 text-xl font-bold text-harbor active:scale-95"
      >
        Reload Harbor
      </button>
    </div>
  );
}
