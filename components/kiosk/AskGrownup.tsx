"use client";

import { useState } from "react";
import { HandHeart, X, Check } from "lucide-react";
import type { useKiosk } from "./useKiosk";
import { KCard } from "./ui";
import { Pressable } from "./Pressable";
import { REQUEST_KINDS, type RequestKind } from "@/lib/command";
import { feedback } from "@/lib/kiosk/feedback";
import { cn } from "@/lib/cn";

type Kiosk = ReturnType<typeof useKiosk>;
const SCREEN_MINUTES = [15, 30, 60];

/**
 * Command §3 — the kid's side of requests. A calm "Ask a grown-up" button that, when
 * tapped, offers a few simple asks (screen time, a treat, help, going outside…). Sending
 * queues a points-free request that fires a push to the parents' phones; they answer from
 * the Harbor app and the wall shows the outcome (WallCommandLayer).
 */
export function AskGrownup({
  kiosk,
  childId,
  childName,
  haptics = true,
  sound = true,
}: {
  kiosk: Kiosk;
  childId: string;
  childName: string;
  haptics?: boolean;
  sound?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pickAmount, setPickAmount] = useState<RequestKind | null>(null);
  const [sent, setSent] = useState(false);

  const close = () => {
    setOpen(false);
    setPickAmount(null);
    setSent(false);
  };

  const send = (kind: RequestKind, amount?: number) => {
    kiosk.requestSomething(childId, kind, { amount: amount ?? null });
    feedback("select", { sound, haptics });
    setSent(true);
    window.setTimeout(close, 1900);
  };

  const choose = (kind: RequestKind) => {
    feedback("tap", { sound, haptics });
    if (kind === "screen_time") setPickAmount(kind);
    else send(kind);
  };

  // Requests ride the (Plus-only) sync channel — a free wall can't deliver them, so don't
  // offer the button there (it would enqueue and never send, then falsely say "Sent!").
  if (!kiosk.state?.snapshot.household.plus_active) return null;

  return (
    <>
      <Pressable
        haptics={haptics}
        sound={sound}
        fx="tap"
        onClick={() => {
          feedback("navigate-in", { sound, haptics });
          setOpen(true);
        }}
        className="kiosk-tap inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3.5 py-2 text-sm font-semibold text-ktext ring-1 ring-white/10"
      >
        <HandHeart className="h-4 w-4" /> Ask
      </Pressable>

      {open && (
        <div className="fixed inset-0 z-[48] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <KCard className="w-full max-w-md rounded-b-none rounded-t-2xl p-6 shadow-k-pop sm:rounded-2xl">
            {sent ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/15 text-3xl">✅</span>
                <h2 className="font-display text-2xl font-bold text-ktext">Sent!</h2>
                <p className="text-kmute">A grown-up will get your message and answer soon.</p>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-kmute">{childName}</p>
                    <h2 className="font-display text-2xl font-bold text-ktext">
                      {pickAmount ? "How much time?" : "Ask a grown-up"}
                    </h2>
                  </div>
                  <Pressable
                    haptics={haptics}
                    fx="back"
                    onClick={pickAmount ? () => setPickAmount(null) : close}
                    aria-label="Close"
                    className="kiosk-tap flex h-11 w-11 items-center justify-center rounded-full bg-kraise text-kmute ring-1 ring-kline/55"
                  >
                    <X className="h-5 w-5" />
                  </Pressable>
                </div>

                {pickAmount ? (
                  <div className="grid grid-cols-3 gap-3">
                    {SCREEN_MINUTES.map((m) => (
                      <button
                        key={m}
                        onClick={() => send("screen_time", m)}
                        className="kiosk-tap flex flex-col items-center gap-1 rounded-2xl bg-kraise py-6 font-semibold text-ktext ring-1 ring-kline/55 active:scale-95"
                      >
                        <span className="font-display text-3xl font-bold text-kwater">{m}</span>
                        <span className="text-sm text-kmute">min</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {REQUEST_KINDS.map((k) => (
                      <button
                        key={k.kind}
                        onClick={() => choose(k.kind)}
                        className={cn(
                          "kiosk-tap flex items-center gap-3 rounded-2xl bg-kraise px-4 py-4 text-left font-semibold text-ktext ring-1 ring-kline/55 active:scale-95",
                        )}
                      >
                        <span className="text-2xl leading-none">{k.emoji}</span>
                        <span>{k.label}</span>
                      </button>
                    ))}
                  </div>
                )}
                <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-kmute">
                  <Check className="h-3.5 w-3.5" /> A grown-up sees this on their phone
                </p>
              </>
            )}
          </KCard>
        </div>
      )}
    </>
  );
}
