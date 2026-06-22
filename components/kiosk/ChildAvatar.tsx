"use client";

import { useState } from "react";
import { childColor } from "@/lib/kiosk/colors";
import { cn } from "@/lib/cn";

type AvatarChild = {
  id: string;
  name: string;
  avatar: string | null;
  photo_url?: string | null;
  color?: string | null;
};

/** The one way to render a child's identity across the wall: real photo when set
 *  (Skylight-style), falling back to their emoji, then a colored monogram. The
 *  photo gracefully degrades to the fallback if it can't load (e.g. offline). */
export function ChildAvatar({
  child,
  size = 44,
  className,
  rounded = "rounded-xl",
}: {
  child: AvatarChild;
  size?: number;
  className?: string;
  rounded?: string;
}) {
  const [broken, setBroken] = useState(false);
  const color = childColor(child);

  if (child.photo_url && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={child.photo_url}
        alt={child.name}
        onError={() => setBroken(true)}
        className={cn("shrink-0 object-cover ring-1 ring-white/10", rounded, className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className={cn("flex shrink-0 items-center justify-center font-display font-bold", rounded, className)}
      style={{
        width: size,
        height: size,
        background: color + "24",
        boxShadow: `inset 0 0 0 1.5px ${color}`,
        color,
      }}
    >
      {child.avatar ? (
        <span style={{ fontSize: Math.round(size * 0.5), lineHeight: 1 }}>{child.avatar}</span>
      ) : (
        <span style={{ fontSize: Math.round(size * 0.42), lineHeight: 1 }}>
          {child.name.charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}
