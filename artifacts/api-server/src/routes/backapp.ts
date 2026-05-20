import { Router } from "express";
import { db } from "@workspace/db";
import { locationPingsTable, membersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) {
    return `whatsapp:+27${digits.slice(1)}`;
  }
  if (digits.startsWith("27") && digits.length === 11) {
    return `whatsapp:+${digits}`;
  }
  if (raw.startsWith("whatsapp:")) return raw;
  return `whatsapp:+${digits}`;
}

const INTERVAL_MAP: Record<string, number> = {
  idle: 7200,
  trip: 60,
  emergency: 30,
};

type AppMode = "idle" | "trip" | "emergency";

function isValidMode(s: unknown): s is AppMode {
  return s === "idle" || s === "trip" || s === "emergency";
}

router.post("/backapp/ping", async (req, res) => {
  const { phone, lat, lon, accuracy } = req.body as Record<string, unknown>;
  if (typeof phone !== "string" || typeof lat !== "number" || typeof lon !== "number") {
    res.status(400).json({ error: "phone, lat, lon required" });
    return;
  }

  const normPhone = normalisePhone(phone);

  const member = await db.query.membersTable.findFirst({
    where: eq(membersTable.whatsappNumber, normPhone),
    columns: { id: true, backappMode: true, backappIntervalSeconds: true },
  });

  const mode = (member?.backappMode ?? "idle") as AppMode;
  const intervalSeconds = member?.backappIntervalSeconds ?? INTERVAL_MAP[mode] ?? 7200;

  await db.insert(locationPingsTable).values({
    memberPhone: normPhone,
    lat: lat as number,
    lon: lon as number,
    accuracy: typeof accuracy === "number" ? accuracy : null,
    mode,
  });

  res.json({ mode, intervalSeconds });
});

router.post("/backapp/start", async (req, res) => {
  const { phone } = req.body as Record<string, unknown>;
  if (typeof phone !== "string") { res.status(400).json({ error: "phone required" }); return; }

  const normPhone = normalisePhone(phone);
  await db.update(membersTable)
    .set({ backappMode: "trip", backappIntervalSeconds: INTERVAL_MAP["trip"] })
    .where(eq(membersTable.whatsappNumber, normPhone));

  res.json({ mode: "trip", intervalSeconds: INTERVAL_MAP["trip"] });
});

router.post("/backapp/stop", async (req, res) => {
  const { phone } = req.body as Record<string, unknown>;
  if (typeof phone !== "string") { res.status(400).json({ error: "phone required" }); return; }

  const normPhone = normalisePhone(phone);
  await db.update(membersTable)
    .set({ backappMode: "idle", backappIntervalSeconds: INTERVAL_MAP["idle"] })
    .where(eq(membersTable.whatsappNumber, normPhone));

  res.json({ mode: "idle", intervalSeconds: INTERVAL_MAP["idle"] });
});

router.get("/backapp/mode", async (req, res) => {
  const phone = req.query["phone"];
  if (typeof phone !== "string") { res.status(400).json({ error: "phone query param required" }); return; }

  const normPhone = normalisePhone(phone);
  const member = await db.query.membersTable.findFirst({
    where: eq(membersTable.whatsappNumber, normPhone),
    columns: { backappMode: true, backappIntervalSeconds: true, firstName: true, displayName: true },
  });

  if (!member) {
    res.json({ mode: "idle", intervalSeconds: INTERVAL_MAP["idle"], known: false });
    return;
  }

  const mode = (member.backappMode ?? "idle") as AppMode;
  const intervalSeconds = member.backappIntervalSeconds ?? INTERVAL_MAP[mode] ?? 7200;
  res.json({ mode, intervalSeconds, known: true, name: member.displayName || member.firstName });
});

router.post("/backapp/command", async (req, res) => {
  const { phone, mode } = req.body as Record<string, unknown>;
  if (typeof phone !== "string" || !isValidMode(mode)) {
    res.status(400).json({ error: "phone and mode (idle|trip|emergency) required" });
    return;
  }

  const normPhone = normalisePhone(phone);
  const intervalSeconds = INTERVAL_MAP[mode];

  await db.update(membersTable)
    .set({ backappMode: mode, backappIntervalSeconds: intervalSeconds })
    .where(eq(membersTable.whatsappNumber, normPhone));

  res.json({ mode, intervalSeconds });
});

router.get("/backapp/pings/:phone", async (req, res) => {
  const normPhone = normalisePhone(req.params["phone"] ?? "");
  const pings = await db.query.locationPingsTable.findMany({
    where: eq(locationPingsTable.memberPhone, normPhone),
    orderBy: (t, { desc }) => [desc(t.pingedAt)],
    limit: 50,
  });
  res.json(pings);
});

export default router;
