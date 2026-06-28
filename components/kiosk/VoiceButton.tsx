"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Loader2, X, Volume2 } from "lucide-react";
import { speak, stopSpeaking } from "@/lib/kiosk/feedback";
import { todayKey } from "@/lib/kiosk/db";
import { cn } from "@/lib/cn";

/** Minimal Web Speech typings (not in the standard DOM lib). */
type SRResult = ArrayLike<{ transcript: string }> & { isFinal: boolean };
type SREvent = { resultIndex: number; results: ArrayLike<SRResult> };
type SR = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SREvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
};
type SRCtor = new () => SR;

const WAKE_KEY = "harbor-wake-on";
const WAKE_RE = /hey,?\s*harbor[\s,.!?]*(.*)/i;

function getCtor(): SRCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type Status = "idle" | "listening" | "thinking" | "speaking";

/** "Hey Harbor" voice assistant for the wall. Tap the mic to talk, or enable
 *  always-listening for the wake word. Commands go to the device-validated
 *  /api/ai/command endpoint; replies are spoken aloud. After an action that may
 *  have changed data (a new chore, grocery item, or meal plan), we pull to sync. */
export function VoiceButton({
  deviceSecret,
  onActed,
  childId = null,
}: {
  deviceSecret: string;
  onActed?: () => void;
  /** When set (a child's screen is open AND that child's voice chat is ON), the mic is
   *  CHILD-FACING: it routes to the bounded /api/ai/voice (routine help + co-regulation,
   *  no economy, distress→parent) instead of the household command endpoint. */
  childId?: string | null;
}) {
  const ctorRef = useRef<SRCtor | null>(null);
  const [supported, setSupported] = useState(false);
  const [wakeOn, setWakeOn] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [caption, setCaption] = useState<{ you?: string; harbor?: string } | null>(null);

  // refs so the wake-listener effect (stable) reads fresh values without rebinding
  const busyRef = useRef(false); // true during tap-capture / thinking / speaking
  const awaitingRef = useRef(false); // heard "hey harbor" alone, waiting for the command
  const wakeStartRef = useRef<(() => void) | null>(null);
  const statusRef = useRef<Status>("idle");
  const setS = (s: Status) => {
    statusRef.current = s;
    setStatus(s);
  };

  useEffect(() => {
    ctorRef.current = getCtor();
    setSupported(!!ctorRef.current);
    try {
      setWakeOn(localStorage.getItem(WAKE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const runCommand = useCallback(
    async (text: string) => {
      const t = text.trim();
      if (!t) {
        setS("idle");
        return;
      }
      busyRef.current = true;
      setS("thinking");
      setCaption({ you: t });
      try {
        // Child's screen + voice chat on → the bounded child-facing endpoint; else the
        // household "Hey Harbor" command endpoint.
        const res = await fetch(childId ? "/api/ai/voice" : "/api/ai/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            childId
              ? { device_secret: deviceSecret, child_id: childId, text: t }
              : { device_secret: deviceSecret, text: t, date: todayKey() },
          ),
        });
        const data = (await res.json().catch(() => ({}))) as { reply?: string; speech?: string; disabled?: boolean };
        const reply =
          data.speech ||
          data.reply ||
          (data.disabled ? "Ask a grown-up to set up Harbor's voice." : "Sorry, I had trouble with that.");
        setCaption({ you: t, harbor: reply });
        setS("speaking");
        speak(reply);
        onActed?.();
        const ms = Math.min(9000, 2600 + reply.length * 45);
        window.setTimeout(() => {
          busyRef.current = false;
          if (statusRef.current === "speaking") setS("idle");
          wakeStartRef.current?.();
        }, ms);
      } catch {
        setCaption({ you: t, harbor: "I couldn't reach the server." });
        busyRef.current = false;
        setS("idle");
        wakeStartRef.current?.();
      }
    },
    [deviceSecret, onActed, childId],
  );

  // Tap-to-talk: one-shot capture.
  const tapTalk = useCallback(() => {
    const Ctor = ctorRef.current;
    if (!Ctor || busyRef.current) return;
    stopSpeaking();
    busyRef.current = true;
    let finalText = "";
    let rec: SR | null = null;
    try {
      rec = new Ctor();
    } catch {
      busyRef.current = false;
      return;
    }
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    setCaption(null);
    setS("listening");
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      setCaption({ you: (finalText + interim).trim() });
    };
    rec.onerror = () => {};
    rec.onend = () => {
      const t = finalText.trim();
      if (t) {
        void runCommand(t); // keeps busyRef true → resumes wake when done
      } else {
        busyRef.current = false;
        setS("idle");
        wakeStartRef.current?.();
      }
    };
    try {
      rec.start();
    } catch {
      busyRef.current = false;
      setS("idle");
    }
  }, [runCommand]);

  // Always-listening wake word (opt-in). Auto-restarts; paused while busy.
  useEffect(() => {
    const Ctor = ctorRef.current;
    if (!Ctor || !wakeOn) return;
    let stopped = false;
    let rec: SR | null = null;

    const start = () => {
      if (stopped || busyRef.current || rec) return;
      try {
        rec = new Ctor();
      } catch {
        return;
      }
      rec.lang = "en-US";
      rec.continuous = true;
      rec.interimResults = false;
      rec.onresult = (e) => {
        if (busyRef.current) return;
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (!r.isFinal) continue;
          const raw = r[0].transcript.trim();
          if (awaitingRef.current) {
            awaitingRef.current = false;
            rec?.stop();
            void runCommand(raw);
            return;
          }
          const m = raw.match(WAKE_RE);
          if (m) {
            const after = (m[1] || "").trim();
            if (after) {
              rec?.stop();
              void runCommand(after);
              return;
            }
            awaitingRef.current = true;
            stopSpeaking();
            speak("Yes?");
            setS("listening");
            setCaption({ you: "Listening…" });
            window.setTimeout(() => {
              if (awaitingRef.current) {
                awaitingRef.current = false;
                if (statusRef.current === "listening") setS("idle");
              }
            }, 7000);
            return;
          }
        }
      };
      rec.onerror = () => {};
      rec.onend = () => {
        rec = null;
        if (!stopped && !busyRef.current && wakeOn) window.setTimeout(start, 500);
      };
      try {
        rec.start();
      } catch {
        rec = null;
      }
    };

    wakeStartRef.current = () => {
      if (!stopped && wakeOn && !busyRef.current && !rec) start();
    };
    start();
    return () => {
      stopped = true;
      wakeStartRef.current = null;
      try {
        rec?.abort();
      } catch {
        /* ignore */
      }
    };
  }, [wakeOn, runCommand]);

  if (!supported) return null;

  const toggleWake = () => {
    setWakeOn((v) => {
      const next = !v;
      try {
        localStorage.setItem(WAKE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      if (!next) {
        awaitingRef.current = false;
        if (!busyRef.current) setS("idle");
      }
      return next;
    });
  };

  const active = status !== "idle";

  return (
    <>
      {caption && active && (
        <div className="fixed inset-x-0 bottom-28 z-40 flex justify-center px-4">
          <div className="max-w-md rounded-2xl bg-kpanel/95 px-4 py-3 text-center shadow-k-pop ring-1 ring-kline/55 backdrop-blur">
            {caption.you && <p className="text-sm text-kmute">{caption.you}</p>}
            {caption.harbor && <p className="mt-1 font-display text-lg font-bold text-ktext">{caption.harbor}</p>}
          </div>
        </div>
      )}

      <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-2">
        <button
          onClick={toggleWake}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold ring-1 transition",
            wakeOn ? "bg-kwater/20 text-kwater ring-kwater/40" : "bg-kpanel/80 text-kmute ring-kline/55",
          )}
          aria-pressed={wakeOn}
        >
          {wakeOn ? "“Hey Harbor” on" : "“Hey Harbor” off"}
        </button>
        <button
          onClick={tapTalk}
          aria-label="Talk to Harbor"
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-full text-white shadow-k-pop transition active:scale-95",
            status === "listening"
              ? "bg-kwater animate-pulse"
              : status === "thinking"
                ? "bg-kraise"
                : status === "speaking"
                  ? "bg-beacon text-harbor"
                  : "bg-kwater",
          )}
        >
          {status === "thinking" ? (
            <Loader2 className="h-7 w-7 animate-spin" />
          ) : status === "speaking" ? (
            <Volume2 className="h-7 w-7" />
          ) : (
            <Mic className="h-7 w-7" />
          )}
        </button>
      </div>

      {active && (
        <button
          onClick={() => {
            stopSpeaking();
            busyRef.current = false;
            awaitingRef.current = false;
            setS("idle");
            setCaption(null);
            wakeStartRef.current?.();
          }}
          aria-label="Dismiss"
          className="fixed bottom-44 right-6 z-40 rounded-full bg-kpanel/80 p-1.5 text-kmute ring-1 ring-kline/55"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </>
  );
}
