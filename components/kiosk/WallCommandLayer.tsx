"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { useKiosk } from "./useKiosk";
import { feedback } from "@/lib/kiosk/feedback";
import { requestSummary } from "@/lib/command";

type Kiosk = ReturnType<typeof useKiosk>;

type Toast = {
  key: string;
  emoji: string;
  title: string;
  body?: string | null;
  tint: string;
};

const CMD_STYLE: Record<string, { emoji: string; title: string; tint: string; fx: Parameters<typeof feedback>[0] }> = {
  attention: { emoji: "👋", title: "Look up!", tint: "#f6b23d", fx: "tab-switch" },
  praise: { emoji: "⭐", title: "Great job!", tint: "#37d39b", fx: "reward" },
  note: { emoji: "💬", title: "A note for you", tint: "#56c7e0", fx: "navigate-in" },
  calm: { emoji: "🌬️", title: "Let's take a calm breath", tint: "#7c6cf0", fx: "break" },
};

/**
 * Parent Power on the wall — shows the live "pops" a parent fires from their phone
 * (a note, a praise burst, an attention nudge, or a calm moment) and the outcome of a
 * kid's request (a grown-up said yes / maybe later). "Seen" is tracked in refs, seeded
 * on mount, so nothing replays on a reconnect. Toasts are QUEUED (one at a time), so a
 * burst of pops all show. Request decisions surface whether we watched them go
 * pending→decided live OR they landed between polls / while the wall slept (guarded by
 * decided_at so boot/reconnect never replays old decisions).
 */
export function WallCommandLayer({ kiosk, onStartCalm }: { kiosk: Kiosk; onStartCalm?: () => void }) {
  const commands = kiosk.state?.snapshot.wall_commands ?? [];
  const requests = kiosk.state?.snapshot.requests ?? [];

  const seenCmd = useRef<Set<string>>(new Set());
  const seenReq = useRef<Map<string, string>>(new Map());
  const seeded = useRef(false);
  const mountedAt = useRef(Date.now());
  const queue = useRef<Toast[]>([]);
  const showing = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const [toast, setToast] = useState<Toast | null>(null);

  const pump = useCallback(() => {
    const next = queue.current.shift();
    if (!next) {
      showing.current = false;
      setToast(null);
      return;
    }
    showing.current = true;
    setToast(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(pump, 4200);
  }, []);

  const enqueue = useCallback(
    (t: Toast) => {
      queue.current.push(t);
      if (!showing.current) pump();
    },
    [pump],
  );

  // Seed once so pre-existing rows (from the boot pull) never replay as fresh pops.
  if (!seeded.current) {
    for (const c of commands) seenCmd.current.add(c.id);
    for (const r of requests) seenReq.current.set(r.id, r.status);
    seeded.current = true;
  }

  useEffect(() => {
    const now = Date.now();
    // New parent → wall pops.
    for (const c of commands) {
      if (seenCmd.current.has(c.id)) continue;
      seenCmd.current.add(c.id);
      if (new Date(c.expires_at).getTime() <= now) continue; // stale
      const st = CMD_STYLE[c.kind] ?? CMD_STYLE.note;
      feedback(st.fx);
      enqueue({ key: c.id, emoji: c.emoji || st.emoji, title: st.title, body: c.body, tint: st.tint });
      if (c.kind === "calm") onStartCalm?.();
    }
    // Kid request → decided.
    for (const r of requests) {
      const prev = seenReq.current.get(r.id);
      const decided = r.status !== "pending";
      // A decision the wall didn't personally watch go pending→decided still shows, IF the
      // decision happened since this session mounted (covers a decision landing between the
      // 30s polls, or while the wall was briefly asleep/offline). The server keeps decided
      // rows for 15 min so we can. Boot-seeded rows (prev defined) and genuinely old
      // reconnect rows (decided before mount) never replay.
      const freshDecision =
        decided && r.decided_at != null && Date.parse(r.decided_at) >= mountedAt.current - 5000;
      const shouldToast = decided && (prev === "pending" || (prev === undefined && freshDecision));
      seenReq.current.set(r.id, r.status);
      if (shouldToast) {
        const yes = r.status === "approved";
        feedback(yes ? "reward" : "break");
        enqueue({
          key: `${r.id}:${r.status}`,
          emoji: yes ? "🎉" : "💛",
          title: yes ? "A grown-up said yes!" : "Maybe later",
          body: requestSummary(r.kind, r.amount, r.body),
          tint: yes ? "#37d39b" : "#56c7e0",
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commands, requests]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (!toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[46] flex justify-center px-4">
      <div
        key={toast.key}
        className="animate-sheet-up flex max-w-md items-center gap-3 rounded-2xl px-5 py-3.5 text-left shadow-k-pop backdrop-blur"
        style={{ background: `${toast.tint}1f`, boxShadow: `0 0 34px -10px ${toast.tint}`, border: `1px solid ${toast.tint}66` }}
      >
        <span className="text-3xl leading-none">{toast.emoji}</span>
        <div className="min-w-0">
          <p className="font-display text-lg font-bold text-ktext">{toast.title}</p>
          {toast.body && <p className="truncate text-sm text-kmute">{toast.body}</p>}
        </div>
      </div>
    </div>
  );
}
