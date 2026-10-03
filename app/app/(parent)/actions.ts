"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getMyHousehold } from "@/lib/household";
import { getHouseholdAi, haikuText, aiErrorMessage } from "@/lib/ai/anthropic";

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

// (Everything else moved next to its page in the 2026-10 revamp: children/kid-actions.ts,
// plan/plan-actions.ts, medication/med-actions.ts, devices/device-actions.ts, store/,
// messages/, calm/, rules/, family/ and settings/ — each returns honest results.)

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
