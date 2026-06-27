import { Skeleton } from "@/components/ui/primitives";

export default function AdminLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48 rounded-lg" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}
