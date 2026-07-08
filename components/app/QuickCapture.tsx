"use client";

import { useState } from "react";
import { Sparkles, X, CalendarDays, ShoppingCart, ListTodo, Check } from "lucide-react";
import { scanCapture, applyCapture } from "@/app/app/(parent)/hub-actions";
import type { CaptureResult } from "@/lib/ai/capture";

/** Quick Capture (§9.2.7) — paste/snap a flyer, email, or list; the AI proposes
 *  events, groceries, and to-dos to add with one tap. Matches Skylight Sidekick's
 *  most-loved feature, on the household's own AI key. */
export function QuickCapture() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg shadow-button transition hover:brightness-110 active:scale-[0.98]"
      >
        <Sparkles className="h-4 w-4 text-beacon" /> Quick Capture
      </button>
      {open && <Modal onClose={() => setOpen(false)} />}
    </>
  );
}

type Sel = { events: boolean[]; groceries: boolean[]; todos: boolean[] };

function Modal({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<"input" | "review" | "done">("input");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<CaptureResult | null>(null);
  const [sel, setSel] = useState<Sel>({ events: [], groceries: [], todos: [] });
  const [added, setAdded] = useState(0);

  async function scan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const d = new Date();
    fd.set("today", `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    const res = await scanCapture(fd);
    setBusy(false);
    if (!res.ok || !res.result) {
      setErr(res.error ?? "Couldn't read that — try a clearer photo or paste the text.");
      return;
    }
    const r = res.result;
    if (!r.events.length && !r.groceries.length && !r.todos.length) {
      setErr("I didn't find any events, groceries, or to-dos in that.");
      return;
    }
    setResult(r);
    setSel({ events: r.events.map(() => true), groceries: r.groceries.map(() => true), todos: r.todos.map(() => true) });
    setPhase("review");
  }

  async function add() {
    if (!result) return;
    setBusy(true);
    setErr(null);
    const filtered: CaptureResult = {
      events: result.events.filter((_, i) => sel.events[i]),
      groceries: result.groceries.filter((_, i) => sel.groceries[i]),
      todos: result.todos.filter((_, i) => sel.todos[i]),
    };
    try {
      const res = await applyCapture(filtered, new Date().getTimezoneOffset());
      setBusy(false);
      if (!res.ok) {
        setErr(res.error ?? "Couldn't add those — please try again.");
        return;
      }
      setAdded(res.added);
      setPhase("done");
    } catch {
      setBusy(false);
      setErr("Couldn't add those — please try again.");
    }
  }

  const selectedCount =
    sel.events.filter(Boolean).length + sel.groceries.filter(Boolean).length + sel.todos.filter(Boolean).length;
  const toggle = (k: keyof Sel, i: number) =>
    setSel((s) => ({ ...s, [k]: s[k].map((v, j) => (j === i ? !v : v)) }));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="animate-sheet-up flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-surface shadow-pop sm:rounded-2xl sm:animate-pop">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="flex items-center gap-2 text-title text-fg">
            <Sparkles className="h-5 w-5 text-beacon" /> Quick Capture
          </h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-fg-muted hover:bg-surface-2">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="overflow-y-auto px-5 py-4">
          {phase === "input" && (
            <form onSubmit={scan} className="space-y-4">
              <p className="text-sm text-fg-muted">
                Snap a school flyer, paste an email or a list — Harbor pulls out events, groceries, and to-dos for you to add.
              </p>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-fg">Photo (flyer, invite, receipt…)</span>
                <input
                  type="file"
                  name="photo"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="block w-full text-sm text-fg-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-fg"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-fg">…or paste text</span>
                <textarea
                  name="text"
                  rows={4}
                  placeholder="Paste an email, flyer text, or a list here…"
                  className="w-full rounded-xl border border-line-strong bg-surface px-3.5 py-2.5 text-sm text-fg focus:border-accent focus:outline-none"
                />
              </label>
              {err && <p className="text-sm text-error">{err}</p>}
              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 font-semibold text-accent-fg transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4 text-beacon" /> {busy ? "Reading…" : "Scan"}
              </button>
            </form>
          )}

          {phase === "review" && result && (
            <div className="space-y-5">
              <Section icon={<CalendarDays className="h-4 w-4" />} title="Events" count={result.events.length}>
                {result.events.map((e, i) => (
                  <Row key={`e${i}`} checked={sel.events[i]} onToggle={() => toggle("events", i)}>
                    <span className="font-medium text-fg">
                      {e.emoji ? `${e.emoji} ` : ""}
                      {e.title}
                    </span>
                    <span className="text-fg-muted">
                      {" · "}
                      {e.date}
                      {e.time ? ` ${e.time}` : ""}
                      {e.location ? ` · ${e.location}` : ""}
                    </span>
                  </Row>
                ))}
              </Section>
              <Section icon={<ShoppingCart className="h-4 w-4" />} title="Groceries" count={result.groceries.length}>
                {result.groceries.map((g, i) => (
                  <Row key={`g${i}`} checked={sel.groceries[i]} onToggle={() => toggle("groceries", i)}>
                    <span className="font-medium text-fg">{g.name}</span>
                    {g.category && <span className="text-fg-muted"> · {g.category}</span>}
                  </Row>
                ))}
              </Section>
              <Section icon={<ListTodo className="h-4 w-4" />} title="To-dos" count={result.todos.length}>
                {result.todos.map((t, i) => (
                  <Row key={`t${i}`} checked={sel.todos[i]} onToggle={() => toggle("todos", i)}>
                    <span className="font-medium text-fg">{t.title}</span>
                    {t.due_date && <span className="text-fg-muted"> · {t.due_date}</span>}
                  </Row>
                ))}
              </Section>
              {err && <p className="text-sm text-error">{err}</p>}
            </div>
          )}

          {phase === "done" && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-good/15 text-good">
                <Check className="h-7 w-7" />
              </span>
              <p className="text-lg font-semibold text-fg">Added {added} {added === 1 ? "item" : "items"}.</p>
              <p className="text-sm text-fg-muted">They&apos;re on your calendar and lists — and on the wall.</p>
            </div>
          )}
        </div>

        {phase === "review" && (
          <footer className="flex items-center justify-between gap-3 border-t border-line px-5 py-4">
            <button onClick={() => setPhase("input")} className="text-sm font-medium text-fg-muted hover:text-fg">
              Back
            </button>
            <button
              onClick={add}
              disabled={busy || selectedCount === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-fg transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {busy ? "Adding…" : `Add ${selectedCount} ${selectedCount === 1 ? "item" : "items"}`}
            </button>
          </footer>
        )}

        {phase === "done" && (
          <footer className="border-t border-line px-5 py-4">
            <button onClick={onClose} className="w-full rounded-xl bg-accent px-4 py-3 font-semibold text-accent-fg hover:brightness-110">
              Done
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}

function Section({ icon, title, count, children }: { icon: React.ReactNode; title: string; count: number; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 text-eyebrow text-fg-muted">
        {icon} {title} ({count})
      </h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ checked, onToggle, children }: { checked: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition ${
        checked ? "border-line-strong bg-surface-2/60" : "border-line opacity-55"
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
          checked ? "border-accent bg-accent text-accent-fg" : "border-line-strong"
        }`}
      >
        {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
      <span className="min-w-0">{children}</span>
    </button>
  );
}
