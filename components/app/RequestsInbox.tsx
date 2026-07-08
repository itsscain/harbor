"use client";

import { useState, useTransition, useEffect } from "react";
import { Check, X, Inbox } from "lucide-react";
import { Card, Button, Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { requestKindMeta, requestSummary } from "@/lib/command";
import { decideRequest } from "@/app/app/(parent)/command/actions";

export type InboxRequest = {
  id: string;
  childName: string;
  kind: string;
  amount: number | null;
  body: string | null;
  status: string;
  response_note: string | null;
  created_at: string;
  decided_at: string | null;
};

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function RequestsInbox({
  initial,
  focusId,
}: {
  initial: InboxRequest[];
  focusId?: string;
}) {
  const [rows, setRows] = useState<InboxRequest[]>(initial);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!focusId) return;
    document.getElementById(`req-${focusId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusId]);

  const decide = (id: string, decision: "approved" | "denied") => {
    start(async () => {
      const res = await decideRequest({ id, decision });
      if (res.ok) {
        setRows((rs) =>
          rs.map((r) => (r.id === id ? { ...r, status: decision, decided_at: new Date().toISOString() } : r)),
        );
      }
    });
  };

  const pendingRows = rows.filter((r) => r.status === "pending");
  const decidedRows = rows.filter((r) => r.status !== "pending").slice(0, 6);

  if (rows.length === 0) {
    return (
      <Card className="flex items-center gap-3 p-5 text-sm text-fg-muted">
        <Inbox className="h-5 w-5 text-fg-subtle" />
        No requests yet. When a child taps <span className="font-semibold text-fg">Ask a grown-up</span> on the wall, it lands here.
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {pendingRows.map((r) => {
        const meta = requestKindMeta(r.kind);
        const focused = r.id === focusId;
        return (
          <Card
            key={r.id}
            id={`req-${r.id}`}
            className={cn("p-4", focused && "ring-2 ring-accent")}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl leading-none">{meta.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-fg">
                  <span className="font-semibold">{r.childName}</span> is asking for{" "}
                  <span className="font-semibold">{requestSummary(r.kind, r.amount, r.body)}</span>
                </p>
                <p className="mt-0.5 text-xs text-fg-muted">{ago(r.created_at)}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button size="sm" onClick={() => decide(r.id, "approved")} disabled={pending}>
                <Check className="h-4 w-4" /> Approve
              </Button>
              <Button size="sm" variant="secondary" onClick={() => decide(r.id, "denied")} disabled={pending}>
                <X className="h-4 w-4" /> Not now
              </Button>
            </div>
          </Card>
        );
      })}

      {decidedRows.length > 0 && (
        <div className="pt-1">
          <p className="text-eyebrow mb-2 text-fg-subtle">Recently answered</p>
          <div className="space-y-2">
            {decidedRows.map((r) => {
              const meta = requestKindMeta(r.kind);
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-2.5">
                  <span className="text-lg">{meta.emoji}</span>
                  <p className="min-w-0 flex-1 truncate text-sm text-fg-muted">
                    <span className="font-medium text-fg">{r.childName}</span> · {requestSummary(r.kind, r.amount, r.body)}
                  </p>
                  <Badge tone={r.status === "approved" ? "green" : "gray"}>
                    {r.status === "approved" ? "Approved" : "Not now"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
