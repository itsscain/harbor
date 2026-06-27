"use client";

import { useCallback, useEffect, useState } from "react";
import { Volume2, RefreshCw, ChevronDown, ArrowLeft } from "lucide-react";
import { KButton, KCard } from "./ui";
import {
  getVoiceStatus,
  voiceCacheCount,
  speakDiag,
  reloadVoiceEngine,
  clearVoiceCache,
  prewarmHarborVoice,
  type VoiceStatus,
} from "@/lib/kiosk/voice";

// Bump this with each voice deploy so the device's build is confirmable on-screen.
const BUILD = "v6 · library voice";

// Parent menu → Debug tools. A tap here also unlocks audio, and surfaces exactly which
// tier is firing so a silent-on-device issue is diagnosable, plus a one-tap recovery
// (Clear everything) to defeat stale browser caching.
export function VoiceDebug({ onBack }: { onBack: () => void }) {
  const [status, setStatus] = useState<VoiceStatus | null>(null);
  const [cacheN, setCacheN] = useState<number | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [advanced, setAdvanced] = useState(false);

  const refresh = useCallback(() => {
    setStatus(getVoiceStatus());
    void voiceCacheCount().then(setCacheN);
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 1500);
    return () => clearInterval(id);
  }, [refresh]);

  const test = async () => {
    setBusy("test");
    setResult("Testing…");
    const r = await speakDiag();
    setResult(`${r.ok ? "✓ Heard it?" : "✕ Couldn't play"} · via ${labelTier(r.tier)} · ${(r.ms / 1000).toFixed(1)}s`);
    setBusy(null);
    refresh();
  };

  // The bulletproof recovery: wipe ALL browser caches + service workers + the voice
  // audio cache, then reload — so the latest code + voices load fresh. PRESERVES the
  // device pairing, PIN, and progress (never touches the "harbor-kiosk" database).
  const clearEverything = async () => {
    setBusy("clear");
    setResult("Clearing everything…");
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k))); // every cache, incl. the voice model
      }
      await reloadVoiceEngine(true);
      await clearVoiceCache();
    } catch {
      /* ignore — reload anyway */
    }
    location.reload();
  };

  const reloadEngine = async () => {
    setBusy("reload");
    await reloadVoiceEngine(false);
    prewarmHarborVoice();
    setBusy(null);
    refresh();
  };
  const redownload = async () => {
    setBusy("redl");
    setResult("Voice model reset — re-downloads if custom text is used.");
    await reloadVoiceEngine(true);
    setBusy(null);
    refresh();
  };
  const clearClips = async () => {
    setBusy("clips");
    await clearVoiceCache();
    setBusy(null);
    refresh();
  };

  const soundLocked = status?.audioContext === "suspended";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <KCard className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-b-none rounded-t-xl p-5 shadow-k-pop sm:rounded-xl">
        <div className="flex items-center gap-2">
          <button onClick={onBack} aria-label="Back" className="kiosk-tap -ml-1 rounded-lg p-1.5 text-kmute">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="font-display text-2xl font-bold text-ktext">Debug tools</h2>
        </div>
        <p className="mt-1 text-sm text-kmute">Check the read-aloud voice on this device.</p>

        {/* status — plain English */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <Stat
            label="Voices ready"
            value={status ? String(status.libraryPhrases) : "…"}
            good={!!status && status.libraryPhrases > 0}
            bad={!!status && status.libraryPhrases === 0}
          />
          <Stat label="Sound" value={soundLocked ? "Locked" : "On"} good={!!status && !soundLocked} bad={soundLocked} />
          <Stat label="Saved clips" value={cacheN == null ? "…" : String(cacheN)} />
          {status && !status.secureContext && <Stat label="Secure (https)" value="No" bad />}
        </div>

        {result && <p className="mt-3 rounded-xl bg-kraise px-3 py-2.5 text-sm text-ktext">{result}</p>}
        {status?.lastError && (
          <p className="mt-2 rounded-xl bg-amber-400/10 px-3 py-2 text-xs text-amber-200">Note: {status.lastError}</p>
        )}

        {/* the two essential actions */}
        <div className="mt-4 space-y-2.5">
          <KButton variant="primary" size="lg" className="w-full" disabled={!!busy} haptics onClick={test}>
            <Volume2 className="mr-2 inline h-5 w-5" />
            {busy === "test" ? "Testing…" : "Test the Harbor voice"}
          </KButton>

          {!confirmClear ? (
            <KButton variant="beacon" size="lg" className="w-full" disabled={!!busy} onClick={() => setConfirmClear(true)}>
              <RefreshCw className="mr-2 inline h-5 w-5" />
              Clear everything &amp; restart
            </KButton>
          ) : (
            <div className="rounded-xl bg-kraise p-3">
              <p className="px-1 pb-2 text-sm text-kmute">
                Wipes cached app + voices and reloads fresh. <b>Keeps your pairing, PIN, and progress.</b>
              </p>
              <KButton variant="beacon" size="lg" className="w-full" disabled={!!busy} onClick={clearEverything}>
                {busy === "clear" ? "Clearing…" : "Tap again to clear & restart"}
              </KButton>
            </div>
          )}
        </div>

        {/* advanced — collapsed by default */}
        <button
          onClick={() => setAdvanced((a) => !a)}
          className="kiosk-tap mt-4 flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-sm font-semibold text-kmute"
        >
          Advanced
          <ChevronDown className={`h-4 w-4 transition ${advanced ? "rotate-180" : ""}`} />
        </button>
        {advanced && (
          <div className="space-y-2.5">
            <KButton variant="tonal" className="w-full" disabled={!!busy} onClick={reloadEngine}>
              {busy === "reload" ? "Reloading…" : "Reload voice engine"}
            </KButton>
            <KButton variant="tonal" className="w-full" disabled={!!busy} onClick={redownload}>
              {busy === "redl" ? "Resetting…" : "Re-download voice model (custom text)"}
            </KButton>
            <KButton variant="tonal" className="w-full" disabled={!!busy} onClick={clearClips}>
              {busy === "clips" ? "Clearing…" : "Clear saved clips"}
            </KButton>
          </div>
        )}

        <p className="mt-4 text-center text-[11px] text-kmute/70">
          Build {BUILD}
          {status?.libraryVersion ? ` · voices ${status.libraryVersion}` : ""}
        </p>
      </KCard>
    </div>
  );
}

function labelTier(t: string) {
  return t === "library"
    ? "Harbor voice (Bella)"
    : t === "cache"
      ? "saved clip"
      : t === "kokoro"
        ? "Harbor voice (custom)"
        : t === "os"
          ? "device voice"
          : t;
}

function Stat({ label, value, good, bad }: { label: string; value: string; good?: boolean; bad?: boolean }) {
  return (
    <div className="rounded-xl bg-kraise px-3 py-2">
      <div className="text-xs text-kmute">{label}</div>
      <div className={`font-semibold ${good ? "text-emerald-300" : bad ? "text-amber-300" : "text-ktext"}`}>{value}</div>
    </div>
  );
}
