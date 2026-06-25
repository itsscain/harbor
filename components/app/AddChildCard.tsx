"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
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

type Child = { id: string; name: string; avatar: string | null; color: string };

/** Take the first grapheme so multi-codepoint emoji (ZWJ families, flags) survive. */
function firstGrapheme(v: string): string {
  try {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return seg.segment(v)[Symbol.iterator]().next().value?.segment ?? "";
  } catch {
    return Array.from(v)[0] ?? "";
  }
}

export function AddChildCard({ defaultColor }: { defaultColor: string }) {
  const [done, setDone] = useState<Child | null>(null);
  const [round, setRound] = useState(0);

  if (done) {
    return <Celebration child={done} onAddAnother={() => { setDone(null); setRound((r) => r + 1); }} />;
  }
  return <ChildForm key={round} defaultColor={defaultColor} onDone={setDone} />;
}

function ChildForm({ defaultColor, onDone }: { defaultColor: string; onDone: (c: Child) => void }) {
  const [state, action] = useActionState<CreateChildState, FormData>(createChild, {});
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🦊");
  const [custom, setCustom] = useState(false);
  const [color, setColor] = useState(defaultColor);

  useEffect(() => {
    if (state.ok && state.child) onDone(state.child);
  }, [state, onDone]);

  return (
    <Card id="add" className="scroll-mt-24 overflow-hidden p-0">
      <form action={action}>
        {/* Live preview banner */}
        <div className="flex items-center gap-4 border-b border-harbor-100 bg-surface-sunken px-5 py-5">
          <span
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-4xl"
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
                  custom ? "bg-water/10 text-harbor ring-2 ring-water" : "bg-harbor-50 text-muted hover:text-harbor",
                )}
              >
                <Plus className="h-4 w-4" /> Own
              </button>
            </div>
            {custom && (
              <input
                aria-label="Custom emoji"
                value={emoji}
                onChange={(e) => setEmoji(firstGrapheme(e.target.value))}
                placeholder="🎈"
                className="mt-2 w-24 rounded-xl border border-harbor-100 bg-white px-3 py-2 text-center text-2xl outline-none focus:border-water focus:ring-4 focus:ring-water/15"
              />
            )}
          </div>

          {/* Color picker */}
          <div className="space-y-1.5">
            <p className="block text-sm font-medium text-ink">Their color</p>
            <input type="hidden" name="color" value={color} />
            <div className="flex flex-wrap gap-1">
              {CHILD_PALETTE.map((p) => (
                <button
                  type="button"
                  key={p.value}
                  onClick={() => setColor(p.value)}
                  aria-label={p.name}
                  aria-pressed={color === p.value}
                  className="flex h-11 w-11 items-center justify-center rounded-full transition-transform duration-150 hover:scale-105"
                >
                  <span
                    className={cn(
                      "h-7 w-7 rounded-full transition-transform",
                      color === p.value && "scale-110 ring-2 ring-harbor ring-offset-2",
                    )}
                    style={{ backgroundColor: p.value }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Birthday (optional) */}
          <div className="space-y-1.5">
            <label htmlFor="child-bday" className="block text-sm font-medium text-ink">
              Birthday <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="child-bday"
              name="birthday"
              type="date"
              className="rounded-xl border border-harbor-100 bg-white px-3.5 py-2.5 text-ink outline-none transition focus:border-water focus:ring-4 focus:ring-water/15"
            />
            <p className="text-xs text-muted">Adds a “N sleeps until their birthday” countdown on the wall.</p>
          </div>

          {state.error && (
            <p className="rounded-lg bg-error-soft px-3 py-2 text-sm text-error-ink">{state.error}</p>
          )}

          <SubmitButton size="lg" className="w-full" pendingText="Adding…" confirmSaved={false}>
            <Sparkles className="h-5 w-5" /> Add {name.trim() || "child"} to the crew
          </SubmitButton>
        </div>
      </form>
    </Card>
  );
}

function Celebration({ child, onAddAnother }: { child: Child; onAddAnother: () => void }) {
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
          <button
            type="button"
            onClick={onAddAnother}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-harbor-100 px-4 py-3 font-semibold text-harbor transition hover:bg-harbor-50 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" /> Add another
          </button>
        </div>
      </div>
    </Card>
  );
}

function TemplateRow({ emoji, name, preview }: { emoji: string; name: string; preview: string }) {
  const { pending } = useFormStatus();
  const wasPending = useRef(false);
  // Synchronous in-flight latch — blocks a second tap before `pending` flips,
  // so a double-tap can't create a duplicate routine (with duplicate points).
  const submitting = useRef(false);
  const [added, setAdded] = useState(false);
  useEffect(() => {
    if (pending) {
      wasPending.current = true;
      return;
    }
    if (wasPending.current) {
      wasPending.current = false;
      setAdded(true);
    }
  }, [pending]);

  return (
    <button
      type="submit"
      disabled={pending || added}
      onClick={(e) => {
        if (pending || added || submitting.current) {
          e.preventDefault();
          return;
        }
        submitting.current = true;
      }}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition disabled:cursor-default",
        added
          ? "border-emerald-200 bg-emerald-50/50"
          : "border-harbor-100 bg-white hover:-translate-y-0.5 hover:border-water/40 hover:shadow-card-hover",
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-harbor-50 text-2xl">{emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-title text-harbor">{name}</span>
        <span className="block truncate text-xs text-muted">{preview}</span>
      </span>
      <span
        className={cn(
          "text-eyebrow inline-flex items-center gap-1 rounded-full px-2 py-1",
          added ? "bg-emerald-100 text-emerald-700" : "bg-water/10 text-water",
        )}
      >
        {pending ? "Adding…" : added ? <><Check className="h-3.5 w-3.5" /> Added</> : "Add"}
      </span>
    </button>
  );
}
