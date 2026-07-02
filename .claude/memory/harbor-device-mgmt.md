---
name: harbor-device-mgmt
description: Wall & Device Management — D1 (identity + Helm manager) shipped; D2–D4 roadmap + the live-propagation gotcha.
metadata:
  type: project
  originSessionId: 3cd03412-7647-4c62-ade9-5099b108cba8
---

Spec `HARBOR_DEVICE_MANAGEMENT.md` (Downloads). A parent-only, PIN-gated device manager for the
household's fleet (Wall / Outpost / Viewer). Build order is D1→D4; **D1 shipped 2026-06-28**.

**What already existed on `device_pairings`:** `device_label` (nickname — was defined but NEVER
used), `kind` (type: wall|outpost, default 'wall'), `child_id` (outpost binding), `paired_at`,
`last_synced_at` (updated every pull by `rpc_kiosk_pull` → the live "last seen"), `status` enum
(`pending|paired`), `code`. Pairing today = parent mints a code (`createPairingCode` in hub-actions /
now `addDevice`), types it into the device → `rpc_kiosk_pair(code)` adopts secret + reads back
kind/child_id. RLS: select/insert were owner-scoped (0034); **update/delete were admin-only**.

**D1 SHIPPED:**
- Migration **0049**: added `icon, color, app_version, paired_by, paused, settings_json,
  clock_suspect, status_note` to `device_pairings` (all additive). (room_id waits for D4 rooms.)
- Migration **0050**: widened `pairings_update` + `pairings_delete` RLS to
  `is_admin() OR household_is_mine(household_id)` so a parent can rename/configure/unpair their OWN
  devices (the key unblock).
- **`/app/devices`** manager (Helm "collapsed row, edit behind it" standard — mirrors
  `medication/page.tsx`): each device = `Card.group/disc` w/ accent-edge + `Disclosure`(summary=
  `ListRow` smartName + type badge + status `Badge`; body = rename/icon/color form, the pairing code
  when pending, Remove via `ConfirmSubmit`). Smart name = `device_label || "Family Wall" / "<child>'s
  Room"`. Status from `last_synced_at` (Online <3min / Synced Nm ago / Last seen / Waiting to pair).
  "Add a device" disclosure mints a code with name+type+child.
- Server actions in `app/app/(parent)/actions.ts`: `addDevice` / `updateDevice(id)` /
  `unpairDevice(id)` (RLS-scoped, `.bind(null,id)`). Nav: Devices in `ParentRail` ITEMS + `ParentNav`
  MORE_ROUTES + the More hub tile. Regenerated `lib/database.types.ts`.

**GOTCHA (why D1 stops at identity, not live reassignment):** device identity (kind/child_id/
device_label) is captured ONCE at pair time (`useKiosk.ts:219`) and the snapshot/`rpc_kiosk_pull`
does NOT carry device identity — so editing a paired device's type/child does NOT reach the live wall
without re-pair. So D1 only edits parent-side identity (name/icon/color) + unpair; **live type/child
reassignment is D3** (needs `kiosk_snapshot`/pull extended to return the device's own identity by
`device_secret`, + `useKiosk` taught to adopt it on pull). `rpc_kiosk_pair` would also need to return
device_label for the wall to show its own name (Identify, D3).

**D3 SLICE SHIPPED (2026-06-28) — Remote Refresh + Identify + live version/last-seen:**
- Migration **0051**: `device_pairings.pending_command` (one-shot command queue) +
  `rpc_kiosk_device_state(p_secret, p_app_version)` (anon, device-secret auth) → updates
  `last_synced_at` + `app_version`, returns identity/settings/paused, and POPS+clears the command.
- Kiosk **`lib/kiosk/deviceState.ts`** (`fetchDeviceState`, `nukeAndReload`, `BUILD_ID =
  NEXT_PUBLIC_BUILD_ID`); `useKiosk` polls every 30s (boot+interval, NOT Plus-gated) → reports build,
  applies `refresh` (nukeAndReload = drop SW+caches+reload, the [[harbor-kiosk-cache]] fix done
  remotely) + `identify` (`IdentifyFlash` overlay: flash+chime+name). Mounted in both shells. Exposes
  `identifyAt/deviceLabel/paused`.
- Parent: `deviceCommand(id, action)` action; `/app/devices` shows the live status pill, an "Old
  version" flag (`app_version !== CURRENT_BUILD = NEXT_PUBLIC_BUILD_ID`), + per-device 👋 Identify /
  Refresh ("Update to latest" when stale) buttons.
- **VERIFIED LIVE on the paired preview**: device checked in (app_version + last_synced recorded), and
  a queued `identify` popped + rendered the overlay on the wall. Refresh shares the same proven path.
- GOTCHA avoided: did NOT add device_pairings to the kiosk_broadcast trigger — its 30s last_synced_at
  updates would cause a nudge storm. Commands deliver via the 30s poll (≤30s; fine for "apply when
  idle"); instant realtime delivery is a later refinement.

**D2 STARTED (2026-06-28) — per-device sleep / quiet hours:** the round-trip works — `useKiosk`
captures `deviceSettings` from the check-in + exposes it; `KioskShell` merges device over household
(`eff = { ...household, ...deviceSettings }`) for the sleep config (screensaver / idleSeconds /
quietStart / quietEnd), so a bedroom Outpost sleeps earlier than the kitchen Wall. Parent:
`updateDeviceSettings(id)` action merges into `settings_json` (blank = inherit; cast `as unknown as
Json` for the jsonb column), `/app/devices` has a "Sleep & quiet hours" form per device. VERIFIED the
delivery live (set override via SQL → preview device's check-in delivered it, synced 1s later); the
sleep TRIGGER isn't observable in the headless preview (backgrounded tabs throttle the idle
setInterval — pre-existing mechanism, unchanged). **Pattern for the rest of D2** (sound/sensory/
content-lock/children-shown): add the field to the `updateDeviceSettings` merge + the manager form,
then read `eff.<field>` (or `kiosk.deviceSettings`) where the kiosk applies it.

**REMOTE WIPE SHIPPED (2026-06-28) — lost-device safeguard (§7):** removing a device (delete the
`device_pairings` row, the D1 "Remove device" action) now WIPES the wall, not just cuts off sync.
Mechanism: `rpc_kiosk_device_state` raises `unauthorized_device` (errcode **P0001**) once the secret
has no paired row; `fetchDeviceState` returns `kind:"revoked"` ONLY on that (keyed on the stable
**P0001 code** + message fallback — adversarial review confirmed NO false-wipe path: offline/timeout/
5xx/HTML/SSO-302/CORS all lack both → `kind:"error"`, never a wipe; and the RPC writes so it hits the
primary, no replica-lag spurious P0001). On revoked, `useKiosk` runs `clearState()` then
`wipeEverythingAndReload()` (deviceState.ts) = delete `harbor-kiosk` + `harbor-voice` IndexedDB + all
`harbor*` localStorage (home geo, child ids) + SW & caches → reload to a clean pairing screen.
**VERIFIED LIVE**: the preview's device row was removed → the wall wiped itself to pairing on next
check-in. (Review also caught: `clearState` alone left the voice DB + localStorage — fixed by the
thorough scrub.) **CAVEAT (bootstrap):** a device already removed while on an OLD build won't self-wipe
until it picks up this build via the SW auto-update — which needs the prod URL reachable (Vercel
Deployment Protection / auth wall OFF, see [[harbor-kiosk-cache]]). Immediate manual wipe at the
device: Debug tools → "Clear everything & restart" (but that keeps pairing — for a full wipe of an
already-removed device, OS-clear the site data, or let it auto-update then self-wipe).

**DEFERRED:** D2 remainder = per-device sound on/off (gate `play`/`speak` globally — cross-cutting),
sensory default (floor under per-child intensity), content-lock, children-shown, orientation; +
code-based pairing flow (device shows code, parent confirms). Rest of D3 = pause/lock + reassign-
without-repair (needs snapshot
to carry identity) + **unpair + remote wipe** + instant realtime command delivery + realtime presence.
D4 = rooms + needs-attention rollup + audit history + sibling-aware quiet. Settings still has its own
(simpler) Devices section minting codes — left as-is; consolidate later. VERIFY: /app is auth-gated
(no parent session in preview) → parent UI verified by clean build + advisors-clean + code review; the
KIOSK side IS live-verifiable (preview is paired — set pending_command via SQL, watch the wall).
Related: [[harbor-kiosk-cache]], [[harbor-realtime]], [[harbor-helm-declutter]], [[harbor-project]].
