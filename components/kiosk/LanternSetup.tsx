"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LighthouseMark } from "@/components/brand/Logo";
import { createClient } from "@/lib/supabase/client";
import { KCard, KEyebrow } from "./ui";
import type { PairResult } from "./useKiosk";

const LS_KEY = "harbor-lantern-request"; // { code, nonce } — resume the same request across a reload

type RequestResult = { code: string; nonce: string };
type PollResult =
  | { status: "waiting" | "expired" }
  | ({ status: "claimed" } & PairResult);

/** The Lantern's device-initiated setup (HARBOR_LANTERN_DEVICE.md §3): the device SHOWS a
 *  6-char code and waits; a parent enters it in the Harbor app and picks the child, which
 *  claims it. We poll until claimed, then adopt the secret + snapshot and drop into the
 *  child's world. Calm, big, and dead-simple — "plug in and add in the app." */
export function LanternSetup({ onAdopt }: { onAdopt: (res: PairResult) => Promise<void> }) {
  const supabase = useMemo(() => createClient(), []);
  const [code, setCode] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const nonceRef = useRef<string | null>(null);
  const claimedRef = useRef(false);

  const requestCode = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("rpc_lantern_request_code");
      if (error || !data) {
        setOffline(true);
        return;
      }
      const d = data as unknown as RequestResult;
      nonceRef.current = d.nonce;
      setCode(d.code);
      setOffline(false);
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(d));
      } catch {
        /* ignore */
      }
    } catch {
      setOffline(true);
    }
  }, [supabase]);

  // Resume a saved request if there is one (so a reload doesn't flash a new code); else ask.
  useEffect(() => {
    let saved: RequestResult | null = null;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) saved = JSON.parse(raw) as RequestResult;
    } catch {
      /* ignore */
    }
    if (saved?.nonce && saved?.code) {
      nonceRef.current = saved.nonce;
      setCode(saved.code);
    } else {
      void requestCode();
    }
  }, [requestCode]);

  // Poll for the parent's claim. Expired → fetch a fresh code. Claimed → adopt.
  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      if (claimedRef.current) return;
      const nonce = nonceRef.current;
      // No code yet — the first request failed (e.g. the device booted from the cached shell
      // before Wi-Fi connected). Keep trying to get one; otherwise we'd sit blank forever.
      if (!nonce) {
        void requestCode();
        return;
      }
      try {
        const { data, error } = await supabase.rpc("rpc_lantern_poll", { p_nonce: nonce });
        if (stopped || error || !data) return;
        setOffline(false);
        const d = data as unknown as PollResult;
        if (d.status === "claimed") {
          // Adopt FIRST — only burn the guard + resume token once it actually succeeds, so a
          // transient IndexedDB failure retries next tick instead of stranding a device whose
          // server-side claim is already consumed. (The claim stays pollable for ~5 min.)
          await onAdopt({
            device_secret: d.device_secret,
            household_id: d.household_id,
            kind: d.kind ?? "outpost",
            child_id: d.child_id ?? null,
            snapshot: d.snapshot,
          });
          claimedRef.current = true;
          try {
            localStorage.removeItem(LS_KEY);
          } catch {
            /* ignore */
          }
        } else if (d.status === "expired") {
          nonceRef.current = null;
          void requestCode();
        }
      } catch {
        /* offline / adopt hiccup — keep the code up and keep trying */
      }
    };
    void poll();
    const id = window.setInterval(poll, 3000);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [supabase, requestCode, onAdopt]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-kbg px-6 text-center text-ktext">
      <div className="absolute inset-0 beacon-ring opacity-50" aria-hidden />
      <KCard className="relative w-full max-w-md p-6 sm:p-10">
        <LighthouseMark className="mx-auto h-20 w-20 animate-beacon text-beacon" />
        <KEyebrow className="mt-6">Let&apos;s set up your Lantern</KEyebrow>
        <h1 className="mt-2 font-display text-3xl font-bold">Your very own Harbor</h1>
        <p className="mt-2 text-kmute">
          In the Harbor app, go to <span className="font-semibold text-ktext">Devices → Set up a Lantern</span>,
          then enter this code and pick whose Lantern this is.
        </p>

        <div className="mt-8 rounded-2xl bg-kraise p-6 ring-1 ring-kline/55">
          {code ? (
            <p className="font-mono text-5xl font-bold tracking-[0.25em] text-beacon sm:text-6xl" aria-label={`Pairing code ${code.split("").join(" ")}`}>
              {code}
            </p>
          ) : (
            <p className="animate-pulse font-mono text-5xl font-bold tracking-[0.25em] text-kmute sm:text-6xl">••••••</p>
          )}
        </div>

        <p className="mt-6 flex items-center justify-center gap-2 text-sm text-kmute">
          <span className={"h-2 w-2 rounded-full " + (offline ? "bg-amber-400" : "bg-kwater animate-pulse")} aria-hidden />
          {offline ? "Waiting for the internet…" : "Waiting for a grown-up…"}
        </p>
        <p className="mt-6 text-xs text-kmute">
          Once it&apos;s set up, the Lantern works on its own — even without the internet.
        </p>
      </KCard>
    </div>
  );
}
