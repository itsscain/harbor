"use client";

import { useActionState } from "react";
import { provisionCustomer, type ActionResult } from "../actions";
import { Field, Input } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function ProvisionPanel({
  customerId,
  defaultHouseholdName,
}: {
  customerId: string;
  defaultHouseholdName: string;
}) {
  const action = provisionCustomer.bind(null, customerId);
  const [state, formAction] = useActionState<ActionResult, FormData>(action, {});

  return (
    <form action={formAction} className="mt-4 space-y-3">
      <p className="text-sm text-muted">
        Creates the household, invites the parent by email, and mints the first
        device pairing code.
      </p>
      <Field label="Household name">
        <Input name="household_name" defaultValue={defaultHouseholdName} />
      </Field>

      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {state.success}
        </p>
      )}

      <SubmitButton variant="beacon" pendingText="Provisioning…">
        Provision &amp; invite parent
      </SubmitButton>
    </form>
  );
}
