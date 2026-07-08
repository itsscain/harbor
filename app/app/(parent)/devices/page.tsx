import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Field, Input, Badge, Select, Switch } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmit } from "@/components/ui/ConfirmSubmit";
import { Disclosure } from "@/components/app/Disclosure";
import { ListRow } from "@/components/ui/ListRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { LanternClaimForm } from "@/components/app/LanternClaimForm";
import { formatPairingCode } from "@/lib/codes";
import { addDevice, updateDevice, unpairDevice, deviceCommand, updateDeviceSettings } from "../actions";

export const metadata = { title: "Devices" };
export const dynamic = "force-dynamic";

// The build this deploy is running; a device reporting a different one is stale.
const CURRENT_BUILD = process.env.NEXT_PUBLIC_BUILD_ID || "dev";

type Device = {
  id: string;
  device_label: string | null;
  kind: string;
  child_id: string | null;
  status: string;
  code: string;
  last_synced_at: string | null;
  paired_at: string | null;
  icon: string | null;
  color: string | null;
  app_version: string | null;
  settings_json: Record<string, unknown> | null;
};

function relTime(iso: string | null): string {
  if (!iso) return "not yet";
  const secs = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 120) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

type Tone = "green" | "neutral" | "gray" | "amber";
function deviceStatus(d: Device): { tone: Tone; label: string } {
  if (d.status === "pending") return { tone: "amber", label: "Waiting to pair" };
  if (!d.last_synced_at) return { tone: "gray", label: "Paired · not synced yet" };
  const mins = (Date.now() - new Date(d.last_synced_at).getTime()) / 60000;
  if (mins < 3) return { tone: "green", label: "Online" };
  if (mins < 24 * 60) return { tone: "neutral", label: `Synced ${relTime(d.last_synced_at)}` };
  return { tone: "gray", label: `Last seen ${relTime(d.last_synced_at)}` };
}

const KIND_ICON: Record<string, string> = { wall: "🖥️", outpost: "🛏️", viewer: "🖼️" };

export default async function DevicesPage() {
  const household = await getMyHousehold();
  if (!household) return <Card><p className="text-fg-muted">No household yet.</p></Card>;

  const supabase = await createClient();
  const { data: children } = await supabase
    .from("children")
    .select("id, name, color")
    .eq("household_id", household.id)
    .is("deleted_at", null)
    .order("sort_order");
  const { data: rows } = await supabase
    .from("device_pairings")
    .select("id, device_label, kind, child_id, status, code, last_synced_at, paired_at, icon, color, app_version, settings_json")
    .eq("household_id", household.id)
    .order("created_at");

  const kids = children ?? [];
  const childName = (id: string | null) => kids.find((c) => c.id === id)?.name ?? "a child";
  const devices = (rows ?? []) as Device[];

  const smartName = (d: Device) =>
    d.device_label || (d.kind === "outpost" ? `${childName(d.child_id)}'s Room` : d.kind === "viewer" ? "Viewer" : "Family Wall");
  const typeLabel = (d: Device) =>
    d.kind === "outpost" ? `Room device · ${childName(d.child_id)}` : d.kind === "viewer" ? "Viewer (read-only)" : "Wall";

  return (
    <>
      <PageHeader
        eyebrow="Your harbor"
        title="Devices"
        subtitle="Every screen in your home, in one place — name them, see which is online, and add or remove a wall or room device."
      />

      {devices.length === 0 && (
        <EmptyState
          className="mb-5"
          title="No devices yet"
          body="Add your first wall or room device below, then enter the code it shows you."
        />
      )}

      <div className="space-y-3">
        {devices.map((d) => {
          const st = deviceStatus(d);
          const color = d.color || "#18606f";
          const stale = d.status === "paired" && !!d.app_version && d.app_version !== CURRENT_BUILD;
          const ds = (d.settings_json ?? {}) as Record<string, unknown>;
          return (
            <Card
              key={d.id}
              className="group/disc p-0 [border-left:3px_solid_transparent] hover:[border-left-color:var(--accent)]"
              style={{ ["--accent" as string]: color }}
            >
              <Disclosure
                bodyClassName="px-5 pb-5"
                summary={
                  <ListRow
                    tile={d.icon || KIND_ICON[d.kind] || "🖥️"}
                    title={
                      <span className="flex flex-wrap items-center gap-2">
                        {smartName(d)}
                        <Badge tone={st.tone}>{st.label}</Badge>
                        {stale && <Badge tone="amber">Old version</Badge>}
                      </span>
                    }
                    subtitle={<span>{typeLabel(d)}</span>}
                  />
                }
              >
                {d.status === "pending" ? (
                  <div className="mb-4 rounded-xl bg-surface-2 p-4 text-center">
                    <p className="text-sm text-fg-muted">On the new device, open Harbor and enter:</p>
                    <p className="mt-1 font-display text-3xl font-bold tracking-[0.2em] text-fg">
                      {formatPairingCode(d.code)}
                    </p>
                    <p className="mt-1 text-xs text-fg-muted">It pairs the moment the code is entered.</p>
                  </div>
                ) : (
                  <p className="mb-3 text-sm text-fg-muted">
                    {typeLabel(d)} · {st.label}
                    {d.paired_at ? ` · paired ${relTime(d.paired_at)}` : ""}
                  </p>
                )}

                {d.status === "paired" && (
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <form action={deviceCommand.bind(null, d.id, "identify")}>
                      <SubmitButton size="sm" variant="secondary" savedText="Sent ✓" confirmSaved={false}>
                        👋 Identify
                      </SubmitButton>
                    </form>
                    <form action={deviceCommand.bind(null, d.id, "refresh")}>
                      <SubmitButton size="sm" variant={stale ? "primary" : "ghost"} savedText="Sent ✓" confirmSaved={false}>
                        {stale ? "Update to latest" : "Refresh app"}
                      </SubmitButton>
                    </form>
                    {stale && <span className="text-xs font-medium text-beacon">⚠️ Running an old build</span>}
                  </div>
                )}

                <form action={updateDevice.bind(null, d.id)} className="space-y-3 pt-1">
                  <div className="flex flex-wrap items-end gap-3">
                    <Field label="Icon" className="w-16">
                      <Input name="icon" defaultValue={d.icon ?? KIND_ICON[d.kind] ?? "🖥️"} className="text-center text-xl" />
                    </Field>
                    <Field label="Name" className="min-w-40 flex-1">
                      <Input name="device_label" defaultValue={d.device_label ?? ""} placeholder={smartName(d)} />
                    </Field>
                    <Field label="Color" className="w-28">
                      <Input name="color" type="color" defaultValue={color} className="h-10 p-1" />
                    </Field>
                  </div>
                  <SubmitButton size="sm" variant="secondary" savedText="Saved">Save</SubmitButton>
                </form>

                {d.status === "paired" && (
                  <div className="mt-4 border-t border-line pt-3">
                    <p className="text-eyebrow mb-2 text-fg-muted">Sleep &amp; quiet hours</p>
                    <form action={updateDeviceSettings.bind(null, d.id)} className="space-y-3">
                      <Switch name="screensaver" label="Screensaver when idle" defaultChecked={ds.screensaver !== false} />
                      <div className="flex flex-wrap items-end gap-3">
                        <Field label="Sleep after (sec idle)" className="w-40">
                          <Input
                            name="idleSeconds"
                            type="number"
                            min={30}
                            defaultValue={ds.idleSeconds ? String(ds.idleSeconds) : ""}
                            placeholder="default"
                          />
                        </Field>
                        <Field label="Quiet from" className="w-32">
                          <Input name="quietStart" type="time" defaultValue={(ds.quietStart as string) ?? ""} />
                        </Field>
                        <Field label="Quiet until" className="w-32">
                          <Input name="quietEnd" type="time" defaultValue={(ds.quietEnd as string) ?? ""} />
                        </Field>
                      </div>
                      <SubmitButton size="sm" variant="secondary" savedText="Saved">Save sleep settings</SubmitButton>
                    </form>
                  </div>
                )}

                <form action={unpairDevice.bind(null, d.id)} className="mt-2">
                  <ConfirmSubmit
                    message={`Remove "${smartName(d)}"? It loses access to your household and returns to the pairing screen.`}
                  >
                    Remove device
                  </ConfirmSubmit>
                </form>
              </Disclosure>
            </Card>
          );
        })}
      </div>

      {/* The Lantern (HARBOR_LANTERN_DEVICE.md) — the per-child bedside device shows a code
          the parent claims here. A friendlier, device-first flow than "Add a device". */}
      <Card className="mt-5 p-0">
        <Disclosure
          bodyClassName="px-5 pb-5"
          summary={
            <span className="flex items-center gap-2 text-sm font-semibold text-fg">
              🏮 Set up a Lantern
              <span className="font-normal text-fg-muted">— a child&apos;s own bedside device</span>
            </span>
          }
        >
          <LanternClaimForm kids={kids.map((c) => ({ id: c.id, name: c.name }))} />
        </Disclosure>
      </Card>

      <Card className="mt-3 p-0">
        <Disclosure
          defaultOpen={devices.length === 0}
          bodyClassName="px-5 pb-5"
          summary={<span className="text-sm font-semibold text-fg">➕ Add a device (wall or room screen)</span>}
        >
          <form action={addDevice} className="mt-1 space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Icon" className="w-16">
                <Input name="icon" defaultValue="🖥️" className="text-center text-xl" />
              </Field>
              <Field label="Name" className="min-w-40 flex-1">
                <Input name="device_label" placeholder="Kitchen Wall" />
              </Field>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Type" className="w-44">
                <Select name="kind" defaultValue="wall">
                  <option value="wall">Wall — the whole family</option>
                  <option value="outpost">Room device — one child</option>
                </Select>
              </Field>
              {kids.length > 0 && (
                <Field label="Which child? (room devices)" className="min-w-40 flex-1">
                  <Select name="child_id" defaultValue="">
                    <option value="">— none —</option>
                    {kids.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                </Field>
              )}
            </div>
            <SubmitButton size="sm">Create pairing code</SubmitButton>
            <p className="text-xs text-fg-muted">
              A code appears here — open Harbor on the new device and enter it. A room device shows only its
              child&apos;s world; a wall shows the whole family.
            </p>
          </form>
        </Disclosure>
      </Card>
    </>
  );
}
