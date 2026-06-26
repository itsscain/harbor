"use client";

import { useCallback, useEffect, useState } from "react";
import { Volume2, RefreshCw, Trash2, Download, RotateCw, ArrowLeft } from "lucide-react";
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

// Parent menu → Debug tools. A tap here also unlocks audio, and surfaces exactly which
// tier is firing so a silent-on-tablet issue is diagnosable instead of guesswork.
export function VoiceDebug({ onBack }: { onBack: () => void }) {
  const [status, setStatus] = useState<VoiceStatus | null>(null);
  const [cacheN, setCacheN] = useState<number | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

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
    setResult(
      `${r.ok ? "✓ Heard it?" : "✕ Couldn't play"} · via ${labelTier(r.tier)} · ${(r.ms / 1000).toFixed(1)}s — ${r.detail}`,
    );
    setBusy(null);
    refresh();
  };

  const reloadEngine = async () => {
    setBusy("reload");
    setResult(null);
    await reloadVoiceEngine(false);
    prewarmHarborVoice();
    setBusy(null);
    refresh();
  };

  const redownload = async () => {
    setBusy("redl");
    setResult("Re-downloading the voice model…");
    await reloadVoiceEngine(true);
    prewarmHarborVoice();
    setResult("Voice model reset — it will re-download on the next test.");
    setBusy(null);
    refresh();
  };

  const clearCache = async () => {
    setBusy("clear");
    await clearVoiceCache();
    setBusy(null);
    refresh();
  };

  const updateApp = async () => {
    setBusy("update");
    setResult("Updating the app…");
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        // drop the app shell so the latest code loads; keep the voice MODEL cache
        await Promise.all(keys.filter((k) => /harbor/i.test(k)).map((k) => caches.delete(k)));
      }
    } catch {
      /* ignore */
    }
    location.reload();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <KCard className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-b-none rounded-t-xl p-5 shadow-k-pop sm:rounded-xl">
        <div className="flex items-center gap-2">
          <button onClick={onBack} aria-label="Back" className="kiosk-tap -ml-1 rounded-lg p-1.5 text-kmute">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="font-display text-2xl font-bold text-ktext">Debug tools</h2>
        </div>
        <p className="mt-1 text-sm text-kmute">Voice (read-aloud) diagnostics. Tap Test to check sound on this device.</p>

        {/* status grid */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <Stat label="Voice library" value={status ? `${status.libraryPhrases} phrases` : "…"} good={!!status && status.libraryPhrases > 0} bad={!!status && status.libraryPhrases === 0} />
          <Stat label="Audio" value={status?.audioContext ?? "…"} good={status?.audioContext === "running"} bad={status?.audioContext === "suspended"} />
          <Stat label="Cached clips" value={cacheN == null ? "…" : String(cacheN)} />
          <Stat label="Device voice" value={status?.osVoice ?? "none"} />
          <Stat label="Secure (https)" value={status?.secureContext ? "Yes" : "No"} good={status?.secureContext} bad={status && !status.secureContext ? true : undefined} />
          <Stat label="Custom-text model" value={status?.modelReady ? "Ready" : status?.modelLoading ? "Loading…" : "Idle"} />
        </div>

        {status?.lastError && (
          <p className="mt-3 rounded-xl bg-amber-400/10 px-3 py-2 text-xs text-amber-200">Last issue: {status.lastError}</p>
        )}
        {result && (
          <p className="mt-3 rounded-xl bg-kraise px-3 py-2.5 text-sm text-ktext">{result}</p>
        )}

        <div className="mt-4 space-y-2.5">
          <KButton variant="primary" size="lg" className="w-full" disabled={!!busy} haptics onClick={test}>
            <Volume2 className="mr-2 inline h-5 w-5" />
            {busy === "test" ? "Testing…" : "Test the Harbor voice"}
          </KButton>
          <KButton variant="tonal" className="w-full" disabled={!!busy} onClick={reloadEngine}>
            <RotateCw className="mr-2 inline h-4 w-4" />
            {busy === "reload" ? "Reloading…" : "Reload voice engine"}
          </KButton>
          <KButton variant="tonal" className="w-full" disabled={!!busy} onClick={redownload}>
            <Download className="mr-2 inline h-4 w-4" />
            {busy === "redl" ? "Resetting…" : "Re-download voice model"}
          </KButton>
          <KButton variant="tonal" className="w-full" disabled={!!busy} onClick={clearCache}>
            <Trash2 className="mr-2 inline h-4 w-4" />
            {busy === "clear" ? "Clearing…" : "Clear cached clips"}
          </KButton>
          <KButton variant="beacon" size="lg" className="w-full" disabled={!!busy} onClick={updateApp}>
            <RefreshCw className="mr-2 inline h-5 w-5" />
            {busy === "update" ? "Updating…" : "Update app (clear cache & reload)"}
          </KButton>
          <p className="px-1 text-xs text-kmute">
            Heard the chime but no voice? Tap <b>Test</b> once (it unlocks sound), then if it still fails use{" "}
            <b>Update app</b> to pull the latest, or <b>Re-download voice model</b>.
          </p>
        </div>
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
