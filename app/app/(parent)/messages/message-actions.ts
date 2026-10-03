"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getMyHousehold } from "@/lib/household";
import { tzFromSettings, wallTimeToUtcMs } from "@/lib/tz";

// Notes on the wall's message board. Every action RETURNS an honest result; removing is soft
// (Undo). A bonus is paid once, after the note is saved — never twice on a retry.

export type NoteResult = { ok: true; message?: string } | { ok: false; error: string };

const clip = (v: unknown, max: number): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s.slice(0, max) : null;
};

async function ctx() {
  const profile = await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household found.");
  return { profile, household, supabase: await createClient(), tz: tzFromSettings((household.settings ?? {}) as Record<string, unknown>) };
}
const touch = () => {
  revalidatePath("/app/messages");
  revalidatePath("/app");
};

/** "Show until" a day → the end of that day in the family's time zone. */
function untilIso(v: unknown, tz: string): string | null {
  const d = typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
  if (!d) return null;
  const ms = wallTimeToUtcMs(`${d}T23:59`, tz);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

async function noteFields(formData: FormData, householdId: string, tz: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const childRaw = clip(formData.get("child_id"), 64);
  let child_id: string | null = null;
  if (childRaw) {
    const { data } = await supabase.from("children").select("id").eq("id", childRaw).eq("household_id", householdId).maybeSingle();
    child_id = data?.id ?? null;
  }
  return {
    body: clip(formData.get("body"), 300),
    child_id,
    emoji: clip(formData.get("emoji"), 8) ?? "💬",
    author_label: clip(formData.get("author_label"), 30),
    pinned: formData.get("pinned") === "on",
    expires_at: formData.get("keep") === "until" ? untilIso(formData.get("until"), tz) : null,
  };
}

export async function postNote(formData: FormData): Promise<NoteResult> {
  const { household, supabase, tz, profile } = await ctx();
  const f = await noteFields(formData, household.id, tz, supabase);
  if (!f.body) return { ok: false, error: "Write a note first." };
  const bonus = Math.max(0, Math.min(50, Math.round(Number(formData.get("bonus_points")) || 0)));
  const { error } = await supabase
    .from("wall_messages")
    .insert({ ...f, author_label: f.author_label ?? profile.full_name?.split(" ")[0] ?? null, body: f.body, household_id: household.id, bonus_points: bonus });
  if (error) return { ok: false, error: "Couldn't post that. Try again." };
  touch();
  if (bonus > 0) {
    let targets: string[] = f.child_id ? [f.child_id] : [];
    if (!f.child_id) {
      const { data: kids } = await supabase.from("children").select("id").eq("household_id", household.id).is("deleted_at", null);
      targets = (kids ?? []).map((k) => k.id);
    }
    let failed = 0;
    for (const id of targets) {
      const { error: e } = await supabase.rpc("rpc_parent_adjust_points", { p_child: id, p_delta: bonus, p_reason: "bonus:A note on the wall" });
      if (e) failed++;
    }
    if (failed) return { ok: true, message: "Posted — but the bonus stars didn't all go through. You can give stars from Today." };
    return { ok: true, message: targets.length > 1 ? `Posted — +${bonus} ★ for each kid` : `Posted — +${bonus} ★` };
  }
  return { ok: true, message: "Posted to the wall" };
}

export async function saveNote(id: string, formData: FormData): Promise<NoteResult> {
  const { household, supabase, tz } = await ctx();
  const f = await noteFields(formData, household.id, tz, supabase);
  if (!f.body) return { ok: false, error: "The note can't be empty." };
  const { error } = await supabase
    .from("wall_messages")
    .update({ ...f, body: f.body })
    .eq("id", id)
    .eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't save that." };
  touch();
  return { ok: true, message: "Note saved" };
}

export async function deleteNoteSoft(id: string): Promise<NoteResult> {
  const { household, supabase } = await ctx();
  const { error } = await supabase.from("wall_messages").update({ deleted_at: new Date().toISOString() }).eq("id", id).eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't remove that." };
  touch();
  return { ok: true, message: "Note removed" };
}

export async function restoreNote(id: string): Promise<NoteResult> {
  const { household, supabase } = await ctx();
  const { error } = await supabase.from("wall_messages").update({ deleted_at: null }).eq("id", id).eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't bring it back." };
  touch();
  return { ok: true, message: "Restored" };
}
