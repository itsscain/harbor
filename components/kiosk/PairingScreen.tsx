"use client";

import { useEffect, useRef, useState } from "react";
import { LighthouseMark } from "@/components/brand/Logo";

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
    <div className="flex min-h-screen flex-col items-center justify-center bg-harbor px-6 text-center text-white">
      <div className="absolute inset-0 beacon-ring opacity-60" aria-hidden />
      <div className="relative w-full max-w-md">
        <LighthouseMark className="mx-auto h-16 w-16 text-white" />
        <h1 className="mt-6 font-display text-3xl font-extrabold">
          Set up this Harbor
        </h1>
        <p className="mt-2 text-seafoam">
          Enter the pairing code from your setup email to connect this wall to
          your household.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCD-EFGH"
            aria-label="Pairing code"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            className="w-full rounded-2xl border-2 border-white/20 bg-white/10 px-5 py-5 text-center font-mono text-3xl font-bold tracking-[0.3em] text-white placeholder-white/40 outline-none focus:border-beacon"
          />
          {error && (
            <p role="alert" className="rounded-xl bg-red-500/20 px-4 py-3 text-sm text-red-100">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || code.trim().length < 4}
            className="kiosk-tap w-full rounded-2xl bg-beacon px-6 py-5 text-xl font-bold text-harbor transition active:scale-[0.98] disabled:opacity-50"
          >
            {busy ? "Connecting…" : "Connect"}
          </button>
        </form>

        <p className="mt-6 text-xs text-seafoam/70">
          Daily use works fully offline. Pairing needs the internet just once.
        </p>
      </div>
    </div>
  );
}
