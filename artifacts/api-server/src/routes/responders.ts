import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import twilio from "twilio";
import { db, respondersTable, tripsTable } from "@workspace/db";
import {
  ListRespondersResponse,
  CreateResponderBody,
  UpdateResponderParams,
  UpdateResponderBody,
  UpdateResponderResponse,
  DeleteResponderParams,
  DispatchResponderBody,
  DispatchResponderResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/responders", async (_req, res): Promise<void> => {
  const responders = await db
    .select()
    .from(respondersTable)
    .orderBy(respondersTable.areaName);
  res.json(ListRespondersResponse.parse(responders));
});

router.post("/responders", async (req, res): Promise<void> => {
  const parsed = CreateResponderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const [created] = await db
    .insert(respondersTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(created);
});

router.patch("/responders/:id", async (req, res): Promise<void> => {
  const params = UpdateResponderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateResponderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const [updated] = await db
    .update(respondersTable)
    .set(parsed.data)
    .where(eq(respondersTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(UpdateResponderResponse.parse(updated));
});

router.delete("/responders/:id", async (req, res): Promise<void> => {
  const params = DeleteResponderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const deleted = await db
    .delete(respondersTable)
    .where(eq(respondersTable.id, params.data.id))
    .returning();
  if (deleted.length === 0) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.status(204).send();
});

router.post("/dispatch", async (req, res): Promise<void> => {
  const parsed = DispatchResponderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { tripId, responderId, customNote } = parsed.data;

  const [trip] = await db
    .select()
    .from(tripsTable)
    .where(eq(tripsTable.id, tripId));
  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }

  const [responder] = await db
    .select()
    .from(respondersTable)
    .where(eq(respondersTable.id, responderId));
  if (!responder) {
    res.status(404).json({ error: "Responder not found" });
    return;
  }

  const statusLabel =
    {
      green: "ACTIVE — Member en route",
      amber: "AMBER ALERT — Check-in overdue",
      red: "RED ALERT — URGENT ASSISTANCE NEEDED",
      completed: "COMPLETED",
    }[trip.status] ?? trip.status.toUpperCase();

  const lines: string[] = [
    `🚨 CYBER CHAPERONE DISPATCH — eblockwatch`,
    ``,
    `Status: ${statusLabel}`,
    `Member: ${trip.travelerName}`,
    `Trip: ${trip.title}`,
  ];
  if (trip.routeEtaTime) lines.push(`ETA: ${trip.routeEtaTime}`);
  if (trip.evidenceNotes) lines.push(`Situation: ${trip.evidenceNotes}`);
  if (customNote) lines.push(`Operator note: ${customNote}`);
  lines.push(
    ``,
    `Please assess and assist where possible. You may mobilise your local Residents Association WhatsApp group and request first responders to assist.`,
    ``,
    `Reply YES to acknowledge this dispatch.`
  );

  const message = lines.join("\n");
  const accountSid = process.env["TWILIO_ACCOUNT_SID"];
  const authToken = process.env["TWILIO_AUTH_TOKEN"];
  const fromNumber =
    process.env["OPERATOR_WHATSAPP_NUMBER"] ?? "whatsapp:+14155238886";

  let messageSid: string | null = null;
  let sent = false;

  if (accountSid && authToken) {
    try {
      const client = twilio(accountSid, authToken);
      const toNumber = responder.whatsappNumber.startsWith("whatsapp:")
        ? responder.whatsappNumber
        : `whatsapp:${responder.whatsappNumber}`;
      const msg = await client.messages.create({
        body: message,
        from: fromNumber,
        to: toNumber,
      });
      messageSid = msg.sid;
      sent = true;
    } catch (err) {
      req.log.error({ err }, "Failed to send WhatsApp dispatch");
    }
  }

  res.json(DispatchResponderResponse.parse({ sent, messageSid, preview: message }));
});

export default router;
