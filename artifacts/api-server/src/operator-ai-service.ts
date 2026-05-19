/**
 * Operator AI Service — Claude for Andre Snyman (+27825611065)
 *
 * When Andre WhatsApps the Twilio number, this module calls Claude via
 * Replit's Anthropic AI integration proxy. Claude has LIVE tool access to
 * the database so it can answer "What's happening?", "Where is Kieren?",
 * "How many active trips?", etc. with real data.
 *
 * Tool use agentic loop: Claude calls tools → we fetch DB data → Claude
 * composes a WhatsApp reply with real numbers.
 *
 * Uses AI_INTEGRATIONS_ANTHROPIC_BASE_URL + AI_INTEGRATIONS_ANTHROPIC_API_KEY
 * (set automatically by Replit — no manual key required).
 */

import Anthropic from "@anthropic-ai/sdk";
import { db, messagesTable, tripsTable, membersTable } from "@workspace/db";
import { and, desc, or, eq, ne, ilike, sql } from "drizzle-orm";

// ── Anthropic client via Replit proxy ─────────────────────────────────────────

const anthropic = new Anthropic({
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY ?? "dummy",
});

const MODEL = "claude-sonnet-4-6";
const TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1_000;
const MAX_TOOL_ROUNDS = 5;

// ── System prompt ──────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the Cyber Chaperone AI assistant, talking directly to Andre Snyman (founder of eblockwatch) via WhatsApp. He is the operator and founder.

Be concise, direct, and honest. WhatsApp replies must be under 900 characters. Speak like a knowledgeable colleague, not a chatbot. No corporate language.

You have LIVE access to the Cyber Chaperone database through tools. When Andre asks about trips, members, or operational status, ALWAYS call the relevant tool first — never guess or make up data.

Tools available:
- get_active_trips: lists all currently open trips (red/amber/green status)
- find_member: search for a member by name or WhatsApp number
- get_member_stats: get member counts by status
- get_stale_trips: list trips that have gone quiet (no update for 12+ hours)

## WHAT IS BUILT AND LIVE
- Trip safety monitoring: members say "Leaving X to Y ETA Z", operator watches in Situation Room
- ICE escalation: auto-WhatsApp ICE contact on distress / 45 min ETA drift
- Member registry: ~92,000 members in DB
- Paystack payments: R150/mo Individual, R250/mo Family
- Facebook Messenger: full menu also runs there
- Route enrichment: OpenStreetMap routing, ETA drift tracking, checkpoint list sent to member

## CRITICAL — DO NOT FAKE SYSTEM ACTIONS
NEVER pretend to log a trip or perform any system action. You cannot create trips — only the structured member menu flow can. Tell Andre to use "TEST: Leaving [from] to [destination] ETA [time]" if he wants to test the member flow.

## ANDRE'S CONTEXT
WhatsApp: +27825611065. Home: 5 College Road, Bryanston. Pilot member: Kieren Snyman +27833263751.
Platform: Replit + Express + PostgreSQL + Drizzle ORM + Twilio. Production: https://cyber-chaperone-r--ryfsny.replit.app`;

// ── Tool definitions ───────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_active_trips",
    description: "Get all currently active (open) trips — any trip that is not completed or cancelled. Returns traveler name, phone, status (green/amber/red), destination, ETA drift, and last check-in time.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "find_member",
    description: "Search for a member by name (partial match) or WhatsApp number. Returns their status, tier, active trip if any, ICE contact, and suburb/city.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Name (e.g. 'Kieren' or 'Snyman') or WhatsApp number (e.g. '27833263751' or '0833263751')",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_member_stats",
    description: "Get member counts broken down by status (verified, active, pending, inactive). Also returns total member count.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "get_stale_trips",
    description: "Get trips that have status 'stale' or have had no update in more than 12 hours but are still open. These may need operator attention.",
    input_schema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

// ── Tool handlers — live DB queries ───────────────────────────────────────────

async function toolGetActiveTrips(): Promise<string> {
  try {
    const trips = await db
      .select({
        id: tripsTable.id,
        title: tripsTable.title,
        travelerName: tripsTable.travelerName,
        travelerPhone: tripsTable.travelerPhone,
        status: tripsTable.status,
        etaDriftMinutes: tripsTable.etaDriftMinutes,
        lastMemberCheckinTime: tripsTable.lastMemberCheckinTime,
        updatedAt: tripsTable.updatedAt,
      })
      .from(tripsTable)
      .where(and(ne(tripsTable.status, "completed"), ne(tripsTable.status, "cancelled")))
      .orderBy(desc(tripsTable.updatedAt))
      .limit(20);

    if (trips.length === 0) return "No active trips right now. All clear.";

    const lines = trips.map((t) => {
      const drift = t.etaDriftMinutes ? ` | drift ${t.etaDriftMinutes}min` : "";
      const lastCheckin = t.lastMemberCheckinTime
        ? ` | last check-in ${new Date(t.lastMemberCheckinTime).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Johannesburg" })}`
        : "";
      const phone = (t.travelerPhone ?? "").replace("whatsapp:+", "+");
      return `• ${t.travelerName ?? "Unknown"} (${phone}) — ${(t.status ?? "unknown").toUpperCase()}${drift}${lastCheckin} — ${t.title ?? "no route"}`;
    });
    return `${trips.length} active trip${trips.length === 1 ? "" : "s"}:\n${lines.join("\n")}`;
  } catch (err) {
    return `Error fetching trips: ${err instanceof Error ? err.message : String(err)}`;
  }
}

async function toolFindMember(query: string): Promise<string> {
  try {
    const trimmed = query.trim();

    // Try phone number first — normalise to +27 format
    let phoneSearch = trimmed.replace(/\s+/g, "");
    if (phoneSearch.startsWith("0")) phoneSearch = "+27" + phoneSearch.slice(1);
    if (phoneSearch.startsWith("27") && !phoneSearch.startsWith("+")) phoneSearch = "+" + phoneSearch;
    const waPhone = `whatsapp:${phoneSearch}`;

    const byPhone = await db
      .select()
      .from(membersTable)
      .where(eq(membersTable.whatsappNumber, waPhone))
      .limit(1)
      .catch(() => []);

    const nameResults = await db
      .select()
      .from(membersTable)
      .where(
        or(
          ilike(membersTable.displayName, `%${trimmed}%`),
          ilike(membersTable.firstName, `%${trimmed}%`),
          ilike(membersTable.lastName, `%${trimmed}%`),
        ),
      )
      .limit(5)
      .catch(() => []);

    const all = [...byPhone];
    for (const m of nameResults) {
      if (!all.find((x) => x.id === m.id)) all.push(m);
    }

    if (all.length === 0) return `No member found matching "${query}".`;

    const results = await Promise.all(
      all.map(async (m) => {
        const [activeTrip] = await db
          .select({ status: tripsTable.status, title: tripsTable.title, etaDriftMinutes: tripsTable.etaDriftMinutes })
          .from(tripsTable)
          .where(and(eq(tripsTable.travelerPhone, m.whatsappNumber ?? ""), ne(tripsTable.status, "completed"), ne(tripsTable.status, "cancelled")))
          .orderBy(desc(tripsTable.id))
          .limit(1)
          .catch(() => []);

        const trip = activeTrip
          ? ` | ACTIVE TRIP: ${(activeTrip.status ?? "").toUpperCase()} — ${activeTrip.title ?? "no route"}${activeTrip.etaDriftMinutes ? ` (drift ${activeTrip.etaDriftMinutes}min)` : ""}`
          : " | No active trip";
        const location = [m.suburb, m.city, m.province].filter(Boolean).join(", ");
        const ice = m.iceContactName ? ` | ICE: ${m.iceContactName} ${m.iceContactPhone ?? ""}` : "";
        const phone = (m.whatsappNumber ?? "").replace("whatsapp:+", "+");
        return `${m.displayName} (${phone}) — ${m.memberStatus}/${m.membershipTier ?? "free"}${location ? ` | ${location}` : ""}${ice}${trip}`;
      }),
    );

    return results.join("\n\n");
  } catch (err) {
    return `Error searching members: ${err instanceof Error ? err.message : String(err)}`;
  }
}

async function toolGetMemberStats(): Promise<string> {
  try {
    const rows = await db
      .select({ status: membersTable.memberStatus, count: sql<number>`count(*)::int` })
      .from(membersTable)
      .groupBy(membersTable.memberStatus);

    if (rows.length === 0) return "No member stats available.";

    const total = rows.reduce((s, r) => s + Number(r.count), 0);
    const breakdown = rows
      .sort((a, b) => Number(b.count) - Number(a.count))
      .map((r) => `${r.status}: ${Number(r.count).toLocaleString()}`)
      .join(" | ");

    return `Total members: ${total.toLocaleString()}\n${breakdown}`;
  } catch (err) {
    return `Error fetching stats: ${err instanceof Error ? err.message : String(err)}`;
  }
}

async function toolGetStaleTrips(): Promise<string> {
  try {
    const cutoff = new Date(Date.now() - 12 * 60 * 60 * 1000);

    const trips = await db
      .select({
        id: tripsTable.id,
        title: tripsTable.title,
        travelerName: tripsTable.travelerName,
        travelerPhone: tripsTable.travelerPhone,
        status: tripsTable.status,
        updatedAt: tripsTable.updatedAt,
        lastMemberCheckinTime: tripsTable.lastMemberCheckinTime,
      })
      .from(tripsTable)
      .where(
        and(
          ne(tripsTable.status, "completed"),
          ne(tripsTable.status, "cancelled"),
          or(
            eq(tripsTable.status, "stale"),
            sql`${tripsTable.updatedAt} < ${cutoff}`,
          ),
        ),
      )
      .orderBy(tripsTable.updatedAt)
      .limit(10);

    if (trips.length === 0) return "No stale trips. All open trips have had recent activity.";

    const lines = trips.map((t) => {
      const updatedAgo = Math.round((Date.now() - new Date(t.updatedAt ?? Date.now()).getTime()) / 3_600_000);
      const phone = (t.travelerPhone ?? "").replace("whatsapp:+", "+");
      return `• ${t.travelerName ?? "Unknown"} (${phone}) — last update ${updatedAgo}h ago | ${t.title ?? "no route"}`;
    });

    return `${trips.length} stale trip${trips.length === 1 ? "" : "s"} (no update >12h):\n${lines.join("\n")}`;
  } catch (err) {
    return `Error fetching stale trips: ${err instanceof Error ? err.message : String(err)}`;
  }
}

// ── Tool dispatcher ────────────────────────────────────────────────────────────

async function runTool(name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "get_active_trips":  return toolGetActiveTrips();
    case "find_member":       return toolFindMember((input["query"] as string) ?? "");
    case "get_member_stats":  return toolGetMemberStats();
    case "get_stale_trips":   return toolGetStaleTrips();
    default:                  return `Unknown tool: ${name}`;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Call Claude with Andre's message and return the reply text.
 * Runs an agentic tool-use loop — Claude can call DB tools to get live data.
 * Fetches the last 10 operator conversation turns for context.
 * Retries up to MAX_RETRIES times on failure with a 1-second delay.
 */
export async function callOperatorClaude(
  userMessage: string,
  operatorPhone: string,
): Promise<string> {
  const trimmed = (userMessage ?? "").trim();
  if (!trimmed) {
    return "Got your message but it was blank — please resend.";
  }

  const history = await buildHistory(operatorPhone);

  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: "user", content: trimmed },
  ];

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) await sleep(RETRY_DELAY_MS);

    try {
      // ── Agentic tool-use loop ──────────────────────────────────────────────
      let rounds = 0;
      let currentMessages = [...messages];

      while (rounds < MAX_TOOL_ROUNDS) {
        rounds++;

        const response = await anthropic.messages.create(
          {
            model: MODEL,
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            tools: TOOLS,
            messages: currentMessages,
          },
          { timeout: TIMEOUT_MS },
        );

        if (response.stop_reason === "end_turn") {
          // Claude is done — extract text reply
          const block = response.content.find((b) => b.type === "text");
          const text = block?.type === "text" ? block.text.trim() : "(no response)";
          return text.length > 950 ? text.slice(0, 947) + "…" : text;
        }

        if (response.stop_reason === "tool_use") {
          // Add Claude's response (which contains tool_use blocks) to history
          currentMessages.push({ role: "assistant", content: response.content });

          // Execute each tool call and collect results
          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const block of response.content) {
            if (block.type !== "tool_use") continue;
            const result = await runTool(block.name, block.input as Record<string, unknown>);
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: result,
            });
          }

          // Add tool results as user turn and continue the loop
          currentMessages.push({ role: "user", content: toolResults });
          continue;
        }

        // Unexpected stop reason — return what we have
        const block = response.content.find((b) => b.type === "text");
        const text = block?.type === "text" ? block.text.trim() : "(no response)";
        return text.length > 950 ? text.slice(0, 947) + "…" : text;
      }

      return "Query took too many steps — please try a simpler question.";
    } catch (err: unknown) {
      lastError = err;
      if (err instanceof Anthropic.APIError && err.status >= 400 && err.status < 500) break;
    }
  }

  const detail = lastError instanceof Error ? lastError.message.slice(0, 120) : String(lastError).slice(0, 120);
  console.error("[operator-ai] Claude failed after retries:", detail);
  return "Claude is temporarily unavailable — try again in a moment.";
}

// ── Conversation history ───────────────────────────────────────────────────────

async function buildHistory(
  operatorPhone: string,
): Promise<Anthropic.MessageParam[]> {
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
