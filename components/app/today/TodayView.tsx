import Link from "next/link";
import { CalendarPlus, ChevronRight } from "lucide-react";
import type { AgendaItem, TodayModel } from "@/lib/today";
import { NeedsYou } from "./NeedsYou";
import { KidNow } from "./KidNow";
import { HouseModeBar } from "./HouseModeBar";
import { SetupCard } from "./SetupCard";
import { QuickAddButton } from "@/components/app/quick/QuickAddButton";
import { cn } from "@/lib/cn";

/** Today — the action center. It answers, in order: what needs me, how is each kid doing right
 *  now (with one-tap stars / note / calm), what's on today and tonight, and the house mode. */
export function TodayView({ m }: { m: TodayModel }) {
  const kidChips = m.kids.map((k) => ({ id: k.id, name: k.name, avatar: k.avatar, photo_url: k.photo_url, color: k.color }));
  return (
    <div className="animate-enter">
      <header className="mb-5">
        <p className="text-sm font-medium text-fg-muted">{m.dateLabel}</p>
        <h1 className="text-display text-fg">{m.greeting}</h1>
      </header>

      {m.setup.show && <SetupCard steps={m.setup.steps} />}

      <Section title="Needs you" count={m.needs.length} id="needs-you">
        <NeedsYou items={m.needs} />
      </Section>

      <Section title="Kids">
        {/* grid-cols-1 (= minmax(0,1fr)) stops a long one-line status from blowing the column past
            the screen edge — an implicit `auto` track grows to the text's full width. */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {m.kids.map((k) => (
            <KidNow key={k.id} kid={k} />
          ))}
        </div>
      </Section>

      <Section title="Today & tonight">
        <Agenda today={m.today} tomorrow={m.tomorrow} dinner={m.dinner} />
      </Section>

      <Section title="House mode">
        <HouseModeBar mode={m.houseMode} kids={kidChips} />
      </Section>
    </div>
  );
}

function Section({ title, count, id, children }: { title: string; count?: number; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-7 scroll-mt-20">
      <h2 className="text-eyebrow mb-2.5 flex items-center gap-2 text-fg-muted">
        {title}
        {!!count && (
          <span className="min-w-5 rounded-full bg-beacon px-1.5 text-center text-[11px] font-extrabold leading-5 text-[#3a2a06]">{count}</span>
        )}
      </h2>
      {children}
    </section>
  );
}

function Agenda({
  today,
  tomorrow,
  dinner,
}: {
  today: AgendaItem[];
  tomorrow: AgendaItem[];
  dinner: { title: string; emoji: string | null } | null;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface">
      {today.length === 0 ? (
        <p className="px-4 py-3.5 text-[15px] text-fg-muted">Nothing on the calendar today.</p>
      ) : (
        today.map((e, i) => <AgendaRow key={e.id} e={e} first={i === 0} />)
      )}
      <Link href="/app/plan" className="tap flex min-h-12 items-center gap-3 border-t border-line px-4 py-2.5 transition hover:bg-surface-2">
        <span className="w-16 shrink-0 text-sm font-semibold text-fg-muted">Dinner</span>
        <span className="min-w-0 flex-1 truncate text-[15px] text-fg">
          {dinner ? `${dinner.emoji ? `${dinner.emoji} ` : ""}${dinner.title}` : <span className="text-fg-muted">Not planned yet</span>}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden />
      </Link>
      {tomorrow.length > 0 && (
        <>
          <p className="text-eyebrow border-t border-line px-4 pb-1 pt-3 text-fg-subtle">Tomorrow</p>
          {tomorrow.map((e, i) => (
            <AgendaRow key={e.id} e={e} first={i === 0} />
          ))}
        </>
      )}
      <div className="flex items-center justify-between gap-2 border-t border-line px-2 py-1.5">
        <QuickAddButton kind="event" size="sm" variant="ghost">
          <CalendarPlus className="h-4 w-4" /> Add event
        </QuickAddButton>
        <Link href="/app/plan" className="flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-accent transition hover:bg-surface-2">
          Full calendar
        </Link>
      </div>
    </div>
  );
}

function AgendaRow({ e, first }: { e: AgendaItem; first?: boolean }) {
  return (
    <Link
      href="/app/plan"
      className={cn(
        "tap flex min-h-12 items-center gap-3 px-4 py-2.5 transition hover:bg-surface-2",
        !first && "border-t border-line",
        e.past && "opacity-55",
      )}
    >
      <span className="w-16 shrink-0 text-sm font-semibold tabular-nums text-fg-muted">{e.time}</span>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: e.color ?? "var(--c-accent)" }} aria-hidden />
      <span className="min-w-0 flex-1 truncate text-[15px] text-fg">
        {e.emoji ? `${e.emoji} ` : ""}
        {e.title}
      </span>
    </Link>
  );
}
