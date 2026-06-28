import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/primitives";
import { AskHarbor } from "@/components/app/AskHarbor";

export const metadata = { title: "Ask Harbor" };
export const dynamic = "force-dynamic";

export default function AskPage() {
  return (
    <>
      <PageHeader
        eyebrow="Copilot"
        title="Ask Harbor"
        subtitle="Talk or type. Harbor knows your kids' day and can help you think things through — or draft a routine, a social story, or a week's summary you can use."
      />
      <AskHarbor />
      <Card className="mt-5 bg-harbor-50/60">
        <p className="text-sm text-ink">
          <b>Harbor isn&apos;t a doctor.</b> For medical, diagnosis, or medication questions, talk to your
          pediatrician or therapist. Ask Harbor advises and drafts — it never changes your household on its own.
        </p>
      </Card>
    </>
  );
}
