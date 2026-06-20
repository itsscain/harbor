import type { Tables, Enums } from "@/lib/database.types";

// Row aliases used across the surfaces.
export type Profile = Tables<"profiles">;
export type Household = Tables<"households">;
export type Child = Tables<"children">;
export type Routine = Tables<"routines">;
export type RoutineStep = Tables<"routine_steps">;
export type Reward = Tables<"rewards">;
export type RewardLog = Tables<"reward_log">;
export type CalmTool = Tables<"calm_tools">;
export type CheckIn = Tables<"check_ins">;
export type Build = Tables<"builds">;
export type BuildSupply = Tables<"build_supplies">;
export type InventoryItem = Tables<"inventory">;
export type Customer = Tables<"customers">;
export type Referral = Tables<"referrals">;
export type PlusSubscription = Tables<"plus_subscriptions">;
export type DevicePairing = Tables<"device_pairings">;
export type WaitlistEntry = Tables<"waitlist">;
export type FamilyEvent = Tables<"events">;
export type StoreItem = Tables<"store_items">;
export type ListItem = Tables<"list_items">;
export type WallMessage = Tables<"wall_messages">;
export type Reminder = Tables<"reminders">;
export type Meal = Tables<"meals">;

// Enum aliases.
export type RoutineType = Enums<"routine_type">;
export type StepType = Enums<"step_type">;
export type CalmToolType = Enums<"calm_tool_type">;
export type CustomerStatus = Enums<"customer_status">;
export type PairingStatus = Enums<"pairing_status">;
export type PlusPlan = Enums<"plus_plan">;
export type ReferralStatus = Enums<"referral_status">;
export type UserRole = Enums<"user_role">;

// A build joined with its supplies (used by the catalog + shopping list).
export type BuildWithSupplies = Build & { build_supplies: BuildSupply[] };

/** Hardware cost = sum of non-optional supplies. Margin = price − hardware. */
export function hardwareCost(supplies: BuildSupply[]): number {
  return supplies
    .filter((s) => !s.optional)
    .reduce((sum, s) => sum + Number(s.unit_cost) * s.quantity, 0);
}

export function margin(price: number, supplies: BuildSupply[]): number {
  return price - hardwareCost(supplies);
}

export const FOUNDER_SPOTS = 15;
