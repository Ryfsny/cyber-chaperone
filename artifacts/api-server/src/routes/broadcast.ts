import { Router, type IRouter, type Request, type Response } from "express";
import { db, membersTable } from "@workspace/db";
import { inArray, eq, or, sql, ilike } from "drizzle-orm";
import twilio from "twilio";
import nodemailer from "nodemailer";
import { randomUUID } from "node:crypto";

const router: IRouter = Router();

// ── Types ────────────────────────────────────────────────────────────────────

interface BroadcastFilter {
  status?: string;
  sourceBatch?: string;
  province?: string;
  tier?: string;
  search?: string;
}

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

// ── Where builder ─────────────────────────────────────────────────────────────

type DrizzleCondition = ReturnType<typeof eq>;

function buildWhere(f: BroadcastFilter): DrizzleCondition | undefined {
  const parts: DrizzleCondition[] = [];

  if (f.status === "active")   parts.push(eq(membersTable.memberStatus, "active"));
  else if (f.status === "verified") parts.push(eq(membersTable.memberStatus, "verified"));
  else if (f.status === "known")
    parts.push(or(eq(membersTable.memberStatus, "active"), eq(membersTable.memberStatus, "verified")) as DrizzleCondition);

  if (f.sourceBatch === "none")
    parts.push(sql`source_batch IS NULL` as unknown as DrizzleCondition);
  else if (f.sourceBatch)
    parts.push(ilike(membersTable.sourceBatch, f.sourceBatch) as unknown as DrizzleCondition);

  if (f.province)
    parts.push(ilike(membersTable.province, f.province) as unknown as DrizzleCondition);

  if (f.tier === "individual")
    parts.push(ilike(membersTable.membershipTier, "individual") as unknown as DrizzleCondition);
  else if (f.tier === "family")
    parts.push(ilike(membersTable.membershipTier, "family") as unknown as DrizzleCondition);

  if (f.search) {
    const like = `%${f.search}%`;
    parts.push(or(
      ilike(membersTable.displayName, like),
      ilike(membersTable.firstName, like),
      ilike(membersTable.lastName, like),
      ilike(membersTable.email, like),
      ilike(membersTable.suburb, like),
      ilike(membersTable.city, like),
    ) as unknown as DrizzleCondition);
  }

  if (parts.length === 0) return undefined;
  if (parts.length === 1) return parts[0];
  return parts.reduce((a, b) => sql`${a} AND ${b}` as unknown as DrizzleCondition);
}

function addCapability(base: DrizzleCondition | undefined, cap: "email" | "mobile"): DrizzleCondition | undefined {
  const capFilter = cap === "email"
    ? sql`email IS NOT NULL AND email != ''` as unknown as DrizzleCondition
    : sql`mobile IS NOT NULL AND mobile != ''` as unknown as DrizzleCondition;
  if (!base) return capFilter;
  return sql`${base} AND ${capFilter}` as unknown as DrizzleCondition;
}

// ── Email helpers ─────────────────────────────────────────────────────────────

function makeEmailTransporter() {
  const user = process.env["GMAIL_USER"] ?? "";
  const pass = process.env["GMAIL_APP_PASSWORD"] ?? "";
  if (!user || !pass) return null;
  return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
}

function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("27") && digits.length === 11) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+27${digits.slice(1)}`;
  if (raw.trim().startsWith("+")) return raw.trim();
  return `+${digits}`;
}

/** Convert plain text body → HTML paragraphs, bold (*x*), CTA buttons ([BUTTON: text | url]) */
function textToHtml(text: string): string {
  const paragraphs = text.split(/\n{2,}/);
  return paragraphs.map((p) => {
    const trimmed = p.trim();
    // CTA button syntax: [BUTTON: Label | https://...]
    const btnMatch = trimmed.match(/^\[BUTTON:\s*(.+?)\s*\|\s*(https?:\/\/.+?)\s*\]$/i);
    if (btnMatch) {
      return `<p style="margin:24px 0;text-align:left;">
        <a href="${btnMatch[2]}" target="_blank" rel="noopener"
          style="display:inline-block;background:#c9a227;color:#0a0a0a;text-decoration:none;font-size:14px;font-weight:bold;letter-spacing:1px;padding:14px 32px;font-family:Arial,sans-serif;border:2px solid #c9a227;">
          ${btnMatch[1]}
        </a>
      </p>`;
    }
    // Horizontal rule
    if (trimmed === "---") return `<hr style="border:none;border-top:1px solid #e8e4de;margin:24px 0;">`;
    // Normal paragraph
    const html = trimmed
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\*([^*]+)\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br>");
    return `<p style="margin:0 0 18px;color:#1a1a1a;font-size:16px;line-height:1.75;font-family:Georgia,'Times New Roman',serif;">${html}</p>`;
  }).join("");
}

function buildEmailHtml(firstName: string, subject: string, body: string): string {
  const personalised = body.replace(/\{name\}/gi, firstName);
  const subjectLine  = subject.replace(/\{name\}/gi, firstName);
  const htmlBody = textToHtml(personalised);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${subjectLine}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;-webkit-text-size-adjust:100%;">

<!-- Preheader (hidden) -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#f1f5f9;">
  From Andre Snyman · eblockwatch · South Africa's trusted safety network since 2001.
</div>

<div style="max-width:620px;margin:0 auto;background:#ffffff;">

  <!-- Header -->
  <div style="background:#1a1f2e;padding:36px 48px;text-align:center;">
    <img src="https://cdn.prod.website-files.com/674e83f56d9eb778ff7b9bab/675120eee8a345677c7ddb1d_E-Block%20Watch%20logo.avif"
      alt="eblockwatch" width="160" style="display:block;margin:0 auto;max-width:160px;" />
    <div style="color:#9ca3af;font-size:10px;letter-spacing:3px;margin-top:14px;text-transform:uppercase;">
      Cyber Chaperone &nbsp;·&nbsp; Est. 2001 &nbsp;·&nbsp; South Africa
    </div>
  </div>

  <!-- Green bar -->
  <div style="height:4px;background:linear-gradient(90deg,#16a34a,#22c55e,#16a34a);"></div>

  <!-- Body -->
  <div style="background:#ffffff;padding:44px 48px 32px;color:#1e293b;font-size:15px;line-height:1.7;">
    ${htmlBody}
  </div>

  <!-- Signature -->
  <div style="background:#f0fdf4;padding:28px 48px;border-top:3px solid #22c55e;">
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
      <tr>
        <td style="width:60px;vertical-align:top;">
          <div style="width:52px;height:52px;border-radius:50%;background:#1a1f2e;border:2px solid #22c55e;text-align:center;line-height:52px;">
            <span style="color:#22c55e;font-weight:bold;font-size:20px;font-family:Arial,sans-serif;">A</span>
          </div>
        </td>
        <td style="vertical-align:top;padding-left:16px;">
          <div style="font-weight:bold;color:#1a1f2e;font-size:16px;font-family:Arial,sans-serif;">Andre Snyman</div>
          <div style="color:#475569;font-size:12px;font-family:Arial,sans-serif;margin-top:3px;">Founder · eblockwatch · Cyber Chaperone</div>
          <div style="color:#64748b;font-size:11px;font-family:Arial,sans-serif;margin-top:2px;">+27 82 561 1065 · <a href="mailto:info@eblockwatch.co.za" style="color:#16a34a;text-decoration:none;">info@eblockwatch.co.za</a></div>
        </td>
      </tr>
    </table>
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid #bbf7d0;">
      <p style="color:#64748b;font-size:12px;font-family:Arial,sans-serif;margin:0;font-style:italic;">
        "I started eblockwatch in 2001 with one goal: make sure no South African faces danger alone. 25 years on, that mission hasn't changed."
      </p>
    </div>
  </div>

  <!-- Social CTAs -->
  <div style="background:#1a1f2e;padding:24px 48px;text-align:center;">
    <a href="https://www.facebook.com/eblockwatch" target="_blank" rel="noopener"
      style="display:inline-block;background:#1877f2;color:#ffffff;text-decoration:none;font-size:10px;font-weight:bold;letter-spacing:2px;padding:10px 18px;margin:4px;font-family:Arial,sans-serif;text-transform:uppercase;border-radius:4px;">Facebook</a>
    <a href="https://www.instagram.com/eblockwatch" target="_blank" rel="noopener"
      style="display:inline-block;background:#e1306c;color:#ffffff;text-decoration:none;font-size:10px;font-weight:bold;letter-spacing:2px;padding:10px 18px;margin:4px;font-family:Arial,sans-serif;text-transform:uppercase;border-radius:4px;">Instagram</a>
    <a href="https://eblockwatch.co.za" target="_blank" rel="noopener"
      style="display:inline-block;background:#22c55e;color:#ffffff;text-decoration:none;font-size:10px;font-weight:bold;letter-spacing:2px;padding:10px 18px;margin:4px;font-family:Arial,sans-serif;text-transform:uppercase;border-radius:4px;">Website</a>
    <a href="https://cyber-chaperone-r--ryfsny.replit.app/website/" target="_blank" rel="noopener"
      style="display:inline-block;background:#22c55e;color:#ffffff;text-decoration:none;font-size:10px;font-weight:bold;letter-spacing:2px;padding:10px 18px;margin:4px;font-family:Arial,sans-serif;text-transform:uppercase;border-radius:4px;">Member Portal</a>
    <a href="https://wa.me/27825611065" target="_blank" rel="noopener"
      style="display:inline-block;background:#25d366;color:#ffffff;text-decoration:none;font-size:10px;font-weight:bold;letter-spacing:2px;padding:10px 18px;margin:4px;font-family:Arial,sans-serif;text-transform:uppercase;border-radius:4px;">WhatsApp</a>
  </div>

  <!-- Footer -->
  <div style="background:#0f172a;padding:18px 48px;text-align:center;">
    <p style="color:#475569;font-size:10px;margin:0;letter-spacing:1px;font-family:Arial,sans-serif;text-transform:uppercase;">
      © 2026 eblockwatch (Pty) Ltd · South Africa · Protecting families since 2001
    </p>
    <p style="color:#334155;font-size:10px;margin:6px 0 0;font-family:Arial,sans-serif;">
      You are receiving this as an eblockwatch member. Reply to unsubscribe.
    </p>
  </div>

</div>
</body>
</html>`;
}

function makeJob(channel: BroadcastJob["channel"], total: number): BroadcastJob {
  const id = randomUUID();
  const job: BroadcastJob = { id, channel, total, sent: 0, failed: 0, done: false, startedAt: new Date().toISOString(), errors: [] };
  jobs.set(id, job);
  setTimeout(() => jobs.delete(id), 4 * 60 * 60 * 1000);
  return job;
}

// ── GET /api/broadcast/geo-stats ──────────────────────────────────────────────
router.get("/broadcast/geo-stats", async (_req: Request, res: Response): Promise<void> => {
  const rows = await db
    .select({
      province: membersTable.province,
      total:    sql<number>`count(*)::int`,
      active:   sql<number>`count(*) filter (where member_status = 'active')::int`,
      verified: sql<number>`count(*) filter (where member_status = 'verified')::int`,
      withEmail: sql<number>`count(*) filter (where email IS NOT NULL AND email != '')::int`,
      withMobile: sql<number>`count(*) filter (where mobile IS NOT NULL AND mobile != '')::int`,
    })
    .from(membersTable)
    .where(sql`province IS NOT NULL AND TRIM(province) != ''` as unknown as ReturnType<typeof eq>)
    .groupBy(membersTable.province)
    .orderBy(sql`count(*) DESC`);

  res.json({ provinces: rows });
});

// ── GET /api/broadcast/member-list ────────────────────────────────────────────
router.get("/broadcast/member-list", async (req: Request, res: Response): Promise<void> => {
  const { status, sourceBatch, province, tier, search, channel } = req.query as Record<string, string>;
  const limit  = Math.min(parseInt(req.query.limit  as string ?? "150", 10), 500);
  const offset = parseInt(req.query.offset as string ?? "0", 10);

  const f: BroadcastFilter = { status, sourceBatch, province, tier, search };
  let where = buildWhere(f);
  if (channel === "email") where = addCapability(where, "email");
  if (channel === "sms")   where = addCapability(where, "mobile");

  const [members, countRes] = await Promise.all([
    db.select({
      id:            membersTable.id,
      displayName:   membersTable.displayName,
      firstName:     membersTable.firstName,
      lastName:      membersTable.lastName,
      email:         membersTable.email,
      mobile:        membersTable.mobile,
      province:      membersTable.province,
      suburb:        membersTable.suburb,
      city:          membersTable.city,
      memberStatus:  membersTable.memberStatus,
      membershipTier: membersTable.membershipTier,
    }).from(membersTable).where(where).limit(limit).offset(offset).orderBy(membersTable.displayName),
    db.select({ n: sql<number>`count(*)::int` }).from(membersTable).where(where),
  ]);

  res.json({ members, total: countRes[0]?.n ?? 0 });
});

// ── GET /api/broadcast/counts ─────────────────────────────────────────────────
router.get("/broadcast/counts", async (_req: Request, res: Response): Promise<void> => {
  const hasEmail  = sql`email IS NOT NULL AND email != ''`  as unknown as DrizzleCondition;
  const hasMobile = sql`mobile IS NOT NULL AND mobile != ''` as unknown as DrizzleCondition;
  const isActive   = eq(membersTable.memberStatus, "active");
  const isVerified = eq(membersTable.memberStatus, "verified");
  const isKnown    = or(isActive, isVerified) as DrizzleCondition;

  const [
    totalRes, activeRes, verifiedRes, knownRes, sourceRes,
    emailTotalRes, emailActiveRes, emailVerifiedRes, emailKnownRes,
    smsTotalRes,  smsActiveRes,  smsVerifiedRes,  smsKnownRes,
  ] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(membersTable),
    db.select({ n: sql<number>`count(*)::int` }).from(membersTable).where(isActive),
    db.select({ n: sql<number>`count(*)::int` }).from(membersTable).where(isVerified),
    db.select({ n: sql<number>`count(*)::int` }).from(membersTable).where(isKnown),
    db.select({ source: membersTable.sourceBatch, n: sql<number>`count(*)::int` })
      .from(membersTable).groupBy(membersTable.sourceBatch).orderBy(sql`count(*) DESC`),
    db.select({ n: sql<number>`count(*)::int` }).from(membersTable).where(hasEmail),
    db.select({ n: sql<number>`count(*)::int` }).from(membersTable).where(sql`${isActive} AND ${hasEmail}` as unknown as DrizzleCondition),
    db.select({ n: sql<number>`count(*)::int` }).from(membersTable).where(sql`${isVerified} AND ${hasEmail}` as unknown as DrizzleCondition),
    db.select({ n: sql<number>`count(*)::int` }).from(membersTable).where(sql`${isKnown} AND ${hasEmail}` as unknown as DrizzleCondition),
    db.select({ n: sql<number>`count(*)::int` }).from(membersTable).where(hasMobile),
    db.select({ n: sql<number>`count(*)::int` }).from(membersTable).where(sql`${isActive} AND ${hasMobile}` as unknown as DrizzleCondition),
    db.select({ n: sql<number>`count(*)::int` }).from(membersTable).where(sql`${isVerified} AND ${hasMobile}` as unknown as DrizzleCondition),
    db.select({ n: sql<number>`count(*)::int` }).from(membersTable).where(sql`${isKnown} AND ${hasMobile}` as unknown as DrizzleCondition),
  ]);

  res.json({
    total:    totalRes[0]?.n    ?? 0,
    active:   activeRes[0]?.n   ?? 0,
    verified: verifiedRes[0]?.n ?? 0,
    known:    knownRes[0]?.n    ?? 0,
    bySource: sourceRes.map((s) => ({ source: s.source, count: s.n })),
    email: { total: emailTotalRes[0]?.n ?? 0, active: emailActiveRes[0]?.n ?? 0, verified: emailVerifiedRes[0]?.n ?? 0, known: emailKnownRes[0]?.n ?? 0 },
    sms:   { total: smsTotalRes[0]?.n  ?? 0, active: smsActiveRes[0]?.n  ?? 0, verified: smsVerifiedRes[0]?.n  ?? 0, known: smsKnownRes[0]?.n  ?? 0 },
  });
});

// ── GET /api/broadcast/job/:id ────────────────────────────────────────────────
router.get("/broadcast/job/:id", (req: Request, res: Response): void => {
  const job = jobs.get(req.params.id as string);
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  res.json(job);
});

// ── POST /api/broadcast (WhatsApp) ────────────────────────────────────────────
router.post("/broadcast", async (req: Request, res: Response): Promise<void> => {
  const { filter, memberIds, message } = req.body as { filter?: BroadcastFilter; memberIds?: number[]; message?: string };
  if (!message?.trim()) { res.status(400).json({ error: "message is required." }); return; }

  const sid   = process.env["TWILIO_ACCOUNT_SID"];
  const token = process.env["TWILIO_AUTH_TOKEN"];
  const from  = process.env["TWILIO_WHATSAPP_NUMBER"] ?? "whatsapp:+14155238886";
  if (!sid || !token) { res.status(500).json({ error: "Twilio not configured." }); return; }

  const cols = { id: membersTable.id, firstName: membersTable.firstName, displayName: membersTable.displayName, whatsappNumber: membersTable.whatsappNumber };
  let members: Array<{ id: number; firstName: string | null; displayName: string; whatsappNumber: string }> = [];
  if (memberIds?.length) members = await db.select(cols).from(membersTable).where(inArray(membersTable.id, memberIds));
  else if (filter !== undefined) members = await db.select(cols).from(membersTable).where(buildWhere(filter));
  else { res.status(400).json({ error: "Provide filter or memberIds." }); return; }

  const valid = members.filter((m) => m.whatsappNumber);
  if (valid.length === 0) { res.json({ ok: true, queued: false, sent: 0, failed: 0, total: 0, results: [] }); return; }

  if (valid.length > 50) {
    const job = makeJob("whatsapp", valid.length);
    res.json({ ok: true, queued: true, total: valid.length, jobId: job.id });
    (async () => {
      const client = twilio(sid, token);
      for (const m of valid) {
        try { await client.messages.create({ from, to: m.whatsappNumber, body: message.trim().replace(/\{name\}/gi, m.firstName ?? m.displayName) }); job.sent++; }
        catch (err) { job.failed++; if (job.errors.length < 50) job.errors.push({ name: m.displayName, error: String(err) }); }
        await new Promise((r) => setTimeout(r, 80));
      }
      job.done = true;
    })();
    return;
  }

  const client = twilio(sid, token);
  const results: { id: number; name: string; status: "sent" | "failed"; error?: string }[] = [];
  for (const m of valid) {
    try { await client.messages.create({ from, to: m.whatsappNumber, body: message.trim().replace(/\{name\}/gi, m.firstName ?? m.displayName) }); results.push({ id: m.id, name: m.displayName, status: "sent" }); }
    catch (err) { results.push({ id: m.id, name: m.displayName, status: "failed", error: String(err) }); }
    await new Promise((r) => setTimeout(r, 80));
  }
  res.json({ ok: true, queued: false, sent: results.filter((r) => r.status === "sent").length, failed: results.filter((r) => r.status === "failed").length, total: results.length, results });
});

// ── POST /api/broadcast/email ─────────────────────────────────────────────────
router.post("/broadcast/email", async (req: Request, res: Response): Promise<void> => {
  const { filter, memberIds, subject, message } = req.body as { filter?: BroadcastFilter; memberIds?: number[]; subject?: string; message?: string };
  if (!message?.trim()) { res.status(400).json({ error: "message is required." }); return; }
  if (!subject?.trim()) { res.status(400).json({ error: "subject is required." }); return; }

  const t = makeEmailTransporter();
  const gmailUser = process.env["GMAIL_USER"] ?? "";
  if (!t || !gmailUser) { res.status(500).json({ error: "Gmail not configured." }); return; }

  const cols = { id: membersTable.id, firstName: membersTable.firstName, displayName: membersTable.displayName, email: membersTable.email };
  let members: Array<{ id: number; firstName: string | null; displayName: string; email: string | null }> = [];
  if (memberIds?.length) members = await db.select(cols).from(membersTable).where(inArray(membersTable.id, memberIds));
  else if (filter !== undefined) members = await db.select(cols).from(membersTable).where(addCapability(buildWhere(filter), "email"));
  else { res.status(400).json({ error: "Provide filter or memberIds." }); return; }

  const valid = members.filter((m) => m.email?.trim());
  if (valid.length === 0) { res.json({ ok: true, queued: false, sent: 0, failed: 0, total: 0, results: [] }); return; }

  if (valid.length > 30) {
    const job = makeJob("email", valid.length);
    res.json({ ok: true, queued: true, total: valid.length, jobId: job.id });
    (async () => {
      for (const m of valid) {
        const fn   = m.firstName ?? m.displayName.split(" ")[0] ?? "Member";
        const subj = subject.trim().replace(/\{name\}/gi, fn);
        try {
          await t.sendMail({ from: `"Andre Snyman | eblockwatch" <${gmailUser}>`, to: m.email!, subject: subj, html: buildEmailHtml(fn, subj, message.trim()), text: message.trim().replace(/\{name\}/gi, fn) });
          job.sent++;
        } catch (err) { job.failed++; if (job.errors.length < 50) job.errors.push({ name: m.displayName, error: String(err) }); }
        await new Promise((r) => setTimeout(r, 200));
      }
      job.done = true;
    })();
    return;
  }

  const results: { id: number; name: string; status: "sent" | "failed"; error?: string }[] = [];
  for (const m of valid) {
    const fn   = m.firstName ?? m.displayName.split(" ")[0] ?? "Member";
    const subj = subject.trim().replace(/\{name\}/gi, fn);
    try {
      await t.sendMail({ from: `"Andre Snyman | eblockwatch" <${gmailUser}>`, to: m.email!, subject: subj, html: buildEmailHtml(fn, subj, message.trim()), text: message.trim().replace(/\{name\}/gi, fn) });
      results.push({ id: m.id, name: m.displayName, status: "sent" });
    } catch (err) { results.push({ id: m.id, name: m.displayName, status: "failed", error: String(err) }); }
    await new Promise((r) => setTimeout(r, 200));
  }
  res.json({ ok: true, queued: false, sent: results.filter((r) => r.status === "sent").length, failed: results.filter((r) => r.status === "failed").length, total: results.length, results });
});

// ── POST /api/broadcast/sms ───────────────────────────────────────────────────
router.post("/broadcast/sms", async (req: Request, res: Response): Promise<void> => {
  const { filter, memberIds, message } = req.body as { filter?: BroadcastFilter; memberIds?: number[]; message?: string };
  if (!message?.trim()) { res.status(400).json({ error: "message is required." }); return; }

  const sid   = process.env["TWILIO_ACCOUNT_SID"];
  const token = process.env["TWILIO_AUTH_TOKEN"];
  const from  = process.env["TWILIO_SMS_NUMBER"] ?? "+13158200999";
  if (!sid || !token) { res.status(500).json({ error: "Twilio not configured." }); return; }

  const cols = { id: membersTable.id, firstName: membersTable.firstName, displayName: membersTable.displayName, mobile: membersTable.mobile };
  let members: Array<{ id: number; firstName: string | null; displayName: string; mobile: string | null }> = [];
  if (memberIds?.length) members = await db.select(cols).from(membersTable).where(inArray(membersTable.id, memberIds));
  else if (filter !== undefined) members = await db.select(cols).from(membersTable).where(addCapability(buildWhere(filter), "mobile"));
  else { res.status(400).json({ error: "Provide filter or memberIds." }); return; }

  const valid = members.filter((m) => m.mobile?.trim());
  if (valid.length === 0) { res.json({ ok: true, queued: false, sent: 0, failed: 0, total: 0, results: [] }); return; }

  if (valid.length > 50) {
    const job = makeJob("sms", valid.length);
    res.json({ ok: true, queued: true, total: valid.length, jobId: job.id });
    (async () => {
      const client = twilio(sid, token);
      for (const m of valid) {
        try { await client.messages.create({ from, to: normalisePhone(m.mobile!), body: message.trim().replace(/\{name\}/gi, m.firstName ?? m.displayName) }); job.sent++; }
        catch (err) { job.failed++; if (job.errors.length < 50) job.errors.push({ name: m.displayName, error: String(err) }); }
        await new Promise((r) => setTimeout(r, 80));
      }
      job.done = true;
    })();
    return;
  }

  const client = twilio(sid, token);
  const results: { id: number; name: string; status: "sent" | "failed"; error?: string }[] = [];
  for (const m of valid) {
    try { await client.messages.create({ from, to: normalisePhone(m.mobile!), body: message.trim().replace(/\{name\}/gi, m.firstName ?? m.displayName) }); results.push({ id: m.id, name: m.displayName, status: "sent" }); }
    catch (err) { results.push({ id: m.id, name: m.displayName, status: "failed", error: String(err) }); }
    await new Promise((r) => setTimeout(r, 80));
  }
  res.json({ ok: true, queued: false, sent: results.filter((r) => r.status === "sent").length, failed: results.filter((r) => r.status === "failed").length, total: results.length, results });
});

export default router;
