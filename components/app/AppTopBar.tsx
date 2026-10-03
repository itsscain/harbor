"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Wordmark } from "@/components/brand/Logo";
import { NotificationBell } from "@/components/app/NotificationBell";
import { AccountMenu } from "@/components/app/AccountMenu";
import { PLAN_GROUPS, MORE_GROUPS } from "@/lib/app-nav";
import { cn } from "@/lib/cn";

// The phone's top bar. On the four tab screens it's the brand + bell + account. Everywhere else it
// becomes a real navigation bar: "‹ Back" (to where you came from, else the screen's parent — an
// installed iPhone app has no browser Back) plus the page title, which fades in once the page's
// own big title scrolls away.

const TAB_ROOTS = new Set(["/app", "/app/children", "/app/plan", "/app/more"]);
const TITLES = new Map<string, string>([
  ...[...PLAN_GROUPS, ...MORE_GROUPS].flatMap((g) => g.items.map((i) => [i.href, i.label] as [string, string])),
  ["/app/notifications", "Notifications"],
  ["/app/settings", "Settings"],
  ["/app/billing", "Harbor Plus"],
  ["/app/command", "Today"],
]);
const PLAN_SET = new Set(PLAN_GROUPS.flatMap((g) => g.items.map((i) => i.href)));

function parentOf(path: string): string {
  const routine = path.match(/^\/app\/children\/([^/]+)\/routines\//);
  if (routine) return `/app/children/${routine[1]}?tab=routines`;
  if (path.startsWith("/app/children/")) return "/app/children";
  if (PLAN_SET.has(path)) return "/app/plan";
  if (path === "/app/notifications") return "/app";
  return "/app/more";
}

// Pages can set a dynamic title (e.g. the kid's name) with <SetTopBarTitle title="Leo" />.
const TitleContext = createContext<{ set: (t: string | null) => void } | null>(null);

export function SetTopBarTitle({ title }: { title: string }) {
  const ctx = useContext(TitleContext);
  useEffect(() => {
    ctx?.set(title);
    return () => ctx?.set(null);
  }, [ctx, title]);
  return null;
}

// In-app history so Back returns to the previous screen when there is one.
let lastPath: string | null = null;

export function AppTopBarProvider({
  unread,
  householdName,
  children,
}: {
  unread: number;
  householdName?: string | null;
  children: React.ReactNode;
}) {
  const [override, setOverride] = useState<string | null>(null);
  const [ctx] = useState(() => ({ set: (t: string | null) => setOverride(t) }));
  return (
    <TitleContext.Provider value={ctx}>
      <AppTopBar unread={unread} householdName={householdName} override={override} />
      {children}
    </TitleContext.Provider>
  );
}

function AppTopBar({ unread, householdName, override }: { unread: number; householdName?: string | null; override: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const prev = useRef<string | null>(null);

  useEffect(() => {
    prev.current = lastPath;
    lastPath = pathname;
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 56);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  const isRoot = TAB_ROOTS.has(pathname);
  const title = override ?? TITLES.get(pathname) ?? (pathname.startsWith("/app/children/") ? "Kid" : "");

  return (
    <header className="sticky top-0 z-20 flex min-h-14 items-center gap-1 border-b border-line bg-surface/85 px-2 pb-1.5 pt-[calc(0.375rem+env(safe-area-inset-top))] backdrop-blur-lg lg:hidden">
      {isRoot ? (
        <div className="flex-1 pl-2">
          <Wordmark />
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => {
              if (prev.current && prev.current.startsWith("/app") && prev.current !== pathname) router.back();
              else router.push(parentOf(pathname));
            }}
            className="flex min-h-11 items-center gap-0.5 rounded-xl pl-1 pr-2.5 text-[15px] font-semibold text-accent transition hover:bg-surface-2"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2.25} /> Back
          </button>
          <p
            className={cn(
              "min-w-0 flex-1 truncate text-center text-[16px] font-semibold text-fg transition-opacity duration-200",
              scrolled ? "opacity-100" : "opacity-0",
            )}
            aria-hidden={!scrolled}
          >
            {title}
          </p>
          {/* Balances the Back button so the title stays centered. */}
          <span className="w-[4.5rem]" aria-hidden />
        </>
      )}
      <div className="flex items-center gap-0.5">
        <NotificationBell count={unread} />
        {isRoot && <AccountMenu householdName={householdName} />}
      </div>
    </header>
  );
}
