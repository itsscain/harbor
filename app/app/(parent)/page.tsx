import Link from "next/link";
import { ChevronRight, Tablet, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold, plusActive } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Badge, Input, Field, Button } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { formatPairingCode } from "@/lib/pairing-format";
import { titleCase } from "@/lib/format";
import { addChild } from "./actions";

export const metadata = { title: "Home" };
export const dynamic = "force-dynamic";

export default async function ParentHome() {
  const household = await getMyHousehold();
  const supabase = await createClient();

  if (!household) {
    return (
      <Card>
        <h1 className="font-display text-xl font-bold text-harbor">
          No household yet
        </h1>
        <p className="mt-2 text-sm text-muted">
          Your Harbor household will appear here once it&apos;s set up. If you
          just got an invite, check your email to finish creating your account.
        </p>
      </Card>
    );
  }

  const [{ data: children }, { data: pairings }, { data: sub }] = await Promise.all([
    supabase
      .from("children")
      .select("*")
      .eq("household_id", household.id)
      .is("deleted_at", null)
      .order("sort_order"),
    supabase
      .from("device_pairings")
      .select("code, status")
      .eq("household_id", household.id)
      .order("created_at"),
    supabase
      .from("plus_subscriptions")
      .select("status")
      .eq("household_id", household.id)
      .maybeSingle(),
  ]);

  const isPlus = plusActive(sub?.status);

  return (
    <>
      <PageHeader
        title={household.name}
        subtitle="Manage routines and push them to your wall."
        actions={isPlus ? <Badge tone="green">Plus</Badge> : undefined}
      />

      {!isPlus && (
        <Link href="/app/billing">
          <Card className="mb-4 flex items-center gap-3 border-beacon/40 bg-beacon-soft/40">
            <Sparkles className="h-6 w-6 shrink-0 text-beacon" />
            <div className="flex-1">
              <p className="font-semibold text-harbor">Your wall works free, forever.</p>
              <p className="text-sm text-muted">
                Harbor Plus adds cloud backup, edit-from-here sync, and insights.
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted" />
          </Card>
        </Link>
      )}

      <h2 className="mb-3 font-display text-lg font-bold text-harbor">Children</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {(children ?? []).map((c) => (
          <Link key={c.id} href={`/app/children/${c.id}`}>
            <Card className="flex items-center gap-3 hover:border-water/50">
              <span className="text-4xl">{c.avatar ?? "🙂"}</span>
              <span className="flex-1 font-display text-lg font-bold text-harbor">
                {c.name}
              </span>
              <ChevronRight className="h-5 w-5 text-muted" />
            </Card>
          </Link>
        ))}
        {(children ?? []).length === 0 && (
          <p className="text-sm text-muted">No children yet — add your first below.</p>
        )}
      </div>

      <Card className="mt-4">
        <h3 className="font-display text-base font-bold text-harbor">Add a child</h3>
        <form action={addChild} className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <Field label="Name">
            <Input name="name" required placeholder="Child's name" />
          </Field>
          <Field label="Emoji">
            <Input name="avatar" placeholder="🦊" className="w-24 text-center text-xl" />
          </Field>
          <div className="flex items-end">
            <SubmitButton>Add</SubmitButton>
          </div>
        </form>
      </Card>

      <Card className="mt-4">
        <div className="flex items-center gap-2">
          <Tablet className="h-5 w-5 text-water" />
          <h3 className="font-display text-base font-bold text-harbor">
            Wall devices
          </h3>
        </div>
        <ul className="mt-3 space-y-2">
          {(pairings ?? []).map((p) => (
            <li
              key={p.code}
              className="flex items-center justify-between rounded-lg bg-harbor-50 px-3 py-2"
            >
              <span className="font-mono font-bold tracking-wider text-harbor">
                {formatPairingCode(p.code)}
              </span>
              <Badge tone={p.status === "paired" ? "green" : "amber"}>
                {titleCase(p.status)}
              </Badge>
            </li>
          ))}
          {(pairings ?? []).length === 0 && (
            <li className="text-sm text-muted">
              No devices yet. Your installer will pair one during setup.
            </li>
          )}
        </ul>
      </Card>
    </>
  );
}
