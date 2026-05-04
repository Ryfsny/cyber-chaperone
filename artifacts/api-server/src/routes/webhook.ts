import { Router, type IRouter } from "express";
import { db, messagesTable, tripsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

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

router.post("/webhook/twilio", async (req, res): Promise<void> => {
  const body = req.body?.Body ?? "";
  const from = req.body?.From ?? "";
  const to = req.body?.To ?? "";
  const messageSid = req.body?.MessageSid ?? null;

  req.log.info({ from, messageSid: messageSid ? "[redacted]" : null }, "Incoming WhatsApp message");

  try {
    const parsed = parseTripStart(body);

    if (parsed) {
      const title = `${parsed.startLocation} → ${parsed.destination}`;
      const etaNote = parsed.eta ? ` ETA ${parsed.eta}.` : "";

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
      const [tripMatch] = await db
        .select()
        .from(tripsTable)
        .where(eq(tripsTable.travelerPhone, from))
        .limit(1);

      await db.insert(messagesTable).values({
        fromNumber: from,
        toNumber: to,
        body,
        messageSid,
        tripId: tripMatch?.id ?? null,
      });
    }
  } catch (err) {
    req.log.error({ err }, "Failed to store incoming message");
  }

  res.set("Content-Type", "text/xml");
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
});

export default router;
