import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { HAIKU } from "./anthropic";

/** Quick Capture (HARBOR_V2 §9.2.7) — the Magic-Import equivalent. A parent
 *  photographs/pastes a flyer, email, or note; Haiku (vision-capable) extracts
 *  calendar events, grocery items, and to-dos for one-tap confirmation. The key
 *  stays server-side; nothing is stored except what the parent confirms. */

export type CaptureResult = {
  events: { title: string; date: string; time?: string | null; emoji?: string | null; location?: string | null }[];
  groceries: { name: string; category?: string | null }[];
  todos: { title: string; due_date?: string | null }[];
};

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
export type CaptureImageType = (typeof IMAGE_TYPES)[number];
export function isCaptureImageType(t: string): t is CaptureImageType {
  return (IMAGE_TYPES as readonly string[]).includes(t);
}

const SCHEMA = {
  type: "object",
  properties: {
    events: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          date: { type: "string", description: "YYYY-MM-DD" },
          time: { type: "string", description: "HH:MM 24h, or null for all-day" },
          emoji: { type: "string" },
          location: { type: "string" },
        },
        required: ["title", "date"],
      },
    },
    groceries: {
      type: "array",
      items: {
        type: "object",
        properties: { name: { type: "string" }, category: { type: "string" } },
        required: ["name"],
      },
    },
    todos: {
      type: "array",
      items: {
        type: "object",
        properties: { title: { type: "string" }, due_date: { type: "string", description: "YYYY-MM-DD or null" } },
        required: ["title"],
      },
    },
  },
  required: ["events", "groceries", "todos"],
};

export async function extractFromCapture(opts: {
  key: string;
  text?: string | null;
  image?: { data: string; mediaType: CaptureImageType } | null;
  todayISO: string;
  childNames: string[];
}): Promise<CaptureResult> {
  const { key, text, image, todayISO, childNames } = opts;
  const client = new Anthropic({ apiKey: key });
  const system =
    `You extract calendar events, grocery items, and to-dos from a family's photo, flyer, email, or note ` +
    `so a parent can add them with one tap. Today is ${todayISO}. ` +
    (childNames.length ? `The kids are: ${childNames.join(", ")}. ` : "") +
    `Rules: dates as YYYY-MM-DD; resolve relative dates ("next Friday", "tomorrow") against today; ` +
    `times as HH:MM 24-hour or null for all-day; only include items clearly present; concise titles; ` +
    `pick a fitting emoji per event. Omit anything that isn't an event, grocery item, or to-do. Never invent.`;

  const content: Anthropic.ContentBlockParam[] = [];
  if (image) {
    content.push({ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } });
  }
  content.push({
    type: "text",
    text: text ? `Extract from this text:\n\n${text}` : "Extract everything you can from the image.",
  });

  const msg = await client.messages.create({
    model: HAIKU,
    max_tokens: 1500,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    tools: [{ name: "save_capture", description: "Return the extracted items.", input_schema: SCHEMA as Anthropic.Tool.InputSchema }],
    tool_choice: { type: "tool", name: "save_capture" },
    messages: [{ role: "user", content }],
  });
  const block = msg.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") throw new Error("The AI couldn't read that — try a clearer photo or paste the text.");
  const r = block.input as CaptureResult;
  return {
    events: Array.isArray(r.events) ? r.events.slice(0, 25) : [],
    groceries: Array.isArray(r.groceries) ? r.groceries.slice(0, 50) : [],
    todos: Array.isArray(r.todos) ? r.todos.slice(0, 25) : [],
  };
}
