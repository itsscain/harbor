import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Field, Input, Switch, Badge } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmit } from "@/components/ui/ConfirmSubmit";
import { Disclosure } from "@/components/app/Disclosure";
import { ListRow } from "@/components/ui/ListRow";
import { addMedication, updateMedication, deleteMedication } from "../actions";

export const metadata = { title: "Medication" };
export const dynamic = "force-dynamic";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function MedicationPage() {
  const household = await getMyHousehold();
  if (!household) return <Card><p className="text-fg-muted">No household yet.</p></Card>;

  const supabase = await createClient();
  const { data: children } = await supabase
    .from("children")
    .select("id, name, color")
    .eq("household_id", household.id)
    .is("deleted_at", null)
    .order("sort_order");
  const ids = (children ?? []).map((c) => c.id);
  const { data: meds } = ids.length
    ? await supabase.from("medications").select("*").in("child_id", ids).is("deleted_at", null).order("sort_order")
    : { data: [] as Record<string, unknown>[] };

  return (
    <>
      <PageHeader
        eyebrow="Health"
        title="Medication Station"
        subtitle="A calm, dignified way to take medicine — and a quiet record for the doctor. No stars: health isn't a prize."
      />

      <Card className="mb-5 bg-surface-2/60">
        <p className="text-sm text-fg">
          <b>Harbor tracks and gently reminds — it does not dispense or dose.</b> A grown-up is always in charge of
          giving medicine. This is support, not medical advice.
        </p>
      </Card>

      {(children ?? []).length === 0 && <Card><p className="text-fg-muted">Add a child first.</p></Card>}

      <div className="space-y-6">
        {(children ?? []).map((child) => {
          const childMeds = (meds ?? []).filter((m) => m.child_id === child.id);
          return (
            <section key={child.id}>
              <div className="mb-2 flex items-center gap-2 px-1">
                <span className="h-3 w-3 rounded-full" style={{ background: child.color ?? "#6b8aa6" }} />
                <h2 className="text-title text-fg">{child.name}</h2>
              </div>

              <div className="space-y-3">
                {childMeds.map((m) => {
                  const days: number[] = Array.isArray(m.days_of_week) ? (m.days_of_week as number[]) : [];
                  const times = Array.isArray(m.schedule_times) ? (m.schedule_times as string[]).join(", ") : "";
                  return (
                    <Card key={m.id as string} className="group/disc p-0">
                      <Disclosure
                        bodyClassName="px-5 pb-5"
                        summary={
                          <ListRow
                            tile={(m.icon as string) ?? "💊"}
                            title={m.name as string}
                            subtitle={
                              <span>
                                {[(m.dose as string) || null, times || null].filter(Boolean).join(" · ") || "Tap to edit"}
                              </span>
                            }
                          />
                        }
                      >
                      <form action={updateMedication.bind(null, m.id as string)} className="space-y-3 pt-1">
                        <div className="flex flex-wrap items-end gap-3">
                          <Field label="Icon" className="w-16">
                            <Input name="icon" defaultValue={(m.icon as string) ?? "💊"} className="text-center text-xl" />
                          </Field>
                          <Field label="Name" className="min-w-40 flex-1">
                            <Input name="name" defaultValue={m.name as string} required />
                          </Field>
                          <Field label="Dose" className="w-40">
                            <Input name="dose" defaultValue={(m.dose as string) ?? ""} placeholder="5 mg, 1 tablet" />
                          </Field>
                        </div>
                        <Field label="Times (24h, comma-separated)" hint="e.g. 08:00, 20:00">
                          <Input name="times" defaultValue={times} placeholder="08:00, 20:00" />
                        </Field>
                        <Field label="“This helps your body…” (shown to the child)">
                          <Input name="helps_note" defaultValue={(m.helps_note as string) ?? ""} placeholder="This helps your body feel steady." />
                        </Field>
                        <div className="flex flex-wrap gap-1.5">
                          {DAYS.map((d, i) => (
                            <label key={i} className="cursor-pointer">
                              <input type="checkbox" name="days" value={i} defaultChecked={days.includes(i)} className="peer sr-only" />
                              <span className="block rounded-lg px-2.5 py-1 text-xs font-semibold text-fg-muted ring-1 ring-line/60 peer-checked:bg-accent peer-checked:text-accent-fg">
                                {d}
                              </span>
                            </label>
                          ))}
                          <span className="self-center text-xs text-fg-muted">(none = every day)</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                          <Switch name="with_food" label="Take with food" defaultChecked={!!m.with_food} />
                          <Switch name="parent_administered" label="A grown-up gives it (PIN to confirm)" defaultChecked={!!m.parent_administered} />
                          <Switch name="active" label="Active" defaultChecked={m.active as boolean} />
                        </div>
                        <div className="flex items-center gap-2">
                          <SubmitButton size="sm" variant="secondary" savedText="Saved">Save</SubmitButton>
                        </div>
                      </form>
                      <form action={deleteMedication.bind(null, m.id as string)} className="mt-2">
                        <ConfirmSubmit message={`Remove "${m.name as string}"?`}>Remove</ConfirmSubmit>
                      </form>
                      </Disclosure>
                    </Card>
                  );
                })}
              </div>

              <Card className="mt-3 p-0">
                <Disclosure
                  defaultOpen={childMeds.length === 0}
                  bodyClassName="px-5 pb-5"
                  summary={<span className="text-sm font-semibold text-fg">➕ Add a medication for {child.name}</span>}
                >
                <form action={addMedication.bind(null, child.id)} className="mt-1 space-y-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <Field label="Icon" className="w-16">
                      <Input name="icon" defaultValue="💊" className="text-center text-xl" />
                    </Field>
                    <Field label="Name" className="min-w-40 flex-1">
                      <Input name="name" placeholder="Medicine name" required />
                    </Field>
                    <Field label="Dose" className="w-40">
                      <Input name="dose" placeholder="5 mg, 1 tablet" />
                    </Field>
                  </div>
                  <div className="flex flex-wrap items-end gap-3">
                    <Field label="Times (24h)" className="flex-1">
                      <Input name="times" placeholder="08:00, 20:00" />
                    </Field>
                    <Switch name="with_food" label="With food" />
                    <Switch name="parent_administered" label="Grown-up gives it" />
                  </div>
                  <Field label="“This helps your body…”">
                    <Input name="helps_note" placeholder="This helps your body feel steady." />
                  </Field>
                  <SubmitButton size="sm">Add medication</SubmitButton>
                </form>
                </Disclosure>
              </Card>
            </section>
          );
        })}
      </div>

      <Badge tone="neutral" className="mt-6">
        Adherence reports for the doctor (Harbor Briefing) are coming with the Care layer.
      </Badge>
    </>
  );
}
