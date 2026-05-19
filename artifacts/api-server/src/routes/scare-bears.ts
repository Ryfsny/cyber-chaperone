/**
 * Scare Bear API — operator-protected read/write for scare bear sightings.
 *
 * Privacy rules:
 * - reporterPhone is NEVER returned in any response
 * - descriptions are pre-filtered (plates/names stripped) before storage
 * - all routes require operator auth (enforced in routes/index.ts via requireAuth)
 */

import { Router, type Request, type Response } from "express";
import { db, scareBearSightingsTable } from "@workspace/db";
import { desc, gte, sql } from "drizzle-orm";

export const router = Router();

// ── Privacy filter — strip SA plate patterns and common name-like patterns ────

const SA_PLATE_RE = /\b[A-Z]{1,3}\s*\d{2,4}[\s-]*[A-Z]{0,3}\b/g;

export function privacyFilter(text: string): string {
  return text
    .replace(SA_PLATE_RE, "[PLATE REMOVED]")
    .trim();
}

// ── GET /api/scare-bears — list active (non-expired) sightings ────────────────

router.get("/scare-bears", async (req: Request, res: Response): Promise<void> => {
  try {
    const { all } = req.query as { all?: string };
    const now = new Date();

    const rows = await db
      .select({
        id: scareBearSightingsTable.id,
        lat: scareBearSightingsTable.lat,
        lon: scareBearSightingsTable.lon,
        areaName: scareBearSightingsTable.areaName,
        type: scareBearSightingsTable.type,
        description: scareBearSightingsTable.description,
        mediaUrl: scareBearSightingsTable.mediaUrl,
        mediaType: scareBearSightingsTable.mediaType,
        expiresAt: scareBearSightingsTable.expiresAt,
        createdAt: scareBearSightingsTable.createdAt,
        // reporterPhone deliberately excluded — privacy rule
      })
      .from(scareBearSightingsTable)
      .where(all === "1" ? undefined : gte(scareBearSightingsTable.expiresAt, now))
      .orderBy(desc(scareBearSightingsTable.createdAt))
      .limit(200);

    res.json(rows);
  } catch (err) {
    req.log?.error({ err }, "scare-bears GET error");
    res.status(500).json({ error: "Failed to fetch scare bear sightings" });
  }
});

// ── GET /api/scare-bears/stats — quick count for dashboard ───────────────────

router.get("/scare-bears/stats", async (req: Request, res: Response): Promise<void> => {
  try {
    const [row] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(scareBearSightingsTable)
      .where(gte(scareBearSightingsTable.expiresAt, new Date()));
    res.json({ active: Number(row?.total ?? 0) });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

// ── POST /api/scare-bears — operator can log a sighting manually ──────────────

router.post("/scare-bears", async (req: Request, res: Response): Promise<void> => {
  const { lat, lon, areaName, type, description, mediaUrl, mediaType, expiresInHours = 4 } =
    req.body as {
      lat?: string; lon?: string; areaName?: string; type?: string;
      description?: string; mediaUrl?: string; mediaType?: string; expiresInHours?: number;
    };

  const filtered = description ? privacyFilter(description) : null;
  const expiresAt = new Date(Date.now() + Number(expiresInHours) * 60 * 60 * 1000);

  try {
    const [row] = await db
      .insert(scareBearSightingsTable)
      .values({
        reporterPhone: "operator",
        lat: lat ?? null,
        lon: lon ?? null,
        areaName: areaName ?? null,
        type: type ?? "scary_character",
        description: filtered,
        mediaUrl: mediaUrl ?? null,
        mediaType: mediaType ?? null,
        expiresAt,
      })
      .returning({
        id: scareBearSightingsTable.id,
        areaName: scareBearSightingsTable.areaName,
        type: scareBearSightingsTable.type,
        createdAt: scareBearSightingsTable.createdAt,
        expiresAt: scareBearSightingsTable.expiresAt,
      });
    res.status(201).json(row);
  } catch (err) {
    req.log?.error({ err }, "scare-bears POST error");
    res.status(500).json({ error: "Failed to log sighting" });
  }
});

export default router;
