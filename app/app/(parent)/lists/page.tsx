import { Check, Circle, ListChecks } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Input, Field, Button } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { addListItemParent, toggleListItem, clearCheckedItems } from "../hub-actions";

export const metadata = { title: "Lists" };
export const dynamic = "force-dynamic";

export default async function ListsPage() {
  const household = await getMyHousehold();
  if (!household) {
    return <EmptyState title="No household yet" body="Your shared grocery list will appear here once your household is set up." />;
  }
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("list_items")
    .select("*")
    .eq("household_id", household.id)
    .eq("list_kind", "grocery")
    .is("deleted_at", null)
    .order("checked")
    .order("created_at");

  const checkedCount = (items ?? []).filter((i) => i.checked).length;

  return (
    <>
      <PageHeader
        eyebrow="Plan"
        icon={<ListChecks className="h-6 w-6" />}
        title="Grocery List"
        subtitle="Shared with the wall — add here or there, check off at the store."
        actions={
          checkedCount > 0 ? (
            <form action={clearCheckedItems}>
              <Button type="submit" variant="secondary" size="sm">Clear {checkedCount} checked</Button>
            </form>
          ) : undefined
        }
      />

      <Card className="mb-4">
        <form action={addListItemParent} className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <Field label="Item"><Input name="name" required placeholder="Milk" /></Field>
          <Field label="Category"><Input name="category" placeholder="Dairy" /></Field>
          <div className="flex items-end"><SubmitButton>Add</SubmitButton></div>
        </form>
      </Card>

      <div className="space-y-2">
        {(items ?? []).map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-xl border border-harbor-100 bg-white p-2.5 pr-3 shadow-card transition hover:border-water/40"
          >
            <form action={toggleListItem.bind(null, item.id, !item.checked)}>
              <button
                className="flex h-11 w-11 items-center justify-center rounded-full transition active:scale-90"
                aria-label={`Mark ${item.name} ${item.checked ? "not done" : "done"}`}
              >
                {item.checked ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <Check className="h-4 w-4" />
                  </span>
                ) : (
                  <Circle className="h-7 w-7 text-harbor-100" />
                )}
              </button>
            </form>
            <span className={item.checked ? "flex-1 text-muted line-through" : "flex-1 font-medium text-ink"}>
              {item.name}
              {item.category && <span className="ml-2 text-sm text-muted">{item.category}</span>}
            </span>
            {item.added_by_label && <span className="text-xs text-muted">{item.added_by_label}</span>}
          </div>
        ))}
        {(items ?? []).length === 0 && (
          <EmptyState title="The list is empty" body="Add the first thing you need above — it syncs straight to the wall." />
        )}
      </div>
    </>
  );
}
