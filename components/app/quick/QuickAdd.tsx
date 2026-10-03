"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sheet, SheetActions, useSheetClose } from "@/components/ui/Sheet";
import { ActionForm, FormError } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ChipGroup, ChildChips, type ChipChild } from "@/components/ui/Chips";
import { Stepper } from "@/components/ui/Stepper";
import { DayPicker } from "@/components/ui/DayPicker";
import { EmojiPicker } from "@/components/ui/EmojiPicker";
import { Toggle } from "@/components/ui/Toggle";
import { useQuickAction } from "@/components/ui/useQuickAction";
import { Button, Field, Input, Textarea } from "@/components/ui/primitives";
import { dayKeyInTz, weekdayInTz } from "@/lib/tz";
import { cn } from "@/lib/cn";
import {
  giveStars,
  sendToWall,
  quickAddEvent,
  quickAddTodo,
  quickAddGrocery,
  quickAddChore,
} from "@/app/app/(parent)/quick-actions";

// The global "+" — add or send anything from anywhere in two or three taps. One provider owns a
// single Sheet; the menu swaps in the chosen form. Opened from the bottom nav, the desktop rail,
// or directly (e.g. a kid's ⭐ button opens straight to "Give stars" for that kid).

export type QuickKind = "menu" | "stars" | "note" | "event" | "todo" | "grocery" | "chore";

const TITLES: Record<QuickKind, string> = {
  menu: "Add or send",
  stars: "Give stars",
  note: "Message the wall",
  event: "Add an event",
  todo: "Add a to-do",
  grocery: "Add groceries",
  chore: "Add a chore",
};
const DESCRIPTIONS: Partial<Record<QuickKind, string>> = {
  stars: "They'll see it on the wall right away.",
  note: "Shows up on the wall in about a second.",
  grocery: "It's on the wall's list right away.",
  chore: "Shows on the wall to earn stars.",
};

type Ctx = { open: (kind?: QuickKind, childId?: string) => void };
const QuickAddContext = createContext<Ctx | null>(null);

export function useQuickAdd(): Ctx {
  return useContext(QuickAddContext) ?? { open: () => {} };
}

export function QuickAddProvider({ kids, tz, children }: { kids: ChipChild[]; tz: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const pathChild = pathname.match(/^\/app\/children\/([0-9a-f-]{36})/)?.[1];
  const [state, setState] = useState<{ kind: QuickKind; childId?: string } | null>(null);

  const open = useCallback(
    (kind: QuickKind = "menu", childId?: string) => setState({ kind, childId: childId ?? pathChild }),
    [pathChild],
  );
  const value = useMemo(() => ({ open }), [open]);
  const close = () => setState(null);
  const kind = state?.kind ?? "menu";
  const childId = state?.childId;

  return (
    <QuickAddContext.Provider value={value}>
      {children}
      <Sheet open={!!state} onClose={close} title={TITLES[kind]} description={DESCRIPTIONS[kind]}>
        {kind === "menu" && <AddMenu kids={kids} childId={childId} onPick={(k) => setState({ kind: k, childId })} />}
        {kind === "stars" && <StarsForm kids={kids} defaultChild={childId} />}
        {kind === "note" && <NoteForm kids={kids} defaultChild={childId} />}
        {kind === "event" && <EventForm kids={kids} tz={tz} defaultChild={childId} />}
        {kind === "todo" && <TodoForm tz={tz} />}
        {kind === "grocery" && <GroceryForm />}
        {kind === "chore" && <ChoreForm kids={kids} defaultChild={childId} />}
      </Sheet>
    </QuickAddContext.Provider>
  );
}

// ── The menu ─────────────────────────────────────────────────────────────────
const TILES: { kind: QuickKind | "routine" | "child"; emoji: string; label: string; sub: string }[] = [
  { kind: "stars", emoji: "⭐", label: "Give stars", sub: "Cheer someone on" },
  { kind: "note", emoji: "💬", label: "Message the wall", sub: "Pop up or pin it" },
  { kind: "event", emoji: "📅", label: "Event", sub: "Practice, party, appointment" },
  { kind: "todo", emoji: "✅", label: "To-do", sub: "Something to remember" },
  { kind: "grocery", emoji: "🛒", label: "Groceries", sub: "Add to the list" },
  { kind: "chore", emoji: "🧹", label: "Chore", sub: "A job that earns stars" },
  { kind: "routine", emoji: "🗓️", label: "Routine", sub: "Morning, bedtime…" },
  { kind: "child", emoji: "👶", label: "Add a child", sub: "Grow the family" },
];

function AddMenu({ kids, childId, onPick }: { kids: ChipChild[]; childId?: string; onPick: (k: QuickKind) => void }) {
  const router = useRouter();
  const close = useSheetClose();
  return (
    <div className="grid grid-cols-2 gap-2.5 pb-1">
      {TILES.map((t) => (
        <button
          key={t.kind}
          type="button"
          onClick={() => {
            if (t.kind === "routine") {
              close?.();
              const target = childId ?? kids[0]?.id;
              router.push(target ? `/app/children/${target}?tab=routines` : "/app/children");
            } else if (t.kind === "child") {
              close?.();
              router.push("/app/children?add=1");
            } else onPick(t.kind);
          }}
          className="tap flex min-h-[5.5rem] flex-col items-start gap-1 rounded-2xl border border-line bg-surface-2/60 p-3.5 text-left transition hover:border-accent/50 hover:bg-surface-2 active:scale-[0.98]"
        >
          <span className="text-2xl leading-none" aria-hidden>
            {t.emoji}
          </span>
          <span className="font-semibold text-fg">{t.label}</span>
          <span className="text-xs leading-snug text-fg-muted">{t.sub}</span>
        </button>
      ))}
    </div>
  );
}

// ── Stars ────────────────────────────────────────────────────────────────────
const REASONS = ["Great job", "Helped out", "Being kind", "Tidied up", "Brave", "Good listening"];

function StarsForm({ kids, defaultChild }: { kids: ChipChild[]; defaultChild?: string }) {
  const close = useSheetClose();
  const { run, pending } = useQuickAction();
  const [childId, setChildId] = useState(defaultChild ?? (kids.length === 1 ? kids[0].id : ""));
  const [mode, setMode] = useState<"give" | "take">("give");
  const [amount, setAmount] = useState(5);
  const [reason, setReason] = useState("");
  const [celebrate, setCelebrate] = useState(true);
  const kid = kids.find((k) => k.id === childId);
  const delta = mode === "give" ? amount : -amount;

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!childId || pending) return;
        run(() => giveStars({ childId, delta, reason, celebrate: mode === "give" && celebrate }), {
          undo: () => giveStars({ childId, delta: -delta, reason: "Undo", celebrate: false }),
          onDone: () => close?.(),
        });
      }}
    >
      {kids.length > 1 && (
        <Field label="Who?">
          <ChildChips kids={kids} value={childId ? [childId] : []} onChange={(v) => setChildId(v[0] ?? "")} />
        </Field>
      )}
      <ChipGroup
        value={mode}
        onChange={(v) => setMode((v[0] as "give" | "take") ?? "give")}
        options={[
          { value: "give", label: "Give", emoji: "⭐" },
          { value: "take", label: "Take away", emoji: "➖" },
        ]}
        ariaLabel="Give or take away"
      />
      <Field label="How many?">
        <Stepper value={amount} onChange={setAmount} min={1} max={50} presets={[1, 2, 5, 10]} suffix="★" label="Stars" />
      </Field>
      <Field label="For… (optional)">
        <ChipGroup
          value={REASONS.includes(reason) ? reason : null}
          onChange={(v) => setReason(v[0] ?? "")}
          options={REASONS.map((r) => ({ value: r, label: r }))}
          ariaLabel="Reason"
        />
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Or type your own" maxLength={80} className="mt-2" />
      </Field>
      {mode === "give" && (
        <Toggle checked={celebrate} onChange={setCelebrate} label="Celebrate on the wall" hint="A happy pop-up with their name" />
      )}
      <SheetActions>
        <Button type="submit" size="lg" disabled={!childId || pending} className="w-full sm:w-auto">
          {pending
            ? "Saving…"
            : `${mode === "give" ? "Give" : "Take"} ${amount} ${amount === 1 ? "star" : "stars"}${kid ? ` ${mode === "give" ? "to" : "from"} ${kid.name}` : ""}`}
        </Button>
      </SheetActions>
    </form>
  );
}

// ── Message the wall ─────────────────────────────────────────────────────────
function NoteForm({ kids, defaultChild }: { kids: ChipChild[]; defaultChild?: string }) {
  return (
    <ActionForm action={sendToWall} className="space-y-5">
      <Field label="Message" htmlFor="qa-note">
        <Textarea id="qa-note" name="body" required autoFocus data-autofocus maxLength={200} placeholder="Dinner in 10 minutes! 🍝" className="min-h-20" />
      </Field>
      <Field label="Who's it for?">
        <ChildChips name="child_id" kids={kids} everyone everyoneLabel="Everyone" defaultValue={defaultChild ?? ""} />
      </Field>
      <Field label="How should it show?">
        <ChipGroup
          name="mode"
          defaultValue="pop"
          options={[
            { value: "pop", label: "Pop up now", emoji: "⚡" },
            { value: "pin", label: "Pin to the board", emoji: "📌" },
          ]}
        />
      </Field>
      <input type="hidden" name="emoji" value="💬" />
      <FormError />
      <SheetActions>
        <SubmitButton size="lg" className="w-full sm:w-auto" confirmSaved={false}>
          Send to the wall
        </SubmitButton>
      </SheetActions>
    </ActionForm>
  );
}

// ── Event ────────────────────────────────────────────────────────────────────
function dayChips(tz: string) {
  const now = Date.now();
  const today = dayKeyInTz(now, tz);
  const tomorrow = dayKeyInTz(now + 86_400_000, tz);
  const dow = weekdayInTz(now, tz);
  const toSat = (6 - dow + 7) % 7 || 7;
  const saturday = dayKeyInTz(now + toSat * 86_400_000, tz);
  return { today, tomorrow, saturday };
}

function DatePick({ tz, name, includeWeekend = false }: { tz: string; name: string; includeWeekend?: boolean }) {
  const d = dayChips(tz);
  const [choice, setChoice] = useState<string>("today");
  const [custom, setCustom] = useState(d.today);
  const value = choice === "today" ? d.today : choice === "tomorrow" ? d.tomorrow : choice === "weekend" ? d.saturday : custom;
  return (
    <div className="space-y-2">
      <ChipGroup
        value={choice}
        onChange={(v) => setChoice(v[0] ?? "today")}
        options={[
          { value: "today", label: "Today" },
          { value: "tomorrow", label: "Tomorrow" },
          ...(includeWeekend ? [{ value: "weekend", label: "This weekend" }] : []),
          { value: "pick", label: "Pick a date" },
        ]}
        ariaLabel="When"
      />
      {choice === "pick" && (
        <Input type="date" value={custom} min={d.today} onChange={(e) => setCustom(e.target.value)} aria-label="Date" />
      )}
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

const TIME_PRESETS = [
  { value: "", label: "All day" },
  { value: "09:00", label: "9 am" },
  { value: "15:30", label: "3:30 pm" },
  { value: "18:00", label: "6 pm" },
];

function EventForm({ kids, tz, defaultChild }: { kids: ChipChild[]; tz: string; defaultChild?: string }) {
  const [time, setTime] = useState("");
  return (
    <ActionForm action={quickAddEvent} className="space-y-5">
      <div className="flex items-end gap-3">
        <EmojiPicker name="emoji" defaultValue="📅" />
        <Field label="What is it?" htmlFor="qa-event" className="flex-1">
          <Input id="qa-event" name="title" required autoFocus data-autofocus maxLength={120} placeholder="Soccer practice" />
        </Field>
      </div>
      <Field label="When?">
        <DatePick tz={tz} name="date" />
      </Field>
      <Field label="What time?">
        <div className="space-y-2">
          <ChipGroup value={TIME_PRESETS.some((p) => p.value === time) ? time : null} onChange={(v) => setTime(v[0] ?? "")} options={TIME_PRESETS} ariaLabel="Time" />
          <Input type="time" name="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="Exact time" />
        </div>
      </Field>
      {kids.length > 0 && (
        <Field label="Who's it for?">
          <ChildChips name="child_id" kids={kids} everyone everyoneLabel="Whole family" defaultValue={defaultChild ?? ""} />
        </Field>
      )}
      <Field label="Repeats?">
        <ChipGroup
          name="repeat"
          defaultValue=""
          options={[
            { value: "", label: "Just once" },
            { value: "weekly", label: "Every week" },
            { value: "weekdays", label: "Weekdays" },
            { value: "daily", label: "Every day" },
          ]}
        />
      </Field>
      <FormError />
      <SheetActions>
        <SubmitButton size="lg" className="w-full sm:w-auto" confirmSaved={false}>
          Add event
        </SubmitButton>
      </SheetActions>
    </ActionForm>
  );
}

// ── To-do ────────────────────────────────────────────────────────────────────
function TodoForm({ tz }: { tz: string }) {
  return (
    <ActionForm action={quickAddTodo} className="space-y-5">
      <Field label="What do you need to remember?" htmlFor="qa-todo">
        <Input id="qa-todo" name="title" required autoFocus data-autofocus maxLength={120} placeholder="Return library books" />
      </Field>
      <Field label="When?">
        <DatePick tz={tz} name="due_date" includeWeekend />
      </Field>
      <FormError />
      <SheetActions>
        <SubmitButton size="lg" className="w-full sm:w-auto" confirmSaved={false}>
          Add to-do
        </SubmitButton>
      </SheetActions>
    </ActionForm>
  );
}

// ── Groceries ────────────────────────────────────────────────────────────────
function GroceryForm() {
  return (
    <ActionForm action={quickAddGrocery} className="space-y-4" resetOnSuccess closeOnSuccess={false}>
      <Field label="What do you need?" hint="Add a few at once — separate with commas." htmlFor="qa-grocery">
        <Textarea id="qa-grocery" name="name" required autoFocus data-autofocus placeholder="Milk, eggs, bananas" className="min-h-20" />
      </Field>
      <FormError />
      <SheetActions>
        <SubmitButton size="lg" className="w-full sm:w-auto" confirmSaved={false}>
          Add to the list
        </SubmitButton>
      </SheetActions>
    </ActionForm>
  );
}

// ── Chore ────────────────────────────────────────────────────────────────────
function ChoreForm({ kids, defaultChild }: { kids: ChipChild[]; defaultChild?: string }) {
  const [who, setWho] = useState<string[]>(defaultChild ? [defaultChild] : kids.length === 1 ? [kids[0].id] : []);
  if (kids.length === 0) {
    return <p className="pb-2 text-fg-muted">Add a child first — then you can give them chores.</p>;
  }
  return (
    <ActionForm action={quickAddChore} className="space-y-5">
      <div className="flex items-end gap-3">
        <EmojiPicker name="icon" defaultValue="🧹" />
        <Field label="Chore" htmlFor="qa-chore" className="flex-1">
          <Input id="qa-chore" name="title" required autoFocus data-autofocus maxLength={80} placeholder="Feed the dog" />
        </Field>
      </div>
      <Field label="Who does it?" hint={who.length >= 2 ? "They'll take turns, one week each." : undefined}>
        <ChildChips name="child_ids" kids={kids} multiple value={who} onChange={setWho} />
      </Field>
      <Field label="Stars">
        <Stepper name="points" defaultValue={5} max={50} presets={[1, 3, 5, 10]} suffix="★" label="Stars" />
      </Field>
      <Field label="Days">
        <DayPicker name="days" />
      </Field>
      <FormError />
      <SheetActions>
        <SubmitButton size="lg" className={cn("w-full sm:w-auto")} confirmSaved={false}>
          Add chore
        </SubmitButton>
      </SheetActions>
    </ActionForm>
  );
}
