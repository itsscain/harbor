"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Plus, Check } from "lucide-react";
import { createChild, addRoutineFromTemplate, type CreateChildState } from "@/app/app/(parent)/actions";
import { CHILD_PALETTE } from "@/lib/kiosk/colors";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Card } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

const AVATARS = ["🦊", "🐢", "🦁", "🐙", "🦄", "🐝", "🦋", "🐬", "🐧", "🐨", "🦉", "🐸", "🦖", "🐳", "🌟", "🚀", "🐰", "🐼"];

const TEMPLATES = [
  { key: "morning", emoji: "🌅", name: "Morning", preview: "Wake · Dressed · Teeth · Breakfast" },
  { key: "bedtime", emoji: "🌙", name: "Bedtime", preview: "Bath · PJs · Story · Lights out" },
  { key: "afterschool", emoji: "🍎", name: "After school", preview: "Snack · Homework · Tidy up" },
  { key: "firstthen", emoji: "🔁", name: "First / Then", preview: "First this, then that" },
];

export function AddChildCard({ defaultColor }: { defaultColor: string }) {
  const [state, action] = useActionState<CreateChildState, FormData>(createChild, {});
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🦊");
  const [custom, setCustom] = useState(false);
  const [color, setColor] = useState(defaultColor);

  if (state.ok && state.child) {
    return <Celebration child={state.child} />;
  }

  return (
    <Card id="add" className="scroll-mt-24 overflow-hidden p-0">
      <form action={action}>
        {/* Live preview banner */}
        <div className="flex items-center gap-4 border-b border-harbor-100 bg-surface-sunken px-5 py-5">
          <span
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-4xl transition-transform duration-200"
            style={{ background: color + "26", boxShadow: `inset 0 0 0 3px ${color}` }}
          >
            {emoji}
          </span>
          <div className="min-w-0">
            <p className="text-eyebrow text-muted">Live preview · how they appear on the wall</p>
            <p className="truncate text-display-sm text-harbor">{name.trim() || "Your child"}</p>
          </div>
        </div>

        <div className="space-y-5 p-5">
          {/* Name */}
          <div className="space-y-1.5">
            <label htmlFor="child-name" className="block text-sm font-medium text-ink">
              What&apos;s their name?
            </label>
            <input
              id="child-name"
              name="name"
              required
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mia"
              className="w-full rounded-xl border border-harbor-100 bg-white px-3.5 py-3 text-lg text-ink outline-none transition placeholder:text-muted/60 focus:border-water focus:ring-4 focus:ring-water/15"
            />
          </div>

          {/* Avatar picker */}
          <div className="space-y-1.5">
            <p className="block text-sm font-medium text-ink">Pick an avatar</p>
            <input type="hidden" name="avatar" value={emoji} />
            <div className="flex flex-wrap gap-2">
              {AVATARS.map((a) => (
                <button
                  type="button"
                  key={a}
                  onClick={() => { setEmoji(a); setCustom(false); }}
                  aria-pressed={!custom && emoji === a}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl text-2xl transition-transform duration-150 hover:scale-105",
                    !custom && emoji === a
                      ? "bg-water/10 ring-2 ring-water"
                      : "bg-harbor-50 ring-1 ring-transparent hover:ring-harbor-100",
                  )}
                >
                  {a}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCustom(true)}
                aria-pressed={custom}
                className={cn(
                  "flex h-11 items-center gap-1 rounded-xl px-3 text-sm font-semibold transition",
                  custom ? "bg-water/10 ring-2 ring-water text-harbor" : "bg-harbor-50 text-muted hover:text-harbor",
                )}
              >
                <Plus className="h-4 w-4" /> Own
              </button>
            </div>
            {custom && (
              <input
                aria-label="Custom emoji"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
                placeholder="🎈"
                className="mt-2 w-24 rounded-xl border border-harbor-100 bg-white px-3 py-2 text-center text-2xl outline-none focus:border-water focus:ring-4 focus:ring-water/15"
              />
            )}
          </div>

          {/* Color picker */}
          <div className="space-y-1.5">
            <p className="block text-sm font-medium text-ink">Their color</p>
            <input type="hidden" name="color" value={color} />
            <div className="flex flex-wrap gap-2.5">
              {CHILD_PALETTE.map((p) => (
                <button
                  type="button"
                  key={p.value}
                  onClick={() => setColor(p.value)}
                  aria-label={p.name}
                  aria-pressed={color === p.value}
                  className={cn(
                    "h-9 w-9 rounded-full transition-transform duration-150 hover:scale-110",
                    color === p.value ? "scale-110 ring-2 ring-harbor ring-offset-2" : "",
                  )}
                  style={{ backgroundColor: p.value }}
                />
              ))}
            </div>
          </div>

          {state.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
          )}

          <SubmitButton size="lg" className="w-full" pendingText="Adding…" confirmSaved={false}>
            <Sparkles className="h-5 w-5" /> Add {name.trim() || "child"} to the crew
          </SubmitButton>
        </div>
      </form>
    </Card>
  );
}

function Celebration({ child }: { child: { id: string; name: string; avatar: string | null; color: string } }) {
  const color = child.color;
  return (
    <Card className="overflow-hidden p-0 text-center">
      <div className="relative flex flex-col items-center gap-3 border-b border-harbor-100 bg-surface-sunken px-6 py-8">
        <span className="absolute inset-x-0 top-0 mx-auto h-40 w-40 beacon-ring" aria-hidden />
        <span
          className="animate-pop relative flex h-20 w-20 items-center justify-center rounded-full text-4xl"
          style={{ background: color + "26", boxShadow: `inset 0 0 0 3px ${color}` }}
        >
          {child.avatar ?? "🙂"}
        </span>
        <div className="relative">
          <p className="text-display-sm text-harbor">{child.name} is aboard! 🎉</p>
          <p className="mt-1 text-sm text-muted">Want a head start? Add a ready-made routine.</p>
        </div>
      </div>

      <div className="space-y-2 p-5 text-left">
        {TEMPLATES.map((t) => (
          <form key={t.key} action={addRoutineFromTemplate.bind(null, child.id)}>
            <input type="hidden" name="template" value={t.key} />
            <TemplateRow emoji={t.emoji} name={t.name} preview={t.preview} />
          </form>
        ))}

        <div className="flex flex-wrap gap-2 pt-2">
          <Link
            href={`/app/children/${child.id}`}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[linear-gradient(180deg,#16586a,#0c3b47)] px-4 py-3 font-semibold text-white shadow-button"
          >
            Open {child.name}&apos;s page <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/app/children"
            onClick={() => { setTimeout(() => location.reload(), 10); }}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-harbor-100 px-4 py-3 font-semibold text-harbor hover:bg-harbor-50"
          >
            <Plus className="h-4 w-4" /> Add another
          </Link>
        </div>
      </div>
    </Card>
  );
}

function TemplateRow({ emoji, name, preview }: { emoji: string; name: string; preview: string }) {
  return (
    <button
      type="submit"
      className="flex w-full items-center gap-3 rounded-xl border border-harbor-100 bg-white px-3 py-3 text-left transition hover:-translate-y-0.5 hover:border-water/40 hover:shadow-card-hover"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-harbor-50 text-2xl">{emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-title text-harbor">{name}</span>
        <span className="block truncate text-xs text-muted">{preview}</span>
      </span>
      <span className="text-eyebrow rounded-full bg-water/10 px-2 py-1 text-water">Add</span>
    </button>
  );
}

/** Inline confirmation helper kept for completeness (used when a template is added). */
export function AddedTick() {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
      <Check className="h-4 w-4" /> Added
    </span>
  );
}
