// On-device kiosk types. The kiosk's source of truth is IndexedDB; these mirror
// the snapshot returned by the rpc_kiosk_* functions plus local-only state.

export type KioskChild = {
  id: string;
  name: string;
  avatar: string | null;
  color: string | null;
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
  start_time: string | null;
  end_time: string | null;
  days_of_week: number[] | null;
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
  start_time: string | null;
  duration_min: number | null;
};

export type KioskCalmTool = {
  id: string;
  child_id: string | null;
  tool_type: "breathing" | "feelings" | "break" | "social_story";
  config: Record<string, unknown>;
  enabled: boolean;
  sort_order: number;
};

export type KioskEvent = {
  id: string;
  child_id: string | null;
  title: string;
  emoji: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  is_countdown: boolean;
  person_label: string | null;
  color: string | null;
  responsible_label: string | null;
  recurrence_rule: string | null;
};

export type KioskMeal = {
  id: string;
  date: string;
  meal_type: string;
  title: string;
  emoji: string | null;
  notes: string | null;
  sort_order: number;
};

export type KioskStoreItem = {
  id: string;
  child_id: string | null;
  label: string;
  emoji: string | null;
  image_url: string | null;
  cost_points: number;
  kind: string;
  sort_order: number;
  enabled: boolean;
};

export type KioskListItem = {
  id: string;
  list_kind: string;
  name: string;
  category: string | null;
  quantity: string | null;
  checked: boolean;
  added_by_label: string | null;
  sort_order: number;
};

export type KioskWallMessage = {
  id: string;
  child_id: string | null;
  body: string;
  emoji: string | null;
  author_label: string | null;
  pinned: boolean;
  expires_at: string | null;
  created_at: string;
};

export type KioskReminder = {
  id: string;
  child_id: string | null;
  title: string;
  due_date: string;
  done: boolean;
  snoozed_until: string | null;
};

export type KioskHousehold = {
  id: string;
  name: string;
  plus_active: boolean;
  parent_pin_set: boolean;
  parent_pin_hash?: string | null;
  settings?: Record<string, unknown> | null;
};

export type KioskSnapshot = {
  household: KioskHousehold;
  children: KioskChild[];
  routines: KioskRoutine[];
  steps: KioskStep[];
  rewards: { child_id: string; points_total: number }[];
  calm_tools: KioskCalmTool[];
  events: KioskEvent[];
  store_items: KioskStoreItem[];
  list_items: KioskListItem[];
  wall_messages: KioskWallMessage[];
  reminders: KioskReminder[];
  meals: KioskMeal[];
  server_time: string;
};

export type Mutation =
  | { kind: "completion"; op_id: string; child_id: string; step_id: string; points: number; created_at: string }
  | { kind: "check_in"; child_id: string; feeling: string; note: string | null; created_at: string }
  | {
      kind: "redemption";
      op_id: string;
      child_id: string;
      points: number;
      reason: string;
      store_item_id?: string | null;
      label?: string | null;
      created_at: string;
    }
  | {
      kind: "list_add";
      client_id: string;
      name: string;
      category: string | null;
      list_kind: string;
      added_by_label: string | null;
      created_at: string;
    }
  | { kind: "list_check"; id: string; checked: boolean; created_at: string };

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
