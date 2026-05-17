import { Router, type Request, type Response } from "express";
import { db, memberIncidentsTable, membersTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";

const router = Router();

// GET /api/incidents — all member incidents for the admin incident map
// requireAuth is applied in routes/index.ts before this router
router.get("/incidents", async (req: Request, res: Response): Promise<void> => {
  try {
    const incidents = await db
      .select({
        id: memberIncidentsTable.id,
        category: memberIncidentsTable.category,
        description: memberIncidentsTable.description,
        location: memberIncidentsTable.location,
        lat: memberIncidentsTable.lat,
        lon: memberIncidentsTable.lon,
        status: memberIncidentsTable.status,
        adminNotes: memberIncidentsTable.adminNotes,
        createdAt: memberIncidentsTable.createdAt,
        memberId: memberIncidentsTable.memberId,
        memberName: membersTable.displayName,
        memberSuburb: membersTable.suburb,
        memberCity: membersTable.city,
        memberProvince: membersTable.province,
      })
      .from(memberIncidentsTable)
      .leftJoin(membersTable, eq(memberIncidentsTable.memberId, membersTable.id))
      .orderBy(desc(memberIncidentsTable.createdAt));
    res.json(incidents);
  } catch (err) {
    req.log?.error({ err }, "incidents GET error");
    res.status(500).json({ error: "Failed to fetch incidents" });
  }
});

// PATCH /api/incidents/:id — operator updates status or admin notes
router.patch("/incidents/:id", async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { status, adminNotes } = req.body as { status?: string; adminNotes?: string };
  try {
    const [updated] = await db
      .update(memberIncidentsTable)
      .set({
        ...(status ? { status } : {}),
        ...(adminNotes !== undefined ? { adminNotes } : {}),
      })
      .where(eq(memberIncidentsTable.id, id))
      .returning();
    res.json(updated);
  } catch (err) {
    req.log?.error({ err }, "incidents PATCH error");
    res.status(500).json({ error: "Failed to update incident" });
  }
});

export default router;
