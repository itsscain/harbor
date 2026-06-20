import { Trash2, UtensilsCrossed } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Input, Field, Select } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { titleCase } from "@/lib/format";
import { addMeal, deleteMeal } from "../hub-actions";

export const metadata = { title: "Meals" };
export const dynamic = "force-dynamic";

export default async function MealsPage() {
  const household = await getMyHousehold();
  if (!household) return <Card><p className="text-muted">No household yet.</p></Card>;
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: meals } = await supabase
    .from("meals")
    .select("*")
    .eq("household_id", household.id)
    .is("deleted_at", null)
    .gte("date", today)
    .order("date")
    .order("sort_order");

  const byDate = new Map<string, typeof meals>();
  for (const m of meals ?? []) {
    const list = byDate.get(m.date) ?? [];
    list.push(m);
    byDate.set(m.date, list as never);
  }

  return (
    <>
      <PageHeader title="Meal plan" subtitle="Tonight's dinner shows on the wall. Plan the week in a minute." />

      <Card className="mb-4">
        <h2 className="flex items-center gap-2 font-display text-base font-bold text-harbor">
          <UtensilsCrossed className="h-5 w-5" /> Add a meal
        </h2>
        <form action={addMeal} className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Day"><Input name="date" type="date" defaultValue={today} required /></Field>
          <Field label="Meal">
            <Select name="meal_type" defaultValue="dinner">
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </Select>
          </Field>
          <Field label="What's cooking?" className="sm:col-span-1"><Input name="title" required placeholder="Taco night" /></Field>
          <Field label="Emoji"><Input name="emoji" placeholder="🌮" className="w-24 text-center text-xl" /></Field>
          <div className="sm:col-span-2"><SubmitButton>Add meal</SubmitButton></div>
        </form>
      </Card>

      <div className="space-y-4">
        {[...byDate.entries()].map(([date, list]) => (
          <div key={date}>
            <p className="mb-1.5 text-sm font-semibold text-muted">
              {new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </p>
            <div className="space-y-2">
              {(list ?? []).map((m) => (
                <Card key={m.id} className="flex items-center gap-3 py-3">
                  <span className="text-2xl">{m.emoji ?? "🍽️"}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-ink">{m.title}</p>
                    <p className="text-xs text-muted">{titleCase(m.meal_type)}</p>
                  </div>
                  <form action={deleteMeal.bind(null, m.id)}>
                    <button className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50" aria-label={`Delete ${m.title}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </Card>
              ))}
            </div>
          </div>
        ))}
        {(meals ?? []).length === 0 && <p className="text-sm text-muted">No meals planned yet.</p>}
      </div>
    </>
  );
}
