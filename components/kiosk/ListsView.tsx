"use client";

import { useState } from "react";
import { Plus, Check, ShoppingCart, ListTodo } from "lucide-react";
import type { useKiosk } from "./useKiosk";
import { KCard, KButton, KEyebrow } from "./ui";
import { cn } from "@/lib/cn";

type Kiosk = ReturnType<typeof useKiosk>;
type Kind = "grocery" | "todo";

const KINDS: { key: Kind; label: string; icon: typeof ShoppingCart; empty: string; placeholder: string }[] = [
  { key: "grocery", label: "Groceries", icon: ShoppingCart, empty: "🛒", placeholder: "Add an item…" },
  { key: "todo", label: "To-do", icon: ListTodo, empty: "✅", placeholder: "Add a to-do…" },
];

export function ListsView({ kiosk }: { kiosk: Kiosk; onHome?: () => void }) {
  const [kind, setKind] = useState<Kind>("grocery");
  const [draft, setDraft] = useState("");
  const meta = KINDS.find((k) => k.key === kind)!;

  const items = (kiosk.state?.snapshot.list_items ?? [])
    .filter((i) => i.list_kind === kind)
    .sort((a, b) => Number(a.checked) - Number(b.checked) || a.sort_order - b.sort_order);

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    kiosk.addListItem(draft, { list_kind: kind });
    setDraft("");
  }

  const remaining = items.filter((i) => !i.checked).length;

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-28 pt-6 sm:px-6 sm:pt-8">
      <header className="mb-5 flex items-end justify-between gap-3">
        <div>
          <KEyebrow>Shared lists</KEyebrow>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">{meta.label}</h1>
        </div>
        <span className="pb-1 text-sm font-semibold text-kmute">{remaining} left</span>
      </header>

      {/* List switcher */}
      <div className="mb-4 flex gap-2 rounded-2xl bg-kpanel p-1.5 ring-1 ring-kline/55">
        {KINDS.map((k) => {
          const Icon = k.icon;
          const active = k.key === kind;
          return (
            <button
              key={k.key}
              onClick={() => setKind(k.key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-base font-bold transition active:scale-[0.98]",
                active ? "bg-kwater text-harbor shadow-k" : "text-kmute hover:text-ktext",
              )}
            >
              <Icon className="h-5 w-5" /> {k.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={add} className="mb-4 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={meta.placeholder}
          className="flex-1 rounded-2xl bg-kpanel px-4 py-4 text-lg text-ktext outline-none ring-1 ring-kline/55 transition placeholder:text-kmute focus:ring-2 focus:ring-kwater"
        />
        <KButton type="submit" variant="beacon" className="aspect-square h-auto w-16 px-0" aria-label="Add item">
          <Plus className="h-7 w-7" />
        </KButton>
      </form>

      <div className="space-y-2.5">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => kiosk.checkListItem(item.id, !item.checked)}
            className={cn(
              "flex w-full items-center gap-3 rounded-2xl p-4 text-left ring-1 transition active:scale-[0.99]",
              item.checked
                ? "bg-emerald-500/10 ring-emerald-500/30"
                : "bg-kpanel shadow-k ring-kline/55 hover:brightness-110",
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition",
                item.checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-kline",
              )}
            >
              {item.checked && <Check className="h-5 w-5" />}
            </span>
            <span className={cn("flex-1 text-lg font-semibold", item.checked ? "text-kmute line-through" : "text-ktext")}>
              {item.name}
              {item.category && <span className="ml-2 text-sm font-normal text-kmute">{item.category}</span>}
            </span>
          </button>
        ))}
        {items.length === 0 && (
          <KCard className="flex flex-col items-center justify-center p-10 text-center">
            <span className="text-5xl">{meta.empty}</span>
            <h3 className="mt-3 font-display text-lg font-bold text-ktext">Nothing here yet</h3>
            <p className="mt-1.5 text-kmute">Add the first one — tap the box above.</p>
          </KCard>
        )}
      </div>
    </div>
  );
}
