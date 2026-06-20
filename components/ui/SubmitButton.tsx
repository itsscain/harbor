"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/primitives";

export function SubmitButton({
  children,
  pendingText,
  variant,
  size,
  className,
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: "primary" | "secondary" | "beacon" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      variant={variant}
      size={size}
      className={className}
    >
      {pending ? (pendingText ?? "Working…") : children}
    </Button>
  );
}
