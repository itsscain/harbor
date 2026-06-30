"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

/** Queue a one-shot remote command on any device (operator-wide). The device pops it on its
 *  next check-in (≤30s): "refresh" clears caches + reloads to the latest build (the remote fix
 *  for a stale wall); "identify" makes it flash + chime. device_pairings UPDATE allows is_admin. */
export async function fleetCommand(id: string, action: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("device_pairings").update({ pending_command: action }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/fleet");
}

/** Bulk remote-refresh every paired wall on an old (or unknown) build — the proactive fix for
 *  a stale-build rollout (§10). No-op in dev (no VERCEL_GIT_COMMIT_SHA to compare against). */
export async function refreshStaleWalls() {
  await requireAdmin();
  const current = process.env.VERCEL_GIT_COMMIT_SHA || null;
  if (!current) return;
  const supabase = await createClient();
  const { data } = await supabase.from("device_pairings").select("id, app_version, paused").eq("status", "paired");
  const stale = (data ?? []).filter((d) => !d.paused && (!d.app_version || d.app_version !== current)).map((d) => d.id);
  if (stale.length) await supabase.from("device_pairings").update({ pending_command: "refresh" }).in("id", stale);
  revalidatePath("/admin/fleet");
}
