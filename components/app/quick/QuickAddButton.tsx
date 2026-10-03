"use client";

import { Button } from "@/components/ui/primitives";
import { useQuickAdd, type QuickKind } from "./QuickAdd";

/** Opens a specific quick-add sheet ("Add an event", "Give stars"…) — lets Server Component pages
 *  offer the same one-tap flows as the global "+". */
export function QuickAddButton({
  kind,
  childId,
  children,
  variant = "secondary",
  size = "md",
  className,
}: {
  kind: QuickKind;
  childId?: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { open } = useQuickAdd();
  return (
    <Button type="button" variant={variant} size={size} className={className} onClick={() => open(kind, childId)}>
      {children}
    </Button>
  );
}
