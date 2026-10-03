"use client";

import { useOptimistic, useState } from "react";
import { ArrowDown, ArrowUp, ChevronRight, Plus, Sparkles } from "lucide-react";
import { Sheet, SheetActions, useSheetClose } from "@/components/ui/Sheet";
import { ActionForm, FormError } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { EmojiPicker } from "@/components/ui/EmojiPicker";
import { Button, Field, Input } from "@/components/ui/primitives";
import { useQuickAction } from "@/components/ui/useQuickAction";
import { saveRule, moveRule, deleteRuleSoft, restoreRule, addStarterRules } from "@/app/app/(parent)/rules/rules-actions";

export type Rule = { id: string; kind: "rule" | "consequence"; title: string; detail: string | null; emoji: string | null };
type Editing = { kind: "rule" | "consequence"; rule: Rule | null; index: number; count: number } | null;

export function RulesView({ rules }: { rules: Rule[] }) {
  const { run, pending } = useQuickAction();
  const [editing, setEditing] = useState<Editing>(null);
  const [gone, hide] = useOptimistic<string[], string>([], (cur, id) => [...cur, id]);
  const list = (kind: Rule["kind"]) => rules.filter((r) => r.kind === kind && !gone.includes(r.id));

  if (rules.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line-strong p-6 text-center">
        <p className="text-3xl" aria-hidden>
          📜
        </p>
        <p className="mt-1 font-semibold text-fg">No house rules yet</p>
        <p className="mx-auto mt-0.5 max-w-sm text-sm text-fg-muted">A few clear rules on the wall — and calm, predictable steps if one is broken.</p>
        <div className="mt-4 flex flex-col items-center gap-2">
          <Button disabled={pending} onClick={() => run(() => addStarterRules())}>
            <Sparkles className="h-4 w-4" /> Start with ours
          </Button>
          <button type="button" onClick={() => setEditing({ kind: "rule", rule: null, index: 0, count: 0 })} className="min-h-10 text-sm font-semibold text-accent">
            Write my own
          </button>
        </div>
        <Sheet open={!!editing} onClose={() => setEditing(null)} title="Add a rule">
          {editing && <RuleForm editing={editing} onDelete={hide} />}
        </Sheet>
      </div>
    );
  }

  const section = (kind: Rule["kind"], title: string, sub: string) => {
    const items = list(kind);
    return (
      <section className="mb-7">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2 className="text-title text-fg">{title}</h2>
          <Button size="sm" variant="secondary" onClick={() => setEditing({ kind, rule: null, index: items.length, count: items.length })}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        <p className="mb-3 text-sm text-fg-muted">{sub}</p>
        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line-strong px-4 py-4 text-sm text-fg-muted">Nothing here yet.</p>
        ) : (
          <ol className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {items.map((r, i) => (
              <li key={r.id}>
                <button type="button" onClick={() => setEditing({ kind, rule: r, index: i, count: items.length })} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2">
                  {kind === "consequence" && <span className="w-5 shrink-0 text-center text-sm font-bold tabular-nums text-fg-subtle">{i + 1}</span>}
                  <span className="text-2xl leading-none" aria-hidden>
                    {r.emoji ?? (kind === "rule" ? "⭐" : "➡️")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-fg">{r.title}</span>
                    {r.detail && <span className="block truncate text-sm text-fg-muted">{r.detail}</span>}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>
    );
  };

  return (
    <>
      {section("rule", "Our rules", "Short and positive works best — say what to do.")}
      {section("consequence", "If a rule is broken", "The same calm steps every time, in order.")}
      <Sheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.rule ? (editing.kind === "rule" ? "Edit rule" : "Edit step") : editing?.kind === "rule" ? "Add a rule" : "Add a step"}
      >
        {editing && <RuleForm key={editing.rule?.id ?? `new:${editing.kind}`} editing={editing} onDelete={hide} />}
      </Sheet>
    </>
  );
}

function RuleForm({ editing, onDelete }: { editing: NonNullable<Editing>; onDelete: (id: string) => void }) {
  const close = useSheetClose();
  const { run, pending } = useQuickAction();
  const { kind, rule, index, count } = editing;
  return (
    <ActionForm action={saveRule.bind(null, rule?.id ?? null, kind)} className="space-y-5">
      <div className="flex items-end gap-3">
        <EmojiPicker name="emoji" defaultValue={rule?.emoji ?? (kind === "rule" ? "💛" : "💬")} label="Picture" />
        <Field label={kind === "rule" ? "Rule" : "What happens"} htmlFor="hr-title" className="flex-1">
          <Input id="hr-title" name="title" required maxLength={80} defaultValue={rule?.title ?? ""} placeholder={kind === "rule" ? "Be kind with words and hands" : "Gentle reminder"} data-autofocus />
        </Field>
      </div>
      <Field label="A few more words (optional)" htmlFor="hr-detail">
        <Input id="hr-detail" name="detail" maxLength={200} defaultValue={rule?.detail ?? ""} placeholder={kind === "rule" ? "We use gentle hands and kind words." : "A calm heads-up about the choice."} />
      </Field>
      {rule && count > 1 && (
        <div className="flex gap-2">
          <Button type="button" variant="secondary" disabled={pending || index === 0} onClick={() => run(() => moveRule(rule.id, "up"), { onDone: () => close?.() })}>
            <ArrowUp className="h-4 w-4" /> Move up
          </Button>
          <Button type="button" variant="secondary" disabled={pending || index === count - 1} onClick={() => run(() => moveRule(rule.id, "down"), { onDone: () => close?.() })}>
            <ArrowDown className="h-4 w-4" /> Move down
          </Button>
        </div>
      )}
      <FormError />
      <SheetActions className={rule ? "sm:justify-between" : undefined}>
        {rule && (
          <Button
            type="button"
            variant="ghost"
            className="text-error"
            disabled={pending}
            onClick={() => run(() => deleteRuleSoft(rule.id), { optimistic: () => onDelete(rule.id), undo: () => restoreRule(rule.id), onDone: () => close?.() })}
          >
            Remove
          </Button>
        )}
        <SubmitButton size="lg" className={rule ? undefined : "w-full sm:w-auto"} confirmSaved={false}>
          {rule ? "Save" : "Add"}
        </SubmitButton>
      </SheetActions>
    </ActionForm>
  );
}
