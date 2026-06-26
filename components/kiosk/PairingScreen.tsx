"use client";

import { useEffect, useRef, useState } from "react";
import { LighthouseMark } from "@/components/brand/Logo";
import { KButton, KCard, KEyebrow } from "./ui";

export function PairingScreen({
  onPair,
}: {
  onPair: (code: string) => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const autoTried = useRef(false);

  async function attempt(value: string) {
    setBusy(true);
    setError(null);
    try {
      await onPair(value);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  // A one-time setup link (/kiosk?code=XXXX) prefills and auto-pairs.
  useEffect(() => {
    if (autoTried.current) return;
    const c = new URLSearchParams(window.location.search).get("code");
    if (c) {
      autoTried.current = true;
      const normalized = c.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      setCode(normalized);
      void attempt(normalized);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await attempt(code);
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-kbg px-6 text-center text-ktext">
      <div className="absolute inset-0 beacon-ring opacity-50" aria-hidden />
      <KCard className="relative w-full max-w-md p-5 sm:p-10">
        <LighthouseMark className="mx-auto h-20 w-20 animate-beacon text-beacon" />
        <KEyebrow className="mt-6">First-time setup</KEyebrow>
        <h1 className="mt-2 font-display text-3xl font-bold">
          Let&apos;s light your Harbor
        </h1>
        <p className="mt-2 text-kmute">
          Enter the pairing code from your setup email — we&apos;ll bring this wall to life.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <input
            value={code.length > 4 ? `${code.slice(0, 4)}-${code.slice(4, 8)}` : code}
            onChange={(e) => setCode(e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8))}
            placeholder="ABCD-EFGH"
            aria-label="Pairing code"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            className="w-full rounded-xl bg-kraise px-5 py-3.5 text-center font-mono text-3xl font-bold tracking-[0.3em] text-ktext placeholder-kmute ring-1 ring-kline/55 outline-none transition focus:ring-2 focus:ring-beacon/70"
          />
          {error && (
            <p role="alert" className="rounded-xl bg-rose-500/15 px-4 py-3 text-sm text-rose-300 ring-1 ring-rose-500/30">
              {error}
            </p>
          )}
          <KButton
            type="submit"
            variant="beacon"
            size="lg"
            disabled={busy || code.trim().length < 4}
            className="kiosk-tap w-full"
          >
            {busy ? "Connecting…" : "Connect"}
          </KButton>
        </form>

        <p className="mt-6 text-xs text-kmute">
          Daily use works fully offline. Pairing needs the internet just once.
        </p>
      </KCard>
    </div>
  );
}
