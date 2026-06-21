"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Boxes,
  Users,
  House,
} from "lucide-react";
import { cn } from "@/lib/cn";

const items = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/my-family", label: "My Family", icon: House },
  { href: "/admin/builds", label: "Build Catalog", icon: Package },
  { href: "/admin/shopping-list", label: "Shopping List", icon: ShoppingCart },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/customers", label: "Customers", icon: Users },
];

export function AdminNav({
  orientation = "vertical",
}: {
  orientation?: "vertical" | "horizontal";
}) {
  const pathname = usePathname();
  const horizontal = orientation === "horizontal";
  return (
    <nav className={cn(horizontal ? "flex gap-1 overflow-x-auto" : "space-y-1")}>
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150 active:scale-[0.98]",
              horizontal ? "whitespace-nowrap" : "gap-3",
              active
                ? "bg-harbor text-white shadow-button"
                : "text-harbor hover:bg-harbor-50",
            )}
          >
            <Icon
              className={cn("h-5 w-5", active ? "text-white" : "text-muted")}
              aria-hidden
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
