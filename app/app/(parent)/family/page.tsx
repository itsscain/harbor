import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Field, Input, Select, Switch, Badge } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmit } from "@/components/ui/ConfirmSubmit";
import { CHILD_PALETTE } from "@/lib/kiosk/colors";
import {
  addPerson,
  updatePerson,
  deletePerson,
  addPersonRoutine,
  updatePersonRoutine,
  deletePersonRoutine,
  addPersonStep,
  deletePersonStep,
} from "../actions";

export const metadata = { title: "Family" };
export const dynamic = "force-dynamic";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function FamilyPage() {
  const household = await getMyHousehold();
  if (!household) {
    return (
      <Card>
        <p className="text-muted">No household yet.</p>
      </Card>
    );
  }

  const supabase = await createClient();
  const { data: people } = await supabase
    .from("people")
    .select("*")
    .eq("household_id", household.id)
    .is("deleted_at", null)
    .order("sort_order");
  const { data: children } = await supabase
    .from("children")
    .select("id, name")
    .eq("household_id", household.id)
    .is("deleted_at", null)
    .order("sort_order");

  const ids = (people ?? []).map((p) => p.id);
  const { data: routines } = ids.length
    ? await supabase.from("routines").select("*").in("person_id", ids).is("deleted_at", null).order("sort_order")
    : { data: [] as Record<string, unknown>[] };
  const rIds = (routines ?? []).map((r) => r.id as string);
  const { data: steps } = rIds.length
    ? await supabase.from("routine_steps").select("*").in("routine_id", rIds).is("deleted_at", null).order("order_index")
    : { data: [] as Record<string, unknown>[] };

  const kids = children ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Family"
        title="Family profiles"
        subtitle="You're in the boat too. Add parents, caregivers, and older siblings — give yourself a routine to model a calm rhythm. No stars for grown-ups."
      />

      <div className="space-y-5">
        {(people ?? []).map((p) => {
          const myRoutines = (routines ?? []).filter((r) => r.person_id === p.id);
          return (
            <Card key={p.id}>
              {/* profile */}
              <form action={updatePerson.bind(null, p.id)} className="flex flex-wrap items-end gap-3">
                <Field label="Avatar" className="w-20">
                  <Input name="avatar" defaultValue={p.avatar ?? "💙"} className="text-center text-xl" />
                </Field>
                <Field label="Name" className="min-w-40 flex-1">
                  <Input name="name" defaultValue={p.name} required />
                </Field>
                <Field label="Role" className="w-40">
                  <Select name="role" defaultValue={p.role}>
                    <option value="parent">Parent</option>
                    <option value="caregiver">Caregiver</option>
                    <option value="sibling">Older sibling</option>
                  </Select>
                </Field>
                <div className="flex items-center gap-1.5">
                  {CHILD_PALETTE.map((c) => (
                    <label key={c.value} className="cursor-pointer" title={c.name}>
                      <input type="radio" name="color" value={c.value} defaultChecked={p.color === c.value} className="peer sr-only" />
                      <span
                        className="block h-7 w-7 rounded-full ring-2 ring-transparent peer-checked:ring-ink"
                        style={{ background: c.value }}
                      />
                    </label>
                  ))}
                </div>
                <SubmitButton size="sm" variant="secondary" savedText="Saved">
                  Save
                </SubmitButton>
              </form>

              {/* routines for this person */}
              <div className="mt-5 space-y-3 border-t border-line/60 pt-4">
                {myRoutines.length === 0 && (
                  <p className="text-sm text-muted">No routine yet — add one below to put {p.name} on the wall.</p>
                )}
                {myRoutines.map((r) => {
                  const rSteps = (steps ?? []).filter((s) => s.routine_id === r.id);
                  const days: number[] = Array.isArray(r.days_of_week) ? (r.days_of_week as number[]) : [];
                  return (
                    <div key={r.id as string} className="rounded-xl bg-fog/60 p-3">
                      <form action={updatePersonRoutine.bind(null, r.id as string)} className="space-y-2.5">
                        <div className="flex flex-wrap items-end gap-3">
                          <Field label="Routine" className="min-w-40 flex-1">
                            <Input name="name" defaultValue={r.name as string} />
                          </Field>
                          <Switch name="active" label="On the wall" defaultChecked={r.active as boolean} />
                        </div>
                        <div className="flex flex-wrap items-end gap-3">
                          <Switch name="together" label="Together Time" defaultChecked={!!r.together} />
                          <Field label="With child" className="w-44">
                            <Select name="with_child_id" defaultValue={(r.with_child_id as string) ?? ""}>
                              <option value="">—</option>
                              {kids.map((k) => (
                                <option key={k.id} value={k.id}>
                                  {k.name}
                                </option>
                              ))}
                            </Select>
                          </Field>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {DAYS.map((d, i) => (
                            <label key={i} className="cursor-pointer">
                              <input type="checkbox" name="days" value={i} defaultChecked={days.includes(i)} className="peer sr-only" />
                              <span className="block rounded-lg px-2.5 py-1 text-xs font-semibold text-muted ring-1 ring-line/60 peer-checked:bg-harbor peer-checked:text-white">
                                {d}
                              </span>
                            </label>
                          ))}
                          <span className="self-center text-xs text-muted">(none = every day)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <SubmitButton size="sm" variant="secondary" savedText="Saved">
                            Save routine
                          </SubmitButton>
                        </div>
                      </form>

                      {/* steps */}
                      <ul className="mt-3 space-y-1.5">
                        {rSteps.map((s) => (
                          <li key={s.id as string} className="flex items-center gap-2">
                            <span className="w-6 text-center">{(s.icon as string) || "•"}</span>
                            <span className="flex-1 text-sm text-ink">{s.label as string}</span>
                            <form action={deletePersonStep.bind(null, s.id as string)}>
                              <button className="text-xs text-muted hover:text-red-500" type="submit">
                                Remove
                              </button>
                            </form>
                          </li>
                        ))}
                      </ul>
                      <form action={addPersonStep.bind(null, r.id as string)} className="mt-2 flex items-end gap-2">
                        <Field label="" className="w-16">
                          <Input name="icon" placeholder="🧘" className="text-center" />
                        </Field>
                        <Field label="" className="flex-1">
                          <Input name="label" placeholder="Add a step (e.g. 10-minute decompress)" />
                        </Field>
                        <SubmitButton size="sm">Add</SubmitButton>
                      </form>

                      <form action={deletePersonRoutine.bind(null, r.id as string)} className="mt-2">
                        <ConfirmSubmit message={`Delete "${r.name as string}"?`}>Delete routine</ConfirmSubmit>
                      </form>
                    </div>
                  );
                })}

                <form action={addPersonRoutine.bind(null, p.id)} className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-line/70 p-3">
                  <Field label="New routine" className="min-w-40 flex-1">
                    <Input name="name" placeholder="Morning, Wind-down, Self-care…" />
                  </Field>
                  <Switch name="together" label="Together Time" />
                  <Field label="With child" className="w-40">
                    <Select name="with_child_id" defaultValue="">
                      <option value="">—</option>
                      {kids.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <SubmitButton size="sm">Add routine</SubmitButton>
                </form>
              </div>

              <form action={deletePerson.bind(null, p.id)} className="mt-4">
                <ConfirmSubmit message={`Remove ${p.name} from the wall?`}>Remove person</ConfirmSubmit>
              </form>
            </Card>
          );
        })}
      </div>

      {/* add a person */}
      <Card className="mt-6">
        <h3 className="text-title text-harbor">Add someone to the boat</h3>
        <p className="mt-1 text-sm text-muted">Parents, caregivers, or older siblings who participate on the wall.</p>
        <form action={addPerson} className="mt-3 flex flex-wrap items-end gap-3">
          <Field label="Avatar" className="w-20">
            <Input name="avatar" defaultValue="💙" className="text-center text-xl" />
          </Field>
          <Field label="Name" className="min-w-40 flex-1">
            <Input name="name" placeholder="Mom, Dad, Grandma…" required />
          </Field>
          <Field label="Role" className="w-40">
            <Select name="role" defaultValue="parent">
              <option value="parent">Parent</option>
              <option value="caregiver">Caregiver</option>
              <option value="sibling">Older sibling</option>
            </Select>
          </Field>
          <SubmitButton>Add</SubmitButton>
        </form>
        <Badge tone="neutral" className="mt-3">
          No stars for grown-ups — modeling is the point.
        </Badge>
      </Card>
    </>
  );
}
