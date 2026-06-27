import { Skeleton } from "@/components/ui/primitives";

// Settings is the heaviest by query count (collapsed domain sections). Stream a header +
// a stack of section-card placeholders.
export default function SettingsLoading() {
  return (
    <div className="space-y-5 animate-enter">
      <div className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-40" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-2xl border border-harbor-100 bg-white p-5 shadow-card">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
