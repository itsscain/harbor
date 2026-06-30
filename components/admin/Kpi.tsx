import type { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";

/** A premium operator KPI card — value + optional month-over-month trend + a hint. */
export function Kpi({
  label,
  value,
  hint,
  trend,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  trend?: { label: string; dir: "up" | "down" | "flat" };
  accent?: boolean;
}) {
  return (
    <Card className={cn(accent && "border-beacon/40 bg-beacon-soft/40")}>
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-extrabold text-harbor">{value}</p>
      {(trend || hint) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-semibold",
                trend.dir === "up" ? "text-emerald-700" : trend.dir === "down" ? "text-red-700" : "text-muted",
              )}
            >
              {trend.dir === "up" ? <TrendingUp className="h-3.5 w-3.5" /> : null}
              {trend.dir === "down" ? <TrendingDown className="h-3.5 w-3.5" /> : null}
              {trend.label}
            </span>
          )}
          {hint && <span className="text-muted">{hint}</span>}
        </div>
      )}
    </Card>
  );
}
