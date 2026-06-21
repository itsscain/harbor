import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Button, Field, Select, Input, Badge, Switch } from "@/components/ui/primitives";
import { currency, amazonLink } from "@/lib/format";
import { ExternalLink } from "lucide-react";
import type { BuildWithSupplies } from "@/lib/types";

export const metadata = { title: "Shopping List" };
export const dynamic = "force-dynamic";

export default async function ShoppingListPage({
  searchParams,
}: {
  searchParams: Promise<{ build?: string; qty?: string; optional?: string }>;
}) {
  const { build: buildId, qty: qtyRaw, optional } = await searchParams;
  const qty = Math.max(1, Number(qtyRaw) || 1);
  const includeOptional = optional === "on";

  const supabase = await createClient();
  const { data: builds } = await supabase
    .from("builds")
    .select("id, name")
    .order("sort_order");

  let selected: BuildWithSupplies | null = null;
  if (buildId) {
    const { data } = await supabase
      .from("builds")
      .select("*, build_supplies(*)")
      .eq("id", buildId)
      .single();
    selected = (data as BuildWithSupplies) ?? null;
  }

  const lines = selected
    ? [...selected.build_supplies]
        .filter((s) => includeOptional || !s.optional)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((s) => ({
          ...s,
          totalQty: s.quantity * qty,
          lineTotal: Number(s.unit_cost) * s.quantity * qty,
        }))
    : [];
  const grandTotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);

  return (
    <>
      <PageHeader
        title="Shopping List"
        subtitle="Pick a build and a quantity to get an aggregated Amazon parts list with a total."
      />

      <Card>
        <form method="get" className="grid items-end gap-3 sm:grid-cols-4">
          <Field label="Build" className="sm:col-span-2">
            <Select name="build" defaultValue={buildId ?? ""}>
              <option value="">Choose a build…</option>
              {(builds ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Quantity">
            <Input name="qty" type="number" min={1} defaultValue={qty} />
          </Field>
          <div className="flex flex-col gap-2">
            <div className="rounded-xl border border-harbor-100 px-3 py-2.5">
              <Switch name="optional" label="Include optional" defaultChecked={includeOptional} />
            </div>
            <Button type="submit">Generate</Button>
          </div>
        </form>
      </Card>

      {selected && (
        <Card className="mt-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-title text-harbor">
              {qty} × {selected.name}
            </h2>
            <Badge tone="beacon">Est. total {currency(grandTotal)}</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-harbor-100 text-left text-xs uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3">Item</th>
                  <th className="py-2 pr-3">Vendor</th>
                  <th className="py-2 pr-3 text-right">Unit</th>
                  <th className="py-2 pr-3 text-right">Qty</th>
                  <th className="py-2 pr-3 text-right">Line total</th>
                  <th className="py-2 pr-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.id} className="border-b border-harbor-50">
                    <td className="py-2 pr-3 font-medium text-ink">
                      {l.item}
                      {l.optional && (
                        <span className="ml-2 text-xs text-muted">(optional)</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-muted">{l.vendor}</td>
                    <td className="py-2 pr-3 text-right">{currency(l.unit_cost)}</td>
                    <td className="py-2 pr-3 text-right">{l.totalQty}</td>
                    <td className="py-2 pr-3 text-right font-semibold">
                      {currency(l.lineTotal)}
                    </td>
                    <td className="py-2 pr-3">
                      <a
                        href={amazonLink(l.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-water"
                      >
                        Open <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="py-3 text-right font-semibold text-harbor">
                    Estimated batch total
                  </td>
                  <td className="py-3 pr-3 text-right font-display text-lg font-extrabold text-harbor">
                    {currency(grandTotal)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted">
            Estimates only — confirm live Amazon pricing. Fire tablets swing on
            sale; buy in batches when discounted.
          </p>
        </Card>
      )}
    </>
  );
}
