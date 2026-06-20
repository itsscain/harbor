export default function ParentLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-40 rounded-lg bg-harbor-100" />
      <div className="h-24 rounded-2xl bg-white" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="h-20 rounded-2xl bg-white" />
        <div className="h-20 rounded-2xl bg-white" />
      </div>
      <div className="h-40 rounded-2xl bg-white" />
    </div>
  );
}
