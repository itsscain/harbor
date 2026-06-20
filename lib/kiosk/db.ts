import { openDB, type IDBPDatabase } from "idb";
import type { KioskState } from "./types";

const DB_NAME = "harbor-kiosk";
const STORE = "kv";
const STATE_KEY = "state";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      },
    });
  }
  return dbPromise;
}

export async function loadState(): Promise<KioskState | null> {
  const db = await getDb();
  return (await db.get(STORE, STATE_KEY)) ?? null;
}

export async function persistState(state: KioskState): Promise<void> {
  const db = await getDb();
  await db.put(STORE, state, STATE_KEY);
}

export async function clearState(): Promise<void> {
  const db = await getDb();
  await db.delete(STORE, STATE_KEY);
}

/** Web Crypto SHA-256 of a PIN (kiosk PIN is verified locally, offline). */
export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`harbor:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function todayKey(): string {
  // Local calendar date — routines reset at local midnight.
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
