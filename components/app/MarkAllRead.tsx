"use client";

import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { useQuickAction } from "@/components/ui/useQuickAction";
import { markAllNotificationsRead } from "@/app/app/(parent)/notification-actions";

/** "Mark all read" with an honest result (and no full-page form post). */
export function MarkAllRead() {
  const { run, pending } = useQuickAction();
  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={pending}
      onClick={() =>
        run(async () => {
          await markAllNotificationsRead();
          return { ok: true } as const;
        }, { success: "All caught up" })
      }
    >
      <CheckCheck className="h-4 w-4" /> Mark all read
    </Button>
  );
}
