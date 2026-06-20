"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Field, Input } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function ChangePasswordForm({ home }: { home: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function action(formData: FormData) {
    setError(null);
    const pw = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");
    if (pw.length < 8) return setError("Use at least 8 characters.");
    if (pw !== confirm) return setError("Passwords don't match.");

    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const { error: updErr } = await supabase.auth.updateUser({ password: pw });
    if (updErr) return setError(updErr.message);
    if (userData.user) {
      await supabase
        .from("profiles")
        .update({ must_change_password: false })
        .eq("id", userData.user.id);
    }
    setDone(true);
    router.replace(home);
    router.refresh();
  }

  return (
    <form action={action} className="mt-6 space-y-4">
      <Field label="New password">
        <Input name="password" type="password" required autoComplete="new-password" />
      </Field>
      <Field label="Confirm new password">
        <Input name="confirm" type="password" required autoComplete="new-password" />
      </Field>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <SubmitButton className="w-full" pendingText="Saving…">
        {done ? "Saved" : "Set new password"}
      </SubmitButton>
    </form>
  );
}
