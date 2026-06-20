import { createClient } from "@/lib/supabase/client";
import { normalizePairingCode } from "@/lib/pairing-format";
import type { Json } from "@/lib/database.types";
import type { KioskSnapshot, KioskState, Mutation } from "./types";

type Identified = { id: string; deleted_at?: string | null };

function mergeById<T extends Identified>(existing: T[], incoming: T[]): T[] {
  const map = new Map(existing.map((x) => [x.id, x]));
  for (const row of incoming) {
    if (row.deleted_at) map.delete(row.id);
    else map.set(row.id, row);
  }
  return Array.from(map.values());
}

function buildPayload(outbox: Mutation[]): Json {
  const check_ins: Json[] = [];
  const completions: Json[] = [];
  const redemptions: Json[] = [];
  const list_ops: Json[] = [];
  for (const m of outbox) {
    if (m.kind === "check_in")
      check_ins.push({ child_id: m.child_id, feeling: m.feeling, note: m.note, created_at: m.created_at });
    else if (m.kind === "completion")
      completions.push({ child_id: m.child_id, step_id: m.step_id, points: m.points, created_at: m.created_at });
    else if (m.kind === "redemption")
      redemptions.push({
        child_id: m.child_id,
        points: m.points,
        reason: m.reason,
        label: m.label ?? null,
        store_item_id: m.store_item_id ?? null,
        created_at: m.created_at,
      });
    else if (m.kind === "list_add")
      list_ops.push({
        op: "add",
        client_id: m.client_id,
        name: m.name,
        category: m.category,
        list_kind: m.list_kind,
        added_by_label: m.added_by_label,
        created_at: m.created_at,
      });
    else if (m.kind === "list_check")
      list_ops.push({ op: "check", id: m.id, checked: m.checked, created_at: m.created_at });
  }
  return { check_ins, completions, redemptions, list_ops };
}

function applyPull(state: KioskState, snap: KioskSnapshot): KioskState {
  const next: KioskState = {
    ...state,
    snapshot: {
      ...state.snapshot,
      household: snap.household ?? state.snapshot.household,
      children: mergeById(state.snapshot.children, snap.children ?? []),
      routines: mergeById(state.snapshot.routines, snap.routines ?? []),
      steps: mergeById(state.snapshot.steps, snap.steps ?? []),
      calm_tools: mergeById(state.snapshot.calm_tools, snap.calm_tools ?? []),
      events: mergeById(state.snapshot.events ?? [], snap.events ?? []),
      store_items: mergeById(state.snapshot.store_items ?? [], snap.store_items ?? []),
      list_items: mergeById(state.snapshot.list_items ?? [], snap.list_items ?? []),
      wall_messages: mergeById(state.snapshot.wall_messages ?? [], snap.wall_messages ?? []),
      reminders: mergeById(state.snapshot.reminders ?? [], snap.reminders ?? []),
      server_time: snap.server_time,
    },
    lastSync: snap.server_time,
  };
  // Adopt server points (we only get here after a clean push, so no local loss).
  const points = { ...next.points };
  for (const rw of snap.rewards ?? []) points[rw.child_id] = rw.points_total;
  next.points = points;

  // Adopt an account-level PIN set remotely; keep the local PIN if none.
  if (snap.household?.parent_pin_hash) next.pinHash = snap.household.parent_pin_hash;
  return next;
}

/**
 * Pair a device with a household using a one-time code. Network is required for
 * this single step; everything afterward works offline.
 */
export async function pairDevice(code: string): Promise<{
  device_secret: string;
  household_id: string;
  snapshot: KioskSnapshot;
}> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("rpc_kiosk_pair", {
    p_code: normalizePairingCode(code),
  });
  if (error) {
    if (error.message?.includes("invalid_or_used_code")) {
      throw new Error("That code didn't work. Check it and try again.");
    }
    throw new Error("Couldn't reach Harbor. Check the connection and retry.");
  }
  return data as { device_secret: string; household_id: string; snapshot: KioskSnapshot };
}

/**
 * Push pending mutations and pull remote edits — ONLY when online and Plus is
 * active. Daily kiosk use never calls this; it is pure backup/remote-edit.
 * Returns the (possibly updated) state; on failure returns the input unchanged.
 */
export async function syncNow(state: KioskState): Promise<KioskState> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return state;
  if (!state.snapshot.household.plus_active) return state;

  const supabase = createClient();
  let next = state;

  if (next.outbox.length > 0) {
    const { error } = await supabase.rpc("rpc_kiosk_push", {
      p_secret: next.deviceSecret,
      p_payload: buildPayload(next.outbox),
    });
    if (error) return next; // keep the outbox; we'll retry on the next tick
    next = { ...next, outbox: [] };
  }

  const { data, error } = await supabase.rpc("rpc_kiosk_pull", {
    p_secret: next.deviceSecret,
    p_since: next.lastSync ?? undefined,
  });
  if (!error && data) next = applyPull(next, data as KioskSnapshot);
  return next;
}
