import { Trash2, Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Input, Field, Select, Button } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { addEvent, deleteEvent, addReminder, deleteReminder } from "../hub-actions";

export const metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const household = await getMyHousehold();
  if (!household) return <Card><p className="text-muted">No household yet.</p></Card>;
  const supabase = await createClient();
  const [{ data: events }, { data: reminders }, { data: children }] = await Promise.all([
    supabase.from("events").select("*").eq("household_id", household.id).is("deleted_at", null).order("starts_at"),
    supabase.from("reminders").select("*").eq("household_id", household.id).is("deleted_at", null).order("due_date"),
    supabase.from("children").select("id, name").eq("household_id", household.id).is("deleted_at", null).order("sort_order"),
  ]);

  return (
    <>
      <PageHeader title="Family Calendar" subtitle="Events show on the wall's Today view and agenda." />

      <Card className="mb-4">
        <h2 className="font-display text-base font-bold text-harbor">Add an event</h2>
        <form action={addEvent} className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Title" className="sm:col-span-2">
            <Input name="title" required placeholder="Soccer practice" />
          </Field>
          <Field label="Emoji"><Input name="emoji" placeholder="⚽" className="text-center text-xl" /></Field>
          <Field label="When"><Input name="starts_at" type="datetime-local" /></Field>
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
          <Field label="Child (optional)">
            <Select name="child_id" defaultValue="">
              <option value="">Whole family</option>
              {(children ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input type="checkbox" name="all_day" className="h-4 w-4" /> All day
          </label>
          <div className="sm:col-span-2"><SubmitButton>Add event</SubmitButton></div>
        </form>
      </Card>

      <div className="mb-6 space-y-2">
        {(events ?? []).map((e) => (
          <Card key={e.id} className="flex items-center gap-3">
            <span className="text-2xl">{e.emoji ?? "📅"}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-harbor">{e.title}</p>
              <p className="text-sm text-muted">
                {e.all_day
                  ? "All day"
                  : new Date(e.starts_at).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                {e.recurrence_rule ? ` · repeats ${e.recurrence_rule}` : ""}
                {e.person_label ? ` · ${e.person_label}` : ""}
              </p>
            </div>
            <form action={deleteEvent.bind(null, e.id)}>
              <button className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50" aria-label="Delete event">
                <Trash2 className="h-4 w-4" />
              </button>
            </form>
          </Card>
        ))}
        {(events ?? []).length === 0 && <p className="text-sm text-muted">No events yet.</p>}
      </div>

      <Card>
        <h2 className="flex items-center gap-2 font-display text-base font-bold text-harbor">
          <Bell className="h-5 w-5" /> Reminders
        </h2>
        <div className="mt-3 space-y-2">
          {(reminders ?? []).map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-harbor-100 p-3">
              <span className="text-sm">
                <span className="font-medium text-ink">{r.title}</span>
                <span className="ml-2 text-muted">due {r.due_date}</span>
              </span>
              <form action={deleteReminder.bind(null, r.id)}>
                <button className="rounded-lg border border-red-200 p-1.5 text-red-700 hover:bg-red-50" aria-label="Delete reminder">
                  <Trash2 className="h-4 w-4" />
                </button>
              </form>
            </div>
          ))}
          {(reminders ?? []).length === 0 && <p className="text-sm text-muted">No reminders.</p>}
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
