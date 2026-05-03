import { Router, type IRouter } from "express";
import { db, messagesTable, tripsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.post("/webhook/twilio", async (req, res): Promise<void> => {
  const body = req.body?.Body ?? "";
  const from = req.body?.From ?? "";
  const to = req.body?.To ?? "";
  const messageSid = req.body?.MessageSid ?? null;

  req.log.info({ from, messageSid: messageSid ? "[redacted]" : null }, "Incoming WhatsApp message");

  try {
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
  } catch (err) {
    req.log.error({ err }, "Failed to store incoming message");
  }

  res.set("Content-Type", "text/xml");
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
});

export default router;
