// A friendly emoji for a routine from its name/type — shared by server pages (Today) and the
// routine editor so a routine looks the same everywhere.
export function routineEmoji(r: { name: string; type?: string | null }): string {
  const n = r.name.toLowerCase();
  if (/(morning|wake)/.test(n)) return "🌅";
  if (/(bed|night|sleep|wind)/.test(n)) return "🌙";
  if (/(school|home ?work)/.test(n)) return "🍎";
  if (/(noon|midday|lunch|day)/.test(n)) return "☀️";
  if (r.type === "first_then") return "🔁";
  return "📋";
}
