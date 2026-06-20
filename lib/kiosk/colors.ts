// Per-person color identity — the signature glanceability cue. Pure (no deps),
// so both the kiosk (client) and parent app (server components) use it.

export const CHILD_PALETTE = [
  { name: "Coral", value: "#EC6A5E" },
  { name: "Sky", value: "#3F8EC8" },
  { name: "Teal", value: "#2F8F86" },
  { name: "Amber", value: "#F6B23D" },
  { name: "Violet", value: "#8B5CF6" },
  { name: "Pink", value: "#E8739E" },
  { name: "Green", value: "#5B8C5A" },
  { name: "Harbor", value: "#0C3B47" },
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
