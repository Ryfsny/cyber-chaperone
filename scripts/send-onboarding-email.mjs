/**
 * Onboarding email — sent to new eblockwatch members after sign-up.
 * Explains exactly how to use Cyber Chaperone on WhatsApp.
 *
 * Run: node scripts/send-onboarding-email.mjs
 */
import nodemailer from "nodemailer";

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
  console.error("Missing GMAIL_USER or GMAIL_APP_PASSWORD");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
});

const SUBJECT = "📧 DRAFT — Cyber Chaperone onboarding email (how to use it)";

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Welcome to Cyber Chaperone</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

<!-- DRAFT BANNER -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fef9c3;border-bottom:2px solid #fde047;">
<tr><td style="padding:12px 24px;text-align:center;">
  <strong style="color:#854d0e;font-size:13px;">⚠️ DRAFT — Onboarding email for André to review before sending to new members.</strong>
</td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px;">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;">

  <!-- HEADER -->
  <tr>
    <td style="background:#1a1f2e;border-radius:16px 16px 0 0;padding:40px 40px 32px;text-align:center;">
      <img src="https://cyber-chaperone-r--ryfsny.replit.app/website/eblockwatch-logo.png"
           alt="eblockwatch" height="52" style="display:block;margin:0 auto 20px;">
      <div style="background:#22c55e;height:3px;width:64px;margin:0 auto 24px;border-radius:2px;"></div>
      <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;line-height:1.25;">
        Welcome to Cyber Chaperone. 🛡️
      </h1>
      <p style="margin:16px 0 0;color:#86efac;font-size:16px;font-weight:500;line-height:1.5;">
        You're all set up. Here's everything you need to know —<br>
        in plain language, step by step.
      </p>
    </td>
  </tr>

  <!-- BODY -->
  <tr>
    <td style="background:#ffffff;padding:44px 40px;">

      <p style="margin:0 0 18px;font-size:16px;color:#1a1f2e;line-height:1.7;">Hi [First Name],</p>

      <p style="margin:0 0 18px;font-size:16px;color:#374151;line-height:1.7;">
        Welcome to the eblockwatch family. Your membership is active and Cyber Chaperone is ready for you right now — no downloads, no setup, no complicated menus to memorise.
      </p>
      <p style="margin:0 0 32px;font-size:16px;color:#374151;line-height:1.7;">
        Everything runs through <strong>WhatsApp</strong>. This email shows you exactly how.
      </p>

      <!-- DIVIDER -->
      <div style="border-top:2px solid #f0fdf4;margin:0 0 36px;"></div>


      <!-- ── STEP 1: START THE MENU ── -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
        <tr>
          <td width="40" valign="top" style="padding-top:2px;">
            <div style="background:#22c55e;border-radius:50%;width:32px;height:32px;text-align:center;line-height:32px;font-size:15px;font-weight:800;color:#ffffff;">1</div>
          </td>
          <td style="padding-left:16px;">
            <h2 style="margin:0 0 10px;font-size:18px;font-weight:800;color:#1a1f2e;">Open WhatsApp and say hello.</h2>
            <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.65;">
              Save the eblockwatch number in your phone, then send us the word <strong>Hi</strong>. The main menu opens immediately.
            </p>

            <!-- Phone number box -->
            <div style="background:#f0fdf4;border:2px solid #22c55e;border-radius:10px;padding:16px 20px;margin-bottom:16px;text-align:center;">
              <p style="margin:0 0 4px;font-size:12px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Save this number as "eblockwatch"</p>
              <p style="margin:0;font-size:24px;font-weight:800;color:#1a1f2e;font-family:monospace;letter-spacing:2px;">+27 82 561 1065</p>
            </div>

            <!-- Menu preview -->
            <div style="background:#1a1f2e;border-radius:12px;padding:20px 24px;">
              <p style="margin:0 0 10px;font-size:12px;color:#86efac;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Main Menu — what you'll see on WhatsApp</p>
              <p style="margin:0;font-size:14px;color:#e2e8f0;line-height:2;font-family:monospace;">
                1️⃣ &nbsp;Start a trip<br>
                2️⃣ &nbsp;I'm going out tonight<br>
                3️⃣ &nbsp;Scare Bear alert<br>
                4️⃣ &nbsp;Emergency / SOS<br>
                5️⃣ &nbsp;My profile &amp; ICE contact<br>
                0️⃣ &nbsp;Back to this menu anytime
              </p>
            </div>
          </td>
        </tr>
      </table>


      <!-- ── STEP 2: START A TRIP ── -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
        <tr>
          <td width="40" valign="top" style="padding-top:2px;">
            <div style="background:#22c55e;border-radius:50%;width:32px;height:32px;text-align:center;line-height:32px;font-size:15px;font-weight:800;color:#ffffff;">2</div>
          </td>
          <td style="padding-left:16px;">
            <h2 style="margin:0 0 10px;font-size:18px;font-weight:800;color:#1a1f2e;">Start a monitored drive — reply 1.</h2>
            <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.65;">
              When you choose <strong>1</strong>, we ask you three simple things:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
              <tr>
                <td style="padding:8px 14px;background:#f9fafb;border-radius:8px 8px 0 0;border-bottom:1px solid #e5e7eb;">
                  <span style="font-size:14px;color:#374151;font-weight:600;">📍 Where are you starting from?</span>
                  <span style="font-size:13px;color:#9ca3af;display:block;margin-top:2px;">e.g. "Home, Bryanston" or just your suburb</span>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 14px;background:#f9fafb;border-bottom:1px solid #e5e7eb;">
                  <span style="font-size:14px;color:#374151;font-weight:600;">🏁 Where are you going?</span>
                  <span style="font-size:13px;color:#9ca3af;display:block;margin-top:2px;">e.g. "Sandton City" or "Mum's place, Midrand"</span>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 14px;background:#f9fafb;border-radius:0 0 8px 8px;">
                  <span style="font-size:14px;color:#374151;font-weight:600;">⏰ What time will you arrive?</span>
                  <span style="font-size:13px;color:#9ca3af;display:block;margin-top:2px;">e.g. "About 45 minutes" or "By 6pm"</span>
                </td>
              </tr>
            </table>
            <p style="margin:0;font-size:15px;color:#374151;line-height:1.65;">
              That's it. We confirm your trip is live, calculate the route, and start watching. The Situation Room board turns <strong style="color:#22c55e;">green</strong>. You drive.
            </p>
          </td>
        </tr>
      </table>


      <!-- ── STEP 3: CHECK-INS ── -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
        <tr>
          <td width="40" valign="top" style="padding-top:2px;">
            <div style="background:#f59e0b;border-radius:50%;width:32px;height:32px;text-align:center;line-height:32px;font-size:15px;font-weight:800;color:#ffffff;">3</div>
          </td>
          <td style="padding-left:16px;">
            <h2 style="margin:0 0 10px;font-size:18px;font-weight:800;color:#1a1f2e;">What happens if you're running late.</h2>
            <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.65;">
              If we notice your estimated arrival time is drifting and we haven't heard from you, we'll send a check-in message. You'll see six choices:
            </p>
            <div style="background:#1a1f2e;border-radius:12px;padding:18px 22px;margin-bottom:14px;">
              <p style="margin:0 0 8px;font-size:12px;color:#86efac;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Check-in message — reply with a number</p>
              <p style="margin:0;font-size:14px;color:#e2e8f0;line-height:2;font-family:monospace;">
                1️⃣ &nbsp;I've arrived safely ✅<br>
                2️⃣ &nbsp;I'm fine, just delayed<br>
                3️⃣ &nbsp;New ETA — let me update it<br>
                4️⃣ &nbsp;I need assistance (not urgent)<br>
                5️⃣ &nbsp;EMERGENCY — alert my ICE contact 🆘<br>
                6️⃣ &nbsp;Cancel this trip
              </p>
            </div>
            <p style="margin:0;font-size:15px;color:#374151;line-height:1.65;">
              Just tap a number. If you don't respond at all after further time has passed, we escalate automatically and contact your emergency person.
            </p>
          </td>
        </tr>
      </table>


      <!-- ── STEP 4: SOS ── -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
        <tr>
          <td width="40" valign="top" style="padding-top:2px;">
            <div style="background:#ef4444;border-radius:50%;width:32px;height:32px;text-align:center;line-height:32px;font-size:15px;font-weight:800;color:#ffffff;">4</div>
          </td>
          <td style="padding-left:16px;">
            <h2 style="margin:0 0 10px;font-size:18px;font-weight:800;color:#1a1f2e;">In an emergency — any of these will trigger help.</h2>
            <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.65;">
              You never need to remember a specific code. Any of the following will immediately escalate your situation and WhatsApp your registered emergency contact with your location:
            </p>
            <!-- Emergency trigger words -->
            <div style="background:#fef2f2;border:2px solid #fca5a5;border-radius:10px;padding:16px 20px;margin-bottom:14px;">
              <p style="margin:0 0 8px;font-size:13px;color:#991b1b;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Type any of these at any time</p>
              <p style="margin:0;font-size:18px;font-weight:800;color:#dc2626;font-family:monospace;letter-spacing:3px;line-height:2;">
                HELP &nbsp;·&nbsp; SOS &nbsp;·&nbsp; EMERGENCY &nbsp;·&nbsp; 911
              </p>
            </div>
            <div style="background:#f0fdf4;border-left:3px solid #22c55e;border-radius:0 8px 8px 0;padding:12px 16px;">
              <p style="margin:0;font-size:14px;color:#15803d;line-height:1.6;">
                ✅ Your ICE contact is WhatsApped immediately with your name, situation, and a live Google Maps link to your location.<br>
                ✅ André is alerted in parallel.<br>
                ✅ Your trip status turns RED in the Situation Room.
              </p>
            </div>
          </td>
        </tr>
      </table>


      <!-- ── STEP 5: SCARE BEAR ── -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
        <tr>
          <td width="40" valign="top" style="padding-top:2px;">
            <div style="background:#f97316;border-radius:50%;width:32px;height:32px;text-align:center;line-height:32px;font-size:15px;font-weight:800;color:#ffffff;">5</div>
          </td>
          <td style="padding-left:16px;">
            <h2 style="margin:0 0 10px;font-size:18px;font-weight:800;color:#1a1f2e;">Scare Bear — report something suspicious.</h2>
            <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.65;">
              See a suspicious vehicle, illegal roadblock, or dangerous situation on the road? Report it in seconds and warn the whole network — anonymously.
            </p>

            <div style="background:#fff7ed;border:2px solid #fed7aa;border-radius:10px;padding:16px 20px;margin-bottom:16px;">
              <p style="margin:0 0 8px;font-size:13px;color:#9a3412;font-weight:700;text-transform:uppercase;letter-spacing:1px;">How to report — reply 3 from the main menu</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:6px 0;border-bottom:1px solid #fed7aa;">
                    <span style="font-size:14px;color:#374151;font-weight:600;">1. What type of incident?</span>
                    <span style="font-size:13px;color:#9ca3af;display:block;">Suspicious vehicle / Roadblock / Accident / Other</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;border-bottom:1px solid #fed7aa;">
                    <span style="font-size:14px;color:#374151;font-weight:600;">2. Describe what you saw.</span>
                    <span style="font-size:13px;color:#9ca3af;display:block;">Type it or send a quick voice note — we transcribe it automatically</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:6px 0;">
                    <span style="font-size:14px;color:#374151;font-weight:600;">3. Where is it?</span>
                    <span style="font-size:13px;color:#9ca3af;display:block;">Drop a WhatsApp pin, or say it in plain language — "near the Clay Oven, Bryanston". We'll find it on the map and send you a pin to confirm.</span>
                  </td>
                </tr>
              </table>
            </div>
            <p style="margin:0;font-size:15px;color:#374151;line-height:1.65;">
              Once confirmed, your report is pinned on the eblockwatch map and the network is alerted. Your name is never shared.
            </p>
          </td>
        </tr>
      </table>


      <!-- ── STEP 6: ICE CONTACT ── -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
        <tr>
          <td width="40" valign="top" style="padding-top:2px;">
            <div style="background:#3b82f6;border-radius:50%;width:32px;height:32px;text-align:center;line-height:32px;font-size:15px;font-weight:800;color:#ffffff;">6</div>
          </td>
          <td style="padding-left:16px;">
            <h2 style="margin:0 0 10px;font-size:18px;font-weight:800;color:#1a1f2e;">Set your ICE contact. Do this first.</h2>
            <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.65;">
              Your ICE contact (<em>In Case of Emergency</em>) is the person we WhatsApp if you ever stop responding or trigger an SOS. This should be a trusted family member or close friend who is reachable 24/7.
            </p>
            <div style="background:#eff6ff;border:2px solid #bfdbfe;border-radius:10px;padding:16px 20px;margin-bottom:14px;">
              <p style="margin:0 0 8px;font-size:13px;color:#1e40af;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Two ways to set your ICE contact</p>
              <p style="margin:0;font-size:14px;color:#374151;line-height:1.9;">
                📱 <strong>On WhatsApp:</strong> Choose 5 from the main menu → "My Profile &amp; ICE Contact" → follow the prompts<br>
                💻 <strong>On the website:</strong> Log in to your member portal and update it in your profile
              </p>
            </div>
            <div style="background:#f0fdf4;border-left:3px solid #22c55e;border-radius:0 8px 8px 0;padding:12px 16px;">
              <p style="margin:0;font-size:14px;color:#15803d;font-weight:600;">
                ⚡ Important: The system works best when your ICE contact is set. Please do this before your first trip.
              </p>
            </div>
          </td>
        </tr>
      </table>


      <!-- DIVIDER -->
      <div style="border-top:2px solid #f0fdf4;margin:0 0 36px;"></div>


      <!-- ── QUICK REFERENCE CARD ── -->
      <div style="background:#1a1f2e;border-radius:14px;padding:28px 32px;margin-bottom:36px;">
        <h2 style="margin:0 0 18px;font-size:17px;font-weight:800;color:#86efac;text-transform:uppercase;letter-spacing:0.5px;">🗂️ Quick Reference — save this card</h2>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:7px 0;border-bottom:1px solid #2d3748;">
              <span style="font-size:14px;color:#e2e8f0;font-weight:700;">Send "Hi"</span>
              <span style="font-size:14px;color:#9ca3af;float:right;">Open the main menu</span>
            </td>
          </tr>
          <tr>
            <td style="padding:7px 0;border-bottom:1px solid #2d3748;">
              <span style="font-size:14px;color:#e2e8f0;font-weight:700;">Reply 1</span>
              <span style="font-size:14px;color:#9ca3af;float:right;">Start a monitored trip</span>
            </td>
          </tr>
          <tr>
            <td style="padding:7px 0;border-bottom:1px solid #2d3748;">
              <span style="font-size:14px;color:#e2e8f0;font-weight:700;">Reply 2</span>
              <span style="font-size:14px;color:#9ca3af;float:right;">Going Out mode</span>
            </td>
          </tr>
          <tr>
            <td style="padding:7px 0;border-bottom:1px solid #2d3748;">
              <span style="font-size:14px;color:#e2e8f0;font-weight:700;">Reply 3</span>
              <span style="font-size:14px;color:#9ca3af;float:right;">Scare Bear road alert</span>
            </td>
          </tr>
          <tr>
            <td style="padding:7px 0;border-bottom:1px solid #2d3748;">
              <span style="font-size:14px;color:#e2e8f0;font-weight:700;">Reply 4 / HELP / SOS</span>
              <span style="font-size:14px;color:#ef4444;float:right;font-weight:700;">Emergency — ICE alerted immediately</span>
            </td>
          </tr>
          <tr>
            <td style="padding:7px 0;border-bottom:1px solid #2d3748;">
              <span style="font-size:14px;color:#e2e8f0;font-weight:700;">Reply 5</span>
              <span style="font-size:14px;color:#9ca3af;float:right;">My profile &amp; ICE contact</span>
            </td>
          </tr>
          <tr>
            <td style="padding:7px 0;">
              <span style="font-size:14px;color:#e2e8f0;font-weight:700;">Send "0" or "Menu"</span>
              <span style="font-size:14px;color:#9ca3af;float:right;">Return to main menu anytime</span>
            </td>
          </tr>
        </table>
      </div>


      <!-- ── CTA ── -->
      <p style="margin:0 0 20px;font-size:16px;color:#374151;line-height:1.7;text-align:center;">
        Ready to try it? Send us <strong>Hi</strong> on WhatsApp right now.<br>
        It takes 30 seconds and it could save your life.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
        <tr>
          <td align="center">
            <a href="https://wa.me/27825611065?text=Hi"
               style="display:inline-block;background:#22c55e;color:#ffffff;text-decoration:none;font-size:17px;font-weight:800;padding:18px 48px;border-radius:12px;box-shadow:0 4px 14px rgba(34,197,94,0.35);">
              📱 &nbsp;Open WhatsApp &amp; Send "Hi"
            </a>
          </td>
        </tr>
      </table>


      <!-- DIVIDER -->
      <div style="border-top:2px solid #f0fdf4;margin:0 0 32px;"></div>


      <!-- CLOSING -->
      <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.7;">
        Any questions at all — reply to this email or just send us a WhatsApp. We're here.
      </p>
      <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.7;">
        Welcome to the safest community on South African roads.
      </p>

      <!-- SIGNATURE -->
      <div style="border-top:2px solid #f0fdf4;padding-top:28px;margin-top:28px;">
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

  <!-- FOOTER -->
  <tr>
    <td style="background:#1a1f2e;border-radius:0 0 16px 16px;padding:28px 40px;text-align:center;">
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
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
      <p style="margin:0 0 6px;font-size:12px;color:#6b7280;">© 2026 eblockwatch (Pty) Ltd. All rights reserved.</p>
      <p style="margin:0;font-size:12px;color:#6b7280;">
        You received this because you recently joined eblockwatch.
        &nbsp;<a href="#" style="color:#86efac;text-decoration:none;">Unsubscribe</a>
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>

</body>
</html>`;

const PLAIN = `Hi [First Name],

Welcome to eblockwatch. Your Cyber Chaperone is active and ready to go — right inside WhatsApp, no app needed.

Here's everything you need to know.


STEP 1 — SAVE OUR NUMBER & SAY HELLO
──────────────────────────────────────
Save this number in your phone as "eblockwatch":  +27 82 561 1065
Then open WhatsApp and send:  Hi

The main menu opens immediately:
  1 — Start a trip
  2 — I'm going out tonight
  3 — Scare Bear road alert
  4 — Emergency / SOS
  5 — My profile & ICE contact
  0 — Back to this menu anytime


STEP 2 — START A MONITORED DRIVE (Reply 1)
──────────────────────────────────────────
We'll ask you three things:
  • Where are you starting from? (e.g. "Home, Bryanston")
  • Where are you going? (e.g. "Sandton City")
  • When will you arrive? (e.g. "About 45 minutes")

That's it. Your trip is live. The Situation Room is watching.


STEP 3 — IF YOU'RE RUNNING LATE
──────────────────────────────────────
If your ETA drifts, we send a check-in. Reply with a number:
  1 — I've arrived safely ✅
  2 — I'm fine, just delayed
  3 — New ETA — let me update it
  4 — I need assistance (not urgent)
  5 — EMERGENCY — alert my ICE contact 🆘
  6 — Cancel this trip


STEP 4 — EMERGENCY
──────────────────────────────────────
Type any of these at ANY time:  HELP  SOS  EMERGENCY  911

What happens next (within seconds):
  ✅ Your ICE contact is WhatsApped with your name, situation & GPS location
  ✅ André is alerted in parallel
  ✅ Your trip turns RED in the Situation Room


STEP 5 — SCARE BEAR (Reply 3)
──────────────────────────────────────
See something suspicious on the road? Report it anonymously.
  1. What type of incident?
  2. Describe what you saw (type it or send a voice note)
  3. Where is it? (drop a WhatsApp pin OR say it — "near the Discovery building, Bryanston" and we'll find it)

Your report is pinned on the eblockwatch map. Network alerted. Your name never shared.


STEP 6 — SET YOUR ICE CONTACT FIRST
──────────────────────────────────────
Reply 5 from the main menu → "My Profile & ICE Contact"
OR log into your member portal and update it there.

Please do this before your first trip.


QUICK REFERENCE
──────────────────────────────────────
Send "Hi"              → Open main menu
Reply 1                → Start a monitored trip
Reply 2                → Going Out mode
Reply 3                → Scare Bear alert
Reply 4 / HELP / SOS   → EMERGENCY — ICE contacted immediately
Reply 5                → My profile & ICE contact
Send "0" or "Menu"     → Return to main menu anytime


Any questions — reply to this email or send us a WhatsApp.

Welcome to the safest community on South African roads.

André Snyman
Founder & Director, eblockwatch
WhatsApp: +27 82 561 1065

──────────────────────────────────────
🛡️ eblockwatch — Keeping South Africa Safe for Over 20 Years
© 2026 eblockwatch (Pty) Ltd. All rights reserved.`;

try {
  const info = await transporter.sendMail({
    from:    `"eblockwatch Cyber Chaperone" <${GMAIL_USER}>`,
    to:      GMAIL_USER,
    subject: SUBJECT,
    text:    PLAIN,
    html:    HTML,
  });
  console.log("✅ Onboarding email sent to", GMAIL_USER);
  console.log("Message ID:", info.messageId);
  console.log("Response:", info.response);
} catch (err) {
  console.error("❌ Failed:", err.message);
  process.exit(1);
}
