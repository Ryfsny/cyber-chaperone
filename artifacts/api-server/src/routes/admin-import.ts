/**
 * TEMPORARY — admin member import endpoint.
 * Protected by OPERATOR_PASSWORD in the request body (not session).
 * Remove this file and its index.ts registration after the prod data migration.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { db, membersTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

interface ImportRow {
  firstName: string;
  lastName: string;
  displayName: string;
  whatsappNumber: string;
  memberStatus: string;
  membershipTier?: string | null;
  role?: string | null;
  notes?: string | null;
  iceContactName?: string | null;
  iceContactPhone?: string | null;
  familyGroupId?: number | null;
  homeLat?: string | null;
  homeLon?: string | null;
  homeAddress?: string | null;
  email?: string | null;
  mobile?: string | null;
  industry?: string | null;
  suburb?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country?: string | null;
  sourceBatch?: string | null;
  importStatus?: string | null;
  paystackCustomerId?: string | null;
  paystackSubscriptionCode?: string | null;
  paystackStatus?: string | null;
  paystackPlanCode?: string | null;
  paystackPaidAt?: string | null;
  facebookUrl?: string | null;
}

router.post("/admin/import-members", async (req: Request, res: Response): Promise<void> => {
  const { password, members } = req.body as { password?: string; members?: ImportRow[] };

  const operatorPassword = process.env["OPERATOR_PASSWORD"];
  if (!operatorPassword || password !== operatorPassword) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!Array.isArray(members) || members.length === 0) {
    res.status(400).json({ error: "members array is required and must not be empty" });
    return;
  }

  try {
    const values = members.map((m) => ({
      firstName:                 m.firstName,
      lastName:                  m.lastName,
      displayName:               m.displayName,
      whatsappNumber:            m.whatsappNumber,
      memberStatus:              m.memberStatus ?? "unknown",
      membershipTier:            m.membershipTier ?? null,
      role:                      m.role ?? null,
      notes:                     m.notes ?? null,
      iceContactName:            m.iceContactName ?? null,
      iceContactPhone:           m.iceContactPhone ?? null,
      familyGroupId:             m.familyGroupId ?? null,
      homeLat:                   m.homeLat ?? null,
      homeLon:                   m.homeLon ?? null,
      homeAddress:               m.homeAddress ?? null,
      email:                     m.email ?? null,
      mobile:                    m.mobile ?? null,
      industry:                  m.industry ?? null,
      suburb:                    m.suburb ?? null,
      city:                      m.city ?? null,
      province:                  m.province ?? null,
      postalCode:                m.postalCode ?? null,
      country:                   m.country ?? null,
      sourceBatch:               m.sourceBatch ?? null,
      importStatus:              m.importStatus ?? null,
      paystackCustomerId:        m.paystackCustomerId ?? null,
      paystackSubscriptionCode:  m.paystackSubscriptionCode ?? null,
      paystackStatus:            m.paystackStatus ?? null,
      paystackPlanCode:          m.paystackPlanCode ?? null,
      paystackPaidAt:            m.paystackPaidAt ? new Date(m.paystackPaidAt) : null,
      facebookUrl:               m.facebookUrl ?? null,
    }));

    const result = await db
      .insert(membersTable)
      .values(values)
      .onConflictDoNothing({ target: membersTable.whatsappNumber });

    // Drizzle onConflictDoNothing doesn't expose rowCount directly; use rowsAffected via raw count
    const countRes = await db.select({ n: sql<number>`count(*)::int` }).from(membersTable);
    const totalNow = Number(countRes[0]?.n ?? 0);

    res.json({ ok: true, batchSize: members.length, totalInDb: totalNow });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
