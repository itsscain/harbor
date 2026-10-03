import type { LucideIcon } from "lucide-react";
import {
  Home,
  Users,
  ListChecks,
  CalendarClock,
  CalendarRange,
  Carrot,
  ClipboardList,
  Pill,
  Heart,
  ScrollText,
  Gift,
  Wind,
  StickyNote,
  BarChart3,
  History,
  MessageCircleHeart,
  Bell,
  Tablet,
  Settings,
  CreditCard,
  LayoutGrid,
  Compass,
} from "lucide-react";
import { FEATURES } from "@/lib/features";

// Routes that only make sense with AI on (lib/features.ts). Filtered out of every nav surface
// while AI is hidden, so no parent lands on a "paste your API key" dead end.
const AI_ONLY = new Set(["/app/ask", "/app/pantry"]);
const live = (items: NavItem[]): NavItem[] => (FEATURES.ai ? items : items.filter((i) => !AI_ONLY.has(i.href)));

// Single source of truth for the parent-app (Helm) navigation taxonomy. The mobile
// bottom bar (ParentNav), the desktop rail (ParentRail), and the Plan + More hub pages
// all read from this so the three surfaces can never disagree again.
// Backbone: Today · Kids · Plan · More.

export type NavItem = { href: string; label: string; desc: string; icon: LucideIcon };
export type NavGroup = { heading: string; items: NavItem[] };

/** PLAN — the agenda (events, reminders, dinners) lives on /app/plan itself; these are the
 *  other planning tools under it. (Calendar + Meals merged into the agenda.) */
export const PLAN_GROUP: NavGroup = {
  heading: "Plan the days",
  items: [
    { href: "/app/lists", label: "Lists", desc: "Groceries and to-dos", icon: ClipboardList },
    { href: "/app/medication", label: "Medicine", desc: "Doses, times and a dose log", icon: Pill },
    { href: "/app/routines", label: "All routines", desc: "Every kid's routines in one place", icon: ListChecks },
    { href: "/app/schedule", label: "Routine times", desc: "When each routine shows", icon: CalendarRange },
    { href: "/app/pantry", label: "Pantry", desc: "On-hand ingredients for AI meals", icon: Carrot },
  ],
};

/** FAMILY — how the household runs; the wall-facing configuration + grown-ups. */
export const FAMILY_GROUP: NavGroup = {
  heading: "Your family",
  items: [
    { href: "/app/store", label: "Rewards", desc: "What kids spend their stars on", icon: Gift },
    { href: "/app/rules", label: "House rules", desc: "Rules, and what happens next", icon: ScrollText },
    { href: "/app/calm", label: "Calm tools", desc: "Breathing, feelings, stories", icon: Wind },
    { href: "/app/messages", label: "Message board", desc: "Notes pinned to the wall", icon: StickyNote },
    { href: "/app/family", label: "Grown-ups", desc: "Co-parents and wall profiles", icon: Heart },
  ],
};

/** LOOK BACK — reflection + the ledger. */
export const INSIGHTS_GROUP: NavGroup = {
  heading: "Look back",
  items: [
    { href: "/app/history", label: "Activity", desc: "Everything that happened", icon: History },
    { href: "/app/insights", label: "Patterns", desc: "Gentle trends over the weeks", icon: BarChart3 },
  ],
};

/** ASSISTANT — the copilot + your inbox. */
export const ASSISTANT_GROUP: NavGroup = {
  heading: "Help",
  items: [
    { href: "/app/ask", label: "Ask Harbor", desc: "Talk or type — grounded help & drafts", icon: MessageCircleHeart },
    { href: "/app/notifications", label: "Notifications", desc: "Things Harbor flagged for you", icon: Bell },
    { href: "/app?setup=1", label: "Getting started", desc: "Your setup checklist", icon: Compass },
  ],
};

/** ACCOUNT — system + hardware + money. */
export const ACCOUNT_GROUP: NavGroup = {
  heading: "Setup",
  items: [
    { href: "/app/devices", label: "Screens", desc: "The wall and bedroom screens", icon: Tablet },
    { href: "/app/settings", label: "Settings", desc: "PIN, time zone, alerts", icon: Settings },
    { href: "/app/billing", label: "Harbor Plus", desc: "Extras for your family", icon: CreditCard },
  ],
};

const withoutHidden = (g: NavGroup): NavGroup => ({ ...g, items: live(g.items) });

/** The Plan hub page renders this. */
export const PLAN_GROUPS: NavGroup[] = [PLAN_GROUP].map(withoutHidden);
/** The More hub page renders these. */
// (The old "Command" remote now lives on Today, so it's no longer a separate destination.)
export const MORE_GROUPS: NavGroup[] = [FAMILY_GROUP, INSIGHTS_GROUP, ASSISTANT_GROUP, ACCOUNT_GROUP].map(withoutHidden);

/** All routes that light up the "Plan" / "More" primary tabs. */
export const PLAN_ROUTES = ["/app/plan", "/app/calendar", "/app/meals", ...PLAN_GROUP.items.map((i) => i.href)];
export const MORE_ROUTES = ["/app/more", ...MORE_GROUPS.flatMap((g) => g.items.map((i) => i.href))];

export type PrimaryTab = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** exact match (Today only) vs. any of these prefixes. */
  exact?: boolean;
  match?: string[];
  /** show the unread badge on this tab (Notifications lives under More). */
  badge?: boolean;
};

/** The four primary destinations — identical on mobile and desktop. */
export const PRIMARY_TABS: PrimaryTab[] = [
  { href: "/app", label: "Today", icon: Home, exact: true },
  { href: "/app/children", label: "Kids", icon: Users, match: ["/app/children"] },
  { href: "/app/plan", label: "Plan", icon: CalendarClock, match: PLAN_ROUTES },
  { href: "/app/more", label: "More", icon: LayoutGrid, match: MORE_ROUTES, badge: true },
];
