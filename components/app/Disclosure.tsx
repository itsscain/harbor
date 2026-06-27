"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

/** One calm collapse primitive for the Helm. A quiet summary row at rest; the body
 *  reveals on tap. The big lever against clutter: lists become collapsed summary rows
 *  and their edit forms live BEHIND the row, not in front of it. */
export function Disclosure({
  summary,
  children,
  defaultOpen = false,
  className,
  bodyClassName,
}: {
  summary: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  bodyClassName?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition hover:bg-harbor-50/60"
      >
        <div className="min-w-0 flex-1">{summary}</div>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted transition-transform duration-300", open && "rotate-180")} />
      </button>
      <div id={id} hidden={!open} className={cn(open && "animate-enter", bodyClassName)}>
        {children}
      </div>
    </div>
  );
}
