"use client";

import { useOptimistic, useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { Sheet, SheetActions, useSheetClose } from "@/components/ui/Sheet";
import { ActionForm, FormError } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ChipGroup, ChildChips, type ChipChild } from "@/components/ui/Chips";
import { EmojiPicker } from "@/components/ui/EmojiPicker";
import { Stepper } from "@/components/ui/Stepper";
import { DateChips } from "@/components/ui/DateChips";
import { Toggle } from "@/components/ui/Toggle";
import { Button, Field, Input, Textarea } from "@/components/ui/primitives";
import { useQuickAction } from "@/components/ui/useQuickAction";
import { Disclosure } from "@/components/app/Disclosure";
import { postNote, saveNote, deleteNoteSoft, restoreNote } from "@/app/app/(parent)/messages/message-actions";

export type Note = {
  id: string;
  body: string;
  emoji: string | null;
  childId: string | null;
  author: string | null;
  pinned: boolean;
  bonus: number;
  until: string | null;
  meta: string;
};

export function NotesView({ notes, kids, tz }: { notes: Note[]; kids: ChipChild[]; tz: string }) {
  const [editing, setEditing] = useState<Note | "new" | null>(null);
  const [gone, hide] = useOptimistic<string[], string>([], (cur, id) => [...cur, id]);
  const shown = notes.filter((n) => !gone.includes(n.id));

  return (
    <>
      <Button size="lg" className="mb-5 w-full sm:w-auto" onClick={() => setEditing("new")}>
        <Plus className="h-4 w-4" /> Post a note
      </Button>
      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong p-6 text-center">
          <p className="text-3xl" aria-hidden>
            💌
          </p>
          <p className="mt-1 font-semibold text-fg">No notes yet</p>
          <p className="mt-0.5 text-sm text-fg-muted">An encouraging word or a heads-up shows on the wall&apos;s home screen.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {shown.map((n) => (
            <li key={n.id}>
              <button type="button" onClick={() => setEditing(n)} className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-surface-2">
                <span className="mt-0.5 text-2xl leading-none" aria-hidden>
                  {n.emoji ?? "💬"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-[15px] text-fg">{n.body}</span>
                  <span className="mt-1 block truncate text-sm text-fg-muted">{n.meta}</span>
                </span>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-fg-subtle" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Post a note" : "Edit note"} description={editing === "new" ? "It shows on the wall right away." : undefined}>
        {editing && <NoteForm key={editing === "new" ? "new" : editing.id} note={editing === "new" ? null : editing} kids={kids} tz={tz} onDelete={hide} />}
      </Sheet>
    </>
  );
}

function NoteForm({ note, kids, tz, onDelete }: { note: Note | null; kids: ChipChild[]; tz: string; onDelete: (id: string) => void }) {
  const close = useSheetClose();
  const { run, pending } = useQuickAction();
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const [keep, setKeep] = useState(note?.until ? "until" : "always");
  const [forWho, setForWho] = useState<string[]>([note?.childId ?? ""]);
  const everyone = forWho[0] === "" && kids.length > 1;

  return (
    <ActionForm action={note ? saveNote.bind(null, note.id) : postNote} className="space-y-5">
      <Field label="Note" htmlFor="nt-body">
        <Textarea id="nt-body" name="body" required maxLength={300} defaultValue={note?.body ?? ""} placeholder="Home by 5:30 — snack's in the fridge. You've got this!" className="min-h-24" data-autofocus />
      </Field>
      {kids.length > 0 && (
        <Field label="For">
          <ChildChips name="child_id" kids={kids} everyone everyoneLabel="Everyone" value={forWho} onChange={(v) => setForWho(v.length ? v : [""])} />
        </Field>
      )}
      <div className="rounded-xl border border-line px-3.5">
        <Toggle checked={pinned} onChange={setPinned} name="pinned" label="Keep at the top" />
      </div>
      <div className="rounded-xl border border-line">
        <Disclosure summary={<span className="text-[15px] font-semibold text-fg">More options</span>} bodyClassName="space-y-4 px-4 pb-4">
          <div className="flex items-end gap-3">
            <EmojiPicker name="emoji" defaultValue={note?.emoji ?? "💛"} label="Picture" />
            <Field label="From (optional)" htmlFor="nt-from" className="flex-1">
              <Input id="nt-from" name="author_label" maxLength={30} defaultValue={note?.author ?? ""} placeholder="Mom" />
            </Field>
          </div>
          <Field label="Show it">
            <ChipGroup
              name="keep"
              value={keep}
              onChange={(v) => v[0] && setKeep(v[0])}
              options={[
                { value: "always", label: "Until I remove it" },
                { value: "until", label: "Until a day" },
              ]}
            />
          </Field>
          {keep === "until" && <DateChips tz={tz} name="until" defaultValue={note?.until} includeWeekend />}
          {!note && (
            <Field label="Bonus stars (optional)" hint={everyone ? "Each kid gets this many." : undefined}>
              <Stepper name="bonus_points" defaultValue={0} max={50} presets={[0, 1, 5, 10]} suffix="★" label="Bonus stars" />
            </Field>
          )}
          {note && note.bonus > 0 && <p className="text-sm text-fg-muted">This note already gave +{note.bonus} ★.</p>}
        </Disclosure>
      </div>
      <FormError />
      <SheetActions className={note ? "sm:justify-between" : undefined}>
        {note && (
          <Button
            type="button"
            variant="ghost"
            className="text-error"
            disabled={pending}
            onClick={() => run(() => deleteNoteSoft(note.id), { optimistic: () => onDelete(note.id), undo: () => restoreNote(note.id), onDone: () => close?.() })}
          >
            Remove
          </Button>
        )}
        <SubmitButton size="lg" className={note ? undefined : "w-full sm:w-auto"} confirmSaved={false}>
          {note ? "Save" : "Post to the wall"}
        </SubmitButton>
      </SheetActions>
    </ActionForm>
  );
}
