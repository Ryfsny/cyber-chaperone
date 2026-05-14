import { Router, type IRouter } from "express";
import { eq, sql, ilike, inArray } from "drizzle-orm";
import { db, tripsTable, messagesTable, membersTable } from "@workspace/db";
import { isNationalAdmin, getAdminScope, type AdminScope } from "../middleware/require-auth.js";
import {
  CreateTripBody,
  UpdateTripBody,
  GetTripParams,
  UpdateTripParams,
  DeleteTripParams,
  GetTripMessagesParams,
  ListTripsResponse,
  GetTripResponse,
  UpdateTripResponse,
  GetTripMessagesResponse,
  ListMessagesResponse,
  UpdateMessageParams,
  UpdateMessageBody,
  UpdateMessageResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

type ScopeCond = ReturnType<typeof eq>;

/**
 * Returns the set of member WhatsApp numbers that are within the operator's geo scope.
 * Used to filter trip lists for non-national operators.
 */
async function getScopedMemberPhones(scope: AdminScope): Promise<Set<string>> {
  const parts: ScopeCond[] = [];
  if (scope.province) parts.push(ilike(membersTable.province, scope.province) as unknown as ScopeCond);
  if (scope.city)     parts.push(ilike(membersTable.city, `%${scope.city}%`) as unknown as ScopeCond);
  if (scope.suburb)   parts.push(ilike(membersTable.suburb, `%${scope.suburb}%`) as unknown as ScopeCond);
  const where = parts.length === 0 ? undefined
    : parts.length === 1 ? parts[0]
    : parts.reduce((a, b) => sql`${a} AND ${b}` as unknown as ScopeCond);
  const rows = await db.select({ whatsappNumber: membersTable.whatsappNumber }).from(membersTable).where(where);
  return new Set(rows.map((r) => r.whatsappNumber));
}

/**
 * Checks whether a trip's traveler falls within the operator's scope.
 * Returns true for national admins. For scoped operators, looks up the member.
 */
async function tripInScope(travelerPhone: string, scope: AdminScope | null): Promise<boolean> {
  if (!scope) return true;
  const phones = await getScopedMemberPhones(scope);
  return phones.has(travelerPhone);
}

const withMessageCount = async (trips: (typeof tripsTable.$inferSelect)[]) => {
  if (trips.length === 0) return [];
  const counts = await db
    .select({ tripId: messagesTable.tripId, count: sql<number>`count(*)::int` })
    .from(messagesTable)
    .groupBy(messagesTable.tripId);
  const countMap = new Map(counts.map((c) => [c.tripId, c.count]));
  return trips.map((t) => ({ ...t, messageCount: countMap.get(t.id) ?? 0 }));
};

router.get("/trips", async (req, res): Promise<void> => {
  const scope = getAdminScope(req);

  if (scope) {
    // Non-national: only show trips for members in their geo scope
    const phones = await getScopedMemberPhones(scope);
    const phoneList = Array.from(phones);
    const trips = phoneList.length > 0
      ? await db.select().from(tripsTable)
          .where(inArray(tripsTable.travelerPhone, phoneList))
          .orderBy(tripsTable.createdAt)
      : [];
    const withCounts = await withMessageCount(trips);
    res.json(ListTripsResponse.parse(withCounts));
    return;
  }

  const trips = await db.select().from(tripsTable).orderBy(tripsTable.createdAt);
  const withCounts = await withMessageCount(trips);
  res.json(ListTripsResponse.parse(withCounts));
});

router.post("/trips", async (req, res): Promise<void> => {
  const parsed = CreateTripBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [trip] = await db.insert(tripsTable).values({
    title: parsed.data.title,
    travelerName: parsed.data.travelerName,
    travelerPhone: parsed.data.travelerPhone,
    status: parsed.data.status ?? "green",
    evidenceNotes: parsed.data.evidenceNotes ?? null,
    inferenceNotes: parsed.data.inferenceNotes ?? null,
    nextAction: parsed.data.nextAction ?? null,
    operatorNotes: parsed.data.operatorNotes ?? null,
  }).returning();
  res.status(201).json(GetTripResponse.parse({ ...trip, messageCount: 0 }));
});

router.get("/trips/:id", async (req, res): Promise<void> => {
  const params = GetTripParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, params.data.id));
  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }

  const scope = getAdminScope(req);
  if (!(await tripInScope(trip.travelerPhone, scope))) {
    res.status(403).json({ error: "Forbidden. This trip is outside your assigned area." });
    return;
  }

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messagesTable)
    .where(eq(messagesTable.tripId, trip.id));
  res.json(GetTripResponse.parse({ ...trip, messageCount: countRow?.count ?? 0 }));
});

router.patch("/trips/:id", async (req, res): Promise<void> => {
  const params = UpdateTripParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateTripBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select({ travelerPhone: tripsTable.travelerPhone }).from(tripsTable).where(eq(tripsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }

  const scope = getAdminScope(req);
  if (!(await tripInScope(existing.travelerPhone, scope))) {
    res.status(403).json({ error: "Forbidden. This trip is outside your assigned area." });
    return;
  }

  const updates: Partial<typeof tripsTable.$inferInsert> = {};
  if (parsed.data.title !== undefined) updates.title = parsed.data.title;
  if (parsed.data.travelerName !== undefined) updates.travelerName = parsed.data.travelerName;
  if (parsed.data.travelerPhone !== undefined) updates.travelerPhone = parsed.data.travelerPhone;
  if (parsed.data.status !== undefined) updates.status = parsed.data.status;
  if ("evidenceNotes" in parsed.data) updates.evidenceNotes = parsed.data.evidenceNotes ?? null;
  if ("inferenceNotes" in parsed.data) updates.inferenceNotes = parsed.data.inferenceNotes ?? null;
  if ("nextAction" in parsed.data) updates.nextAction = parsed.data.nextAction ?? null;
  if ("operatorNotes" in parsed.data) updates.operatorNotes = parsed.data.operatorNotes ?? null;

  const [trip] = await db
    .update(tripsTable)
    .set(updates)
    .where(eq(tripsTable.id, params.data.id))
    .returning();
  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messagesTable)
    .where(eq(messagesTable.tripId, trip.id));
  res.json(UpdateTripResponse.parse({ ...trip, messageCount: countRow?.count ?? 0 }));
});

router.delete("/trips/:id", async (req, res): Promise<void> => {
  if (!isNationalAdmin(req)) {
    res.status(403).json({ error: "Forbidden. National admin access required." });
    return;
  }
  const params = DeleteTripParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [trip] = await db.delete(tripsTable).where(eq(tripsTable.id, params.data.id)).returning();
  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/trips/:id/messages", async (req, res): Promise<void> => {
  const params = GetTripMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [trip] = await db.select({ travelerPhone: tripsTable.travelerPhone }).from(tripsTable).where(eq(tripsTable.id, params.data.id));
  if (!trip) {
    res.status(404).json({ error: "Trip not found" });
    return;
  }

  const scope = getAdminScope(req);
  if (!(await tripInScope(trip.travelerPhone, scope))) {
    res.status(403).json({ error: "Forbidden. This trip is outside your assigned area." });
    return;
  }

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.tripId, params.data.id))
    .orderBy(messagesTable.receivedAt);
  res.json(GetTripMessagesResponse.parse(messages));
});

router.get("/messages", async (req, res): Promise<void> => {
  if (!isNationalAdmin(req)) {
    res.status(403).json({ error: "Forbidden. National admin access required." });
    return;
  }
  const messages = await db.select().from(messagesTable).orderBy(messagesTable.receivedAt);
  res.json(ListMessagesResponse.parse(messages));
});

router.patch("/messages/:id", async (req, res): Promise<void> => {
  if (!isNationalAdmin(req)) {
    res.status(403).json({ error: "Forbidden. National admin access required." });
    return;
  }
  const params = UpdateMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [message] = await db
    .update(messagesTable)
    .set({ tripId: parsed.data.tripId ?? null })
    .where(eq(messagesTable.id, params.data.id))
    .returning();
  if (!message) {
    res.status(404).json({ error: "Message not found" });
    return;
  }
  res.json(UpdateMessageResponse.parse(message));
});

export default router;
