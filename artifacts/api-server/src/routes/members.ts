import { Router, type IRouter } from "express";
import { db, membersTable } from "@workspace/db";
import { insertMemberSchema } from "@workspace/db";

const router: IRouter = Router();

router.get("/members", async (_req, res): Promise<void> => {
  const members = await db.select().from(membersTable).orderBy(membersTable.createdAt);
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
