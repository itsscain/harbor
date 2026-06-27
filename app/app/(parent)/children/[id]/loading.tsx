import { Skeleton } from "@/components/ui/primitives";

// Mirrors the child-detail shape (PageHero + 3-stat glance band + routine rows) so the
// streamed content lands in place instead of a generic blob. This page does the app's
// heaviest read (a 7-query waterfall), so the tailored fallback matters most here.
export default function ChildDetailLoading() {
  return (
    <div className="animate-enter">
      {/* PageHero */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-harbor-100 bg-white shadow-card">
        <div className="h-1 w-full bg-harbor-100" />
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:gap-7 sm:p-8">
          <Skeleton className="h-20 w-20 shrink-0 rounded-[1.4rem]" />
          <div className="min-w-0 flex-1 space-y-2.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-52" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        {/* glance band */}
        <div className="grid grid-cols-3 border-t border-harbor-100">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2 border-l border-harbor-100 p-4 first:border-l-0">
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* section: daily rhythm */}
      <Skeleton className="mb-3 h-3 w-28" />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-2xl border border-harbor-100 bg-white p-4 shadow-card">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
