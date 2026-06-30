// Harbor Lantern economics (§17.12) — the per-child add-on with an accelerating multi-kid
// discount. Placeholders here; these become operator config (Catalog/Settings) later. Pure
// module so both the server action and the public intake form can share it.

export const LANTERN_BASE = 149; // per-child "Harbor Lantern" (the child's Outpost) founder price
// Accelerating discount per additional Lantern (position 1..5+). The more kids, the bigger
// the per-child break — exactly the "increases drastically per kid" structure.
export const LANTERN_DISCOUNT = [0, 0.25, 0.45, 0.6, 0.7];

export function lanternQuote(kids: number, base = LANTERN_BASE): { prices: number[]; total: number; saved: number } {
  const prices: number[] = [];
  let saved = 0;
  for (let i = 0; i < Math.max(0, kids); i++) {
    const disc = LANTERN_DISCOUNT[Math.min(i, LANTERN_DISCOUNT.length - 1)];
    const price = Math.round(base * (1 - disc));
    prices.push(price);
    saved += base - price;
  }
  return { prices, total: prices.reduce((a, b) => a + b, 0), saved };
}
