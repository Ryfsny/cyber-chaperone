import nodemailer from "nodemailer";

const GMAIL_USER = process.env.GMAIL_USER ?? "";
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD ?? "";
const OPERATOR_EMAIL = GMAIL_USER; // send to same address (operator inbox)

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

export type EmailCategory =
  | "trip-started"
  | "checkpoint"
  | "pre-arrival"
  | "arrived"
  | "amber"
  | "red-alert"
  | "ice-escalation"
  | "operator-mirror";

const SUBJECT_PREFIX: Record<EmailCategory, string> = {
  "trip-started":     "🟢 NEW TRIP",
  "checkpoint":       "🔵 CHECKPOINT",
  "pre-arrival":      "🔵 PRE-ARRIVAL",
  "arrived":          "✅ ARRIVED",
  "amber":            "🟡 AMBER ALERT",
  "red-alert":        "🔴 RED ALERT",
  "ice-escalation":   "🚨 ICE ESCALATION",
  "operator-mirror":  "📋 SITUATION ROOM",
};

export async function sendOperatorEmail(
  category: EmailCategory,
  subject: string,
  body: string,
): Promise<void> {
  const t = getTransporter();
  if (!t) return; // silently skip if not configured

  const fullSubject = `${SUBJECT_PREFIX[category]} — ${subject}`;
  const htmlBody = `<pre style="font-family:monospace;font-size:14px;line-height:1.6;">${escapeHtml(body)}</pre>`;

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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
