import { PageHeader } from "@/components/ui/PageHeader";
import { NavHub } from "@/components/app/NavHub";
import { MORE_GROUPS } from "@/lib/app-nav";

export const metadata = { title: "More" };

// More — everything that isn't a daily job: rewards and rules, a look back, help, and setup.
export default function MorePage() {
  return (
    <>
      <PageHeader title="More" />
      <NavHub groups={MORE_GROUPS} />
    </>
  );
}
