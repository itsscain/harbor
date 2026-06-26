// Harbor Voice — on-device Kokoro TTS worker (Voice/TTS spec §9). Runs the free,
// offline Kokoro-82M model in a Web Worker so synthesis never janks the UI. The model
// (~92MB q8) downloads once from the HF CDN and is cached by the browser (Cache
// Storage, "transformers-cache") → offline forever after. Single-threaded WASM is the
// baseline (needs NO COOP/COEP headers, so Supabase photo avatars keep loading);
// WebGPU is used opportunistically when present. Zero cloud cost.

import { KokoroTTS } from "kokoro-js";
import { env } from "@huggingface/transformers";

const ctx: { postMessage: (m: unknown, t?: Transferable[]) => void; onmessage: ((e: MessageEvent) => void) | null } =
  self as unknown as typeof ctx;

// Force single-threaded WASM — avoids SharedArrayBuffer / cross-origin isolation.
try {
  // @ts-expect-error — backends typing varies across transformers versions
  env.backends.onnx.wasm.numThreads = 1;
} catch {
  /* best effort; without COOP/COEP the browser forces single-thread anyway */
}

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
type Kokoro = { generate: (t: string, o: { voice?: string; speed?: number }) => Promise<{ toBlob: () => Blob }> };
let ttsPromise: Promise<Kokoro> | null = null;

function load(): Promise<Kokoro> {
  if (!ttsPromise) {
    const useGPU = typeof navigator !== "undefined" && "gpu" in navigator;
    const primary = useGPU
      ? { dtype: "fp32" as const, device: "webgpu" as const }
      : { dtype: "q8" as const, device: "wasm" as const };
    ttsPromise = KokoroTTS.from_pretrained(MODEL_ID, {
      ...primary,
      progress_callback: (p: unknown) => {
        try {
          ctx.postMessage({ type: "progress", data: p });
        } catch {
          /* ignore */
        }
      },
    })
      .then((tts) => {
        ctx.postMessage({ type: "ready" });
        return tts as unknown as Kokoro;
      })
      .catch((e) => {
        // WebGPU can fail to init at runtime — fall back to WASM once.
        if (useGPU) {
          return KokoroTTS.from_pretrained(MODEL_ID, { dtype: "q8", device: "wasm" }).then((tts) => {
            ctx.postMessage({ type: "ready" });
            return tts as unknown as Kokoro;
          });
        }
        throw e;
      });
  }
  return ttsPromise;
}

ctx.onmessage = async (e: MessageEvent) => {
  const { id, type, text, voice } = (e.data || {}) as {
    id?: number;
    type?: string;
    text?: string;
    voice?: string;
  };
  if (type === "warm") {
    load().catch((err) => ctx.postMessage({ type: "error", error: String(err) }));
    return;
  }
  if (type === "gen") {
    try {
      const tts = await load();
      const audio = await tts.generate(text || "", { voice: voice || "af_bella" });
      ctx.postMessage({ id, type: "audio", blob: audio.toBlob() });
    } catch (err) {
      ctx.postMessage({ id, type: "error", error: String(err) });
    }
  }
};
