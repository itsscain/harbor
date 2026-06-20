import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Badge, Select, Field, Textarea } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { titleCase } from "@/lib/format";
import { addCalmTool, updateCalmTool, deleteCalmTool } from "../actions";

export const metadata = { title: "Calm Corner" };
export const dynamic = "force-dynamic";

const HINTS: Record<string, string> = {
  breathing: 'e.g. {"pattern":"4-7-8","rounds":4}',
  feelings: 'e.g. {"options":["happy","calm","sad","angry","worried","tired"]}',
  break: 'e.g. {"minutes":5}',
  social_story: 'e.g. {"title":"Going to the store","pages":["First…","Then…"]}',
};

export default async function CalmPage() {
  const household = await getMyHousehold();
  if (!household) {
    return <Card><p className="text-muted">No household yet.</p></Card>;
  }
  const supabase = await createClient();
  const { data: tools } = await supabase
    .from("calm_tools")
    .select("*")
    .eq("household_id", household.id)
    .is("deleted_at", null)
    .order("sort_order");

  return (
    <>
      <PageHeader
        title="Calm Corner"
        subtitle="The tools your kids can reach any time on the wall."
      />

      <div className="space-y-3">
        {(tools ?? []).map((t) => (
          <Card key={t.id}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge tone="beacon">{titleCase(t.tool_type)}</Badge>
                {!t.enabled && <Badge tone="gray">Off</Badge>}
              </div>
              <form action={deleteCalmTool.bind(null, t.id)}>
                <button
                  type="submit"
                  className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50"
                  aria-label="Delete tool"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </form>
            </div>
            <form action={updateCalmTool.bind(null, t.id)} className="space-y-3">
              <Field label="Settings (JSON)" hint={HINTS[t.tool_type]}>
                <Textarea
                  name="config"
                  defaultValue={JSON.stringify(t.config, null, 2)}
                  className="font-mono text-sm"
                />
              </Field>
              <label className="flex items-center gap-2 text-sm font-medium text-ink">
                <input type="checkbox" name="enabled" defaultChecked={t.enabled} className="h-4 w-4" />
                Enabled on the wall
              </label>
              <SubmitButton size="sm" variant="secondary">Save</SubmitButton>
            </form>
          </Card>
        ))}
        {(tools ?? []).length === 0 && (
          <Card><p className="text-sm text-muted">No calm tools yet — add some below.</p></Card>
        )}
      </div>

      <Card className="mt-4">
        <h3 className="font-display text-base font-bold text-harbor">Add a calm tool</h3>
        <form action={addCalmTool} className="mt-3 flex items-end gap-3">
          <Field label="Tool" className="flex-1">
            <Select name="tool_type" defaultValue="breathing">
              <option value="breathing">Breathing</option>
              <option value="feelings">Feelings check-in</option>
              <option value="break">I need a break</option>
              <option value="social_story">Social story</option>
            </Select>
          </Field>
          <SubmitButton>Add</SubmitButton>
        </form>
      </Card>
    </>
  );
}
