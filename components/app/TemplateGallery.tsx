import { Sparkles, Trash2 } from "lucide-react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmit } from "@/components/ui/ConfirmSubmit";
import { Badge } from "@/components/ui/primitives";
import { addRoutineFromLibraryTemplate, deleteRoutineTemplate } from "@/app/app/(parent)/actions";

export type LibraryTemplate = {
  id: string;
  name: string;
  emoji: string | null;
  description: string | null;
  need_tags: string[] | null;
  household_id: string | null;
  content: unknown;
};

function stepCount(content: unknown): number {
  const c = (content ?? {}) as { steps?: unknown[] };
  return Array.isArray(c.steps) ? c.steps.length : 0;
}

/** The curated + saved routine templates as a calm gallery of cards (§9). Tapping "Use"
 *  builds the routine + its steps for this child. Household-saved ones can be removed. */
export function TemplateGallery({ templates, childId }: { templates: LibraryTemplate[]; childId: string }) {
  if (templates.length === 0) {
    return <p className="text-sm text-fg-muted">No templates yet — build a routine below and save it as one.</p>;
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
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
                {t.description && <p className="mt-0.5 text-xs text-fg-muted">{t.description}</p>}
              </div>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-fg-muted">{n} {n === 1 ? "step" : "steps"}</span>
              {(t.need_tags ?? []).slice(0, 3).map((tag) => (
                <Badge key={tag} tone="neutral">{tag}</Badge>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2.5">
              <form action={addRoutineFromLibraryTemplate.bind(null, childId)}>
                <input type="hidden" name="template_id" value={t.id} />
                <SubmitButton size="sm" variant="beacon" savedText="Added ✓">
                  <Sparkles className="h-4 w-4" /> Use this
                </SubmitButton>
              </form>
              {saved && (
                <form action={deleteRoutineTemplate.bind(null, t.id, childId)}>
                  <ConfirmSubmit
                    message={`Remove your "${t.name}" template? (Routines already created keep working.)`}
                    aria-label={`Delete ${t.name} template`}
                    className="px-2 py-1.5 text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </ConfirmSubmit>
                </form>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
