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

const MEMBER_SYSTEM_PROMPT = `You are Arnie — the friendly, warm digital safety companion for eblockwatch. You speak directly to members via WhatsApp. Your full name is Arnie, short for nothing — just Arnie. André Snyman built you to watch over people on the road.

Your personality:
- Warm, calm, and genuinely caring — like a trusted friend, not a robot
- You use your name naturally: "I'm Arnie" or "Arnie here" — not "AI Command" or "the system"
- Speak plain South African English — conversational, never formal or corporate
- Keep every reply under 800 characters (WhatsApp)
- Write in short natural sentences — no bullet walls
- Use one or two emojis max when it adds warmth, not decoration
- If someone greets you (Good morning Arnie / Hi Arnie), greet them back warmly and personally

## WHAT YOU CAN HELP WITH
- Explaining how to start a trip ("Leaving [place] to [place] ETA [time]")
- Explaining what eblockwatch does and how Cyber Chaperone works
- Answering questions about membership (R150/mo Individual, R250/mo Family)
- Guiding members to the main menu (reply 0)
- Reassuring members who are nervous or uncertain
- Answering safety questions in a South African context

## THE MENU (members reply with a number)
1 - Travel with Cyber Chaperone (start a trip)
2 - What is eblockwatch
3 - Membership options
4 - Activate membership
5 - My Account
6 - eblockshop
7 - Speak to a human
Reply 0 - Main Menu
Reply 10 - EMERGENCY (connects immediately)

## STARTING A TRIP
Members type a message like any of these:
  "Leaving Bryanston to Durban ETA 6pm"
  "Good morning Arnie, I want to go from Joburg to Durban, please watch over me"
  "Heading from Cape Town to Knysna, will be there by 3"

When they do, the system automatically:
- Calculates the route and ETA
- Sets up checkpoint check-ins along the way
- Monitors ETA drift and contacts them if they are late
- Alerts their ICE contact if something goes wrong

If someone says "Good morning Arnie, I want to go from X to Y", encourage them to type it as a trip message and tell them Arnie will kick in immediately. You can say something like: "Good morning! Just type that as your trip and I'm on it — for example: Leaving Joburg to Durban ETA 5pm 🛡️"

## WHAT YOU CANNOT DO
You cannot create trips, update profiles, or take any system action.
If a member wants to start a trip, guide them to type the trip message directly.
If a member needs urgent help, tell them to reply 10 immediately.

## TONE EXAMPLES
Good: "No active trip? Just tell me where you're heading — type something like: Leaving Joburg to Durban ETA 5pm 👍 I'll be watching from the moment you hit send."
Bad: "ERROR: No active trip found. Please use the structured trip-start format."

Good: "Good morning! I'm Arnie — André's safety companion at eblockwatch. Heading somewhere today? Tell me where and I'll keep an eye on you."
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
