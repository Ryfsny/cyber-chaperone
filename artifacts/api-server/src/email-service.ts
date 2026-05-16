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
      from: `"eblockwatch Cyber Chaperone" <${GMAIL_USER}>`,
      replyTo: "info@eblockwatch.co.za",
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
  cc?: string,
): Promise<void> {
  const t = getTransporter();
  if (!t) return;
  try {
    await t.sendMail({
      from: `"eblockwatch Cyber Chaperone" <${GMAIL_USER}>`,
      replyTo: "info@eblockwatch.co.za",
      to: to ?? OPERATOR_EMAIL,
      ...(cc ? { cc } : {}),
      subject,
      text,
      html,
    });
  } catch {
    // best-effort — never crash the server
  }
}

// ── Communication ledger — log every message to Gmail (threaded per member) ──
/**
 * Logs a single inbound or outbound message to André's Gmail inbox.
 * Subject is stable per phone number so Gmail auto-threads all messages
 * with a given member into one conversation.
 * Fire-and-forget — never throws, never blocks the webhook pipeline.
 */
export async function logMessageToGmail(
  memberPhone: string,
  memberName: string,
  direction: "inbound" | "outbound",
  body: string,
  platform: "whatsapp" | "facebook" | "sms" = "whatsapp",
): Promise<void> {
  const t = getTransporter();
  if (!t) return;
  const cleanPhone = memberPhone.replace(/^whatsapp:|^sms:|^fb:/, "");
  const stamp = new Date().toLocaleString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    dateStyle: "short",
    timeStyle: "medium",
  });
  const arrow   = direction === "inbound"  ? "⬅️" : "➡️";
  const bgColor = direction === "inbound"  ? "#f0fdf4" : "#eff6ff";
  const label   = direction === "inbound"  ? "FROM MEMBER" : "TO MEMBER";
  const platTag = platform.toUpperCase();
  try {
    await t.sendMail({
      from:    `"eblockwatch Comms" <${GMAIL_USER}>`,
      to:      OPERATOR_EMAIL,
      subject: `[eblockwatch] ${cleanPhone}`,
      text:    `${arrow} ${label} [${platTag}] ${stamp}\n${memberName || cleanPhone}\n\n${body}`,
      html: [
        `<div style="font-family:sans-serif;max-width:560px">`,
        `<p style="margin:0 0 4px 0">`,
        `  <strong>${arrow} ${label}</strong>`,
        `  &nbsp;<span style="color:#888;font-size:12px">${platTag} · ${stamp}</span>`,
        `</p>`,
        `<p style="margin:0 0 8px 0;color:#555;font-size:12px">${escapeHtml(memberName || cleanPhone)} · ${escapeHtml(cleanPhone)}</p>`,
        `<div style="background:${bgColor};border-left:3px solid #22c55e;padding:10px 14px;`,
        `border-radius:4px;font-size:14px;white-space:pre-wrap;word-break:break-word">`,
        escapeHtml(body),
        `</div></div>`,
      ].join(""),
    });
  } catch { /* best-effort — never crash the server */ }
}

// ── Member welcome / registration email ──────────────────────────────────────
/**
 * Sent to a new member's email address immediately after they complete
 * WhatsApp registration. Explains the safety profile questionnaire
 * step by step so they — and any staff member (e.g. Talia) — understand
 * exactly what is being asked and why.
 */
export async function sendMemberWelcomeEmail(
  toEmail: string,
  firstName: string,
  whatsappNumber: string,
): Promise<void> {
  const display = firstName || "there";
  const waLink = "https://wa.me/27825611065";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Welcome to eblockwatch, ${escapeHtml(display)}!</title>
</head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:Arial,sans-serif;">
<div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #bbf7d0;">

  <!-- Header -->
  <div style="background:#1a1f2e;padding:24px 36px;display:flex;align-items:center;justify-content:space-between;">
    <div>
      <div style="color:#22c55e;font-size:20px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">eblockwatch</div>
      <div style="color:#6b7280;font-size:10px;letter-spacing:2px;margin-top:3px;text-transform:uppercase;">Cyber Chaperone · Personal Safety Network</div>
    </div>
    <div style="color:#22c55e;font-size:22px;">🛡️</div>
  </div>

  <!-- Green accent bar -->
  <div style="height:4px;background:linear-gradient(90deg,#16a34a,#22c55e,#16a34a);"></div>

  <!-- Welcome banner -->
  <div style="background:#16a34a;padding:16px 36px;">
    <div style="color:#ffffff;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">✅ REGISTRATION COMPLETE — WELCOME ABOARD</div>
    <div style="color:#dcfce7;font-size:14px;margin-top:4px;">You are now part of the eblockwatch Cyber Chaperone safety network.</div>
  </div>

  <!-- Greeting -->
  <div style="padding:32px 36px 0;">
    <p style="margin:0 0 14px;font-size:16px;font-weight:bold;color:#1a1f2e;">Hi ${escapeHtml(display)},</p>
    <p style="margin:0 0 14px;font-size:14px;color:#374151;line-height:1.75;">
      André Snyman and the eblockwatch team now have your WhatsApp number on record.
      Your membership is active and you are part of a trusted community that looks out for each other every day.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.75;">
      The next step is to <strong>complete your Safety Profile</strong>. This takes about 2 minutes on WhatsApp
      and gives André the information he needs to monitor your safety when you travel.
    </p>
  </div>

  <!-- Divider -->
  <div style="margin:0 36px;border-top:2px solid #dcfce7;"></div>

  <!-- Step: How to start -->
  <div style="padding:24px 36px 0;">
    <p style="margin:0 0 8px;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#16a34a;">HOW TO START YOUR SAFETY PROFILE</p>
    <p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.75;">
      Open WhatsApp and message André directly:
    </p>
    <div style="background:#f0fdf4;border-left:4px solid #16a34a;padding:12px 18px;margin-bottom:16px;">
      <p style="margin:0 0 6px;font-size:13px;color:#374151;"><strong>Step 1.</strong> Send a message to <strong>+27 82 561 1065</strong> &nbsp;<a href="${waLink}" style="color:#16a34a;font-size:12px;">(tap to open WhatsApp)</a></p>
      <p style="margin:0 0 6px;font-size:13px;color:#374151;"><strong>Step 2.</strong> Reply <strong>4</strong> &nbsp;→ <em>Update my profile</em></p>
      <p style="margin:0;font-size:13px;color:#374151;"><strong>Step 3.</strong> Reply <strong>8</strong> &nbsp;→ <em>Safety questionnaire</em></p>
    </div>
    <p style="margin:0 0 20px;font-size:13px;color:#6b7280;line-height:1.6;">
      The chatbot will walk you through three short questions — one at a time. You can type
      <strong>SKIP</strong> at any step if something doesn't apply to you. You can also go back and
      complete any skipped step later by repeating the same steps above.
    </p>
  </div>

  <!-- Divider -->
  <div style="margin:0 36px;border-top:2px solid #dcfce7;"></div>

  <!-- Question 1 -->
  <div style="padding:24px 36px 0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="36" valign="top" style="padding-top:2px;">
          <div style="background:#1a1f2e;color:#22c55e;font-size:12px;font-weight:bold;width:26px;height:26px;border-radius:50%;text-align:center;line-height:26px;">1</div>
        </td>
        <td valign="top" style="padding-left:12px;">
          <p style="margin:0 0 6px;font-size:14px;font-weight:bold;color:#1a1f2e;">Your mother's full name</p>
          <p style="margin:0 0 8px;font-size:13px;color:#374151;line-height:1.7;">
            Just type her first and last name and send it. André keeps this as part of your emergency contact record.
          </p>
          <p style="margin:0 0 16px;font-size:12px;color:#6b7280;background:#f9fafb;border:1px solid #e5e7eb;padding:8px 12px;display:inline-block;">
            💬 <em>Example:</em> &nbsp;<strong>Sandra Fourie</strong><br>
            ↩ <em>Not applicable? Reply</em> <strong>SKIP</strong>
          </p>
        </td>
      </tr>
    </table>
  </div>

  <!-- Question 2 -->
  <div style="padding:16px 36px 0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="36" valign="top" style="padding-top:2px;">
          <div style="background:#1a1f2e;color:#22c55e;font-size:12px;font-weight:bold;width:26px;height:26px;border-radius:50%;text-align:center;line-height:26px;">2</div>
        </td>
        <td valign="top" style="padding-left:12px;">
          <p style="margin:0 0 6px;font-size:14px;font-weight:bold;color:#1a1f2e;">Your mother's cell phone number</p>
          <p style="margin:0 0 8px;font-size:13px;color:#374151;line-height:1.7;">
            Send her number so André can contact her if an emergency cannot be resolved through your local ICE contact.
            If she lives overseas, include the full country code.
          </p>
          <p style="margin:0 0 16px;font-size:12px;color:#6b7280;background:#f9fafb;border:1px solid #e5e7eb;padding:8px 12px;display:inline-block;">
            💬 <em>Local example:</em> &nbsp;<strong>082 555 7890</strong><br>
            💬 <em>Overseas example:</em> &nbsp;<strong>+44 7911 123456</strong><br>
            ↩ <em>Prefer not to share? Reply</em> <strong>SKIP</strong>
          </p>
        </td>
      </tr>
    </table>
  </div>

  <!-- Question 3 -->
  <div style="padding:16px 36px 0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="36" valign="top" style="padding-top:2px;">
          <div style="background:#1a1f2e;color:#22c55e;font-size:12px;font-weight:bold;width:26px;height:26px;border-radius:50%;text-align:center;line-height:26px;">3</div>
        </td>
        <td valign="top" style="padding-left:12px;">
          <p style="margin:0 0 6px;font-size:14px;font-weight:bold;color:#1a1f2e;">A front-facing photo of your car 📸</p>
          <p style="margin:0 0 8px;font-size:13px;color:#374151;line-height:1.7;">
            André needs to recognise your vehicle on the road. Take a photo from the <strong>front</strong> of the car so that the following are clearly visible:
          </p>
          <ul style="margin:0 0 8px;padding-left:20px;font-size:13px;color:#374151;line-height:1.9;">
            <li>Colour of the vehicle</li>
            <li>Make and model (e.g. Suzuki Ignis, Toyota Corolla)</li>
            <li><strong>Registration plate</strong> — must be readable in the photo</li>
          </ul>
          <p style="margin:0 0 8px;font-size:13px;color:#374151;line-height:1.7;">
            Simply take the photo on your phone and send it in the WhatsApp chat — exactly like you would send any other picture.
            You can send more than one photo if you like (e.g. front and rear).
          </p>
          <p style="margin:0 0 8px;font-size:12px;color:#6b7280;background:#f9fafb;border:1px solid #e5e7eb;padding:8px 12px;">
            ↩ <em>Don't have a photo right now? Reply</em> <strong>SKIP</strong> <em>and come back when you're next at your car.</em>
          </p>
          <p style="margin:0 0 6px;font-size:13px;font-weight:bold;color:#1a1f2e;">Then describe your vehicle in words:</p>
          <p style="margin:0 0 8px;font-size:13px;color:#374151;line-height:1.7;">
            After the photo the chatbot will ask for a short text description — colour, make, model and registration number.
          </p>
          <p style="margin:0 0 16px;font-size:12px;color:#6b7280;background:#f9fafb;border:1px solid #e5e7eb;padding:8px 12px;display:inline-block;">
            💬 <em>Example:</em> &nbsp;<strong>Silver Suzuki Ignis, HR 44 YK GP</strong><br>
            ↩ <em>Want to skip? Reply</em> <strong>SKIP</strong>
          </p>
        </td>
      </tr>
    </table>
  </div>

  <!-- Divider -->
  <div style="margin:16px 36px;border-top:2px solid #dcfce7;"></div>

  <!-- Live location section -->
  <div style="padding:0 36px 24px;">
    <p style="margin:0 0 8px;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#16a34a;">EVERY TIME YOU LEAVE HOME</p>
    <p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.75;">
      Once your safety profile is set up, the most important thing you can do every time you travel is to
      <strong>share your live WhatsApp location</strong> with André for 8 hours.
      This is how Cyber Chaperone monitors your journey in real time.
    </p>
    <div style="background:#1a1f2e;border-radius:4px;padding:16px 20px;margin-bottom:12px;">
      <p style="margin:0 0 10px;font-size:12px;font-weight:bold;letter-spacing:1px;color:#22c55e;text-transform:uppercase;">How to share your live location</p>
      <p style="margin:0 0 6px;font-size:13px;color:#d1fae5;">1. Open your WhatsApp chat with André (+27 82 561 1065)</p>
      <p style="margin:0 0 6px;font-size:13px;color:#d1fae5;">2. Tap the 📎 attachment icon (bottom left)</p>
      <p style="margin:0 0 6px;font-size:13px;color:#d1fae5;">3. Select <strong style="color:#22c55e;">Location</strong></p>
      <p style="margin:0 0 6px;font-size:13px;color:#d1fae5;">4. Choose <strong style="color:#22c55e;">Share Live Location</strong></p>
      <p style="margin:0 0 6px;font-size:13px;color:#d1fae5;">5. Set the duration to <strong style="color:#22c55e;">8 hours</strong></p>
      <p style="margin:0;font-size:13px;color:#d1fae5;">6. Tap <strong style="color:#22c55e;">Send</strong> ✅</p>
    </div>
    <p style="margin:0 0 20px;font-size:13px;color:#6b7280;line-height:1.6;">
      You can share your location before you leave, and the Situation Room team will be watching over you the whole way.
    </p>
  </div>

  <!-- Divider -->
  <div style="margin:0 36px;border-top:2px solid #dcfce7;"></div>

  <!-- Help -->
  <div style="padding:24px 36px;">
    <p style="margin:0 0 8px;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#6b7280;">NEED HELP?</p>
    <p style="margin:0 0 12px;font-size:13px;color:#374151;line-height:1.7;">
      WhatsApp André directly on <a href="${waLink}" style="color:#16a34a;font-weight:bold;">+27 82 561 1065</a> at any time.
      You can also reply to this email and it will reach the team.
    </p>
    <p style="margin:0;font-size:13px;color:#374151;line-height:1.7;">
      Stay safe out there. We've got you. 🛡️
    </p>
    <p style="margin:16px 0 0;font-size:13px;color:#1a1f2e;"><strong>André Snyman</strong></p>
    <p style="margin:2px 0 0;font-size:12px;color:#6b7280;">eblockwatch · Cyber Chaperone</p>
  </div>

  <!-- Footer -->
  <div style="background:#1a1f2e;padding:16px 36px;text-align:center;">
    <div style="color:#374151;font-size:10px;letter-spacing:1px;text-transform:uppercase;line-height:1.9;">
      eblockwatch · Cyber Chaperone Safety Network<br>
      <a href="https://eblockwatch.co.za" style="color:#22c55e;text-decoration:none;">eblockwatch.co.za</a>
      &nbsp;·&nbsp;
      <a href="https://www.facebook.com/eblockwatchnational" style="color:#22c55e;text-decoration:none;">Facebook</a>
      &nbsp;·&nbsp;
      <a href="https://www.instagram.com/eblockwatch/" style="color:#22c55e;text-decoration:none;">Instagram</a>
      &nbsp;·&nbsp;
      <a href="${waLink}" style="color:#22c55e;text-decoration:none;">WhatsApp André</a>
    </div>
  </div>

</div>
</body>
</html>`;

  const text = [
    `Welcome to eblockwatch, ${display}!`,
    ``,
    `You are now registered with the Cyber Chaperone safety network.`,
    ``,
    `NEXT STEP: Complete your Safety Profile`,
    `Open WhatsApp and message +27 82 561 1065`,
    `Reply 4 (Update my profile) then 8 (Safety questionnaire).`,
    ``,
    `The chatbot will ask you:`,
    `1. Your mother's full name (type SKIP if not applicable)`,
    `2. Your mother's cell phone number, including country code if overseas (type SKIP if preferred)`,
    `3. A front-facing photo of your car — colour, make, model and registration plate must be visible (type SKIP to do later)`,
    `   Then a short text description: e.g. Silver Suzuki Ignis, HR 44 YK GP`,
    ``,
    `EVERY TIME YOU LEAVE HOME:`,
    `Share your live WhatsApp location with André for 8 hours.`,
    `In WhatsApp: tap 📎 → Location → Share Live Location → 8 hours → Send.`,
    ``,
    `Need help? WhatsApp Andre: +27 82 561 1065`,
    ``,
    `Stay safe. We've got you.`,
    `André Snyman — eblockwatch / Cyber Chaperone`,
  ].join("\n");

  await sendRawEmail(
    `Welcome to eblockwatch, ${display}! Your safety profile awaits 🛡️`,
    html,
    text,
    toEmail,
    OPERATOR_EMAIL,   // CC André's Gmail so he sees every welcome email sent
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
