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

// ── Google Maps helpers ───────────────────────────────────────────────────────

interface GMapsLeg {
  distance?: { text: string; value: number };
  duration?: { text: string };
  duration_in_traffic?: { text: string };
  start_address?: string;
  end_address?: string;
}

interface GMapsRoute {
  summary?: string;
  warnings?: string[];
  legs?: GMapsLeg[];
}

interface GMapsDirectionsResponse {
  status: string;
  routes?: GMapsRoute[];
}

// ── Open-Meteo helpers ────────────────────────────────────────────────────────

interface GeocodingResult {
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
}

interface OpenMeteoWeather {
  current?: {
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    precipitation: number;
    weather_code: number;
    is_day: number;
  };
}

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

const SYSTEM_PROMPT = `You are the Cyber Chaperone AI — Andre Snyman's personal travel buddy and ops assistant on WhatsApp. Andre is the founder of eblockwatch. He talks to you by voice note or text while driving, in the field, or anywhere.

Be conversational, warm and direct. WhatsApp replies must be under 900 characters. You are South African — use SA place names naturally. Speak like a knowledgeable colleague and travel companion, not a chatbot.

## YOUR LIVE TOOLS — always call the right tool before answering questions about data

**Ops tools (real-time database):**
- get_active_trips: all currently open trips
- find_member: look up any member by name or number
- get_member_stats: member counts by status
- get_stale_trips: trips with no activity for 12+ hours

**Travel tools (live external data):**
- get_route_info: real driving distance, time, traffic, road name (N1/N3 etc), toll roads, major waypoints between two places — use for any route question
- get_weather: current weather and conditions at any SA location

## HOW TO ANSWER TRAVEL QUESTIONS
- Route/distance/time questions → call get_route_info first
- Weather questions → call get_weather
- History, geography, SA facts → answer from your own knowledge (you know South African history, towns, roads well)
- Road conditions / construction / trucks → share what Google Maps reports + your knowledge; note if it's real-time
- Always be specific: name the road (N3, R103 Midlands Meander), say "via Harrismith" or "via Van Reenen's Pass", mention tolls

## WHAT IS BUILT AND LIVE

**Core safety platform:**
- Trip monitoring: member says where they're going → Situation Room watches → auto-escalates if silent past ETA
- Trip start: jumps straight to "where are you heading?" — no extra from-home question if home is saved
- ICE escalation: auto-WhatsApps emergency contact on distress / ETA drift ≥45 min / member presses 10
- Location pins: members drop a pin at any time → received correctly, shown on operator map
- Photos & videos: members send media during a trip → saved as evidence → operator sees it immediately
- Natural language trips: "heading to Sandton", "going from home to Cape Town ETA 3pm" — all understood

**Member registry & payments:**
- ~92,000 member registry with verified/active/pending/inactive tiers
- Paystack integration: Individual (R150/mo) and Family (R250/mo) plans, auto-upgrade on payment
- Welcome Home campaign: email batches of 50 — bounce recovery via SMS follow-up

**Channels:**
- WhatsApp (Twilio): full Cyber Chaperone menu for all members
- Facebook Messenger: full menu mirrored (members can start trips from Messenger)
- eblockwatch Website: /website/ — registration, login, dashboard, upgrade funnel

**Operator tools (your tools — type these in WhatsApp):**
- Type anything → Arnie (Claude) answers with live data
- Type *007* → 007 Field Command: broadcast to responders, voice notes, responder list, emergency, to-do list
- Type *000* → Member Mode: see the platform exactly as members see it; type *000* again to exit
- Use get_operator_todos tool to check André's to-do list (saved via 007 → option 6)
- Situation Room: https://cyber-chaperone-r--ryfsny.replit.app/

## OPERATOR TO-DO LIST
André saves tasks via 007 → option 6 (type or voice). You can retrieve them via the get_operator_todos tool when he asks "what's on my list?" or "what do I need to do?".

## CRITICAL — DO NOT FAKE SYSTEM ACTIONS
NEVER pretend to log a trip or perform any system action. Tell Andre to use "TEST: Leaving [from] to [destination] ETA [time]" to trigger the real member flow.

## ANDRE'S CONTEXT
WhatsApp: +27825611065. Home: 5 College Road, Bryanston. Pilot member: Kieren Snyman +27833263751.`;

// ── Tool definitions ───────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_active_trips",
    description: "Get all currently active (open) trips — any trip that is not completed or cancelled. Returns traveler name, phone, status (green/amber/red), destination, ETA drift, and last check-in time.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "find_member",
    description: "Search for a member by name (partial match) or WhatsApp number. Returns their status, tier, active trip if any, ICE contact, and suburb/city.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Name (e.g. 'Kieren' or 'Snyman') or WhatsApp number (e.g. '27833263751' or '0833263751')" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_member_stats",
    description: "Get member counts broken down by status (verified, active, pending, inactive). Also returns total member count.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_stale_trips",
    description: "Get trips that have status 'stale' or have had no update in more than 12 hours but are still open. These may need operator attention.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_route_info",
    description: "Get real driving route information between two South African locations using Google Maps. Returns distance in km, estimated drive time with and without traffic, the road/route name (N1, N3, R103 etc), toll roads, and major waypoints/towns along the way. Use for ANY question about distance, drive time, best route, or road between two places.",
    input_schema: {
      type: "object" as const,
      properties: {
        origin: { type: "string", description: "Starting point, e.g. 'Johannesburg', 'Bryanston, Sandton', 'Cape Town'" },
        destination: { type: "string", description: "Destination, e.g. 'Durban', 'Nelspruit', 'Harrismith'" },
        alternatives: { type: "boolean", description: "Set to true to get multiple route options (e.g. N3 vs alternative)" },
      },
      required: ["origin", "destination"],
    },
  },
  {
    name: "get_weather",
    description: "Get current weather conditions at any South African location. Returns temperature, wind speed, precipitation, and a plain-English description. Use for any weather question.",
    input_schema: {
      type: "object" as const,
      properties: {
        location: { type: "string", description: "City or town name, e.g. 'Durban', 'Harrismith', 'Van Reenen'" },
      },
      required: ["location"],
    },
  },
  {
    name: "get_scare_bears",
    description: "Get active Scare Bear community road safety sightings — member-reported scary situations on the road. Returns type, area, description, time reported, and time remaining before expiry. Use when asked about scare bears, road alerts, suspicious activity reported by members, or what's happening on the roads right now.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "get_operator_todos",
    description: "Get André's operator to-do list — tasks he has dictated via voice or text using the 007 Field Command (option 6). Returns the most recent 15 items with timestamps. Use when André asks about his list, tasks, reminders, or what he needs to do.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
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

// ── Travel tool handlers ───────────────────────────────────────────────────────

const WMO_CODES: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Foggy", 48: "Icy fog",
  51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
  61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
  71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
  80: "Slight showers", 81: "Moderate showers", 82: "Violent showers",
  95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Heavy thunderstorm with hail",
};

async function toolGetRouteInfo(origin: string, destination: string, alternatives: boolean): Promise<string> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return "Google Maps API key not configured.";
  try {
    const params = new URLSearchParams({
      origin: `${origin}, South Africa`,
      destination: `${destination}, South Africa`,
      region: "za",
      units: "metric",
      departure_time: "now",
      traffic_model: "best_guess",
      key,
      ...(alternatives ? { alternatives: "true" } : {}),
    });
    const r = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params}`);
    const data = (await r.json()) as GMapsDirectionsResponse;

    if (data.status !== "OK" || !data.routes?.length) {
      return `Google Maps couldn't find a route from ${origin} to ${destination}. Status: ${data.status}`;
    }

    const lines: string[] = [];
    for (const [i, route] of data.routes.entries()) {
      const leg = route.legs?.[0];
      if (!leg) continue;
      const label = data.routes.length > 1 ? `Route ${i + 1}: ` : "";
      const road = route.summary ? `via ${route.summary}` : "";
      const dist = leg.distance?.text ?? "?";
      const timeNormal = leg.duration?.text ?? "?";
      const timeTraffic = leg.duration_in_traffic?.text;
      const trafficNote = timeTraffic && timeTraffic !== timeNormal
        ? ` (with traffic: ${timeTraffic})`
        : "";
      const warnings = route.warnings?.length ? `\n⚠️ ${route.warnings.join("; ")}` : "";
      lines.push(`${label}${dist} ${road} — ${timeNormal}${trafficNote}${warnings}`);
    }
    return lines.join("\n\n");
  } catch (err) {
    return `Route lookup failed: ${err instanceof Error ? err.message : String(err)}`;
  }
}

async function toolGetWeather(location: string): Promise<string> {
  try {
    // Step 1: geocode
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json&countryCode=ZA`;
    const geoResp = await fetch(geoUrl);
    const geoData = (await geoResp.json()) as { results?: GeocodingResult[] };
    const place = geoData.results?.[0];
    if (!place) return `Couldn't find ${location} for weather data.`;

    // Step 2: weather
    const wxUrl = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code,is_day&wind_speed_unit=kmh&timezone=Africa/Johannesburg`;
    const wxResp = await fetch(wxUrl);
    const wxData = (await wxResp.json()) as OpenMeteoWeather;
    const c = wxData.current;
    if (!c) return `Weather data unavailable for ${location}.`;

    const desc = WMO_CODES[c.weather_code] ?? "Unknown conditions";
    const precip = c.precipitation > 0 ? ` | Rain: ${c.precipitation}mm` : "";
    const region = place.admin1 ? `, ${place.admin1}` : "";
    return `${place.name}${region}: ${desc}. ${Math.round(c.temperature_2m)}°C, wind ${Math.round(c.wind_speed_10m)} km/h, humidity ${c.relative_humidity_2m}%${precip}`;
  } catch (err) {
    return `Weather lookup failed: ${err instanceof Error ? err.message : String(err)}`;
  }
}

async function toolGetScareABears(): Promise<string> {
  try {
    const { scareBearSightingsTable } = await import("@workspace/db");
    const { gte } = await import("drizzle-orm");
    const rows = await db
      .select({
        id: scareBearSightingsTable.id,
        type: scareBearSightingsTable.type,
        areaName: scareBearSightingsTable.areaName,
        description: scareBearSightingsTable.description,
        expiresAt: scareBearSightingsTable.expiresAt,
        createdAt: scareBearSightingsTable.createdAt,
      })
      .from(scareBearSightingsTable)
      .where(gte(scareBearSightingsTable.expiresAt, new Date()))
      .orderBy(desc(scareBearSightingsTable.createdAt))
      .limit(20);

    if (rows.length === 0) return "No active Scare Bear sightings right now. All clear on the roads.";

    const TYPE_LABELS: Record<string, string> = {
      traffic_officer_bribe: "Traffic Officer (Bribe)",
      scary_character: "Scary Character",
      suspicious_vehicle: "Suspicious Vehicle",
      roadblock: "Illegal Roadblock",
      other: "Other",
    };

    const lines = rows.map(r => {
      const minsLeft = Math.round((new Date(r.expiresAt).getTime() - Date.now()) / 60_000);
      const area = r.areaName ?? "unknown area";
      const label = TYPE_LABELS[r.type] ?? r.type;
      const desc = r.description ? ` — "${r.description}"` : "";
      return `• ${label} in ${area}${desc} (${minsLeft}min left)`;
    });
    return `${rows.length} active Scare Bear sighting${rows.length === 1 ? "" : "s"}:\n${lines.join("\n")}`;
  } catch (err) {
    return `Error fetching scare bear sightings: ${err instanceof Error ? err.message : String(err)}`;
  }
}

async function toolGetOperatorTodos(): Promise<string> {
  try {
    const ANDRE_WA = "whatsapp:+27825611065";
    const rows = await db
      .select({ body: messagesTable.body, receivedAt: messagesTable.receivedAt })
      .from(messagesTable)
      .where(and(eq(messagesTable.fromNumber, ANDRE_WA), eq(messagesTable.direction, "operator-todo")))
      .orderBy(desc(messagesTable.receivedAt))
      .limit(15);

    if (rows.length === 0) return "André's to-do list is empty. No tasks saved yet.";

    const lines = rows.map((r, i) => {
      const when = r.receivedAt
        ? new Date(r.receivedAt).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Johannesburg" })
        : "";
      return `${i + 1}. ${r.body}${when ? ` (${when})` : ""}`;
    });
    return `André's to-do list (${rows.length} item${rows.length === 1 ? "" : "s"}):\n${lines.join("\n")}`;
  } catch (err) {
    return `Error fetching to-do list: ${err instanceof Error ? err.message : String(err)}`;
  }
}

// ── Tool dispatcher ────────────────────────────────────────────────────────────

async function runTool(name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "get_active_trips":  return toolGetActiveTrips();
    case "find_member":       return toolFindMember((input["query"] as string) ?? "");
    case "get_member_stats":  return toolGetMemberStats();
    case "get_stale_trips":   return toolGetStaleTrips();
    case "get_route_info":    return toolGetRouteInfo(
                                (input["origin"] as string) ?? "",
                                (input["destination"] as string) ?? "",
                                (input["alternatives"] as boolean) ?? false,
                              );
    case "get_weather":       return toolGetWeather((input["location"] as string) ?? "");
    case "get_scare_bears":     return toolGetScareABears();
    case "get_operator_todos":  return toolGetOperatorTodos();
    default:                    return `Unknown tool: ${name}`;
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
