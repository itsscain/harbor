"use client";

import { useOptimistic, useState } from "react";
import { ChevronRight, Plus, Sparkles, X } from "lucide-react";
import { Sheet, SheetActions, useSheetClose } from "@/components/ui/Sheet";
import { ActionForm, FormError } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ChipGroup } from "@/components/ui/Chips";
import { Stepper } from "@/components/ui/Stepper";
import { Toggle } from "@/components/ui/Toggle";
import { Button, Field, Input, Textarea } from "@/components/ui/primitives";
import { useQuickAction } from "@/components/ui/useQuickAction";
import { saveCalmTool, setCalmToolEnabled, addCalmTool, addAllCalmTools, deleteCalmToolSoft, restoreCalmTool } from "@/app/app/(parent)/calm/calm-actions";

export type CalmTool = { id: string; type: string; enabled: boolean; config: Record<string, unknown> };

const META: Record<string, { emoji: string; name: string; blurb: string }> = {
  breathing: { emoji: "🫁", name: "Breathing", blurb: "A slow, guided breath" },
  feelings: { emoji: "😊", name: "Feelings check-in", blurb: "Tap how you feel" },
  break: { emoji: "⏳", name: "Break timer", blurb: "A short, calm break" },
  social_story: { emoji: "📖", name: "Calming story", blurb: "A short picture story" },
};
const FEELINGS = [
  { value: "happy", label: "Happy", emoji: "😊" },
  { value: "calm", label: "Calm", emoji: "😌" },
  { value: "sad", label: "Sad", emoji: "😢" },
  { value: "angry", label: "Angry", emoji: "😠" },
  { value: "worried", label: "Worried", emoji: "😟" },
  { value: "tired", label: "Tired", emoji: "😴" },
  { value: "silly", label: "Silly", emoji: "🤪" },
  { value: "excited", label: "Excited", emoji: "🤩" },
];

function summary(t: CalmTool): string {
  const c = t.config;
  if (t.type === "breathing") return `${Number(c.rounds ?? 4)} slow breaths · ${c.pattern === "4-4-4" ? "even" : "relaxing"} rhythm`;
  if (t.type === "feelings") return `${Array.isArray(c.options) ? c.options.length : 6} feelings to tap`;
  if (t.type === "break") return `${Number(c.minutes ?? 5)} minutes`;
  if (t.type === "social_story") return String(c.title ?? "A calm story");
  return META[t.type]?.blurb ?? "";
}

export function CalmToolsView({ tools }: { tools: CalmTool[] }) {
  const { run, pending } = useQuickAction();
  const [editing, setEditing] = useState<CalmTool | null>(null);
  const [gone, hide] = useOptimistic<string[], string>([], (cur, id) => [...cur, id]);
  const [enabled, setEnabled] = useOptimistic<Record<string, boolean>, [string, boolean]>({}, (cur, [id, v]) => ({ ...cur, [id]: v }));
  const shown = tools.filter((t) => !gone.includes(t.id));
  const missing = Object.keys(META).filter((k) => !shown.some((t) => t.type === k));

  return (
    <>
      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong p-6 text-center">
          <p className="text-3xl" aria-hidden>
            🫧
          </p>
          <p className="mt-1 font-semibold text-fg">No calm tools yet</p>
          <p className="mx-auto mt-0.5 max-w-sm text-sm text-fg-muted">Breathing, a feelings check-in, a break timer and a calming story — kids can reach them any time on the wall.</p>
          <Button className="mt-4" disabled={pending} onClick={() => run(() => addAllCalmTools())}>
            <Sparkles className="h-4 w-4" /> Add all four
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {shown.map((t) => {
            const on = enabled[t.id] ?? t.enabled;
            return (
              <li key={t.id} className="flex items-center">
                <button type="button" onClick={() => setEditing(t)} className="flex min-h-16 min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2">
                  <span className="text-2xl leading-none" aria-hidden>
                    {META[t.type]?.emoji ?? "🫧"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-fg">{META[t.type]?.name ?? t.type}</span>
                    <span className="block truncate text-sm text-fg-muted">{on ? summary(t) : "Hidden from the wall"}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
                </button>
                <div className="shrink-0 pr-4">
                  <Toggle
                    compact
                    checked={on}
                    onChange={(v) => run(() => setCalmToolEnabled(t.id, v), { optimistic: () => setEnabled([t.id, v]) })}
                    label={`Show ${META[t.type]?.name ?? "this tool"} on the wall`}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {shown.length > 0 && missing.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold text-fg-muted">Add another</p>
          <div className="flex flex-wrap gap-2">
            {missing.map((k) => (
              <button
                key={k}
                type="button"
                disabled={pending}
                onClick={() => run(() => addCalmTool(k))}
                className="tap inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-[15px] font-semibold text-fg transition hover:border-accent/50 disabled:opacity-60"
              >
                <Plus className="h-4 w-4" /> {META[k].emoji} {META[k].name}
              </button>
            ))}
          </div>
        </div>
      )}

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing ? (META[editing.type]?.name ?? "Calm tool") : ""}>
        {editing && <ToolForm key={editing.id} tool={editing} onDelete={hide} />}
      </Sheet>
    </>
  );
}

function ToolForm({ tool, onDelete }: { tool: CalmTool; onDelete: (id: string) => void }) {
  const close = useSheetClose();
  const { run, pending } = useQuickAction();
  const [on, setOn] = useState(tool.enabled);
  const c = tool.config;
  const [pages, setPages] = useState<string[]>(Array.isArray(c.pages) ? (c.pages as string[]) : [""]);
  const known = new Set(FEELINGS.map((f) => f.value));
  const custom = (Array.isArray(c.options) ? (c.options as string[]) : []).filter((o) => !known.has(o));

  return (
    <ActionForm action={saveCalmTool.bind(null, tool.id)} className="space-y-5">
      {tool.type === "breathing" && (
        <>
          <Field label="Rhythm">
            <ChipGroup
              name="pattern"
              defaultValue={c.pattern === "4-4-4" ? "4-4-4" : "4-7-8"}
              options={[
                { value: "4-7-8", label: "Relaxing (long breath out)" },
                { value: "4-4-4", label: "Even (in, hold, out)" },
              ]}
            />
          </Field>
          <Field label="How many breaths">
            <Stepper name="rounds" defaultValue={Number(c.rounds ?? 4)} min={1} max={12} presets={[3, 4, 6]} label="Breaths" />
          </Field>
        </>
      )}
      {tool.type === "break" && (
        <Field label="How long">
          <Stepper name="minutes" defaultValue={Number(c.minutes ?? 5)} min={1} max={30} presets={[2, 5, 10]} suffix="min" label="Minutes" />
        </Field>
      )}
      {tool.type === "feelings" && (
        <Field label="Feelings kids can tap">
          <ChipGroup name="options" multiple defaultValue={Array.isArray(c.options) ? (c.options as string[]) : ["happy", "calm", "sad", "angry", "worried", "tired"]} options={FEELINGS} />
          {custom.map((o) => (
            <input key={o} type="hidden" name="options" value={o} />
          ))}
        </Field>
      )}
      {tool.type === "social_story" && (
        <>
          <Field label="Story title" htmlFor="ss-title">
            <Input id="ss-title" name="title" maxLength={60} defaultValue={String(c.title ?? "")} placeholder="Going to the doctor" />
          </Field>
          <Field label="Pages" hint="One short sentence per page works best.">
            <div className="space-y-2">
              {pages.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <Textarea name="page" value={p} onChange={(e) => setPages((cur) => cur.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Page ${i + 1}`} className="min-h-14 flex-1" />
                  {pages.length > 1 && (
                    <button type="button" aria-label={`Remove page ${i + 1}`} onClick={() => setPages((cur) => cur.filter((_, j) => j !== i))} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-fg-subtle hover:text-error">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {pages.length < 12 && (
                <button type="button" onClick={() => setPages((cur) => [...cur, ""])} className="min-h-10 text-sm font-semibold text-accent">
                  + Add a page
                </button>
              )}
            </div>
          </Field>
        </>
      )}
      <div className="rounded-xl border border-line px-3.5">
        <Toggle checked={on} onChange={setOn} name="enabled" label="Show on the wall" />
      </div>
      <FormError />
      <SheetActions className="sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          className="text-error"
          disabled={pending}
          onClick={() => run(() => deleteCalmToolSoft(tool.id), { optimistic: () => onDelete(tool.id), undo: () => restoreCalmTool(tool.id), onDone: () => close?.() })}
        >
          Remove
        </Button>
        <SubmitButton size="lg" confirmSaved={false}>
          Save
        </SubmitButton>
      </SheetActions>
    </ActionForm>
  );
}
