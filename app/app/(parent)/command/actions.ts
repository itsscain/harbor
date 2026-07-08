"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getMyHousehold } from "@/lib/household";
import { HOUSE_MODES, type HouseMode } from "@/lib/command";

// The parent's live remote (Command). Each action rides the existing <1s broadcast:
// writing to reward_log / wall_commands / households / requests nudges every wall to
// delta-pull immediately (migration 0068 added those tables to kiosk_broadcast).

const MODE_SET = new Set(HOUSE_MODES.map((m) => m.mode));
const clampInt = (v: unknown, lo: number, hi: number): number => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : 0;
};
const clip = (v: unknown, max: number): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, max) : null;
};

async function ctx() {
  const profile = await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household found.");
  const supabase = await createClient();
  return { profile, household, supabase };
}

async function popCommand(input: {
  kind: "attention" | "note" | "praise" | "calm";
  childId: string | null;
  body?: string | null;
  emoji?: string | null;
  payload?: Record<string, unknown>;
}) {
  const { household, supabase, profile } = await ctx();
  const { error } = await supabase.from("wall_commands").insert({
    household_id: household.id,
    child_id: input.childId,
    kind: input.kind,
    body: input.body ?? null,
    emoji: input.emoji ?? null,
    payload: (input.payload ?? {}) as never,
    created_by: profile.id,
  });
  if (error) throw new Error(error.message);
  return { ok: true as const };
}

/** Grant (or dock) stars on the fly, with a reason. Positive grants can pop a wall
 *  celebration; negatives never shame on the wall. Returns the child's new balance. */
export async function grantStars(input: {
  childId: string;
  delta: number;
  reason?: string;
  pop?: boolean;
}): Promise<{ ok: boolean; points: number }> {
  const { household, supabase, profile } = await ctx();
  const delta = clampInt(input.delta, -500, 500);
  if (!input.childId || delta === 0) return { ok: false, points: 0 };

  const reason = clip(input.reason, 80) ?? (delta > 0 ? "Grown-up bonus" : "Grown-up adjustment");
  // Atomic: one SECURITY DEFINER txn validates child ownership, writes the ledger row, and
  // bumps the balance with `points_total + delta` (no lost update under concurrent grants,
  // no partial-failure split between two client calls). Returns the new total.
  const { data: points, error } = await supabase.rpc("rpc_parent_adjust_points", {
    p_child: input.childId,
    p_delta: delta,
    p_reason: `adjust:${reason}`,
  });
  if (error) throw new Error(error.message);
  const newTotal = typeof points === "number" ? points : 0;

  if (delta > 0 && input.pop) {
    await supabase.from("wall_commands").insert({
      household_id: household.id,
      child_id: input.childId,
      kind: "praise",
      body: reason,
      emoji: "⭐",
      payload: { stars: delta } as never,
      created_by: profile.id,
    });
  }
  revalidatePath("/app/command");
  revalidatePath(`/app/children/${input.childId}`);
  return { ok: true, points: newTotal };
}

/** Send a note that pops on a child's wall (or the whole house) right now. */
export async function sendWallNote(input: {
  childId: string | null;
  body: string;
  emoji?: string;
}): Promise<{ ok: boolean }> {
  const body = clip(input.body, 200);
  if (!body) return { ok: false };
  await popCommand({ kind: "note", childId: input.childId ?? null, body, emoji: clip(input.emoji, 8) ?? "💬" });
  revalidatePath("/app/command");
  return { ok: true };
}

/** "Get their attention" — a gentle chime + pulse on a child's wall (or all walls). */
export async function getAttention(input: { childId: string | null; body?: string }): Promise<{ ok: boolean }> {
  await popCommand({
    kind: "attention",
    childId: input.childId ?? null,
    body: clip(input.body, 120) ?? "Look up, please 👀",
    emoji: "👋",
  });
  revalidatePath("/app/command");
  return { ok: true };
}

/** Start a calm/breathing moment on a child's device from your phone. */
export async function startCalmMoment(input: { childId: string | null }): Promise<{ ok: boolean }> {
  await popCommand({
    kind: "calm",
    childId: input.childId ?? null,
    body: "Let's take a calm breath together",
    emoji: "🌬️",
  });
  revalidatePath("/app/command");
  return { ok: true };
}

/** Flip the whole house into a mode (Bedtime / Homework / Screen-free / Quiet), with an
 *  optional auto-off after N hours and an optional exempt child. Reaches every wall <1s. */
export async function setHouseMode(input: {
  mode: HouseMode;
  hours?: number;
  exceptChildId?: string | null;
}): Promise<{ ok: boolean }> {
  const { household, supabase } = await ctx();
  const mode = MODE_SET.has(input.mode) ? input.mode : "normal";
  const current = (household.settings ?? {}) as Record<string, unknown>;

  let houseMode: Record<string, unknown> | null;
  if (mode === "normal") {
    houseMode = null; // clear it
  } else {
    const hours = clampInt(input.hours ?? 0, 0, 12);
    const until = hours > 0 ? new Date(Date.now() + hours * 3600_000).toISOString() : null;
    const except = input.exceptChildId ? [input.exceptChildId] : [];
    houseMode = { mode, until, except, set_at: new Date().toISOString() };
  }

  const nextSettings = { ...current, house_mode: houseMode };
  const { error } = await supabase.from("households").update({ settings: nextSettings as never }).eq("id", household.id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/command");
  return { ok: true };
}

/** Approve or deny a kid's request from your phone; the wall shows the outcome. */
export async function decideRequest(input: {
  id: string;
  decision: "approved" | "denied";
  note?: string;
}): Promise<{ ok: boolean }> {
  const { household, supabase, profile } = await ctx();
  const decision = input.decision === "approved" ? "approved" : "denied";
  const { data: updated, error } = await supabase
    .from("requests")
    .update({
      status: decision,
      response_note: clip(input.note, 200),
      decided_by: profile.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("household_id", household.id)
    .eq("status", "pending")
    .select("id, child_id, kind")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!updated) return { ok: false }; // already decided or not mine

  revalidatePath("/app/command");
  revalidatePath("/app/notifications");
  return { ok: true };
}
