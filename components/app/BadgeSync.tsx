"use client";

import { useEffect } from "react";

/** Mirror the unread count onto the installed app-icon badge (Badging API, iOS 16.4+). */
export function BadgeSync({ count }: { count: number }) {
  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    try {
      if (count > 0) void nav.setAppBadge?.(count);
      else void nav.clearAppBadge?.();
    } catch {
      /* unsupported — no-op */
    }
  }, [count]);
  return null;
}
