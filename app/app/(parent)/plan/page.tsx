import { CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { NavHub } from "@/components/app/NavHub";
import { PLAN_GROUPS } from "@/lib/app-nav";

export const metadata = { title: "Plan" };

// The Plan hub — everything time / scheduling / planning shaped, in one place.
export default function PlanPage() {
  return (
    <>
      <PageHeader
        eyebrow="Plan"
        icon={<CalendarClock className="h-6 w-6" />}
        title="Plan the days"
        subtitle="Routines, the family schedule, calendar, meals, and lists — all together."
      />
      <NavHub groups={PLAN_GROUPS} />
    </>
  );
}
