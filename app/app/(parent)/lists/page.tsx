import { Trash2, Check, Circle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Input, Field, Button } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { addListItemParent, toggleListItem, clearCheckedItems } from "../hub-actions";

export const metadata = { title: "Lists" };
export const dynamic = "force-dynamic";

export default async function ListsPage() {
  const household = await getMyHousehold();
  if (!household) return <Card><p className="text-muted">No household yet.</p></Card>;
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
          <div key={item.id} className="flex items-center gap-3 rounded-xl border border-harbor-100 bg-white p-3">
            <form action={toggleListItem.bind(null, item.id, !item.checked)}>
              <button
                className="flex h-11 w-11 items-center justify-center rounded-full text-harbor"
                aria-label={`Mark ${item.name} ${item.checked ? "not done" : "done"}`}
              >
                {item.checked ? <Check className="h-6 w-6 text-emerald-600" /> : <Circle className="h-6 w-6 text-harbor-100" />}
              </button>
            </form>
            <span className={item.checked ? "flex-1 text-muted line-through" : "flex-1 font-medium text-ink"}>
              {item.name}
              {item.category && <span className="ml-2 text-sm text-muted">{item.category}</span>}
            </span>
            {item.added_by_label && <span className="text-xs text-muted">{item.added_by_label}</span>}
          </div>
        ))}
        {(items ?? []).length === 0 && <p className="text-sm text-muted">The list is empty.</p>}
      </div>
    </>
  );
}
