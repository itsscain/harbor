"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/primitives";

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
  const { pending } = useFormStatus();
  const wasPending = useRef(false);
  // Synchronous in-flight latch — blocks a second (double-tap) submit in the
  // window before `pending` flips, so forms never fire twice (no duplicate
  // routines, children, points, etc.). Reset once the submit settles.
  const submitting = useRef(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (pending) {
      wasPending.current = true;
      return;
    }
    if (wasPending.current) {
      wasPending.current = false;
      submitting.current = false;
      if (confirmSaved) {
        setSaved(true);
        const t = setTimeout(() => setSaved(false), 1800);
        return () => clearTimeout(t);
      }
    }
  }, [pending, confirmSaved]);

  return (
    <Button
      type="submit"
      disabled={pending}
      variant={variant}
      size={size}
      className={className}
      aria-live="polite"
      onClick={(e) => {
        if (pending || submitting.current) {
          e.preventDefault();
          return;
        }
        submitting.current = true;
      }}
    >
      {pending ? (
        (pendingText ?? "Working…")
      ) : saved ? (
        <>
          <Check className="h-4 w-4" /> {savedText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
