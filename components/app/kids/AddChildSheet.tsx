"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Sheet, SheetActions } from "@/components/ui/Sheet";
import { ActionForm, FormError } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { EmojiPicker } from "@/components/ui/EmojiPicker";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { Button, Field, Input } from "@/components/ui/primitives";
import { quickAddChild } from "@/app/app/(parent)/children/kid-actions";

/** Name, a face, a color — with a live look at how they'll appear on the wall. Then straight to
 *  their page, where one tap sets up their day (so that step can't be lost to a refresh). */
export function AddChildForm({ nextColor, autoFocus = true }: { nextColor: string; autoFocus?: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [face, setFace] = useState("🦊");
  const [color, setColor] = useState(nextColor);
  const [showBirthday, setShowBirthday] = useState(false);

  return (
    <ActionForm
      action={quickAddChild}
      className="space-y-5"
      onSuccess={(r) => {
        const id = (r as { id?: string } | null)?.id;
        if (id) router.push(`/app/children/${id}`);
      }}
    >
      <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-3xl leading-none" style={{ background: color }} aria-hidden>
          {face}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-fg-muted">How they&apos;ll look on the wall</p>
          <p className="truncate text-lg font-bold text-fg">{name.trim() || "Your child"}</p>
        </div>
      </div>
      <div className="flex items-end gap-3">
        <EmojiPicker name="avatar" defaultValue={face} onChange={setFace} label="Face" />
        <Field label="Name" htmlFor="kid-name" className="flex-1">
          <Input
            id="kid-name"
            name="name"
            required
            autoFocus={autoFocus}
            data-autofocus={autoFocus || undefined}
            maxLength={40}
            placeholder="Their first name"
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Their color" hint="So they can spot their stuff on the wall.">
        <ColorPicker name="color" defaultValue={nextColor} onChange={setColor} />
      </Field>
      {showBirthday ? (
        <Field label="Birthday (optional)" htmlFor="kid-bday" hint="Shows a birthday countdown on the wall.">
          <Input id="kid-bday" name="birthday" type="date" />
        </Field>
      ) : (
        <button type="button" onClick={() => setShowBirthday(true)} className="min-h-10 text-sm font-semibold text-accent">
          + Add a birthday
        </button>
      )}
      <FormError />
      <SheetActions>
        <SubmitButton size="lg" className="w-full sm:w-auto" confirmSaved={false}>
          Add child
        </SubmitButton>
      </SheetActions>
    </ActionForm>
  );
}

/** "Add a child" button + sheet. `autoOpen` (from ?add=1) opens it, e.g. from the "+" menu. */
export function AddChildLauncher({
  nextColor,
  autoOpen = false,
  variant = "primary",
  label = "Add a child",
}: {
  nextColor: string;
  autoOpen?: boolean;
  variant?: "primary" | "secondary";
  label?: string;
}) {
  const [open, setOpen] = useState(autoOpen);
  const [prevAuto, setPrevAuto] = useState(autoOpen);
  if (autoOpen !== prevAuto) {
    setPrevAuto(autoOpen);
    if (autoOpen) setOpen(true);
  }

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" /> {label}
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Add a child" description="You can change any of this later.">
        <AddChildForm nextColor={nextColor} />
      </Sheet>
    </>
  );
}
