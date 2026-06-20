import { randomInt } from "node:crypto";

// Unambiguous alphabet (no O/0/I/1) for human-typed pairing codes.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Generate a raw 8-char uppercase pairing code (stored as-is in the DB). */
export function generatePairingCode(): string {
  let raw = "";
  for (let i = 0; i < 8; i++) raw += ALPHABET[randomInt(ALPHABET.length)];
  return raw;
}

/** Format a stored code for display, e.g. ABCDEFGH → ABCD-EFGH. */
export function formatPairingCode(code: string): string {
  const c = code.toUpperCase();
  return c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}

/** Normalize user-typed input back to the stored form (strip dashes/spaces). */
export function normalizePairingCode(input: string): string {
  return input.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}
