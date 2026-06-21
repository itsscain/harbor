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
    <div className="flex min-h-dvh flex-col bg-kbg text-ktext">
      <header className="flex items-center justify-between border-b border-kline bg-kpanel px-4 py-3">
        <button onClick={onHome} className="kiosk-tap flex items-center gap-2 rounded-2xl bg-kraise px-3 py-2 font-semibold text-ktext">
          <HomeIcon className="h-5 w-5" /> Home
        </button>
        <span className="font-display text-xl font-extrabold text-ktext">Grocery List</span>
        <span className="w-20 text-right text-sm text-kmute">{remaining} left</span>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 p-4 sm:p-6">
        <form onSubmit={add} className="mb-4 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add an item…"
            className="flex-1 rounded-2xl border border-kline bg-kpanel px-4 py-4 text-lg text-ktext outline-none transition placeholder:text-kmute focus:border-kwater focus:ring-4 focus:ring-kwater/15"
          />
          <button
            type="submit"
            className="kiosk-tap flex items-center justify-center rounded-2xl bg-beacon px-6 text-harbor shadow-k"
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
                "kiosk-tap flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition",
                item.checked ? "border-emerald-500/40 bg-emerald-500/10" : "border-kline bg-kpanel shadow-k",
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition",
                  item.checked ? "border-emerald-500 bg-emerald-500 text-white" : "border-kline",
                )}
              >
                {item.checked && <Check className="h-5 w-5" />}
              </span>
              <span className={cn("flex-1 text-lg font-semibold", item.checked ? "text-kmute line-through" : "text-ktext")}>
                {item.name}
                {item.category && <span className="ml-2 text-sm text-kmute">{item.category}</span>}
              </span>
            </button>
          ))}
          {items.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-kline bg-kpanel p-10 text-center shadow-k">
              <span className="text-4xl">🛒</span>
              <h3 className="mt-3 font-display text-lg font-bold text-ktext">The list is empty</h3>
              <p className="mt-1.5 text-kmute">Add the first thing you need — tap the box above.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
