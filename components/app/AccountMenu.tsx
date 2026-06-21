"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Settings, CreditCard, LogOut, ChevronDown } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/cn";

export function AccountMenu({ householdName }: { householdName?: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const name = householdName?.trim() || "Account";
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "H";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition hover:bg-harbor-50 active:scale-95"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(180deg,#16586a,#0c3b47)] text-xs font-bold text-white">
          {initials}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-muted transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="animate-pop absolute right-0 top-12 z-40 w-56 overflow-hidden rounded-2xl border border-harbor-100 bg-white p-1.5 shadow-pop">
          <p className="px-3 py-2">
            <span className="text-eyebrow block text-muted">Signed in</span>
            <span className="block truncate font-semibold text-harbor">{name}</span>
          </p>
          <div className="my-1 h-px bg-harbor-100" />
          <MenuLink href="/app/settings" icon={Settings} label="Settings" onClick={() => setOpen(false)} />
          <MenuLink href="/app/billing" icon={CreditCard} label="Harbor Plus" onClick={() => setOpen(false)} />
          <div className="my-1 h-px bg-harbor-100" />
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string;
  icon: typeof Settings;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-harbor transition hover:bg-harbor-50"
    >
      <Icon className="h-4 w-4 text-muted" /> {label}
    </Link>
  );
}
