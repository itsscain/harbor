"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOptimistic } from "react";
import { Plus, Loader2, X } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button, Input } from "@/components/ui/primitives";
import { useQuickAction } from "@/components/ui/useQuickAction";
import { routineEmoji } from "@/lib/routine-emoji";
import { createRoutineFromTemplate, copyRoutineToKid, createBlankRoutine, deleteSavedTemplate, restoreSavedTemplate } from "@/app/app/(parent)/children/kid-actions";
import type { TemplateCard } from "@/lib/kid";

type Sibling = { id: string; name: string; routines: { id: string; name: string; emoji: string; steps: number }[] };

/** "Add a routine" — pick a ready-made one, copy a sibling's, or start blank. Every path lands
 *  in the routine's editor, so there's never a half-made routine hiding somewhere. */
export function AddRoutineSheet({
  kidId,
  kidName,
  templates,
  siblings,
  autoOpen = false,
  variant = "primary",
}: {
  kidId: string;
  kidName: string;
  templates: TemplateCard[];
  siblings: Sibling[];
  autoOpen?: boolean;
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const { run, pending } = useQuickAction();
  const [open, setOpen] = useState(autoOpen);
  const [tapped, setTapped] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [gone, hide] = useOptimistic<string[], string>([], (cur, id) => [...cur, id]);
  const [prevAuto, setPrevAuto] = useState(autoOpen);
  if (autoOpen !== prevAuto) {
    setPrevAuto(autoOpen);
    if (autoOpen) setOpen(true);
  }
  const busy = pending ? tapped : null;

  const go = (key: string, fn: () => Promise<{ ok: true; id?: string; message?: string } | { ok: false; error: string }>) => {
    setTapped(key);
    run(fn, {
      onDone: (r) => {
        setOpen(false);
        if (r.id) router.push(`/app/children/${kidId}/routines/${r.id}`);
      },
    });
  };

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add a routine
      </Button>
      <Sheet open={open} onClose={() => setOpen(false)} title={`Add a routine for ${kidName}`} description="Pick one to start from — you can change every step." size="lg">
        <div className="space-y-6 pb-2">
          <section>
            <h3 className="text-eyebrow mb-2 text-fg-muted">Ready-made</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {templates
                .filter((t) => !gone.includes(t.id))
                .map((t) => (
                  <div key={t.id} className="relative">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => go(t.id, () => createRoutineFromTemplate(kidId, t.id))}
                      className="tap flex min-h-[4.5rem] w-full items-start gap-3 rounded-2xl border border-line bg-surface-2/50 p-3.5 pr-11 text-left transition hover:border-accent/50 hover:bg-surface-2 active:scale-[0.98] disabled:opacity-60"
                    >
                      <span className="text-2xl leading-none" aria-hidden>
                        {busy === t.id ? <Loader2 className="h-6 w-6 animate-spin text-accent" /> : (t.emoji ?? routineEmoji({ name: t.name }))}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 font-semibold text-fg">
                          {t.name}
                          {t.saved && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-bold text-accent">Yours</span>}
                        </span>
                        {t.description && <span className="mt-0.5 line-clamp-2 block text-sm leading-snug text-fg-muted">{t.description}</span>}
                        {t.steps.length > 0 && (
                          <span className="mt-1.5 block truncate text-base tracking-wide" aria-label={`${t.steps.length} steps`}>
                            {t.steps.map((s) => s.icon ?? "•").join(" ")}
                          </span>
                        )}
                      </span>
                    </button>
                    {t.saved && (
                      <button
                        type="button"
                        aria-label={`Remove the ${t.name} template`}
                        onClick={() => run(() => deleteSavedTemplate(t.id), { optimistic: () => hide(t.id), undo: () => restoreSavedTemplate(t.id) })}
                        className="absolute right-1.5 top-1.5 grid h-9 w-9 place-items-center rounded-full text-fg-subtle transition hover:bg-surface hover:text-error"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </section>

          {siblings.length > 0 && (
            <section>
              <h3 className="text-eyebrow mb-2 text-fg-muted">Copy from a sibling</h3>
              <div className="space-y-3">
                {siblings.map((s) => (
                  <div key={s.id}>
                    <p className="mb-1.5 text-sm font-semibold text-fg">{s.name}&apos;s routines</p>
                    <div className="flex flex-wrap gap-2">
                      {s.routines.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          disabled={pending}
                          onClick={() => go(r.id, () => copyRoutineToKid(r.id, kidId))}
                          className="tap inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-semibold text-fg transition hover:border-accent/50 disabled:opacity-60"
                        >
                          {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <span aria-hidden>{r.emoji}</span>}
                          {r.name}
                          <span className="font-normal text-fg-muted">· {r.steps} steps</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="text-eyebrow mb-2 text-fg-muted">Start from scratch</h3>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!name.trim() || pending) return;
                go("blank", () => createBlankRoutine(kidId, name));
              }}
            >
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Name it, like “Saturday chores”" aria-label="Routine name" className="min-w-0 flex-1" />
              <Button type="submit" disabled={!name.trim() || pending}>
                {busy === "blank" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
              </Button>
            </form>
          </section>
        </div>
      </Sheet>
    </>
  );
}
