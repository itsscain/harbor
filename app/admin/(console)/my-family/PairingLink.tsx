"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { formatPairingCode } from "@/lib/pairing-format";

export function PairingLink({ url, code }: { url: string; code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be unavailable; the link is still shown */
    }
  }

  return (
    <div className="rounded-2xl border border-beacon/40 bg-beacon-soft/40 p-4">
      <p className="text-sm font-semibold text-harbor">One-time setup link</p>
      <p className="mt-1 break-all font-mono text-sm text-water">{url}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          onClick={copy}
          className="inline-flex items-center gap-2 rounded-xl bg-harbor px-4 py-2 text-sm font-semibold text-white hover:bg-harbor-700"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied!" : "Copy link"}
        </button>
        <span className="text-sm text-muted">
          or type the code{" "}
          <span className="font-mono font-bold tracking-wider text-harbor">
            {formatPairingCode(code)}
          </span>
        </span>
      </div>
    </div>
  );
}
