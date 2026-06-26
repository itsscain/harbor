"use client";

import { useEffect, useState } from "react";
import { Lock, X } from "lucide-react";
import { PinPad } from "./PinPad";
import { haptic, HAPTIC, play } from "@/lib/kiosk/feedback";
import { KCard, KIconButton, KEyebrow } from "./ui";

/** Full-screen PIN challenge. Calls onSuccess() when the PIN verifies. */
export function ParentGate({
  verify,
  onSuccess,
  onCancel,
  title = "Enter your PIN",
  subtitle = "Enter your PIN to continue.",
}: {
  verify: (pin: string) => Promise<boolean>;
  onSuccess: () => void;
  onCancel: () => void;
  title?: string;
  subtitle?: string;
}) {
  const [error, setError] = useState(false);
  // PIN rate-limiting (Edge Cases §H1): after 5 wrong tries, a soft escalating
  // cooldown — never a harsh lockout, but slow enough to defeat brute force.
  const [attempts, setAttempts] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);
  const [nowTs, setNowTs] = useState(() => Date.now());
  useEffect(() => {
    if (lockUntil <= nowTs) return;
    const id = setInterval(() => setNowTs(Date.now()), 500);
    return () => clearInterval(id);
  }, [lockUntil, nowTs]);
  const locked = nowTs < lockUntil;
  const secsLeft = Math.max(0, Math.ceil((lockUntil - nowTs) / 1000));

  async function handle(pin: string) {
    if (locked) return;
    if (await verify(pin)) {
      onSuccess();
      return;
    }
    const next = attempts + 1;
    setAttempts(next);
    setError(true);
    haptic(HAPTIC.errorSoft); // soft, non-judgmental — never harsh (§11.1)
    play("error");
    setTimeout(() => setError(false), 600);
    if (next >= 5) {
      const wait = Math.min(300, 30 * 2 ** (next - 5)) * 1000; // 30s → … → 5min cap
      setLockUntil(Date.now() + wait);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-kbg2/95 px-6 text-ktext backdrop-blur-sm">
      <KIconButton
        variant="ghost"
        onClick={onCancel}
        className="kiosk-tap absolute right-5 top-5 rounded-full"
        aria-label="Close"
      >
        <X className="h-6 w-6" />
      </KIconButton>
      <KCard className="flex w-full max-w-sm flex-col items-center px-8 py-10">
        <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-kwater/15 ring-1 ring-kwater/30">
          <Lock className="h-8 w-8 text-kwater" />
        </span>
        <KEyebrow className="mt-5">Parents only</KEyebrow>
        <h2 className="mt-2 text-center font-display text-2xl font-bold text-ktext">{title}</h2>
        <p className="mt-1 text-center text-kmute">{subtitle}</p>
        {locked ? (
          <p className="mt-8 text-center text-sm font-semibold text-kmute">
            Let&apos;s try again in a bit · {secsLeft}s
          </p>
        ) : (
          <>
            {error && (
              <p className="mt-3 text-sm font-semibold text-rose-300">Hmm, that&apos;s not it. Try again.</p>
            )}
            <div className="mt-8">
              <PinPad onComplete={handle} shake={error} />
            </div>
          </>
        )}
      </KCard>
    </div>
  );
}
