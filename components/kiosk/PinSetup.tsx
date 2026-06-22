"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { PinPad } from "./PinPad";
import { KCard, KEyebrow, KPill } from "./ui";

export function PinSetup({ onDone }: { onDone: (pin: string) => Promise<void> }) {
  const [first, setFirst] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handle(pin: string) {
    if (!first) {
      setFirst(pin);
      setError(null);
      return;
    }
    if (pin !== first) {
      setError("Those didn't match. Let's try again.");
      setFirst(null);
      return;
    }
    void onDone(pin);
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-kbg px-6 text-center text-ktext">
      <KCard className="flex w-full max-w-md flex-col items-center px-8 py-10">
        <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-kwater/15 ring-1 ring-kwater/30">
          <ShieldCheck className="h-11 w-11 text-kwater" />
        </div>
        <KEyebrow className="mt-6">Parent PIN</KEyebrow>
        <h1 className="mt-2 font-display text-2xl font-bold text-ktext">
          {first ? "Confirm your parent PIN" : "Create a parent PIN"}
        </h1>
        <p className="mt-2 max-w-sm text-kmute">
          This 4-digit PIN keeps settings and editing safe from little hands. Kids
          never need it.
        </p>
        {error && (
          <KPill tone="danger" className="mt-4">
            {error}
          </KPill>
        )}
        <div className="mt-8">
          <PinPad onComplete={handle} />
        </div>
      </KCard>
    </div>
  );
}
