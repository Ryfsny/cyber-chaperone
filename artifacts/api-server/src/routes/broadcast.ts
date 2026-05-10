import { Router, type IRouter, type Request, type Response } from "express";
import { db, membersTable } from "@workspace/db";
import { inArray, eq, or, sql, ilike } from "drizzle-orm";
import twilio from "twilio";
import { randomUUID } from "node:crypto";

const router: IRouter = Router();

interface BroadcastJob {
  id: string;
  total: number;
  sent: number;
  failed: number;
  done: boolean;
  startedAt: string;
  errors: Array<{ name: string; error: string }>;
}

const jobs = new Map<string, BroadcastJob>();

function buildWhere(status?: string, sourceBatch?: string) {
  const conditions: ReturnType<typeof eq>[] = [];
  if (status === "active") conditions.push(eq(membersTable.memberStatus, "active"));
  else if (status === "verified") conditions.push(eq(membersTable.memberStatus, "verified"));
  else if (status === "known") {
    conditions.push(or(eq(membersTable.memberStatus, "active"), eq(membersTable.memberStatus, "verified")) as ReturnType<typeof eq>);
  }
  if (sourceBatch === "none") {
    conditions.push(sql`source_batch IS NULL` as unknown as ReturnType<typeof eq>);
  } else if (sourceBatch) {
    conditions.push(ilike(membersTable.sourceBatch, sourceBatch) as unknown as ReturnType<typeof eq>);
  }
  return conditions.length === 0
    ? undefined
    : conditions.length === 1
      ? conditions[0]
      : conditions.reduce((a, b) => sql`${a} AND ${b}` as unknown as ReturnType<typeof eq>);
}

// GET /api/broadcast/counts — all group counts in one shot
router.get("/broadcast/counts", async (_req: Request, res: Response): Promise<void> => {
  const [totalRes, activeRes, verifiedRes, knownRes, sourceRes] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(membersTable),
    db.select({ n: sql<number>`count(*)::int` }).from(membersTable).where(eq(membersTable.memberStatus, "active")),
    db.select({ n: sql<number>`count(*)::int` }).from(membersTable).where(eq(membersTable.memberStatus, "verified")),
    db.select({ n: sql<number>`count(*)::int` }).from(membersTable).where(
      or(eq(membersTable.memberStatus, "active"), eq(membersTable.memberStatus, "verified"))!
    ),
    db
      .select({ source: membersTable.sourceBatch, n: sql<number>`count(*)::int` })
      .from(membersTable)
      .groupBy(membersTable.sourceBatch)
      .orderBy(sql`count(*) DESC`),
  ]);
  res.json({
    total: totalRes[0]?.n ?? 0,
    active: activeRes[0]?.n ?? 0,
    verified: verifiedRes[0]?.n ?? 0,
    known: knownRes[0]?.n ?? 0,
    bySource: sourceRes.map((s) => ({ source: s.source, count: s.n })),
  });
});

// GET /api/broadcast/job/:id — poll progress of a background send
router.get("/broadcast/job/:id", (req: Request, res: Response): void => {
  const job = jobs.get(req.params.id);
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  res.json(job);
});

// POST /api/broadcast
// { filter?: { status?, sourceBatch? }, memberIds?: number[], message: string }
router.post("/broadcast", async (req: Request, res: Response): Promise<void> => {
  const { filter, memberIds, message } = req.body as {
    filter?: { status?: string; sourceBatch?: string };
    memberIds?: number[];
    message?: string;
  };

  if (!message || message.trim().length === 0) {
    res.status(400).json({ error: "message is required." });
    return;
  }

  const sid = process.env["TWILIO_ACCOUNT_SID"];
  const token = process.env["TWILIO_AUTH_TOKEN"];
  const from = process.env["TWILIO_WHATSAPP_NUMBER"] ?? "whatsapp:+14155238886";
  if (!sid || !token) { res.status(500).json({ error: "Twilio not configured." }); return; }

  const cols = {
    id: membersTable.id,
    firstName: membersTable.firstName,
    displayName: membersTable.displayName,
    whatsappNumber: membersTable.whatsappNumber,
  };

  let members: Array<{ id: number; firstName: string | null; displayName: string; whatsappNumber: string }> = [];

  if (memberIds && memberIds.length > 0) {
    members = await db.select(cols).from(membersTable).where(inArray(membersTable.id, memberIds));
  } else if (filter !== undefined) {
    const where = buildWhere(filter.status, filter.sourceBatch);
    members = await db.select(cols).from(membersTable).where(where);
  } else {
    res.status(400).json({ error: "Provide filter or memberIds." });
    return;
  }

  const valid = members.filter((m) => m.whatsappNumber);

  if (valid.length === 0) {
    res.json({ ok: true, queued: false, sent: 0, failed: 0, total: 0, results: [] });
    return;
  }

  // Large sends — fire and forget, return a job ID immediately
  if (valid.length > 50) {
    const jobId = randomUUID();
    const job: BroadcastJob = {
      id: jobId,
      total: valid.length,
      sent: 0,
      failed: 0,
      done: false,
      startedAt: new Date().toISOString(),
      errors: [],
    };
    jobs.set(jobId, job);
    setTimeout(() => jobs.delete(jobId), 4 * 60 * 60 * 1000);

    res.json({ ok: true, queued: true, total: valid.length, jobId });

    (async () => {
      const client = twilio(sid, token);
      for (const member of valid) {
        try {
          const body = message.trim().replace(/\{name\}/gi, member.firstName ?? member.displayName);
          await client.messages.create({ from, to: member.whatsappNumber, body });
          job.sent++;
        } catch (err) {
          job.failed++;
          if (job.errors.length < 50) job.errors.push({ name: member.displayName, error: String(err) });
        }
        await new Promise((r) => setTimeout(r, 80));
      }
      job.done = true;
    })();
    return;
  }

  // Small sends — synchronous, full results
  const client = twilio(sid, token);
  const results: { id: number; name: string; status: "sent" | "failed"; error?: string }[] = [];
  for (const member of valid) {
    try {
      const body = message.trim().replace(/\{name\}/gi, member.firstName ?? member.displayName);
      await client.messages.create({ from, to: member.whatsappNumber, body });
      results.push({ id: member.id, name: member.displayName, status: "sent" });
    } catch (err) {
      results.push({ id: member.id, name: member.displayName, status: "failed", error: String(err) });
    }
    await new Promise((r) => setTimeout(r, 80));
  }

  const sent = results.filter((r) => r.status === "sent").length;
  const failed = results.filter((r) => r.status === "failed").length;
  res.json({ ok: true, queued: false, sent, failed, total: results.length, results });
});

export default router;
