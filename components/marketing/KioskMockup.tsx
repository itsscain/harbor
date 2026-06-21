/** A high-fidelity, static render of the kiosk Home — so buyers see the actual
 *  product above the fold. Pure markup, on-brand colors. */
function Tile({ name, avatar, color, progress }: { name: string; avatar: string; color: string; progress: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-harbor-100 border-l-4 bg-white p-2.5 shadow-card" style={{ borderLeftColor: color }}>
      <span className="flex h-9 w-9 items-center justify-center rounded-full text-lg" style={{ background: color + "22", boxShadow: `inset 0 0 0 2px ${color}` }}>
        {avatar}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-harbor">{name}</p>
        <p className="text-[11px] text-muted">{progress} done</p>
      </div>
    </div>
  );
}

function Agenda({ color, label, time }: { color: string; label: string; time: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-card">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="truncate text-xs font-semibold text-harbor">{label}</span>
      <span className="ml-auto text-xs text-muted">{time}</span>
    </div>
  );
}

export function KioskMockup() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <span className="absolute inset-0 -z-10 mx-auto my-auto h-72 w-72 beacon-ring" aria-hidden />
      <div className="rounded-[2rem] border-[10px] border-harbor-900 bg-harbor-900 shadow-pop">
        <div className="overflow-hidden rounded-[1.1rem] bg-seafog p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-display text-lg font-extrabold text-harbor">Good morning</p>
              <p className="text-[11px] text-muted">Saturday, June 20</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-xl bg-white px-2 py-1 shadow-card">
                <span className="text-sm">⛅</span>
                <span className="font-display text-sm font-extrabold text-harbor">68°</span>
              </span>
              <span className="font-display text-2xl font-extrabold tabular-nums text-harbor">7:42</span>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-beacon/40 bg-beacon-soft/50 p-2.5">
            <span className="text-xl">🎂</span>
            <p className="text-xs font-bold text-harbor">18 sleeps until Mia&apos;s birthday</p>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <Tile name="Mia" avatar="🦊" color="#EC6A5E" progress="3 / 4" />
            <Tile name="Leo" avatar="🐢" color="#3F8EC8" progress="1 / 5" />
          </div>

          <div className="mt-2 space-y-1.5">
            <Agenda color="#EC6A5E" label="Soccer practice" time="4:00" />
            <Agenda color="#18606F" label="Family dinner · tacos 🌮" time="6:30" />
          </div>
        </div>
      </div>
    </div>
  );
}
