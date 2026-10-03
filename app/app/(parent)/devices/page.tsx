import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { ScreensView, type Screen } from "@/components/app/devices/ScreensView";

export const metadata = { title: "Screens" };
export const dynamic = "force-dynamic";

// The build this deploy is running; a screen reporting a different one needs an update.
const CURRENT_BUILD = process.env.NEXT_PUBLIC_BUILD_ID || "dev";
const KIND_ICON: Record<string, string> = { wall: "🖥️", outpost: "🛏️", viewer: "🖼️" };

function ago(iso: string, now: number): string {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return hrs < 24 ? `${hrs} hr ago` : `${Math.round(hrs / 24)} days ago`;
}

type Row = {
  id: string;
  device_label: string | null;
  kind: string;
  child_id: string | null;
  status: string;
  code: string;
  last_synced_at: string | null;
  icon: string | null;
  app_version: string | null;
  settings_json: unknown;
};

/** Device rows → the list's plain-language screens (status computed against "now"). */
function toScreens(rows: Row[], kids: { id: string; name: string }[]): Screen[] {
  const nameOf = (id: string | null) => kids.find((k) => k.id === id)?.name ?? "a kid";
  const now = Date.now();

  return rows.map((d) => {
    const ds = (d.settings_json ?? {}) as Record<string, unknown>;
    const mins = d.last_synced_at ? (now - new Date(d.last_synced_at).getTime()) / 60000 : null;
    const status: Screen["status"] = d.status === "pending" ? "pending" : mins == null ? "new" : mins < 3 ? "online" : mins < 24 * 60 ? "recent" : "away";
    const statusLabel =
      status === "pending" ? "Waiting" : status === "online" ? "Online" : status === "new" ? "Connected" : status === "recent" ? `Seen ${ago(d.last_synced_at!, now)}` : `Offline · ${ago(d.last_synced_at!, now)}`;
    return {
      id: d.id,
      name: d.device_label || (d.kind === "outpost" ? `${nameOf(d.child_id)}'s screen` : d.kind === "viewer" ? "Viewer" : "Family wall"),
      icon: d.icon || KIND_ICON[d.kind] || "🖥️",
      typeLabel: d.kind === "outpost" ? `${nameOf(d.child_id)}'s bedroom screen` : d.kind === "viewer" ? "Look-only screen" : "Family wall",
      status,
      statusLabel,
      code: d.code,
      stale: d.status === "paired" && !!d.app_version && d.app_version !== CURRENT_BUILD,
      sleep: {
        screensaver: ds.screensaver !== false,
        idleSeconds: typeof ds.idleSeconds === "number" ? ds.idleSeconds : null,
        quietStart: typeof ds.quietStart === "string" ? ds.quietStart : null,
        quietEnd: typeof ds.quietEnd === "string" ? ds.quietEnd : null,
      },
    };
  });
}

// Screens — the wall, bedroom screens and Lanterns: one list, one "Add a screen".
export default async function ScreensPage({ searchParams }: { searchParams: Promise<{ add?: string }> }) {
  const household = await getMyHousehold();
  if (!household) return <PageHeader title="Screens" subtitle="No household yet." />;
  const { add } = await searchParams;
  const supabase = await createClient();
  const [{ data: kids }, { data: rows }] = await Promise.all([
    supabase.from("children").select("id, name, avatar, photo_url, color").eq("household_id", household.id).is("deleted_at", null).order("sort_order"),
    supabase
      .from("device_pairings")
      .select("id, device_label, kind, child_id, status, code, last_synced_at, icon, app_version, settings_json")
      .eq("household_id", household.id)
      .order("created_at"),
  ]);
  const screens = toScreens(rows ?? [], kids ?? []);

  return (
    <>
      <PageHeader title="Screens" subtitle="Your family wall and any bedroom screens — see what's online, rename, or add another." />
      <ScreensView screens={screens} kids={kids ?? []} autoAdd={add === "1"} />
    </>
  );
}
