import { Trash2, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Input, Field, Select, Badge } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { titleCase } from "@/lib/format";
import { addStoreItem, updateStoreItem, deleteStoreItem } from "../hub-actions";

export const metadata = { title: "Reward Store" };
export const dynamic = "force-dynamic";

export default async function StorePage() {
  const household = await getMyHousehold();
  if (!household) return <Card><p className="text-muted">No household yet.</p></Card>;
  const supabase = await createClient();
  const [{ data: items }, { data: children }] = await Promise.all([
    supabase.from("store_items").select("*").eq("household_id", household.id).is("deleted_at", null).order("sort_order"),
    supabase.from("children").select("id, name").eq("household_id", household.id).is("deleted_at", null).order("sort_order"),
  ]);
  const childName = (id: string | null) =>
    id ? (children ?? []).find((c) => c.id === id)?.name ?? "Child" : "All kids";

  return (
    <>
      <PageHeader title="Reward Store" subtitle="What kids can spend their stars on. Shows on each child's wall." />

      <Card className="mb-4">
        <h2 className="font-display text-base font-bold text-harbor">Add a reward</h2>
        <form action={addStoreItem} className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Reward" className="sm:col-span-2"><Input name="label" required placeholder="Ice cream trip" /></Field>
          <Field label="Emoji"><Input name="emoji" placeholder="🍦" className="text-center text-xl" /></Field>
          <Field label="Cost (stars)"><Input name="cost_points" type="number" min={0} defaultValue={20} /></Field>
          <Field label="Kind">
            <Select name="kind" defaultValue="reward">
              <option value="reward">Reward</option>
              <option value="screen_time">Screen time</option>
              <option value="allowance">Allowance</option>
              <option value="goal">Goal (not buyable)</option>
            </Select>
          </Field>
          <Field label="For">
            <Select name="child_id" defaultValue="">
              <option value="">All kids</option>
              {(children ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2"><SubmitButton>Add reward</SubmitButton></div>
        </form>
      </Card>

      <div className="space-y-3">
        {(items ?? []).map((item) => (
          <Card key={item.id}>
            <form action={updateStoreItem.bind(null, item.id)} className="grid grid-cols-12 items-end gap-2">
              <Field label="Emoji" className="col-span-3 sm:col-span-1">
                <Input name="emoji" defaultValue={item.emoji ?? ""} className="text-center text-xl" />
              </Field>
              <Field label="Reward" className="col-span-9 sm:col-span-4">
                <Input name="label" defaultValue={item.label} />
              </Field>
              <Field label="Stars" className="col-span-4 sm:col-span-2">
                <Input name="cost_points" type="number" min={0} defaultValue={item.cost_points} />
              </Field>
              <Field label="Kind" className="col-span-8 sm:col-span-2">
                <Select name="kind" defaultValue={item.kind}>
                  <option value="reward">Reward</option>
                  <option value="screen_time">Screen time</option>
                  <option value="allowance">Allowance</option>
                  <option value="goal">Goal</option>
                </Select>
              </Field>
              <label className="col-span-6 flex items-center gap-2 pb-2.5 text-sm font-medium text-ink sm:col-span-1">
                <input type="checkbox" name="enabled" defaultChecked={item.enabled} className="h-4 w-4" /> On
              </label>
              <div className="col-span-6 flex items-center gap-2 sm:col-span-2">
                <SubmitButton size="sm" variant="secondary">Save</SubmitButton>
              </div>
            </form>
            <div className="mt-2 flex items-center justify-between">
              <Badge tone="neutral">{childName(item.child_id)} · {titleCase(item.kind)}</Badge>
              <form action={deleteStoreItem.bind(null, item.id)}>
                <button className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </form>
            </div>
          </Card>
        ))}
        {(items ?? []).length === 0 && (
          <Card><p className="text-sm text-muted">No rewards yet. Add the first above.</p></Card>
        )}
      </div>
    </>
  );
}
