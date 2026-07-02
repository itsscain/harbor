import { Skeleton } from "@/components/ui/primitives";

export default function RoutinesLoading() {
  return (
    <>
      <div className="mb-6 flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-40" />
        </div>
      </div>
      <Skeleton className="mb-6 h-20 rounded-2xl" />
      <Skeleton className="mb-4 h-5 w-44" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] rounded-2xl" />
        ))}
      </div>
      <Skeleton className="mb-4 mt-8 h-5 w-44" />
      <Skeleton className="h-24 rounded-2xl" />
    </>
  );
}
