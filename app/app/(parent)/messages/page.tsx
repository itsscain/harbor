import { Trash2, Pin, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Input, Field, Select, Textarea, Badge } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { addMessage, deleteMessage } from "../hub-actions";

export const metadata = { title: "Message board" };
export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const household = await getMyHousehold();
  if (!household) return <Card><p className="text-muted">No household yet.</p></Card>;
  const supabase = await createClient();
  const [{ data: messages }, { data: children }] = await Promise.all([
    supabase.from("wall_messages").select("*").eq("household_id", household.id).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("children").select("id, name").eq("household_id", household.id).is("deleted_at", null).order("sort_order"),
  ]);

  return (
    <>
      <PageHeader title="Message board" subtitle="Notes and nudges that appear on the wall's home screen." />

      <Card className="mb-4">
        <h2 className="font-display text-base font-bold text-harbor">Post a note</h2>
        <form action={addMessage} className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Message" className="sm:col-span-2">
            <Textarea name="body" required placeholder="Mom home by 5:30 — snack's in the fridge. You've got this!" />
          </Field>
          <Field label="Emoji"><Input name="emoji" placeholder="💛" className="text-center text-xl" /></Field>
          <Field label="From"><Input name="author_label" placeholder="Mom" /></Field>
          <Field label="For">
            <Select name="child_id" defaultValue="">
              <option value="">Whole family</option>
              {(children ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Bonus stars (optional)" hint="Awarded to the chosen child when posted.">
            <Input name="bonus_points" type="number" min={0} defaultValue={0} />
          </Field>
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input type="checkbox" name="pinned" className="h-4 w-4" /> Pin to top
          </label>
          <div className="sm:col-span-2"><SubmitButton>Post to the wall</SubmitButton></div>
        </form>
      </Card>

      <div className="space-y-2">
        {(messages ?? []).map((m) => (
          <Card key={m.id} className="flex items-start gap-3">
            <span className="text-2xl">{m.emoji ?? "💬"}</span>
            <div className="min-w-0 flex-1">
              <p className="text-ink">{m.body}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {m.author_label && <span className="text-xs font-semibold text-muted">— {m.author_label}</span>}
                {m.pinned && <Badge tone="beacon"><Pin className="mr-1 h-3 w-3" />Pinned</Badge>}
                {m.bonus_points > 0 && (
                  <Badge tone="green"><Star className="mr-1 h-3 w-3" />+{m.bonus_points} awarded</Badge>
                )}
              </div>
            </div>
            <form action={deleteMessage.bind(null, m.id)}>
              <button className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50" aria-label="Delete message">
                <Trash2 className="h-4 w-4" />
              </button>
            </form>
          </Card>
        ))}
        {(messages ?? []).length === 0 && <p className="text-sm text-muted">No messages yet.</p>}
      </div>
    </>
  );
}
