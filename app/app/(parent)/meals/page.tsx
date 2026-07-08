import { Trash2, UtensilsCrossed } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Input, Field, Select } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmit } from "@/components/ui/ConfirmSubmit";
import { EmptyState } from "@/components/ui/EmptyState";
import { titleCase } from "@/lib/format";
import { addMeal, deleteMeal } from "../hub-actions";
import { GenerateMealsButton } from "@/components/app/GenerateMealsButton";

export const metadata = { title: "Meals" };
export const dynamic = "force-dynamic";

export default async function MealsPage() {
  const household = await getMyHousehold();
  if (!household) {
    return <EmptyState title="No household yet" body="Your meal plan will appear here once your household is set up." />;
  }
  const supabase = await createClient();
  const n = new Date();
  const today = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
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
      <PageHeader
        eyebrow="Plan"
        icon={<UtensilsCrossed className="h-6 w-6" />}
        title="Meal plan"
        subtitle="Tonight's dinner shows on the wall. Plan the week in a minute."
      />

      <Card className="mb-4 border-accent/30 bg-accent/[0.04]">
        <h2 className="text-title text-fg">Plan the week with AI</h2>
        <p className="mb-3 mt-1 text-sm text-fg-muted">
          Let Harbor fill any open dinner slots for the next 7 days with kid-friendly ideas. Needs your
          Anthropic key (Settings → AI Companion).
        </p>
        <GenerateMealsButton />
      </Card>

      <Card className="mb-6">
        <h2 className="text-title text-fg">Add a meal</h2>
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
            <p className="mb-1.5 text-sm font-semibold text-fg-muted">
              {new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
            </p>
            <div className="space-y-2">
              {(list ?? []).map((m) => (
                <Card key={m.id} className="flex items-start gap-3 py-3">
                  <span className="text-2xl">{m.emoji ?? "🍽️"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-fg">{m.title}</p>
                    <p className="text-xs text-fg-muted">{titleCase(m.meal_type)}</p>
                    {m.notes && <p className="mt-1 text-xs text-accent">{m.notes}</p>}
                  </div>
                  <form action={deleteMeal.bind(null, m.id)}>
                    <ConfirmSubmit message={`Delete "${m.title}"?`} aria-label={`Delete ${m.title}`} className="h-9 w-9 px-0 py-0">
                      <Trash2 className="h-4 w-4" />
                    </ConfirmSubmit>
                  </form>
                </Card>
              ))}
            </div>
          </div>
        ))}
        {(meals ?? []).length === 0 && (
          <EmptyState
            icon={<UtensilsCrossed className="h-9 w-9" />}
            title="No meals planned yet"
            body="Add a dinner above and it’ll show as “Tonight’s dinner” on the wall."
          />
        )}
      </div>
    </>
  );
}
