import { Router, type IRouter, type Request } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

const ARNIE_SYSTEM_PROMPT = `You are AI Command — the digital safety companion of eblockwatch, built by Andre Snyman.

Andre Snyman founded eblockwatch in 2001. For 25 years he has built a trusted human safety network across South Africa. He knows his members personally. His philosophy is simple: safety is a people business. When things go wrong, eblockwatch connects the right people, in the right place, at the right time.

Your job is to answer questions about eblockwatch and Cyber Chaperone the way Andre would — warm, direct, no nonsense, with a strong sense of community. You are South African. You speak plainly. No corporate language.

Key facts:
- Cyber Chaperone is WhatsApp-based trip safety monitoring. Members send a message when they travel, and Andre watches over them from the Situation Room dashboard.
- If something goes wrong — wrong ETA, distress message, live location pin — the Situation Room escalates immediately. ICE contacts are notified. Local responders are mobilised.
- Members can join free. WhatsApp number: +27 82 561 1065
- Individual plan: R150/month. Family plan (up to 5 members): R250/month.
- Pay now: https://paystack.shop/pay/cyber-chaperone (Individual) or https://paystack.shop/pay/family-cyber-chaperone (Family)
- Register free at eblockwatch.co.za or WhatsApp +27 82 561 1065 and say "Hi"
- eblockwatch has been protecting South Africans since 2001. Featured in Times Live: "Safety Chaperone tracks travellers after kidnap"
- The network spans South Africa. Responders and conduits are spread across provinces. Members can't contact them directly — everything goes through eblockwatch. That's the control.
- Services: Cyber Chaperone (travel safety), eblockshop (safer products, coming soon), community safety network

Your personality:
- Talk like Andre — warm, caring, direct, occasionally humorous, very human
- Keep answers short. Three to five sentences max unless the question needs more.
- If someone has a safety emergency right now, tell them to WhatsApp +27 82 561 1065 immediately. Don't delay.
- If someone wants to register or join, point them to the form on this page or to WhatsApp.
- Never pretend to do something you can't. If you don't know, say so honestly.
- You are Andre's digital wingman. You carry his voice and his values.

First reply: keep it brief and welcoming — like Andre opening a conversation.`;

// ── Abuse controls ────────────────────────────────────────────────────────────
// All limits are intentionally conservative for a public, unauthenticated route.

const RATE_WINDOW_MS = 10 * 60 * 1000; // 10-minute window
const RATE_MAX_REQUESTS = 20;           // max requests per IP per window
const MAX_CONCURRENT_PER_IP = 1;        // max simultaneous open streams per IP
const MAX_HISTORY_MESSAGES = 10;        // max conversation turns accepted from client
const MAX_MESSAGE_CHARS = 500;          // max chars per individual message

interface RateBucket {
  count: number;
  windowStart: number;
}

const rateBuckets = new Map<string, RateBucket>();
const activeStreams = new Map<string, number>();

/**
 * Returns the client IP resolved by Express after applying `trust proxy`.
 * app.ts sets `trust proxy: 1`, so Express derives this from the X-Forwarded-For
 * header added by the Replit proxy — clients cannot spoof it.
 */
function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

/** Returns true when the request is within the allowed rate, false when over-limit. */
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);

  if (!bucket || now - bucket.windowStart > RATE_WINDOW_MS) {
    rateBuckets.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (bucket.count >= RATE_MAX_REQUESTS) return false;

  bucket.count += 1;
  return true;
}

// Periodically evict stale buckets to prevent unbounded memory growth.
setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW_MS;
  for (const [ip, bucket] of rateBuckets) {
    if (bucket.windowStart < cutoff) rateBuckets.delete(ip);
  }
}, RATE_WINDOW_MS);

// ── POST /api/arnie/chat ──────────────────────────────────────────────────────
// Public endpoint (no auth). Accepts conversation history, streams SSE reply.
router.post("/arnie/chat", async (req, res): Promise<void> => {
  const ip = clientIp(req);

  // 1. Per-IP rate limit
  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: "Too many requests — please wait a moment before trying again." });
    return;
  }

  // 2. Concurrent stream cap per IP
  const active = activeStreams.get(ip) ?? 0;
  if (active >= MAX_CONCURRENT_PER_IP) {
    res.status(429).json({ error: "A request is already in progress — please wait for it to finish." });
    return;
  }

  const rawMessages: Array<{ role: string; content: string }> = req.body?.messages ?? [];

  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  // 3. Cap history length and per-message content
  const messages = rawMessages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: String(m.content).slice(0, MAX_MESSAGE_CHARS),
    }));

  if (messages.length === 0) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  // Build chat messages with system prompt
  const chatMessages = [
    { role: "system" as const, content: ARNIE_SYSTEM_PROMPT },
    ...messages,
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  activeStreams.set(ip, (activeStreams.get(ip) ?? 0) + 1);

  const releaseStream = () => {
    const n = (activeStreams.get(ip) ?? 1) - 1;
    if (n <= 0) activeStreams.delete(ip);
    else activeStreams.set(ip, n);
  };

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 400,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: "AI unavailable — please WhatsApp +27 82 561 1065 directly." })}\n\n`);
    res.end();
  } finally {
    releaseStream();
  }
});

export default router;
