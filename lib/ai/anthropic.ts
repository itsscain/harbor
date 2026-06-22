import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

/** Cheapest capable model — the AI companion runs on Haiku for cost. */
export const HAIKU = "claude-haiku-4-5-20251001";

export type HouseholdAi = { key: string; enabled: boolean };

/** Read a household's AI config server-side. Returns null if no key is set.
 *  The key is never sent to the client/wall — only used inside server actions. */
export async function getHouseholdAi(householdId: string): Promise<HouseholdAi | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_config")
    .select("anthropic_api_key, enabled")
    .eq("household_id", householdId)
    .maybeSingle();
  if (!data?.anthropic_api_key) return null;
  return { key: data.anthropic_api_key, enabled: data.enabled };
}

/** Ask Haiku for a structured object via forced tool use. Cost-careful by
 *  default: small max_tokens, a single forced tool (no rambling), and the
 *  system prompt marked cacheable so repeated calls reuse it cheaply. */
export async function haikuJson<T>({
  key,
  system,
  prompt,
  toolName,
  schema,
  maxTokens = 1024,
}: {
  key: string;
  system: string;
  prompt: string;
  toolName: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
}): Promise<T> {
  const client = new Anthropic({ apiKey: key });
  const msg = await client.messages.create({
    model: HAIKU,
    max_tokens: maxTokens,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    tools: [
      {
        name: toolName,
        description: "Return the result in this exact structure.",
        input_schema: schema as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: toolName },
    messages: [{ role: "user", content: prompt }],
  });
  const block = msg.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("AI returned no structured result.");
  return block.input as T;
}

/** Map common Anthropic errors to friendly, parent-facing copy. */
export function aiErrorMessage(e: unknown): string {
  const status = (e as { status?: number })?.status;
  if (status === 401) return "That Anthropic API key was rejected. Double-check it in Settings.";
  if (status === 429) return "Anthropic is rate-limiting right now — try again in a moment.";
  if (status === 529) return "Anthropic is busy right now — try again shortly.";
  return "The AI couldn't finish that just now. Please try again.";
}
