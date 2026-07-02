---
name: harbor-voice-tts
description: Harbor Voice & TTS — FREE on-device Kokoro (af_bella) in a Web Worker; no paid cloud. Plan + status.
metadata: 
  node_type: memory
  type: project
  originSessionId: 3cd03412-7647-4c62-ade9-5099b108cba8
---

Spec: `C:\Users\penda\Downloads\HARBOR_VOICE_TTS_SYSTEM.md`. Goal: one warm consistent "Harbor Voice"
everywhere, offline. **USER DIRECTION (2026-06-26): $0 / FREE only — NO paid TTS, NO paid cloud storage.
Use on-device Kokoro. Voice = `af_bella` (Bella; `af_sarah` is the alt). Keep any audio cache temporary/
bounded so it costs nothing.** The earlier OpenAI/Supabase Tier-0 pipeline was BUILT then DELETED per this.

**POLISH + CLEAR-EVERYTHING (2026-06-26, after a 3-agent review):** Root cause of the on-and-off tablet
trouble was STALE BROWSER CACHE (switching browsers fixed it). Added VoiceDebug "Clear everything &
restart": wipes ALL Cache Storage + every SW registration + the harbor-voice audio IDB, then reloads —
but PRESERVES the harbor-kiosk IDB (pairing/secret/PIN/progress) so it never unpairs. Two-tap confirm.
Also: voice now requires BOTH readAloud AND sound (readChildSettings folds sound into readAloud →
"Sound off" is a true master mute). Debug panel de-jargoned (hero = Test + Clear-everything; niche
buttons under Advanced; plain status; shows Build stamp + library version). Removed dead lastProgress;
fixed an HTMLAudioElement leak. SW CACHE + the VoiceDebug BUILD stamp are bumped together each deploy
(now v6) so the device's build is confirmable on-screen. GOTCHA: Next 16 build can crash with "Debug
Failure … .tsbuildinfo ===" (Windows path-casing in the TS incremental cache) — fix: `rm -rf .next/cache`
then rebuild (the code is fine; it printed "Compiled successfully" first).

**BULLETPROOF RULE (2026-06-26) — Harbor only SPEAKS pre-recorded library phrases.** Symptom that forced
this: greeting played Bella but completion was robotic ("halfway"), tablet silent. Cause: DYNAMIC spoken
sentences ("Boom! Pajamas done!", "Hi Leo!…") aren't in the library → OS voice (robotic desktop / silent
tablet). Fix: DECOUPLE shown vs spoken — the screen shows specifics, the VOICE only ever uses fixed
library-backed lines. `feedback.ts` greetLine()/doneLine()/cheer() return library phrases; ChildView +
ChoresBoard + StoreView + Anchor + NowNext proactive speak() calls all switched to these. Verified all 17
proactive lines exist in the 90-phrase manifest (missing=[]). Read-aloud of a step's OWN label still
speaks the label (library for common steps; background-Kokoro caches custom). RULE GOING FORWARD: never
`speak()` an interpolated/dynamic string for proactive speech — add the phrase to scripts/voice-phrases.json
+ regen, or use a greetLine/doneLine/cheer helper. VoiceDebug shows a Build stamp (bump it per deploy);
sw.js CACHE bumped each deploy (now v5) so the tablet force-updates.

**ARCHITECTURE PIVOT (2026-06-26) — static pre-gen library is now PRIMARY:** the tablet TIMED OUT
generating on-device (82M model on weak CPU/WASM ≈20s+/phrase; debug "Test voice" timed out 25.5s). Fix:
pre-generate the common vocabulary ONCE with Kokoro af_bella on a capable machine (FREE/local, no API/
cloud) → ship as static WAVs. Tablet just PLAYS them — instant, offline, $0, no 92MB model download in the
common case. `scripts/gen-voice-kokoro.mjs` (device:"cpu" — NOT "wasm"; Node only supports cpu/dml) +
`scripts/voice-phrases.json` → `public/voice/<sha1(normalized)>.wav` + `public/voice-manifest.json`
{normalized→url}. 90 phrases generated (~15MB, ~1.1s each in Node). Re-run to add phrases. voice.ts cascade
now: device cache → **static library WAV** (fetch+cache+play) → novel text: OS voice INSTANT + Kokoro
BACKGROUND-generate to cache for next time (lazy 92MB load only if novel text occurs; never blocks/silent).
On-device Kokoro is now the FALLBACK for custom text, not the primary. SW bumped v3→v4 so devices drop the
stale empty manifest. Verified in preview: manifest 90 af_bella phrases, WAV decodes via AudioContext (1.4s).
GOTCHA: prod URLs 302 to vercel.com/login (Vercel deployment protection) — can't curl-verify; same for all
assets incl. icons. normalizeForSpeech does NOT lowercase → manifest keys are case-preserved ("You did it").

**SUPERSEDED — earlier same-day on-device-Kokoro-live approach (kept for history):**
- `lib/kiosk/tts.worker.ts` — Kokoro-82M in a Web Worker via `kokoro-js` (1.2.1) + `@huggingface/
  transformers` (3.8.1, hoisted so the worker's `env` import = kokoro's instance). Model
  `onnx-community/Kokoro-82M-v1.0-ONNX`, `dtype:"q8"` (~92MB `model_quantized.onnx`, audibly == fp32) on
  single-threaded WASM; WebGPU+fp32 when `navigator.gpu`. Downloads ONCE → browser Cache Storage
  (`transformers-cache` + `kokoro-voices`) → offline forever. `generate(text,{voice})` → RawAudio →
  `.toBlob()` (24kHz WAV).
- **CRITICAL: single-threaded on purpose → NO COOP/COEP headers** (those would break Supabase photo
  avatars). Without cross-origin-isolation the browser forces single-thread anyway; `env.backends.onnx.
  wasm.numThreads=1` is belt-and-suspenders. Worker pattern `new Worker(new URL("./tts.worker.ts",
  import.meta.url),{type:"module"})` works on Turbopack; Next 16.2 fixed worker-origin for WASM-in-worker
  (we're on 16.2.9).
- `lib/kiosk/voice.ts` — cascade: (1) bounded LRU IndexedDB audio cache (db `harbor-voice` v2, stores
  `audio`+`meta`, CACHE_MAX=160, LRU-evicted by ts → local + free + "temporary"); (2) Kokoro af_bella in
  worker → cache → play; (3) OS voice (Web Speech, warm-voice picker) only while model downloads or if
  Kokoro can't run. Single-stream via playSeq; never blocks. `HARBOR_VOICE="af_bella"`. `prewarmHarborVoice()`
  starts the one-time load. ChildView prewarms on mount when read-aloud is on (so first tap = Bella).
- feedback.ts speak()/stopSpeaking() delegate. **VERIFIED:** opening a child downloaded the model + cached
  3 `af_bella|<text>` clips (e.g. "af_bella|Hi Leo! Let's have a great day!"); no crash; OS covered warmup.
- Removed scripts/gen-voice.mjs + voice-phrases.json + public/voice-manifest.json (paid path).

**AUDIO-PATH GOTCHA (fixed 2026-06-26) — don't regress:** on the tablet, refresh played the chime but NO
voice. Cause: chime used Web Audio (AudioContext, gesture-unlocked) but voice used a separate
`HTMLAudioElement.play()` — tablets gate those for autoplay INDEPENDENTLY → cached Bella blob silently
blocked. Fix: `lib/kiosk/audioctx.ts` = ONE shared AudioContext (first-gesture unlock listeners); voice.ts
`playBlob()` decodes the Kokoro WAV via `ctx.decodeAudioData` + plays through an `AudioBufferSourceNode`
(same destination as the chime); HTMLAudio is fallback only. RULE: all kiosk sound (chime + voice) must
go through the shared AudioContext so "if the chime plays, the voice plays." Related: [[harbor-ai-companion]].

**DEBUG PANEL (2026-06-26):** Parent menu → "Debug tools (voice & app)" → `components/kiosk/VoiceDebug.tsx`.
Shows voice-model state/progress, AudioContext state, cached-clip count, WebGPU/WASM, device voice, secure-
context; buttons: Test voice (reports tier+timing, unlocks audio), Reload engine, Re-download model, Clear
clips, and **"Update app"** (unregisters SW + drops harbor-* app-shell cache → loads latest deploy; keeps
the 92MB model). voice.ts diagnostics API: getVoiceStatus/voiceCacheCount/speakDiag/reloadVoiceEngine/
clearVoiceCache. NOTE: the tablet "heard chime not voice even after the AudioContext fix" → strong suspicion
the tablet PWA was running STALE cached code (SW); "Update app" is the fix. GOTCHA: kiosk PIN pad +
KButtons don't respond to synthetic dispatchEvent in the preview harness (React 19) — can't auto-drive the
PIN gate; verify parent-gated UI on-device or by temporarily swapping pinHash (SHA-256 hex, lib/kiosk/db.ts).

**REMAINING / future:** voice picker UI (let a parent choose af_bella/af_sarah/etc. per child or household);
warm at kiosk boot (not just ChildView) to shrink the OS-voice window further; streaming (`tts.stream` +
TextSplitterStream) for long text (Harbor Report); breathing-cue crafted pacing (§12.2); sibling-aware
ducking; parent voice notes are RECORDED audio, not TTS (separate). Note: `npm audit` = 2 moderate
advisories in transformers' transitive deps (on-device only, no server surface) — review later.

Related: [[harbor-brand-identity]] (§2.3 keeper voice), [[harbor-childview-visual]] (read-aloud), [[harbor-project]].
