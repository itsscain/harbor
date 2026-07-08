import { Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/primitives";
import { InlineTip } from "@/components/ui/InlineTip";
import { CommandConsole, type CommandChild } from "@/components/app/CommandConsole";
import { RequestsInbox, type InboxRequest } from "@/components/app/RequestsInbox";
import { readHouseMode } from "@/lib/command";

export const metadata = { title: "Command" };
export const dynamic = "force-dynamic";

export default async function CommandPage({
  searchParams,
}: {
  searchParams: Promise<{ request?: string }>;
}) {
  const { request: focusRequest } = await searchParams;
  const household = await getMyHousehold();
  if (!household) {
    return <EmptyState title="No household yet" body="Your live remote appears here once your household is set up." />;
  }
  const supabase = await createClient();
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const [{ data: kids }, { data: rewards }, { data: reqs }] = await Promise.all([
    supabase
      .from("children")
      .select("id, name, color, photo_url, avatar")
      .eq("household_id", household.id)
      .is("deleted_at", null)
      .order("sort_order"),
    supabase.from("rewards").select("child_id, points_total"),
    supabase
      .from("requests")
      .select("id, child_id, kind, amount, body, status, response_note, created_at, decided_at")
      .eq("household_id", household.id)
      .or(`status.eq.pending,decided_at.gte.${dayAgo}`)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const kidList = kids ?? [];
  const pointsBy = new Map((rewards ?? []).map((r) => [r.child_id, r.points_total]));
  const nameBy = new Map(kidList.map((k) => [k.id, k.name]));

  const children: CommandChild[] = kidList.map((k) => ({
    id: k.id,
    name: k.name,
    color: k.color,
    photo_url: k.photo_url,
    avatar: k.avatar,
    points: pointsBy.get(k.id) ?? 0,
  }));

  const requests: InboxRequest[] = (reqs ?? []).map((r) => ({
    id: r.id,
    childName: nameBy.get(r.child_id) ?? "A child",
    kind: r.kind,
    amount: r.amount,
    body: r.body,
    status: r.status,
    response_note: r.response_note,
    created_at: r.created_at,
    decided_at: r.decided_at,
  }));

  const houseMode = readHouseMode(household.settings as Record<string, unknown> | null);
  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <>
      <PageHeader
        eyebrow="Right now"
        icon={<Radio className="h-6 w-6" />}
        title="Command"
        subtitle="Your live remote for the house — everything here lands on the wall in about a second."
      />

      <InlineTip id="command">
        This is your remote. Grant a star, drop a note on a child&apos;s wall, or flip the whole house into a
        mode — it appears on their screen instantly. When a child asks for something, you&apos;ll get a
        notification and can answer right here.
      </InlineTip>

      {children.length === 0 ? (
        <EmptyState
          icon={<Radio className="h-9 w-9" />}
          title="Add a child first"
          body="Once you've added a child, you can reach their wall from anywhere — stars, notes, calm moments, and house modes."
        />
      ) : (
        <div className="space-y-8">
          <section>
            <SectionHeader eyebrow="Waiting on you" rule>
              Requests{pendingCount > 0 ? ` · ${pendingCount}` : ""}
            </SectionHeader>
            <RequestsInbox initial={requests} focusId={focusRequest} />
          </section>

          <section>
            <CommandConsole kids={children} houseMode={houseMode} />
          </section>
        </div>
      )}
    </>
  );
}
