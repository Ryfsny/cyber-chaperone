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

// ── System prompt ──────────────────────────────────────────────────────────────

const SYSTEM_PROMPT =
  "You are Claude, the AI assistant for eblockwatch Cyber Chaperone. " +
  "Andre Snyman is the founder. You help him manage the Cyber Chaperone trip safety system. " +
  "Members use WhatsApp to check in on trips. The Situation Room monitors trips. " +
  "Andre is the boss/operator. Be concise — WhatsApp replies must be under 1000 characters. " +
  "Current system: Replit backend at cyber-chaperone-r--ryfsny.replit.app, " +
  "Twilio WhatsApp sandbox +14155238886, members in database.";

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Call Claude with Andre's message and return the reply text.
 * Fetches the last 10 operator conversation turns for context.
 */
export async function callOperatorClaude(
  userMessage: string,
  operatorPhone: string,
): Promise<string> {
  // Guard: empty body (e.g. voice note before transcription, read receipt)
  const trimmed = userMessage.trim();
  if (!trimmed) {
    return "Message was empty — please try again.";
  }

  try {
    // Build conversation history from recent operator messages
    const history = await buildHistory(operatorPhone);

    const messages: Array<{ role: "user" | "assistant"; content: string }> = [
      ...history,
      { role: "user", content: trimmed },
    ];

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages,
    });

    const block = response.content[0];
    const text = block.type === "text" ? block.text.trim() : "(no response)";

    // Truncate to WhatsApp-safe length
    return text.length > 950 ? text.slice(0, 947) + "…" : text;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return `AI unavailable: ${msg.slice(0, 200)}`;
  }
}

// ── Conversation history ───────────────────────────────────────────────────────

async function buildHistory(
  operatorPhone: string,
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  try {
    // Fetch recent messages sent by or to the operator that are operator-type
    const rows = await db
      .select({ body: messagesTable.body, direction: messagesTable.direction, fromNumber: messagesTable.fromNumber })
      .from(messagesTable)
      .where(
        or(
          and(eq(messagesTable.fromNumber, operatorPhone), eq(messagesTable.direction, "operator")),
          and(eq(messagesTable.toNumber, operatorPhone), eq(messagesTable.direction, "operator-reply")),
        ),
      )
      .orderBy(desc(messagesTable.id))
      .limit(10);

    // Reverse so oldest first, filter empty bodies, then map to Claude message format
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
