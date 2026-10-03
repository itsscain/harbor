"use client";

import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./primitives";

// The one way to add or edit something: a sheet that slides up from the bottom on a phone and
// sits centered on a larger screen. Accessible by default (dialog role, focus moves in and is
// trapped, Escape/backdrop close, focus returns to what opened it, background scroll locked).
// It renders INSIDE the app's themed wrapper so dark/light tokens apply.

const SheetCloseContext = createContext<(() => void) | null>(null);

/** Close the nearest enclosing Sheet (null outside one). ActionForm calls this on success. */
export function useSheetClose(): (() => void) | null {
  return useContext(SheetCloseContext);
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Sheets can stack (e.g. the emoji picker opens over an "Add chore" sheet). Only the TOP sheet
// answers Escape and traps Tab, so closing the picker never closes the form underneath it.
const openStack: symbol[] = [];
const isTop = (token: symbol) => openStack[openStack.length - 1] === token;

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  size?: "md" | "lg";
}) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const token = Symbol("sheet");
    openStack.push(token);
    // Lets the toaster move to the top while a sheet is up, so a toast never covers its buttons.
    document.documentElement.setAttribute("data-sheet-open", "");
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus in: an explicit [data-autofocus], else the first field, else the first control.
    const t = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const target =
        panel.querySelector<HTMLElement>("[data-autofocus]") ??
        panel.querySelector<HTMLElement>('input:not([type="hidden"]):not([disabled]), textarea:not([disabled])') ??
        panel.querySelector<HTMLElement>(FOCUSABLE);
      target?.focus({ preventScroll: true });
    }, 40);

    const onKey = (e: KeyboardEvent) => {
      if (!isTop(token)) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const els = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      const i = openStack.indexOf(token);
      if (i >= 0) openStack.splice(i, 1);
      if (openStack.length === 0) document.documentElement.removeAttribute("data-sheet-open");
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open || !mounted) return null;
  const host = document.querySelector("[data-app-theme-root]") ?? document.body;

  return createPortal(
    <SheetCloseContext.Provider value={onClose}>
      <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
        <div className="animate-fade-in absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descId : undefined}
          className={cn(
            "animate-sheet-up relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[1.75rem] border border-line bg-surface text-fg shadow-pop sm:rounded-3xl",
            size === "md" ? "sm:max-w-lg" : "sm:max-w-2xl",
          )}
        >
          <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden>
            <span className="h-1.5 w-10 rounded-full bg-line-strong" />
          </div>
          <header className="flex items-start gap-3 px-5 pb-2 pt-2 sm:pt-5">
            <div className="min-w-0 flex-1 pt-1.5">
              <h2 id={titleId} className="font-display text-[1.35rem] font-bold leading-tight text-fg">
                {title}
              </h2>
              {description && (
                <p id={descId} className="mt-1 text-sm text-fg-muted">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1.5 grid h-11 w-11 shrink-0 place-items-center rounded-full text-fg-muted transition hover:bg-surface-2 hover:text-fg"
            >
              <X className="h-5 w-5" />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-1">
            {children}
          </div>
        </div>
      </div>
    </SheetCloseContext.Provider>,
    host,
  );
}

/** The action row at the end of a sheet's form: a full-width primary button on phones. */
export function SheetActions({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}>{children}</div>;
}

/** A button that opens a Sheet — usable straight from a Server Component page. */
export function SheetLauncher({
  triggerContent,
  triggerVariant = "primary",
  triggerSize = "md",
  triggerClassName,
  ariaLabel,
  title,
  description,
  size,
  children,
}: {
  triggerContent: React.ReactNode;
  triggerVariant?: "primary" | "secondary" | "ghost" | "beacon" | "danger";
  triggerSize?: "sm" | "md" | "lg";
  triggerClassName?: string;
  ariaLabel?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  size?: "md" | "lg";
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        size={triggerSize}
        className={triggerClassName}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {triggerContent}
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={title} description={description} size={size}>
        {children}
      </Sheet>
    </>
  );
}
