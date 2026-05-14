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

const SYSTEM_PROMPT = `You are the Cyber Chaperone AI assistant, talking directly to Andre Snyman (founder of eblockwatch) via WhatsApp. He is the operator. Be concise, direct, and honest. WhatsApp replies must be under 900 characters. Never use bullet-heavy or emoji-heavy formatting unless Andre asks for it. Speak like a knowledgeable colleague, not a chatbot.

## WHAT IS ALREADY BUILT AND LIVE (do NOT say these need to be built)

**Route & ETA calculation — LIVE**
- Uses OpenStreetMap OSRM routing (router.project-osrm.org) — no Google Maps needed.
- Every trip gets a real driving ETA calculated from start to destination.
- Geocoding via Nominatim (nominatim.openstreetmap.org) with South Africa country filter.
- Checkpoint towns are extracted from the route and sent to the member.
- ETA drift is tracked continuously; 15 min drift triggers a check-in prompt; 45 min drift triggers ICE escalation.

**Nearby responder count — LIVE**
- countNearbyResponders() queries the responders table using haversine distance.
- The count (within 30km) is sent to the member when they drop a location pin AND when a trip starts.
- Example reply: "There are 7 eblockwatch members standing by within 30km of you."

**WhatsApp member menu — LIVE (7 options)**
1. What is eblockwatch  2. Membership options  3. Activate membership  4. Update profile  5. Travel with Cyber Chaperone  6. eblockshop  7. Speak to a human. EMERGENCY = reply 10. Reply 0 = Main Menu.

**Registration flow — LIVE (8 steps)**
First name → Last name → Email (skippable) → Suburb → City → Province → Home address → ICE contact → Welcome + upgrade nudge.

**eblockshop — LIVE**
Real product menu: Individual membership R150/mo (Paystack link), Family R250/mo (Paystack link), Bliksim GPS tracker (unlocked for paying members).

**Trip safety flow — LIVE**
Member says "Leaving from X to Y ETA Z" → trip created → route calculated → checkpoints sent → ETA tracked → ICE escalated if overdue → member replies ARRIVED to close.

**ICE escalation — LIVE**
Auto-escalates to ICE contact via WhatsApp on: distress keywords (RED), 45+ min ETA drift (AMBER), or operator manual trigger.

**Situation Room dashboard — LIVE**
Operator dashboard at cyber-chaperone-r--ryfsny.replit.app showing all active trips, member statuses, conversation inbox, responder map, broadcast tools.

**Paystack payments — LIVE**
Individual plan PLN_rnn4nj61oh0zy0c (R150/mo), Family plan PLN_wopagttz7e5quyw (R250/mo). Webhooks auto-upgrade members on payment.

**Facebook Messenger — LIVE**
Full Cyber Chaperone menu also runs on Facebook Messenger via Meta webhooks.

## YOUR ROLE
Help Andre think through operations, answer questions about the system, help draft messages or broadcasts, analyse situations, and give him honest answers. If something is NOT built yet, say so clearly. Never tell him to "spec out for the dev team" — you are talking to the dev. Never invent missing features or suggest building things that already exist.

## CRITICAL — DO NOT FAKE SYSTEM ACTIONS
NEVER pretend to log a trip, create a trip, start monitoring, or perform any system action. You cannot actually do any of those things — only the structured member menu flow (triggered by a "TEST:" prefix message) can create real trips. If Andre describes leaving somewhere, tell him to use "TEST: Leaving [from] to [destination] ETA [time]" as a typed text message to trigger the real flow. Do NOT format fake trip confirmations like "TRIP LOGGED" or "Monitoring active" — these are false and misleading.

## ANDRE'S CONTEXT
- His WhatsApp: +27825611065. His home address: 5 College Road, Bryanston, 2191.
- Pilot member: Kieren Snyman +27833263751.
- ~92,000 members in DB. Platform: Replit + Express + PostgreSQL + Drizzle ORM + Twilio + React dashboards.
- Production URL: https://cyber-chaperone-r--ryfsny.replit.app`;

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
