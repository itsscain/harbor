"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";

/** "Sync now" for Google Calendar — POSTs the sync route and shows the result. */
export function GoogleSyncButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function sync() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/google/sync", { method: "POST" });
      const data = (await res.json()) as { ok: boolean; pushed?: number; pulled?: number; error?: string };
      if (data.ok) setMsg(`Synced — ${data.pulled ?? 0} in, ${data.pushed ?? 0} out.`);
      else setMsg(data.error ?? "Sync failed.");
    } catch {
      setMsg("Sync failed — check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={sync}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-xl border border-line-strong px-3.5 py-2 text-sm font-semibold text-fg transition hover:bg-surface-2 disabled:opacity-60"
      >
        <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /> {busy ? "Syncing…" : "Sync now"}
      </button>
      {msg && <span className="text-sm text-fg-muted">{msg}</span>}
    </div>
  );
}
