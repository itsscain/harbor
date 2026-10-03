"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Check, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

// One app-wide feedback channel. Every action confirms what ACTUALLY happened (success, or the
// real error) in a calm card above the bottom nav — with an optional Undo — instead of a button
// that says "Saved" whether or not anything saved.

type Tone = "success" | "error" | "info";
type ToastAction = { label: string; onClick: () => unknown };
type ToastItem = { id: number; tone: Tone; message: string; action?: ToastAction; duration: number };
type ToastOpts = { action?: ToastAction; duration?: number };

export type ToastApi = {
  success: (message: string, opts?: ToastOpts) => void;
  error: (message: string, opts?: ToastOpts) => void;
  info: (message: string, opts?: ToastOpts) => void;
  dismiss: (id?: number) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

// Outside a provider (marketing/admin) toasts quietly no-op rather than crash a form.
const NOOP: ToastApi = { success: () => {}, error: () => {}, info: () => {}, dismiss: () => {} };

export function useToast(): ToastApi {
  return useContext(ToastContext) ?? NOOP;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id?: number) => {
    setItems((cur) => (id == null ? [] : cur.filter((t) => t.id !== id)));
  }, []);

  const push = useCallback((tone: Tone, message: string, opts?: ToastOpts) => {
    const id = ++nextId.current;
    const duration = opts?.duration ?? (opts?.action || tone === "error" ? 6000 : 3200);
    // Keep at most 3 on screen; newest at the bottom (closest to the thumb).
    setItems((cur) => [...cur.slice(-2), { id, tone, message, action: opts?.action, duration }]);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (m, o) => push("success", m, o),
      error: (m, o) => push("error", m, o),
      info: (m, o) => push("info", m, o),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="toast-host pointer-events-none fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-[90] flex flex-col items-center gap-2 px-4 lg:bottom-6"
      >
        {items.map((t) => (
          <ToastCard key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const ICON = { success: Check, error: AlertCircle, info: Info } as const;

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [hover, setHover] = useState(false);
  useEffect(() => {
    if (hover) return;
    const t = window.setTimeout(onDismiss, item.duration);
    return () => window.clearTimeout(t);
  }, [hover, item.duration, onDismiss]);

  const Icon = ICON[item.tone];
  return (
    <div
      role={item.tone === "error" ? "alert" : "status"}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      className="animate-sheet-up pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-line-strong bg-raised py-2.5 pl-4 pr-2 text-[15px] text-fg shadow-pop"
    >
      <span
        className={cn(
          "grid h-7 w-7 shrink-0 place-items-center rounded-full",
          item.tone === "success" && "bg-good/15 text-good",
          item.tone === "error" && "bg-error/15 text-error",
          item.tone === "info" && "bg-accent/15 text-accent",
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={2.5} />
      </span>
      <p className="min-w-0 flex-1 leading-snug">{item.message}</p>
      {item.action && (
        <button
          type="button"
          onClick={() => {
            onDismiss();
            void item.action!.onClick();
          }}
          className="min-h-10 shrink-0 rounded-lg px-3 font-semibold text-accent transition hover:bg-accent/10"
        >
          {item.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-fg-subtle transition hover:bg-surface-2 hover:text-fg"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
