"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getMyHousehold } from "@/lib/household";
import type { Json } from "@/lib/database.types";

// Calm tools kids can reach any time on the wall. Each action RETURNS an honest result;
// removing is soft (Undo). Settings are built from friendly fields — never raw JSON.

export type CalmResult = { ok: true; message?: string } | { ok: false; error: string };
type ToolType = "breathing" | "feelings" | "break" | "social_story";
const TYPES: ToolType[] = ["breathing", "feelings", "break", "social_story"];

const DEFAULTS: Record<ToolType, Record<string, unknown>> = {
  breathing: { pattern: "4-7-8", rounds: 4 },
  feelings: { options: ["happy", "calm", "sad", "angry", "worried", "tired"] },
  break: { minutes: 5 },
  social_story: { title: "Big feelings are okay", pages: ["Everyone has big feelings.", "I can take a slow breath.", "I can ask for help.", "The feeling gets smaller. I'm okay."] },
};

async function ctx() {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household found.");
  return { household, supabase: await createClient() };
}
const touch = () => revalidatePath("/app/calm");
const num = (v: unknown, lo: number, hi: number, fb: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : fb;
};

function configFrom(type: ToolType, formData: FormData): Record<string, unknown> {
  if (type === "breathing") return { pattern: formData.get("pattern") === "4-4-4" ? "4-4-4" : "4-7-8", rounds: num(formData.get("rounds"), 1, 12, 4) };
  if (type === "break") return { minutes: num(formData.get("minutes"), 1, 30, 5) };
  if (type === "feelings") {
    const options = Array.from(new Set(formData.getAll("options").map((v) => String(v).trim().toLowerCase()).filter(Boolean))).slice(0, 12);
    return { options: options.length ? options : DEFAULTS.feelings.options };
  }
  const pages = formData.getAll("page").map((v) => String(v).trim()).filter(Boolean).slice(0, 12);
  return { title: String(formData.get("title") ?? "").trim().slice(0, 60) || "A calm story", pages: pages.length ? pages : ["…"] };
}

export async function saveCalmTool(id: string, formData: FormData): Promise<CalmResult> {
  const { household, supabase } = await ctx();
  const { data: t } = await supabase.from("calm_tools").select("tool_type").eq("id", id).eq("household_id", household.id).maybeSingle();
  if (!t || !TYPES.includes(t.tool_type as ToolType)) return { ok: false, error: "That tool isn't available." };
  const { error } = await supabase
    .from("calm_tools")
    .update({ config: configFrom(t.tool_type as ToolType, formData) as Json, enabled: formData.get("enabled") !== "" })
    .eq("id", id);
  if (error) return { ok: false, error: "Couldn't save that." };
  touch();
  return { ok: true, message: "Saved" };
}

export async function setCalmToolEnabled(id: string, enabled: boolean): Promise<CalmResult> {
  const { household, supabase } = await ctx();
  const { error } = await supabase.from("calm_tools").update({ enabled }).eq("id", id).eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't change that." };
  touch();
  return { ok: true, message: enabled ? "On the wall" : "Hidden from the wall" };
}

/** Add one tool (only types not already there), with kind defaults. */
export async function addCalmTool(type: string): Promise<CalmResult> {
  const { household, supabase } = await ctx();
  if (!TYPES.includes(type as ToolType)) return { ok: false, error: "Pick a tool." };
  const { data: have } = await supabase.from("calm_tools").select("id").eq("household_id", household.id).eq("tool_type", type as ToolType).is("deleted_at", null).limit(1);
  if (have?.length) return { ok: false, error: "That tool is already on the wall." };
  const { error } = await supabase
    .from("calm_tools")
    .insert({ household_id: household.id, tool_type: type as ToolType, config: DEFAULTS[type as ToolType] as Json, enabled: true, sort_order: TYPES.indexOf(type as ToolType) + 1 });
  if (error) return { ok: false, error: "Couldn't add that." };
  touch();
  return { ok: true, message: "Added to the wall" };
}

export async function addAllCalmTools(): Promise<CalmResult> {
  const { household, supabase } = await ctx();
  const { data: existing } = await supabase.from("calm_tools").select("tool_type").eq("household_id", household.id).is("deleted_at", null);
  const have = new Set((existing ?? []).map((t) => t.tool_type));
  const rows = TYPES.filter((t) => !have.has(t)).map((t, i) => ({ household_id: household.id, tool_type: t, config: DEFAULTS[t] as Json, enabled: true, sort_order: i + 1 }));
  if (!rows.length) return { ok: true, message: "They're all on the wall already" };
  const { error } = await supabase.from("calm_tools").insert(rows);
  if (error) return { ok: false, error: "Couldn't add them. Try again." };
  touch();
  return { ok: true, message: "Calm tools added to the wall" };
}

export async function deleteCalmToolSoft(id: string): Promise<CalmResult> {
  const { household, supabase } = await ctx();
  const { error } = await supabase.from("calm_tools").update({ deleted_at: new Date().toISOString() }).eq("id", id).eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't remove that." };
  touch();
  return { ok: true, message: "Removed" };
}

export async function restoreCalmTool(id: string): Promise<CalmResult> {
  const { household, supabase } = await ctx();
  const { error } = await supabase.from("calm_tools").update({ deleted_at: null }).eq("id", id).eq("household_id", household.id);
  if (error) return { ok: false, error: "Couldn't bring it back." };
  touch();
  return { ok: true, message: "Restored" };
}
