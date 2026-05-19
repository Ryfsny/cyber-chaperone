/**
 * One-shot script: sends the Cyber Chaperone marketing email to André's own
 * Gmail address so it lands in his inbox as a reviewable draft.
 *
 * Run: node scripts/send-cyber-chaperone-email-draft.mjs
 */
import nodemailer from "nodemailer";

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
  console.error("Missing GMAIL_USER or GMAIL_APP_PASSWORD env vars");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
});

// ── Subject & preview text ─────────────────────────────────────────────────────

const SUBJECT = "📧 DRAFT — Cyber Chaperone member email (review before sending)";

// ── HTML body ──────────────────────────────────────────────────────────────────

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Cyber Chaperone — Member Email</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

<!-- ── DRAFT BANNER ── -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fef9c3;border-bottom:2px solid #fde047;">
<tr><td style="padding:12px 24px;text-align:center;">
  <strong style="color:#854d0e;font-size:13px;">⚠️ DRAFT — This is a preview for André to review before sending to members.</strong>
</td></tr>
</table>

<!-- ── EMAIL WRAPPER ── -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px;">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;">

  <!-- ── HEADER ── -->
  <tr>
    <td style="background:#1a1f2e;border-radius:16px 16px 0 0;padding:40px 40px 36px;text-align:center;">
      <img src="https://cyber-chaperone-r--ryfsny.replit.app/website/eblockwatch-logo.png"
           alt="eblockwatch" height="56" style="display:block;margin:0 auto 20px;">
      <div style="background:#22c55e;height:3px;width:64px;margin:0 auto 28px;border-radius:2px;"></div>
      <h1 style="margin:0;color:#ffffff;font-size:30px;font-weight:800;letter-spacing:-0.5px;line-height:1.25;">
        You Are Never Alone<br>on the Road.
      </h1>
      <p style="margin:18px 0 0;color:#86efac;font-size:16px;font-weight:500;line-height:1.5;">
        Introducing <strong>Cyber Chaperone</strong> — eblockwatch's most powerful<br>safety tool. And it lives right inside WhatsApp.
      </p>
    </td>
  </tr>

  <!-- ── BODY ── -->
  <tr>
    <td style="background:#ffffff;padding:44px 40px;">

      <p style="margin:0 0 20px;font-size:16px;color:#1a1f2e;line-height:1.7;">Dear eblockwatch Member,</p>

      <p style="margin:0 0 18px;font-size:16px;color:#374151;line-height:1.7;">
        I want to tell you about something we built — because someone had to.
      </p>
      <p style="margin:0 0 18px;font-size:16px;color:#374151;line-height:1.7;">
        Every day, South Africans drive alone. Women heading home after dark. Parents cutting through unfamiliar areas. Teenagers on their first long road trip. Elderly members doing the school run. And every single one of them carries the same quiet fear:
      </p>

      <!-- ── PULLQUOTE ── -->
      <div style="border-left:4px solid #22c55e;background:#f0fdf4;padding:18px 24px;border-radius:0 8px 8px 0;margin:0 0 28px;">
        <p style="margin:0;font-size:18px;font-weight:700;color:#1a1f2e;font-style:italic;line-height:1.5;">
          "What if something happens — and nobody knows where I am?"
        </p>
      </div>

      <p style="margin:0 0 18px;font-size:16px;color:#374151;line-height:1.7;">
        <strong style="color:#1a1f2e;">Cyber Chaperone</strong> is our answer to that fear. No app to download. No subscription box. No expensive gadget. Just <strong>WhatsApp</strong> — which you already use a hundred times a day — wired directly into eblockwatch's 24-hour Situation Room.
      </p>
      <p style="margin:0 0 36px;font-size:16px;color:#374151;line-height:1.7;">
        We watch. So you can drive.
      </p>

      <!-- ── DIVIDER ── -->
      <div style="border-top:2px solid #f0fdf4;margin:0 0 36px;"></div>

      <!-- ── FEATURE HEADLINE ── -->
      <h2 style="margin:0 0 24px;font-size:22px;font-weight:800;color:#1a1f2e;">Here's exactly what it does for you.</h2>

      <!-- FEATURE 1 -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr>
          <td width="56" valign="top">
            <div style="background:#22c55e;border-radius:14px;width:48px;height:48px;text-align:center;line-height:48px;font-size:24px;">🚗</div>
          </td>
          <td style="padding-left:16px;">
            <p style="margin:0 0 6px;font-size:16px;font-weight:800;color:#1a1f2e;">One message starts a monitored drive.</p>
            <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.65;">
              Tell us where you're going and when you'll arrive. That's it. We log your route, calculate your exact ETA, and the eblockwatch Situation Room starts watching. Quietly. Every single minute. You just drive.
            </p>
          </td>
        </tr>
      </table>

      <!-- FEATURE 2 -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr>
          <td width="56" valign="top">
            <div style="background:#f59e0b;border-radius:14px;width:48px;height:48px;text-align:center;line-height:48px;font-size:24px;">🟡</div>
          </td>
          <td style="padding-left:16px;">
            <p style="margin:0 0 6px;font-size:16px;font-weight:800;color:#1a1f2e;">Running late? We check in before we raise the alarm.</p>
            <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.65;">
              If your ETA drifts with no word from you, we send a check-in message. Six simple choices — from "I'm fine, just traffic" to "I need help." You stay in control at every step. We only escalate if we have to.
            </p>
          </td>
        </tr>
      </table>

      <!-- FEATURE 3 -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr>
          <td width="56" valign="top">
            <div style="background:#ef4444;border-radius:14px;width:48px;height:48px;text-align:center;line-height:48px;font-size:24px;">🆘</div>
          </td>
          <td style="padding-left:16px;">
            <p style="margin:0 0 6px;font-size:16px;font-weight:800;color:#1a1f2e;">One word. Your people are called. Immediately.</p>
            <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.65;">
              Type <strong>HELP</strong> or <strong>SOS</strong> — and within seconds your registered emergency contact receives a WhatsApp with your name, your situation, your exact GPS location, and a Google Maps link to find you. No delay. No middleman. <em>Seconds.</em>
            </p>
          </td>
        </tr>
      </table>

      <!-- FEATURE 4 -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr>
          <td width="56" valign="top">
            <div style="background:#f97316;border-radius:14px;width:48px;height:48px;text-align:center;line-height:48px;font-size:24px;">🐻</div>
          </td>
          <td style="padding-left:16px;">
            <p style="margin:0 0 6px;font-size:16px;font-weight:800;color:#1a1f2e;">Scare Bear — your community's eyes on every road.</p>
            <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.65;">
              See a suspicious vehicle near Kyalami? An illegal roadblock on William Nicol? Send us a voice note — <em>"near the Discovery building, Bryanston"</em> — and we locate the exact spot on a map, send you a pin to confirm, and alert the eblockwatch network. Your identity is never shared. The warning reaches everyone.
            </p>
          </td>
        </tr>
      </table>

      <!-- FEATURE 5 -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
        <tr>
          <td width="56" valign="top">
            <div style="background:#3b82f6;border-radius:14px;width:48px;height:48px;text-align:center;line-height:48px;font-size:24px;">🌙</div>
          </td>
          <td style="padding-left:16px;">
            <p style="margin:0 0 6px;font-size:16px;font-weight:800;color:#1a1f2e;">Going out for the evening? We clock you in when you're home.</p>
            <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.65;">
              Activate "Going Out" mode before you leave. Set your return time. If we don't hear from you — we reach out. And if you don't respond, we escalate. Because the worst time to think about your safety plan is when you need one.
            </p>
          </td>
        </tr>
      </table>

      <!-- ── DIVIDER ── -->
      <div style="border-top:2px solid #f0fdf4;margin:0 0 36px;"></div>

      <!-- ── WHY WE BUILT IT ── -->
      <div style="background:#1a1f2e;border-radius:14px;padding:32px 36px;margin-bottom:36px;">
        <h2 style="margin:0 0 18px;font-size:20px;font-weight:800;color:#86efac;">Why we built this.</h2>
        <p style="margin:0 0 16px;font-size:15px;color:#e2e8f0;line-height:1.75;">
          eblockwatch has been keeping South African communities safe for over 20 years. In that time we've learned one thing above all else:
        </p>
        <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#ffffff;line-height:1.6;font-style:italic;">
          "The moment between something happening and someone knowing about it — that is the most dangerous moment of all."
        </p>
        <p style="margin:0 0 16px;font-size:15px;color:#e2e8f0;line-height:1.75;">
          We built Cyber Chaperone to close that gap. Not with a new app. Not with expensive hardware. With the tool that's already in your pocket — the one you use a hundred times a day.
        </p>
        <p style="margin:0;font-size:15px;color:#e2e8f0;line-height:1.75;">
          We are the people who <em>watch the screen so you can drive</em>. We are the message that reaches your daughter's phone before she even knows to worry. We are the call that gets made when you can't make it yourself.
        </p>
      </div>

      <!-- ── TESTIMONIAL ── -->
      <div style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:0 10px 10px 0;padding:22px 28px;margin-bottom:36px;">
        <p style="margin:0 0 10px;font-size:15px;color:#374151;line-height:1.75;font-style:italic;">
          "I started a trip from Johannesburg to Durban. An hour in, I was stuck in traffic and completely forgot to check in. Before I could even think to send a message — my phone buzzed. eblockwatch already knew. By the time I replied 'I'm fine,' my wife hadn't even had a chance to worry. That's when I realised: this isn't just a safety app. It's peace of mind you set once — and then forget about. Because someone else is watching."
        </p>
        <p style="margin:0;font-size:13px;font-weight:700;color:#16a34a;">— Kieren, eblockwatch Pilot Member</p>
      </div>

      <!-- ── HOW TO START ── -->
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:800;color:#1a1f2e;">How to activate it right now.</h2>
      <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.7;">
        If you're a verified eblockwatch member — you already have access. Open WhatsApp, message us the single word below, and the menu walks you through everything:
      </p>

      <!-- ── SEND HI BOX ── -->
      <div style="background:#f9fafb;border:2px dashed #22c55e;border-radius:12px;padding:20px 28px;margin-bottom:28px;text-align:center;">
        <p style="margin:0 0 8px;font-size:12px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Send this to eblockwatch on WhatsApp</p>
        <p style="margin:0 0 8px;font-size:32px;font-weight:800;color:#1a1f2e;font-family:monospace;letter-spacing:4px;">Hi</p>
        <p style="margin:0;font-size:13px;color:#9ca3af;">Everything is numbered. You can't get it wrong. It takes 30 seconds.</p>
      </div>

      <!-- ── CTA BUTTON ── -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
        <tr>
          <td align="center">
            <a href="https://wa.me/27825611065?text=Hi"
               style="display:inline-block;background:#22c55e;color:#ffffff;text-decoration:none;font-size:17px;font-weight:800;padding:18px 48px;border-radius:12px;letter-spacing:0.2px;box-shadow:0 4px 14px rgba(34,197,94,0.35);">
              📱 &nbsp;Start Cyber Chaperone on WhatsApp
            </a>
          </td>
        </tr>
      </table>

      <!-- ── DIVIDER ── -->
      <div style="border-top:2px solid #f0fdf4;margin:0 0 32px;"></div>

      <!-- ── CLOSING ── -->
      <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.75;">
        We built Cyber Chaperone for every eblockwatch member who has ever driven alone and hoped for the best.
      </p>
      <p style="margin:0 0 16px;font-size:17px;font-weight:700;color:#1a1f2e;line-height:1.6;">
        You deserve better than hope.<br>
        You deserve someone watching.
      </p>
      <p style="margin:0 0 32px;font-size:16px;color:#374151;line-height:1.75;">
        And now — you have us.
      </p>

      <!-- ── SIGNATURE ── -->
      <div style="border-top:2px solid #f0fdf4;padding-top:28px;">
        <p style="margin:0 0 4px;font-size:17px;font-weight:800;color:#1a1f2e;">André Snyman</p>
        <p style="margin:0 0 4px;font-size:14px;color:#6b7280;font-weight:500;">Founder &amp; Director, eblockwatch</p>
        <p style="margin:0 0 20px;font-size:14px;">
          <a href="https://wa.me/27825611065" style="color:#22c55e;text-decoration:none;font-weight:600;">WhatsApp: +27 82 561 1065</a>
        </p>
        <div style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 18px;">
          <p style="margin:0;font-size:13px;color:#15803d;font-weight:700;">🛡️ eblockwatch — Keeping South Africa Safe for Over 20 Years</p>
        </div>
      </div>

    </td>
  </tr>

  <!-- ── FOOTER ── -->
  <tr>
    <td style="background:#1a1f2e;border-radius:0 0 16px 16px;padding:28px 40px;text-align:center;">
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
        <tr>
          <td align="center">
            <a href="https://www.facebook.com/eblockwatch" style="display:inline-block;margin:0 8px;color:#86efac;text-decoration:none;font-size:13px;font-weight:600;">Facebook</a>
            <span style="color:#374151;">|</span>
            <a href="https://www.instagram.com/eblockwatch" style="display:inline-block;margin:0 8px;color:#86efac;text-decoration:none;font-size:13px;font-weight:600;">Instagram</a>
            <span style="color:#374151;">|</span>
            <a href="https://cyber-chaperone-r--ryfsny.replit.app/website/" style="display:inline-block;margin:0 8px;color:#86efac;text-decoration:none;font-size:13px;font-weight:600;">Member Portal</a>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 6px;font-size:12px;color:#6b7280;">
        © 2026 eblockwatch (Pty) Ltd. All rights reserved.
      </p>
      <p style="margin:0;font-size:12px;color:#6b7280;">
        You're receiving this because you're a registered eblockwatch member.
        &nbsp;<a href="#" style="color:#86efac;text-decoration:none;">Unsubscribe</a>
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>

</body>
</html>`;

// ── Plain text fallback ────────────────────────────────────────────────────────

const PLAIN = `Dear eblockwatch Member,

YOU ARE NEVER ALONE ON THE ROAD.

I want to tell you about something we built — because someone had to.

Every day, South Africans drive alone. Women heading home after dark. Parents cutting through unfamiliar areas. Teenagers on their first long road trip. And every one of them carries the same quiet fear: "What if something happens — and nobody knows where I am?"

Cyber Chaperone is our answer.

No app to download. No expensive gadget. Just WhatsApp — wired directly into eblockwatch's 24-hour Situation Room.


WHAT IT DOES FOR YOU
──────────────────────

🚗 ONE MESSAGE STARTS A MONITORED DRIVE
Tell us where you're going and your ETA. We log your route, calculate arrival time, and watch quietly in the background. You just drive.

🟡 RUNNING LATE? WE CHECK IN FIRST.
If your ETA drifts, we send you a check-in message. Six simple choices. You stay in control. We only escalate if we have to.

🆘 ONE WORD. YOUR PEOPLE ARE CALLED. IMMEDIATELY.
Type HELP or SOS — and your emergency contact gets a WhatsApp with your GPS location and a Google Maps link. Seconds. No middleman.

🐻 SCARE BEAR — YOUR COMMUNITY'S EYES ON EVERY ROAD.
See something suspicious? Send a voice note — "near the Discovery building, Bryanston" — we locate the exact spot, send you a pin to confirm, and alert the whole network. Anonymously.

🌙 GOING OUT? WE CLOCK YOU IN WHEN YOU'RE HOME.
Set your return time. If we don't hear from you — we reach out. Simple.


WHY WE BUILT THIS
──────────────────────

eblockwatch has kept South African communities safe for 20 years. We've learned one thing above all:

"The moment between something happening and someone knowing — that is the most dangerous moment of all."

We built Cyber Chaperone to close that gap. Not with a new app. With the tool already in your pocket. WhatsApp.

We are the people who watch the screen so you can drive.


HOW TO START (30 seconds)
──────────────────────

Open WhatsApp and send us:  Hi

That's it. The menu opens. Everything is numbered. You can't get it wrong.

👉 https://wa.me/27825611065?text=Hi

You deserve better than hope.
You deserve someone watching.
And now — you have us.

Warmly,

André Snyman
Founder & Director, eblockwatch
WhatsApp: +27 82 561 1065

────────────────────────────────
🛡️ eblockwatch — Keeping South Africa Safe for Over 20 Years
© 2026 eblockwatch (Pty) Ltd. All rights reserved.`;

// ── Send ──────────────────────────────────────────────────────────────────────

try {
  const info = await transporter.sendMail({
    from: `"eblockwatch Cyber Chaperone" <${GMAIL_USER}>`,
    to:   GMAIL_USER,   // send to self so it lands in inbox as a reviewable draft
    subject: SUBJECT,
    text:    PLAIN,
    html:    HTML,
  });
  console.log("✅ Email sent to", GMAIL_USER);
  console.log("Message ID:", info.messageId);
  console.log("Response:", info.response);
} catch (err) {
  console.error("❌ Failed:", err.message);
  process.exit(1);
}
