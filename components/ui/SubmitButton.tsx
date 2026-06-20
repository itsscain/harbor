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
  const [saved, setSaved] = useState(false);

  // When a submit completes in place (pending true → false without the tree
  // being replaced by an error boundary), flash a brief confirmation.
  useEffect(() => {
    if (pending) {
      wasPending.current = true;
      return;
    }
    if (wasPending.current) {
      wasPending.current = false;
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
