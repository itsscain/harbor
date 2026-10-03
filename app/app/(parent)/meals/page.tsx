import { redirect } from "next/navigation";

// Dinners are planned right in the Plan agenda now (an "Add dinner" slot on each of the next 7 days).
export default function MealsPage() {
  redirect("/app/plan");
}
