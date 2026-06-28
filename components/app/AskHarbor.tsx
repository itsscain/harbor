"use client";

import { useState } from "react";
import { Send, Mic, Loader2 } from "lucide-react";
import { useTapToTalk } from "@/lib/kiosk/useTapToTalk";
import { askHarbor } from "@/app/app/(parent)/actions";
import { Card, Button, Textarea } from "@/components/ui/primitives";

const SUGGESTIONS = [
  "How was this week for my kids?",
  "Draft a calmer bedtime routine for the evenings",
  "Homework keeps ending in meltdowns — what can I try?",
  "Write a short social story about going to the dentist",
];

/** Ask Harbor — the parent voice Copilot (AI-Led Voice §3.4). Type or talk; Harbor answers
 *  grounded in your kids' data, drafts what you ask for, and sends medical questions to a
 *  provider. It advises and drafts — it never changes your household on its own. */
export function AskHarbor() {
  const [q, setQ] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const ask = async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    setAsked(t);
    setAnswer(null);
    setQ("");
    try {
      const r = await askHarbor(t);
      setAnswer(r.answer || "I couldn't find an answer for that — try rephrasing?");
    } catch {
      setAnswer("Something went wrong reaching Harbor — please try again.");
    } finally {
      setBusy(false);
    }
  };

  const talk = useTapToTalk((t) => void ask(t));

  return (
    <div className="space-y-4">
      <Card className="p-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ask(q);
          }}
          className="flex items-end gap-2 p-3"
        >
          <Textarea
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask(q);
              }
            }}
            rows={2}
            placeholder={talk.listening ? "Listening…" : "Ask about your kids, or ask me to draft something…"}
            className="flex-1 resize-none"
          />
          {talk.supported && (
            <button
              type="button"
              onClick={() => talk.start()}
              disabled={talk.listening || busy}
              aria-label="Talk to Harbor"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-harbor-50 text-harbor transition hover:bg-harbor-100 disabled:opacity-50"
            >
              <Mic className={"h-5 w-5 " + (talk.listening ? "text-beacon" : "")} />
            </button>
          )}
          <Button type="submit" disabled={busy || !q.trim()} aria-label="Send">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </form>
      </Card>

      {!asked && !busy && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => void ask(s)}
              className="rounded-full border border-harbor-100 bg-white px-3.5 py-1.5 text-sm text-harbor shadow-card transition hover:bg-harbor-50"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {asked && (
        <Card>
          <p className="text-sm font-semibold text-muted">You asked</p>
          <p className="mt-0.5 text-ink">{asked}</p>
          <div className="my-4 h-px bg-harbor-100" />
          {busy ? (
            <p className="flex items-center gap-2 text-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Harbor is thinking…
            </p>
          ) : (
            <p className="whitespace-pre-wrap text-pretty leading-relaxed text-ink">{answer}</p>
          )}
        </Card>
      )}
    </div>
  );
}
