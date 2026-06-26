"use client";

// One shared Web Audio context for ALL kiosk sound — the success chime AND the Harbor
// Voice. Tablets gate HTMLAudioElement.play() and speechSynthesis separately from Web
// Audio, so a refresh could leave the chime audible but voice silent. Routing voice
// through this same context means: if the chime plays, the voice plays too. The context
// is unlocked/resumed on the first user gesture (see resumeAudioCtx).

let audioCtx: AudioContext | null = null;

export function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      audioCtx = new Ctor();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/** Resume the context (call on any user gesture so later sound/voice can play). */
export function resumeAudioCtx(): void {
  const ctx = getAudioCtx();
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

// Unlock audio on the first user gesture so the chime AND voice can play afterwards
// (mobile/tablet browsers start the context suspended until a gesture).
if (typeof window !== "undefined") {
  try {
    const unlock = () => resumeAudioCtx();
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("touchstart", unlock, { passive: true });
    window.addEventListener("keydown", unlock);
  } catch {
    /* ignore */
  }
}
