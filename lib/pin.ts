import "server-only";
import { createHash } from "node:crypto";

/**
 * Server-side PIN hash. MUST match the kiosk's client hash (lib/kiosk/db.ts
 * hashPin) so a PIN set in the companion app verifies on the wall device.
 */
export function hashPinServer(pin: string): string {
  return createHash("sha256").update(`harbor:${pin}`).digest("hex");
}
