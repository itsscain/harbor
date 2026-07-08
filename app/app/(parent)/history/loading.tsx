import { Skeleton } from "@/components/ui/primitives";

// History is a long activity feed (reward_log + check_ins, hundreds of rows). Stream a
// header + a stack of row placeholders so the list lands in place.
export default function HistoryLoading() {
  return (
    <div className="space-y-5 animate-enter">
      <div className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-44" />
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-card">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
