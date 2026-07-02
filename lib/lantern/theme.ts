// Light, playful theming for the Lantern's Buddy-style UI. Soft pastels (from the brand's
// broader palette) themed by routine kind, on Harbor's deep-harbor ink + beacon gold.

export type LanternTheme = { emoji: string; bg: string; fg: string; soft: string };

export function routineTheme(name: string, type: string): LanternTheme {
  const n = (name || "").toLowerCase();
  if (/(morning|wake)/.test(n)) return { emoji: "🌅", bg: "#e1f5ee", fg: "#0f6e56", soft: "#9fe1cb" };
  if (/(bed|night|sleep|evening|wind)/.test(n)) return { emoji: "🌙", bg: "#e6f1fb", fg: "#185fa5", soft: "#b5d4f4" };
  if (/(noon|midday|lunch|afternoon|day|summer)/.test(n)) return { emoji: "☀️", bg: "#faeeda", fg: "#854f0b", soft: "#fac775" };
  if (/(school|home ?work)/.test(n)) return { emoji: "🍎", bg: "#fbeaf0", fg: "#993556", soft: "#f4c0d1" };
  if (type === "first_then") return { emoji: "🔁", bg: "#eeedfe", fg: "#534ab7", soft: "#cecbf6" };
  return { emoji: "📋", bg: "#eef5f6", fg: "#18606f", soft: "#cfe6e1" };
}

export function greetingFor(name: string, d = new Date()): string {
  const h = d.getHours();
  const part = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${part}, ${name}`;
}
