"use client";

import { useActionState } from "react";
import { UserPlus, Users, X } from "lucide-react";
import { inviteCoParent, removeCoParent } from "@/app/app/(parent)/hub-actions";
import { Card, Input, Field, Badge } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";

export type Guardian = { profile_id: string; email: string; role: string; isOwner: boolean };

/** Co-parent / multi-guardian management (§9.2.11). The owner invites others by
 *  email; everyone listed shares the same household. */
export function GuardiansCard({
  guardians,
  isOwner,
  available,
}: {
  guardians: Guardian[];
  isOwner: boolean;
  available: boolean;
}) {
  const [state, action] = useActionState<{ error?: string; success?: string }, FormData>(
    inviteCoParent,
    {},
  );

  return (
    <Card className="space-y-5">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-water" />
        <h2 className="font-display text-lg font-semibold text-ink">Guardians</h2>
      </div>
      <p className="text-sm text-muted">
        Everyone who helps run the home. A co-parent gets their own sign-in and sees the same
        household — calendar, kids, routines, all of it. One Harbor, shared.
      </p>

      <ul className="divide-y divide-harbor-100 overflow-hidden rounded-xl ring-1 ring-harbor-100">
        {guardians.length === 0 && (
          <li className="px-4 py-3 text-sm text-muted">Just you so far.</li>
        )}
        {guardians.map((g) => (
          <li key={g.profile_id} className="flex items-center justify-between gap-3 px-4 py-3">
            <p className="min-w-0 truncate text-sm font-medium text-ink">{g.email}</p>
            <div className="flex shrink-0 items-center gap-2">
              <Badge tone={g.isOwner ? "beacon" : "neutral"}>{g.isOwner ? "Owner" : "Guardian"}</Badge>
              {isOwner && !g.isOwner && (
                <form action={removeCoParent.bind(null, g.profile_id)}>
                  <button
                    type="submit"
                    aria-label={`Remove ${g.email}`}
                    className="rounded-full p-1.5 text-muted transition hover:bg-error-soft hover:text-error-ink"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </form>
              )}
            </div>
          </li>
        ))}
      </ul>

      {!isOwner ? (
        <p className="text-sm text-muted">Only the household owner can add or remove guardians.</p>
      ) : !available ? (
        <p className="rounded-xl bg-harbor-50 px-4 py-3 text-sm text-muted">
          Inviting co-parents needs the service-role key configured. It&apos;s set in production, so
          invites work on the live site.
        </p>
      ) : (
        <form action={action} className="space-y-3">
          <Field label="Invite a co-parent by email">
            <Input name="email" type="email" required placeholder="partner@example.com" autoComplete="off" />
          </Field>
          {state.error && <p className="text-sm text-error-ink">{state.error}</p>}
          {state.success && <p className="text-sm text-emerald-600">{state.success}</p>}
          <SubmitButton variant="primary" size="sm" pendingText="Sending…" savedText="Invited" confirmSaved={false}>
            <UserPlus className="h-4 w-4" /> Send invite
          </SubmitButton>
        </form>
      )}
    </Card>
  );
}
