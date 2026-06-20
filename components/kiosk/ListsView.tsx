"use client";

import { useState } from "react";
import { Home as HomeIcon, Plus, Check } from "lucide-react";
import type { useKiosk } from "./useKiosk";
import { cn } from "@/lib/cn";

type Kiosk = ReturnType<typeof useKiosk>;

export function ListsView({ kiosk, onHome }: { kiosk: Kiosk; onHome: () => void }) {
  const [draft, setDraft] = useState("");
  const items = (kiosk.state?.snapshot.list_items ?? [])
    .filter((i) => i.list_kind === "grocery")
    .sort((a, b) => Number(a.checked) - Number(b.checked) || a.sort_order - b.sort_order);

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    kiosk.addListItem(draft);
    setDraft("");
  }

  const remaining = items.filter((i) => !i.checked).length;

  return (
    <div className="flex min-h-full flex-col bg-seafog">
      <header className="flex items-center justify-between bg-harbor px-4 py-3 text-white">
        <button onClick={onHome} className="kiosk-tap flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2 font-semibold">
          <HomeIcon className="h-5 w-5" /> Home
        </button>
        <span className="font-display text-xl font-bold">Grocery List</span>
        <span className="w-20 text-right text-sm text-seafoam">{remaining} left</span>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 p-4 sm:p-6">
        <form onSubmit={add} className="mb-4 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add an item…"
            className="flex-1 rounded-2xl border-2 border-harbor-100 bg-white px-4 py-4 text-lg outline-none focus:border-water"
          />
          <button
            type="submit"
            className="kiosk-tap flex items-center justify-center rounded-2xl bg-beacon px-6 text-harbor"
            aria-label="Add item"
          >
            <Plus className="h-7 w-7" />
          </button>
        </form>

        <div className="space-y-2">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => kiosk.checkListItem(item.id, !item.checked)}
              className={cn(
                "kiosk-tap flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition",
                item.checked ? "border-emerald-200 bg-emerald-50" : "border-harbor-100 bg-white",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
                  item.checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-harbor-100",
                )}
              >
                {item.checked && <Check className="h-5 w-5" />}
              </span>
              <span className={cn("flex-1 text-lg font-semibold", item.checked ? "text-muted line-through" : "text-ink")}>
                {item.name}
                {item.category && <span className="ml-2 text-sm text-muted">{item.category}</span>}
              </span>
            </button>
          ))}
          {items.length === 0 && (
            <p className="py-10 text-center text-muted">The list is empty. Add the first thing you need.</p>
          )}
        </div>
      </main>
    </div>
  );
}
