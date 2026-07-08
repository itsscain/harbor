import { createClient } from "@/lib/supabase/client";
import { normalizePairingCode } from "@/lib/pairing-format";
import { tzFromSettings, dayKeyInTz } from "@/lib/tz";
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
  const person_completions: Json[] = [];
  const med_logs: Json[] = [];
  const skill_progress: Json[] = [];
  const redemptions: Json[] = [];
  const list_ops: Json[] = [];
  const requests: Json[] = [];
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
    else if (m.kind === "person_completion")
      person_completions.push({
        op_id: m.op_id,
        person_id: m.person_id,
        step_id: m.step_id,
        created_at: m.created_at,
      });
    else if (m.kind === "med_log")
      med_logs.push({
        op_id: m.op_id,
        child_id: m.child_id,
        medication_id: m.medication_id,
        dose_date: m.dose_date,
        dose_time: m.dose_time,
        confirmed_by: m.confirmed_by,
        created_at: m.created_at,
      });
    else if (m.kind === "skill_progress")
      skill_progress.push({
        child_id: m.child_id,
        step_id: m.step_id,
        streak: m.streak,
        level_earned: m.level_earned,
        last_date: m.last_date,
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
    else if (m.kind === "request")
      requests.push({
        op_id: m.op_id,
        child_id: m.child_id,
        kind: m.request_kind,
        amount: m.amount,
        body: m.body,
        created_at: m.created_at,
      });
  }
  return { check_ins, completions, chore_dones, person_completions, med_logs, skill_progress, redemptions, list_ops, requests };
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
      people: pull(state.snapshot.people ?? [], snap.people),
      routines: pull(state.snapshot.routines, snap.routines),
      steps: pull(state.snapshot.steps, snap.steps),
      schedule_templates: pull(state.snapshot.schedule_templates ?? [], snap.schedule_templates),
      routine_child_overrides: pull(state.snapshot.routine_child_overrides ?? [], snap.routine_child_overrides),
      chores: pull(state.snapshot.chores ?? [], snap.chores),
      medications: pull(state.snapshot.medications ?? [], snap.medications),
      medication_logs: pull(state.snapshot.medication_logs ?? [], snap.medication_logs),
      skill_progress: pull(state.snapshot.skill_progress ?? [], snap.skill_progress),
      calm_tools: pull(state.snapshot.calm_tools, snap.calm_tools),
      house_rules: pull(state.snapshot.house_rules ?? [], snap.house_rules),
      events: pull(state.snapshot.events ?? [], snap.events),
      store_items: pull(state.snapshot.store_items ?? [], snap.store_items),
      list_items: pull(state.snapshot.list_items ?? [], snap.list_items),
      wall_messages: pull(state.snapshot.wall_messages ?? [], snap.wall_messages),
      wall_commands: pull(state.snapshot.wall_commands ?? [], snap.wall_commands),
      requests: pull(state.snapshot.requests ?? [], snap.requests),
      reminders: pull(state.snapshot.reminders ?? [], snap.reminders),
      meals: pull(state.snapshot.meals ?? [], snap.meals),
      groundings: pull(state.snapshot.groundings ?? [], snap.groundings),
      corners: pull(state.snapshot.corners ?? [], snap.corners),
      server_time: snap.server_time,
    },
    lastSync: snap.server_time,
    // Re-anchor trusted time (§1.2): the server time is fresh + clears any clock-
    // suspect flag; record the wall clock + trusted day for the offset + freeze.
    trustedAt: Date.now(),
    lastTrustedDay: snap.server_time
      ? `${new Date(snap.server_time).getFullYear()}-${String(new Date(snap.server_time).getMonth() + 1).padStart(2, "0")}-${String(new Date(snap.server_time).getDate()).padStart(2, "0")}`
      : state.lastTrustedDay,
    lastSeenWall: Date.now(),
    clockSuspect: false,
  };
  // Apply hard-deletion tombstones: drop the child + everything tied to it locally.
  const childDeletions = new Set(
    (snap.deletions ?? []).filter((d) => d.entity === "child").map((d) => d.entity_id),
  );
  if (childDeletions.size) {
    const s = next.snapshot;
    const goneRoutineIds = new Set(
      s.routines.filter((r) => r.child_id != null && childDeletions.has(r.child_id)).map((r) => r.id),
    );
    s.children = s.children.filter((c) => !childDeletions.has(c.id));
    s.routines = s.routines.filter((r) => r.child_id == null || !childDeletions.has(r.child_id));
    s.steps = s.steps.filter((st) => !goneRoutineIds.has(st.routine_id));
    s.chores = (s.chores ?? []).filter((x) => !childDeletions.has(x.child_id));
    // Shared routines survive a child deletion (child_id == null above) — but their
    // per-child overrides for the gone child don't.
    s.routine_child_overrides = (s.routine_child_overrides ?? []).filter(
      (x) => !childDeletions.has(x.child_id),
    );
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

  // Cross-device done-state (Lantern ↔ wall realtime): union today's step/chore completions
  // from ANY device into local progress, bucketed by the FAMILY-tz service day. Additive only
  // (local unpushed completions are never dropped); points still come from `rewards` above, so
  // this only mirrors the CHECKMARK — never a double-award. Idempotent across repeated pulls.
  if (Array.isArray(snap.completions) && snap.completions.length) {
    const tz = tzFromSettings(next.snapshot.household.settings as Record<string, unknown> | null);
    const today = snap.server_time ? dayKeyInTz(new Date(snap.server_time), tz) : null;
    if (today) {
      const progress = { ...next.progress };
      const resetAt = next.resetAt ?? {};
      for (const comp of snap.completions) {
        if (!comp?.child_id || !comp?.ref) continue;
        if (childDeletions.has(comp.child_id)) continue;
        if (dayKeyInTz(new Date(comp.at), tz) !== today) continue; // only today's checkmarks
        // Don't resurrect checkmarks a local "reset today" just cleared (§ reset-day).
        const ra = resetAt[comp.child_id];
        if (ra && new Date(comp.at).getTime() <= ra) continue;
        const cur = progress[comp.child_id]?.date === today ? progress[comp.child_id] : { date: today, completed: [] };
        if (!cur.completed.includes(comp.ref)) {
          progress[comp.child_id] = { date: today, completed: [...cur.completed, comp.ref] };
        } else if (progress[comp.child_id] !== cur) {
          progress[comp.child_id] = cur;
        }
      }
      next.progress = progress;
    }
  }

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
