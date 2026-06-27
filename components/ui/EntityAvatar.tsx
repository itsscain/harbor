import { cn } from "@/lib/cn";

const SIZES = {
  sm: "h-10 w-10 rounded-[0.9rem] text-lg",
  md: "h-14 w-14 rounded-[1.1rem] text-2xl",
  lg: "h-24 w-24 rounded-[1.5rem] text-5xl",
} as const;
const RING = { sm: 2, md: 2.5, lg: 3 } as const;

/** The one ringed avatar for the Helm — a squircle with a crisp accent ring (double
 *  box-shadow, never a glow or colored drop-shadow). Photo if present, else an emoji. */
export function EntityAvatar({
  photoUrl,
  fallback,
  accent,
  size = "md",
}: {
  photoUrl?: string | null;
  fallback: React.ReactNode;
  accent: string;
  size?: keyof typeof SIZES;
}) {
  return (
    <span
      className={cn("grid shrink-0 place-items-center overflow-hidden bg-harbor-50", SIZES[size])}
      style={{ boxShadow: `0 0 0 1.5px #fff, 0 0 0 ${RING[size]}px ${accent}` }}
    >
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden>{fallback}</span>
      )}
    </span>
  );
}
