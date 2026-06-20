"use client";

import { useState } from "react";
import { Button } from "@/components/ui/primitives";

export function BillingActions({
  isActive,
  configured,
}: {
  isActive: boolean;
  configured: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go(path: string, body?: Record<string, unknown>, key?: string) {
    setBusy(key ?? path);
    setError(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Billing isn't available yet.");
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(null);
    }
  }

  if (!configured) {
    return (
      <p className="rounded-xl bg-harbor-50 px-4 py-3 text-sm text-muted">
        Harbor Plus checkout isn&apos;t switched on yet. Your wall keeps working
        free in the meantime.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {isActive ? (
        <Button
          onClick={() => go("/api/stripe/portal")}
          disabled={busy !== null}
          variant="secondary"
        >
          {busy ? "Opening…" : "Manage or cancel subscription"}
        </Button>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={() => go("/api/stripe/checkout", { plan: "monthly" }, "monthly")}
            disabled={busy !== null}
          >
            {busy === "monthly" ? "Starting…" : "Go Plus — $3.99/mo"}
          </Button>
          <Button
            onClick={() => go("/api/stripe/checkout", { plan: "annual" }, "annual")}
            disabled={busy !== null}
            variant="beacon"
          >
            {busy === "annual" ? "Starting…" : "Go Plus — $39/yr (save 18%)"}
          </Button>
        </div>
      )}
    </div>
  );
}
