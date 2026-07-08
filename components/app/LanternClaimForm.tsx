"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Sparkles } from "lucide-react";
import { claimLantern, type ClaimLanternState } from "@/app/app/(parent)/actions";
import { Field, Input, Select, Button } from "@/components/ui/primitives";

/** Set up a Lantern (device-initiated pairing): the parent enters the code the Lantern is
 *  showing and picks the child it's for. Inline, friendly, with a warm confirmation. */
export function LanternClaimForm({ kids }: { kids: { id: string; name: string }[] }) {
  const [state, action] = useActionState<ClaimLanternState, FormData>(claimLantern, {});

  if (state.ok) {
    return (
      <div className="rounded-xl border border-good/30 bg-good/10 p-4 text-center">
        <p className="text-2xl">🏮</p>
        <p className="mt-1 font-display text-lg font-bold text-fg">
          Welcome — this is {state.childName ?? "your child"}&apos;s Lantern!
        </p>
        <p className="mt-1 text-sm text-fg-muted">
          It&apos;s lighting up now and will show only their world. You can rename it below.
        </p>
      </div>
    );
  }

  if (kids.length === 0) {
    return <p className="text-sm text-fg-muted">Add a child first — then you can set up their Lantern.</p>;
  }

  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-fg-muted">
        Power on the Lantern and open it — it shows a 6-character code. Enter that code here and choose whose it is.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Code from the Lantern" className="min-w-40 flex-1">
          <Input
            name="code"
            required
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            placeholder="ABC234"
            maxLength={8}
            className="text-center font-mono text-2xl font-bold uppercase tracking-[0.25em]"
          />
        </Field>
        <Field label="Whose Lantern?" className="min-w-40 flex-1">
          <Select name="child_id" defaultValue="">
            <option value="" disabled>
              Pick a child…
            </option>
            {kids.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Name it (optional)" hint="Defaults to “[Child]'s Lantern”.">
        <Input name="nickname" placeholder="Cade's Lantern" />
      </Field>
      {state.error && (
        <p role="alert" className="rounded-xl bg-error/10 px-3.5 py-2.5 text-sm font-medium text-error ring-1 ring-error/30">
          {state.error}
        </p>
      )}
      <ClaimSubmit />
    </form>
  );
}

function ClaimSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Sparkles className="h-4 w-4" /> {pending ? "Setting up…" : "Set up this Lantern"}
    </Button>
  );
}
