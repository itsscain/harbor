import { Trash2, Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Badge, Select, Field, Switch } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmit } from "@/components/ui/ConfirmSubmit";
import { EmptyState } from "@/components/ui/EmptyState";
import { CalmToolFields } from "@/components/app/CalmToolFields";
import { titleCase } from "@/lib/format";
import { addCalmTool, updateCalmTool, deleteCalmTool } from "../actions";
import { seedCalmTools } from "../hub-actions";

export const metadata = { title: "Calm Corner" };
export const dynamic = "force-dynamic";

export default async function CalmPage() {
  const household = await getMyHousehold();
  if (!household) {
    return <EmptyState title="No household yet" body="Your Calm Corner tools will appear here once your household is set up." />;
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
        eyebrow="Connect"
        icon={<Heart className="h-6 w-6" />}
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
                <ConfirmSubmit message={`Remove the ${titleCase(t.tool_type)} tool?`} aria-label="Delete tool" className="h-9 w-9 px-0 py-0">
                  <Trash2 className="h-4 w-4" />
                </ConfirmSubmit>
              </form>
            </div>
            <form action={updateCalmTool.bind(null, t.id)} className="space-y-4">
              <CalmToolFields toolType={t.tool_type} config={(t.config ?? {}) as Record<string, unknown>} />
              <div className="flex items-center justify-between gap-3 border-t border-harbor-100 pt-3">
                <Switch name="enabled" label="Enabled on the wall" defaultChecked={t.enabled} className="flex-1" />
                <SubmitButton size="sm" variant="secondary">Save</SubmitButton>
              </div>
            </form>
          </Card>
        ))}
        {(tools ?? []).length === 0 && (
          <EmptyState
            icon={<Heart className="h-9 w-9" />}
            title="No calm tools yet"
            body="Add breathing, a feelings check-in, an “I need a break” timer, and a calming story — one tap."
            action={
              <form action={seedCalmTools}>
                <SubmitButton variant="beacon" savedText="Added!">Add recommended calm tools</SubmitButton>
              </form>
            }
          />
        )}
      </div>

      <Card className="mt-6">
        <h3 className="text-title text-harbor">Add a calm tool</h3>
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
