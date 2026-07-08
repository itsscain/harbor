import type { LucideIcon } from "lucide-react";
import {
  Home,
  Users,
  ListChecks,
  CalendarClock,
  CalendarRange,
  CalendarDays,
  UtensilsCrossed,
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

// Single source of truth for the parent-app (Helm) navigation taxonomy. The mobile
// bottom bar (ParentNav), the desktop rail (ParentRail), and the Plan + More hub pages
// all read from this so the three surfaces can never disagree again.
// Backbone: Today · Kids · Plan · More.

export type NavItem = { href: string; label: string; desc: string; icon: LucideIcon };
export type NavGroup = { heading: string; items: NavItem[] };

/** PLAN — everything time / scheduling / planning shaped. */
export const PLAN_GROUP: NavGroup = {
  heading: "Plan the days",
  items: [
    { href: "/app/routines", label: "Routines", desc: "Build each child's day", icon: ListChecks },
    { href: "/app/schedule", label: "Family Schedule", desc: "Every routine × every child; set windows once", icon: CalendarRange },
    { href: "/app/calendar", label: "Calendar", desc: "Events, reminders & appointments", icon: CalendarDays },
    { href: "/app/meals", label: "Meals", desc: "Plan the week's dinners", icon: UtensilsCrossed },
    { href: "/app/pantry", label: "Pantry", desc: "On-hand ingredients for AI meals", icon: Carrot },
    { href: "/app/lists", label: "Lists", desc: "Grocery & things to remember", icon: ClipboardList },
    { href: "/app/medication", label: "Medication", desc: "Doses, times & a record for the doctor", icon: Pill },
  ],
};

/** FAMILY — how the household runs; the wall-facing configuration + grown-ups. */
export const FAMILY_GROUP: NavGroup = {
  heading: "Your family",
  items: [
    { href: "/app/family", label: "Grown-ups", desc: "Parents & caregivers + Together Time", icon: Heart },
    { href: "/app/rules", label: "House Rules", desc: "Rules & the consequence ladder on the wall", icon: ScrollText },
    { href: "/app/store", label: "Rewards", desc: "What kids spend their stars on", icon: Gift },
    { href: "/app/calm", label: "Calm Tools", desc: "Breathing, feelings & social stories", icon: Wind },
    { href: "/app/messages", label: "Message board", desc: "Notes & nudges for the wall", icon: StickyNote },
  ],
};

/** LOOK BACK — reflection + the ledger. */
export const INSIGHTS_GROUP: NavGroup = {
  heading: "Look back",
  items: [
    { href: "/app/insights", label: "Insights", desc: "Trends & gentle patterns", icon: BarChart3 },
    { href: "/app/history", label: "Activity", desc: "Full ledger — chores, routines, rewards", icon: History },
  ],
};

/** ASSISTANT — the copilot + your inbox. */
export const ASSISTANT_GROUP: NavGroup = {
  heading: "Harbor helps",
  items: [
    { href: "/app/ask", label: "Ask Harbor", desc: "Talk or type — grounded help & drafts", icon: MessageCircleHeart },
    { href: "/app/notifications", label: "Notifications", desc: "Everything Harbor flagged for you", icon: Bell },
    { href: "/app?setup=1", label: "Getting started", desc: "Reopen your setup checklist", icon: Compass },
  ],
};

/** ACCOUNT — system + hardware + money. */
export const ACCOUNT_GROUP: NavGroup = {
  heading: "Account",
  items: [
    { href: "/app/devices", label: "Devices", desc: "Name, monitor & manage every screen", icon: Tablet },
    { href: "/app/settings", label: "Settings", desc: "Household, wall PIN, notifications, account", icon: Settings },
    { href: "/app/billing", label: "Harbor Plus", desc: "Cloud sync & extras", icon: CreditCard },
  ],
};

/** The Plan hub page renders this. */
export const PLAN_GROUPS: NavGroup[] = [PLAN_GROUP];
/** The More hub page renders these. */
export const MORE_GROUPS: NavGroup[] = [FAMILY_GROUP, INSIGHTS_GROUP, ASSISTANT_GROUP, ACCOUNT_GROUP];

/** All routes that light up the "Plan" / "More" primary tabs. */
export const PLAN_ROUTES = ["/app/plan", ...PLAN_GROUP.items.map((i) => i.href)];
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
