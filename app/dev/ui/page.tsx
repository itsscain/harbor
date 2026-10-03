import { notFound } from "next/navigation";
import { UiGallery } from "./UiGallery";

// Development-only design gallery for the parent-app toolkit and redesigned screens, rendered
// with mock data (the real /app needs a signed-in parent). 404s in production builds.
export const dynamic = "force-dynamic";

export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <UiGallery />;
}
