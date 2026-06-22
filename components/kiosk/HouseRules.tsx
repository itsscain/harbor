"use client";

import { X } from "lucide-react";
import type { KioskHouseRule } from "@/lib/kiosk/types";
import { speak } from "@/lib/kiosk/feedback";
import { KTopBar, KIconButton } from "./ui";

/** Full-screen, read-only House Rules reference for the wall: the family's rules
 *  plus a calm, numbered consequence ladder. Tap any item to hear it read aloud. */
export function HouseRules({ rules, onClose }: { rules: KioskHouseRule[]; onClose: () => void }) {
  const list = [...rules].sort((a, b) => a.sort_order - b.sort_order);
  const theRules = list.filter((r) => r.kind === "rule");
  const ladder = list.filter((r) => r.kind === "consequence");

  return (
    <div className="animate-enter fixed inset-0 z-40 flex flex-col bg-kbg text-ktext">
      <KTopBar
        onBack={onClose}
        title="House Rules"
        right={
          <KIconButton variant="ghost" onClick={onClose} className="kiosk-tap" aria-label="Close house rules">
            <X className="h-5 w-5" />
          </KIconButton>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto max-w-3xl space-y-8 pb-10">
          {theRules.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-xl font-bold text-ktext">Our rules</h2>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {theRules.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => speak(`${r.title}. ${r.detail ?? ""}`)}
                    className="flex items-center gap-3 rounded-xl bg-kpanel p-4 text-left shadow-k ring-1 ring-kline/55 transition active:scale-[0.99]"
                  >
                    <span className="text-3xl">{r.emoji ?? "•"}</span>
                    <div className="min-w-0">
                      <p className="font-display text-lg font-bold text-ktext">{r.title}</p>
                      {r.detail && <p className="text-sm text-kmute">{r.detail}</p>}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {ladder.length > 0 && (
            <section>
              <h2 className="mb-1 font-display text-xl font-bold text-ktext">If choices slip…</h2>
              <p className="mb-3 text-sm text-kmute">Calm, predictable steps — everyone knows what comes next.</p>
              <ol className="space-y-2.5">
                {ladder.map((r, i) => (
                  <li key={r.id}>
                    <button
                      onClick={() => speak(`Step ${i + 1}. ${r.title}. ${r.detail ?? ""}`)}
                      className="flex w-full items-center gap-3 rounded-xl bg-kpanel p-4 text-left shadow-k ring-1 ring-kline/55 transition active:scale-[0.99]"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400/15 font-display text-lg font-bold text-amber-300 ring-1 ring-amber-400/30">
                        {i + 1}
                      </span>
                      <span className="text-2xl">{r.emoji ?? "→"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-lg font-bold text-ktext">{r.title}</p>
                        {r.detail && <p className="text-sm text-kmute">{r.detail}</p>}
                      </div>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {list.length === 0 && (
            <div className="rounded-xl bg-kpanel p-6 text-center text-kmute shadow-k ring-1 ring-kline/55">
              No house rules yet. A grown-up can add them in the Harbor app.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
