"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { generateInsight } from "@/app/app/(parent)/hub-actions";

/** On-demand AI summary of the family's recent rhythm (only spends when clicked). */
export function AiInsightCard() {
  const [pending, start] = useTransition();
  const [text, setText] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function run() {
    setErr(null);
    start(async () => {
      const r = await generateInsight();
      if (r.ok) setText(r.text ?? "");
      else setErr(r.error ?? "Something went wrong.");
    });
  }

  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/[0.04] p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-accent" />
        <h2 className="text-title text-fg">AI summary</h2>
      </div>
      {text ? (
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-fg">{text}</p>
      ) : (
        <p className="mt-2 text-sm text-fg-muted">
          Let Harbor read the last two weeks and share what&apos;s going well plus a gentle suggestion or two.
        </p>
      )}
      {err && <p className="mt-2 text-sm text-error">{err}</p>}
      <button
        onClick={run}
        disabled={pending}
        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg shadow-button transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {pending ? "Reading the week…" : text ? "Refresh summary" : "Generate AI summary"}
      </button>
    </div>
  );
}
