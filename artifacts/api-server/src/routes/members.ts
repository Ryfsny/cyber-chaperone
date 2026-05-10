import { Router, type IRouter } from "express";
import { db, membersTable, tripsTable, messagesTable } from "@workspace/db";
import { insertMemberSchema } from "@workspace/db";
import { ilike, or, sql, asc, eq, desc } from "drizzle-orm";

const router: IRouter = Router();

// ── GET /api/members — paginated + searchable ─────────────────────────────────
router.get("/members", async (req, res): Promise<void> => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
  const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? "50"), 10)));
  const offset = (page - 1) * limit;
  const search = String(req.query.search ?? "").trim();
  const province = String(req.query.province ?? "").trim();
  const city = String(req.query.city ?? "").trim();
  const source = String(req.query.source ?? "").trim();
  const status = String(req.query.status ?? "").trim();
  const tier = String(req.query.tier ?? "").trim();

  type WhereClause = ReturnType<typeof ilike> | ReturnType<typeof or> | ReturnType<typeof eq>;
  const conditions: WhereClause[] = [];

  if (search) {
    const like = `%${search}%`;
    conditions.push(
      or(
        ilike(membersTable.displayName, like),
        ilike(membersTable.firstName, like),
        ilike(membersTable.lastName, like),
        ilike(membersTable.mobile, like),
        ilike(membersTable.email, like),
        ilike(membersTable.suburb, like),
        ilike(membersTable.city, like),
        ilike(membersTable.homeAddress, like),
        ilike(membersTable.whatsappNumber, like),
      )!
    );
  }
  if (province) conditions.push(ilike(membersTable.province, province));
  if (city) conditions.push(ilike(membersTable.city, `%${city}%`));
  if (source === "none") {
    conditions.push(sql`source_batch IS NULL` as unknown as ReturnType<typeof eq>);
  } else if (source) {
    conditions.push(ilike(membersTable.sourceBatch, source));
  }
  if (status) conditions.push(eq(membersTable.memberStatus, status));
  if (tier === "family") {
    conditions.push(sql`family_group_id IS NOT NULL` as unknown as ReturnType<typeof eq>);
  } else if (tier) {
    conditions.push(ilike(membersTable.membershipTier, tier));
  }

  const where = conditions.length === 1
    ? conditions[0]
    : conditions.length > 1
      ? conditions.reduce((a, b) => sql`${a} AND ${b}`)
      : undefined;

  const [members, countResult] = await Promise.all([
    where
      ? db.select().from(membersTable).where(where).orderBy(asc(membersTable.id)).limit(limit).offset(offset)
      : db.select().from(membersTable).orderBy(asc(membersTable.id)).limit(limit).offset(offset),
    where
      ? db.select({ count: sql<number>`count(*)` }).from(membersTable).where(where)
      : db.select({ count: sql<number>`count(*)` }).from(membersTable),
  ]);

  const total = Number(countResult[0]?.count ?? 0);
  res.json({
    data: members,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// ── GET /api/members/sources ──────────────────────────────────────────────────
router.get("/members/sources", async (_req, res): Promise<void> => {
  const rows = await db
    .select({ source: membersTable.sourceBatch, count: sql<number>`count(*)` })
    .from(membersTable)
    .groupBy(membersTable.sourceBatch)
    .orderBy(sql`count(*) desc`);
  res.json(rows);
});

// ── GET /api/members/duplicates ───────────────────────────────────────────────
router.get("/members/duplicates", async (_req, res): Promise<void> => {
  const [dupePhones, dupeNames] = await Promise.all([
    db.execute(sql`
      SELECT whatsapp_number, count(*) as cnt
      FROM members GROUP BY whatsapp_number HAVING count(*) > 1 ORDER BY cnt DESC
    `),
    db.execute(sql`
      SELECT lower(display_name) as name_key, count(*) as cnt, array_agg(id ORDER BY id) as ids
      FROM members GROUP BY lower(display_name) HAVING count(*) > 1 ORDER BY cnt DESC LIMIT 100
    `),
  ]);
  res.json({
    byPhone: dupePhones.rows,
    byName: dupeNames.rows,
    summary: { duplicatePhones: dupePhones.rows.length, duplicateNames: dupeNames.rows.length },
  });
});

// ── GET /api/members/map — GPS-only list for maps ─────────────────────────────
router.get("/members/map", async (_req, res): Promise<void> => {
  const members = await db
    .select({
      id: membersTable.id,
      displayName: membersTable.displayName,
      whatsappNumber: membersTable.whatsappNumber,
      memberStatus: membersTable.memberStatus,
      homeLat: membersTable.homeLat,
      homeLon: membersTable.homeLon,
      homeAddress: membersTable.homeAddress,
      suburb: membersTable.suburb,
      city: membersTable.city,
      province: membersTable.province,
      email: membersTable.email,
      industry: membersTable.industry,
    })
    .from(membersTable)
    .where(sql`home_lat IS NOT NULL AND home_lon IS NOT NULL`);
  res.json(members);
});

// ── GET /api/members/:id — full member profile ────────────────────────────────
router.get("/members/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [member] = await db.select().from(membersTable).where(eq(membersTable.id, id));
  if (!member) { res.status(404).json({ error: "Not found" }); return; }
  res.json(member);
});

// ── GET /api/members/:id/trips — all trips for this member ────────────────────
router.get("/members/:id/trips", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [member] = await db.select({ whatsappNumber: membersTable.whatsappNumber, mobile: membersTable.mobile })
    .from(membersTable).where(eq(membersTable.id, id));
  if (!member) { res.status(404).json({ error: "Not found" }); return; }

  // trips are linked by traveler_phone = member's whatsapp_number
  const trips = await db.select().from(tripsTable)
    .where(eq(tripsTable.travelerPhone, member.whatsappNumber))
    .orderBy(desc(tripsTable.createdAt));
  res.json(trips);
});

// ── GET /api/members/:id/messages — WhatsApp message history ─────────────────
router.get("/members/:id/messages", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [member] = await db.select({ whatsappNumber: membersTable.whatsappNumber })
    .from(membersTable).where(eq(membersTable.id, id));
  if (!member) { res.status(404).json({ error: "Not found" }); return; }

  const messages = await db.select().from(messagesTable)
    .where(
      or(
        eq(messagesTable.fromNumber, member.whatsappNumber),
        eq(messagesTable.toNumber, member.whatsappNumber),
      )!
    )
    .orderBy(asc(messagesTable.receivedAt))
    .limit(300);
  res.json(messages);
});

// ── PATCH /api/members/:id — update member fields ────────────────────────────
router.patch("/members/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const allowed = [
    "firstName", "lastName", "displayName", "memberStatus", "membershipTier",
    "role", "notes", "iceContactName", "iceContactPhone",
    "email", "mobile", "homeAddress", "suburb", "city", "province", "postalCode", "country",
  ] as const;
  type AllowedKey = typeof allowed[number];
  const update: Partial<Record<AllowedKey, string | null>> = {};

  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
      const val = req.body[key];
      update[key] = typeof val === "string" ? val.trim() || null : null;
    }
  }

  if (Object.keys(update).length === 0) {
    res.status(400).json({ error: "No valid fields provided." }); return;
  }

  const [updated] = await db
    .update(membersTable)
    .set({ ...update, updatedAt: new Date() })
    .where(eq(membersTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Member not found." }); return; }
  res.json(updated);
});

// ── POST /api/members — create / upsert member ───────────────────────────────
router.post("/members", async (req, res): Promise<void> => {
  const parsed = insertMemberSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const [member] = await db
    .insert(membersTable)
    .values(parsed.data)
    .onConflictDoUpdate({
      target: membersTable.whatsappNumber,
      set: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        displayName: parsed.data.displayName,
        memberStatus: parsed.data.memberStatus ?? "active",
        role: parsed.data.role,
        notes: parsed.data.notes,
        iceContactName: parsed.data.iceContactName ?? null,
        iceContactPhone: parsed.data.iceContactPhone ?? null,
        sourceBatch: parsed.data.sourceBatch ?? undefined,
        province: parsed.data.province ?? undefined,
        city: parsed.data.city ?? undefined,
        suburb: parsed.data.suburb ?? undefined,
        industry: parsed.data.industry ?? undefined,
        membershipTier: parsed.data.membershipTier ?? undefined,
        email: parsed.data.email ?? undefined,
        mobile: parsed.data.mobile ?? undefined,
      },
    })
    .returning();
  res.status(201).json(member);
});

export default router;
