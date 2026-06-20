"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { PinPad } from "./PinPad";

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-seafog px-6 text-center">
      <ShieldCheck className="h-14 w-14 text-water" />
      <h1 className="mt-4 font-display text-2xl font-extrabold text-harbor">
        {first ? "Confirm your parent PIN" : "Create a parent PIN"}
      </h1>
      <p className="mt-2 max-w-sm text-muted">
        This 4-digit PIN keeps settings and editing safe from little hands. Kids
        never need it.
      </p>
      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
      <div className="mt-8">
        <PinPad onComplete={handle} />
      </div>
    </div>
  );
}
