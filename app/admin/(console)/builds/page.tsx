import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Badge, Input, Field } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { currency } from "@/lib/format";
import { hardwareCost, type BuildWithSupplies } from "@/lib/types";
import { createBuild } from "./actions";

export const metadata = { title: "Build Catalog" };
export const dynamic = "force-dynamic";

export default async function BuildsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("builds")
    .select("*, build_supplies(*)")
    .order("sort_order");
  const builds = (data ?? []) as BuildWithSupplies[];

  return (
    <>
      <PageHeader
        title="Build Catalog"
        subtitle="Your product line. Hardware totals and margins calculate automatically from supplies."
      />

      <div className="grid gap-3">
        {builds.map((b) => {
          const hw = hardwareCost(b.build_supplies);
          const stdMargin = Number(b.standard_price) - hw;
          const founderMargin = Number(b.founder_price) - hw;
          return (
            <Link key={b.id} href={`/admin/builds/${b.id}`}>
              <Card className="flex items-center justify-between hover:border-water/50">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg font-bold text-harbor">
                      {b.name}
                    </h2>
                    {b.is_default && <Badge tone="beacon">Recommended</Badge>}
                  </div>
                  <p className="text-sm text-muted">
                    {b.tablet_model} · {b.screen_size} ·{" "}
                    {b.build_supplies.length} supply line
                    {b.build_supplies.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="hidden text-right sm:block">
                    <p className="text-xs text-muted">Hardware</p>
                    <p className="font-semibold text-ink">{currency(hw)}</p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-xs text-muted">Standard</p>
                    <p className="font-semibold text-ink">
                      {currency(b.standard_price)}
                    </p>
                    <p className="text-xs text-emerald-700">
                      +{currency(stdMargin)} margin
                    </p>
                  </div>
                  <div className="hidden text-right sm:block">
                    <p className="text-xs text-muted">Founder</p>
                    <p className="font-semibold text-ink">
                      {currency(b.founder_price)}
                    </p>
                    <p className="text-xs text-emerald-700">
                      +{currency(founderMargin)} margin
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card className="mt-6">
        <h2 className="font-display text-lg font-bold text-harbor">
          Add a new build
        </h2>
        <form action={createBuild} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <Input name="name" required placeholder="Harbor …" />
          </Field>
          <Field label="Tablet model">
            <Input name="tablet_model" placeholder="Fire HD 10" />
          </Field>
          <Field label="Screen size">
            <Input name="screen_size" placeholder='10"' />
          </Field>
          <Field label="Sort order">
            <Input name="sort_order" type="number" defaultValue={5} />
          </Field>
          <Field label="Standard price">
            <Input name="standard_price" type="number" step="0.01" defaultValue={0} />
          </Field>
          <Field label="Founder price">
            <Input name="founder_price" type="number" step="0.01" defaultValue={0} />
          </Field>
          <div className="sm:col-span-2">
            <SubmitButton pendingText="Creating…">Create build</SubmitButton>
          </div>
        </form>
      </Card>
    </>
  );
}
