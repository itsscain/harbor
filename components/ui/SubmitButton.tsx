"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { useActionForm } from "./ActionForm";

/**
 * The submit button. Inside an ActionForm it reflects the REAL outcome: "Saving…" while the
 * action runs and "✓ Saved" only after it actually succeeded (failures show a toast instead).
 * In a legacy `<form action>` it shows pending only — never a "Saved" it can't vouch for.
 *
 * It can no longer go dead: the old double-tap latch was set before the browser's validation,
 * so tapping Save with an empty required field latched forever. Now ActionForm guards double
 * submits itself, and the legacy latch only engages for a VALID form and self-clears.
 */
export function SubmitButton({
  children,
  pendingText,
  variant,
  size,
  className,
  savedText = "Saved",
  confirmSaved = true,
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: "primary" | "secondary" | "beacon" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
  savedText?: string;
  confirmSaved?: boolean;
}) {
  const af = useActionForm();
  const legacy = useFormStatus();
  const pending = af ? af.pending : legacy.pending;
  const latched = useRef(false);
  const [saved, setSaved] = useState(false);

  // Honest "Saved": only when the enclosing ActionForm reports a success.
  const okAt = af?.status.kind === "ok" ? af.status.at : 0;
  useEffect(() => {
    if (!okAt || !confirmSaved) return;
    setSaved(true);
    const t = window.setTimeout(() => setSaved(false), 1600);
    return () => window.clearTimeout(t);
  }, [okAt, confirmSaved]);

  // Legacy latch release: once a submit settles, the button is live again.
  useEffect(() => {
    if (!pending) latched.current = false;
  }, [pending]);

  return (
    <Button
      type="submit"
      disabled={pending}
      variant={variant}
      size={size}
      className={className}
      aria-busy={pending || undefined}
      onClick={(e) => {
        if (af) return; // ActionForm owns double-submit protection
        const form = e.currentTarget.form;
        if (form && !form.checkValidity()) return; // let the browser show what's missing — don't latch
        if (latched.current) {
          e.preventDefault();
          return;
        }
        latched.current = true;
        window.setTimeout(() => {
          latched.current = false; // never stay stuck, even if a submit is cancelled
        }, 4000);
      }}
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {pendingText ?? "Saving…"}
        </>
      ) : saved ? (
        <>
          <Check className="h-4 w-4" aria-hidden /> {savedText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
