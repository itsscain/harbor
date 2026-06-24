import { Trash2, Gift } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Input, Field, Select, Badge, Switch } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmit } from "@/components/ui/ConfirmSubmit";
import { EmptyState } from "@/components/ui/EmptyState";
import { FamilyGoalCard } from "@/components/app/FamilyGoalCard";
import { titleCase } from "@/lib/format";
import { addStoreItem, updateStoreItem, deleteStoreItem } from "../hub-actions";

export const metadata = { title: "Reward Store" };
export const dynamic = "force-dynamic";

export default async function StorePage() {
  const household = await getMyHousehold();
  if (!household) {
    return <EmptyState title="No household yet" body="Your reward store will appear here once your household is set up." />;
  }
  const supabase = await createClient();
  const [{ data: items }, { data: children }] = await Promise.all([
    supabase.from("store_items").select("*").eq("household_id", household.id).is("deleted_at", null).order("sort_order"),
    supabase.from("children").select("id, name").eq("household_id", household.id).is("deleted_at", null).order("sort_order"),
  ]);
  const childName = (id: string | null) =>
    id ? (children ?? []).find((c) => c.id === id)?.name ?? "Child" : "All kids";

  return (
    <>
      <PageHeader
        eyebrow="Plan"
        icon={<Gift className="h-6 w-6" />}
        title="Reward Store"
        subtitle="What kids can spend their stars on. Shows on each child's wall."
      />

      <div className="mb-6">
        <FamilyGoalCard
          goal={
            ((household.settings ?? {}) as Record<string, unknown>).family_goal as
              | { label?: string; emoji?: string; target?: number; reward?: string | null; active?: boolean }
              | null
          }
        />
      </div>

      <Card className="mb-6">
        <h2 className="text-title text-harbor">Add a reward</h2>
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
              <Field label="Kind" className="col-span-8 sm:col-span-3">
                <Select name="kind" defaultValue={item.kind}>
                  <option value="reward">Reward</option>
                  <option value="screen_time">Screen time</option>
                  <option value="allowance">Allowance</option>
                  <option value="goal">Goal</option>
                </Select>
              </Field>
              <div className="col-span-12 flex items-center justify-between gap-3 sm:col-span-2 sm:pb-1">
                <Switch name="enabled" label="On" defaultChecked={item.enabled} />
              </div>
              <div className="col-span-12 flex items-center justify-between border-t border-harbor-100 pt-3">
                <Badge tone="neutral">{childName(item.child_id)} · {titleCase(item.kind)}</Badge>
                <div className="flex items-center gap-2">
                  <SubmitButton size="sm" variant="secondary">Save</SubmitButton>
                </div>
              </div>
            </form>
            <div className="mt-2 flex justify-end">
              <form action={deleteStoreItem.bind(null, item.id)}>
                <ConfirmSubmit message={`Remove "${item.label}" from the store?`} className="px-2 py-1 text-xs">
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </ConfirmSubmit>
              </form>
            </div>
          </Card>
        ))}
        {(items ?? []).length === 0 && (
          <EmptyState
            icon={<Gift className="h-9 w-9" />}
            title="No rewards yet"
            body="Add something kids can work toward — an ice-cream trip, extra screen time, a movie night."
          />
        )}
      </div>
    </>
  );
}
