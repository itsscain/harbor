import { notFound } from "next/navigation";
import { TodayPreview } from "./TodayPreview";

// Development-only: the redesigned Today screen with mock data (404s in production builds).
export const dynamic = "force-dynamic";

export default function DevTodayPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <TodayPreview />;
}
