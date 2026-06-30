"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/admin/audit";

/** Update the founder program config (§9.4). cap/rate/enrollment drive the public funnel +
 *  dashboard live (the funnel auto-waitlists when paused or full). Audited. */
export async function updateFounderProgram(formData: FormData) {
  await requireAdmin();
  const cap = Math.max(1, Math.min(999, Math.trunc(Number(formData.get("cap")) || 15)));
  const rate = Math.max(0, Number(formData.get("rate")) || 0);
  const enrollment_state = formData.get("paused") === "on" ? "paused" : "open";

  const supabase = await createClient();
  const { error } = await supabase
    .from("founder_program")
    .update({ cap, rate, enrollment_state })
    .eq("id", true);
  if (error) throw new Error(error.message);

  await logAudit({ action: "founder_program.update", targetType: "founder_program", detail: { cap, rate, enrollment_state } });
  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  revalidatePath("/founders");
}
