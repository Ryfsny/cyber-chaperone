import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, caseParticipantsTable, caseLogsTable, tripsTable } from "@workspace/db";
import {
  ListCaseParticipantsParams,
  InviteCaseParticipantParams,
  InviteCaseParticipantBody,
  UpdateCaseParticipantParams,
  UpdateCaseParticipantBody,
  ListCaseLogsParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ── List participants for a trip ──────────────────────────────────────────────
router.get("/trips/:id/participants", async (req, res): Promise<void> => {
  const params = ListCaseParticipantsParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid trip id" }); return; }
  const participants = await db
    .select()
    .from(caseParticipantsTable)
    .where(eq(caseParticipantsTable.tripId, params.data.id))
    .orderBy(caseParticipantsTable.invitedAt);
  res.json(participants);
});

// ── Invite a participant ──────────────────────────────────────────────────────
router.post("/trips/:id/participants", async (req, res): Promise<void> => {
  const params = InviteCaseParticipantParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid trip id" }); return; }
  const parsed = InviteCaseParticipantBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }

  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, params.data.id));
  if (!trip) { res.status(404).json({ error: "Trip not found" }); return; }

  const [participant] = await db
    .insert(caseParticipantsTable)
    .values({
      tripId: params.data.id,
      participantName: parsed.data.participantName,
      whatsappNumber: parsed.data.whatsappNumber,
      role: parsed.data.role,
      accessStatus: "invited",
      infoLevel: parsed.data.infoLevel ?? 1,
      permissions: parsed.data.permissions ?? null,
      notes: parsed.data.notes ?? null,
      invitedBy: parsed.data.invitedBy,
      responderId: parsed.data.responderId ?? null,
    })
    .returning();

  await db.insert(caseLogsTable).values({
    tripId: params.data.id,
    participantId: participant.id,
    actionType: "participant_invited",
    operator: parsed.data.invitedBy,
    participantName: parsed.data.participantName,
    participantWhatsapp: parsed.data.whatsappNumber,
    tripStatusAtTime: trip.status,
    infoLevelAtTime: parsed.data.infoLevel ?? 1,
    outcome: `Invited as ${parsed.data.role}`,
  });

  res.status(201).json(participant);
});

// ── Update participant status ─────────────────────────────────────────────────
router.patch("/trips/:id/participants/:participantId", async (req, res): Promise<void> => {
  const params = UpdateCaseParticipantParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid params" }); return; }
  const parsed = UpdateCaseParticipantBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request body" }); return; }

  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, params.data.id));

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.accessStatus === "removed" && parsed.data.removedBy) {
    updateData.removedAt = new Date();
  }

  const [updated] = await db
    .update(caseParticipantsTable)
    .set(updateData)
    .where(
      and(
        eq(caseParticipantsTable.id, params.data.participantId),
        eq(caseParticipantsTable.tripId, params.data.id),
      )
    )
    .returning();

  if (!updated) { res.status(404).json({ error: "Participant not found" }); return; }

  if (parsed.data.accessStatus) {
    const actionMap: Record<string, string> = {
      active: "status_changed",
      removed: "participant_removed",
      declined: "participant_declined",
      invited: "status_changed",
    };
    await db.insert(caseLogsTable).values({
      tripId: params.data.id,
      participantId: params.data.participantId,
      actionType: actionMap[parsed.data.accessStatus] ?? "status_changed",
      operator: parsed.data.removedBy ?? "operator",
      participantName: updated.participantName,
      participantWhatsapp: updated.whatsappNumber,
      tripStatusAtTime: trip?.status ?? null,
      outcome: `Status changed to ${parsed.data.accessStatus}`,
    });
  }

  res.json(updated);
});

// ── List case logs for a trip ─────────────────────────────────────────────────
router.get("/trips/:id/case-logs", async (req, res): Promise<void> => {
  const params = ListCaseLogsParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "Invalid trip id" }); return; }
  const logs = await db
    .select()
    .from(caseLogsTable)
    .where(eq(caseLogsTable.tripId, params.data.id))
    .orderBy(caseLogsTable.createdAt);
  res.json(logs);
});

export default router;
