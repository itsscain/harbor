import { Trash2, Carrot } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Input, Field } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmit } from "@/components/ui/ConfirmSubmit";
import { EmptyState } from "@/components/ui/EmptyState";
import { addPantryItem, deletePantryItem } from "../hub-actions";

export const metadata = { title: "Pantry" };
export const dynamic = "force-dynamic";

export default async function PantryPage() {
  const household = await getMyHousehold();
  if (!household) {
    return <EmptyState title="No household yet" body="Your pantry will appear here once your household is set up." />;
  }
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("list_items")
    .select("*")
    .eq("household_id", household.id)
    .eq("list_kind", "pantry")
    .is("deleted_at", null)
    .order("category")
    .order("name");

  return (
    <>
      <PageHeader
        eyebrow="Plan"
        icon={<Carrot className="h-6 w-6" />}
        title="Pantry"
        subtitle="What you have on hand. The AI meal planner builds dinners around these."
      />

      <Card className="mb-6">
        <h2 className="text-title text-harbor">Add what you have</h2>
        <form action={addPantryItem} className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
          <Field label="Ingredient"><Input name="name" required placeholder="Chicken thighs" /></Field>
          <Field label="Amount"><Input name="quantity" placeholder="2 lb" className="w-28" /></Field>
          <Field label="Category"><Input name="category" placeholder="Protein" className="w-32" /></Field>
          <div className="flex items-end"><SubmitButton>Add</SubmitButton></div>
        </form>
      </Card>

      {(items ?? []).length === 0 ? (
        <EmptyState
          icon={<Carrot className="h-9 w-9" />}
          title="Pantry is empty"
          body="Add the staples you keep on hand — the AI meal planner will cook from them and only shop for what's missing."
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {(items ?? []).map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-harbor-100 bg-white p-3 shadow-card transition hover:border-water/40"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">
                  {item.name}
                  {item.quantity && <span className="ml-2 text-sm text-muted">{item.quantity}</span>}
                </p>
                {item.category && <p className="text-xs text-muted">{item.category}</p>}
              </div>
              <form action={deletePantryItem.bind(null, item.id)}>
                <ConfirmSubmit message={`Remove "${item.name}"?`} aria-label={`Remove ${item.name}`} className="h-9 w-9 px-0 py-0">
                  <Trash2 className="h-4 w-4" />
                </ConfirmSubmit>
              </form>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
