import Link from "next/link";
import { Trash2, AlertTriangle, Boxes, ShoppingCart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Badge, Input, Field } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { forecastFromScheduled, partKey } from "@/lib/admin/forecast";
import { addPart, updatePart, deletePart } from "./actions";

export const metadata = { title: "Inventory" };
export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const supabase = await createClient();
  const [{ data: parts }, fc] = await Promise.all([
    supabase.from("inventory").select("*").order("part_name"),
    forecastFromScheduled(),
  ]);

  const items = parts ?? [];
  const trackedKeys = new Set(items.map((p) => partKey(p.part_name)));
  const need = (name: string) => fc.demand.get(partKey(name)) ?? 0;
  const shortCount = items.filter((p) => need(p.part_name) - p.on_hand_qty > 0).length;
  const lowCount = items.filter((p) => p.on_hand_qty <= p.reorder_threshold).length;
  // Parts the scheduled installs require that aren't tracked in inventory at all.
  const untracked = fc.items.filter((i) => !trackedKeys.has(partKey(i.item)));

  return (
    <>
      <PageHeader
        eyebrow="Product & Supply"
        icon={<Boxes className="h-6 w-6" />}
        title="Inventory"
        subtitle={`${fc.installs} install${fc.installs === 1 ? "" : "s"} scheduled — demand forecast below.`}
        actions={
          <Link href="/admin/shopping-list?source=scheduled" className="inline-flex items-center gap-1.5 rounded-xl bg-harbor px-3.5 py-2 text-sm font-semibold text-white">
            <ShoppingCart className="h-4 w-4" /> Reorder list
          </Link>
        }
      />

      {(shortCount > 0 || lowCount > 0) && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {shortCount > 0 && (
            <Badge tone="red">
              <AlertTriangle className="mr-1 h-3.5 w-3.5" /> {shortCount} short for scheduled installs
            </Badge>
          )}
          {lowCount > 0 && <Badge tone="amber">{lowCount} below reorder point</Badge>}
        </div>
      )}

      <Card>
        <div className="space-y-2">
          {items.map((p) => {
            const low = p.on_hand_qty <= p.reorder_threshold;
            const demand = need(p.part_name);
            const short = Math.max(0, demand - p.on_hand_qty);
            return (
              <div key={p.id} className="rounded-xl border border-harbor-100 p-3">
                <div className="grid grid-cols-12 items-end gap-2">
                  <form action={updatePart.bind(null, p.id)} className="col-span-12 grid grid-cols-12 items-end gap-2 sm:col-span-10">
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
                  <div className="col-span-12 flex items-center justify-end gap-2 sm:col-span-2">
                    <form action={deletePart.bind(null, p.id)}>
                      <button type="submit" className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50" aria-label={`Delete ${p.part_name}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                </div>
                {/* forecast line */}
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-harbor-50 pt-2 text-sm text-muted">
                  {demand > 0 ? (
                    <span>
                      Scheduled installs need <b className="text-ink">{demand}</b> · on hand <b className="text-ink">{p.on_hand_qty}</b>
                    </span>
                  ) : (
                    <span>No scheduled demand · on hand {p.on_hand_qty}</span>
                  )}
                  {short > 0 ? (
                    <Badge tone="red">Order {short}</Badge>
                  ) : low ? (
                    <Badge tone="amber">Low</Badge>
                  ) : (
                    <Badge tone="green">OK</Badge>
                  )}
                </div>
              </div>
            );
          })}
          {items.length === 0 && <p className="py-6 text-center text-sm text-muted">No parts tracked yet. Add your first below.</p>}
        </div>

        <div className="mt-5 border-t border-harbor-100 pt-4">
          <h3 className="text-sm font-semibold text-harbor">Add a part</h3>
          <form action={addPart} className="mt-3 grid grid-cols-12 items-end gap-2">
            <Field label="Part" className="col-span-12 sm:col-span-6">
              <Input name="part_name" placeholder="e.g. 10.1&quot; tablet" required />
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

      {untracked.length > 0 && (
        <Card className="mt-4">
          <h2 className="text-title text-harbor">Also needed (not tracked)</h2>
          <p className="mt-1 text-sm text-muted">Scheduled installs require these parts, but you&apos;re not tracking them in inventory yet.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {untracked.map((i) => (
              <span key={i.item} className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-800">
                {i.item} <b>×{i.qty}</b>
              </span>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
