"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { resetMyFamily } from "./actions";

export function ResetFamily() {
  const [val, setVal] = useState("");
  const armed = val.trim().toUpperCase() === "RESET";
  return (
    <Card className="mt-6 border-red-200">
      <div className="flex items-center gap-2 text-red-700">
        <AlertTriangle className="h-5 w-5" />
        <h2 className="text-title">Reset to a fresh start</h2>
      </div>
      <p className="mt-2 text-sm text-muted">
        Permanently erases <strong className="text-ink">every</strong> child, routine, point, reward,
        event, list, message, meal, and calm tool in your family — and clears them from the wall on its
        next sync. Your account and Plus stay. This <strong className="text-ink">cannot be undone</strong>.
      </p>
      <form action={resetMyFamily} className="mt-4 flex flex-wrap items-center gap-3">
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="Type RESET to confirm"
          aria-label="Type RESET to confirm"
          autoComplete="off"
          className="w-56 rounded-xl border border-red-200 bg-white px-3.5 py-2.5 text-ink outline-none transition focus:border-red-400 focus:ring-4 focus:ring-red-100"
        />
        <ResetButton armed={armed} />
      </form>
    </Card>
  );
}

function ResetButton({ armed }: { armed: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={!armed || pending}
      className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-button transition hover:bg-red-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
    >
      {pending ? "Resetting…" : "Reset everything"}
    </button>
  );
}
