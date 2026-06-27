// Vendor-neutral observability seam (Real-Time §8 — "you can't keep a freshness contract
// you can't see"). Today it emits a single STRUCTURED line that Vercel's log drains and the
// browser console capture, so production errors stop being invisible. It is also the ONE
// place to drop in Sentry (or any sink) later: add @sentry/nextjs + a DSN and forward from
// the marked seam below. Every call is fire-and-forget and swallows its own failures, so
// telemetry can never break the local-first kiosk (AGENTS.md non-negotiable).

type Ctx = Record<string, unknown>;

/** Report an error with structured context. Safe to call anywhere (client/server). */
export function captureError(error: unknown, context?: Ctx): void {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(
      JSON.stringify({ evt: "error", msg: err.message, ...(context ?? {}) }),
      err.stack ?? "",
    );
    // ── SENTRY SEAM ──────────────────────────────────────────────────────────
    // When a DSN is configured, forward here (kept lazy so the app stays keyless):
    //   import * as Sentry from "@sentry/nextjs";
    //   Sentry.captureException(err, { extra: context });
  } catch {
    /* never let telemetry throw */
  }
}

/** Emit a structured metric/event (e.g. realtime→wall propagation time). */
export function track(event: string, data?: Ctx): void {
  try {
    console.info(JSON.stringify({ evt: event, ...(data ?? {}) }));
  } catch {
    /* ignore */
  }
}
