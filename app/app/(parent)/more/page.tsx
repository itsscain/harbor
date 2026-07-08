import { LayoutGrid } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { NavHub } from "@/components/app/NavHub";
import { MORE_GROUPS } from "@/lib/app-nav";

export const metadata = { title: "More" };

// The More hub — your family's setup, reflection, the assistant, and account.
export default function MorePage() {
  return (
    <>
      <PageHeader eyebrow="Everything else" icon={<LayoutGrid className="h-6 w-6" />} title="More" />
      <NavHub groups={MORE_GROUPS} />
    </>
  );
}
