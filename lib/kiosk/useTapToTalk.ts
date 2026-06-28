"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Minimal typings for the Web Speech API (not in the DOM lib).
type SRResult = { 0: { transcript: string }; isFinal: boolean };
type SREvent = { results: ArrayLike<SRResult> };
type SR = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SREvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
type SRCtor = new () => SR;

function getCtor(): SRCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** One-shot tap-to-talk speech-to-text via the Web Speech API. `start()` listens once; on end
 *  it calls `onResult` with the final TRANSCRIPT (the app never handles/sends raw audio). NOTE:
 *  on Chromium the browser routes the audio to Google for transcription — so this is "the app
 *  keeps no audio," not "audio never leaves the device." True on-device STT (WASM) is the §8 V3
 *  hardening. Reusable across the kiosk's voice surfaces; `supported=false` where the API is missing. */
export function useTapToTalk(onResult: (text: string) => void) {
  const ctorRef = useRef<SRCtor | null>(null);
  const recRef = useRef<SR | null>(null);
  const finalRef = useRef("");
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");

  useEffect(() => {
    ctorRef.current = getCtor();
    setSupported(!!ctorRef.current);
    return () => {
      try {
        recRef.current?.abort();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const start = useCallback(() => {
    const Ctor = ctorRef.current;
    if (!Ctor || listening) return;
    let rec: SR;
    try {
      rec = new Ctor();
    } catch {
      return;
    }
    recRef.current = rec;
    finalRef.current = "";
    setInterim("");
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: SREvent) => {
      let live = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript;
        else live += r[0].transcript;
      }
      setInterim(live);
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
      const t = finalRef.current.trim();
      if (t) onResultRef.current(t);
    };
    rec.onerror = () => {
      setListening(false);
      setInterim("");
    };
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [listening]);

  return { supported, listening, interim, start };
}
