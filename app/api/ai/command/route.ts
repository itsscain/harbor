import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { HAIKU, aiErrorMessage } from "@/lib/ai/anthropic";
import { planDinners } from "@/lib/ai/mealPlan";

/** "Hey Harbor" voice command → action. The kiosk POSTs its device_secret + the
 *  spoken transcript. We validate the device, let Haiku pick ONE safe,
 *  household-scoped action (or just answer), execute it server-side, and return a
 *  short spoken reply. The Anthropic key is used server-side only. Actions are a
 *  fixed whitelist — all non-destructive inserts/reads scoped to the household. */
export async function POST(req: Request) {
  let body: { device_secret?: string; text?: string; date?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const text = (body.text ?? "").trim();
  if (!body.device_secret || !text) return NextResponse.json({ error: "bad request" }, { status: 400 });
  if (text.length > 500) return NextResponse.json({ reply: "That was a bit long — try a shorter request." });

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ reply: "Voice isn't set up on the server yet." });
  }

  const { data: pairing } = await admin
    .from("device_pairings")
    .select("household_id")
    .eq("device_secret", body.device_secret)
    .eq("status", "paired")
    .maybeSingle();
  if (!pairing) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const household_id = pairing.household_id;

  const { data: cfg } = await admin
    .from("ai_config")
    .select("anthropic_api_key, enabled")
    .eq("household_id", household_id)
    .maybeSingle();
  if (!cfg?.anthropic_api_key || !cfg.enabled) {
    return NextResponse.json({ reply: "Ask a grown-up to turn on the AI companion in Settings." });
  }

  const date = body.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : new Date().toISOString().slice(0, 10);
  const [yy, mm, dd] = date.split("-").map(Number);
  const dow = new Date(Date.UTC(yy, mm - 1, dd)).getUTCDay();
  const wk = Math.floor((Date.UTC(yy, mm - 1, dd) - Date.UTC(1970, 0, 5)) / (7 * 86_400_000));

  const [{ data: kids }, { data: meals }, { data: chores }, { data: log }] = await Promise.all([
    admin.from("children").select("id, name").eq("household_id", household_id).is("deleted_at", null).order("sort_order"),
    admin.from("meals").select("title, meal_type").eq("household_id", household_id).eq("date", date).is("deleted_at", null),
    admin
      .from("chores")
      .select("id, child_id, title, days_of_week, rotation_member_ids, active")
      .eq("household_id", household_id)
      .is("deleted_at", null),
    admin.from("reward_log").select("child_id, chore_id").eq("reason", "chore").gte("created_at", `${date}T00:00:00Z`),
  ]);
  const kidList = kids ?? [];
  const kidNames = kidList.map((k) => k.name).join(", ") || "no kids yet";
  const mealStr = (meals ?? []).map((m) => `${m.meal_type}: ${m.title}`).join("; ") || "nothing planned";

  // Per-kid chores for today (respecting day-of-week + weekly rotation) + done status,
  // so Harbor can answer "what chores does Mia still have?".
  const done = new Set((log ?? []).map((r) => `${r.child_id}:${r.chore_id}`));
  const runsToday = (dw: number[] | null) => !dw || dw.length === 0 || dw.includes(dow);
  const liveIds = new Set(kidList.map((k) => k.id));
  const assigneeOf = (ch: { child_id: string; rotation_member_ids: unknown }): string => {
    const m = Array.isArray(ch.rotation_member_ids) ? (ch.rotation_member_ids as string[]) : null;
    if (m && m.length >= 2) {
      const live = m.filter((id) => liveIds.has(id));
      if (live.length >= 2) return live[((wk % live.length) + live.length) % live.length];
      if (live.length === 1) return live[0];
    }
    return ch.child_id;
  };
  const choreStr =
    kidList
      .map((k) => {
        const list = (chores ?? [])
          .filter((c) => c.active && runsToday(c.days_of_week as number[] | null) && assigneeOf(c) === k.id)
          .map((c) => `${c.title}${done.has(`${k.id}:${c.id}`) ? " (done)" : ""}`);
        return `${k.name}: ${list.length ? list.join(", ") : "no chores today"}`;
      })
      .join(" | ") || "no chores";

  const client = new Anthropic({ apiKey: cfg.anthropic_api_key });
  const tools: Anthropic.Tool[] = [
    {
      name: "reply",
      description:
        "Answer the family from the Context, or make small talk. This is the DEFAULT — use it for every question (what's for dinner, what chores does someone have, how many stars, etc.) and anything that is not an explicit command to change something.",
      input_schema: { type: "object", properties: { text: { type: "string" } }, required: ["text"] },
    },
    {
      name: "add_to_grocery",
      description:
        "Add specific item(s) to the grocery/shopping list. ONLY use when the person explicitly says to add named items to the list (e.g. 'add milk and eggs to the grocery list'). Never invent items; never put meals or chores here.",
      input_schema: { type: "object", properties: { items: { type: "array", items: { type: "string" } } }, required: ["items"] },
    },
    {
      name: "add_chore",
      description: "Add a chore for a specific child. ONLY use when explicitly asked to add/create a chore for a named kid.",
      input_schema: {
        type: "object",
        properties: {
          child_name: { type: "string" },
          title: { type: "string" },
          points: { type: "number" },
        },
        required: ["child_name", "title"],
      },
    },
    {
      name: "plan_dinners",
      description: "Plan this week's dinners from the pantry. ONLY use when explicitly asked to plan or make dinners for the week.",
      input_schema: { type: "object", properties: {} },
    },
  ];

  try {
    const msg = await client.messages.create({
      model: HAIKU,
      max_tokens: 400,
      system:
        "You are Harbor, a warm family wall assistant answering a SPOKEN request. You MUST pick exactly one tool.\n\n" +
        "DEFAULT to reply() — use it for ANY question or anything you're unsure about (e.g. 'what's for dinner', 'what chores does Mia still have', 'how many stars does Leo have'). Answer naturally and briefly from the Context.\n\n" +
        "Use an ACTION tool ONLY when the request is a clear command to change something:\n" +
        "- add_to_grocery: only when they explicitly say to add specific item(s) to the grocery/shopping list.\n" +
        "- add_chore: only when they explicitly say to add a chore for a named kid.\n" +
        "- plan_dinners: only when they explicitly ask to plan/make this week's dinners.\n\n" +
        "When in doubt, reply(). Never invent grocery items. Keep spoken text short, warm, and natural.",
      tools,
      tool_choice: { type: "auto" },
      messages: [
        {
          role: "user",
          content: `Context\nKids: ${kidNames}.\nToday's meals: ${mealStr}.\nChores today — ${choreStr}.\n\nThey said: "${text}"`,
        },
      ],
    });

    const tool = msg.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!tool) {
      const t = msg.content.find((b): b is Anthropic.TextBlock => b.type === "text");
      return NextResponse.json({ reply: t?.text || "Sorry, I didn't catch that." });
    }
    const input = tool.input as Record<string, unknown>;

    if (tool.name === "reply") {
      return NextResponse.json({ reply: String(input.text || "Okay!") });
    }

    if (tool.name === "add_to_grocery") {
      const items = (Array.isArray(input.items) ? input.items : [])
        .map((s) => String(s).trim())
        .filter(Boolean)
        .slice(0, 10);
      if (!items.length) return NextResponse.json({ reply: "What would you like me to add?" });
      await admin.from("list_items").insert(
        items.map((name) => ({ household_id, name: name.slice(0, 80), list_kind: "grocery", added_by_label: "Hey Harbor" })),
      );
      return NextResponse.json({ reply: `Added ${items.join(", ")} to the grocery list.` });
    }

    if (tool.name === "add_chore") {
      const childName = String(input.child_name || "").toLowerCase().trim();
      const title = String(input.title || "").trim();
      const kid = kidList.find((k) => k.name.toLowerCase() === childName) ?? kidList.find((k) => k.name.toLowerCase().includes(childName));
      if (!kid) return NextResponse.json({ reply: `I couldn't find a kid named ${input.child_name}.` });
      if (!title) return NextResponse.json({ reply: "What's the chore?" });
      const points = Math.max(0, Math.min(50, Math.round(Number(input.points) || 5)));
      const { data: ord } = await admin
        .from("chores")
        .select("sort_order")
        .eq("child_id", kid.id)
        .order("sort_order", { ascending: false })
        .limit(1);
      await admin.from("chores").insert({
        household_id,
        child_id: kid.id,
        title: title.slice(0, 60),
        icon: "✅",
        points,
        sort_order: ((ord?.[0]?.sort_order as number) ?? -1) + 1,
      });
      return NextResponse.json({ reply: `Added "${title}" for ${kid.name}, worth ${points} stars.` });
    }

    if (tool.name === "plan_dinners") {
      const r = await planDinners(admin, household_id, cfg.anthropic_api_key);
      if (r.error) return NextResponse.json({ reply: "I couldn't plan dinners just now." });
      if (r.added === 0) return NextResponse.json({ reply: "You already have dinners planned for the week." });
      const groc = r.groceryAdded ? ` and added ${r.groceryAdded} things to the grocery list` : "";
      return NextResponse.json({ reply: `Done — I planned ${r.added} dinner${r.added === 1 ? "" : "s"}${r.usedPantry ? " from your pantry" : ""}${groc}.` });
    }

    return NextResponse.json({ reply: "Okay!" });
  } catch (e) {
    return NextResponse.json({ reply: aiErrorMessage(e) });
  }
}
