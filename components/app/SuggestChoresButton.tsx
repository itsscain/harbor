"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { suggestChores } from "@/app/app/(parent)/hub-actions";

/** One-tap AI chore suggestions for a child (age-aware). Adds them to the list. */
export function SuggestChoresButton({ childId }: { childId: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function run() {
    setMsg(null);
    start(async () => {
      const r = await suggestChores(childId);
      if (r.ok) setMsg({ ok: true, text: `Added ${r.added} chore${r.added === 1 ? "" : "s"} — keep or remove any. ✨` });
      else setMsg({ ok: false, text: r.error ?? "Something went wrong — try again." });
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/[0.06] px-3.5 py-2 text-sm font-semibold text-accent transition hover:bg-accent/10 active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {pending ? "Thinking…" : "Suggest chores with AI"}
      </button>
      {msg && <span className={msg.ok ? "text-sm font-medium text-good" : "text-sm text-error"}>{msg.text}</span>}
    </div>
  );
}
