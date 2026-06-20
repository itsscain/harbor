"use client";

import { useActionState } from "react";
import Link from "next/link";
import { bootstrapAdmin, type SetupState } from "./actions";
import { Field, Input } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function SetupForm({ defaultEmail }: { defaultEmail: string }) {
  const [state, action] = useActionState<SetupState, FormData>(bootstrapAdmin, {});

  if (state.success) {
    return (
      <div className="space-y-4">
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {state.success}
        </p>
        <Link
          href="/login?next=/admin"
          className="inline-flex rounded-xl bg-harbor px-5 py-3 font-semibold text-white"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <Field label="Setup secret" hint="The SETUP_SECRET value from your environment.">
        <Input name="setup_secret" type="password" required autoComplete="off" />
      </Field>
      <Field label="Your name">
        <Input name="full_name" type="text" autoComplete="name" />
      </Field>
      <Field label="Admin email">
        <Input
          name="email"
          type="email"
          required
          defaultValue={defaultEmail}
          autoComplete="email"
        />
      </Field>
      <Field label="Password" hint="At least 8 characters.">
        <Input name="password" type="password" required autoComplete="new-password" />
      </Field>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <SubmitButton pendingText="Creating…" className="w-full">
        Create admin account
      </SubmitButton>
    </form>
  );
}
