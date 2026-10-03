"use client";

import { useOptimistic, useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { Sheet, SheetActions } from "@/components/ui/Sheet";
import { Button, Input } from "@/components/ui/primitives";
import { useQuickAction } from "@/components/ui/useQuickAction";
import { addListItems, setListItemChecked, renameListItem, deleteListItems, restoreListItems } from "@/app/app/(parent)/plan/plan-actions";
import { cn } from "@/lib/cn";

export type ListItem = { id: string; name: string; checked: boolean; addedBy: string | null };

type Op = { t: "add"; items: ListItem[] } | { t: "check"; id: string; checked: boolean } | { t: "remove"; ids: string[] } | { t: "rename"; id: string; name: string };

/** One shared list (Groceries or the wall's To-do). Add several at once with commas; check off
 *  in a tap; remove with Undo. Everything shows on the wall within a second. */
export function FamilyList({ kind, items }: { kind: "grocery" | "todo"; items: ListItem[] }) {
  const { run } = useQuickAction();
  const [text, setText] = useState("");
  const [renaming, setRenaming] = useState<ListItem | null>(null);
  const [name, setName] = useState("");
  const [list, apply] = useOptimistic<ListItem[], Op>(items, (cur, op) => {
    switch (op.t) {
      case "add":
        return [...cur, ...op.items];
      case "check":
        return cur.map((i) => (i.id === op.id ? { ...i, checked: op.checked } : i));
      case "remove":
        return cur.filter((i) => !op.ids.includes(i.id));
      case "rename":
        return cur.map((i) => (i.id === op.id ? { ...i, name: op.name } : i));
    }
  });
  const open = list.filter((i) => !i.checked);
  const done = list.filter((i) => i.checked);
  const noun = kind === "grocery" ? "item" : "to-do";

  const add = () => {
    const t = text.trim();
    if (!t) return;
    const temps = t
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((n, i) => ({ id: `temp-${Date.now()}-${i}`, name: n, checked: false, addedBy: "Phone" }));
    setText("");
    run(() => addListItems(kind, t), { optimistic: () => apply({ t: "add", items: temps }) });
  };
  const toggle = (i: ListItem) => {
    if (i.id.startsWith("temp-")) return;
    run(() => setListItemChecked(i.id, !i.checked), { optimistic: () => apply({ t: "check", id: i.id, checked: !i.checked }), success: false });
  };
  const remove = (ids: string[], label: string) =>
    run(() => deleteListItems(ids), { optimistic: () => apply({ t: "remove", ids }), undo: () => restoreListItems(ids), success: label });

  const row = (i: ListItem) => {
    const temp = i.id.startsWith("temp-");
    return (
      <li key={i.id} className={cn("flex items-center", temp && "opacity-60")}>
        <button
          type="button"
          onClick={() => toggle(i)}
          aria-label={i.checked ? `Uncheck ${i.name}` : `Check off ${i.name}`}
          className="grid h-14 w-14 shrink-0 place-items-center"
        >
          <span
            className={cn(
              "grid h-6 w-6 place-items-center rounded-full border-2 transition",
              i.checked ? "border-good bg-good text-white" : "border-line-strong text-transparent hover:border-good",
            )}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
        </button>
        <button
          type="button"
          disabled={temp}
          onClick={() => {
            setRenaming(i);
            setName(i.name);
          }}
          className="min-h-14 min-w-0 flex-1 py-2 text-left"
        >
          <span className={cn("block truncate text-[15px]", i.checked ? "text-fg-muted line-through" : "font-medium text-fg")}>{i.name}</span>
          {i.addedBy && i.addedBy !== "Phone" && <span className="block text-xs text-fg-subtle">Added on the {i.addedBy.toLowerCase()}</span>}
        </button>
        <button
          type="button"
          disabled={temp}
          onClick={() => remove([i.id], `Removed ${i.name}`)}
          aria-label={`Remove ${i.name}`}
          className="grid h-14 w-12 shrink-0 place-items-center text-fg-subtle transition hover:text-error"
        >
          <X className="h-4 w-4" />
        </button>
      </li>
    );
  };

  return (
    <>
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={400}
          placeholder={kind === "grocery" ? "Milk, eggs, bananas…" : "Add a to-do…"}
          aria-label={`Add ${noun}s`}
          className="min-w-0 flex-1"
        />
        <Button type="submit" disabled={!text.trim()}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </form>

      {open.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong p-6 text-center">
          <p className="text-2xl" aria-hidden>
            {kind === "grocery" ? "🛒" : "✅"}
          </p>
          <p className="mt-1 font-semibold text-fg">{done.length ? "All done!" : "Nothing on the list"}</p>
          <p className="mt-0.5 text-sm text-fg-muted">Add a few at once with commas. The wall shows it right away.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">{open.map(row)}</ul>
      )}

      {done.length > 0 && (
        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-fg-muted">
              {kind === "grocery" ? "Got it" : "Done"} · {done.length}
            </h2>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                remove(
                  done.map((i) => i.id),
                  `Cleared ${done.length} ${done.length === 1 ? noun : `${noun}s`}`,
                )
              }
            >
              Clear
            </Button>
          </div>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface/60">{done.map(row)}</ul>
        </section>
      )}

      <Sheet open={!!renaming} onClose={() => setRenaming(null)} title={kind === "grocery" ? "Edit item" : "Edit to-do"}>
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            const r = renaming;
            const n = name.trim();
            if (!r || !n) return;
            setRenaming(null);
            if (n !== r.name) run(() => renameListItem(r.id, n), { optimistic: () => apply({ t: "rename", id: r.id, name: n }) });
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} aria-label="Name" data-autofocus />
          <SheetActions className="sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="text-error"
              onClick={() => {
                const r = renaming;
                setRenaming(null);
                if (r) remove([r.id], `Removed ${r.name}`);
              }}
            >
              Remove
            </Button>
            <Button type="submit" size="lg" disabled={!name.trim()}>
              Save
            </Button>
          </SheetActions>
        </form>
      </Sheet>
    </>
  );
}
