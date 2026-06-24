"use client";

import { useState } from "react";
import { Sparkles, Waves } from "lucide-react";
import { generateTides } from "@/app/app/(parent)/hub-actions";
import { Card } from "@/components/ui/primitives";

type Insight = { summary: string; patterns: string[]; suggestion: string; enough_data: boolean };

/** Tides (§9.1.2) — the per-child pattern view. Generates a fresh, plain-language
 *  insight from the child's corner/Anchor + check-in history on demand. */
export function TidesCard({ childId, childName }: { childId: string; childName: string }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [insight, setInsight] = useState<Insight | null>(null);

  async function gen() {
    setLoading(true);
    setErr(null);
    const res = await generateTides(childId);
    setLoading(false);
    if (res.ok) setInsight((res.result as Insight) ?? null);
    else setErr(res.error ?? "Couldn't read the patterns just now.");
  }

  return (
    <Card className="border-water/30 bg-water/[0.04]">
      <div className="flex items-center gap-2 text-harbor">
        <Waves className="h-5 w-5 text-water" />
        <h2 className="text-title">Tides — {childName}&apos;s patterns</h2>
      </div>
      <p className="mt-1 text-sm text-muted">
        Harbor learns {childName}&apos;s rhythms from calm-corner sessions and feelings check-ins, and
        surfaces gentle, useful patterns — when the hard moments tend to come, and one thing that helps.
      </p>

      <button
        onClick={gen}
        disabled={loading}
        className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-water/40 px-3.5 py-2 text-sm font-semibold text-water transition hover:bg-water/10 disabled:opacity-60"
      >
        <Sparkles className="h-4 w-4" /> {loading ? "Reading the tides…" : insight ? "Refresh patterns" : "See patterns"}
      </button>

      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}

      {insight && (
        <div className="mt-3 space-y-3">
          <p className="text-pretty text-sm text-ink">{insight.summary}</p>
          {insight.patterns.length > 0 && (
            <ul className="space-y-1.5">
              {insight.patterns.map((p, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink">
                  <span className="text-water">~</span>
                  <span className="text-pretty">{p}</span>
                </li>
              ))}
            </ul>
          )}
          {insight.enough_data && insight.suggestion && (
            <p className="text-pretty rounded-xl bg-water/10 px-3.5 py-2.5 text-sm text-harbor">💡 Try: {insight.suggestion}</p>
          )}
        </div>
      )}
    </Card>
  );
}
