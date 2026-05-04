import { Router, type IRouter } from "express";
import { db, messagesTable, tripsTable } from "@workspace/db";
import { and, eq, ne, desc } from "drizzle-orm";
import twilio from "twilio";

const router: IRouter = Router();

// ── Keyword lists ────────────────────────────────────────────────────────────

const DISTRESS_WORDS = [
  "help", "sos", "emergency", "danger", "accident",
  "hijack", "hijacked", "crash", "police", "ambulance", "urgent",
];

const ARRIVAL_WORDS = [
  "arrived", "arrived safely", "safe", "at destination", "reached", "home safe",
];

const DELAY_WORDS = [
  "delayed", "running late", "traffic", "stopped", "stop", "stuck", "waiting",
];

const ETA_PATTERN = /(?:new\s+)?eta\s+(?:changed\s+to\s+)?(\d{1,2}:\d{2}(?:\s*[aApP][mM])?)/i;

type MessageClass = "distress" | "arrival" | "delay" | "eta" | "unknown";

function classifyMessage(text: string): MessageClass {
  const lower = text.toLowerCase();
  if (DISTRESS_WORDS.some((w) => lower.includes(w))) return "distress";
  if (ARRIVAL_WORDS.some((w) => lower.includes(w))) return "arrival";
  if (DELAY_WORDS.some((w) => lower.includes(w))) return "delay";
  if (ETA_PATTERN.test(text)) return "eta";
  return "unknown";
}

// ── Trip-start parser ────────────────────────────────────────────────────────

interface ParsedTripStart {
  startLocation: string;
  destination: string;
  eta: string | null;
}

function parseTripStart(body: string): ParsedTripStart | null {
  const match = body.match(
    /leaving\s+(.+?)\s+(?:now\s+)?heading\s+to\s+([^.]+?)(?:\.\s*ETA\s+([\d:aApPmM\s]+?))?\.?\s*$/i,
  );
  if (!match) return null;
  return {
    startLocation: match[1].trim(),
    destination: match[2].trim(),
    eta: match[3]?.trim() ?? null,
  };
}

// ── Active trip lookup (safe query) ──────────────────────────────────────────

async function findActiveTrip(phone: string) {
  const [trip] = await db
    .select()
    .from(tripsTable)
    .where(and(eq(tripsTable.travelerPhone, phone), ne(tripsTable.status, "completed")))
    .orderBy(desc(tripsTable.id))
    .limit(1);
  return trip ?? null;
}

// ── Outbound WhatsApp reply ───────────────────────────────────────────────────

async function sendReply(from: string, to: string, replyBody: string): Promise<void> {
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({ from: to, to: from, body: replyBody });
  } catch (err) {
    // Reply failure must never break the webhook response
  }
}

// ── Webhook handler ───────────────────────────────────────────────────────────

router.post("/webhook/twilio", async (req, res): Promise<void> => {
  const body = req.body?.Body ?? "";
  const from = req.body?.From ?? "";
  const to = req.body?.To ?? "";
  const messageSid = req.body?.MessageSid ?? null;

  req.log.info({ from, messageSid: messageSid ? "[redacted]" : null }, "Incoming WhatsApp message");

  try {
    const parsed = parseTripStart(body);

    if (parsed) {
      // ── Trip-start message ──────────────────────────────────────────────────
      const title = `${parsed.startLocation} → ${parsed.destination}`;
      const etaNote = parsed.eta ? ` ETA ${parsed.eta}.` : "";

      const closedTrips = await db
        .update(tripsTable)
        .set({ status: "completed" })
        .where(and(eq(tripsTable.travelerPhone, from), eq(tripsTable.status, "green")))
        .returning({ id: tripsTable.id });

      if (closedTrips.length > 0) {
        req.log.info({ closedTripIds: closedTrips.map((t) => t.id) }, "Closed previous GREEN trips for traveler");
      }

      const [newTrip] = await db
        .insert(tripsTable)
        .values({
          title,
          travelerName: from,
          travelerPhone: from,
          status: "green",
          evidenceNotes: body,
          inferenceNotes: `Freeform WhatsApp trip-start message detected.${etaNote}`,
        })
        .returning();

      await db.insert(messagesTable).values({
        fromNumber: from,
        toNumber: to,
        body,
        messageSid,
        tripId: newTrip.id,
      });

      req.log.info(
        { tripId: newTrip.id, title, startLocation: parsed.startLocation, destination: parsed.destination, eta: parsed.eta },
        "New trip created from WhatsApp message",
      );
    } else {
      // ── Follow-up message ───────────────────────────────────────────────────
      const activeTrip = await findActiveTrip(from);

      await db.insert(messagesTable).values({
        fromNumber: from,
        toNumber: to,
        body,
        messageSid,
        tripId: activeTrip?.id ?? null,
      });

      if (!activeTrip) {
        req.log.info({ from }, "Follow-up received but no active trip found");
        await sendReply(
          from,
          to,
          "Message received, but there is no active trip open. Please start a new trip with: Leaving [start] heading to [destination]. ETA [time].",
        );
      } else {
        const kind = classifyMessage(body);
        req.log.info({ tripId: activeTrip.id, kind }, "Follow-up message classified");

        if (kind === "distress") {
          await db
            .update(tripsTable)
            .set({
              status: "red",
              evidenceNotes: `${activeTrip.evidenceNotes ? activeTrip.evidenceNotes + "\n\n" : ""}DISTRESS: ${body}`,
              nextAction: "Immediate human review required.",
            })
            .where(eq(tripsTable.id, activeTrip.id));

          await sendReply(
            from,
            to,
            "Help message received. Stay as safe as possible. Your trip has been marked RED for immediate human review.",
          );
          req.log.info({ tripId: activeTrip.id }, "Trip escalated to RED — distress keyword");

        } else if (kind === "arrival") {
          await db
            .update(tripsTable)
            .set({
              status: "completed",
              evidenceNotes: `${activeTrip.evidenceNotes ? activeTrip.evidenceNotes + "\n\n" : ""}ARRIVAL: ${body}`,
            })
            .where(eq(tripsTable.id, activeTrip.id));

          await sendReply(
            from,
            to,
            "Received. Your arrival has been recorded and the trip is closed.",
          );
          req.log.info({ tripId: activeTrip.id }, "Trip closed — arrival keyword");

        } else if (kind === "delay") {
          await db
            .update(tripsTable)
            .set({
              status: "amber",
              evidenceNotes: `${activeTrip.evidenceNotes ? activeTrip.evidenceNotes + "\n\n" : ""}DELAY: ${body}`,
              nextAction: "Quiet monitor — await next update from traveler.",
            })
            .where(eq(tripsTable.id, activeTrip.id));

          await sendReply(
            from,
            to,
            "Update received. We have marked the trip Amber for monitoring. Please send another update when you move again or arrive.",
          );
          req.log.info({ tripId: activeTrip.id }, "Trip set to AMBER — delay keyword");

        } else if (kind === "eta") {
          const etaMatch = body.match(ETA_PATTERN);
          const newEta = etaMatch?.[1] ?? "unknown";
          await db
            .update(tripsTable)
            .set({
              evidenceNotes: `${activeTrip.evidenceNotes ? activeTrip.evidenceNotes + "\n\n" : ""}ETA UPDATE: ${body}`,
              inferenceNotes: `ETA updated to ${newEta}.`,
            })
            .where(eq(tripsTable.id, activeTrip.id));

          await sendReply(
            from,
            to,
            "ETA update received. We are still monitoring the trip.",
          );
          req.log.info({ tripId: activeTrip.id, newEta }, "Trip ETA updated — ETA keyword");

        } else {
          // Unknown follow-up — save message, touch updatedAt, no status change
          await db
            .update(tripsTable)
            .set({
              evidenceNotes: `${activeTrip.evidenceNotes ? activeTrip.evidenceNotes + "\n\n" : ""}UPDATE: ${body}`,
            })
            .where(eq(tripsTable.id, activeTrip.id));

          req.log.info({ tripId: activeTrip.id }, "General update appended to evidence notes");
        }
      }
    }
  } catch (err) {
    req.log.error({ err }, "Failed to process incoming message");
  }

  res.set("Content-Type", "text/xml");
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
});

export default router;
