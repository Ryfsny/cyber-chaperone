import { Router, type IRouter, type Request, type Response } from "express";
import { db, membersTable, messagesTable } from "@workspace/db";
import { inArray, eq, or, sql, ilike } from "drizzle-orm";
import twilio from "twilio";
import nodemailer from "nodemailer";
import { randomUUID } from "node:crypto";
import { isNationalAdmin } from "../middleware/require-auth.js";

const router: IRouter = Router();

const BUSINESS_WA_NUM = process.env["MEMBER_WA_NUMBER"] ?? "27825611065";

function nationalOnly(req: Request, res: Response): boolean {
  if (!isNationalAdmin(req)) {
    res.status(403).json({ error: "Forbidden. National admin access required." });
    return false;
  }
  return true;
}

// ── Types ────────────────────────────────────────────────────────────────────

interface BroadcastFilter {
  status?: string;
  sourceBatch?: string;
  province?: string;
  city?: string;
  suburb?: string;
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

  if (f.city)
    parts.push(ilike(membersTable.city, f.city) as unknown as DrizzleCondition);

  if (f.suburb)
    parts.push(ilike(membersTable.suburb, f.suburb) as unknown as DrizzleCondition);

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
      ilike(membersTable.homeAddress, like),
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
      eblockwatch Cyber Chaperone &nbsp;·&nbsp; Est. 2001 &nbsp;·&nbsp; South Africa
    </div>
  </div>

  <!-- Green bar -->
  <div style="height:4px;background:linear-gradient(90deg,#16a34a,#22c55e,#16a34a);"></div>

  <!-- Body -->
  <div style="background:#ffffff;padding:44px 48px 32px;color:#1e293b;font-size:15px;line-height:1.7;">
    ${htmlBody}
  </div>

  <!-- WhatsApp activation CTA -->
  <div style="background:#f0fdf4;border:2px solid #22c55e;margin:0 48px 32px;padding:24px 32px;text-align:center;border-radius:4px;">
    <p style="margin:0 0 4px;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#16a34a;font-family:Arial,sans-serif;">JOIN THE WHATSAPP SAFETY NETWORK</p>
    <p style="margin:0 0 16px;font-size:14px;color:#374151;font-family:Arial,sans-serif;">Live trip monitoring · ICE escalation · 250 000 members watching over each other</p>
    <a href="https://wa.me/${BUSINESS_WA_NUM}?text=Hi" target="_blank" rel="noopener"
      style="display:inline-block;background:#25d366;color:#ffffff;text-decoration:none;font-size:13px;font-weight:bold;padding:14px 32px;border-radius:4px;letter-spacing:1px;font-family:Arial,sans-serif;">
      💬 &nbsp;ACTIVATE ON WHATSAPP &nbsp;→
    </a>
    <p style="margin:10px 0 0;font-size:11px;color:#6b7280;font-family:Arial,sans-serif;">Tap, send "Hi", and AI Command will walk you through everything.</p>
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
          <div style="color:#475569;font-size:12px;font-family:Arial,sans-serif;margin-top:3px;">Founder · eblockwatch Cyber Chaperone</div>
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
    <a href="https://www.facebook.com/eblockwatchnational" target="_blank" rel="noopener"
      style="display:inline-block;background:#1877f2;color:#ffffff;text-decoration:none;font-size:10px;font-weight:bold;letter-spacing:2px;padding:10px 18px;margin:4px;font-family:Arial,sans-serif;text-transform:uppercase;border-radius:4px;">Facebook</a>
    <a href="https://www.instagram.com/eblockwatch" target="_blank" rel="noopener"
      style="display:inline-block;background:#e1306c;color:#ffffff;text-decoration:none;font-size:10px;font-weight:bold;letter-spacing:2px;padding:10px 18px;margin:4px;font-family:Arial,sans-serif;text-transform:uppercase;border-radius:4px;">Instagram</a>
    <a href="https://eblockwatch.co.za" target="_blank" rel="noopener"
      style="display:inline-block;background:#22c55e;color:#ffffff;text-decoration:none;font-size:10px;font-weight:bold;letter-spacing:2px;padding:10px 18px;margin:4px;font-family:Arial,sans-serif;text-transform:uppercase;border-radius:4px;">Website</a>
    <a href="https://wa.me/${BUSINESS_WA_NUM}" target="_blank" rel="noopener"
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

// ── Welcome-back campaign email ───────────────────────────────────────────────

function buildWelcomeBackEmailHtml(firstName: string, waNumber: string): string {
  const safe = firstName.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const wa = waNumber.replace(/\D/g, "");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>Welcome home to eblockwatch</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,sans-serif;-webkit-text-size-adjust:100%;">

<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#ffffff;">André here — your safety network is live and waiting for you on WhatsApp.</div>

<div style="max-width:600px;margin:0 auto;background:#ffffff;">

  <!-- ── Header: pure white, logo on white ── -->
  <div style="background:#ffffff;padding:40px 48px 20px;text-align:center;">
    <img src="https://cdn.prod.website-files.com/674e83f56d9eb778ff7b9bab/675120eee8a345677c7ddb1d_E-Block%20Watch%20logo.avif"
      alt="eblockwatch" width="200" style="display:block;margin:0 auto;max-width:200px;" />
    <div style="color:#22c55e;font-size:14px;font-weight:bold;letter-spacing:1px;margin-top:14px;font-family:Arial,sans-serif;">
      eblockwatch: A safer you
    </div>
    <div style="height:2px;background:#22c55e;margin:16px 0 0;"></div>
  </div>

  <!-- ── Letter ── -->
  <div style="padding:36px 48px 28px;background:#ffffff;">
    <p style="margin:0 0 6px;color:#16a34a;font-size:11px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;font-family:Arial,sans-serif;">A PERSONAL MESSAGE FROM ANDRÉ</p>
    <h1 style="margin:0 0 28px;color:#111827;font-size:26px;font-weight:bold;line-height:1.3;font-family:Arial,sans-serif;">${safe}, welcome home.</h1>
    <p style="margin:0 0 20px;color:#374151;font-size:16px;line-height:1.85;font-family:Georgia,'Times New Roman',serif;">Dear ${safe},</p>
    <p style="margin:0 0 20px;color:#374151;font-size:16px;line-height:1.85;font-family:Georgia,'Times New Roman',serif;">Twenty-five years ago I started eblockwatch with one purpose: <strong style="color:#111827;">no South African faces danger alone.</strong></p>
    <p style="margin:0 0 20px;color:#374151;font-size:16px;line-height:1.85;font-family:Georgia,'Times New Roman',serif;">You joined us somewhere along that journey. In all that time, you trusted us with the most important thing there is — getting home safe. I have never taken that lightly.</p>
    <p style="margin:0 0 20px;color:#374151;font-size:16px;line-height:1.85;font-family:Georgia,'Times New Roman',serif;">What I want to tell you today is this: <strong style="color:#111827;">what we've built for you has changed.</strong> Not the mission — the mission never changes. But the platform we have now is something I'm genuinely proud to put in front of you.</p>
    <p style="margin:0 0 0;color:#374151;font-size:16px;line-height:1.85;font-family:Georgia,'Times New Roman',serif;">It's called eblockwatch Cyber Chaperone. It lives inside WhatsApp — the app already on your phone. It watches over every trip you take. Included in your membership, right now, today.</p>
  </div>

  <!-- ── Divider ── -->
  <div style="margin:0 48px;height:1px;background:#e5e7eb;"></div>

  <!-- ── Feature cards ── -->
  <div style="padding:28px 48px;">
    <p style="margin:0 0 20px;color:#16a34a;font-size:11px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;font-family:Arial,sans-serif;">WHAT'S WAITING FOR YOU</p>
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
      <tr>
        <td style="width:50%;padding:0 8px 12px 0;vertical-align:top;">
          <div style="border:1px solid #d1fae5;border-left:3px solid #22c55e;padding:16px 16px 16px 18px;">
            <div style="font-weight:bold;color:#111827;font-size:13px;margin-bottom:5px;font-family:Arial,sans-serif;">🛡️ eblockwatch Cyber Chaperone</div>
            <div style="color:#4b5563;font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">Live trip monitoring from start to arrival. We watch every kilometre with you.</div>
          </div>
        </td>
        <td style="width:50%;padding:0 0 12px 8px;vertical-align:top;">
          <div style="border:1px solid #d1fae5;border-left:3px solid #22c55e;padding:16px 16px 16px 18px;">
            <div style="font-weight:bold;color:#111827;font-size:13px;margin-bottom:5px;font-family:Arial,sans-serif;">🚨 ICE Escalation</div>
            <div style="color:#4b5563;font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">Your emergency contacts notified automatically when something goes wrong.</div>
          </div>
        </td>
      </tr>
      <tr>
        <td style="width:50%;padding:0 8px 0 0;vertical-align:top;">
          <div style="border:1px solid #d1fae5;border-left:3px solid #22c55e;padding:16px 16px 16px 18px;">
            <div style="font-weight:bold;color:#111827;font-size:13px;margin-bottom:5px;font-family:Arial,sans-serif;">🤝 Community Network</div>
            <div style="color:#4b5563;font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">250 000 members across South Africa. Your neighbours, mobilised.</div>
          </div>
        </td>
        <td style="width:50%;padding:0 0 0 8px;vertical-align:top;">
          <div style="border:1px solid #d1fae5;border-left:3px solid #22c55e;padding:16px 16px 16px 18px;">
            <div style="font-weight:bold;color:#111827;font-size:13px;margin-bottom:5px;font-family:Arial,sans-serif;">💬 eblockwatch Cyber Chaperone</div>
            <div style="color:#4b5563;font-size:12px;line-height:1.6;font-family:Arial,sans-serif;">Send <strong>10</strong> on WhatsApp. Your eblockwatch Cyber Chaperone and community are alerted and mobilise around you.</div>
          </div>
        </td>
      </tr>
    </table>
  </div>

  <!-- ── Divider ── -->
  <div style="margin:0 48px;height:1px;background:#e5e7eb;"></div>

  <!-- ── 3 steps ── -->
  <div style="padding:28px 48px 32px;">
    <p style="margin:0 0 6px;color:#16a34a;font-size:11px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;font-family:Arial,sans-serif;">HOW TO ACTIVATE</p>
    <p style="margin:0 0 24px;color:#111827;font-size:17px;font-weight:bold;font-family:Arial,sans-serif;">Three steps. Less than 60 seconds.</p>

    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:16px;">
      <tr>
        <td style="width:36px;vertical-align:top;">
          <div style="width:32px;height:32px;background:#22c55e;border-radius:50%;text-align:center;line-height:32px;font-size:14px;font-weight:bold;color:#ffffff;font-family:Arial,sans-serif;">1</div>
        </td>
        <td style="vertical-align:top;padding-left:14px;padding-top:4px;">
          <div style="font-weight:bold;color:#111827;font-size:14px;font-family:Arial,sans-serif;margin-bottom:3px;">Save this number</div>
          <div style="color:#4b5563;font-size:13px;line-height:1.6;font-family:Arial,sans-serif;">Add <strong style="color:#16a34a;">+27 82 561 1065</strong> to your contacts as <em>eblockwatch</em>.</div>
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:16px;">
      <tr>
        <td style="width:36px;vertical-align:top;">
          <div style="width:32px;height:32px;background:#22c55e;border-radius:50%;text-align:center;line-height:32px;font-size:14px;font-weight:bold;color:#ffffff;font-family:Arial,sans-serif;">2</div>
        </td>
        <td style="vertical-align:top;padding-left:14px;padding-top:4px;">
          <div style="font-weight:bold;color:#111827;font-size:14px;font-family:Arial,sans-serif;margin-bottom:3px;">Send "Hi"</div>
          <div style="color:#4b5563;font-size:13px;line-height:1.6;font-family:Arial,sans-serif;">Open WhatsApp and send the word <strong style="color:#16a34a;">Hi</strong>. AI Command, our system, responds with your member menu.</div>
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
      <tr>
        <td style="width:36px;vertical-align:top;">
          <div style="width:32px;height:32px;background:#16a34a;border-radius:50%;text-align:center;line-height:32px;font-size:14px;font-weight:bold;color:#ffffff;font-family:Arial,sans-serif;">3</div>
        </td>
        <td style="vertical-align:top;padding-left:14px;padding-top:4px;">
          <div style="font-weight:bold;color:#111827;font-size:14px;font-family:Arial,sans-serif;margin-bottom:3px;">Start your first trip</div>
          <div style="color:#4b5563;font-size:13px;line-height:1.6;font-family:Arial,sans-serif;">Choose eblockwatch Cyber Chaperone from the menu. Tell us your destination and ETA. We track you all the way home.</div>
        </td>
      </tr>
    </table>
  </div>

  <!-- ── CTA: WhatsApp round icon ── -->
  <div style="padding:0 48px 40px;text-align:center;">
    <a href="https://wa.me/${wa}?text=Hi" target="_blank" rel="noopener" style="text-decoration:none;display:inline-block;">
      <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/WhatsApp.svg/120px-WhatsApp.svg.png"
        alt="WhatsApp" width="120" height="120"
        style="display:block;margin:0 auto;border-radius:50%;border:none;" />
      <div style="margin-top:14px;color:#111827;font-size:15px;font-weight:bold;font-family:Arial,sans-serif;">
        Activate your eblockwatch Cyber Chaperone membership
      </div>
      <div style="margin-top:6px;display:inline-block;background:#22c55e;color:#ffffff;font-size:13px;font-weight:bold;padding:10px 28px;border-radius:4px;font-family:Arial,sans-serif;">
        Tap here to get started
      </div>
    </a>
    <p style="margin:14px 0 0;font-size:12px;color:#9ca3af;font-family:Arial,sans-serif;">Save +27 82 561 1065 · send "Hi" · AI Command does the rest</p>
  </div>

  <!-- ── Signature ── -->
  <div style="background:#f9fafb;padding:28px 48px;border-top:1px solid #e5e7eb;">
    <table cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="width:130px;vertical-align:middle;">
          <img src="data:image/jpeg;base64,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"
            alt="Andre Snyman" width="80" height="80"
            style="display:block;width:120px;height:120px;border-radius:4px;border:3px solid #22c55e;" />
        </td>
        <td style="vertical-align:middle;padding-left:16px;">
          <div style="font-weight:bold;color:#111827;font-size:15px;font-family:Arial,sans-serif;">Andre Snyman</div>
          <div style="color:#6b7280;font-size:12px;font-family:Arial,sans-serif;margin-top:3px;">Founder · eblockwatch Cyber Chaperone · Est. 2001</div>
          <div style="color:#9ca3af;font-size:11px;font-family:Arial,sans-serif;margin-top:3px;">+27 82 561 1065 · <a href="mailto:info@eblockwatch.co.za" style="color:#16a34a;text-decoration:none;">info@eblockwatch.co.za</a></div>
        </td>
      </tr>
    </table>
    <p style="margin:16px 0 0;color:#6b7280;font-size:13px;font-family:Georgia,'Times New Roman',serif;font-style:italic;line-height:1.7;border-left:3px solid #22c55e;padding-left:14px;">&ldquo;I started this for my family. Now it protects yours too.&rdquo;</p>
  </div>

  <!-- ── Social ── -->
  <div style="background:#f9fafb;padding:16px 48px;text-align:center;border-top:1px solid #e5e7eb;">
    <a href="https://www.facebook.com/eblockwatchnational" target="_blank" rel="noopener" style="color:#1877f2;text-decoration:none;font-size:11px;font-weight:bold;padding:0 8px;font-family:Arial,sans-serif;">Facebook</a>
    <span style="color:#d1d5db;">·</span>
    <a href="https://eblockwatch.co.za" target="_blank" rel="noopener" style="color:#16a34a;text-decoration:none;font-size:11px;font-weight:bold;padding:0 8px;font-family:Arial,sans-serif;">eblockwatch.co.za</a>
    <span style="color:#d1d5db;">·</span>
    <a href="https://wa.me/${wa}" target="_blank" rel="noopener" style="color:#16a34a;text-decoration:none;font-size:11px;font-weight:bold;padding:0 8px;font-family:Arial,sans-serif;">WhatsApp</a>
  </div>

  <!-- ── Footer ── -->
  <div style="background:#f3f4f6;padding:14px 48px;text-align:center;">
    <p style="color:#9ca3af;font-size:10px;margin:0;font-family:Arial,sans-serif;">© 2026 eblockwatch (Pty) Ltd · South Africa · Protecting families since 2001</p>
    <p style="color:#d1d5db;font-size:10px;margin:4px 0 0;font-family:Arial,sans-serif;">You are receiving this as a long-standing eblockwatch member. Reply to unsubscribe.</p>
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
router.get("/broadcast/geo-stats", async (req: Request, res: Response): Promise<void> => {
  if (!nationalOnly(req, res)) return;
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
  if (!nationalOnly(req, res)) return;
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
router.get("/broadcast/counts", async (req: Request, res: Response): Promise<void> => {
  if (!nationalOnly(req, res)) return;
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
  if (!nationalOnly(req, res)) return;
  const job = jobs.get(req.params.id as string);
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  res.json(job);
});

// ── POST /api/broadcast (WhatsApp) ────────────────────────────────────────────
router.post("/broadcast", async (req: Request, res: Response): Promise<void> => {
  if (!nationalOnly(req, res)) return;
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
        const body = message.trim().replace(/\{name\}/gi, m.firstName ?? m.displayName);
        try {
          const sent = await client.messages.create({ from, to: m.whatsappNumber, body });
          job.sent++;
          void db.insert(messagesTable).values({ fromNumber: from, toNumber: m.whatsappNumber, body, messageSid: sent.sid, direction: "broadcast", channel: "whatsapp", status: "sent" }).catch(() => undefined);
        }
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
    const body = message.trim().replace(/\{name\}/gi, m.firstName ?? m.displayName);
    try {
      const sent = await client.messages.create({ from, to: m.whatsappNumber, body });
      results.push({ id: m.id, name: m.displayName, status: "sent" });
      void db.insert(messagesTable).values({ fromNumber: from, toNumber: m.whatsappNumber, body, messageSid: sent.sid, direction: "broadcast", channel: "whatsapp", status: "sent" }).catch(() => undefined);
    }
    catch (err) { results.push({ id: m.id, name: m.displayName, status: "failed", error: String(err) }); }
    await new Promise((r) => setTimeout(r, 80));
  }
  res.json({ ok: true, queued: false, sent: results.filter((r) => r.status === "sent").length, failed: results.filter((r) => r.status === "failed").length, total: results.length, results });
});

// ── POST /api/broadcast/email ─────────────────────────────────────────────────
router.post("/broadcast/email", async (req: Request, res: Response): Promise<void> => {
  if (!nationalOnly(req, res)) return;
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
        const emailBody = message.trim().replace(/\{name\}/gi, fn);
        try {
          await t.sendMail({ from: `"Andre Snyman | eblockwatch" <${gmailUser}>`, replyTo: "info@eblockwatch.co.za", to: m.email!, subject: subj, html: buildEmailHtml(fn, subj, message.trim()), text: emailBody });
          job.sent++;
          void db.insert(messagesTable).values({ fromNumber: gmailUser, toNumber: m.email!, body: `[${subj}] ${emailBody}`, direction: "broadcast", channel: "email", status: "sent" }).catch(() => undefined);
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
    const emailBody = message.trim().replace(/\{name\}/gi, fn);
    try {
      await t.sendMail({ from: `"Andre Snyman | eblockwatch" <${gmailUser}>`, replyTo: "info@eblockwatch.co.za", to: m.email!, subject: subj, html: buildEmailHtml(fn, subj, message.trim()), text: emailBody });
      results.push({ id: m.id, name: m.displayName, status: "sent" });
      void db.insert(messagesTable).values({ fromNumber: gmailUser, toNumber: m.email!, body: `[${subj}] ${emailBody}`, direction: "broadcast", channel: "email", status: "sent" }).catch(() => undefined);
    } catch (err) { results.push({ id: m.id, name: m.displayName, status: "failed", error: String(err) }); }
    await new Promise((r) => setTimeout(r, 200));
  }
  res.json({ ok: true, queued: false, sent: results.filter((r) => r.status === "sent").length, failed: results.filter((r) => r.status === "failed").length, total: results.length, results });
});

// ── GET /api/broadcast/welcome-preview ───────────────────────────────────────
// Returns the welcome-back email HTML with a sample name for iframe preview.
router.get("/broadcast/welcome-preview", (req: Request, res: Response): void => {
  const name = (req.query["name"] as string | undefined) ?? "Kieren";
  const html = buildWelcomeBackEmailHtml(name, BUSINESS_WA_NUM);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

// ── POST /api/broadcast/welcome-campaign ──────────────────────────────────────
// Sends the welcome-back email to the next 50 unsent active/verified members.
// Tracks every send in the messages table so re-running automatically continues
// from where the last batch left off — no manual offset needed.
// André is CC'd on the very first and very last email of each batch.
// Standard post-batch workflow: check Gmail for bounces next day → SMS bounced members.
router.post("/broadcast/welcome-campaign", async (req: Request, res: Response): Promise<void> => {
  if (!nationalOnly(req, res)) return;

  const t = makeEmailTransporter();
  const gmailUser = process.env["GMAIL_USER"] ?? "";
  if (!t || !gmailUser) { res.status(500).json({ error: "Gmail not configured." }); return; }

  const ANDRE_CC = "ryfsny@yebo.co.za";
  const BATCH_SIZE = 50;
  const CAMPAIGN_MARKER = "Welcome campaign";

  // Find already-contacted emails so we never double-send
  const alreadySentRows = await db
    .select({ toNumber: messagesTable.toNumber })
    .from(messagesTable)
    .where(
      sql`direction = 'broadcast' AND channel = 'email' AND body LIKE ${`%${CAMPAIGN_MARKER}%`}` as unknown as ReturnType<typeof eq>
    );
  const alreadySent = new Set(alreadySentRows.map((r) => r.toNumber?.toLowerCase()));

  // Next unsent batch — ordered by member id so batches are stable day to day
  const candidates = await db
    .select({ id: membersTable.id, firstName: membersTable.firstName, displayName: membersTable.displayName, email: membersTable.email })
    .from(membersTable)
    .where(
      sql`(member_status = 'active' OR member_status = 'verified') AND email IS NOT NULL AND email != ''` as unknown as ReturnType<typeof eq>
    )
    .orderBy(membersTable.id);

  const valid = candidates.filter((m) => m.email?.trim() && !alreadySent.has(m.email!.toLowerCase())).slice(0, BATCH_SIZE);

  if (valid.length === 0) {
    res.json({ ok: true, queued: false, sent: 0, failed: 0, total: 0, message: "All eligible members have already been contacted." });
    return;
  }

  const SUBJECT = (fn: string) => `André here — welcome home, ${fn}.`;
  const TEXT    = (fn: string) => `Hi ${fn},\n\nWelcome home to eblockwatch.\n\nActivate on WhatsApp now — save +27 82 561 1065, send "Hi", and AI Command walks you through everything.\n\nAndre Snyman\nFounder · eblockwatch`;

  const lastIdx = valid.length - 1;
  const job = makeJob("email", valid.length);
  res.json({ ok: true, queued: true, total: valid.length, jobId: job.id, alreadySentCount: alreadySent.size });

  (async () => {
    for (let i = 0; i < valid.length; i++) {
      const m = valid[i]!;
      const fn = m.firstName ?? m.displayName.split(" ")[0] ?? "Member";
      const isFirst = i === 0;
      const isLast  = i === lastIdx;
      try {
        await t.sendMail({
          from: `"Andre Snyman | eblockwatch" <${gmailUser}>`,
          replyTo: "info@eblockwatch.co.za",
          to: m.email!,
          ...(isFirst || isLast ? { cc: ANDRE_CC } : {}),
          subject: SUBJECT(fn),
          html: buildWelcomeBackEmailHtml(fn, BUSINESS_WA_NUM),
          text: TEXT(fn),
        });
        job.sent++;
        // Await the log write so it persists even if the server restarts
        await db.insert(messagesTable).values({
          fromNumber: gmailUser,
          toNumber: m.email!,
          body: `[${CAMPAIGN_MARKER}] ${SUBJECT(fn)}`,
          direction: "broadcast",
          channel: "email",
          status: "sent",
        }).catch(() => undefined);
      } catch (err) {
        job.failed++;
        if (job.errors.length < 50) job.errors.push({ name: m.displayName, error: String(err) });
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    job.done = true;
  })();
});

// ── POST /api/broadcast/sms ───────────────────────────────────────────────────
router.post("/broadcast/sms", async (req: Request, res: Response): Promise<void> => {
  if (!nationalOnly(req, res)) return;
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

// ── GET /api/broadcast/geo-facets ────────────────────────────────────────────
// Returns distinct province / city / suburb values that actually have members.
// Cascade: ?province=X narrows cities; ?province=X&city=Y narrows suburbs.
router.get("/broadcast/geo-facets", async (req: Request, res: Response): Promise<void> => {
  if (!nationalOnly(req, res)) return;
  const province = String(req.query.province ?? "").trim();
  const city     = String(req.query.city ?? "").trim();

  function notBlank(col: typeof membersTable.province) {
    return sql`${col} IS NOT NULL AND trim(${col}) != ''`;
  }

  const [provinces, cities, suburbs] = await Promise.all([
    // All distinct provinces (no filter)
    db
      .selectDistinct({ val: membersTable.province })
      .from(membersTable)
      .where(notBlank(membersTable.province) as ReturnType<typeof eq>)
      .orderBy(membersTable.province),

    // Cities: filter by province if provided
    province
      ? db
          .selectDistinct({ val: membersTable.city })
          .from(membersTable)
          .where(
            sql`${notBlank(membersTable.city)} AND lower(province) = lower(${province})` as ReturnType<typeof eq>
          )
          .orderBy(membersTable.city)
      : Promise.resolve([]),

    // Suburbs: filter by province+city if both provided
    province && city
      ? db
          .selectDistinct({ val: membersTable.suburb })
          .from(membersTable)
          .where(
            sql`${notBlank(membersTable.suburb)} AND lower(province) = lower(${province}) AND lower(city) = lower(${city})` as ReturnType<typeof eq>
          )
          .orderBy(membersTable.suburb)
      : Promise.resolve([]),
  ]);

  res.json({
    provinces: provinces.map((r) => r.val).filter(Boolean),
    cities:    cities.map((r) => r.val).filter(Boolean),
    suburbs:   suburbs.map((r) => r.val).filter(Boolean),
  });
});

// ── POST /api/broadcast/multi (multi-channel, exact member IDs) ───────────────
router.post("/broadcast/multi", async (req: Request, res: Response): Promise<void> => {
  if (!nationalOnly(req, res)) return;
  const { memberIds, message, channels } = req.body as {
    memberIds?: number[];
    message?: string;
    channels?: { email?: boolean; sms?: boolean; whatsapp?: boolean };
  };

  if (!message?.trim()) { res.status(400).json({ error: "message is required." }); return; }
  if (!memberIds?.length) { res.status(400).json({ error: "memberIds is required." }); return; }
  if (!channels || (!channels.email && !channels.sms && !channels.whatsapp)) {
    res.status(400).json({ error: "At least one channel must be selected." }); return;
  }

  const rows = await db
    .select({
      id: membersTable.id,
      firstName: membersTable.firstName,
      displayName: membersTable.displayName,
      email: membersTable.email,
      mobile: membersTable.mobile,
      whatsappNumber: membersTable.whatsappNumber,
    })
    .from(membersTable)
    .where(inArray(membersTable.id, memberIds));

  if (rows.length === 0) { res.json({ ok: true, results: [] }); return; }

  const gmailUser = process.env["GMAIL_USER"] ?? "";
  const gmailPass = process.env["GMAIL_APP_PASSWORD"] ?? "";
  const twilioSid   = process.env["TWILIO_ACCOUNT_SID"];
  const twilioToken = process.env["TWILIO_AUTH_TOKEN"];
  const waFrom  = process.env["TWILIO_WHATSAPP_NUMBER"] ?? "whatsapp:+14155238886";
  const smsFrom = process.env["TWILIO_SMS_NUMBER"] ?? "";

  const emailT = channels.email && gmailUser && gmailPass
    ? nodemailer.createTransport({ service: "gmail", auth: { user: gmailUser, pass: gmailPass } })
    : null;
  const twilioClient = (channels.sms || channels.whatsapp) && twilioSid && twilioToken
    ? twilio(twilioSid, twilioToken)
    : null;

  interface ChannelResult { status: "sent" | "failed" | "skipped"; error?: string }
  interface MemberResult { id: number; name: string; email?: ChannelResult; sms?: ChannelResult; whatsapp?: ChannelResult }

  const results: MemberResult[] = [];

  for (const m of rows) {
    const firstName = m.firstName ?? m.displayName;
    const body = message.trim().replace(/\{name\}/gi, firstName);
    const result: MemberResult = { id: m.id, name: m.displayName };

    if (channels.email) {
      if (!emailT) {
        result.email = { status: "skipped", error: "Gmail not configured" };
      } else if (!m.email?.trim()) {
        result.email = { status: "skipped", error: "No email address" };
      } else {
        try {
          await emailT.sendMail({
            from: `"Andre Snyman | eblockwatch" <${gmailUser}>`,
            replyTo: "info@eblockwatch.co.za",
            to: m.email.trim(),
            subject: "Message from eblockwatch",
            text: body,
            html: buildEmailHtml(firstName, "Message from eblockwatch", body),
          });
          result.email = { status: "sent" };
        } catch (err) {
          result.email = { status: "failed", error: String(err) };
        }
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    if (channels.sms) {
      if (!twilioClient || !smsFrom) {
        result.sms = { status: "skipped", error: "SMS not configured" };
      } else if (!m.mobile?.trim()) {
        result.sms = { status: "skipped", error: "No mobile number" };
      } else {
        try {
          await twilioClient.messages.create({ from: smsFrom, to: normalisePhone(m.mobile.trim()), body });
          result.sms = { status: "sent" };
        } catch (err) {
          result.sms = { status: "failed", error: String(err) };
        }
        await new Promise((r) => setTimeout(r, 80));
      }
    }

    if (channels.whatsapp) {
      if (!twilioClient) {
        result.whatsapp = { status: "skipped", error: "WhatsApp not configured" };
      } else if (!m.whatsappNumber?.trim()) {
        result.whatsapp = { status: "skipped", error: "No WhatsApp number" };
      } else {
        try {
          await twilioClient.messages.create({ from: waFrom, to: m.whatsappNumber.trim(), body });
          result.whatsapp = { status: "sent" };
        } catch (err) {
          result.whatsapp = { status: "failed", error: String(err) };
        }
        await new Promise((r) => setTimeout(r, 80));
      }
    }

    results.push(result);
  }

  const count = (ch: "email" | "sms" | "whatsapp", s: "sent" | "failed") =>
    results.filter((r) => r[ch]?.status === s).length;

  res.json({
    ok: true,
    total: results.length,
    emailSent: count("email", "sent"),
    smsSent: count("sms", "sent"),
    whatsappSent: count("whatsapp", "sent"),
    results,
  });
});

// ── Migration email template ───────────────────────────────────────────────────
// Builds the "join the new system" email for old members being migrated.

function buildMigrationEmailHtml(firstName: string, portalUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>You're invited to the new eblockwatch</title>
</head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:Arial,sans-serif;-webkit-text-size-adjust:100%;">

<!-- Preheader -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#f0fdf4;">
  eblockwatch has a brand-new member portal — and your spot is already waiting.
</div>

<div style="max-width:620px;margin:0 auto;background:#ffffff;">

  <!-- Header -->
  <div style="background:#1a1f2e;padding:36px 48px;text-align:center;">
    <img src="https://cdn.prod.website-files.com/674e83f56d9eb778ff7b9bab/675120eee8a345677c7ddb1d_E-Block%20Watch%20logo.avif"
      alt="eblockwatch" width="160" style="display:block;margin:0 auto;max-width:160px;" />
    <div style="color:#9ca3af;font-size:10px;letter-spacing:3px;margin-top:14px;text-transform:uppercase;">
      Est. 2001 &nbsp;·&nbsp; South Africa's Trusted Safety Network
    </div>
  </div>

  <!-- Green bar -->
  <div style="height:4px;background:linear-gradient(90deg,#16a34a,#22c55e,#16a34a);"></div>

  <!-- Hero banner -->
  <div style="background:#f0fdf4;padding:32px 48px;border-bottom:1px solid #bbf7d0;text-align:center;">
    <div style="font-size:28px;font-weight:bold;color:#1a1f2e;font-family:Georgia,'Times New Roman',serif;line-height:1.3;">
      ${firstName}, your eblockwatch<br>just got a whole lot smarter.
    </div>
    <div style="color:#16a34a;font-size:13px;letter-spacing:2px;text-transform:uppercase;margin-top:12px;font-weight:bold;">
      New Member Portal · Now Live
    </div>
  </div>

  <!-- Body -->
  <div style="padding:40px 48px 28px;color:#1e293b;">

    <p style="margin:0 0 20px;font-size:16px;line-height:1.75;font-family:Georgia,'Times New Roman',serif;color:#1a1f2e;">
      Dear ${firstName},
    </p>

    <p style="margin:0 0 18px;font-size:15px;line-height:1.75;color:#374151;font-family:Arial,sans-serif;">
      I've been building eblockwatch since 2001 — and I'm proud to say we've just taken our biggest step forward yet.
    </p>

    <p style="margin:0 0 18px;font-size:15px;line-height:1.75;color:#374151;font-family:Arial,sans-serif;">
      We've launched a <strong>brand-new member portal</strong> — and it's designed around everything our community has asked for:
    </p>

    <!-- Feature list -->
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0 0 24px;">
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
          <span style="color:#22c55e;font-weight:bold;font-size:18px;vertical-align:middle;">✓</span>
          <span style="font-size:14px;color:#1e293b;font-family:Arial,sans-serif;margin-left:10px;vertical-align:middle;">
            <strong>eblockwatch Cyber Chaperone</strong> — real-time trip monitoring via WhatsApp. Start a trip, check in, and your operator watches over you the whole way.
          </span>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
          <span style="color:#22c55e;font-weight:bold;font-size:18px;vertical-align:middle;">✓</span>
          <span style="font-size:14px;color:#1e293b;font-family:Arial,sans-serif;margin-left:10px;vertical-align:middle;">
            <strong>Your member profile</strong> — update your details, ICE contacts, and home address in one place.
          </span>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;">
          <span style="color:#22c55e;font-weight:bold;font-size:18px;vertical-align:middle;">✓</span>
          <span style="font-size:14px;color:#1e293b;font-family:Arial,sans-serif;margin-left:10px;vertical-align:middle;">
            <strong>Family membership</strong> — one plan, your whole household protected.
          </span>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;">
          <span style="color:#22c55e;font-weight:bold;font-size:18px;vertical-align:middle;">✓</span>
          <span style="font-size:14px;color:#1e293b;font-family:Arial,sans-serif;margin-left:10px;vertical-align:middle;">
            <strong>Responder network</strong> — connected to verified eblockwatch responders in your area.
          </span>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 18px;font-size:15px;line-height:1.75;color:#374151;font-family:Arial,sans-serif;">
      As an existing eblockwatch member, <strong>your account is already set up</strong>. All you need to do is claim it — takes less than 60 seconds.
    </p>

    <!-- CTA -->
    <p style="margin:32px 0;text-align:center;">
      <a href="${portalUrl}" target="_blank" rel="noopener"
        style="display:inline-block;background:#22c55e;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;letter-spacing:1px;padding:18px 48px;font-family:Arial,sans-serif;border-radius:4px;border:2px solid #16a34a;">
        CLAIM YOUR ACCOUNT
      </a>
    </p>

    <p style="margin:0 0 18px;font-size:13px;line-height:1.7;color:#64748b;font-family:Arial,sans-serif;text-align:center;">
      Or copy this link into your browser:<br>
      <a href="${portalUrl}" style="color:#16a34a;word-break:break-all;">${portalUrl}</a>
    </p>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;">

    <p style="margin:0 0 10px;font-size:14px;line-height:1.7;color:#374151;font-family:Arial,sans-serif;">
      <strong>Already on WhatsApp?</strong> You can also just send us a message — type <strong>Hi</strong> to <a href="https://wa.me/${BUSINESS_WA_NUM}" style="color:#16a34a;text-decoration:none;">+${BUSINESS_WA_NUM}</a> and the eblockwatch Cyber Chaperone menu will guide you straight in.
    </p>

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
          <div style="color:#475569;font-size:12px;font-family:Arial,sans-serif;margin-top:3px;">Founder · eblockwatch Cyber Chaperone</div>
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
    <a href="https://www.facebook.com/eblockwatchnational" target="_blank" rel="noopener"
      style="display:inline-block;background:#1877f2;color:#ffffff;text-decoration:none;font-size:10px;font-weight:bold;letter-spacing:2px;padding:10px 18px;margin:4px;font-family:Arial,sans-serif;text-transform:uppercase;border-radius:4px;">Facebook</a>
    <a href="https://www.instagram.com/eblockwatch" target="_blank" rel="noopener"
      style="display:inline-block;background:#e1306c;color:#ffffff;text-decoration:none;font-size:10px;font-weight:bold;letter-spacing:2px;padding:10px 18px;margin:4px;font-family:Arial,sans-serif;text-transform:uppercase;border-radius:4px;">Instagram</a>
    <a href="https://eblockwatch.co.za" target="_blank" rel="noopener"
      style="display:inline-block;background:#22c55e;color:#ffffff;text-decoration:none;font-size:10px;font-weight:bold;letter-spacing:2px;padding:10px 18px;margin:4px;font-family:Arial,sans-serif;text-transform:uppercase;border-radius:4px;">Website</a>
    <a href="${portalUrl}" target="_blank" rel="noopener"
      style="display:inline-block;background:#22c55e;color:#ffffff;text-decoration:none;font-size:10px;font-weight:bold;letter-spacing:2px;padding:10px 18px;margin:4px;font-family:Arial,sans-serif;text-transform:uppercase;border-radius:4px;">Member Portal</a>
    <a href="https://wa.me/${BUSINESS_WA_NUM}" target="_blank" rel="noopener"
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

// ── POST /api/broadcast/migrate — send migration email to old-system members ──
// Targets members with email addresses who haven't yet logged into the portal.
// Dry-run mode (dryRun: true) returns the list without sending.

router.post("/broadcast/migrate", async (req: Request, res: Response): Promise<void> => {
  if (!nationalOnly(req, res)) return;

  const { dryRun = false, limit: limitParam = 500 } = req.body as { dryRun?: boolean; limit?: number };
  const sendLimit = Math.min(Number(limitParam) || 500, 1000);

  const portalUrl = "https://cyber-chaperone-r--ryfsny.replit.app/website/";

  // Target: members with an email address who are active or verified
  const targets = await db
    .select({
      id:          membersTable.id,
      firstName:   membersTable.firstName,
      displayName: membersTable.displayName,
      email:       membersTable.email,
    })
    .from(membersTable)
    .where(
      sql`email IS NOT NULL AND TRIM(email) != '' AND member_status IN ('active','verified')` as ReturnType<typeof eq>
    )
    .limit(sendLimit);

  if (dryRun) {
    res.json({ ok: true, dryRun: true, total: targets.length, targets: targets.map((t) => ({ id: t.id, name: t.displayName, email: t.email })) });
    return;
  }

  const gmailUser = process.env["GMAIL_USER"] ?? "";
  const gmailPass = process.env["GMAIL_APP_PASSWORD"] ?? "";
  if (!gmailUser || !gmailPass) { res.status(503).json({ error: "Gmail not configured." }); return; }

  const t = nodemailer.createTransport({ service: "gmail", auth: { user: gmailUser, pass: gmailPass } });

  const results: { id: number; name: string; email: string; status: "sent" | "failed"; error?: string }[] = [];

  for (const m of targets) {
    const firstName = m.firstName ?? m.displayName.split(" ")[0] ?? "Member";
    const subj = `${firstName}, your new eblockwatch member portal is ready`;
    try {
      await t.sendMail({
        from: `"Andre Snyman | eblockwatch" <${gmailUser}>`,
        replyTo: "info@eblockwatch.co.za",
        to: m.email!,
        subject: subj,
        html: buildMigrationEmailHtml(firstName, portalUrl),
        text: `Hi ${firstName},\n\neblockwatch has a brand-new member portal and your account is already set up.\n\nClaim it here: ${portalUrl}\n\nOr send "Hi" on WhatsApp to +27 82 561 1065.\n\nAndre Snyman\nFounder · eblockwatch\n+27 82 561 1065`,
      });
      results.push({ id: m.id, name: m.displayName, email: m.email!, status: "sent" });
      void db.insert(messagesTable).values({
        fromNumber: gmailUser,
        toNumber:   m.email!,
        body:       `[Migration invite] ${subj}`,
        direction:  "broadcast",
        channel:    "email",
        status:     "sent",
      }).catch(() => undefined);
    } catch (err) {
      results.push({ id: m.id, name: m.displayName, email: m.email!, status: "failed", error: String(err) });
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  const sent   = results.filter((r) => r.status === "sent").length;
  const failed = results.filter((r) => r.status === "failed").length;
  req.log.info({ sent, failed, total: results.length }, "Migration broadcast sent");

  res.json({ ok: true, dryRun: false, sent, failed, total: results.length, results });
});

export default router;
