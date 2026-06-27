// On-device kiosk types. The kiosk's source of truth is IndexedDB; these mirror
// the snapshot returned by the rpc_kiosk_* functions plus local-only state.

export type KioskChildProfile = {
  summary?: string;
  interests?: string[];
  motivators?: string[];
  encouragement?: string[];
  note?: string | null;
  updated_at?: string;
};

export type KioskChild = {
  id: string;
  name: string;
  avatar: string | null;
  photo_url: string | null;
  color: string | null;
  birthday: string | null;
  ai_profile: KioskChildProfile | null;
  sort_order: number;
  settings: Record<string, unknown> | null;
};

/** A wall-visible household member who isn't a kid — a parent, caregiver, or older
 *  sibling. They participate (own routines + Together Time) but earn NO points. */
export type KioskPerson = {
  id: string;
  name: string;
  avatar: string | null;
  photo_url: string | null;
  color: string | null;
  role: string; // 'parent' | 'caregiver' | 'sibling'
  settings: Record<string, unknown> | null;
  sort_order: number;
};

export type KioskRoutine = {
  id: string;
  /** A routine belongs to a child OR a person (exactly one is set). */
  child_id: string | null;
  person_id?: string | null;
  /** Together Time (§4.2): a shared parent+child moment, optionally linked to a child. */
  together?: boolean;
  with_child_id?: string | null;
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
  /** Skill Levels (§4.4): parent baseline scaffolding (1 full → 4 on your own). */
  support_level?: number;
};

/** Earned independence per (child, step) — synced for the parent's growth view. */
export type KioskSkillProgress = {
  id: string;
  child_id: string;
  step_id: string;
  streak: number;
  level_earned: number;
  last_date: string | null;
};

export type KioskChore = {
  id: string;
  child_id: string;
  title: string;
  icon: string | null;
  points: number;
  days_of_week: number[] | null;
  /** When set (≥2 ids), the chore rotates weekly through these kids. */
  rotation_member_ids: string[] | null;
  /** When true, completing it on the wall needs the parent PIN. */
  requires_approval?: boolean;
  active: boolean;
  sort_order: number;
};

/** A child's medication (§4.3). A calm tracker + ritual — NOT dosing instructions a
 *  child acts on alone, NOT a reward. */
export type KioskMedication = {
  id: string;
  child_id: string;
  name: string;
  dose: string | null;
  icon: string | null;
  helps_note: string | null;
  schedule_times: string[];
  days_of_week: number[] | null;
  with_food: boolean;
  parent_administered: boolean;
  active: boolean;
  sort_order: number;
};

/** A logged dose (today's, from the snapshot) so the wall shows taken state offline. */
export type KioskMedLog = {
  id: string;
  child_id: string;
  medication_id: string;
  dose_date: string;
  dose_time: string | null;
  status: string;
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
  /** Set when the event came from a connected Google Calendar (sync affordance). */
  google_event_id?: string | null;
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

export type KioskHouseRule = {
  id: string;
  kind: "rule" | "consequence";
  title: string;
  detail: string | null;
  emoji: string | null;
  sort_order: number;
};

export type KioskGrounding = {
  id: string;
  child_id: string;
  reason: string | null;
  note: string | null;
  started_on: string;
  ends_on: string;
  pause_rewards: boolean;
  pause_screen_time: boolean;
  privileges_lost: string[] | null;
  status: string;
};

export type KioskCornerPlan = {
  steps?: string[];
  reminder?: string;
  encouragement?: string;
};

export type KioskCorner = {
  id: string;
  child_id: string;
  reason: string | null;
  feeling: string | null;
  duration_minutes: number;
  started_at: string;
  ended_at: string | null;
  status: string;
  plan: KioskCornerPlan | null;
  report: string | null;
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
  /** Parents/caregivers/siblings who appear on the wall (§4.1). */
  people?: KioskPerson[];
  routines: KioskRoutine[];
  steps: KioskStep[];
  chores?: KioskChore[];
  /** Medication Station (§4.3). */
  medications?: KioskMedication[];
  medication_logs?: KioskMedLog[];
  /** Skill Levels (§4.4) — earned independence per step. */
  skill_progress?: KioskSkillProgress[];
  rewards: { child_id: string; points_total: number }[];
  calm_tools: KioskCalmTool[];
  house_rules?: KioskHouseRule[];
  events: KioskEvent[];
  store_items: KioskStoreItem[];
  list_items: KioskListItem[];
  wall_messages: KioskWallMessage[];
  reminders: KioskReminder[];
  meals: KioskMeal[];
  groundings?: KioskGrounding[];
  corners?: KioskCorner[];
  /** Hard-deletion tombstones since the cursor — the wall removes these ids. */
  deletions?: { entity: string; entity_id: string }[];
  server_time: string;
};

export type Mutation =
  | { kind: "completion"; op_id: string; child_id: string; step_id: string; points: number; created_at: string }
  | { kind: "person_completion"; op_id: string; person_id: string; step_id: string; created_at: string }
  | {
      kind: "skill_progress";
      child_id: string;
      step_id: string;
      streak: number;
      level_earned: number;
      last_date: string;
      created_at: string;
    }
  | {
      kind: "med_log";
      op_id: string;
      child_id: string;
      medication_id: string;
      dose_date: string;
      dose_time: string | null;
      confirmed_by: string;
      created_at: string;
    }
  | { kind: "chore_done"; op_id: string; child_id: string; chore_id: string; points: number; created_at: string }
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
  /** 'wall' (full hub, default) or 'outpost' (single-child room device). */
  kind?: string;
  /** For outposts, the bound child this device shows. */
  outpostChildId?: string | null;
  snapshot: KioskSnapshot;
  /** Local SHA-256 of the parent PIN — gates parent-only actions, offline. */
  pinHash: string | null;
  lastSync: string | null;
  /** Points per child (offline-authoritative for display). */
  points: Record<string, number>;
  /** Per-child completion for the current day; resets when the date rolls over. */
  progress: Record<string, DayProgress>;
  /** Per-person (parent/caregiver) completion for the current day — NO points. */
  personProgress?: Record<string, DayProgress>;
  /** Doses taken today, per child: childId → { date, completed: ["<medId>:<time>"] }. */
  medProgress?: Record<string, DayProgress>;
  /** Skill independence (§4.4), keyed "<childId>:<stepId>" → streak + earned level. */
  skill?: Record<string, { streak: number; level: number; lastDate: string }>;
  /** Transient: the most recent independence level-up, for a calm celebration. */
  lastLevelUp?: { childId: string; stepId: string; level: number; n: number };
  /** Auto-soften (§9.1.3): childId → date the wall dialed them to calm intensity
   *  after a rough Anchor. Honored only for today; auto-restores next morning. */
  autoSoften?: Record<string, string>;
  /** Per-child completion streaks (local-first). childId → { count, lastDate }. */
  streaks?: Record<string, { count: number; lastDate: string }>;
  /** Time integrity (§1.2): wall-clock at the last sync (anchors trusted "now" with
   *  state.lastSync = server time), the last trusted service day, the last observed
   *  wall clock, and whether the clock looks tampered. */
  trustedAt?: number;
  lastTrustedDay?: string;
  lastSeenWall?: number;
  clockSuspect?: boolean;
  /** Pending mutations to push when online + Plus active. */
  outbox: Mutation[];
};
