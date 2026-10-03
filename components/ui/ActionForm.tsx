"use client";

import { createContext, useContext, useRef, useState, useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { useToast } from "./Toast";
import { useSheetClose } from "./Sheet";

// The one way the parent app submits a form. It calls the Server Action itself (so a failure can
// never wipe the page via the error boundary, and the form keeps what you typed), shows the REAL
// outcome in a toast (with optional Undo), and closes the surrounding Sheet on success.
//
// Server Actions should RETURN `{ ok: false, error: "plain words" }` for expected problems (Next
// hides thrown messages in production). Anything thrown is caught here with a friendly fallback.

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string } | void | null | undefined;

type Status = { kind: "idle" } | { kind: "ok"; at: number } | { kind: "error"; message: string; at: number };
type Ctx = { pending: boolean; status: Status };

const ActionFormContext = createContext<Ctx | null>(null);

/** Pending + last result of the nearest ActionForm (null when not inside one). */
export function useActionForm(): Ctx | null {
  return useContext(ActionFormContext);
}

function isFailure(r: unknown): r is { ok: false; error: string } {
  return !!r && typeof r === "object" && "ok" in r && (r as { ok: unknown }).ok === false;
}

export function ActionForm({
  action,
  success = "Saved",
  errorMessage = "That didn't save. Check your connection and try again.",
  undo,
  onSuccess,
  resetOnSuccess = false,
  closeOnSuccess = true,
  className,
  children,
  ...rest
}: Omit<React.FormHTMLAttributes<HTMLFormElement>, "action" | "onSubmit"> & {
  /** A Server Action (optionally `.bind(null, id)`-bound) that takes the form's FormData. */
  action: (formData: FormData) => Promise<unknown>;
  /** Toast copy on success; a function receives the action's result; `false` = no toast. */
  success?: string | false | ((result: unknown) => string | false);
  /** Fallback copy when the action throws (its real message is hidden in production). */
  errorMessage?: string;
  /** Adds an "Undo" button to the success toast. */
  undo?: { label?: string; run: () => unknown };
  onSuccess?: (result: unknown) => void;
  /** Clear the fields after a successful save (for quick-add rows). */
  resetOnSuccess?: boolean;
  /** Close the enclosing Sheet after a successful save (default true; no-op outside a Sheet). */
  closeOnSuccess?: boolean;
  children: React.ReactNode;
}) {
  const toast = useToast();
  const closeSheet = useSheetClose();
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [, startTransition] = useTransition();
  const inFlight = useRef(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    // The browser has already run required/type validation by the time submit fires, so an
    // invalid form never reaches here — no "dead button" latch.
    e.preventDefault();
    if (inFlight.current) return; // a double-tap can never submit twice
    const form = e.currentTarget;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const fd = submitter ? new FormData(form, submitter) : new FormData(form);
    inFlight.current = true;
    setPending(true);
    startTransition(async () => {
      try {
        const result = await action(fd);
        if (isFailure(result)) {
          setStatus({ kind: "error", message: result.error, at: Date.now() });
          toast.error(result.error);
          return;
        }
        setStatus({ kind: "ok", at: Date.now() });
        const msg =
          typeof success === "function"
            ? success(result)
            : result && typeof result === "object" && "message" in result && typeof (result as { message?: unknown }).message === "string"
              ? (result as { message: string }).message
              : success;
        if (msg) toast.success(msg, undo ? { action: { label: undo.label ?? "Undo", onClick: undo.run } } : undefined);
        if (resetOnSuccess) form.reset();
        onSuccess?.(result);
        if (closeOnSuccess) closeSheet?.();
      } catch (err) {
        unstable_rethrow(err); // let redirect() / notFound() do their job
        setStatus({ kind: "error", message: errorMessage, at: Date.now() });
        toast.error(errorMessage);
      } finally {
        inFlight.current = false;
        setPending(false);
      }
    });
  }

  return (
    <ActionFormContext.Provider value={{ pending, status }}>
      <form {...rest} onSubmit={onSubmit} className={className} aria-busy={pending || undefined}>
        {children}
      </form>
    </ActionFormContext.Provider>
  );
}

/** Inline error under a form, for the most recent failed save (pairs with the toast). */
export function FormError({ className }: { className?: string }) {
  const ctx = useActionForm();
  if (!ctx || ctx.status.kind !== "error") return null;
  return (
    <p role="alert" className={className ?? "rounded-xl bg-error/10 px-3 py-2 text-sm text-error"}>
      {ctx.status.message}
    </p>
  );
}
