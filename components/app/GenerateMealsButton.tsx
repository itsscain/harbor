"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { generateMealPlan } from "@/app/app/(parent)/hub-actions";

/** One-tap AI meal-plan generation (fills the week's open dinner slots). */
export function GenerateMealsButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function run() {
    setMsg(null);
    start(async () => {
      const r = await generateMealPlan();
      if (r.ok) {
        const pantry = r.usedPantry ? " from your pantry" : "";
        const groc = r.groceryAdded ? ` · added ${r.groceryAdded} to the grocery list` : "";
        setMsg({ ok: true, text: `Added ${r.added} dinner${r.added === 1 ? "" : "s"}${pantry}${groc}. 🎉` });
      } else setMsg({ ok: false, text: r.error || "Something went wrong — try again." });
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={run}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-xl bg-harbor px-4 py-2.5 text-sm font-semibold text-white shadow-button transition hover:bg-harbor-700 active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {pending ? "Planning the week…" : "Generate dinners with AI"}
      </button>
      {msg && (
        <span className={msg.ok ? "text-sm font-medium text-emerald-700" : "text-sm text-error-ink"}>{msg.text}</span>
      )}
    </div>
  );
}
