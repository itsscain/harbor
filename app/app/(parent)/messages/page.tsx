import { Trash2, Pin, Star, MessageSquareHeart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Input, Field, Select, Textarea, Badge, Switch } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmit } from "@/components/ui/ConfirmSubmit";
import { EmptyState } from "@/components/ui/EmptyState";
import { Disclosure } from "@/components/app/Disclosure";
import { addMessage, deleteMessage } from "../hub-actions";

export const metadata = { title: "Message board" };
export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const household = await getMyHousehold();
  if (!household) {
    return <EmptyState title="No household yet" body="Your message board will appear here once your household is set up." />;
  }
  const supabase = await createClient();
  const [{ data: messages }, { data: children }] = await Promise.all([
    supabase.from("wall_messages").select("*").eq("household_id", household.id).is("deleted_at", null).order("created_at", { ascending: false }),
    supabase.from("children").select("id, name").eq("household_id", household.id).is("deleted_at", null).order("sort_order"),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Connect"
        icon={<MessageSquareHeart className="h-6 w-6" />}
        title="Message board"
        subtitle="Notes and nudges that appear on the wall's home screen."
      />

      <Card className="mb-6 p-0">
        <Disclosure
          defaultOpen={(messages ?? []).length === 0}
          bodyClassName="px-5 pb-5"
          summary={<span className="text-title text-fg">Post a note</span>}
        >
        <form action={addMessage} className="grid gap-3 pt-1 sm:grid-cols-2">
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
          <div className="rounded-xl border border-line px-3.5 py-3 sm:col-span-2">
            <Switch name="pinned" label="Pin to top" hint="Keeps it at the top of the wall." />
          </div>
          <div className="sm:col-span-2"><SubmitButton>Post to the wall</SubmitButton></div>
        </form>
        </Disclosure>
      </Card>

      <div className="space-y-2">
        {(messages ?? []).map((m) => (
          <Card key={m.id} className="flex items-start gap-3">
            <span className="text-2xl">{m.emoji ?? "💬"}</span>
            <div className="min-w-0 flex-1">
              <p className="text-fg">{m.body}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                {m.author_label && <span className="text-xs font-semibold text-fg-muted">— {m.author_label}</span>}
                {m.pinned && <Badge tone="beacon"><Pin className="mr-1 h-3 w-3" />Pinned</Badge>}
                {m.bonus_points > 0 && (
                  <Badge tone="green"><Star className="mr-1 h-3 w-3" />+{m.bonus_points} awarded</Badge>
                )}
              </div>
            </div>
            <form action={deleteMessage.bind(null, m.id)}>
              <ConfirmSubmit message="Delete this note from the wall?" aria-label="Delete message" className="h-9 w-9 px-0 py-0">
                <Trash2 className="h-4 w-4" />
              </ConfirmSubmit>
            </form>
          </Card>
        ))}
        {(messages ?? []).length === 0 && (
          <EmptyState
            icon={<MessageSquareHeart className="h-9 w-9" />}
            title="No notes yet"
            body="Post an encouraging note or a heads-up — it shows on the wall’s home screen."
          />
        )}
      </div>
    </>
  );
}
