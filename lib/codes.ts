import { randomInt } from "node:crypto";

// Unambiguous alphabet (no O/0/I/1) for human-typed pairing codes.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Generate a raw 8-char uppercase pairing code (stored as-is in the DB). */
export function generatePairingCode(): string {
  let raw = "";
  for (let i = 0; i < 8; i++) raw += ALPHABET[randomInt(ALPHABET.length)];
  return raw;
}

// Re-export the pure helpers so server code can keep importing from "@/lib/codes".
export { formatPairingCode, normalizePairingCode } from "@/lib/pairing-format";
