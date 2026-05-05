import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import twilio from "twilio";
import { db, respondersTable, tripsTable, caseParticipantsTable, caseLogsTable } from "@workspace/db";
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
  const data = {
    name: parsed.data.name,
    whatsappNumber: parsed.data.whatsappNumber,
    areaName: parsed.data.areaName,
    suburb: parsed.data.suburb ?? null,
    street: parsed.data.street ?? null,
    province: parsed.data.province ?? null,
    homeLat: parsed.data.homeLat,
    homeLon: parsed.data.homeLon,
    conduitType: parsed.data.conduitType ?? "general",
    supportRadiusKm: parsed.data.supportRadiusKm ?? 5,
    availabilityStatus: parsed.data.availabilityStatus ?? "available",
    trustLevel: parsed.data.trustLevel ?? "standard",
    linkedNetworkType: parsed.data.linkedNetworkType ?? null,
    linkedNetworkName: parsed.data.linkedNetworkName ?? null,
    notes: parsed.data.notes ?? null,
    active: parsed.data.active ?? true,
  };
  const [created] = await db.insert(respondersTable).values(data).returning();
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

// ── Situation Room Dispatch ───────────────────────────────────────────────────
// Privacy model: Level 1 (default) = approximate area only.
// No member name, phone, private notes, or dashboard links are sent.
router.post("/dispatch", async (req, res): Promise<void> => {
  const parsed = DispatchResponderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { tripId, responderId, customNote, infoLevel = 1 } = parsed.data;

  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, tripId));
  if (!trip) { res.status(404).json({ error: "Trip not found" }); return; }

  const [responder] = await db.select().from(respondersTable).where(eq(respondersTable.id, responderId));
  if (!responder) { res.status(404).json({ error: "Responder not found" }); return; }

  const statusLabel = { green: "ACTIVE", amber: "AMBER", red: "RED" }[trip.status] ?? trip.status.toUpperCase();

  // ── Build area descriptor — Level 1 privacy by default ──────────────────
  // Use responder's own area as the approximate location anchor.
  // Only escalate to route context / member name / phone if operator explicitly raises infoLevel.
  const areaDescriptor = responder.areaName ?? "your area";

  const lines: string[] = [
    `Cyber Chaperone request from the eblockwatch Situation Room.`,
    ``,
    `A member may need assistance near ${areaDescriptor}.`,
    ``,
    `Status: ${statusLabel}`,
    ``,
    `Are you able to assist or help mobilise trusted local support?`,
    ``,
    `Reply:`,
    `1. I can assist directly`,
    `2. I can alert my local safety network`,
    `3. I can contact a trusted responder`,
    `4. I cannot assist now`,
    `5. Please ask the Situation Room to call me`,
  ];

  // Level 2: add route/destination context (no member identity)
  if (infoLevel >= 2 && trip.title) {
    lines.splice(3, 0, `General area: ${trip.title.split("→")[1]?.trim() ?? areaDescriptor}`);
  }

  // Level 3: add member first name only (no phone, no surname)
  if (infoLevel >= 3) {
    const firstName = trip.travelerName.split(" ")[0];
    lines.splice(3, 0, `Member: ${firstName}`);
  }

  // Operator note (internal context only — must be general, not identifying)
  if (customNote) {
    lines.push(``, `Additional context: ${customNote}`);
  }

  const message = lines.join("\n");

  const accountSid = process.env["TWILIO_ACCOUNT_SID"];
  const authToken = process.env["TWILIO_AUTH_TOKEN"];
  const fromNumber = process.env["OPERATOR_WHATSAPP_NUMBER"] ?? "whatsapp:+14155238886";

  let messageSid: string | null = null;
  let sent = false;

  if (accountSid && authToken) {
    try {
      const client = twilio(accountSid, authToken);
      const toNumber = responder.whatsappNumber.startsWith("whatsapp:")
        ? responder.whatsappNumber
        : `whatsapp:${responder.whatsappNumber}`;
      const msg = await client.messages.create({ body: message, from: fromNumber, to: toNumber });
      messageSid = msg.sid;
      sent = true;
    } catch (err) {
      req.log.error({ err }, "Failed to send WhatsApp dispatch");
    }
  }

  // ── Create / update case participant record ──────────────────────────────
  let participantId: number | null = null;
  const [participant] = await db
    .insert(caseParticipantsTable)
    .values({
      tripId,
      participantName: responder.name,
      whatsappNumber: responder.whatsappNumber,
      role: "conduit",
      accessStatus: "invited",
      infoLevel,
      invitedBy: "operator",
      responderId,
    })
    .returning();
  participantId = participant.id;

  // ── Write case log ───────────────────────────────────────────────────────
  const [log] = await db
    .insert(caseLogsTable)
    .values({
      tripId,
      participantId,
      actionType: "dispatch_sent",
      operator: "operator",
      participantName: responder.name,
      participantWhatsapp: responder.whatsappNumber,
      messageSent: message,
      infoLevelAtTime: infoLevel,
      tripStatusAtTime: trip.status,
      operatorNote: customNote ?? null,
      twilioMessageSid: messageSid,
      outcome: sent ? "Message sent via Twilio" : "Twilio not configured — preview only",
    })
    .returning();

  res.json(DispatchResponderResponse.parse({
    sent,
    messageSid,
    preview: message,
    participantId,
    caseLogId: log.id,
  }));
});

export default router;
