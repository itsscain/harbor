import { redirect } from "next/navigation";

// The calendar now lives in the Plan agenda (events, reminders and dinners in one list).
export default function CalendarPage() {
  redirect("/app/plan");
}
