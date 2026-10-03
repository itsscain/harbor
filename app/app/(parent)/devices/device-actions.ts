"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getMyHousehold } from "@/lib/household";
import { generatePairingCode } from "@/lib/codes";
import type { Json } from "@/lib/database.types";

// Screens (the wall, bedroom screens, Lanterns): add, rename, find, update, sleep settings,
// remove. Every action RETURNS an honest result; "Add a screen" hands back the new code.

export type ScreenResult = { ok: true; message?: string; id?: string; code?: string } | { ok: false; error: string };

const clip = (v: unknown, max: number): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, max) : null;
};
const hhmm = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return /^\d{2}:\d{2}$/.test(s) ? s : null;
};

async function ctx() {
  const me = await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household found.");
  return { me, household, supabase: await createClient() };
}

const touch = () => {
  revalidatePath("/app/devices");
  revalidatePath("/app/settings");
  revalidatePath("/app");
};

/** Create a one-time pairing code for a new wall or a kid's bedroom screen. */
export async function createScreen(kind: "wall" | "outpost", childId: string | null): Promise<ScreenResult> {
  const { me, household, supabase } = await ctx();
  let child_id: string | null = null;
  if (kind === "outpost") {
    if (!childId) return { ok: false, error: "Pick whose bedroom screen it is." };
    const { data } = await supabase.from("children").select("id").eq("id", childId).eq("household_id", household.id).maybeSingle();
    if (!data) return { ok: false, error: "That child isn't in your family." };
    child_id = data.id;
  }
  const code = generatePairingCode();
  const { data, error } = await supabase
    .from("device_pairings")
    .insert({ household_id: household.id, code, status: "pending", kind, child_id, paired_by: me.id })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "Couldn't make a code. Try again." };
  touch();
  return { ok: true, id: data.id, code, message: "Code ready" };
}

export async function renameScreen(id: string, formData: FormData): Promise<ScreenResult> {
  const { household, supabase } = await ctx();
  const { error } = await supabase
    .from("device_pairings")
    .update({ device_label: clip(formData.get("device_label"), 40), icon: clip(formData.get("icon"), 8) })
    .eq("id", id)
    .eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't save that." };
  touch();
  return { ok: true, message: "Saved" };
}

/** "Find it" flashes + chimes the screen; "Update" reloads it onto the newest version. */
export async function screenCommand(id: string, action: "identify" | "refresh"): Promise<ScreenResult> {
  const { household, supabase } = await ctx();
  const { error } = await supabase.from("device_pairings").update({ pending_command: action }).eq("id", id).eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't reach that screen." };
  touch();
  return { ok: true, message: action === "identify" ? "It'll flash and chime within 30 seconds" : "It'll update within 30 seconds" };
}

/** Per-screen rest settings (blank = use the family's wall settings). */
export async function saveScreenSleep(id: string, formData: FormData): Promise<ScreenResult> {
  const { household, supabase } = await ctx();
  const { data: cur } = await supabase.from("device_pairings").select("settings_json").eq("id", id).eq("household_id", household.id).maybeSingle();
  if (!cur) return { ok: false, error: "That screen isn't there anymore." };
  const next: Record<string, unknown> = { ...((cur.settings_json as Record<string, unknown>) ?? {}) };
  next.screensaver = formData.get("screensaver") === "on";
  const idle = Number(formData.get("idleSeconds"));
  if (Number.isFinite(idle) && idle >= 30) next.idleSeconds = Math.min(3600, Math.round(idle));
  else delete next.idleSeconds;
  const qs = hhmm(formData.get("quietStart"));
  const qe = hhmm(formData.get("quietEnd"));
  if (qs && qe) {
    next.quietStart = qs;
    next.quietEnd = qe;
  } else {
    delete next.quietStart;
    delete next.quietEnd;
  }
  const { error } = await supabase.from("device_pairings").update({ settings_json: next as Json }).eq("id", id);
  if (error) return { ok: false, error: "Couldn't save that." };
  touch();
  return { ok: true, message: "Saved" };
}

/** Remove a screen: it loses access right away and goes back to its pairing screen. */
export async function removeScreen(id: string): Promise<ScreenResult> {
  const { household, supabase } = await ctx();
  const { error } = await supabase.from("device_pairings").delete().eq("id", id).eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't remove that screen." };
  touch();
  return { ok: true, message: "Screen removed" };
}

/** A Lantern shows its own code; claiming it makes it that child's bedside screen. */
export async function claimLanternScreen(formData: FormData): Promise<ScreenResult> {
  const { supabase } = await ctx();
  const code = String(formData.get("code") ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const childId = clip(formData.get("child_id"), 64);
  if (code.length < 6) return { ok: false, error: "Type the 6-character code from the Lantern's screen." };
  if (!childId) return { ok: false, error: "Pick whose Lantern it is." };
  const { data, error } = await supabase.rpc("rpc_lantern_claim", { p_code: code, p_child_id: childId, p_nickname: clip(formData.get("nickname"), 40) ?? "" });
  if (error) {
    const m = error.message || "";
    if (m.includes("invalid_or_expired_code")) return { ok: false, error: "That code didn't work. Check it matches the Lantern (codes expire after 15 minutes)." };
    if (m.includes("not_your_child")) return { ok: false, error: "Pick one of your own kids." };
    return { ok: false, error: "Couldn't set up the Lantern. Try again in a moment." };
  }
  touch();
  const name = (data as { child_name?: string } | null)?.child_name;
  return { ok: true, message: name ? `${name}'s Lantern is lighting up` : "Lantern set up" };
}
