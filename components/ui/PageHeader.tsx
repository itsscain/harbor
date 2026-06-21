import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
  backHref,
  icon,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  eyebrow?: string;
  backHref?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mb-6 animate-enter">
      {backHref && (
        <Link
          href={backHref}
          className="mb-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 -ml-2.5 text-sm font-semibold text-muted transition hover:bg-harbor-50 hover:text-harbor"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          {icon && (
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-harbor-50 text-harbor">
              {icon}
            </span>
          )}
          <div>
            {eyebrow && <p className="text-eyebrow mb-1 text-water">{eyebrow}</p>}
            <h1 className="text-display text-harbor">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
