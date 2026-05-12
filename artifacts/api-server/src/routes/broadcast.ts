import { Router, type IRouter, type Request, type Response } from "express";
import { db, membersTable } from "@workspace/db";
import { inArray, eq, or, sql, ilike } from "drizzle-orm";
import twilio from "twilio";
import nodemailer from "nodemailer";
import { randomUUID } from "node:crypto";

const router: IRouter = Router();

// ── Types ───────────────────────────────────────────────────────────────────

interface BroadcastJob {
  id: string;
  channel: "whatsapp" | "email" | "sms";
  total: number;
  sent: number;
  failed: number;
  done: boolean;
  startedAt: string;
  errors: Array<{ name: string; error: string }>;
}

const jobs = new Map<string, BroadcastJob>();

// ── Helpers ─────────────────────────────────────────────────────────────────

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

/** Adds a capability requirement (has_email or has_mobile) on top of existing filter */
function addCapability(base: ReturnType<typeof buildWhere>, cap: "email" | "mobile") {
  const capFilter = cap === "email"
    ? sql`email IS NOT NULL AND email != ''` as unknown as ReturnType<typeof eq>
    : sql`mobile IS NOT NULL AND mobile != ''` as unknown as ReturnType<typeof eq>;
  if (!base) return capFilter;
  return sql`${base} AND ${capFilter}` as unknown as ReturnType<typeof eq>;
}

function makeEmailTransporter() {
  const user = process.env["GMAIL_USER"] ?? "";
  const pass = process.env["GMAIL_APP_PASSWORD"] ?? "";
  if (!user || !pass) return null;
  return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
}

function normalisePhone(raw: string): string {
  // Convert SA-style 0XXXXXXXXX → +27XXXXXXXXX
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("27") && digits.length === 11) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+27${digits.slice(1)}`;
  if (digits.startsWith("+")) return raw.trim();
  return `+${digits}`;
}

function textToHtml(text: string): string {
  const paragraphs = text.split(/\n{2,}/);
  return paragraphs
    .map((p) =>
      `<p style="margin:0 0 16px;color:#1a2744;font-size:15px;line-height:1.7;">${p
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\*([^*]+)\*/g, "<strong>$1</strong>")
        .replace(/\n/g, "<br>")}</p>`
    )
    .join("");
}

function buildEmailHtml(firstName: string, body: string): string {
  const personalised = body.replace(/\{name\}/gi, firstName);
  const htmlBody = textToHtml(personalised);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px 0;background:#f0eeea;font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:600px;margin:0 auto;">
  <div style="background:#1a2744;padding:24px 32px;">
    <div style="color:#e8a020;font-size:20px;font-weight:bold;letter-spacing:2px;">eblockwatch</div>
    <div style="color:#8a9ab8;font-size:12px;margin-top:4px;">Cyber Chaperone Safety Network</div>
  </div>
  <div style="background:#ffffff;padding:32px 32px 16px;">${htmlBody}</div>
  <div style="background:#f8f6f2;padding:16px 32px;border-top:1px solid #e8e4de;">
    <p style="color:#aaa;font-size:11px;margin:0;text-align:center;line-height:1.6;">
      eblockwatch — Cyber Chaperone — South Africa<br>
      You're receiving this as an eblockwatch member. Reply to this email to contact us.
    </p>
  </div>
</div>
</body></html>`;
}

function makeJob(channel: BroadcastJob["channel"], total: number): BroadcastJob {
  const id = randomUUID();
  const job: BroadcastJob = { id, channel, total, sent: 0, failed: 0, done: false, startedAt: new Date().toISOString(), errors: [] };
  jobs.set(id, job);
  setTimeout(() => jobs.delete(id), 4 * 60 * 60 * 1000);
  return job;
}

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /api/broadcast/counts — audience counts for all three channels
router.get("/broadcast/counts", async (_req: Request, res: Response): Promise<void> => {
  const hasEmail = sql`email IS NOT NULL AND email != ''` as unknown as ReturnType<typeof eq>;
  const hasMobile = sql`mobile IS NOT NULL AND mobile != ''` as unknown as ReturnType<typeof eq>;
  const isActive = eq(membersTable.memberStatus, "active");
  const isVerified = eq(membersTable.memberStatus, "verified");
  const isKnown = or(isActive, isVerified) as ReturnType<typeof eq>;

  const [
    totalRes, activeRes, verifiedRes, knownRes, sourceRes,
    emailTotalRes, emailActiveRes, emailVerifiedRes, emailKnownRes,
    smsTotalRes, smsActiveRes, smsVerifiedRes, smsKnownRes,
  ] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(membersTable),
    db.select({ n: sql<number>`count(*)::int` }).from(membersTable).where(isActive),
    db.select({ n: sql<number>`count(*)::int` }).from(membersTable).where(isVerified),
    db.select({ n: sql<number>`count(*)::int` }).from(membersTable).where(isKnown),
    db.select({ source: membersTable.sourceBatch, n: sql<number>`count(*)::int` })
      .from(membersTable).groupBy(membersTable.sourceBatch).orderBy(sql`count(*) DESC`),
    db.select({ n: sql<number>`count(*)::int` }).from(membersTable).where(hasEmail),
    db.select({ n: sql<number>`count(*)::int` }).from(membersTable).where(sql`${isActive} AND ${hasEmail}` as unknown as ReturnType<typeof eq>),
    db.select({ n: sql<number>`count(*)::int` }).from(membersTable).where(sql`${isVerified} AND ${hasEmail}` as unknown as ReturnType<typeof eq>),
    db.select({ n: sql<number>`count(*)::int` }).from(membersTable).where(sql`${isKnown} AND ${hasEmail}` as unknown as ReturnType<typeof eq>),
    db.select({ n: sql<number>`count(*)::int` }).from(membersTable).where(hasMobile),
    db.select({ n: sql<number>`count(*)::int` }).from(membersTable).where(sql`${isActive} AND ${hasMobile}` as unknown as ReturnType<typeof eq>),
    db.select({ n: sql<number>`count(*)::int` }).from(membersTable).where(sql`${isVerified} AND ${hasMobile}` as unknown as ReturnType<typeof eq>),
    db.select({ n: sql<number>`count(*)::int` }).from(membersTable).where(sql`${isKnown} AND ${hasMobile}` as unknown as ReturnType<typeof eq>),
  ]);

  res.json({
    total: totalRes[0]?.n ?? 0,
    active: activeRes[0]?.n ?? 0,
    verified: verifiedRes[0]?.n ?? 0,
    known: knownRes[0]?.n ?? 0,
    bySource: sourceRes.map((s) => ({ source: s.source, count: s.n })),
    email: {
      total: emailTotalRes[0]?.n ?? 0,
      active: emailActiveRes[0]?.n ?? 0,
      verified: emailVerifiedRes[0]?.n ?? 0,
      known: emailKnownRes[0]?.n ?? 0,
    },
    sms: {
      total: smsTotalRes[0]?.n ?? 0,
      active: smsActiveRes[0]?.n ?? 0,
      verified: smsVerifiedRes[0]?.n ?? 0,
      known: smsKnownRes[0]?.n ?? 0,
    },
  });
});

// GET /api/broadcast/job/:id — poll progress
router.get("/broadcast/job/:id", (req: Request, res: Response): void => {
  const job = jobs.get(req.params.id as string);
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  res.json(job);
});

// ── POST /api/broadcast — WhatsApp ───────────────────────────────────────────
router.post("/broadcast", async (req: Request, res: Response): Promise<void> => {
  const { filter, memberIds, message } = req.body as {
    filter?: { status?: string; sourceBatch?: string };
    memberIds?: number[];
    message?: string;
  };
  if (!message || message.trim().length === 0) { res.status(400).json({ error: "message is required." }); return; }

  const sid = process.env["TWILIO_ACCOUNT_SID"];
  const token = process.env["TWILIO_AUTH_TOKEN"];
  const from = process.env["TWILIO_WHATSAPP_NUMBER"] ?? "whatsapp:+14155238886";
  if (!sid || !token) { res.status(500).json({ error: "Twilio not configured." }); return; }

  const cols = { id: membersTable.id, firstName: membersTable.firstName, displayName: membersTable.displayName, whatsappNumber: membersTable.whatsappNumber };
  let members: Array<{ id: number; firstName: string | null; displayName: string; whatsappNumber: string }> = [];
  if (memberIds && memberIds.length > 0) {
    members = await db.select(cols).from(membersTable).where(inArray(membersTable.id, memberIds));
  } else if (filter !== undefined) {
    const where = buildWhere(filter.status, filter.sourceBatch);
    members = await db.select(cols).from(membersTable).where(where);
  } else {
    res.status(400).json({ error: "Provide filter or memberIds." }); return;
  }

  const valid = members.filter((m) => m.whatsappNumber);
  if (valid.length === 0) { res.json({ ok: true, queued: false, sent: 0, failed: 0, total: 0, results: [] }); return; }

  if (valid.length > 50) {
    const job = makeJob("whatsapp", valid.length);
    res.json({ ok: true, queued: true, total: valid.length, jobId: job.id });
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

// ── POST /api/broadcast/email ─────────────────────────────────────────────────
router.post("/broadcast/email", async (req: Request, res: Response): Promise<void> => {
  const { filter, memberIds, subject, message } = req.body as {
    filter?: { status?: string; sourceBatch?: string };
    memberIds?: number[];
    subject?: string;
    message?: string;
  };
  if (!message || message.trim().length === 0) { res.status(400).json({ error: "message is required." }); return; }
  if (!subject || subject.trim().length === 0) { res.status(400).json({ error: "subject is required." }); return; }

  const t = makeEmailTransporter();
  const gmailUser = process.env["GMAIL_USER"] ?? "";
  if (!t || !gmailUser) { res.status(500).json({ error: "Gmail not configured." }); return; }

  const cols = { id: membersTable.id, firstName: membersTable.firstName, displayName: membersTable.displayName, email: membersTable.email };
  let members: Array<{ id: number; firstName: string | null; displayName: string; email: string | null }> = [];
  if (memberIds && memberIds.length > 0) {
    members = await db.select(cols).from(membersTable).where(inArray(membersTable.id, memberIds));
  } else if (filter !== undefined) {
    const base = buildWhere(filter.status, filter.sourceBatch);
    const where = addCapability(base, "email");
    members = await db.select(cols).from(membersTable).where(where);
  } else {
    res.status(400).json({ error: "Provide filter or memberIds." }); return;
  }

  const valid = members.filter((m) => m.email && m.email.trim() !== "");
  if (valid.length === 0) { res.json({ ok: true, queued: false, sent: 0, failed: 0, total: 0, results: [] }); return; }

  if (valid.length > 30) {
    const job = makeJob("email", valid.length);
    res.json({ ok: true, queued: true, total: valid.length, jobId: job.id });
    (async () => {
      for (const member of valid) {
        const firstName = member.firstName ?? member.displayName.split(" ")[0] ?? "Member";
        const subj = subject.trim().replace(/\{name\}/gi, firstName);
        try {
          await t.sendMail({
            from: `"eblockwatch" <${gmailUser}>`,
            to: member.email!,
            subject: subj,
            html: buildEmailHtml(firstName, message.trim()),
            text: message.trim().replace(/\{name\}/gi, firstName),
          });
          job.sent++;
        } catch (err) {
          job.failed++;
          if (job.errors.length < 50) job.errors.push({ name: member.displayName, error: String(err) });
        }
        await new Promise((r) => setTimeout(r, 200));
      }
      job.done = true;
    })();
    return;
  }

  const results: { id: number; name: string; status: "sent" | "failed"; error?: string }[] = [];
  for (const member of valid) {
    const firstName = member.firstName ?? member.displayName.split(" ")[0] ?? "Member";
    const subj = subject.trim().replace(/\{name\}/gi, firstName);
    try {
      await t.sendMail({
        from: `"eblockwatch" <${gmailUser}>`,
        to: member.email!,
        subject: subj,
        html: buildEmailHtml(firstName, message.trim()),
        text: message.trim().replace(/\{name\}/gi, firstName),
      });
      results.push({ id: member.id, name: member.displayName, status: "sent" });
    } catch (err) {
      results.push({ id: member.id, name: member.displayName, status: "failed", error: String(err) });
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  const sent = results.filter((r) => r.status === "sent").length;
  const failed = results.filter((r) => r.status === "failed").length;
  res.json({ ok: true, queued: false, sent, failed, total: results.length, results });
});

// ── POST /api/broadcast/sms ──────────────────────────────────────────────────
router.post("/broadcast/sms", async (req: Request, res: Response): Promise<void> => {
  const { filter, memberIds, message } = req.body as {
    filter?: { status?: string; sourceBatch?: string };
    memberIds?: number[];
    message?: string;
  };
  if (!message || message.trim().length === 0) { res.status(400).json({ error: "message is required." }); return; }

  const sid = process.env["TWILIO_ACCOUNT_SID"];
  const token = process.env["TWILIO_AUTH_TOKEN"];
  const from = process.env["TWILIO_SMS_NUMBER"] ?? "+13158200999";
  if (!sid || !token) { res.status(500).json({ error: "Twilio not configured." }); return; }

  const cols = { id: membersTable.id, firstName: membersTable.firstName, displayName: membersTable.displayName, mobile: membersTable.mobile };
  let members: Array<{ id: number; firstName: string | null; displayName: string; mobile: string | null }> = [];
  if (memberIds && memberIds.length > 0) {
    members = await db.select(cols).from(membersTable).where(inArray(membersTable.id, memberIds));
  } else if (filter !== undefined) {
    const base = buildWhere(filter.status, filter.sourceBatch);
    const where = addCapability(base, "mobile");
    members = await db.select(cols).from(membersTable).where(where);
  } else {
    res.status(400).json({ error: "Provide filter or memberIds." }); return;
  }

  const valid = members.filter((m) => m.mobile && m.mobile.trim() !== "");
  if (valid.length === 0) { res.json({ ok: true, queued: false, sent: 0, failed: 0, total: 0, results: [] }); return; }

  if (valid.length > 50) {
    const job = makeJob("sms", valid.length);
    res.json({ ok: true, queued: true, total: valid.length, jobId: job.id });
    (async () => {
      const client = twilio(sid, token);
      for (const member of valid) {
        try {
          const body = message.trim().replace(/\{name\}/gi, member.firstName ?? member.displayName);
          const to = normalisePhone(member.mobile!);
          await client.messages.create({ from, to, body });
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

  const client = twilio(sid, token);
  const results: { id: number; name: string; status: "sent" | "failed"; error?: string }[] = [];
  for (const member of valid) {
    try {
      const body = message.trim().replace(/\{name\}/gi, member.firstName ?? member.displayName);
      const to = normalisePhone(member.mobile!);
      await client.messages.create({ from, to, body });
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
