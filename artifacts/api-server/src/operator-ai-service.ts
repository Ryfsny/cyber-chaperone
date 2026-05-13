/**
 * Operator AI Service — Claude for Andre Snyman (+27825611065)
 *
 * When Andre WhatsApps the Twilio number, this module calls Claude via
 * Replit's Anthropic AI integration proxy and returns a reply suitable
 * for WhatsApp (≤1000 characters). Conversation history is pulled from
 * the messages table so Claude remembers recent context.
 *
 * Uses AI_INTEGRATIONS_ANTHROPIC_BASE_URL + AI_INTEGRATIONS_ANTHROPIC_API_KEY
 * (set automatically by Replit — no manual key required).
 */

import Anthropic from "@anthropic-ai/sdk";
import { db, messagesTable } from "@workspace/db";
import { and, desc, or, eq } from "drizzle-orm";

// ── Anthropic client via Replit proxy ─────────────────────────────────────────

const anthropic = new Anthropic({
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY ?? "dummy",
});

const MODEL = "claude-sonnet-4-6";
const TIMEOUT_MS = 25_000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1_000;

// ── System prompt ──────────────────────────────────────────────────────────────

const SYSTEM_PROMPT =
  "You are Claude, the AI assistant for eblockwatch Cyber Chaperone. " +
  "Andre Snyman is the founder. You help him manage the Cyber Chaperone trip safety system. " +
  "Members use WhatsApp to check in on trips. The Situation Room monitors trips. " +
  "Andre is the boss/operator. Be concise — WhatsApp replies must be under 1000 characters. " +
  "Current system: Replit backend at cyber-chaperone-r--ryfsny.replit.app, " +
  "Twilio WhatsApp, members in database.";

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Call Claude with Andre's message and return the reply text.
 * Fetches the last 10 operator conversation turns for context.
 * Retries up to MAX_RETRIES times on failure with a 1-second delay.
 */
export async function callOperatorClaude(
  userMessage: string,
  operatorPhone: string,
): Promise<string> {
  // Guard: empty body (e.g. sticker, image with no caption, delivery receipt)
  const trimmed = (userMessage ?? "").trim();
  if (!trimmed) {
    return "Got your message but it was blank — please resend.";
  }

  // Build conversation history (empty array on DB error — safe fallback)
  const history = await buildHistory(operatorPhone);

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    ...history,
    { role: "user", content: trimmed },
  ];

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAY_MS);
    }

    try {
      const response = await anthropic.messages.create(
        {
          model: MODEL,
          max_tokens: 8192,
          system: SYSTEM_PROMPT,
          messages,
        },
        { timeout: TIMEOUT_MS },
      );

      const block = response.content[0];
      const text = block?.type === "text" ? block.text.trim() : "(no response)";

      // Truncate to WhatsApp-safe length
      return text.length > 950 ? text.slice(0, 947) + "…" : text;
    } catch (err: unknown) {
      lastError = err;
      // Do not retry on client-side validation errors (4xx) — they won't fix themselves
      if (err instanceof Anthropic.APIError && err.status >= 400 && err.status < 500) {
        break;
      }
    }
  }

  // All attempts exhausted — return a friendly message, never a raw error
  const detail =
    lastError instanceof Error ? lastError.message.slice(0, 120) : String(lastError).slice(0, 120);
  // Log for debugging but don't surface the raw error to Andre's phone
  console.error("[operator-ai] Claude failed after retries:", detail);
  return "Claude is temporarily unavailable — try again in a moment.";
}

// ── Conversation history ───────────────────────────────────────────────────────

async function buildHistory(
  operatorPhone: string,
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  try {
    const rows = await db
      .select({ body: messagesTable.body, direction: messagesTable.direction })
      .from(messagesTable)
      .where(
        or(
          and(eq(messagesTable.fromNumber, operatorPhone), eq(messagesTable.direction, "operator")),
          and(eq(messagesTable.toNumber, operatorPhone), eq(messagesTable.direction, "operator-reply")),
        ),
      )
      .orderBy(desc(messagesTable.id))
      .limit(10);

    // Reverse to chronological order, drop any empty-body rows
    return rows
      .reverse()
      .filter((row) => row.body && row.body.trim().length > 0)
      .map((row) => ({
        role: row.direction === "operator-reply" ? ("assistant" as const) : ("user" as const),
        content: row.body.trim(),
      }));
  } catch {
    return [];
  }
}
