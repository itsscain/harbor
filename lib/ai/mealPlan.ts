import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { haikuJson, aiErrorMessage } from "./anthropic";

type DB = SupabaseClient<Database>;

export type PlanDinnersResult = {
  added: number;
  groceryAdded: number;
  usedPantry: boolean;
  error?: string;
};

/** Pantry-aware dinner planning for the next 7 open days. Works with any
 *  Supabase client (request-scoped for the parent action, service-role for the
 *  voice endpoint). Does not revalidate — callers handle that. */
export async function planDinners(supabase: DB, household_id: string, key: string): Promise<PlanDinnersResult> {
  const base = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });

  const { data: existing } = await supabase
    .from("meals")
    .select("date")
    .eq("household_id", household_id)
    .eq("meal_type", "dinner")
    .is("deleted_at", null)
    .in("date", dates);
  const taken = new Set((existing ?? []).map((m) => m.date));
  const openDates = dates.filter((d) => !taken.has(d));
  if (openDates.length === 0) return { added: 0, groceryAdded: 0, usedPantry: false };

  const { data: kids } = await supabase
    .from("children")
    .select("name")
    .eq("household_id", household_id)
    .is("deleted_at", null);
  const kidNames = (kids ?? []).map((k) => k.name).join(", ") || "the family";

  const { data: pantryRows } = await supabase
    .from("list_items")
    .select("name, quantity")
    .eq("household_id", household_id)
    .eq("list_kind", "pantry")
    .is("deleted_at", null);
  const pantry = (pantryRows ?? []).map((p) => (p.quantity ? `${p.name} (${p.quantity})` : p.name));
  const usedPantry = pantry.length > 0;

  const system = usedPantry
    ? "You are a warm, practical family meal planner who cooks from what's on hand. Suggest simple, varied, kid-friendly dinners that PRIMARILY use the family's pantry/on-hand ingredients, adding only a few common extras. For each dinner give a short title, one fitting food emoji, the pantry items it uses, and any extra ingredients to buy. Never repeat a dish."
    : "You are a warm, practical family meal planner. Suggest simple, varied, kid-friendly weeknight dinners. For each dinner give a short title, one fitting food emoji, and any ingredients to buy. Never repeat a dish.";

  const prompt =
    `Plan one dinner for each of these dates for a family with kids named ${kidNames}: ${openDates.join(", ")}.` +
    (usedPantry
      ? `\n\nPantry / on-hand ingredients to build the meals around:\n- ${pantry.join("\n- ")}\n\nLean on these as much as possible and keep the extra shopping list short.`
      : "") +
    `\nReturn exactly one dinner per date, using the date strings exactly as given.`;

  try {
    const result = await haikuJson<{
      meals: { date: string; title: string; emoji: string; uses?: string[]; needs?: string[] }[];
    }>({
      key,
      maxTokens: 1200,
      system,
      prompt,
      toolName: "save_meal_plan",
      schema: {
        type: "object",
        properties: {
          meals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                date: { type: "string", description: "YYYY-MM-DD, one of the requested dates" },
                title: { type: "string" },
                emoji: { type: "string" },
                uses: { type: "array", items: { type: "string" }, description: "pantry items this meal uses" },
                needs: { type: "array", items: { type: "string" }, description: "extra ingredients to buy" },
              },
              required: ["date", "title", "emoji"],
            },
          },
        },
        required: ["meals"],
      },
    });

    const filtered = (result.meals ?? []).filter((m) => openDates.includes(m.date) && m.title?.trim());
    const byDate = new Map<string, (typeof filtered)[number]>();
    for (const m of filtered) if (!byDate.has(m.date)) byDate.set(m.date, m);
    const valid = [...byDate.values()];
    if (valid.length === 0) return { added: 0, groceryAdded: 0, usedPantry, error: "The AI didn't return usable meals — try again." };

    const noteFor = (m: { uses?: string[]; needs?: string[] }): string | null => {
      const u = (m.uses ?? []).filter(Boolean);
      const n = (m.needs ?? []).filter(Boolean);
      const parts: string[] = [];
      if (u.length) parts.push(`Uses ${u.join(", ")}`);
      if (n.length) parts.push(`Need ${n.join(", ")}`);
      const s = parts.join(" · ");
      return s ? s.slice(0, 200) : null;
    };

    const { error: mErr } = await supabase.from("meals").insert(
      valid.map((m) => ({
        household_id,
        date: m.date,
        meal_type: "dinner",
        title: m.title.trim().slice(0, 80),
        emoji: (m.emoji || "🍽️").slice(0, 8),
        notes: noteFor(m),
      })),
    );
    if (mErr) return { added: 0, groceryAdded: 0, usedPantry, error: mErr.message };

    const { data: groc } = await supabase
      .from("list_items")
      .select("name")
      .eq("household_id", household_id)
      .eq("list_kind", "grocery")
      .is("deleted_at", null);
    const have = new Set<string>([
      ...(groc ?? []).map((g) => g.name.toLowerCase().trim()),
      ...pantry.map((p) => p.toLowerCase().replace(/\s*\(.*\)\s*/, "").trim()),
    ]);
    const needs = Array.from(
      new Set(valid.flatMap((m) => m.needs ?? []).map((s) => s.trim()).filter(Boolean)),
    ).filter((s) => !have.has(s.toLowerCase()));
    let groceryAdded = 0;
    if (needs.length) {
      const toAdd = needs.slice(0, 30);
      const { error: gErr } = await supabase.from("list_items").insert(
        toAdd.map((name) => ({
          household_id,
          name: name.slice(0, 80),
          list_kind: "grocery",
          added_by_label: "AI meal plan",
        })),
      );
      if (!gErr) groceryAdded = toAdd.length;
    }

    return { added: valid.length, groceryAdded, usedPantry };
  } catch (e) {
    return { added: 0, groceryAdded: 0, usedPantry, error: aiErrorMessage(e) };
  }
}
