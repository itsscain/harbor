import { Sparkles, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, Badge } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmit } from "@/components/ui/ConfirmSubmit";
import { releaseFounderSignup, convertFounderToCustomer } from "./actions";
import type { FounderSignup, Build } from "@/lib/types";

export const metadata = { title: "Founder Signups" };
export const dynamic = "force-dynamic";

const ACTIVE = ["reserved", "approved", "scheduled", "invoiced", "active"];
const STATUS_TONE: Record<string, string> = {
  reserved: "amber",
  approved: "blue",
  scheduled: "blue",
  invoiced: "blue",
  active: "green",
  released: "gray",
  waitlist: "gray",
};

export default async function FounderSignupsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: signups }, { data: builds }, { data: prog }] = await Promise.all([
    supabase.from("founder_signups").select("*").order("created_at", { ascending: false }),
    supabase.from("builds").select("id, name"),
    supabase.from("founder_program").select("cap").maybeSingle(),
  ]);
  const rows = (signups ?? []) as FounderSignup[];
  const buildName = new Map((builds ?? []).map((b) => [(b as Pick<Build, "id" | "name">).id, (b as Pick<Build, "id" | "name">).name]));
  const cap = (prog as { cap?: number } | null)?.cap ?? 15;
  const taken = rows.filter((r) => ACTIVE.includes(r.status)).length;
  const waitlist = rows.filter((r) => r.status === "waitlist").length;

  return (
    <>
      <PageHeader
        eyebrow="Run"
        icon={<Sparkles className="h-6 w-6" />}
        title="Founder Signups"
        subtitle="Inbound founders from the public funnel. Review, then move them through to install."
        actions={
          <a href="/founders" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-harbor-50 px-3.5 py-2 text-sm font-semibold text-harbor">
            View public page <ExternalLink className="h-4 w-4" />
          </a>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="text-center"><p className="font-display text-2xl font-bold text-harbor">{taken}</p><p className="text-xs text-muted">spots claimed</p></Card>
        <Card className="text-center"><p className="font-display text-2xl font-bold text-harbor">{Math.max(0, cap - taken)}</p><p className="text-xs text-muted">of {cap} left</p></Card>
        <Card className="text-center"><p className="font-display text-2xl font-bold text-harbor">{rows.filter((r) => r.status === "reserved").length}</p><p className="text-xs text-muted">to review</p></Card>
        <Card className="text-center"><p className="font-display text-2xl font-bold text-harbor">{waitlist}</p><p className="text-xs text-muted">waitlist</p></Card>
      </div>

      {rows.length === 0 ? (
        <Card className="text-center text-muted">No founder signups yet. Share the public link to start reserving founders.</Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const fam = (r.family_info ?? {}) as { kids_count?: number };
            const q = (r.quote ?? {}) as { total?: number };
            return (
              <Card key={r.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-lg font-bold text-harbor">{r.name}</p>
                    {r.founder_number ? <span className="text-sm font-semibold text-water">Founder #{r.founder_number}</span> : null}
                    <Badge tone={STATUS_TONE[r.status] ?? "default"}>{r.status}</Badge>
                  </div>
                  <p className="text-sm text-muted">
                    {r.email}
                    {r.phone ? ` · ${r.phone}` : ""}
                    {r.city ? ` · ${r.city}${r.state ? ", " + r.state : ""}` : ""}
                  </p>
                  <p className="text-sm text-muted">
                    {buildName.get(r.intended_build_id ?? "") ?? "—"}
                    {fam.kids_count ? ` · ${fam.kids_count} kid${fam.kids_count === 1 ? "" : "s"}` : ""}
                    {q.total ? ` · est. $${Number(q.total).toLocaleString()} (pay later)` : ""}
                    {r.heard_from ? ` · via ${r.heard_from}` : ""}
                  </p>
                </div>
                {ACTIVE.includes(r.status) && (
                  <div className="flex shrink-0 items-center gap-2">
                    {r.customer_id ? (
                      <a
                        href={`/admin/customers/${r.customer_id}`}
                        className="inline-flex items-center rounded-xl bg-harbor-50 px-3.5 py-2 text-sm font-semibold text-harbor"
                      >
                        View customer
                      </a>
                    ) : r.status === "reserved" ? (
                      <form action={convertFounderToCustomer.bind(null, r.id)}>
                        <SubmitButton size="sm" variant="primary">Approve → CRM</SubmitButton>
                      </form>
                    ) : null}
                    <form action={releaseFounderSignup.bind(null, r.id)}>
                      <ConfirmSubmit
                        title="Release this spot?"
                        message="It frees up and the public counter goes back up."
                        confirmLabel="Release"
                      >
                        Release
                      </ConfirmSubmit>
                    </form>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
