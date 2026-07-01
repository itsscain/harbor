import { childColor } from "@/lib/kiosk/colors";
import { formatClock } from "@/lib/kiosk/calendar";

// The Family Schedule (Routines & App P2 §3): every routine × every child × their
// effective windows on one timeline — the family's day at a glance. Pure display;
// the per-child window resolution happens in the page (same seam the wall uses).

export type GridBlock = {
  id: string;
  name: string;
  start: string | null; // "HH:MM[:SS]"
  end: string | null;
  shared: boolean;
  disabled: boolean;
};
export type GridRow = {
  child: { id: string; name: string; color?: string | null };
  blocks: GridBlock[];
};

function toMin(t: string): number {
  const [h, m] = t.split(":").map((n) => Number(n));
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

export function FamilyScheduleGrid({ rows }: { rows: GridRow[] }) {
  // Range: 6:00–21:00, stretched to cover any earlier/later window. A start-only
  // block (e.g. a 21:30 bedtime with no end) must also stretch the end, or it
  // would sit at left ≥ 100% and silently vanish.
  let rangeStart = 6 * 60;
  let rangeEnd = 21 * 60;
  for (const row of rows) {
    for (const b of row.blocks) {
      if (b.start) {
        rangeStart = Math.min(rangeStart, toMin(b.start));
        rangeEnd = Math.max(rangeEnd, toMin(b.start) + 30);
      }
      if (b.end) rangeEnd = Math.max(rangeEnd, toMin(b.end));
    }
  }
  rangeStart = Math.floor(rangeStart / 60) * 60;
  rangeEnd = Math.ceil(rangeEnd / 60) * 60;
  const span = Math.max(rangeEnd - rangeStart, 60);
  const pct = (min: number) => ((min - rangeStart) / span) * 100;

  // Hour ticks every 3h across the range.
  const ticks: number[] = [];
  for (let m = rangeStart; m <= rangeEnd; m += 180) ticks.push(m);

  return (
    <div className="space-y-3">
      {/* tick header */}
      <div className="relative ml-24 h-5 sm:ml-28">
        {ticks.map((m) => (
          <span
            key={m}
            className="absolute -translate-x-1/2 whitespace-nowrap text-[11px] font-semibold tabular-nums text-muted"
            style={{ left: `${pct(m)}%` }}
          >
            {formatClock(`${String(Math.floor(m / 60) % 24).padStart(2, "0")}:00`).replace(":00", "")}
          </span>
        ))}
      </div>

      {rows.map(({ child, blocks }) => {
        const color = childColor(child);
        const timed = blocks.filter((b) => b.start || b.end);
        const anytime = blocks.filter((b) => !b.start && !b.end);
        return (
          <div key={child.id} className="flex items-start gap-2">
            <div className="flex w-22 shrink-0 items-center gap-1.5 pt-3 sm:w-26">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
              <span className="truncate text-sm font-semibold text-harbor">{child.name}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="relative h-11 overflow-hidden rounded-xl bg-surface-sunken">
                {/* tick gridlines */}
                {ticks.map((m) => (
                  <span key={m} className="absolute inset-y-0 w-px bg-harbor-100/60" style={{ left: `${pct(m)}%` }} />
                ))}
                {timed.map((b) => {
                  const s = b.start ? toMin(b.start) : Math.max(rangeStart, toMin(b.end!) - 30);
                  const e = b.end ? toMin(b.end) : Math.min(rangeEnd, s + 30);
                  const left = Math.min(96, Math.max(0, pct(s)));
                  const width = Math.max(2.5, Math.min(100, pct(Math.max(e, s + 15))) - left);
                  return (
                    <span
                      key={b.id}
                      title={`${b.name}${b.start ? ` · ${formatClock(b.start)}` : ""}${b.end ? ` – ${formatClock(b.end)}` : ""}${b.disabled ? " (off for them)" : ""}`}
                      className="absolute inset-y-1 flex items-center overflow-hidden rounded-lg px-2 text-xs font-bold text-white"
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        background: color,
                        opacity: b.disabled ? 0.3 : b.shared ? 0.95 : 0.75,
                      }}
                    >
                      <span className="truncate">{b.name}</span>
                    </span>
                  );
                })}
                {timed.length === 0 && (
                  <span className="absolute inset-0 flex items-center justify-center text-xs text-muted">
                    No timed routines this day
                  </span>
                )}
              </div>
              {anytime.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {anytime.map((b) => (
                    <span
                      key={b.id}
                      className="inline-flex items-center gap-1 rounded-full border border-harbor-100 px-2 py-0.5 text-[11px] font-semibold text-muted"
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color, opacity: b.disabled ? 0.3 : 1 }} />
                      {b.name} · anytime
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
