import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { FamilyList, type ListItem } from "@/components/app/plan/FamilyLists";
import { cn } from "@/lib/cn";

export const metadata = { title: "Lists" };
export const dynamic = "force-dynamic";

// The wall's two shared lists — Groceries and To-do — on your phone.
export default async function ListsPage({ searchParams }: { searchParams: Promise<{ list?: string }> }) {
  const household = await getMyHousehold();
  if (!household) return <PageHeader title="Lists" subtitle="No household yet." />;
  const { list } = await searchParams;
  const kind = list === "todo" ? "todo" : "grocery";
  const supabase = await createClient();
  const { data } = await supabase
    .from("list_items")
    .select("id, name, checked, list_kind, added_by_label, created_at")
    .eq("household_id", household.id)
    .in("list_kind", ["grocery", "todo"])
    .is("deleted_at", null)
    .order("created_at");
  const rows = data ?? [];
  const items: ListItem[] = rows
    .filter((r) => r.list_kind === kind)
    .map((r) => ({ id: r.id, name: r.name, checked: r.checked, addedBy: r.added_by_label }));
  const openCount = (k: string) => rows.filter((r) => r.list_kind === k && !r.checked).length;

  const tabs = [
    { key: "grocery", label: "Groceries", href: "/app/lists" },
    { key: "todo", label: "To-do", href: "/app/lists?list=todo" },
  ];

  return (
    <>
      <PageHeader title="Lists" subtitle="The same lists as the wall — add here or there." />
      <nav aria-label="Lists" className="mb-5 flex gap-1 rounded-2xl border border-line bg-surface p-1">
        {tabs.map((t) => {
          const on = t.key === kind;
          const n = openCount(t.key);
          return (
            <Link
              key={t.key}
              href={t.href}
              replace
              scroll={false}
              aria-current={on ? "page" : undefined}
              className={cn(
                "flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition",
                on ? "bg-accent/15 text-fg" : "text-fg-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              {t.label}
              {n > 0 && <span className="rounded-full bg-surface-2 px-1.5 text-xs tabular-nums text-fg-muted">{n}</span>}
            </Link>
          );
        })}
      </nav>
      <FamilyList key={kind} kind={kind} items={items} />
    </>
  );
}
