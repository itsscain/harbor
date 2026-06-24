import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyHousehold } from "@/lib/household";
import { syncGoogle } from "@/lib/google/sync";

// "Sync now" — push local-only events up and pull Google changes down.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  const household = await getMyHousehold();
  if (!household) return NextResponse.json({ ok: false, error: "No household" }, { status: 400 });
  try {
    const r = await syncGoogle(supabase, household.id);
    revalidatePath("/app/calendar");
    return NextResponse.json({ ok: true, ...r });
  } catch {
    return NextResponse.json({ ok: false, error: "Sync failed — try reconnecting Google in Settings." }, { status: 500 });
  }
}
