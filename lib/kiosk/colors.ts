// Per-person color identity — the signature glanceability cue. Pure (no deps),
// so both the kiosk (client) and parent app (server components) use it.

// The 12 coastal child accents (Brand Identity §5.4) — distinctive at a glance,
// AAA-legible on the dark wall, no red/green-only confusions. Each child's hex is
// stored on `children.color`; the full ramp is derived at runtime (accent.ts).
export const CHILD_PALETTE = [
  { name: "Coral", value: "#FF7A66" },
  { name: "Tangerine", value: "#FF9E45" },
  { name: "Sunflower", value: "#FBC23D" },
  { name: "Seagrass", value: "#5FCB8E" },
  { name: "Aqua", value: "#36C6D6" },
  { name: "Lagoon", value: "#37A2C9" },
  { name: "Sky", value: "#4AA8F0" },
  { name: "Periwinkle", value: "#7C8CF8" },
  { name: "Iris", value: "#A57BF0" },
  { name: "Orchid", value: "#D67BE0" },
  { name: "Rose", value: "#F472A8" },
  { name: "Clay", value: "#E0926B" },
];

function hashIndex(id: string, n: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % n;
}

type ColoredChild = { id: string; color?: string | null } | null | undefined;

/** A child's display color — their assigned color, or a stable palette fallback. */
export function childColor(child: ColoredChild): string {
  if (!child) return "#5C7178";
  if (child.color) return child.color;
  return CHILD_PALETTE[hashIndex(child.id, CHILD_PALETTE.length)].value;
}

/** An event's color — the assigned person's color, else its own, else water. */
export function eventColor(
  event: { child_id?: string | null; color?: string | null },
  childrenById: Map<string, { id: string; color?: string | null }>,
): string {
  if (event.child_id && childrenById.has(event.child_id)) {
    return childColor(childrenById.get(event.child_id));
  }
  if (event.color) return event.color;
  return "#18606F";
}
