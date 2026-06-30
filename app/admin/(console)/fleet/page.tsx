import Link from "next/link";
import { Tablet, RefreshCw, Radar, Wifi, WifiOff, Clock, Pause } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, Badge, Button } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { fleetCommand, refreshStaleWalls } from "./actions";

export const metadata = { title: "Fleet" };
export const dynamic = "force-dynamic";

const STALE_MS = 24 * 60 * 60 * 1000;
const FILTERS = ["all", "online", "offline", "stale", "pending", "paused"] as const;

function ago(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default async function FleetPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const filter = FILTERS.includes(sp.filter as (typeof FILTERS)[number]) ? sp.filter! : "all";

  const supabase = await createClient();
  const [{ data: devices }, { data: customers }] = await Promise.all([
    supabase.from("device_pairings").select("*, households(name)").order("last_synced_at", { ascending: false, nullsFirst: false }),
    supabase.from("customers").select("household_id, name"),
  ]);
  const all = devices ?? [];
  const custByHh = new Map((customers ?? []).filter((c) => c.household_id).map((c) => [c.household_id, c.name]));
  const currentBuild = process.env.VERCEL_GIT_COMMIT_SHA || null;

  const enrich = (d: (typeof all)[number]) => {
    const paired = d.status === "paired";
    const offline = paired && !d.paused && (!d.last_synced_at || Date.now() - new Date(d.last_synced_at).getTime() > STALE_MS);
    const stale = paired && !d.paused && currentBuild != null && !!d.app_version && d.app_version !== currentBuild;
    const unknownBuild = paired && !d.paused && !d.app_version;
    return { d, paired, offline, stale: stale || (currentBuild != null && unknownBuild), online: paired && !offline };
  };
  const rows = all.map(enrich);

  const counts = {
    all: rows.length,
    online: rows.filter((r) => r.online).length,
    offline: rows.filter((r) => r.offline).length,
    stale: rows.filter((r) => r.stale).length,
    pending: rows.filter((r) => r.d.pending_command).length,
    paused: rows.filter((r) => r.d.paused).length,
  };
  const shown = rows.filter((r) => {
    if (filter === "all") return true;
    if (filter === "online") return r.online;
    if (filter === "offline") return r.offline;
    if (filter === "stale") return r.stale;
    if (filter === "pending") return !!r.d.pending_command;
    if (filter === "paused") return r.d.paused;
    return true;
  });

  return (
    <>
      <PageHeader
        eyebrow="Run"
        icon={<Tablet className="h-6 w-6" />}
        title="Device Fleet"
        subtitle="Every wall & Lantern across all customers — version, health, and one-tap remote fixes."
        actions={
          counts.stale > 0 && currentBuild ? (
            <form action={refreshStaleWalls}>
              <SubmitButton variant="beacon" pendingText="Sending…">
                <RefreshCw className="h-4 w-4" /> Refresh {counts.stale} stale wall{counts.stale === 1 ? "" : "s"}
              </SubmitButton>
            </form>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "all" ? "/admin/fleet" : `?filter=${f}`}
            className={
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold capitalize transition " +
              (filter === f ? "bg-harbor text-white" : "bg-white text-harbor ring-1 ring-harbor-100 hover:bg-harbor-50")
            }
          >
            {f}
            <span className={"tabular-nums " + (filter === f ? "text-white/70" : "text-muted")}>{counts[f]}</span>
          </Link>
        ))}
      </div>

      {!currentBuild && (
        <p className="mb-4 rounded-xl bg-amber-50 px-3.5 py-2 text-sm text-amber-700">
          Stale-build detection is only available on a deployed build (no version to compare against in dev).
        </p>
      )}

      <div className="grid gap-3">
        {shown.map(({ d, online, offline, stale, paired }) => {
          const hh = (d.households as { name: string } | null)?.name;
          const cust = d.household_id ? custByHh.get(d.household_id) : undefined;
          return (
            <Card key={d.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-title text-harbor">{d.device_label || (d.kind === "outpost" ? "Lantern" : "Wall")}</h2>
                  <Badge tone="neutral">{d.kind === "outpost" ? "Lantern" : "Wall"}</Badge>
                  {!paired && <Badge tone="gray">Pending pair</Badge>}
                  {paired && (online ? (
                    <Badge tone="green">
                      <Wifi className="mr-1 inline h-3 w-3" />Online
                    </Badge>
                  ) : (
                    <Badge tone="amber">
                      <WifiOff className="mr-1 inline h-3 w-3" />Offline
                    </Badge>
                  ))}
                  {stale && <Badge tone="amber">Old build</Badge>}
                  {d.clock_suspect && (
                    <Badge tone="red">
                      <Clock className="mr-1 inline h-3 w-3" />Clock
                    </Badge>
                  )}
                  {d.paused && (
                    <Badge tone="gray">
                      <Pause className="mr-1 inline h-3 w-3" />Paused
                    </Badge>
                  )}
                  {d.pending_command && <Badge tone="blue">⟳ {d.pending_command} queued</Badge>}
                </div>
                <p className="text-sm text-muted">
                  {hh ?? "Unprovisioned"}
                  {cust && cust !== hh ? ` · ${cust}` : ""}
                  {" · "}seen {ago(d.last_synced_at)}
                  {d.app_version ? ` · v ${String(d.app_version).slice(0, 8)}` : " · version unknown"}
                </p>
              </div>
              {paired && (
                <div className="flex shrink-0 items-center gap-2">
                  <form action={fleetCommand.bind(null, d.id, "identify")}>
                    <Button type="submit" variant="ghost" size="sm">
                      <Radar className="h-4 w-4" /> Identify
                    </Button>
                  </form>
                  <form action={fleetCommand.bind(null, d.id, "refresh")}>
                    <Button type="submit" variant="secondary" size="sm">
                      <RefreshCw className="h-4 w-4" /> Refresh
                    </Button>
                  </form>
                </div>
              )}
            </Card>
          );
        })}
        {shown.length === 0 && (
          <EmptyState
            icon={<Tablet className="h-9 w-9" />}
            title={all.length === 0 ? "No devices yet" : "Nothing in this view"}
            body={all.length === 0 ? "Devices appear here once you provision a household and pair a wall." : "Try a different filter."}
          />
        )}
      </div>
    </>
  );
}
