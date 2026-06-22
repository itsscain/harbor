import { Trash2, Bell, CalendarDays, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Input, Field, Select, Switch, SectionHeader } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmit } from "@/components/ui/ConfirmSubmit";
import { EmptyState } from "@/components/ui/EmptyState";
import { DateTimeField } from "@/components/app/DateTimeField";
import { childColor, eventColor } from "@/lib/kiosk/colors";
import { addEvent, deleteEvent, addReminder, deleteReminder } from "../hub-actions";

export const metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const household = await getMyHousehold();
  if (!household) {
    return <EmptyState title="No household yet" body="Your family calendar will appear here once your household is set up." />;
  }
  const supabase = await createClient();
  const [{ data: events }, { data: reminders }, { data: children }] = await Promise.all([
    supabase.from("events").select("*").eq("household_id", household.id).is("deleted_at", null).order("starts_at"),
    supabase.from("reminders").select("*").eq("household_id", household.id).is("deleted_at", null).order("due_date"),
    supabase.from("children").select("id, name, color").eq("household_id", household.id).is("deleted_at", null).order("sort_order"),
  ]);
  const childrenById = new Map((children ?? []).map((c) => [c.id, c]));

  return (
    <>
      <PageHeader
        eyebrow="Plan"
        icon={<CalendarDays className="h-6 w-6" />}
        title="Family Calendar"
        subtitle="Events show on the wall's Today view and agenda."
      />

      <Card className="mb-6">
        <h2 className="text-title text-harbor">Add an event</h2>
        <form action={addEvent} className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Title" className="sm:col-span-2">
            <Input name="title" required placeholder="Soccer practice" />
          </Field>
          <Field label="Emoji"><Input name="emoji" placeholder="⚽" className="text-center text-xl" /></Field>
          <Field label="When"><DateTimeField name="starts_at" /></Field>
          <Field label="Who (label)"><Input name="person_label" placeholder="Mia, Mom…" /></Field>
          <Field label="Location"><Input name="location" placeholder="Field 3" /></Field>
          <Field label="Color">
            <Select name="color" defaultValue="#18606F">
              <option value="#18606F">Water</option>
              <option value="#0C3B47">Harbor</option>
              <option value="#F6B23D">Beacon</option>
              <option value="#2f8f86">Seafoam</option>
            </Select>
          </Field>
          <Field label="Repeats">
            <Select name="recurrence_rule" defaultValue="">
              <option value="">Once</option>
              <option value="daily">Every day</option>
              <option value="weekdays">Weekdays</option>
              <option value="weekly">Weekly (this weekday)</option>
            </Select>
          </Field>
          <Field label="Child (optional)" className="sm:col-span-2">
            <Select name="child_id" defaultValue="">
              <option value="">Whole family</option>
              {(children ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <div className="rounded-xl border border-harbor-100 px-3.5 py-3">
            <Switch name="all_day" label="All day" />
          </div>
          <div className="rounded-xl border border-harbor-100 px-3.5 py-3">
            <Switch name="is_countdown" label="Countdown" hint="Birthday, vacation…" />
          </div>
          <div className="sm:col-span-2"><SubmitButton>Add event</SubmitButton></div>
        </form>
      </Card>

      {/* Per-person legend */}
      {(children ?? []).length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {(children ?? []).map((c) => (
            <span key={c.id} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: childColor(c) }} /> {c.name}
            </span>
          ))}
        </div>
      )}

      <div className="mb-6 space-y-2">
        {(events ?? []).map((e) => {
          const color = eventColor(e, childrenById);
          return (
            <Card key={e.id} className="flex items-center gap-3 border-l-4" style={{ borderLeftColor: color }}>
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl"
                style={{ backgroundColor: color + "1f" }}
              >
                {e.emoji ?? "📅"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-title text-harbor">{e.title}</p>
                <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
                  <span>
                    {e.all_day
                      ? "All day"
                      : new Date(e.starts_at).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                  {e.recurrence_rule ? <span>· repeats {e.recurrence_rule}</span> : null}
                  {e.person_label ? <span>· {e.person_label}</span> : null}
                  {e.location ? <span className="inline-flex items-center gap-0.5">· <MapPin className="h-3.5 w-3.5" /> {e.location}</span> : null}
                </p>
              </div>
              <form action={deleteEvent.bind(null, e.id)}>
                <ConfirmSubmit message={`Delete "${e.title}"?`} aria-label={`Delete ${e.title}`} className="h-9 w-9 px-0 py-0">
                  <Trash2 className="h-4 w-4" />
                </ConfirmSubmit>
              </form>
            </Card>
          );
        })}
        {(events ?? []).length === 0 && (
          <EmptyState title="No events yet" body="Add the first one above — it’ll appear on the wall’s Today view and agenda." />
        )}
      </div>

      <Card>
        <SectionHeader eyebrow="Don’t forget">
          <span className="inline-flex items-center gap-2"><Bell className="h-5 w-5" /> Reminders</span>
        </SectionHeader>
        <div className="space-y-2">
          {(reminders ?? []).map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl bg-surface-sunken px-3 py-2.5">
              <span className="text-sm">
                <span className="font-semibold text-ink">{r.title}</span>
                <span className="ml-2 text-muted">due {r.due_date}</span>
              </span>
              <form action={deleteReminder.bind(null, r.id)}>
                <ConfirmSubmit message={`Delete "${r.title}"?`} aria-label={`Delete ${r.title}`} className="h-9 w-9 px-0 py-0">
                  <Trash2 className="h-4 w-4" />
                </ConfirmSubmit>
              </form>
            </div>
          ))}
          {(reminders ?? []).length === 0 && <p className="rounded-xl bg-surface-sunken px-3 py-3 text-sm text-muted">No reminders yet.</p>}
        </div>
        <form action={addReminder} className="mt-4 grid gap-3 border-t border-harbor-100 pt-4 sm:grid-cols-[1fr_auto_auto]">
          <Field label="Reminder"><Input name="title" required placeholder="Library books due" /></Field>
          <Field label="Due"><Input name="due_date" type="date" required /></Field>
          <div className="flex items-end"><SubmitButton variant="secondary">Add</SubmitButton></div>
        </form>
      </Card>
    </>
  );
}
