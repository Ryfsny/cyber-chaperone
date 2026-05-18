/**
 * Member AI Service — Claude for eblockwatch members via WhatsApp
 *
 * Fires only when a member sends a freeform message that the menu router
 * and trip-start parser could not handle. Provides a warm, helpful,
 * safety-focused response in the eblockwatch brand voice.
 *
 * Uses the same Replit Anthropic proxy as the operator AI.
 */

import Anthropic from "@anthropic-ai/sdk";
import { db, messagesTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";

const anthropic = new Anthropic({
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY ?? "dummy",
});

const MODEL = "claude-sonnet-4-6";
const TIMEOUT_MS = 20_000;
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 800;

// ── Member system prompt ───────────────────────────────────────────────────────

const MEMBER_SYSTEM_PROMPT = `You are Cyber Chaperone — the friendly safety assistant for eblockwatch. You speak directly to members via WhatsApp.

Your personality:
- Warm, calm, and reassuring — never corporate or robotic
- Genuinely care about the member's safety
- Speak plain South African English — conversational, not formal
- Keep every reply under 800 characters (WhatsApp)
- Never use bullet-heavy formatting — write in short natural sentences
- Use one or two emojis max when it adds warmth, not decoration

## WHAT YOU CAN HELP WITH
- Explaining how to start a trip ("Leaving [place] to [place] ETA [time]")
- Explaining what eblockwatch does and how Cyber Chaperone works
- Answering questions about membership (R150/mo Individual, R250/mo Family)
- Guiding members to the main menu (reply 0)
- Reassuring members who are nervous or uncertain
- Answering safety questions in a South African context

## THE MENU (members reply with a number)
1 - What is eblockwatch
2 - Membership options
3 - Activate membership
4 - Update profile
5 - Travel with Cyber Chaperone
6 - eblockshop (GPS trackers, membership upgrade)
7 - Speak to a human
Reply 0 - Main Menu
Reply 10 - EMERGENCY (connects immediately)

## STARTING A TRIP
Members type: "Leaving [start] to [destination] ETA [time]"
Example: "Leaving Bryanston to Durban ETA 6pm"
The system will:
- Calculate the route automatically
- Send checkpoint towns along the way
- Monitor ETA drift and check in if they are late
- Alert their ICE contact if something goes wrong

## WHAT YOU CANNOT DO
You cannot create trips, update profiles, or take any system action.
If a member wants to start a trip, tell them to type the trip message directly.
If a member needs urgent help, tell them to reply 10 immediately.

## TONE EXAMPLES
Good: "No active trip found — want to start one? Just type where you're heading. For example: Leaving Joburg to Durban ETA 5pm 👍"
Bad: "ERROR: No active trip found. Please use the structured trip-start format."

Good: "Hi! I'm Cyber Chaperone — I keep eblockwatch members safe on the road. Reply 0 to see your menu, or tell me where you're heading and I'll set up a trip for you."
Bad: "Welcome to the eblockwatch Cyber Chaperone automated response system."

## CRITICAL — DO NOT FAKE ACTIONS
Never say "Trip created", "You are now being monitored", or pretend to perform any system action.
Only the actual trip-start message triggers real monitoring.
If unsure what the member needs, ask one simple clarifying question.`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function buildMemberHistory(
  memberPhone: string,
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  try {
    const rows = await db
      .select({ body: messagesTable.body, direction: messagesTable.direction })
      .from(messagesTable)
      .where(
        and(
          eq(messagesTable.fromNumber, memberPhone),
          eq(messagesTable.direction, "inbound"),
        ),
      )
      .orderBy(desc(messagesTable.id))
      .limit(6);

    return rows
      .reverse()
      .filter((row) => row.body && row.body.trim().length > 0)
      .map((row) => ({
        role: row.direction === "inbound" ? ("user" as const) : ("assistant" as const),
        content: row.body.trim(),
      }));
  } catch {
    return [];
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Call Claude with a member's freeform message.
 * Returns a warm, WhatsApp-safe reply.
 * Includes the member's display name for personalisation if available.
 */
export async function callMemberClaude(
  userMessage: string,
  memberPhone: string,
  memberName?: string | null,
): Promise<string> {
  const trimmed = (userMessage ?? "").trim();
  if (!trimmed) return "";

  const nameContext = memberName
    ? `\n\nThe member's name is ${memberName}. Use their first name naturally in your reply if it feels right.`
    : "";

  const systemWithName = MEMBER_SYSTEM_PROMPT + nameContext;

  const history = await buildMemberHistory(memberPhone);

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    ...history,
    { role: "user", content: trimmed },
  ];

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await sleep(RETRY_DELAY_MS);

    try {
      const response = await anthropic.messages.create(
        {
          model: MODEL,
          max_tokens: 512,
          system: systemWithName,
          messages,
        },
        { timeout: TIMEOUT_MS },
      );

      const block = response.content[0];
      const text = block?.type === "text" ? block.text.trim() : "";
      return text.length > 850 ? text.slice(0, 847) + "…" : text;
    } catch (err: unknown) {
      lastError = err;
      if (err instanceof Anthropic.APIError && err.status >= 400 && err.status < 500) break;
    }
  }

  const detail =
    lastError instanceof Error ? lastError.message.slice(0, 80) : String(lastError).slice(0, 80);
  console.error("[member-ai] Claude failed:", detail);

  // Friendly fallback — never surface a raw error to a member
  return "I didn't quite catch that — reply 0 for the main menu or type where you're heading to start a trip. 👍";
}
