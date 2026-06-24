import { childColor } from "@/lib/kiosk/colors";

// The Helm's hero (§8.2): a faithful mini-render of what the family sees on the
// wall right now — each child's state (in Anchor / on a Reset Day / tasks done
// today), plus the next event and tonight's dinner. Server-rendered from synced
// data; refreshes on load. "Skylight has no live wall mirror."

export type MirrorChild = {
  id: string;
  name: string;
  avatar: string | null;
  photo_url: string | null;
  color: string | null;
  status: "anchor" | "reset" | "ok";
  doneToday: number;
};

function Avatar({ c }: { c: MirrorChild }) {
  const color = childColor(c);
  if (c.photo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={c.photo_url} alt="" className="h-10 w-10 rounded-full object-cover ring-2" style={{ borderColor: color }} />;
  }
  return (
    <span
      className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold ring-2"
      style={{ background: `${color}33`, color: "#fff", borderColor: color }}
    >
      {c.avatar || c.name.charAt(0).toUpperCase()}
    </span>
  );
}

export function WallMirror({
  children,
  pulse,
  nextEvent,
  dinner,
}: {
  children: MirrorChild[];
  pulse: string;
  nextEvent?: { title: string; emoji: string | null; time: string } | null;
  dinner?: { title: string; emoji: string | null } | null;
}) {
  return (
    <div className="overflow-hidden rounded-3xl bg-gradient-to-b from-[#0c1014] to-[#0a0e12] p-5 text-white shadow-pop ring-1 ring-harbor-900/30 sm:p-6">
      <div className="flex items-center justify-between">
        <span className="text-eyebrow text-white/45">On the wall right now</span>
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300">
          <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          live
        </span>
      </div>
      <p className="mt-1.5 text-pretty font-display text-xl font-bold tracking-tight">{pulse}</p>

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {children.map((c) => (
          <div key={c.id} className="flex items-center gap-2.5 rounded-2xl bg-white/[0.06] p-2.5 ring-1 ring-white/10">
            <Avatar c={c} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{c.name}</p>
              {c.status === "anchor" ? (
                <p className="text-xs font-medium text-violet-300">🫧 In Anchor</p>
              ) : c.status === "reset" ? (
                <p className="text-xs font-medium text-amber-300">🌱 Reset Day</p>
              ) : c.doneToday > 0 ? (
                <p className="text-xs text-emerald-300">{c.doneToday} done today</p>
              ) : (
                <p className="text-xs text-white/45">Ready</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {(nextEvent || dinner) && (
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {nextEvent && (
            <div className="rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">Next up</p>
              <p className="mt-0.5 truncate text-sm font-semibold">
                {nextEvent.emoji ? `${nextEvent.emoji} ` : ""}
                {nextEvent.title}
              </p>
              <p className="text-xs text-white/50">{nextEvent.time}</p>
            </div>
          )}
          {dinner && (
            <div className="rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">Tonight&apos;s dinner</p>
              <p className="mt-0.5 truncate text-sm font-semibold">
                {dinner.emoji ? `${dinner.emoji} ` : ""}
                {dinner.title}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
