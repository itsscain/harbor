import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { Json } from "@/lib/database.types";

/** Append a row to the operator audit log (§13). Self-contained — derives the actor from the
 *  current admin session. Call after any console action on a customer account. */
export async function logAudit(opts: {
  action: string;
  targetType?: string;
  targetId?: string;
  detail?: Record<string, unknown>;
}): Promise<void> {
  const me = await requireAdmin();
  const supabase = await createClient();
  await supabase.from("admin_audit_log").insert({
    actor: me.id,
    actor_name: me.full_name ?? "Operator",
    action: opts.action,
    target_type: opts.targetType ?? null,
    target_id: opts.targetId ?? null,
    detail: (opts.detail ?? {}) as unknown as Json,
  });
}
