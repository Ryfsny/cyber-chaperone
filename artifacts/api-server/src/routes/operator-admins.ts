/**
 * Admin management routes — national admins only.
 * POST /api/operator-admins         — create a new admin
 * GET  /api/operator-admins         — list all admins
 * PATCH /api/operator-admins/:id    — update an admin
 * DELETE /api/operator-admins/:id   — delete an admin
 * POST /api/operator-admins/:id/reset-password — change password
 */
import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { db, operatorAdminsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { isNationalAdmin } from "../middleware/require-auth.js";

const router: IRouter = Router();

function nationalOnly(req: Request, res: Response): boolean {
  if (!isNationalAdmin(req)) {
    res.status(403).json({ error: "National admin access required." });
    return false;
  }
  return true;
}

const VALID_ROLES = ["national", "provincial", "city", "suburb", "street"] as const;

router.get("/operator-admins", async (req: Request, res: Response): Promise<void> => {
  if (!nationalOnly(req, res)) return;
  const admins = await db.select({
    id: operatorAdminsTable.id,
    username: operatorAdminsTable.username,
    displayName: operatorAdminsTable.displayName,
    role: operatorAdminsTable.role,
    province: operatorAdminsTable.province,
    city: operatorAdminsTable.city,
    suburb: operatorAdminsTable.suburb,
    street: operatorAdminsTable.street,
    email: operatorAdminsTable.email,
    createdAt: operatorAdminsTable.createdAt,
  }).from(operatorAdminsTable);
  res.json(admins);
});

router.post("/operator-admins", async (req: Request, res: Response): Promise<void> => {
  if (!nationalOnly(req, res)) return;

  const { username, password, displayName, role, province, city, suburb, street, email } =
    req.body as {
      username?: string; password?: string; displayName?: string;
      role?: string; province?: string; city?: string; suburb?: string;
      street?: string; email?: string;
    };

  if (!username || !password || !displayName || !role) {
    res.status(400).json({ error: "username, password, displayName, and role are required." });
    return;
  }
  if (!VALID_ROLES.includes(role as typeof VALID_ROLES[number])) {
    res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(", ")}` });
    return;
  }
  if (role !== "national" && !province) {
    res.status(400).json({ error: "province is required for sub-national admins." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const [admin] = await db.insert(operatorAdminsTable).values({
      username: username.trim().toLowerCase(),
      passwordHash,
      displayName: displayName.trim(),
      role,
      province: province?.trim() || null,
      city: city?.trim() || null,
      suburb: suburb?.trim() || null,
      street: street?.trim() || null,
      email: email?.trim() || null,
    }).returning({
      id: operatorAdminsTable.id,
      username: operatorAdminsTable.username,
      displayName: operatorAdminsTable.displayName,
      role: operatorAdminsTable.role,
      province: operatorAdminsTable.province,
      city: operatorAdminsTable.city,
      suburb: operatorAdminsTable.suburb,
    });
    res.status(201).json(admin);
  } catch (err) {
    if (String(err).includes("unique")) {
      res.status(409).json({ error: "Username already exists." });
    } else {
      res.status(500).json({ error: String(err) });
    }
  }
});

router.patch("/operator-admins/:id", async (req: Request, res: Response): Promise<void> => {
  if (!nationalOnly(req, res)) return;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { displayName, role, province, city, suburb, street, email } = req.body as {
    displayName?: string; role?: string; province?: string; city?: string;
    suburb?: string; street?: string; email?: string;
  };

  const updates: Record<string, string | null> = { updatedAt: new Date().toISOString() };
  if (displayName) updates.displayName = displayName.trim();
  if (role) {
    if (!VALID_ROLES.includes(role as typeof VALID_ROLES[number])) {
      res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(", ")}` });
      return;
    }
    updates.role = role;
  }
  if (province !== undefined) updates.province = province?.trim() || null;
  if (city !== undefined)     updates.city = city?.trim() || null;
  if (suburb !== undefined)   updates.suburb = suburb?.trim() || null;
  if (street !== undefined)   updates.street = street?.trim() || null;
  if (email !== undefined)    updates.email = email?.trim() || null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [updated] = await db.update(operatorAdminsTable).set(updates as any).where(eq(operatorAdminsTable.id, id)).returning({
    id: operatorAdminsTable.id,
    username: operatorAdminsTable.username,
    displayName: operatorAdminsTable.displayName,
    role: operatorAdminsTable.role,
    province: operatorAdminsTable.province,
    city: operatorAdminsTable.city,
    suburb: operatorAdminsTable.suburb,
  });
  if (!updated) { res.status(404).json({ error: "Admin not found." }); return; }
  res.json(updated);
});

router.post("/operator-admins/:id/reset-password", async (req: Request, res: Response): Promise<void> => {
  if (!nationalOnly(req, res)) return;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { password } = req.body as { password?: string };
  if (!password || password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [updated] = await db.update(operatorAdminsTable)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(operatorAdminsTable.id, id))
    .returning({ id: operatorAdminsTable.id });
  if (!updated) { res.status(404).json({ error: "Admin not found." }); return; }
  res.json({ ok: true });
});

router.delete("/operator-admins/:id", async (req: Request, res: Response): Promise<void> => {
  if (!nationalOnly(req, res)) return;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(operatorAdminsTable).where(eq(operatorAdminsTable.id, id));
  res.json({ ok: true });
});

export default router;
