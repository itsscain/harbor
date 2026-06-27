import { ScrollText, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Field, Input } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmit } from "@/components/ui/ConfirmSubmit";
import { EmptyState } from "@/components/ui/EmptyState";
import { Disclosure } from "@/components/app/Disclosure";
import { ListRow } from "@/components/ui/ListRow";
import { addHouseRule, updateHouseRule, deleteHouseRule, moveHouseRule, seedHouseRules } from "../actions";
import type { Database } from "@/lib/database.types";

export const metadata = { title: "House Rules" };
export const dynamic = "force-dynamic";

type Row = Database["public"]["Tables"]["house_rules"]["Row"];

export default async function RulesPage() {
  const household = await getMyHousehold();
  if (!household) {
    return <EmptyState title="No household yet" body="Your house rules will appear here once your household is set up." />;
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("house_rules")
    .select("*")
    .eq("household_id", household.id)
    .is("deleted_at", null)
    .order("sort_order");
  const rows: Row[] = data ?? [];
  const rules = rows.filter((r) => r.kind === "rule");
  const ladder = rows.filter((r) => r.kind === "consequence");

  return (
    <>
      <PageHeader
        eyebrow="Connect"
        icon={<ScrollText className="h-6 w-6" />}
        title="House Rules"
        subtitle="Clear, calm expectations — and what happens — shown right on the wall."
      />

      {rows.length === 0 && (
        <EmptyState
          icon={<ScrollText className="h-9 w-9" />}
          title="No house rules yet"
          body="Add your family's rules and a gentle step-by-step consequence ladder — or start with our suggestions."
          action={
            <form action={seedHouseRules}>
              <SubmitButton variant="beacon" savedText="Added!">Add starter rules &amp; ladder</SubmitButton>
            </form>
          }
        />
      )}

      <RuleSection title="The rules" hint="What we expect from each other." kind="rule" rows={rules} numbered={false} />
      <RuleSection
        title="If choices slip — the ladder"
        hint="Calm, predictable steps so everyone knows what comes next."
        kind="consequence"
        rows={ladder}
        numbered
      />
    </>
  );
}

function RuleSection({
  title,
  hint,
  kind,
  rows,
  numbered,
}: {
  title: string;
  hint: string;
  kind: string;
  rows: Row[];
  numbered: boolean;
}) {
  return (
    <Card className="mt-6">
      <h2 className="text-title text-harbor">{title}</h2>
      <p className="mt-0.5 text-sm text-muted">{hint}</p>

      <div className="mt-3 space-y-2">
        {rows.map((r, i) => (
          <div key={r.id} className="group/disc rounded-xl border border-harbor-100">
            <Disclosure
              bodyClassName="px-3 pb-3"
              summary={
                <ListRow
                  tile={r.emoji ?? (numbered ? "🌱" : "💛")}
                  title={
                    <>
                      {numbered && (
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-amber-100 text-xs font-bold text-amber-800">
                          {i + 1}
                        </span>
                      )}
                      <span className="truncate">{r.title}</span>
                    </>
                  }
                  subtitle={r.detail ? <span className="truncate">{r.detail}</span> : undefined}
                />
              }
            >
              <form action={updateHouseRule.bind(null, r.id)} className="space-y-2 pt-1">
                <div className="flex items-start gap-2">
                  <Input name="emoji" defaultValue={r.emoji ?? ""} className="w-14 text-center" aria-label="Emoji" />
                  <div className="flex-1 space-y-1.5">
                    <Input name="title" defaultValue={r.title} aria-label="Title" />
                    <Input name="detail" defaultValue={r.detail ?? ""} placeholder={numbered ? "What it means…" : "Optional detail…"} aria-label="Detail" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <SubmitButton size="sm" variant="secondary">Save</SubmitButton>
                </div>
              </form>
              <div className="mt-2 flex items-center justify-end gap-1 border-t border-harbor-100 pt-2">
                <form action={moveHouseRule.bind(null, r.id, "up")}>
                  <SubmitButton size="sm" variant="ghost" confirmSaved={false} className="h-8 w-8 px-0 py-0">
                    <ChevronUp className="h-4 w-4" />
                    <span className="sr-only">Move up</span>
                  </SubmitButton>
                </form>
                <form action={moveHouseRule.bind(null, r.id, "down")}>
                  <SubmitButton size="sm" variant="ghost" confirmSaved={false} className="h-8 w-8 px-0 py-0">
                    <ChevronDown className="h-4 w-4" />
                    <span className="sr-only">Move down</span>
                  </SubmitButton>
                </form>
                <form action={deleteHouseRule.bind(null, r.id)}>
                  <ConfirmSubmit message="Remove this?" aria-label="Delete" className="h-8 px-2 py-0 text-xs">
                    <Trash2 className="h-3.5 w-3.5" />
                  </ConfirmSubmit>
                </form>
              </div>
            </Disclosure>
          </div>
        ))}
      </div>

      <Disclosure
        className="mt-3 border-t border-harbor-100"
        defaultOpen={rows.length === 0}
        bodyClassName="px-1 pb-1"
        summary={<span className="text-sm font-semibold text-harbor">Add {numbered ? "a step" : "a rule"}</span>}
      >
        <form action={addHouseRule.bind(null, kind)} className="flex items-end gap-2 pt-2">
          <Field label="Emoji" className="w-16">
            <Input name="emoji" placeholder={numbered ? "🌱" : "💛"} className="text-center" />
          </Field>
          <Field label={numbered ? "Next step" : "Rule"} className="flex-1">
            <Input name="title" placeholder={numbered ? "Lose a privilege" : "Be kind with words and hands"} />
          </Field>
          <SubmitButton>Add</SubmitButton>
        </form>
      </Disclosure>
    </Card>
  );
}
