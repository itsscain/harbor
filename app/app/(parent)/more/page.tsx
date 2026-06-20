import Link from "next/link";
import { MessageSquareHeart, Heart, BarChart3, CreditCard, Settings, ChevronRight, UtensilsCrossed } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/primitives";

export const metadata = { title: "More" };

const links = [
  { href: "/app/meals", label: "Meal plan", desc: "Plan the week's dinners", icon: UtensilsCrossed },
  { href: "/app/messages", label: "Message board", desc: "Notes & nudges for the wall", icon: MessageSquareHeart },
  { href: "/app/calm", label: "Calm Corner", desc: "Breathing, feelings, stories", icon: Heart },
  { href: "/app/insights", label: "Insights", desc: "Trends & gentle patterns", icon: BarChart3 },
  { href: "/app/billing", label: "Harbor Plus", desc: "Cloud sync & extras", icon: CreditCard },
  { href: "/app/settings", label: "Settings", desc: "Household, wall PIN, devices", icon: Settings },
];

export default function MorePage() {
  return (
    <>
      <PageHeader title="More" />
      <div className="space-y-3">
        {links.map(({ href, label, desc, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="flex items-center gap-3 hover:border-water/50">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-harbor-50 text-harbor">
                <Icon className="h-6 w-6" />
              </span>
              <div className="flex-1">
                <p className="font-display text-base font-bold text-harbor">{label}</p>
                <p className="text-sm text-muted">{desc}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted" />
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
