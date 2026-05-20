import { Router } from "express";
import { db } from "@workspace/db";
import { locationPingsTable, membersTable, tripsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

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

async function findActiveTrip(normPhone: string) {
  return db.query.tripsTable.findFirst({
    where: and(
      eq(tripsTable.travelerPhone, normPhone),
      eq(tripsTable.tripType, "backapp"),
      eq(tripsTable.status, "GREEN")
    ),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    columns: { id: true },
  });
}

// POST /api/backapp/ping — send GPS, get back current mode + interval
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

  // Record the ping
  await db.insert(locationPingsTable).values({
    memberPhone: normPhone,
    lat: lat as number,
    lon: lon as number,
    accuracy: typeof accuracy === "number" ? accuracy : null,
    mode,
  });

  // Update the active trip's last known position
  if (mode === "trip" || mode === "emergency") {
    const activeTrip = await findActiveTrip(normPhone);
    if (activeTrip) {
      await db.update(tripsTable)
        .set({
          lastKnownLat: String(lat),
          lastKnownLon: String(lon),
          lastKnownAt: new Date(),
          lastLocationSource: "backapp",
          lastMemberCheckinTime: new Date(),
        })
        .where(eq(tripsTable.id, activeTrip.id));
    }
  }

  res.json({ mode, intervalSeconds });
});

// POST /api/backapp/start — member starts a trip; creates a Situation Room trip card
router.post("/backapp/start", async (req, res) => {
  const { phone, lat, lon, from, dest } = req.body as Record<string, unknown>;
  if (typeof phone !== "string") { res.status(400).json({ error: "phone required" }); return; }

  const normPhone = normalisePhone(phone);

  // Look up member name
  const member = await db.query.membersTable.findFirst({
    where: eq(membersTable.whatsappNumber, normPhone),
    columns: { firstName: true, lastName: true, displayName: true },
  });

  const travelerName = member?.displayName || member?.firstName || normPhone;
  const fromLabel = typeof from === "string" && from.trim() ? from.trim() : "Unknown location";
  const destLabel = typeof dest === "string" && dest.trim() ? dest.trim() : "Unspecified";
  const title = `BackApp — ${travelerName} › ${destLabel}`;

  // Create a GREEN trip in the Situation Room
  const [newTrip] = await db.insert(tripsTable).values({
    title,
    travelerName,
    travelerPhone: normPhone,
    status: "GREEN",
    tripType: "backapp",
    startLat: typeof lat === "number" ? String(lat) : null,
    startLon: typeof lon === "number" ? String(lon) : null,
    lastKnownLat: typeof lat === "number" ? String(lat) : null,
    lastKnownLon: typeof lon === "number" ? String(lon) : null,
    lastKnownAt: typeof lat === "number" ? new Date() : null,
    lastLocationSource: "backapp",
    inferenceNotes: `BackApp GPS tracking active. Pinging every 60 seconds.`,
    nextAction: "Monitor location pings — no ETA set.",
  }).returning({ id: tripsTable.id });

  // Switch member to trip mode
  await db.update(membersTable)
    .set({ backappMode: "trip", backappIntervalSeconds: INTERVAL_MAP["trip"] })
    .where(eq(membersTable.whatsappNumber, normPhone));

  res.json({ mode: "trip", intervalSeconds: INTERVAL_MAP["trip"], tripId: newTrip?.id });
});

// POST /api/backapp/stop — member ends trip; closes the Situation Room trip card
router.post("/backapp/stop", async (req, res) => {
  const { phone } = req.body as Record<string, unknown>;
  if (typeof phone !== "string") { res.status(400).json({ error: "phone required" }); return; }

  const normPhone = normalisePhone(phone);

  // Close the active trip
  const activeTrip = await findActiveTrip(normPhone);
  if (activeTrip) {
    await db.update(tripsTable)
      .set({
        status: "ARRIVED",
        inferenceNotes: "Trip ended by member via BackApp.",
        nextAction: "Trip closed.",
        lastLocationSource: "backapp",
      })
      .where(eq(tripsTable.id, activeTrip.id));
  }

  // Switch member back to idle
  await db.update(membersTable)
    .set({ backappMode: "idle", backappIntervalSeconds: INTERVAL_MAP["idle"] })
    .where(eq(membersTable.whatsappNumber, normPhone));

  res.json({ mode: "idle", intervalSeconds: INTERVAL_MAP["idle"] });
});

// GET /api/backapp/mode?phone=xxx — app polls for operator mode override
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

// POST /api/backapp/command — operator pushes mode override
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

  // If escalating to emergency, update the active trip status to RED
  if (mode === "emergency") {
    const activeTrip = await findActiveTrip(normPhone);
    if (activeTrip) {
      await db.update(tripsTable)
        .set({
          status: "RED",
          inferenceNotes: "Operator escalated to EMERGENCY via BackApp command.",
          nextAction: "Emergency GPS tracking active — ping every 30s.",
        })
        .where(eq(tripsTable.id, activeTrip.id));
    }
  }

  res.json({ mode, intervalSeconds });
});

// GET /api/backapp/pings/:phone — operator reads recent ping history
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
