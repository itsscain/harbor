import { cn } from "@/lib/cn";

/**
 * Harbor lighthouse mark — a guiding light into harbor, with a soft beacon glow.
 * Uses currentColor for the tower so it adapts to context; the beam uses Beacon.
 */
export function LighthouseMark({
  className,
  glow = true,
}: {
  className?: string;
  glow?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="Harbor"
      className={cn("h-8 w-8", className)}
    >
      {glow && (
        <circle cx="24" cy="15" r="13" className="fill-beacon/25 animate-beacon" />
      )}
      {/* Beam */}
      <path d="M24 15 L7 9 L7 12 Z" className="fill-beacon/70" />
      <path d="M24 15 L41 9 L41 12 Z" className="fill-beacon/70" />
      {/* Lamp */}
      <circle cx="24" cy="15" r="4.2" className="fill-beacon" />
      {/* Tower */}
      <path
        d="M18.5 20 H29.5 L31.5 42 H16.5 Z"
        className="fill-current"
      />
      <rect x="17.5" y="19" width="13" height="3.2" rx="1.2" className="fill-current" />
      {/* Stripe */}
      <path d="M19.4 27 H28.6 L29 31 H19 Z" className="fill-seafog/80" />
      {/* Water line */}
      <rect x="12" y="42" width="24" height="2.4" rx="1.2" className="fill-water/60" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LighthouseMark className="h-7 w-7 text-harbor" />
      <span className="font-display text-xl font-extrabold tracking-tight text-harbor">
        Harbor
      </span>
    </span>
  );
}
