import { createClient } from "@/lib/supabase/client";
import { normalizePairingCode } from "@/lib/pairing-format";
import type { Json } from "@/lib/database.types";
import type { KioskSnapshot, KioskState, Mutation } from "./types";

type Identified = { id: string; deleted_at?: string | null };

function mergeById<T extends Identified>(existing: T[], incoming: T[]): T[] {
  const base = Array.isArray(existing) ? existing : [];
  const inc = Array.isArray(incoming) ? incoming : [];
  const map = new Map(base.map((x) => [x.id, x]));
  for (const row of inc) {
    if (!row || !row.id) continue;
    if (row.deleted_at) map.delete(row.id);
    else map.set(row.id, row);
  }
  return Array.from(map.values());
}

function buildPayload(outbox: Mutation[]): Json {
  const check_ins: Json[] = [];
  const completions: Json[] = [];
  const chore_dones: Json[] = [];
  const redemptions: Json[] = [];
  const list_ops: Json[] = [];
  for (const m of outbox) {
    if (m.kind === "check_in")
      check_ins.push({ child_id: m.child_id, feeling: m.feeling, note: m.note, created_at: m.created_at });
    else if (m.kind === "completion")
      completions.push({
        op_id: m.op_id,
        child_id: m.child_id,
        step_id: m.step_id,
        points: m.points,
        created_at: m.created_at,
      });
    else if (m.kind === "chore_done")
      chore_dones.push({
        op_id: m.op_id,
        child_id: m.child_id,
        chore_id: m.chore_id,
        points: m.points,
        created_at: m.created_at,
      });
    else if (m.kind === "redemption")
      redemptions.push({
        op_id: m.op_id,
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
  return { check_ins, completions, chore_dones, redemptions, list_ops };
}

function applyPull(state: KioskState, snap: KioskSnapshot, replace = false): KioskState {
  if (!snap || typeof snap !== "object") return state;
  // Delta pulls MERGE (additive + tombstones). A full refresh (replace=true, from
  // a since=null pull that returns the complete set) REPLACES server-authored
  // arrays so anything no longer on the server — e.g. a stale cached message — is
  // pruned locally. Kiosk-authored data (progress, outbox, points) is untouched.
  const pull = <T extends Identified>(existing: T[], incoming: T[] | undefined): T[] =>
    replace ? (Array.isArray(incoming) ? incoming : []) : mergeById(existing ?? [], incoming ?? []);
  const next: KioskState = {
    ...state,
    snapshot: {
      ...state.snapshot,
      household: snap.household ?? state.snapshot.household,
      children: pull(state.snapshot.children, snap.children),
      routines: pull(state.snapshot.routines, snap.routines),
      steps: pull(state.snapshot.steps, snap.steps),
      chores: pull(state.snapshot.chores ?? [], snap.chores),
      calm_tools: pull(state.snapshot.calm_tools, snap.calm_tools),
      house_rules: pull(state.snapshot.house_rules ?? [], snap.house_rules),
      events: pull(state.snapshot.events ?? [], snap.events),
      store_items: pull(state.snapshot.store_items ?? [], snap.store_items),
      list_items: pull(state.snapshot.list_items ?? [], snap.list_items),
      wall_messages: pull(state.snapshot.wall_messages ?? [], snap.wall_messages),
      reminders: pull(state.snapshot.reminders ?? [], snap.reminders),
      meals: pull(state.snapshot.meals ?? [], snap.meals),
      groundings: pull(state.snapshot.groundings ?? [], snap.groundings),
      corners: pull(state.snapshot.corners ?? [], snap.corners),
      server_time: snap.server_time,
    },
    lastSync: snap.server_time,
  };
  // Apply hard-deletion tombstones: drop the child + everything tied to it locally.
  const childDeletions = new Set(
    (snap.deletions ?? []).filter((d) => d.entity === "child").map((d) => d.entity_id),
  );
  if (childDeletions.size) {
    const s = next.snapshot;
    const goneRoutineIds = new Set(
      s.routines.filter((r) => childDeletions.has(r.child_id)).map((r) => r.id),
    );
    s.children = s.children.filter((c) => !childDeletions.has(c.id));
    s.routines = s.routines.filter((r) => !childDeletions.has(r.child_id));
    s.steps = s.steps.filter((st) => !goneRoutineIds.has(st.routine_id));
    s.chores = (s.chores ?? []).filter((x) => !childDeletions.has(x.child_id));
    s.store_items = (s.store_items ?? []).filter((x) => !x.child_id || !childDeletions.has(x.child_id));
    s.events = (s.events ?? []).filter((x) => !x.child_id || !childDeletions.has(x.child_id));
    s.wall_messages = (s.wall_messages ?? []).filter((x) => !x.child_id || !childDeletions.has(x.child_id));
    s.calm_tools = s.calm_tools.filter((x) => !x.child_id || !childDeletions.has(x.child_id));
  }

  // Adopt server points (we only get here after a clean push, so no local loss).
  const points = { ...next.points };
  for (const rw of snap.rewards ?? []) points[rw.child_id] = rw.points_total;
  for (const id of childDeletions) delete points[id];
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
  kind?: string;
  child_id?: string | null;
  snapshot: KioskSnapshot;
}> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("rpc_kiosk_pair", {
    p_code: normalizePairingCode(code),
  });
  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("invalid_or_used_code")) {
      throw new Error("That code wasn't found. Double-check the setup email and try again.");
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new Error("No internet yet. Connect this tablet to Wi-Fi, then try again.");
    }
    throw new Error("Couldn't reach Harbor just now. Check the connection and retry.");
  }
  return data as { device_secret: string; household_id: string; kind?: string; child_id?: string | null; snapshot: KioskSnapshot };
}

/**
 * Push pending mutations and pull remote edits — ONLY when online and Plus is
 * active. Daily kiosk use never calls this; it is pure backup/remote-edit.
 * Returns the (possibly updated) state; on failure returns the input unchanged.
 */
export async function syncNow(state: KioskState, opts?: { full?: boolean }): Promise<KioskState> {
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

  // full=true → pull the complete set (since=null) and REPLACE local arrays,
  // self-healing any stale/orphaned cached rows. Otherwise a cheap delta pull.
  const { data, error } = await supabase.rpc("rpc_kiosk_pull", {
    p_secret: next.deviceSecret,
    p_since: opts?.full ? undefined : (next.lastSync ?? undefined),
  });
  if (!error && data) next = applyPull(next, data as KioskSnapshot, opts?.full ?? false);
  return next;
}
