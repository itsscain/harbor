"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { lanternQuote } from "@/lib/founder-pricing";

export type FounderStatus = { remaining: number; cap: number; state: string };

/** The live public count — a number only, never the list. */
export async function getFounderStatus(): Promise<FounderStatus> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("rpc_founder_spots_remaining");
    const d = (data ?? {}) as Partial<FounderStatus>;
    return { remaining: d.remaining ?? 0, cap: d.cap ?? 15, state: d.state ?? "open" };
  } catch {
    return { remaining: 0, cap: 15, state: "open" };
  }
}

export type PublicBuild = {
  id: string;
  name: string;
  screen_size: string | null;
  tablet_model: string | null;
  standard_price: number;
  founder_price: number;
  is_default: boolean;
  sort_order: number;
};

export async function getPublicBuilds(): Promise<PublicBuild[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("rpc_public_builds");
    return (data ?? []) as PublicBuild[];
  } catch {
    return [];
  }
}

const schema = z.object({
  name: z.string().trim().min(1, "Please add your name."),
  email: z.string().trim().email("Please enter a valid email."),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  kids_count: z.coerce.number().int().min(0).max(12).optional(),
  kid_ages: z.string().trim().optional(),
  kid_notes: z.string().trim().optional(),
  build_id: z.string().trim().optional(),
  wants_plus: z.string().optional(),
  wall_type: z.string().trim().optional(),
  mounting: z.string().trim().optional(),
  hub_room: z.string().trim().optional(),
  timing: z.string().trim().optional(),
  heard_from: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  utm: z.string().trim().optional(),
  hp: z.string().optional(), // honeypot — must stay empty
});

export type FounderReserveState = {
  error?: string;
  success?: boolean;
  waitlisted?: boolean;
  founderNumber?: number | null;
};

/** Reserve a founder spot from the public intake (§17.3). Spot is secured on submit, no
 *  payment. Full/paused → captured as a waitlist lead. Race-safe + count-only in the RPC. */
export async function reserveFounderSpot(
  _prev: FounderReserveState,
  formData: FormData,
): Promise<FounderReserveState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form and try again." };
  }
  const v = parsed.data;
  // Honeypot: a real person never fills this hidden field. Silently "succeed" for bots.
  if (v.hp) return { success: true, founderNumber: null };

  const builds = await getPublicBuilds();
  const lanternBuild = builds.find((b) => /lantern/i.test(b.name));
  const hubBuilds = builds.filter((b) => !/lantern/i.test(b.name));
  const build = hubBuilds.find((b) => b.id === v.build_id) ?? hubBuilds.find((b) => b.is_default) ?? hubBuilds[0];
  const kids = v.kids_count ?? 0;
  const lq = lanternQuote(kids, lanternBuild ? Number(lanternBuild.founder_price) : undefined);
  const hubPrice = build ? Number(build.founder_price) : 0;
  const quote = {
    build_id: build?.id ?? null,
    build_name: build?.name ?? null,
    hub_price: hubPrice,
    lanterns: lq.prices,
    lanterns_total: lq.total,
    lanterns_saved: lq.saved,
    total: hubPrice + lq.total,
    note: "Install fee added at scheduling. Payment due after install — nothing now.",
  };

  const payload = {
    name: v.name,
    email: v.email,
    phone: v.phone ?? null,
    address: v.address ?? null,
    city: v.city ?? null,
    state: v.state ?? null,
    intended_build_id: build?.id ?? null,
    wants_plus: v.wants_plus === "on" || v.wants_plus === "true",
    family_info: { kids_count: kids, ages: v.kid_ages ?? null, notes: v.kid_notes ?? null },
    logistics: {
      wall_type: v.wall_type ?? null,
      mounting: v.mounting ?? null,
      hub_room: v.hub_room ?? null,
      timing: v.timing ?? null,
    },
    heard_from: v.heard_from ?? null,
    notes: v.notes ?? null,
    campaign: v.utm ? { utm: v.utm } : {},
    quote,
  };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("rpc_reserve_founder_spot", { p: payload });
    if (error) return { error: "Something went wrong reserving your spot. Please try again." };
    const d = (data ?? {}) as { status?: string; founder_number?: number | null };
    const waitlisted = d.status === "waitlist";
    return { success: true, waitlisted, founderNumber: d.founder_number ?? null };
  } catch {
    return { error: "Something went wrong reserving your spot. Please try again." };
  }
}
