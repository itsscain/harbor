import "server-only";
import { haikuJson, haikuText } from "./anthropic";

/** A calm corner is a brief, supportive reset — never a punishment. Everything
 *  the AI writes is grounded in gentle, evidence-based practice: co-regulation,
 *  naming feelings, calming the body first, then a small repair and fresh start. */
const COACH_SYSTEM =
  "You are a warm, experienced child-development coach helping a family run a brief, " +
  "supportive 'calm corner' reset — NOT a punishment. Ground everything in gentle, " +
  "evidence-based practice: co-regulation, naming feelings, calming the body first, " +
  "then a small repair and a fresh start. Be specific and kind. Never shame, label, " +
  "threaten, or diagnose. Use language simple enough for the child's age. No markdown.";

export type CornerPlan = { steps: string[]; reminder: string; encouragement: string };

/** Defense-in-depth: cap shape + lengths on a model-returned plan before it's
 *  stored and shown on the wall, so an over-long step can't break the layout.
 *  (Tone is governed by the system prompt; we don't keyword-filter — phrases like
 *  "instead of hurting" are legitimate supportive language.) */
export function sanitizeCornerPlan(plan: CornerPlan | null | undefined): CornerPlan {
  const clean = (s: unknown, max: number) => String(s ?? "").trim().slice(0, max);
  return {
    steps: (Array.isArray(plan?.steps) ? plan!.steps : [])
      .map((s) => clean(s, 120))
      .filter(Boolean)
      .slice(0, 4),
    reminder: clean(plan?.reminder, 200),
    encouragement: clean(plan?.encouragement, 200),
  };
}

/** Generated once when a corner starts — shown (and read aloud) on the wall. */
export async function buildCornerPlan(opts: {
  key: string;
  childName: string;
  age?: number | null;
  reason?: string | null;
  feeling?: string | null;
  interests?: string[];
  recentCount?: number;
}): Promise<CornerPlan> {
  const { key, childName, age, reason, feeling, interests = [], recentCount = 0 } = opts;
  const prompt = [
    `Child: ${childName}${age ? `, age ${age}` : ""}.`,
    reason ? `What happened: ${reason}.` : "No specific reason was given.",
    feeling ? `They seem to feel: ${feeling}.` : "",
    interests.length ? `They love: ${interests.join(", ")}.` : "",
    recentCount
      ? `They've had ${recentCount} calm-corner resets recently — be extra patient and vary your wording.`
      : "",
    "Write a tiny plan for the next few minutes in the calm corner. Provide 2-3 very short " +
      "'steps' (calming actions a young child can do alone, e.g. 'Take 3 slow belly breaths'), " +
      "one short 'reminder' of the better choice for next time (kind and concrete, using their " +
      "world), and one warm one-sentence 'encouragement'. Speak directly TO the child.",
  ]
    .filter(Boolean)
    .join("\n");
  return haikuJson<CornerPlan>({
    key,
    system: COACH_SYSTEM,
    prompt,
    toolName: "calm_plan",
    maxTokens: 500,
    schema: {
      type: "object",
      properties: {
        steps: {
          type: "array",
          items: { type: "string" },
          description: "2-3 short calming actions, spoken to the child",
        },
        reminder: { type: "string", description: "one short, kind reminder of the better choice" },
        encouragement: { type: "string", description: "one warm, encouraging sentence" },
      },
      required: ["steps", "reminder", "encouragement"],
    },
  });
}

/** Generated after a corner — a private reflection for the parent that can weave
 *  in past corners to surface gentle patterns and a constructive next step. */
export async function buildCornerReport(opts: {
  key: string;
  childName: string;
  age?: number | null;
  reason?: string | null;
  durationMinutes: number;
  history?: { reason: string | null; started_at: string }[];
}): Promise<string> {
  const { key, childName, age, reason, durationMinutes, history = [] } = opts;
  const past = history
    .slice(0, 8)
    .map((h) => `- ${h.started_at.slice(0, 10)}: ${h.reason ?? "no reason noted"}`)
    .join("\n");
  const prompt = [
    `Child: ${childName}${age ? `, age ${age}` : ""}. This calm-corner reset was ${durationMinutes} minutes.`,
    reason ? `Reason this time: ${reason}.` : "No reason noted this time.",
    past ? `Recent resets:\n${past}` : "No earlier resets on record.",
    `Write a short reflection FOR THE PARENT (not the child), 3-5 sentences. If you notice a ` +
      `pattern across resets (time of day, trigger, feeling), name it gently. Suggest ONE concrete, ` +
      `supportive thing to try next time, and ONE way to reconnect with ${childName} right now ` +
      `(a warm repair / restart). Practical, encouraging, non-judgmental. No markdown or headings.`,
  ]
    .filter(Boolean)
    .join("\n");
  return haikuText({ key, system: COACH_SYSTEM, prompt, maxTokens: 320 });
}
