"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Select, Badge } from "@/components/ui/primitives";
import { applyTemplate } from "@/app/app/(parent)/actions";
import type { LibraryTemplate } from "./TemplateGallery";

function stepCount(content: unknown): number {
  const c = (content ?? {}) as { steps?: unknown[] };
  return Array.isArray(c.steps) ? c.steps.length : 0;
}

/** The Routines-hub template catalog (§12/§15): pick a child once, then add any curated or
 *  saved template to them in a tap. A calm, browsable gallery — the "start fast" surface. */
export function TemplateApplyHub({
  templates,
  children,
}: {
  templates: LibraryTemplate[];
  children: { id: string; name: string }[];
}) {
  const [childId, setChildId] = useState(children[0]?.id ?? "");

  if (children.length === 0) {
    return <p className="text-sm text-fg-muted">Add a child first — then you can start them from a template.</p>;
  }

  return (
    <div>
      <label className="mb-3 flex flex-wrap items-center gap-2 text-sm font-medium text-fg">
        Add a template to
        <Select value={childId} onChange={(e) => setChildId(e.target.value)} className="w-auto min-w-40 py-2">
          {children.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => {
          const n = stepCount(t.content);
          const saved = t.household_id != null;
          return (
            <div key={t.id} className="flex flex-col rounded-xl border border-line bg-surface p-3.5 transition hover:border-accent/40 hover:shadow-card">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-2xl">{t.emoji ?? "📋"}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="truncate font-bold text-fg">{t.name}</h4>
                    {saved && <Badge tone="beacon">Yours</Badge>}
                  </div>
                  {t.description && <p className="mt-0.5 line-clamp-2 text-xs text-fg-muted">{t.description}</p>}
                </div>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold text-fg-muted">{n} {n === 1 ? "step" : "steps"}</span>
                {(t.need_tags ?? []).slice(0, 2).map((tag) => (
                  <Badge key={tag} tone="neutral">{tag}</Badge>
                ))}
              </div>
              <form action={applyTemplate} className="mt-3 border-t border-line pt-2.5">
                <input type="hidden" name="child_id" value={childId} />
                <input type="hidden" name="template_id" value={t.id} />
                <SubmitButton size="sm" variant="beacon" savedText="Added ✓">
                  <Sparkles className="h-4 w-4" /> Use this
                </SubmitButton>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
