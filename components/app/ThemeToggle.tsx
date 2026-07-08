"use client";

import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";

/** Dark / light skin toggle for the Helm. Writes the `harbor-theme` cookie (read by the
 *  /app layout on the server for a no-flash SSR skin) and flips the app wrapper's
 *  data-theme live, so the change is instant without a reload. Dark is the default. */
export function ThemeToggle({ initial }: { initial: "dark" | "light" }) {
  const [theme, setTheme] = useState<"dark" | "light">(initial);

  function apply(t: "dark" | "light") {
    setTheme(t);
    document.cookie = `harbor-theme=${t};path=/;max-age=31536000;samesite=lax`;
    document.querySelector("[data-app-theme-root]")?.setAttribute("data-theme", t);
  }

  return (
    <div className="inline-flex rounded-xl border border-line bg-surface-2 p-1">
      {(
        [
          { key: "dark", label: "Dark", Icon: Moon },
          { key: "light", label: "Light", Icon: Sun },
        ] as const
      ).map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => apply(key)}
          aria-pressed={theme === key}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition",
            theme === key ? "bg-surface text-fg shadow-card" : "text-fg-muted hover:text-fg",
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
