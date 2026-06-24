import "server-only";
import { haikuJson } from "./anthropic";

/** Tides (HARBOR_V2 §9.1.2) — the longitudinal brain. From a child's calm-corner /
 *  Anchor sessions and feelings check-ins, surface gentle, *actionable* patterns
 *  for the parent: when hard moments cluster, what tends to precede them, what's
 *  helped — plus one concrete suggestion. Never diagnose, label, or shame. */

const TIDES_SYSTEM =
  "You are a warm, experienced child-development coach helping a parent understand their child's " +
  "rhythms — especially the hard moments. You are given the child's recent calm-corner / Anchor " +
  "sessions (when, the reason, the feeling) and feelings check-ins. Surface plain-language PATTERNS " +
  "(when hard moments cluster — e.g. 'Tuesdays after school', 'the 30 minutes before dinner' — and " +
  "what tends to precede them), and ONE concrete, supportive thing the parent can try. Be specific, " +
  "warm, and practical. NEVER diagnose, label, or shame. If there's genuinely too little data to see " +
  "a pattern, set enough_data=false and say so kindly. No markdown.";

export type TidesInsight = {
  summary: string;
  patterns: string[];
  suggestion: string;
  enough_data: boolean;
};

export async function buildTidesInsight(opts: {
  key: string;
  childName: string;
  age?: number | null;
  sessions: { started_at: string; reason: string | null; feeling: string | null }[];
  checkIns: { feeling: string; created_at: string }[];
}): Promise<TidesInsight> {
  const { key, childName, age, sessions, checkIns } = opts;
  const sessionLines = sessions
    .slice(0, 30)
    .map((s) => `- ${s.started_at.slice(0, 16).replace("T", " ")}${s.feeling ? ` · felt ${s.feeling}` : ""}${s.reason ? ` · ${s.reason}` : ""}`)
    .join("\n");
  const feelLines = checkIns
    .slice(0, 60)
    .map((c) => `- ${c.created_at.slice(0, 16).replace("T", " ")} · ${c.feeling}`)
    .join("\n");
  const prompt = [
    `Child: ${childName}${age ? `, age ${age}` : ""}.`,
    sessions.length ? `Calm-corner / Anchor sessions:\n${sessionLines}` : "No calm-corner sessions on record.",
    checkIns.length ? `Feelings check-ins:\n${feelLines}` : "No feelings check-ins on record.",
    "Find the gentle patterns and one supportive suggestion for the parent.",
  ].join("\n\n");

  return haikuJson<TidesInsight>({
    key,
    system: TIDES_SYSTEM,
    prompt,
    toolName: "tides_insight",
    maxTokens: 600,
    schema: {
      type: "object",
      properties: {
        summary: { type: "string", description: "1-2 warm sentences summarizing the rhythm" },
        patterns: { type: "array", items: { type: "string" }, description: "2-4 plain-language patterns" },
        suggestion: { type: "string", description: "one concrete, supportive thing to try next" },
        enough_data: { type: "boolean", description: "false if there's too little to see a real pattern" },
      },
      required: ["summary", "patterns", "suggestion", "enough_data"],
    },
  });
}
