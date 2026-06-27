import { Skeleton } from "@/components/ui/primitives";

// Insights is chart-heavy (14-day reward_log + check_ins) and Plus-gated. Stream a
// header + a stat row + a chart-shaped block.
export default function InsightsLoading() {
  return (
    <div className="space-y-5 animate-enter">
      <div className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
      <div className="rounded-2xl border border-harbor-100 bg-white p-5 shadow-card">
        <Skeleton className="mb-4 h-4 w-32" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    </div>
  );
}
