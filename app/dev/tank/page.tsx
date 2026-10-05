import { notFound } from "next/navigation";
import { TankPreview } from "./TankPreview";

// Development-only: every aquarium creature, alive (404s in production).
// /dev/tank            → all creatures (tap one to see its reaction)
// /dev/tank?stage=0..3 → at a growth stage · &big=1 → large · &only=sunny,finn → just those
export const dynamic = "force-dynamic";

export default async function DevTankPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const sp = await searchParams;
  return <TankPreview stage={Number(sp.stage ?? 1)} big={sp.big === "1"} only={sp.only ? sp.only.split(",") : null} />;
}
