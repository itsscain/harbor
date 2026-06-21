import { notFound } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Badge, Input, Field, Switch } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmit } from "@/components/ui/ConfirmSubmit";
import { currency, amazonLink } from "@/lib/format";
import { hardwareCost, type BuildWithSupplies } from "@/lib/types";
import {
  updateBuild,
  deleteBuild,
  addSupply,
  updateSupply,
  deleteSupply,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function BuildDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("builds")
    .select("*, build_supplies(*)")
    .eq("id", id)
    .single();
  if (!data) notFound();

  const build = data as BuildWithSupplies;
  const supplies = [...build.build_supplies].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const hw = hardwareCost(supplies);
  const stdMargin = Number(build.standard_price) - hw;
  const founderMargin = Number(build.founder_price) - hw;

  return (
    <>
      <PageHeader backHref="/admin/builds" eyebrow="Build" title={build.name} subtitle={`${build.tablet_model} · ${build.screen_size}`} />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Build fields */}
        <Card className="lg:col-span-2">
          <h2 className="text-title text-harbor">Details</h2>
          <form action={updateBuild.bind(null, build.id)} className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <Input name="name" defaultValue={build.name} required />
            </Field>
            <Field label="Tablet model">
              <Input name="tablet_model" defaultValue={build.tablet_model ?? ""} />
            </Field>
            <Field label="Screen size">
              <Input name="screen_size" defaultValue={build.screen_size ?? ""} />
            </Field>
            <Field label="Sort order">
              <Input name="sort_order" type="number" defaultValue={build.sort_order} />
            </Field>
            <Field label="Standard price">
              <Input name="standard_price" type="number" step="0.01" defaultValue={Number(build.standard_price)} />
            </Field>
            <Field label="Founder price">
              <Input name="founder_price" type="number" step="0.01" defaultValue={Number(build.founder_price)} />
            </Field>
            <div className="rounded-xl border border-harbor-100 px-3.5 py-3 sm:col-span-2">
              <Switch name="is_default" label="Mark as recommended default" defaultChecked={build.is_default} />
            </div>
            <div className="sm:col-span-2">
              <SubmitButton pendingText="Saving…">Save details</SubmitButton>
            </div>
          </form>
        </Card>

        {/* Margin summary */}
        <Card className="h-fit">
          <h2 className="text-title text-harbor">Economics</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Hardware (non-optional)</dt>
              <dd className="font-semibold text-ink">{currency(hw)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Standard price</dt>
              <dd className="font-semibold text-ink">{currency(build.standard_price)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Standard margin</dt>
              <dd className="font-semibold text-emerald-700">{currency(stdMargin)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Founder price</dt>
              <dd className="font-semibold text-ink">{currency(build.founder_price)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Founder margin</dt>
              <dd className={founderMargin >= 0 ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
                {currency(founderMargin)}
              </dd>
            </div>
          </dl>
          {founderMargin < 0 && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              Founder price is below hardware cost. Never sell below parts cost.
            </p>
          )}
        </Card>
      </div>

      {/* Supplies */}
      <Card className="mt-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-title text-harbor">
            Supplies &amp; sourcing
          </h2>
          <Badge tone="neutral">{supplies.length} lines</Badge>
        </div>

        <div className="space-y-2">
          {supplies.map((s) => (
            <form
              key={s.id}
              action={updateSupply.bind(null, s.id, build.id)}
              className="grid grid-cols-12 items-end gap-2 rounded-xl border border-harbor-100 p-3"
            >
              <Field label="Item" className="col-span-12 sm:col-span-3">
                <Input name="item" defaultValue={s.item} />
              </Field>
              <Field label="Vendor" className="col-span-6 sm:col-span-1">
                <Input name="vendor" defaultValue={s.vendor} />
              </Field>
              <Field label="URL / search term" className="col-span-12 sm:col-span-3">
                <Input name="url" defaultValue={s.url ?? ""} />
              </Field>
              <Field label="Unit $" className="col-span-4 sm:col-span-1">
                <Input name="unit_cost" type="number" step="0.01" defaultValue={Number(s.unit_cost)} />
              </Field>
              <Field label="Qty" className="col-span-3 sm:col-span-1">
                <Input name="quantity" type="number" defaultValue={s.quantity} />
              </Field>
              <label className="col-span-5 flex items-center gap-1.5 pb-2.5 text-xs font-medium text-ink sm:col-span-1">
                <input type="checkbox" name="optional" defaultChecked={s.optional} className="h-4 w-4" />
                Optional
              </label>
              <div className="col-span-12 flex items-center gap-2 sm:col-span-2">
                <SubmitButton size="sm" variant="secondary">Save</SubmitButton>
                <a
                  href={amazonLink(s.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-water hover:bg-harbor-50"
                >
                  Source <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </form>
          ))}
        </div>

        {/* Delete supply forms (separate to avoid nested forms) */}
        <div className="mt-2 flex flex-wrap gap-2">
          {supplies.map((s) => (
            <form key={s.id} action={deleteSupply.bind(null, s.id, build.id)}>
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> {s.item}
              </button>
            </form>
          ))}
        </div>

        {/* Add supply */}
        <div className="mt-5 border-t border-harbor-100 pt-4">
          <h3 className="text-sm font-semibold text-harbor">Add a supply line</h3>
          <form
            action={addSupply.bind(null, build.id)}
            className="mt-3 grid grid-cols-12 items-end gap-2"
          >
            <Field label="Item" className="col-span-12 sm:col-span-3">
              <Input name="item" placeholder="Item name" required />
            </Field>
            <Field label="Vendor" className="col-span-6 sm:col-span-2">
              <Input name="vendor" defaultValue="Amazon" />
            </Field>
            <Field label="URL / search term" className="col-span-12 sm:col-span-3">
              <Input name="url" placeholder="amazon search term" />
            </Field>
            <Field label="Unit $" className="col-span-4 sm:col-span-1">
              <Input name="unit_cost" type="number" step="0.01" defaultValue={0} />
            </Field>
            <Field label="Qty" className="col-span-3 sm:col-span-1">
              <Input name="quantity" type="number" defaultValue={1} />
            </Field>
            <div className="col-span-12 sm:col-span-2">
              <SubmitButton size="sm">Add</SubmitButton>
            </div>
          </form>
        </div>
      </Card>

      {/* Danger zone */}
      <Card className="mt-4 border-red-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-title text-red-700">Delete build</h2>
            <p className="text-sm text-muted">Removes the build and its supplies. Not reversible.</p>
          </div>
          <form action={deleteBuild.bind(null, build.id)}>
            <ConfirmSubmit message={`Delete the ${build.name} build and all its supplies?`}>
              Delete
            </ConfirmSubmit>
          </form>
        </div>
      </Card>
    </>
  );
}
