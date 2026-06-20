// Pure pairing-code helpers — safe to import in the browser (no node deps).

/** Format a stored code for display, e.g. ABCDEFGH → ABCD-EFGH. */
export function formatPairingCode(code: string): string {
  const c = code.toUpperCase();
  return c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}

/** Normalize user-typed input back to the stored form (strip dashes/spaces). */
export function normalizePairingCode(input: string): string {
  return input.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}
