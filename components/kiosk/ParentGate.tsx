"use client";

import { useState } from "react";
import { Lock, X } from "lucide-react";
import { PinPad } from "./PinPad";

/** Full-screen PIN challenge. Calls onSuccess() when the PIN verifies. */
export function ParentGate({
  verify,
  onSuccess,
  onCancel,
}: {
  verify: (pin: string) => Promise<boolean>;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [error, setError] = useState(false);

  async function handle(pin: string) {
    if (await verify(pin)) {
      onSuccess();
    } else {
      setError(true);
      setTimeout(() => setError(false), 600);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-seafog px-6">
      <button
        onClick={onCancel}
        className="kiosk-tap absolute right-5 top-5 rounded-full bg-white p-3 text-muted shadow"
        aria-label="Close"
      >
        <X className="h-6 w-6" />
      </button>
      <Lock className="h-12 w-12 text-water" />
      <h2 className="mt-4 font-display text-2xl font-extrabold text-harbor">
        Parents only
      </h2>
      <p className="mt-1 text-muted">Enter your PIN to continue.</p>
      {error && (
        <p className="mt-3 text-sm font-semibold text-red-600">
          Wrong PIN — try again.
        </p>
      )}
      <div className="mt-8">
        <PinPad onComplete={handle} shake={error} />
      </div>
    </div>
  );
}
