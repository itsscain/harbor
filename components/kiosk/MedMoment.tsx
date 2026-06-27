"use client";

import { useEffect, useRef, useState } from "react";
import { X, Pill, Check, Utensils, ShieldCheck } from "lucide-react";
import type { KioskMedication } from "@/lib/kiosk/types";
import { ParentGate } from "./ParentGate";
import { speak, chime, haptic, HAPTIC } from "@/lib/kiosk/feedback";

/** The calm, dignified med-taking moment (§4.3). A supportive ritual — NOT a dosing
 *  system, NO points/confetti. For parent-administered meds, the confirm is PIN-gated. */
export function MedMoment({
  med,
  doseTime,
  accent,
  verifyPin,
  readAloud,
  onConfirm,
  onClose,
}: {
  med: KioskMedication;
  doseTime: string;
  accent: string;
  verifyPin: (pin: string) => Promise<boolean>;
  readAloud: boolean;
  onConfirm: (by: "child" | "parent") => void;
  onClose: () => void;
}) {
  const [gate, setGate] = useState(false);
  const [done, setDone] = useState(false);
  const spoke = useRef(false);

  useEffect(() => {
    if (!spoke.current && readAloud) {
      spoke.current = true;
      speak("Time for your medicine", readAloud);
    }
  }, [readAloud]);

  function confirm(by: "child" | "parent") {
    if (done) return;
    setDone(true);
    chime(true);
    haptic(HAPTIC.arrive, true);
    if (readAloud) speak("Nice. That's looking after yourself.", readAloud);
    setTimeout(() => onConfirm(by), 1500);
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      style={{ ["--accent" as string]: accent }}
    >
      <div className="relative w-full max-w-md rounded-3xl bg-kpanel p-7 text-center shadow-k-pop ring-1 ring-kline/40">
        <button onClick={onClose} aria-label="Close" className="kiosk-tap absolute right-4 top-4 rounded-full p-1.5 text-kmute">
          <X className="h-6 w-6" />
        </button>

        {!done ? (
          <>
            <span
              className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl text-5xl"
              style={{ background: `${accent}1f`, color: accent }}
            >
              {med.icon || <Pill className="h-12 w-12" />}
            </span>
            <h2 className="mt-5 font-display text-3xl font-bold text-ktext">{med.name}</h2>
            {med.dose && <p className="mt-1 text-lg text-kmute">{med.dose}</p>}
            {med.helps_note && (
              <p className="mt-4 rounded-2xl bg-kraise px-4 py-3 text-base text-ktext">{med.helps_note}</p>
            )}
            {med.with_food && (
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-kmute">
                <Utensils className="h-4 w-4" /> Take with food
              </p>
            )}

            <div className="mt-7">
              {med.parent_administered ? (
                <>
                  <p className="mb-2 text-sm text-kmute">A grown-up helps with this one.</p>
                  <button
                    onClick={() => setGate(true)}
                    className="kiosk-tap inline-flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-lg font-bold text-white"
                    style={{ background: accent }}
                  >
                    <ShieldCheck className="h-6 w-6" /> Grown-up: confirm given
                  </button>
                </>
              ) : (
                <button
                  onClick={() => confirm("child")}
                  className="kiosk-tap inline-flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-lg font-bold text-white"
                  style={{ background: accent }}
                >
                  <Check className="h-6 w-6" /> I took it
                </button>
              )}
              <button onClick={onClose} className="kiosk-tap mt-2 w-full rounded-2xl py-3 text-base font-semibold text-kmute">
                Not yet
              </button>
            </div>

            <p className="mt-5 text-xs leading-relaxed text-kmute/70">
              A gentle reminder, not medical advice. A grown-up is in charge of medicine.
            </p>
          </>
        ) : (
          <div className="py-10">
            <span
              className="mx-auto flex h-24 w-24 items-center justify-center rounded-full text-white"
              style={{ background: accent }}
            >
              <Check className="h-12 w-12" />
            </span>
            <p className="mt-5 font-display text-2xl font-bold text-ktext">Nice — that&apos;s looking after yourself.</p>
          </div>
        )}
      </div>

      {gate && (
        <ParentGate
          verify={verifyPin}
          onSuccess={() => {
            setGate(false);
            confirm("parent");
          }}
          onCancel={() => setGate(false)}
        />
      )}
    </div>
  );
}
