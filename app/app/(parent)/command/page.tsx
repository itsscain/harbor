import { redirect } from "next/navigation";

// The live remote now lives on Today (Needs you · each kid's Stars / Note / Calm · House mode).
// Old links and notifications that point here land on Today's "Needs you".
export default function CommandPage() {
  redirect("/app#needs-you");
}
