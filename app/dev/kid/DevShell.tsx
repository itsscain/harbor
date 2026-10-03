"use client";

import { useState } from "react";
import { ToastProvider } from "@/components/ui/Toast";
import { QuickAddProvider } from "@/components/app/quick/QuickAdd";
import { ParentNav } from "@/components/app/ParentNav";
import { AppTopBarProvider } from "@/components/app/AppTopBar";
import type { ChipChild } from "@/components/ui/Chips";

// Development-only chrome for mock previews: the real providers, top bar and nav + a theme flip.
export function DevShell({ kids, children }: { kids: ChipChild[]; children: React.ReactNode }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  return (
    <div data-theme={theme} data-app-theme-root className="min-h-dvh bg-bg text-fg">
      <ToastProvider>
        <QuickAddProvider kids={kids} tz="America/New_York">
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="fixed right-2 top-2 z-50 rounded-full bg-surface-2 px-3 py-1 text-xs text-fg-muted">
            {theme}
          </button>
          <AppTopBarProvider unread={1} householdName="Rivera Family">
            <main className="mx-auto w-full max-w-2xl p-4 pb-32 sm:p-6 lg:max-w-3xl lg:px-10 lg:py-8">{children}</main>
          </AppTopBarProvider>
          <ParentNav />
        </QuickAddProvider>
      </ToastProvider>
    </div>
  );
}
