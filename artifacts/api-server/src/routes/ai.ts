import { Router, type IRouter } from "express";
import { db, tripsTable, messagesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

// ── POST /api/ai/trips/:id/summary ────────────────────────────────────────────
// Generate a plain-English trip summary using GPT
router.post("/ai/trips/:id/summary", async (req, res): Promise<void> => {
  const tripId = parseInt(req.params.id, 10);
  if (isNaN(tripId)) {
    res.status(400).json({ error: "Invalid trip id" });
    return;
  }

  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, tripId));
  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.tripId, tripId))
    .orderBy(messagesTable.receivedAt);

  const messageLog = messages
    .map((m, i) => `${i + 1}. [${new Date(m.receivedAt).toISOString().slice(11, 16)} UTC] ${m.body || "(no text — location or media)"}`)
    .join("\n");

  const prompt = `You are a security operations analyst for Cyber Chaperone, a travel safety monitoring service based in South Africa.

Summarise the following trip in plain, professional English in 3-5 sentences. Focus on: what happened, any risk events, and how it concluded. Be concise and factual.

Trip: ${trip.title}
Traveller: ${trip.travelerName}
Status: ${trip.status}
Evidence Notes: ${trip.evidenceNotes || "None"}
Inference Notes: ${trip.inferenceNotes || "None"}

WhatsApp Message Log (${messages.length} messages):
${messageLog || "No messages"}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    });

    const summary = completion.choices[0]?.message?.content?.trim() ?? "Unable to generate summary.";
    res.json({ summary });
  } catch (err) {
    req.log.error({ err }, "AI summary generation failed");
    res.status(500).json({ error: "AI summary generation failed" });
  }
});

// ── POST /api/ai/trips/:id/reply-draft ───────────────────────────────────────
// Draft a smart reply to the most recent traveller message
router.post("/ai/trips/:id/reply-draft", async (req, res): Promise<void> => {
  const tripId = parseInt(req.params.id, 10);
  if (isNaN(tripId)) {
    res.status(400).json({ error: "Invalid trip id" });
    return;
  }

  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, tripId));
  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }

  const [lastMsg] = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.tripId, tripId))
    .orderBy(desc(messagesTable.receivedAt))
    .limit(1);

  if (!lastMsg || !lastMsg.body) {
    res.json({ draft: "Your trip is being monitored. Please send updates as you travel." });
    return;
  }

  const prompt = `You are the Cyber Chaperone automated safety monitoring assistant. You send WhatsApp messages on behalf of the eblockwatch security operations team in South Africa.

Draft a short, professional, reassuring WhatsApp reply (max 2 sentences) to the following traveller message. Be calm and helpful. Do NOT use emojis. Do NOT start with "Hi" or "Hello".

Trip: ${trip.title}
Current status: ${trip.status.toUpperCase()}
Traveller's message: "${lastMsg.body}"`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    });

    const draft = completion.choices[0]?.message?.content?.trim() ?? "";
    res.json({ draft });
  } catch (err) {
    req.log.error({ err }, "AI reply draft generation failed");
    res.status(500).json({ error: "AI reply draft generation failed" });
  }
});

// ── POST /api/ai/chat ─────────────────────────────────────────────────────────
// Operator chat assistant — answers questions about trips and activity
router.post("/ai/chat", async (req, res): Promise<void> => {
  const { message } = req.body as { message?: string };
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  // Gather recent context
  const trips = await db
    .select()
    .from(tripsTable)
    .orderBy(desc(tripsTable.createdAt))
    .limit(20);

  const tripContext = trips
    .map(
      (t) =>
        `Trip #${t.id}: "${t.title}" | Traveller: ${t.travelerName} | Status: ${t.status} | Created: ${new Date(t.createdAt).toISOString().slice(0, 10)}${t.evidenceNotes ? ` | Evidence: ${t.evidenceNotes.slice(0, 200)}` : ""}`,
    )
    .join("\n");

  const systemPrompt = `You are the Cyber Chaperone AI Assistant, integrated into the eblockwatch security operations situation room in South Africa. You help the operator (Andre) understand trip activity, assess risk, and make decisions.

Today's date: ${new Date().toISOString().slice(0, 10)}

Recent trip data (last 20 trips):
${tripContext || "No trips yet."}

Be concise, factual, and professional. Use plain English. Never fabricate data. If you don't know something, say so.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
    });

    const reply = completion.choices[0]?.message?.content?.trim() ?? "I was unable to process your request.";
    res.json({ reply });
  } catch (err) {
    req.log.error({ err }, "AI chat failed");
    res.status(500).json({ error: "AI chat failed" });
  }
});

// ── POST /api/ai/trips/:id/risk-assess ───────────────────────────────────────
// On-demand AI risk assessment for a specific message/trip context
router.post("/ai/trips/:id/risk-assess", async (req, res): Promise<void> => {
  const tripId = parseInt(req.params.id, 10);
  if (isNaN(tripId)) {
    res.status(400).json({ error: "Invalid trip id" });
    return;
  }

  const { messageText } = req.body as { messageText?: string };
  if (!messageText) {
    res.status(400).json({ error: "messageText is required" });
    return;
  }

  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, tripId));
  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }

  const { riskLevel, reason } = await assessRisk(messageText, trip.title, trip.evidenceNotes);
  res.json({ riskLevel, reason });
});

// ── Shared risk assessment helper (also used by webhook) ─────────────────────

export interface RiskAssessment {
  riskLevel: "green" | "amber" | "red";
  reason: string;
}

export async function assessRisk(
  messageText: string,
  tripTitle: string,
  evidenceNotes: string | null | undefined,
): Promise<RiskAssessment> {
  const prompt = `You are a security risk analyst for Cyber Chaperone, a travel safety monitoring service in South Africa. Assess the risk level of the following traveller WhatsApp message.

Trip: ${tripTitle}
Prior context: ${evidenceNotes?.slice(0, 300) || "None"}
New message: "${messageText}"

Respond ONLY with valid JSON in this exact format:
{"riskLevel":"green","reason":"Brief one-sentence explanation"}

riskLevel must be one of: "green" (safe, normal update), "amber" (concern, delay, uncertainty), "red" (distress, danger, emergency).`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "{}";
    const parsed = JSON.parse(raw) as { riskLevel?: string; reason?: string };

    const level = parsed.riskLevel;
    if (level === "green" || level === "amber" || level === "red") {
      return { riskLevel: level, reason: parsed.reason ?? "" };
    }
    return { riskLevel: "green", reason: "AI assessment inconclusive — defaulting to green." };
  } catch {
    return { riskLevel: "green", reason: "AI assessment unavailable — defaulting to green." };
  }
}

export default router;
