"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { Field, Input, Select } from "@/components/ui/primitives";

type Config = Record<string, unknown>;

/** Friendly, typed editors for each calm tool — no raw JSON for parents. Emits a
 *  hidden `config` field (JSON) that updateCalmTool parses, so the server is unchanged. */
export function CalmToolFields({ toolType, config }: { toolType: string; config: Config }) {
  if (toolType === "breathing") return <Breathing config={config} />;
  if (toolType === "feelings") return <Feelings config={config} />;
  if (toolType === "break") return <Break config={config} />;
  if (toolType === "social_story") return <SocialStory config={config} />;
  // Fallback: raw JSON for any unknown type.
  return (
    <Field label="Settings (JSON)">
      <textarea
        name="config"
        defaultValue={JSON.stringify(config, null, 2)}
        className="w-full rounded-xl border border-harbor-100 bg-white px-3.5 py-2.5 font-mono text-sm outline-none focus:border-water focus:ring-4 focus:ring-water/15"
      />
    </Field>
  );
}

function Hidden({ value }: { value: unknown }) {
  return <input type="hidden" name="config" value={JSON.stringify(value)} />;
}

function Breathing({ config }: { config: Config }) {
  // Map any legacy/non-numeric pattern (e.g. "box", "4-4-4-4") to a value the
  // kiosk can parse and the Select can show.
  const [pattern, setPattern] = useState(String(config.pattern ?? "4-7-8") === "4-7-8" ? "4-7-8" : "4-4-4");
  const [rounds, setRounds] = useState(Number(config.rounds ?? 4));
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Hidden value={{ pattern, rounds }} />
      <Field label="Breathing pattern" hint="Inhale · hold · exhale (seconds)">
        <Select value={pattern} onChange={(e) => setPattern(e.target.value)}>
          <option value="4-7-8">Relaxing · 4-7-8</option>
          <option value="4-4-4">Box · 4-4-4</option>
        </Select>
      </Field>
      <Field label="Rounds">
        <Input type="number" min={1} max={12} value={rounds} onChange={(e) => setRounds(Number(e.target.value) || 1)} />
      </Field>
    </div>
  );
}

function Break({ config }: { config: Config }) {
  const [minutes, setMinutes] = useState(Number(config.minutes ?? 5));
  return (
    <div className="max-w-xs">
      <Hidden value={{ minutes }} />
      <Field label="Break length (minutes)">
        <Input type="number" min={1} max={60} value={minutes} onChange={(e) => setMinutes(Number(e.target.value) || 1)} />
      </Field>
    </div>
  );
}

function Feelings({ config }: { config: Config }) {
  const [options, setOptions] = useState<string[]>(
    Array.isArray(config.options) ? (config.options as string[]) : ["happy", "calm", "sad", "angry", "worried", "tired"],
  );
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim().toLowerCase();
    if (v && !options.includes(v)) setOptions([...options, v]);
    setDraft("");
  };
  return (
    <div>
      <Hidden value={{ options }} />
      <p className="mb-1.5 block text-sm font-medium text-ink">Feelings kids can tap</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <span key={o} className="inline-flex items-center gap-1 rounded-full bg-harbor-50 px-3 py-1.5 text-sm font-semibold text-harbor">
            {o}
            <button
              type="button"
              onClick={() => setOptions(options.filter((x) => x !== o))}
              aria-label={`Remove ${o}`}
              className="rounded-full p-0.5 text-muted hover:text-error-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Add a feeling…"
          className="max-w-xs"
        />
        <button type="button" onClick={add} className="inline-flex items-center gap-1 rounded-xl bg-harbor-50 px-3 text-sm font-semibold text-harbor hover:bg-harbor-100">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>
    </div>
  );
}

function SocialStory({ config }: { config: Config }) {
  const [title, setTitle] = useState(String(config.title ?? ""));
  const [pages, setPages] = useState<string[]>(Array.isArray(config.pages) ? (config.pages as string[]) : [""]);
  const setPage = (i: number, v: string) => setPages(pages.map((p, idx) => (idx === i ? v : p)));
  return (
    <div className="space-y-3">
      <Hidden value={{ title, pages: pages.filter((p) => p.trim()) }} />
      <Field label="Story title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Going to the store" />
      </Field>
      <div className="space-y-2">
        <p className="block text-sm font-medium text-ink">Pages</p>
        {pages.map((p, i) => (
          <div key={i} className="flex gap-2">
            <textarea
              value={p}
              onChange={(e) => setPage(i, e.target.value)}
              placeholder={`Page ${i + 1}…`}
              className="min-h-16 w-full rounded-xl border border-harbor-100 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-water focus:ring-4 focus:ring-water/15"
            />
            {pages.length > 1 && (
              <button
                type="button"
                onClick={() => setPages(pages.filter((_, idx) => idx !== i))}
                aria-label={`Remove page ${i + 1}`}
                className="shrink-0 self-start rounded-lg border border-error/30 p-2 text-error-ink hover:bg-error-soft"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setPages([...pages, ""])}
          className="inline-flex items-center gap-1 rounded-xl bg-harbor-50 px-3 py-2 text-sm font-semibold text-harbor hover:bg-harbor-100"
        >
          <Plus className="h-4 w-4" /> Add page
        </button>
      </div>
    </div>
  );
}
