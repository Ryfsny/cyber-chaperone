import nodemailer from "nodemailer";

const GMAIL_USER = process.env.GMAIL_USER ?? "";
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD ?? "";
const OPERATOR_EMAIL = GMAIL_USER;

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

export type EmailCategory =
  | "trip-started"
  | "checkpoint"
  | "pre-arrival"
  | "arrived"
  | "trip-complete"
  | "amber"
  | "red-alert"
  | "ice-escalation"
  | "operator-mirror";

const SUBJECT_PREFIX: Record<EmailCategory, string> = {
  "trip-started":    "🟢 NEW TRIP",
  "checkpoint":      "🔵 CHECKPOINT",
  "pre-arrival":     "🔵 PRE-ARRIVAL",
  "arrived":         "✅ ARRIVED",
  "trip-complete":   "🏁 TRIP COMPLETE",
  "amber":           "🟡 AMBER ALERT",
  "red-alert":       "🔴 RED ALERT",
  "ice-escalation":  "🚨 ICE ESCALATION",
  "operator-mirror": "📋 SITUATION ROOM",
};

// Alert bar colour per category
const ALERT_COLOR: Record<EmailCategory, { bg: string; text: string; label: string }> = {
  "trip-started":    { bg: "#16a34a", text: "#ffffff", label: "NEW TRIP — MONITORING ACTIVE" },
  "checkpoint":      { bg: "#2563eb", text: "#ffffff", label: "CHECKPOINT" },
  "pre-arrival":     { bg: "#2563eb", text: "#ffffff", label: "PRE-ARRIVAL" },
  "arrived":         { bg: "#16a34a", text: "#ffffff", label: "ARRIVED SAFELY" },
  "trip-complete":   { bg: "#16a34a", text: "#ffffff", label: "TRIP COMPLETE" },
  "amber":           { bg: "#d97706", text: "#ffffff", label: "⚠ AMBER ALERT — ATTENTION REQUIRED" },
  "red-alert":       { bg: "#dc2626", text: "#ffffff", label: "🔴 RED ALERT — IMMEDIATE ACTION" },
  "ice-escalation":  { bg: "#dc2626", text: "#ffffff", label: "🚨 ICE ESCALATION — CONTACT NOW" },
  "operator-mirror": { bg: "#1a1f2e", text: "#9ca3af", label: "SITUATION ROOM UPDATE" },
};

function buildOperatorEmailHtml(category: EmailCategory, subject: string, body: string): string {
  const alert = ALERT_COLOR[category];
  const escaped = escapeHtml(body);
  const bodyHtml = escaped
    .split("\n\n")
    .map((p) => `<p style="margin:0 0 14px;color:#1e293b;font-size:14px;line-height:1.7;font-family:Arial,sans-serif;">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;">

  <!-- Header -->
  <div style="background:#1a1f2e;padding:24px 36px;display:flex;align-items:center;justify-content:space-between;">
    <div>
      <div style="color:#22c55e;font-size:18px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">eblockwatch</div>
      <div style="color:#6b7280;font-size:10px;letter-spacing:2px;margin-top:3px;text-transform:uppercase;">Cyber Chaperone · Situation Room</div>
    </div>
    <div style="color:#6b7280;font-size:10px;font-family:monospace;">${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC</div>
  </div>

  <!-- Alert bar -->
  <div style="background:${alert.bg};padding:12px 36px;">
    <div style="color:${alert.text};font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">${alert.label}</div>
    <div style="color:${alert.text};opacity:0.85;font-size:13px;margin-top:3px;">${escapeHtml(subject)}</div>
  </div>

  <!-- Green accent line -->
  <div style="height:3px;background:linear-gradient(90deg,#16a34a,#22c55e,#16a34a);"></div>

  <!-- Body -->
  <div style="padding:28px 36px 20px;">
    ${bodyHtml}
  </div>

  <!-- Footer -->
  <div style="background:#1a1f2e;padding:16px 36px;text-align:center;">
    <div style="color:#374151;font-size:10px;letter-spacing:1px;text-transform:uppercase;font-family:Arial,sans-serif;">
      eblockwatch Situation Room · Operator Alert · <a href="https://www.facebook.com/eblockwatchnational" style="color:#22c55e;text-decoration:none;">Facebook</a> &nbsp;·&nbsp; <a href="https://eblockwatch.co.za" style="color:#22c55e;text-decoration:none;">eblockwatch.co.za</a>
    </div>
  </div>

</div>
</body>
</html>`;
}

export async function sendOperatorEmail(
  category: EmailCategory,
  subject: string,
  body: string,
): Promise<void> {
  const t = getTransporter();
  if (!t) return;

  const fullSubject = `${SUBJECT_PREFIX[category]} — ${subject}`;
  const htmlBody = buildOperatorEmailHtml(category, subject, body);

  try {
    await t.sendMail({
      from: `"Cyber Chaperone" <${GMAIL_USER}>`,
      to: OPERATOR_EMAIL,
      subject: fullSubject,
      text: body,
      html: htmlBody,
    });
  } catch {
    // best-effort — never block WhatsApp flow
  }
}

/**
 * Send a fully custom email (bypasses the alert-prefix system).
 * Used by scheduled briefings and other non-alert emails.
 */
export async function sendRawEmail(
  subject: string,
  html: string,
  text: string,
  to?: string,
): Promise<void> {
  const t = getTransporter();
  if (!t) return;
  try {
    await t.sendMail({
      from: `"Cyber Chaperone" <${GMAIL_USER}>`,
      to: to ?? OPERATOR_EMAIL,
      subject,
      text,
      html,
    });
  } catch {
    // best-effort — never crash the server
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
