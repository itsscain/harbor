import { notFound } from "next/navigation";
import { BoatPreview } from "./BoatPreview";

// Development-only: the Shipyard's boats, parts and living pets (404s in production).
// /dev/boat              → every model, paint, sail, flag, figurehead, deck gear and pet
// /dev/boat?night=1      → at night (lit windows, glowing lantern, sleeping pets)
export const dynamic = "force-dynamic";

export default async function DevBoatPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const sp = await searchParams;
  return <BoatPreview night={sp.night === "1"} />;
}
