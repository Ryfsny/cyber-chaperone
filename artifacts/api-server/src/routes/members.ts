import { Router, type IRouter } from "express";
import { db, membersTable } from "@workspace/db";
import { insertMemberSchema } from "@workspace/db";
import { ilike, or, sql, asc } from "drizzle-orm";

const router: IRouter = Router();

// GET /api/members?page=1&limit=50&search=xxx&province=xxx
// Paginated + searchable — never dumps all 91k rows at once
router.get("/members", async (req, res): Promise<void> => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
  const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? "50"), 10)));
  const offset = (page - 1) * limit;
  const search = String(req.query.search ?? "").trim();
  const province = String(req.query.province ?? "").trim();
  const city = String(req.query.city ?? "").trim();

  type WhereClause = ReturnType<typeof ilike> | ReturnType<typeof or>;
  const conditions: WhereClause[] = [];

  if (search) {
    const like = `%${search}%`;
    conditions.push(
      or(
        ilike(membersTable.displayName, like),
        ilike(membersTable.mobile, like),
        ilike(membersTable.email, like),
        ilike(membersTable.suburb, like),
        ilike(membersTable.city, like),
      )!
    );
  }
  if (province) conditions.push(ilike(membersTable.province, province));
  if (city) conditions.push(ilike(membersTable.city, `%${city}%`));

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

// GET /api/members/map — lightweight GPS-only list for radar map (no pagination)
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

router.post("/members", async (req, res): Promise<void> => {
  const parsed = insertMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
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
      },
    })
    .returning();
  res.status(201).json(member);
});

export default router;
