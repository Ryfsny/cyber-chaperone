/**
 * Broadcast queue — sub-national admins submit, national approves/rejects/sends.
 *
 * POST   /api/broadcast-queue          — submit a queued broadcast (any admin)
 * GET    /api/broadcast-queue          — list queue items (national sees all; others see own)
 * PATCH  /api/broadcast-queue/:id/approve — national approves and triggers send
 * PATCH  /api/broadcast-queue/:id/reject  — national rejects with reason
 *
 * NOTE: broadcast_queue table may not exist in production until the production DB
 * is unfrozen and Replit's schema migration is allowed to run. All handlers
 * gracefully return empty/error responses rather than crashing.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { db, broadcastQueueTable, membersTable } from "@workspace/db";
import { eq, desc, ilike, sql, and } from "drizzle-orm";
import { isNationalAdmin, getAdminScope } from "../middleware/require-auth.js";
import twilio from "twilio";
import nodemailer from "nodemailer";

const router: IRouter = Router();

const GMAIL_USER = process.env["GMAIL_USER"] ?? "";
const GMAIL_PASS = process.env["GMAIL_APP_PASSWORD"] ?? "";
const OPERATOR_WA = process.env["TWILIO_WHATSAPP_NUMBER"] ?? "whatsapp:+14155238886";

function isMissingTable(err: unknown): boolean {
  return String(err).includes("relation") || String(err).includes("does not exist") || String(err).includes("42P01");
}

// ── POST /api/broadcast-queue ─────────────────────────────────────────────────
router.post("/broadcast-queue", async (req: Request, res: Response): Promise<void> => {
  const { subject, message, channels } = req.body as {
    subject?: string; message?: string; channels?: string[];
  };

  if (!message?.trim() || !Array.isArray(channels) || channels.length === 0) {
    res.status(400).json({ error: "message and channels[] are required." });
    return;
  }

  const adminId = req.session.adminId ?? 0;
  const adminDisplayName = req.session.adminDisplayName ?? "National Admin";
  const scope = getAdminScope(req);

  const scopeParts: string[] = [];
  if (scope?.province) scopeParts.push(scope.province);
  if (scope?.city) scopeParts.push(scope.city);
  if (scope?.suburb) scopeParts.push(scope.suburb);
  if (scope?.street) scopeParts.push(scope.street);
  const scopeLabel = scopeParts.length > 0 ? scopeParts.join(" > ") : "National";

  try {
    const conditions: ReturnType<typeof ilike>[] = [];
    if (scope?.province) conditions.push(ilike(membersTable.province, scope.province));
    if (scope?.city)     conditions.push(ilike(membersTable.city, `%${scope.city}%`));
    if (scope?.suburb)   conditions.push(ilike(membersTable.suburb, `%${scope.suburb}%`));

    const countWhere = conditions.length > 0
      ? conditions.reduce((a, b) => sql`${a} AND ${b}` as unknown as ReturnType<typeof ilike>)
      : undefined;

    const [countRes] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(membersTable)
      .where(countWhere as Parameters<typeof db.select>[0] | undefined);
    const recipientCount = Number(countRes?.n ?? 0);

    if (isNationalAdmin(req)) {
      await sendBroadcast({
        province: null, city: null, suburb: null,
        subject: subject ?? "eblockwatch Update",
        message: message.trim(),
        channels,
      });
      res.json({ ok: true, sent: true, recipientCount });
      return;
    }

    const [item] = await db.insert(broadcastQueueTable).values({
      submittedBy: adminId,
      submitterName: adminDisplayName,
      scope: scopeLabel,
      province: scope?.province ?? null,
      city: scope?.city ?? null,
      suburb: scope?.suburb ?? null,
      subject: subject ?? "eblockwatch Update",
      message: message.trim(),
      channels: channels as unknown as typeof broadcastQueueTable.$inferInsert["channels"],
      recipientCount,
      status: "pending",
    }).returning();

    res.status(201).json({ ok: true, queued: true, item });
  } catch (err) {
    if (isMissingTable(err)) {
      res.status(503).json({ error: "Approval queue not yet available in this environment. Please contact the national admin." });
    } else {
      res.status(500).json({ error: String(err) });
    }
  }
});

// ── GET /api/broadcast-queue ──────────────────────────────────────────────────
router.get("/broadcast-queue", async (req: Request, res: Response): Promise<void> => {
  const adminId = req.session.adminId ?? 0;
  try {
    const items = isNationalAdmin(req)
      ? await db.select().from(broadcastQueueTable).orderBy(desc(broadcastQueueTable.createdAt)).limit(100)
      : await db.select().from(broadcastQueueTable)
          .where(eq(broadcastQueueTable.submittedBy, adminId))
          .orderBy(desc(broadcastQueueTable.createdAt)).limit(50);
    res.json(items);
  } catch (err) {
    if (isMissingTable(err)) {
      res.json([]); // Gracefully return empty queue until tables are migrated
    } else {
      res.status(500).json({ error: String(err) });
    }
  }
});

// ── PATCH /api/broadcast-queue/:id/approve ────────────────────────────────────
router.patch("/broadcast-queue/:id/approve", async (req: Request, res: Response): Promise<void> => {
  if (!isNationalAdmin(req)) {
    res.status(403).json({ error: "National admin access required." });
    return;
  }
  try {
    const id = parseInt(req.params.id, 10);
    const [item] = await db.select().from(broadcastQueueTable).where(eq(broadcastQueueTable.id, id));
    if (!item) { res.status(404).json({ error: "Not found" }); return; }
    if (item.status !== "pending") { res.status(409).json({ error: `Already ${item.status}` }); return; }

    await db.update(broadcastQueueTable).set({
      status: "approved",
      approvedBy: req.session.adminId ?? 0,
      approvedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(broadcastQueueTable.id, id));

    try {
      const channels = item.channels as string[];
      await sendBroadcast({
        province: item.province,
        city: item.city,
        suburb: item.suburb,
        subject: item.subject,
        message: item.message,
        channels,
      });
      await db.update(broadcastQueueTable).set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
        .where(eq(broadcastQueueTable.id, id));
      res.json({ ok: true, sent: true });
    } catch (sendErr) {
      await db.update(broadcastQueueTable).set({ status: "approved", updatedAt: new Date() })
        .where(eq(broadcastQueueTable.id, id));
      res.status(500).json({ error: `Send failed: ${String(sendErr)}` });
    }
  } catch (err) {
    if (isMissingTable(err)) {
      res.status(503).json({ error: "Queue table not yet available in production." });
    } else {
      res.status(500).json({ error: String(err) });
    }
  }
});

// ── PATCH /api/broadcast-queue/:id/reject ─────────────────────────────────────
router.patch("/broadcast-queue/:id/reject", async (req: Request, res: Response): Promise<void> => {
  if (!isNationalAdmin(req)) {
    res.status(403).json({ error: "National admin access required." });
    return;
  }
  try {
    const id = parseInt(req.params.id, 10);
    const { reason } = req.body as { reason?: string };

    const [item] = await db.select().from(broadcastQueueTable).where(eq(broadcastQueueTable.id, id));
    if (!item) { res.status(404).json({ error: "Not found" }); return; }
    if (item.status !== "pending") { res.status(409).json({ error: `Already ${item.status}` }); return; }

    await db.update(broadcastQueueTable).set({
      status: "rejected",
      rejectedReason: reason?.trim() ?? null,
      updatedAt: new Date(),
    }).where(eq(broadcastQueueTable.id, id));

    res.json({ ok: true });
  } catch (err) {
    if (isMissingTable(err)) {
      res.status(503).json({ error: "Queue table not yet available in production." });
    } else {
      res.status(500).json({ error: String(err) });
    }
  }
});

// ── Internal: send a broadcast to a scoped set of members ────────────────────
async function sendBroadcast(opts: {
  province: string | null;
  city: string | null;
  suburb: string | null;
  subject: string;
  message: string;
  channels: string[];
}) {
  const { province, city, suburb, subject, message, channels } = opts;

  const conditions: ReturnType<typeof ilike>[] = [];
  if (province) conditions.push(ilike(membersTable.province, province));
  if (city)     conditions.push(ilike(membersTable.city, `%${city}%`));
  if (suburb)   conditions.push(ilike(membersTable.suburb, `%${suburb}%`));

  const where = conditions.length > 0
    ? conditions.reduce((a, b) => sql`${a} AND ${b}` as unknown as ReturnType<typeof ilike>)
    : undefined;

  const members = await db
    .select({
      whatsappNumber: membersTable.whatsappNumber,
      email: membersTable.email,
      mobile: membersTable.mobile,
    })
    .from(membersTable)
    .where(where as Parameters<typeof db.select>[0] | undefined)
    .limit(5000);

  const twilioSid   = process.env["TWILIO_ACCOUNT_SID"];
  const twilioToken = process.env["TWILIO_AUTH_TOKEN"];
  const twilioClient = twilioSid && twilioToken ? twilio(twilioSid, twilioToken) : null;

  const htmlBody = buildHtmlEmail(subject, message);

  for (const member of members) {
    if (channels.includes("whatsapp") && member.whatsappNumber?.startsWith("whatsapp:")) {
      try {
        await twilioClient?.messages.create({ from: OPERATOR_WA, to: member.whatsappNumber, body: message });
      } catch (_) { /* skip individual failure */ }
    }
    if (channels.includes("sms") && member.mobile) {
      try {
        const smsFrom = process.env["TWILIO_SMS_NUMBER"] ?? OPERATOR_WA.replace("whatsapp:", "");
        const toMobile = member.mobile.startsWith("+") ? member.mobile : `+${member.mobile}`;
        await twilioClient?.messages.create({ from: smsFrom, to: toMobile, body: message });
      } catch (_) { /* skip */ }
    }
    if (channels.includes("email") && member.email && GMAIL_USER && GMAIL_PASS) {
      try {
        const transporter = nodemailer.createTransport({ service: "gmail", auth: { user: GMAIL_USER, pass: GMAIL_PASS } });
        await transporter.sendMail({
          from: `"eblockwatch Cyber Chaperone" <${GMAIL_USER}>`,
          to: member.email,
          subject,
          text: message,
          html: htmlBody,
        });
      } catch (_) { /* skip */ }
    }
  }
}

function buildHtmlEmail(subject: string, body: string): string {
  const paragraphs = body.split("\n\n")
    .map((p) => `<p style="margin:0 0 14px;color:#1e293b;font-size:14px;line-height:1.7;font-family:Arial,sans-serif;">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;">
  <div style="background:#1a1f2e;padding:24px 36px;">
    <div style="color:#22c55e;font-size:18px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">eblockwatch</div>
    <div style="color:#6b7280;font-size:10px;letter-spacing:2px;margin-top:3px;text-transform:uppercase;">${subject}</div>
  </div>
  <div style="height:3px;background:linear-gradient(90deg,#16a34a,#22c55e,#16a34a);"></div>
  <div style="padding:28px 36px 20px;">${paragraphs}</div>
  <div style="background:#1a1f2e;padding:16px 36px;text-align:center;">
    <div style="color:#374151;font-size:10px;letter-spacing:1px;text-transform:uppercase;">eblockwatch · Cyber Chaperone · South Africa</div>
  </div>
</div></body></html>`;
}

export default router;
