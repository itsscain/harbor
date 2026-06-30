import { createClient } from "@/lib/supabase/server";

export type Forecast = {
  installs: number;
  /** normalized part name → total required quantity across all scheduled installs */
  demand: Map<string, number>;
  /** display rows (original casing) for a reorder list */
  items: { item: string; qty: number; unit_cost: number }[];
};

/** Normalize a part name so build_supplies.item (free text) matches inventory.part_name. */
export function partKey(name: string): string {
  return name.trim().toLowerCase();
}

/** Forecast required-parts demand from the scheduled-install pipeline (§8): for each scheduled
 *  customer, add their build's required supply lines × 1. The link that turns procurement from
 *  guesswork into "2 installs scheduled → order 2 tablets." Required (non-optional) parts only. */
export async function forecastFromScheduled(): Promise<Forecast> {
  const supabase = await createClient();
  const { data: scheduled } = await supabase.from("customers").select("build_id").eq("status", "scheduled");
  const rows = scheduled ?? [];
  const installs = rows.length;

  const buildCount = new Map<string, number>();
  for (const c of rows) if (c.build_id) buildCount.set(c.build_id, (buildCount.get(c.build_id) ?? 0) + 1);
  const buildIds = [...buildCount.keys()];
  if (buildIds.length === 0) return { installs, demand: new Map(), items: [] };

  const { data: supplies } = await supabase
    .from("build_supplies")
    .select("build_id, item, quantity, unit_cost, optional")
    .in("build_id", buildIds);

  const demand = new Map<string, number>();
  const display = new Map<string, { item: string; qty: number; unit_cost: number }>();
  for (const s of supplies ?? []) {
    if (s.optional) continue;
    const qty = s.quantity * (buildCount.get(s.build_id) ?? 0);
    if (qty <= 0) continue;
    const key = partKey(s.item);
    demand.set(key, (demand.get(key) ?? 0) + qty);
    const d = display.get(key);
    if (d) d.qty += qty;
    else display.set(key, { item: s.item, qty, unit_cost: Number(s.unit_cost) });
  }
  return { installs, demand, items: [...display.values()].sort((a, b) => a.item.localeCompare(b.item)) };
}
