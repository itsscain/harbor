import { LighthouseMark } from "@/components/brand/Logo";

/** Calm, branded empty state — used across kiosk (light views) and parent app. */
export function EmptyState({
  title,
  body,
  icon,
  action,
  className,
}: {
  title: string;
  body?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "flex flex-col items-center justify-center rounded-2xl border border-harbor-100 bg-white px-6 py-10 text-center " +
        (className ?? "")
      }
    >
      <div className="text-harbor/60">
        {icon ?? <LighthouseMark className="h-10 w-10 text-harbor/60" glow={false} />}
      </div>
      <h3 className="mt-3 font-display text-lg font-bold text-harbor">{title}</h3>
      {body && <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
