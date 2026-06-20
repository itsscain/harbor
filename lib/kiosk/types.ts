// On-device kiosk types. The kiosk's source of truth is IndexedDB; these mirror
// the snapshot returned by the rpc_kiosk_* functions plus local-only state.

export type KioskChild = {
  id: string;
  name: string;
  avatar: string | null;
  sort_order: number;
  settings: Record<string, unknown> | null;
};

export type KioskRoutine = {
  id: string;
  child_id: string;
  name: string;
  type: "schedule" | "first_then";
  active: boolean;
  sort_order: number;
};

export type KioskStep = {
  id: string;
  routine_id: string;
  order_index: number;
  label: string;
  icon: string | null;
  photo_url: string | null;
  step_type: "task" | "first" | "then";
  reward_points: number;
};

export type KioskCalmTool = {
  id: string;
  child_id: string | null;
  tool_type: "breathing" | "feelings" | "break" | "social_story";
  config: Record<string, unknown>;
  enabled: boolean;
  sort_order: number;
};

export type KioskSnapshot = {
  household: {
    id: string;
    name: string;
    plus_active: boolean;
    parent_pin_set: boolean;
  };
  children: KioskChild[];
  routines: KioskRoutine[];
  steps: KioskStep[];
  rewards: { child_id: string; points_total: number }[];
  calm_tools: KioskCalmTool[];
  server_time: string;
};

export type Mutation =
  | { kind: "completion"; child_id: string; step_id: string; points: number; created_at: string }
  | { kind: "check_in"; child_id: string; feeling: string; note: string | null; created_at: string }
  | { kind: "redemption"; child_id: string; points: number; reason: string; created_at: string };

export type DayProgress = { date: string; completed: string[] };

export type KioskState = {
  deviceSecret: string;
  householdId: string;
  snapshot: KioskSnapshot;
  /** Local SHA-256 of the parent PIN — gates parent-only actions, offline. */
  pinHash: string | null;
  lastSync: string | null;
  /** Points per child (offline-authoritative for display). */
  points: Record<string, number>;
  /** Per-child completion for the current day; resets when the date rolls over. */
  progress: Record<string, DayProgress>;
  /** Pending mutations to push when online + Plus active. */
  outbox: Mutation[];
};
