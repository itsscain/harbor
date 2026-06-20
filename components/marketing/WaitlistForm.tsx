"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { joinWaitlist, type WaitlistState } from "@/lib/actions/waitlist";
import { Field, Input } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function WaitlistForm() {
  const [state, action] = useActionState<WaitlistState, FormData>(joinWaitlist, {});

  if (state.success) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <h3 className="mt-3 font-display text-xl font-bold text-harbor">
          You&apos;re on the list!
        </h3>
        <p className="mt-1 text-muted">
          We&apos;ll reach out as Founding Family spots open. Thank you.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name">
          <Input name="name" required autoComplete="name" />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" required autoComplete="email" />
        </Field>
        <Field label="Town">
          <Input name="town" autoComplete="address-level2" />
        </Field>
        <Field label="Number of kids">
          <Input name="kids_count" type="number" min={0} max={20} />
        </Field>
      </div>
      {state.error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      <div className="mt-5">
        <SubmitButton size="lg" variant="beacon" className="w-full" pendingText="Joining…">
          Claim a Founding Family spot
        </SubmitButton>
      </div>
      <p className="mt-3 text-center text-xs text-muted">
        No payment now. We&apos;ll reach out to the first 15 families.
      </p>
    </form>
  );
}
