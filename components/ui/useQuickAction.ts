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

  function run(
    fn: () => Promise<Result>,
    opts?: {
      /** Called synchronously inside the transition (e.g. a useOptimistic update). */
      optimistic?: () => void;
      undo?: () => Promise<Result>;
      success?: string;
      onDone?: () => void;
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
        toast.success(
          opts?.success ?? r.message ?? "Done",
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
        opts?.onDone?.();
      } catch (e) {
        unstable_rethrow(e);
        toast.error("That didn't work. Check your connection and try again.");
      }
    });
  }

  return { run, pending };
}
