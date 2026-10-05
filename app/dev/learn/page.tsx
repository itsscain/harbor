import { notFound } from "next/navigation";
import { LearnPreview } from "./LearnPreview";
import { DonePreview } from "./DonePreview";

// Development-only: Harbor Learn on a mock wall (404s in production).
// /dev/learn                 → a child's wall screen with the My Day | Learn switch
// /dev/learn?lesson=<id>     → straight into a level (e.g. read.ls1.1, code.rover.1, math.add5.1, char.magic-words.1)
// &only=<activity kind>      → just that level's activities of one kind (e.g. find-letter, factory)
// &grade=prek|k|1|2|3|4|5    → the child's grade · &fresh=1 → a brand-new learner (who still has
//                              Boat School, the unskippable boat tutorial, ahead)
// &aq=full → an aquarium with every creature, decoration and tank · &tank=<id> → that tank
// ?done=0|1|2|3              → the finish screen with made-up results (0 = "so close")
export const dynamic = "force-dynamic";

export default async function DevLearnPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const sp = await searchParams;
  if (sp.done !== undefined) return <DonePreview stars={Math.max(0, Math.min(3, Number(sp.done) || 0))} />;
  return <LearnPreview lesson={sp.lesson ?? null} only={sp.only ?? null} grade={sp.grade ?? "k"} fresh={sp.fresh === "1"} aq={sp.aq ?? null} tank={sp.tank ?? null} />;
}
