"use client";

import { useActionState } from "react";
import { updateCustomer, type ActionResult } from "../actions";
import { Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { Customer } from "@/lib/types";

export function CustomerForm({
  customer,
  builds,
  nextFounder,
}: {
  customer: Customer;
  builds: { id: string; name: string }[];
  nextFounder: number | null;
}) {
  const action = updateCustomer.bind(null, customer.id);
  const [state, formAction] = useActionState<ActionResult, FormData>(action, {});

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <Field label="Name">
        <Input name="name" defaultValue={customer.name} required />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" defaultValue={customer.email ?? ""} />
      </Field>
      <Field label="Phone">
        <Input name="phone" defaultValue={customer.phone ?? ""} />
      </Field>
      <Field label="Build">
        <Select name="build_id" defaultValue={customer.build_id ?? ""}>
          <option value="">— none —</option>
          {builds.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Status">
        <Select name="status" defaultValue={customer.status}>
          <option value="lead">Lead</option>
          <option value="scheduled">Scheduled</option>
          <option value="installed">Installed</option>
        </Select>
      </Field>
      <Field label="Install date">
        <Input name="install_date" type="date" defaultValue={customer.install_date ?? ""} />
      </Field>
      <Field label="Install fee ($)">
        <Input name="install_fee" type="number" step="0.01" defaultValue={customer.install_fee ?? ""} />
      </Field>
      <Field
        label="Founder number"
        hint={
          nextFounder
            ? `Next available: #${nextFounder} (1–15)`
            : "All 15 founder spots are taken"
        }
      >
        <Input
          name="founder_number"
          type="number"
          min={1}
          max={15}
          defaultValue={customer.founder_number ?? ""}
        />
      </Field>
      <Field label="Notes" className="sm:col-span-2">
        <Textarea name="notes" defaultValue={customer.notes ?? ""} />
      </Field>

      {state.error && (
        <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="sm:col-span-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {state.success}
        </p>
      )}

      <div className="sm:col-span-2">
        <SubmitButton pendingText="Saving…">Save customer</SubmitButton>
      </div>
    </form>
  );
}
