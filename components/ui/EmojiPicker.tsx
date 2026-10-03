"use client";

import { useState } from "react";
import { Sheet } from "./Sheet";
import { cn } from "@/lib/cn";

// Pick an emoji by tapping — replaces the 23 "type an emoji here" text boxes.
const GROUPS: { label: string; emoji: string[] }[] = [
  { label: "Routine", emoji: ["🪥", "🛁", "🚿", "🧼", "🚽", "👕", "👖", "🧦", "👟", "🎒", "🛏️", "🍳", "🥣", "🥛", "💧", "💊", "📚", "✏️", "🧸", "😴", "🌙", "☀️", "⏰", "🧴"] },
  { label: "Chores", emoji: ["🧹", "🧺", "🍽️", "🗑️", "🐶", "🐱", "🐟", "🪴", "🧽", "🛒", "📦", "🧻", "♻️", "🌿", "🧤", "🚗"] },
  { label: "Food", emoji: ["🍎", "🍌", "🍇", "🍓", "🥕", "🥦", "🍕", "🍝", "🌮", "🍔", "🥪", "🥗", "🍲", "🍪", "🧁", "🍦", "🍿", "🥞", "🍗", "🍣"] },
  { label: "Fun & rewards", emoji: ["🎮", "📺", "🎨", "⚽", "🏀", "🚲", "🛹", "🎁", "🎉", "⭐", "🏆", "🎟️", "🍬", "🧩", "🎵", "🏊", "🛝", "🎬", "📱", "🪁"] },
  { label: "Places & events", emoji: ["🎂", "🏫", "🏥", "🦷", "🩺", "🚌", "✈️", "🏟️", "🎭", "🎤", "📅", "🛍️", "⛪", "🏕️", "🏖️", "🎈"] },
  { label: "Feelings", emoji: ["😀", "😊", "🥰", "😴", "😢", "😡", "😰", "🤗", "👍", "👏", "💪", "❤️", "🙌", "👋", "🤝", "🫶"] },
  { label: "Animals & nature", emoji: ["🦊", "🐬", "🦁", "🐼", "🐸", "🦄", "🐢", "🐝", "🦋", "🐙", "🐧", "🐻", "🐰", "🦖", "🌈", "🌸", "🌊", "🌻", "⭐", "🌙"] },
];

export function EmojiPicker({
  name,
  defaultValue = "⭐",
  onChange,
  label = "Emoji",
  className,
}: {
  name?: string;
  defaultValue?: string | null;
  onChange?: (emoji: string) => void;
  label?: string;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue || "⭐");
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  const choose = (e: string) => {
    setValue(e);
    onChange?.(e);
    setOpen(false);
    setTyped("");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${label}: ${value}. Change`}
        aria-haspopup="dialog"
        className={cn(
          "grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-line-strong bg-surface-2 text-3xl transition hover:border-accent/50 active:scale-95",
          className,
        )}
      >
        {value}
      </button>
      {name && <input type="hidden" name={name} value={value} />}
      <Sheet open={open} onClose={() => setOpen(false)} title={`Choose ${label.toLowerCase()}`}>
        <div className="space-y-5">
          {GROUPS.map((g) => (
            <section key={g.label}>
              <h3 className="text-eyebrow mb-2 text-fg-muted">{g.label}</h3>
              <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
                {g.emoji.map((e) => (
                  <button
                    key={g.label + e}
                    type="button"
                    onClick={() => choose(e)}
                    aria-label={e}
                    aria-pressed={value === e}
                    className={cn(
                      "grid aspect-square place-items-center rounded-xl text-2xl transition hover:bg-surface-2 active:scale-90",
                      value === e && "bg-accent/15 ring-2 ring-accent",
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </section>
          ))}
          <section>
            <h3 className="text-eyebrow mb-2 text-fg-muted">Or type any emoji</h3>
            <div className="flex gap-2">
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                maxLength={8}
                placeholder="🙂"
                aria-label="Type an emoji"
                className="min-h-11 flex-1 rounded-xl border border-line-strong bg-surface px-3.5 text-xl text-fg outline-none focus:border-accent focus:ring-4 focus:ring-accent/20"
              />
              <button
                type="button"
                disabled={!typed.trim()}
                onClick={() => choose(typed.trim())}
                className="min-h-11 rounded-xl bg-accent px-4 font-semibold text-accent-fg transition hover:brightness-110 disabled:opacity-40"
              >
                Use it
              </button>
            </div>
          </section>
        </div>
      </Sheet>
    </>
  );
}
