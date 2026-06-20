export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded-lg bg-harbor-100" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="h-24 rounded-2xl bg-white" />
        <div className="h-24 rounded-2xl bg-white" />
        <div className="h-24 rounded-2xl bg-white" />
        <div className="h-24 rounded-2xl bg-white" />
      </div>
      <div className="h-40 rounded-2xl bg-white" />
    </div>
  );
}
