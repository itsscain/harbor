"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getMyHousehold } from "@/lib/household";
import { CHILD_PALETTE } from "@/lib/kiosk/colors";
import { getHouseholdAi, haikuText, aiErrorMessage } from "@/lib/ai/anthropic";

function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

async function nextOrder(
  table: "children" | "routines" | "routine_steps" | "people" | "medications",
  column: "sort_order" | "order_index",
  fkColumn: string,
  fkValue: string,
): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from(table)
    .select(column)
    .eq(fkColumn, fkValue)
    .order(column, { ascending: false })
    .limit(1);
  const top = (data?.[0] as Record<string, number> | undefined)?.[column];
  return (typeof top === "number" ? top : -1) + 1;
}

// ── Children ─────────────────────────────────────────────────────────────────
/** Save (or clear) a child's photo avatar. The file is uploaded to Storage from
 *  the browser; this persists the resulting public URL. RLS scopes it to the
 *  parent's own household. */
export async function saveChildPhoto(id: string, url: string | null) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("children").update({ photo_url: url }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app");
  revalidatePath(`/app/children/${id}`);
}

/** Permanently delete a child and ALL their data (cascade) + a tombstone the wall
 *  consumes to drop them. Irreversible. */
export async function deleteChildPermanently(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.rpc("hard_delete_child", { p_child: id });
  if (error) throw new Error(error.message);
  revalidatePath("/app");
  revalidatePath("/app/children");
  redirect("/app/children");
}

// ── Template & step library (P3 §9) — data-driven, curated + save-your-own ────
// ── Calm tools ───────────────────────────────────────────────────────────────
export async function addCalmTool(formData: FormData) {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household found.");
  const supabase = await createClient();
  const type = String(formData.get("tool_type") || "breathing");
  const defaults: Record<string, Record<string, unknown>> = {
    breathing: { pattern: "4-4-4", rounds: 4 },
    feelings: { options: ["happy", "calm", "sad", "angry", "worried", "tired"] },
    break: { minutes: 5 },
    social_story: { title: "A calm story", pages: ["Page one."] },
  };
  const { error } = await supabase.from("calm_tools").insert({
    household_id: household.id,
    tool_type: type as "breathing" | "feelings" | "break" | "social_story",
    config: (defaults[type] ?? {}) as never,
    enabled: true,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/app/calm");
}

export async function updateCalmTool(id: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  let config: unknown = {};
  try {
    config = JSON.parse(String(formData.get("config") || "{}"));
  } catch {
    // Surface the problem instead of silently no-op'ing (which looked like success).
    throw new Error("Those settings aren't valid JSON — check the format and try again.");
  }
  const { error } = await supabase
    .from("calm_tools")
    .update({ config: config as never, enabled: formData.get("enabled") === "on" })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/calm");
}

export async function deleteCalmTool(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("calm_tools")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/calm");
}

// ── House rules + consequence ladder ──────────────────────────────────────────
export async function addHouseRule(kind: string, formData: FormData) {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household found.");
  const k = kind === "consequence" ? "consequence" : "rule";
  const title = String(formData.get("title") || "").trim().slice(0, 80);
  if (!title) return;
  const detail = String(formData.get("detail") || "").trim().slice(0, 200) || null;
  const emoji = String(formData.get("emoji") || "").trim().slice(0, 8) || null;
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("house_rules")
    .select("sort_order")
    .eq("household_id", household.id)
    .eq("kind", k)
    .is("deleted_at", null)
    .order("sort_order", { ascending: false })
    .limit(1);
  const sort_order = ((last?.[0]?.sort_order as number) ?? -1) + 1;
  const { error } = await supabase.from("house_rules").insert({
    household_id: household.id,
    kind: k,
    title,
    detail,
    emoji,
    sort_order,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/app/rules");
}

export async function updateHouseRule(id: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const title = String(formData.get("title") || "").trim().slice(0, 80);
  if (!title) return;
  const detail = String(formData.get("detail") || "").trim().slice(0, 200) || null;
  const emoji = String(formData.get("emoji") || "").trim().slice(0, 8) || null;
  const { error } = await supabase.from("house_rules").update({ title, detail, emoji }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/rules");
}

export async function deleteHouseRule(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("house_rules")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/rules");
}

/** Move a rule/consequence up or down within its kind by swapping sort_order. */
export async function moveHouseRule(id: string, dir: "up" | "down") {
  await requireUser();
  const supabase = await createClient();
  const { data: row } = await supabase.from("house_rules").select("id, household_id, kind").eq("id", id).maybeSingle();
  if (!row) return;
  const { data: siblings } = await supabase
    .from("house_rules")
    .select("id, sort_order")
    .eq("household_id", row.household_id)
    .eq("kind", row.kind)
    .is("deleted_at", null)
    .order("sort_order");
  const list = siblings ?? [];
  const idx = list.findIndex((s) => s.id === id);
  const swap = dir === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swap < 0 || swap >= list.length) return;
  const a = list[idx];
  const b = list[swap];
  await supabase.from("house_rules").update({ sort_order: b.sort_order }).eq("id", a.id);
  await supabase.from("house_rules").update({ sort_order: a.sort_order }).eq("id", b.id);
  revalidatePath("/app/rules");
}

/** One-tap starter set: a few calm rules + a gentle consequence ladder. */
export async function seedHouseRules() {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household found.");
  const supabase = await createClient();
  const { count } = await supabase
    .from("house_rules")
    .select("id", { count: "exact", head: true })
    .eq("household_id", household.id)
    .is("deleted_at", null);
  if ((count ?? 0) > 0) return; // never double-seed
  const rules = [
    { emoji: "💛", title: "Be kind with words and hands" },
    { emoji: "👂", title: "Listen the first time" },
    { emoji: "🧹", title: "Clean up your own mess" },
    { emoji: "✅", title: "Chores and routines before screens" },
    { emoji: "🙏", title: "Tell the truth" },
  ];
  const ladder = [
    { emoji: "💬", title: "Gentle reminder", detail: "A calm heads-up about the choice." },
    { emoji: "⏸️", title: "Warning", detail: "Last chance to turn it around." },
    { emoji: "📵", title: "Lose a privilege", detail: "Tablet or TV time for the day." },
    { emoji: "🌱", title: "Reset", detail: "A short reset to start fresh." },
  ];
  const rows = [
    ...rules.map((r, i) => ({ household_id: household.id, kind: "rule", title: r.title, emoji: r.emoji, detail: null, sort_order: i })),
    ...ladder.map((r, i) => ({ household_id: household.id, kind: "consequence", title: r.title, emoji: r.emoji, detail: r.detail, sort_order: i })),
  ];
  const { error } = await supabase.from("house_rules").insert(rows);
  if (error) throw new Error(error.message);
  revalidatePath("/app/rules");
}

// ── Family people (Brand-True §4.1–4.2): parents/caregivers/siblings on the wall ──
// People appear on the wall as PARTICIPANTS. Their routines earn NO points (health/
// adulthood isn't gamified) — modeling is the value. A routine can be "together".
const PERSON_ROLES = ["parent", "caregiver", "sibling"] as const;

export async function addPerson(formData: FormData) {
  await requireUser();
  const household = await getMyHousehold();
  if (!household) throw new Error("No household found.");
  const supabase = await createClient();
  const order = await nextOrder("people", "sort_order", "household_id", household.id);
  const role = String(formData.get("role") || "parent");
  const { error } = await supabase.from("people").insert({
    household_id: household.id,
    name: String(formData.get("name") || "New person"),
    avatar: str(formData.get("avatar")) ?? "💙",
    role: (PERSON_ROLES as readonly string[]).includes(role) ? role : "parent",
    color: CHILD_PALETTE[order % CHILD_PALETTE.length].value,
    sort_order: order,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/app/family");
}

export async function updatePerson(id: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const color = str(formData.get("color"));
  const { error } = await supabase
    .from("people")
    .update({
      name: String(formData.get("name") || ""),
      avatar: str(formData.get("avatar")),
      role: String(formData.get("role") || "parent"),
      ...(color ? { color } : {}),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/family");
}

export async function deletePerson(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("people").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/family");
}

export async function addPersonRoutine(personId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("routines").insert({
    person_id: personId,
    child_id: null,
    name: String(formData.get("name") || "New routine"),
    type: "schedule",
    together: formData.get("together") === "on",
    with_child_id: str(formData.get("with_child_id")),
    sort_order: await nextOrder("routines", "sort_order", "person_id", personId),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/app/family");
}

export async function updatePersonRoutine(id: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const days = formData.getAll("days").map((d) => Number(d)).filter((n) => Number.isFinite(n));
  const { error } = await supabase
    .from("routines")
    .update({
      name: String(formData.get("name") || ""),
      active: formData.get("active") === "on",
      together: formData.get("together") === "on",
      with_child_id: str(formData.get("with_child_id")),
      days_of_week: days.length ? days : null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/family");
}

export async function deletePersonRoutine(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("routines").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/family");
}

export async function addPersonStep(routineId: string, formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("routine_steps").insert({
    routine_id: routineId,
    label: String(formData.get("label") || "New step"),
    icon: str(formData.get("icon")),
    step_type: "task",
    reward_points: 0, // people never earn points
    order_index: await nextOrder("routine_steps", "order_index", "routine_id", routineId),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/app/family");
}

export async function deletePersonStep(id: string) {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("routine_steps").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/family");
}

// (Medicine, screens and the Lantern claim moved to medication/med-actions.ts and
// devices/device-actions.ts with the 2026-10 revamp.)

// ── Ask Harbor — the parent voice Copilot (AI-Led Voice §3.4) ─────────────────
// A parent asks naturally about their kids or for gentle, practical help. Grounded in
// their REAL household data (request-scoped → RLS-confined to their household); warm +
// concrete; DEFERS clinical/medical questions to a provider; never invents; drafts things
// the parent then applies via the normal editors. Adult-facing (no child-safety bounds),
// read/advise/draft only — it never mutates the household on its own.
export async function askHarbor(question: string): Promise<{ answer: string }> {
  await requireUser();
  const q = (question || "").trim();
  if (!q) return { answer: "" };
  if (q.length > 800) return { answer: "Could you ask that in a sentence or two? It helps me give a focused answer." };

  const household = await getMyHousehold();
  if (!household) return { answer: "No household yet." };
  const ai = await getHouseholdAi(household.id);
  if (!ai || !ai.enabled) {
    return {
      answer:
        "Ask Harbor needs the AI companion turned on — add your Anthropic key and enable it in Settings → AI Companion.",
    };
  }

  const supabase = await createClient();
  const { data: kids } = await supabase
    .from("children")
    .select("id, name, birthday, settings, ai_profile")
    .eq("household_id", household.id)
    .is("deleted_at", null)
    .order("sort_order");
  const kidList = kids ?? [];
  const ids = kidList.map((k) => k.id);

  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const [{ data: checks }, { data: routines }] = await Promise.all([
    supabase.from("check_ins").select("child_id, feeling").in("child_id", ids).gte("created_at", since),
    supabase.from("routines").select("child_id, name").in("child_id", ids).is("deleted_at", null),
  ]);

  const ageOf = (b: string | null) => {
    if (!b) return null;
    const y = Math.floor((Date.now() - new Date(b).getTime()) / (365.25 * 86_400_000));
    return Number.isFinite(y) && y > 0 && y < 25 ? y : null;
  };
  const context =
    kidList
      .map((k) => {
        const cs = (k.settings ?? {}) as Record<string, unknown>;
        const age = ageOf(k.birthday as string | null);
        const fcount: Record<string, number> = {};
        for (const c of checks ?? []) if (c.child_id === k.id) fcount[c.feeling] = (fcount[c.feeling] ?? 0) + 1;
        const topFeelings = Object.entries(fcount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([f, n]) => `${f}×${n}`)
          .join(", ");
        const rnames = (routines ?? []).filter((r) => r.child_id === k.id).map((r) => r.name).join(", ");
        return (
          `- ${k.name}${age ? `, ${age}y` : ""}${cs.sensory ? `, ${cs.sensory} sensory` : ""}. ` +
          `Routines: ${rnames || "none"}. Last 2 weeks of feelings: ${topFeelings || "none logged"}.` +
          ((k.ai_profile as { summary?: string } | null)?.summary
            ? ` Parent notes: ${String((k.ai_profile as { summary?: string }).summary).slice(0, 200)}`
            : "")
        );
      })
      .join("\n") || "(no children set up yet)";

  const system =
    "You are Harbor's Copilot for a PARENT of neurodivergent / high-needs kids. Be warm, calm, and " +
    "PRACTICAL — concrete, doable suggestions, never platitudes. Ground every answer in the household " +
    "data provided; never invent facts about a child. If they ask you to make something (a calmer " +
    "routine, a social story, a week summary), draft it clearly so they can use it in Harbor. " +
    "You are NOT a clinician: for medical, diagnostic, medication, or safety questions, say plainly that " +
    "you can't give medical advice and point them to their pediatrician or therapist. Keep answers " +
    "focused and kind — a few short paragraphs at most.";

  const prompt = `The family:\n${context}\n\nThe parent asks: "${q}"`;

  try {
    const answer = await haikuText({ key: ai.key, system, prompt, maxTokens: 600 });
    return { answer: answer || "I couldn't find an answer for that — try rephrasing?" };
  } catch (e) {
    return { answer: aiErrorMessage(e) };
  }
}
