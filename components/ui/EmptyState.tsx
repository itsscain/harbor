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
        "flex flex-col items-center justify-center rounded-2xl border border-harbor-100 bg-white px-6 py-12 text-center shadow-card " +
        (className ?? "")
      }
    >
      <div className="relative flex h-16 w-16 items-center justify-center text-harbor/70">
        <span className="absolute inset-0 beacon-ring" aria-hidden />
        {icon ?? <LighthouseMark className="relative h-10 w-10 text-harbor/70" glow={false} />}
      </div>
      <h3 className="mt-3 text-title text-harbor">{title}</h3>
      {body && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
