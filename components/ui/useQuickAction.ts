"use client";

import { useTransition } from "react";
import { unstable_rethrow } from "next/navigation";
import { useToast } from "./Toast";

type Result = { ok: true; message?: string } | { ok: false; error: string };

/**
 * Run a one-tap Server Action (Approve, Mark given, +5 stars…) with honest feedback: the toast
 * says what actually happened, failures show the real reason, and an optional Undo calls the
 * inverse action. Wrap optimistic UI updates in the same transition via `run(fn, { optimistic })`.
 */
export function useQuickAction() {
  const toast = useToast();
  const [pending, start] = useTransition();

  function run<R extends Result>(
    fn: () => Promise<R>,
    opts?: {
      /** Called synchronously inside the transition (e.g. a useOptimistic update). */
      optimistic?: () => void;
      undo?: () => Promise<Result>;
      /** Toast copy; `false` = no toast (e.g. when navigating away). */
      success?: string | false;
      /** Receives the successful result (e.g. a new row's id to navigate to). */
      onDone?: (result: Extract<R, { ok: true }>) => void;
    },
  ) {
    start(async () => {
      opts?.optimistic?.();
      try {
        const r = await fn();
        if (!r.ok) {
          toast.error(r.error);
          return;
        }
        const undo = opts?.undo;
        const copy = opts?.success === false ? null : (opts?.success ?? r.message ?? "Done");
        if (copy) toast.success(
          copy,
          undo
            ? {
                action: {
                  label: "Undo",
                  onClick: async () => {
                    try {
                      const u = await undo();
                      if (!u.ok) toast.error(u.error);
                    } catch {
                      toast.error("Couldn't undo that.");
                    }
                  },
                },
              }
            : undefined,
        );
        opts?.onDone?.(r as Extract<R, { ok: true }>);
      } catch (e) {
        unstable_rethrow(e);
        toast.error("That didn't work. Check your connection and try again.");
      }
    });
  }

  return { run, pending };
}
