"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/admin/audit";

/** Remote-fix a device from the account inspector (§6.3). "refresh" = clear caches → latest
 *  build (the stale-wall fix); "identify" = flash/chime. Audited. */
export async function accountDeviceCommand(householdId: string, deviceId: string, action: string) {
  await requireAdmin();
  const supabase = await createClient();
  // Scope to the household so a forged/mismatched form can't command another household's device
  // (and the audit trail stays honest).
  const { error } = await supabase
    .from("device_pairings")
    .update({ pending_command: action })
    .eq("id", deviceId)
    .eq("household_id", householdId);
  if (error) throw new Error(error.message);
  await logAudit({ action: `device.${action}`, targetType: "device_pairing", targetId: deviceId, detail: { household_id: householdId } });
  revalidatePath(`/admin/accounts/${householdId}`);
}

/** Add a support note to the account timeline (§6.3 flag & note). Audited (the note IS the log row). */
export async function addAccountNote(householdId: string, formData: FormData) {
  await requireAdmin();
  const note = String(formData.get("note") || "").trim();
  if (!note) return;
  await logAudit({ action: "note", targetType: "household", targetId: householdId, detail: { note } });
  revalidatePath(`/admin/accounts/${householdId}`);
}
