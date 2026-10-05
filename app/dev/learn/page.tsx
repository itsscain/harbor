import { notFound } from "next/navigation";
import { LearnPreview } from "./LearnPreview";

// Development-only: Harbor Learn on a mock wall (404s in production).
// /dev/learn                 → a child's wall screen with the My Day | Learn switch
// /dev/learn?lesson=<id>     → straight into a level (e.g. read.ls1.1, code.rover.1, math.add5.1, char.magic-words.1)
// &grade=prek|k|1|2|3|4|5    → the child's grade · &fresh=1 → a brand-new learner (who still has
//                              Boat School, the unskippable boat tutorial, ahead)
// &aq=full → an aquarium with every creature, decoration and tank · &tank=<id> → that tank
export const dynamic = "force-dynamic";

export default async function DevLearnPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const sp = await searchParams;
  return <LearnPreview lesson={sp.lesson ?? null} grade={sp.grade ?? "k"} fresh={sp.fresh === "1"} aq={sp.aq ?? null} tank={sp.tank ?? null} />;
}
