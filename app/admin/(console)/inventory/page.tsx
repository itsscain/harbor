import { Trash2, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Badge, Input, Field } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { addPart, updatePart, deletePart } from "./actions";

export const metadata = { title: "Inventory" };
export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const supabase = await createClient();
  const [{ data: parts }, { count: pendingInstalls }] = await Promise.all([
    supabase.from("inventory").select("*").order("part_name"),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("status", "scheduled"),
  ]);

  const items = parts ?? [];
  const lowCount = items.filter(
    (p) => p.on_hand_qty <= p.reorder_threshold,
  ).length;

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle={`Optional parts tracking. ${pendingInstalls ?? 0} install${pendingInstalls === 1 ? "" : "s"} scheduled.`}
        actions={
          lowCount > 0 ? (
            <Badge tone="amber">
              <AlertTriangle className="mr-1 h-3.5 w-3.5" /> {lowCount} low
            </Badge>
          ) : (
            <Badge tone="green">Stock healthy</Badge>
          )
        }
      />

      <Card>
        <div className="space-y-2">
          {items.map((p) => {
            const low = p.on_hand_qty <= p.reorder_threshold;
            return (
              <div
                key={p.id}
                className="grid grid-cols-12 items-end gap-2 rounded-xl border border-harbor-100 p-3"
              >
                <form
                  action={updatePart.bind(null, p.id)}
                  className="col-span-12 grid grid-cols-12 items-end gap-2 sm:col-span-10"
                >
                  <Field label="Part" className="col-span-12 sm:col-span-6">
                    <Input name="part_name" defaultValue={p.part_name} />
                  </Field>
                  <Field label="On hand" className="col-span-5 sm:col-span-2">
                    <Input name="on_hand_qty" type="number" defaultValue={p.on_hand_qty} />
                  </Field>
                  <Field label="Reorder at" className="col-span-5 sm:col-span-2">
                    <Input name="reorder_threshold" type="number" defaultValue={p.reorder_threshold} />
                  </Field>
                  <div className="col-span-2 sm:col-span-2">
                    <SubmitButton size="sm" variant="secondary">Save</SubmitButton>
                  </div>
                </form>
                <div className="col-span-12 flex items-center justify-between sm:col-span-2 sm:justify-end sm:gap-2">
                  {low && <Badge tone="amber">Low</Badge>}
                  <form action={deletePart.bind(null, p.id)}>
                    <button
                      type="submit"
                      className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50"
                      aria-label={`Delete ${p.part_name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
          {items.length === 0 && (
            <p className="py-6 text-center text-sm text-muted">
              No parts tracked yet. Add your first below.
            </p>
          )}
        </div>

        <div className="mt-5 border-t border-harbor-100 pt-4">
          <h3 className="text-sm font-semibold text-harbor">Add a part</h3>
          <form action={addPart} className="mt-3 grid grid-cols-12 items-end gap-2">
            <Field label="Part" className="col-span-12 sm:col-span-6">
              <Input name="part_name" placeholder="e.g. Fire HD 10 tablet" required />
            </Field>
            <Field label="On hand" className="col-span-6 sm:col-span-2">
              <Input name="on_hand_qty" type="number" defaultValue={0} />
            </Field>
            <Field label="Reorder at" className="col-span-6 sm:col-span-2">
              <Input name="reorder_threshold" type="number" defaultValue={0} />
            </Field>
            <div className="col-span-12 sm:col-span-2">
              <SubmitButton size="sm">Add part</SubmitButton>
            </div>
          </form>
        </div>
      </Card>
    </>
  );
}
