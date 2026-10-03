"use client";

import { useState } from "react";
import { ChevronRight, Copy, Plus, Share2 } from "lucide-react";
import { Sheet, SheetActions } from "@/components/ui/Sheet";
import { ActionForm, FormError } from "@/components/ui/ActionForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ChipGroup, ChildChips, type ChipChild } from "@/components/ui/Chips";
import { EmojiPicker } from "@/components/ui/EmojiPicker";
import { Toggle } from "@/components/ui/Toggle";
import { Button, Field, Input } from "@/components/ui/primitives";
import { useQuickAction } from "@/components/ui/useQuickAction";
import { useToast } from "@/components/ui/Toast";
import { Disclosure } from "@/components/app/Disclosure";
import { formatPairingCode } from "@/lib/pairing-format";
import { createScreen, renameScreen, screenCommand, saveScreenSleep, removeScreen, claimLanternScreen } from "@/app/app/(parent)/devices/device-actions";
import { cn } from "@/lib/cn";

export type Screen = {
  id: string;
  name: string;
  icon: string;
  typeLabel: string;
  status: "pending" | "online" | "recent" | "away" | "new";
  statusLabel: string;
  code: string;
  stale: boolean;
  sleep: { screensaver: boolean; idleSeconds: number | null; quietStart: string | null; quietEnd: string | null };
};

const STATUS_CLS: Record<Screen["status"], string> = {
  pending: "bg-beacon/15 text-beacon",
  online: "bg-good/15 text-good",
  recent: "bg-surface-2 text-fg-muted",
  away: "bg-surface-2 text-fg-subtle",
  new: "bg-surface-2 text-fg-muted",
};

export function ScreensView({ screens, kids, autoAdd = false }: { screens: Screen[]; kids: ChipChild[]; autoAdd?: boolean }) {
  const [adding, setAdding] = useState(autoAdd);
  const [open, setOpen] = useState<Screen | null>(null);
  const [code, setCode] = useState<string | null>(null);

  return (
    <>
      <Button size="lg" className="mb-5 w-full sm:w-auto" onClick={() => setAdding(true)}>
        <Plus className="h-4 w-4" /> Add a screen
      </Button>

      {screens.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line-strong p-6 text-center">
          <p className="text-3xl" aria-hidden>
            🖥️
          </p>
          <p className="mt-1 font-semibold text-fg">No screens yet</p>
          <p className="mt-0.5 text-sm text-fg-muted">Turn a tablet into your family wall — it takes about a minute.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {screens.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => (s.status === "pending" ? setCode(s.code) : setOpen(s))}
                className="flex min-h-[4.5rem] w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-2xl" aria-hidden>
                  {s.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-semibold text-fg">{s.name}</span>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", s.stale ? "bg-beacon/15 text-beacon" : STATUS_CLS[s.status])}>
                      {s.stale ? "Update needed" : s.statusLabel}
                    </span>
                  </span>
                  <span className="block truncate text-sm text-fg-muted">
                    {s.status === "pending" ? `Code ${formatPairingCode(s.code)} · tap to see it` : s.stale ? `${s.typeLabel} · ${s.statusLabel}` : s.typeLabel}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add a screen">
        <AddScreen
          kids={kids}
          onCode={(c) => {
            setAdding(false);
            setCode(c);
          }}
          onDone={() => setAdding(false)}
        />
      </Sheet>

      <Sheet open={!!code} onClose={() => setCode(null)} title="Connect your screen">
        {code && <CodePanel code={code} onCancel={() => setCode(null)} pendingId={screens.find((s) => s.code === code)?.id ?? null} />}
      </Sheet>

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.name ?? "Screen"}>
        {open && <ScreenPanel key={open.id} screen={open} onRemoved={() => setOpen(null)} />}
      </Sheet>
    </>
  );
}

// ── Add ──────────────────────────────────────────────────────────────────────
type ScreenType = "wall" | "outpost" | "lantern";

function TypeOption({ selected, onSelect, emoji, title, sub }: { selected: boolean; onSelect: () => void; emoji: string; title: string; sub: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn("flex min-h-16 w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition", selected ? "border-accent bg-accent/10" : "border-line hover:border-accent/50")}
    >
      <span className="text-2xl" aria-hidden>
        {emoji}
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-fg">{title}</span>
        <span className="block text-sm text-fg-muted">{sub}</span>
      </span>
    </button>
  );
}

function AddScreen({ kids, onCode, onDone }: { kids: ChipChild[]; onCode: (code: string) => void; onDone: () => void }) {
  const { run, pending } = useQuickAction();
  const [type, setType] = useState<ScreenType>("wall");
  const [kid, setKid] = useState<string>(kids[0]?.id ?? "");

  return (
    <div className="space-y-5 pb-1">
      <div className="space-y-2" role="radiogroup" aria-label="What kind of screen?">
        <TypeOption selected={type === "wall"} onSelect={() => setType("wall")} emoji="🖥️" title="Family wall" sub="The main screen everyone shares" />
        <TypeOption selected={type === "outpost"} onSelect={() => setType("outpost")} emoji="🛏️" title="Bedroom screen" sub="A spare tablet with one kid's routines" />
        <TypeOption selected={type === "lantern"} onSelect={() => setType("lantern")} emoji="🏮" title="Lantern" sub="A bedside light that shows its own code" />
      </div>

      {type !== "wall" && kids.length > 0 && (
        <Field label="Whose is it?">
          <ChildChips kids={kids} value={kid ? [kid] : []} onChange={(v) => setKid(v[0] ?? "")} />
        </Field>
      )}
      {type !== "wall" && kids.length === 0 && <p className="text-sm text-fg-muted">Add a child first — then you can give them their own screen.</p>}

      {type === "lantern" ? (
        <ActionForm action={claimLanternScreen} onSuccess={onDone} className="space-y-4">
          <input type="hidden" name="child_id" value={kid} />
          <Field label="Code on the Lantern" htmlFor="ln-code" hint="Turn the Lantern on — it shows a 6-character code.">
            <Input
              id="ln-code"
              name="code"
              required
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              maxLength={8}
              placeholder="ABC234"
              className="text-center font-mono text-2xl font-bold uppercase tracking-[0.25em]"
            />
          </Field>
          <FormError />
          <SheetActions>
            <SubmitButton size="lg" className="w-full sm:w-auto" confirmSaved={false}>
              Set up the Lantern
            </SubmitButton>
          </SheetActions>
        </ActionForm>
      ) : (
        <SheetActions>
          <Button
            size="lg"
            className="w-full sm:w-auto"
            disabled={pending || (type === "outpost" && !kid)}
            onClick={() => run(() => createScreen(type, type === "outpost" ? kid : null), { success: false, onDone: (r) => r.code && onCode(r.code) })}
          >
            Get a code
          </Button>
        </SheetActions>
      )}
    </div>
  );
}

function CodePanel({ code, pendingId, onCancel }: { code: string; pendingId: string | null; onCancel: () => void }) {
  const toast = useToast();
  const { run, pending } = useQuickAction();
  const link = typeof window !== "undefined" ? `${window.location.origin}/kiosk?code=${code}` : `/kiosk?code=${code}`;
  const host = typeof window !== "undefined" ? window.location.host : "harbor";
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  return (
    <div className="space-y-5 pb-1 text-center">
      <ol className="space-y-1 text-left text-[15px] text-fg">
        <li>
          1. On the tablet, open <strong className="break-all">{host}/kiosk</strong>
        </li>
        <li>2. Type this code:</li>
      </ol>
      <p className="select-all rounded-2xl bg-surface-2 py-5 font-mono text-[2.25rem] font-extrabold tracking-[0.2em] text-fg">{formatPairingCode(code)}</p>
      <p className="text-sm text-fg-muted">It connects the moment the code is typed. Or send this link to the tablet:</p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              toast.success("Link copied");
            } catch {
              toast.error("Couldn't copy — press and hold the code instead.");
            }
          }}
        >
          <Copy className="h-4 w-4" /> Copy link
        </Button>
        {canShare && (
          <Button variant="secondary" className="flex-1" onClick={() => navigator.share({ title: "Connect Harbor", url: link }).catch(() => {})}>
            <Share2 className="h-4 w-4" /> Share
          </Button>
        )}
      </div>
      {pendingId && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => removeScreen(pendingId), { success: "Code cancelled", onDone: onCancel })}
          className="min-h-10 text-sm font-semibold text-fg-muted hover:text-error"
        >
          Cancel this code
        </button>
      )}
    </div>
  );
}

// ── One screen ───────────────────────────────────────────────────────────────
function ScreenPanel({ screen, onRemoved }: { screen: Screen; onRemoved: () => void }) {
  const { run, pending } = useQuickAction();
  const [confirm, setConfirm] = useState(false);
  const [rest, setRest] = useState(screen.sleep.screensaver);
  const [dim, setDim] = useState(!!(screen.sleep.quietStart && screen.sleep.quietEnd));
  const idle = String(screen.sleep.idleSeconds ?? "");

  return (
    <div className="space-y-5 pb-1">
      <p className="text-sm text-fg-muted">
        {screen.typeLabel} · {screen.statusLabel}
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" disabled={pending} onClick={() => run(() => screenCommand(screen.id, "identify"))}>
          👋 Find it
        </Button>
        <Button variant={screen.stale ? "primary" : "secondary"} disabled={pending} onClick={() => run(() => screenCommand(screen.id, "refresh"))}>
          {screen.stale ? "Update now" : "Refresh"}
        </Button>
      </div>

      <ActionForm action={renameScreen.bind(null, screen.id)} closeOnSuccess={false} className="space-y-3">
        <div className="flex items-end gap-3">
          <EmojiPicker name="icon" defaultValue={screen.icon} label="Icon" />
          <Field label="Name" htmlFor="sc-name" className="flex-1">
            <Input id="sc-name" name="device_label" maxLength={40} defaultValue={screen.name} />
          </Field>
        </div>
        <FormError />
        <SubmitButton variant="secondary">Save name</SubmitButton>
      </ActionForm>

      <div className="rounded-xl border border-line">
        <Disclosure summary={<span className="text-[15px] font-semibold text-fg">Resting & night</span>} bodyClassName="px-4 pb-4">
          <ActionForm action={saveScreenSleep.bind(null, screen.id)} closeOnSuccess={false} className="space-y-4">
            <Toggle checked={rest} onChange={setRest} name="screensaver" label="Rest after a while" hint="Photos or a soft clock" />
            {rest && (
              <ChipGroup
                name="idleSeconds"
                defaultValue={["60", "120", "300", "600"].includes(idle) ? idle : ""}
                options={[
                  { value: "", label: "Family setting" },
                  { value: "60", label: "1 min" },
                  { value: "120", label: "2 min" },
                  { value: "300", label: "5 min" },
                  { value: "600", label: "10 min" },
                ]}
              />
            )}
            <Toggle checked={dim} onChange={setDim} label="Its own night hours" hint="Otherwise it follows the family setting" />
            {dim && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Dim from" htmlFor="sc-qs">
                  <Input id="sc-qs" name="quietStart" type="time" defaultValue={screen.sleep.quietStart ?? "19:30"} />
                </Field>
                <Field label="Until" htmlFor="sc-qe">
                  <Input id="sc-qe" name="quietEnd" type="time" defaultValue={screen.sleep.quietEnd ?? "06:30"} />
                </Field>
              </div>
            )}
            <FormError />
            <SubmitButton variant="secondary">Save</SubmitButton>
          </ActionForm>
        </Disclosure>
      </div>

      <div className="border-t border-line pt-4">
        {confirm ? (
          <div className="space-y-3 rounded-xl border border-error/30 bg-error/5 p-4">
            <p className="text-sm text-fg">Remove {screen.name}? It goes back to its pairing screen right away.</p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setConfirm(false)}>
                Keep it
              </Button>
              <Button variant="danger" disabled={pending} onClick={() => run(() => removeScreen(screen.id), { onDone: onRemoved })}>
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" className="text-error" onClick={() => setConfirm(true)}>
            Remove this screen
          </Button>
        )}
      </div>
    </div>
  );
}
