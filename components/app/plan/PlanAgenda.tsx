"use client";

import { useOptimistic, useState } from "react";
import { Check, ChevronRight, Plus } from "lucide-react";
import { Sheet, SheetActions, useSheetClose } from "@/components/ui/Sheet";
import { ActionForm, FormError } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ChipGroup, ChildChips } from "@/components/ui/Chips";
import { EmojiPicker } from "@/components/ui/EmojiPicker";
import { DateChips, TimeChips } from "@/components/ui/DateChips";
import { Toggle } from "@/components/ui/Toggle";
import { Button, Field, Input } from "@/components/ui/primitives";
import { useQuickAction } from "@/components/ui/useQuickAction";
import { useQuickAdd } from "@/components/app/quick/QuickAdd";
import { Disclosure } from "@/components/app/Disclosure";
import { completeReminder, reopenReminder } from "@/app/app/(parent)/quick-actions";
import {
  saveEvent,
  deleteEventSoft,
  restoreEvent,
  saveReminder,
  deleteReminderSoft,
  restoreReminder,
  saveMeal,
  deleteMealSoft,
  restoreMeal,
} from "@/app/app/(parent)/plan/plan-actions";
import type { PlanModel, PlanEvent, PlanReminder, PlanMeal, PlanKid, EventEdit, ReminderEdit, MealEdit } from "@/lib/plan";
import { cn } from "@/lib/cn";

type Editing = { kind: "event"; data: EventEdit } | { kind: "reminder"; data: ReminderEdit } | { kind: "meal"; data: MealEdit } | null;

const MEAL_ORDER: Record<string, number> = { breakfast: 0, lunch: 1, snack: 2, dinner: 3 };
const MEAL_LABEL: Record<string, string> = { breakfast: "Breakfast", lunch: "Lunch", snack: "Snack", dinner: "Dinner" };

function Tile({ emoji, label, onClick }: { emoji: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap flex min-h-[4rem] flex-col items-center justify-center gap-1 rounded-2xl border border-line bg-surface text-sm font-semibold text-fg transition hover:border-accent/50 active:scale-[0.97]"
    >
      <span className="text-xl leading-none" aria-hidden>
        {emoji}
      </span>
      {label}
    </button>
  );
}

/** The next two weeks as one calm list. Tap anything to change it; tap a circle to check it off. */
export function PlanAgenda({ model }: { model: PlanModel }) {
  const quick = useQuickAdd();
  const { run } = useQuickAction();
  const [editing, setEditing] = useState<Editing>(null);
  const [gone, hide] = useOptimistic<string[], string>([], (cur, key) => [...cur, key]);
  const week = model.days.filter((d) => d.showDinnerSlot);
  const firstOpenDinner = week.find((d) => !d.meals.some((m) => m.edit.mealType === "dinner"))?.key ?? model.todayKey;

  const newDinner = (date: string) => setEditing({ kind: "meal", data: { id: null, date, title: "", emoji: null, mealType: "dinner", notes: null } });
  const done = (r: PlanReminder) =>
    run(() => completeReminder(r.edit.id), {
      optimistic: () => hide(r.key),
      undo: () => reopenReminder(r.edit.id),
      success: `Checked off “${r.edit.title}”`,
    });

  const reminderRow = (r: PlanReminder) =>
    gone.includes(r.key) ? null : (
      <li key={r.key} className="flex items-center">
        <button
          type="button"
          onClick={() => done(r)}
          aria-label={`Check off ${r.edit.title}`}
          className="grid h-14 w-14 shrink-0 place-items-center text-fg-subtle transition hover:text-good"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-current">
            <Check className="h-3.5 w-3.5 opacity-0 transition hover:opacity-100" strokeWidth={3} />
          </span>
        </button>
        <button type="button" onClick={() => setEditing({ kind: "reminder", data: r.edit })} className="flex min-h-14 min-w-0 flex-1 items-center gap-2 py-2.5 pr-4 text-left">
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-fg">{r.edit.title}</span>
            <span className="block truncate text-sm text-fg-muted">
              🔔 Reminder{r.who ? ` · ${r.who}` : ""}
              {r.overdueLabel && <span className="font-semibold text-beacon"> · {r.overdueLabel}</span>}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
        </button>
      </li>
    );

  const eventRow = (e: PlanEvent) =>
    gone.includes(`ev:${e.edit.id}`) ? null : (
      <li key={e.key}>
        <button type="button" onClick={() => setEditing({ kind: "event", data: e.edit })} className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-surface-2">
          <span className="w-16 shrink-0 text-sm font-semibold tabular-nums text-fg-muted">{e.time}</span>
          <span className="h-8 w-1 shrink-0 rounded-full" style={{ background: e.color }} aria-hidden />
          <span className="text-xl leading-none" aria-hidden>
            {e.edit.emoji ?? "📅"}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-fg">{e.edit.title}</span>
            {(e.who || e.repeatLabel || e.edit.location) && (
              <span className="block truncate text-sm text-fg-muted">{[e.who, e.repeatLabel, e.edit.location].filter(Boolean).join(" · ")}</span>
            )}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
        </button>
      </li>
    );

  const mealRow = (m: PlanMeal) =>
    gone.includes(m.key) ? null : (
      <li key={m.key}>
        <button type="button" onClick={() => setEditing({ kind: "meal", data: m.edit })} className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-surface-2">
          <span className="w-16 shrink-0 text-sm font-semibold text-fg-muted">{MEAL_LABEL[m.edit.mealType] ?? "Meal"}</span>
          <span className="text-xl leading-none" aria-hidden>
            {m.edit.emoji ?? "🍽️"}
          </span>
          <span className="min-w-0 flex-1 truncate font-semibold text-fg">{m.edit.title}</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
        </button>
      </li>
    );

  return (
    <>
      <div className="mb-6 grid grid-cols-3 gap-2">
        <Tile emoji="📅" label="Event" onClick={() => quick.open("event")} />
        <Tile emoji="🔔" label="Reminder" onClick={() => quick.open("todo")} />
        <Tile emoji="🍽️" label="Dinner" onClick={() => newDinner(firstOpenDinner)} />
      </div>

      {model.overdue.some((r) => !gone.includes(r.key)) && (
        <section className="mb-5">
          <h2 className="mb-2 text-title text-beacon">Still to do</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-beacon/35 bg-surface">{model.overdue.map(reminderRow)}</ul>
        </section>
      )}

      {model.days.map((d) => {
        const meals = [...d.meals].sort((a, b) => (MEAL_ORDER[a.edit.mealType] ?? 9) - (MEAL_ORDER[b.edit.mealType] ?? 9));
        const hasDinner = meals.some((m) => m.edit.mealType === "dinner" && !gone.includes(m.key));
        const empty = !d.events.length && !d.reminders.length && !meals.length && !d.showDinnerSlot;
        return (
          <section key={d.key} className="mb-5">
            <h2 className="mb-2 flex items-baseline gap-2">
              <span className={cn("text-title", d.isToday ? "text-accent" : "text-fg")}>{d.label}</span>
              <span className="text-sm text-fg-muted">{d.sub}</span>
            </h2>
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
              {d.events.map(eventRow)}
              {d.reminders.map(reminderRow)}
              {empty && <li className="px-4 py-3 text-sm text-fg-subtle">Nothing planned</li>}
              {meals.map(mealRow)}
              {d.showDinnerSlot && !hasDinner && (
                <li>
                  <button type="button" onClick={() => newDinner(d.key)} className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left text-sm font-semibold text-fg-muted transition hover:bg-surface-2 hover:text-fg">
                    <span className="w-16 shrink-0">Dinner</span>
                    <Plus className="h-4 w-4" /> Add dinner
                  </button>
                </li>
              )}
            </ul>
          </section>
        );
      })}

      <Sheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.kind === "event" ? "Edit event" : editing?.kind === "reminder" ? "Edit reminder" : editing?.data.id ? "Edit meal" : "Plan a meal"}
      >
        {editing?.kind === "event" && <EventEditForm key={editing.data.id} data={editing.data} kids={model.kids} tz={model.tz} onDelete={() => hide(`ev:${editing.data.id}`)} />}
        {editing?.kind === "reminder" && <ReminderEditForm key={editing.data.id} data={editing.data} kids={model.kids} tz={model.tz} onDelete={() => hide(`rem:${editing.data.id}`)} />}
        {editing?.kind === "meal" && (
          <MealForm key={editing.data.id ?? `new:${editing.data.date}`} data={editing.data} days={week.map((d) => ({ key: d.key, label: d.label }))} onDelete={() => hide(`meal:${editing.data.id}`)} />
        )}
      </Sheet>
    </>
  );
}

// ── Edit forms ───────────────────────────────────────────────────────────────
function DeleteButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <Button type="button" variant="ghost" className="text-error" disabled={disabled} onClick={onClick}>
      {label}
    </Button>
  );
}

function EventEditForm({ data, kids, tz, onDelete }: { data: EventEdit; kids: PlanKid[]; tz: string; onDelete: () => void }) {
  const close = useSheetClose();
  const { run, pending } = useQuickAction();
  const [countdown, setCountdown] = useState(data.countdown);
  return (
    <ActionForm action={saveEvent.bind(null, data.id)} success="Event saved" className="space-y-5">
      <div className="flex items-end gap-3">
        <EmojiPicker name="emoji" defaultValue={data.emoji ?? "📅"} />
        <Field label="What is it?" htmlFor="pe-title" className="flex-1">
          <Input id="pe-title" name="title" required maxLength={120} defaultValue={data.title} />
        </Field>
      </div>
      <Field label="When?">
        <DateChips tz={tz} name="date" defaultValue={data.date} allowPast />
      </Field>
      <Field label="What time?">
        <TimeChips name="time" defaultValue={data.time} />
      </Field>
      {kids.length > 0 && (
        <Field label="Who's it for?">
          <ChildChips name="child_id" kids={kids} everyone everyoneLabel="Whole family" defaultValue={data.childId ?? ""} />
        </Field>
      )}
      <Field label="Repeats?" hint={data.repeat ? "Changes apply to every repeat." : undefined}>
        <ChipGroup
          name="repeat"
          defaultValue={data.repeat ?? ""}
          options={[
            { value: "", label: "Just once" },
            { value: "weekly", label: "Every week" },
            { value: "weekdays", label: "Weekdays" },
            { value: "daily", label: "Every day" },
          ]}
        />
      </Field>
      <div className="rounded-xl border border-line">
        <Disclosure summary={<span className="text-[15px] font-semibold text-fg">More options</span>} bodyClassName="space-y-4 px-4 pb-4">
          <Field label="Where? (optional)" htmlFor="pe-loc">
            <Input id="pe-loc" name="location" maxLength={120} defaultValue={data.location ?? ""} placeholder="Field 3" />
          </Field>
          <Toggle checked={countdown} onChange={setCountdown} name="countdown" label="Count down on the wall" hint="“5 sleeps until…” — great for trips and parties" />
        </Disclosure>
      </div>
      <FormError />
      <SheetActions className="sm:justify-between">
        <DeleteButton
          label={data.repeat ? "Delete all repeats" : "Delete event"}
          disabled={pending}
          onClick={() => run(() => deleteEventSoft(data.id), { optimistic: onDelete, undo: () => restoreEvent(data.id), onDone: () => close?.() })}
        />
        <SubmitButton size="lg" confirmSaved={false}>
          Save
        </SubmitButton>
      </SheetActions>
    </ActionForm>
  );
}

function ReminderEditForm({ data, kids, tz, onDelete }: { data: ReminderEdit; kids: PlanKid[]; tz: string; onDelete: () => void }) {
  const close = useSheetClose();
  const { run, pending } = useQuickAction();
  return (
    <ActionForm action={saveReminder.bind(null, data.id)} success="Reminder saved" className="space-y-5">
      <Field label="Remind me to…" htmlFor="pr-title">
        <Input id="pr-title" name="title" required maxLength={120} defaultValue={data.title} />
      </Field>
      <Field label="When?" hint="It shows on Today and on the wall that day.">
        <DateChips tz={tz} name="due_date" defaultValue={data.dueDate} includeWeekend allowPast />
      </Field>
      {kids.length > 0 && (
        <Field label="About someone? (optional)">
          <ChildChips name="child_id" kids={kids} everyone everyoneLabel="No one" everyoneEmoji="➖" defaultValue={data.childId ?? ""} />
        </Field>
      )}
      <FormError />
      <SheetActions className="sm:justify-between">
        <DeleteButton
          label="Delete reminder"
          disabled={pending}
          onClick={() => run(() => deleteReminderSoft(data.id), { optimistic: onDelete, undo: () => restoreReminder(data.id), onDone: () => close?.() })}
        />
        <SubmitButton size="lg" confirmSaved={false}>
          Save
        </SubmitButton>
      </SheetActions>
    </ActionForm>
  );
}

const MEAL_IDEAS = [
  { emoji: "🌮", title: "Tacos" },
  { emoji: "🍝", title: "Pasta" },
  { emoji: "🍕", title: "Pizza" },
  { emoji: "🍔", title: "Burgers" },
  { emoji: "🍗", title: "Chicken" },
  { emoji: "🍲", title: "Soup" },
  { emoji: "🥞", title: "Breakfast for dinner" },
  { emoji: "🥡", title: "Takeout" },
];

function MealForm({ data, days, onDelete }: { data: MealEdit; days: { key: string; label: string }[]; onDelete: () => void }) {
  const close = useSheetClose();
  const { run, pending } = useQuickAction();
  const [title, setTitle] = useState(data.title);
  const [emoji, setEmoji] = useState(data.emoji ?? "🍽️");
  const [pickKey, setPickKey] = useState(0);
  const dayOptions = days.some((d) => d.key === data.date) ? days : [{ key: data.date, label: data.date }, ...days];

  return (
    <ActionForm action={saveMeal.bind(null, data.id)} className="space-y-5">
      <div className="flex items-end gap-3">
        <EmojiPicker key={pickKey} name="emoji" defaultValue={emoji} onChange={setEmoji} label="Picture" />
        <Field label={data.mealType === "dinner" ? "What's for dinner?" : "What's cooking?"} htmlFor="pm-title" className="flex-1">
          <Input id="pm-title" name="title" required maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Taco night" data-autofocus />
        </Field>
      </div>
      {!data.id && (
        <div className="flex flex-wrap gap-1.5">
          {MEAL_IDEAS.map((m) => (
            <button
              key={m.title}
              type="button"
              onClick={() => {
                setTitle(m.title);
                setEmoji(m.emoji);
                setPickKey((k) => k + 1);
              }}
              className="tap inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-surface-2/60 px-3 text-sm font-medium text-fg transition hover:border-accent/50"
            >
              <span aria-hidden>{m.emoji}</span> {m.title}
            </button>
          ))}
        </div>
      )}
      <Field label="Which day?">
        <ChipGroup name="date" defaultValue={data.date} options={dayOptions.map((d) => ({ value: d.key, label: d.label }))} ariaLabel="Day" />
      </Field>
      <div className="rounded-xl border border-line">
        <Disclosure summary={<span className="text-[15px] font-semibold text-fg">More options</span>} bodyClassName="space-y-4 px-4 pb-4">
          <Field label="Meal">
            <ChipGroup
              name="meal_type"
              defaultValue={data.mealType}
              options={[
                { value: "dinner", label: "Dinner" },
                { value: "breakfast", label: "Breakfast" },
                { value: "lunch", label: "Lunch" },
                { value: "snack", label: "Snack" },
              ]}
            />
          </Field>
          <Field label="Note (optional)" htmlFor="pm-notes">
            <Input id="pm-notes" name="notes" maxLength={200} defaultValue={data.notes ?? ""} placeholder="Thaw the chicken in the morning" />
          </Field>
        </Disclosure>
      </div>
      <FormError />
      <SheetActions className={data.id ? "sm:justify-between" : undefined}>
        {data.id && (
          <DeleteButton
            label="Remove"
            disabled={pending}
            onClick={() => run(() => deleteMealSoft(data.id!), { optimistic: onDelete, undo: () => restoreMeal(data.id!), onDone: () => close?.() })}
          />
        )}
        <SubmitButton size="lg" className={data.id ? undefined : "w-full sm:w-auto"} confirmSaved={false}>
          {data.id ? "Save" : "Add to the menu"}
        </SubmitButton>
      </SheetActions>
    </ActionForm>
  );
}
