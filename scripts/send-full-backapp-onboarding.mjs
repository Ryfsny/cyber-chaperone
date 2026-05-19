/**
 * Full "eblockwatch BackApp" onboarding email — covers the complete
 * WhatsApp system: registration, profile, travel safety, Scare Bear,
 * eblockshop, emergency, Going Out mode.
 *
 * Run: node scripts/send-full-backapp-onboarding.mjs
 */
import nodemailer from "nodemailer";

const GMAIL_USER         = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
  console.error("Missing GMAIL_USER or GMAIL_APP_PASSWORD");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
});

const SUBJECT = "📧 DRAFT — eblockwatch BackApp: Full onboarding (complete WhatsApp menu)";

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>eblockwatch BackApp — Welcome</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

<!-- DRAFT BANNER -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fef9c3;border-bottom:2px solid #fde047;">
<tr><td style="padding:12px 24px;text-align:center;">
  <strong style="color:#854d0e;font-size:13px;">⚠️ DRAFT — Full BackApp onboarding email. Review before sending to members.</strong>
</td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px;">
<tr><td align="center">
<table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;">

  <!-- ── HEADER ── -->
  <tr>
    <td style="background:#1a1f2e;border-radius:16px 16px 0 0;padding:40px 40px 32px;text-align:center;">
      <img src="https://cyber-chaperone-r--ryfsny.replit.app/website/eblockwatch-logo.png"
           alt="eblockwatch" height="56" style="display:block;margin:0 auto 20px;">
      <div style="background:#22c55e;height:3px;width:64px;margin:0 auto 24px;border-radius:2px;"></div>
      <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#86efac;text-transform:uppercase;letter-spacing:2px;">Introducing</p>
      <h1 style="margin:0 0 8px;color:#ffffff;font-size:32px;font-weight:800;letter-spacing:-0.5px;line-height:1.2;">
        eblockwatch BackApp
      </h1>
      <p style="margin:0 0 18px;font-size:15px;color:#86efac;font-weight:500;">
        Powered by <strong>Cyber Chaperone</strong> · Lives inside <strong>WhatsApp</strong>
      </p>
      <p style="margin:0;color:#cbd5e1;font-size:15px;line-height:1.6;">
        Your membership. Your safety. Your community. Your shop.<br>
        <strong style="color:#ffffff;">All of it — right inside WhatsApp.</strong>
      </p>
    </td>
  </tr>

  <!-- ── BODY ── -->
  <tr>
    <td style="background:#ffffff;padding:44px 40px;">

      <p style="margin:0 0 18px;font-size:16px;color:#1a1f2e;line-height:1.7;">Hi [First Name],</p>

      <p style="margin:0 0 18px;font-size:16px;color:#374151;line-height:1.7;">
        Welcome to eblockwatch. You've just unlocked the <strong>eblockwatch BackApp</strong> — our complete member platform, built entirely inside WhatsApp. No app to download. No password to remember. No separate login.
      </p>
      <p style="margin:0 0 32px;font-size:16px;color:#374151;line-height:1.7;">
        Everything eblockwatch has to offer — safety monitoring, your profile, community alerts, the shop, and more — is now one WhatsApp message away, 24 hours a day.
      </p>

      <!-- HOW TO START -->
      <div style="background:#f0fdf4;border:2px solid #22c55e;border-radius:12px;padding:22px 28px;margin-bottom:36px;text-align:center;">
        <p style="margin:0 0 6px;font-size:12px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Save this number. Then send this word.</p>
        <p style="margin:0 0 4px;font-size:22px;font-weight:800;color:#1a1f2e;font-family:monospace;letter-spacing:2px;">+27 82 561 1065</p>
        <p style="margin:0 0 12px;font-size:14px;color:#6b7280;">Save as "eblockwatch" in your contacts</p>
        <div style="background:#22c55e;display:inline-block;border-radius:8px;padding:10px 32px;">
          <span style="font-size:22px;font-weight:800;color:#ffffff;font-family:monospace;letter-spacing:4px;">Hi</span>
        </div>
        <p style="margin:10px 0 0;font-size:13px;color:#9ca3af;">That's all it takes. The full menu opens immediately.</p>
      </div>

      <!-- DIVIDER -->
      <div style="border-top:2px solid #f0fdf4;margin:0 0 36px;"></div>
      <h2 style="margin:0 0 24px;font-size:21px;font-weight:800;color:#1a1f2e;">Here's everything you can do.</h2>


      <!-- ── 1. MY PROFILE & REGISTRATION ── -->
      <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:20px;">
        <div style="background:#1a1f2e;padding:14px 20px;">
          <span style="font-size:20px;">👤</span>
          <span style="font-size:16px;font-weight:800;color:#ffffff;margin-left:10px;">My Profile &amp; Registration</span>
          <span style="float:right;background:#22c55e;color:#ffffff;font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;line-height:20px;">Reply 1</span>
        </div>
        <div style="padding:18px 20px;">
          <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.65;">
            New to eblockwatch? Existing member wanting to update your details? This is where you manage everything about your membership — all from WhatsApp.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:7px 0;border-bottom:1px solid #f3f4f6;">
                <span style="font-size:14px;color:#374151;">📋 <strong>Register as a new member</strong> — step-by-step onboarding via WhatsApp</span>
              </td>
            </tr>
            <tr>
              <td style="padding:7px 0;border-bottom:1px solid #f3f4f6;">
                <span style="font-size:14px;color:#374151;">✏️ <strong>Update your name, address, or contact details</strong></span>
              </td>
            </tr>
            <tr>
              <td style="padding:7px 0;border-bottom:1px solid #f3f4f6;">
                <span style="font-size:14px;color:#374151;">🆘 <strong>Set or change your ICE emergency contact</strong></span>
              </td>
            </tr>
            <tr>
              <td style="padding:7px 0;border-bottom:1px solid #f3f4f6;">
                <span style="font-size:14px;color:#374151;">📧 <strong>Update your email address</strong></span>
              </td>
            </tr>
            <tr>
              <td style="padding:7px 0;">
                <span style="font-size:14px;color:#374151;">💳 <strong>Check your membership tier</strong> — Basic, Individual, or Family</span>
              </td>
            </tr>
          </table>
          <div style="background:#f0fdf4;border-radius:8px;padding:10px 14px;margin-top:14px;">
            <p style="margin:0;font-size:13px;color:#15803d;font-weight:600;">⚡ Set your ICE contact before your first trip — it's how we reach your family in an emergency.</p>
          </div>
        </div>
      </div>


      <!-- ── 2. CYBER CHAPERONE — TRAVEL SAFETY ── -->
      <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:20px;">
        <div style="background:#1a1f2e;padding:14px 20px;">
          <span style="font-size:20px;">🛡️</span>
          <span style="font-size:16px;font-weight:800;color:#ffffff;margin-left:10px;">Cyber Chaperone — Travel Safety</span>
          <span style="float:right;background:#22c55e;color:#ffffff;font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;line-height:20px;">Reply 2</span>
        </div>
        <div style="padding:18px 20px;">
          <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.65;">
            The heart of the BackApp. Start any drive and eblockwatch watches your route in real time from our Situation Room. You are never alone on the road.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:7px 0;border-bottom:1px solid #f3f4f6;">
                <span style="font-size:14px;color:#374151;">🚗 <strong>Start a monitored trip</strong> — tell us where you're going and your ETA</span>
              </td>
            </tr>
            <tr>
              <td style="padding:7px 0;border-bottom:1px solid #f3f4f6;">
                <span style="font-size:14px;color:#374151;">🟡 <strong>Running late?</strong> We check in before we ever raise an alarm</span>
              </td>
            </tr>
            <tr>
              <td style="padding:7px 0;border-bottom:1px solid #f3f4f6;">
                <span style="font-size:14px;color:#374151;">🆘 <strong>SOS from the road</strong> — your ICE contact is WhatsApped with your GPS location instantly</span>
              </td>
            </tr>
            <tr>
              <td style="padding:7px 0;">
                <span style="font-size:14px;color:#374151;">✅ <strong>Arrive safely</strong> — close your trip and the board goes green</span>
              </td>
            </tr>
          </table>
          <div style="background:#f9fafb;border-radius:8px;padding:12px 16px;margin-top:14px;">
            <p style="margin:0 0 4px;font-size:13px;color:#6b7280;font-weight:700;">How a trip message looks:</p>
            <p style="margin:0;font-size:14px;color:#1a1f2e;font-family:monospace;line-height:1.8;">
              "Travelling from Bryanston to Sandton City.<br>
              ETA: 30 minutes."
            </p>
            <p style="margin:8px 0 0;font-size:13px;color:#9ca3af;">We confirm your route, calculate arrival time, and start watching.</p>
          </div>
        </div>
      </div>


      <!-- ── 3. GOING OUT MODE ── -->
      <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:20px;">
        <div style="background:#1a1f2e;padding:14px 20px;">
          <span style="font-size:20px;">🌙</span>
          <span style="font-size:16px;font-weight:800;color:#ffffff;margin-left:10px;">Going Out Tonight</span>
          <span style="float:right;background:#22c55e;color:#ffffff;font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;line-height:20px;">Reply 3</span>
        </div>
        <div style="padding:18px 20px;">
          <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.65;">
            Going to a function, dinner, or event? Activate Going Out mode before you leave. Set the time you expect to be home. We'll check in on you — and escalate if we don't hear back.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:7px 0;border-bottom:1px solid #f3f4f6;">
                <span style="font-size:14px;color:#374151;">📍 Tell us where you're going and when you'll be home</span>
              </td>
            </tr>
            <tr>
              <td style="padding:7px 0;border-bottom:1px solid #f3f4f6;">
                <span style="font-size:14px;color:#374151;">💬 We check in when your time is up</span>
              </td>
            </tr>
            <tr>
              <td style="padding:7px 0;">
                <span style="font-size:14px;color:#374151;">🆘 No response = automatic escalation to your ICE contact</span>
              </td>
            </tr>
          </table>
        </div>
      </div>


      <!-- ── 4. SCARE BEAR ── -->
      <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:20px;">
        <div style="background:#1a1f2e;padding:14px 20px;">
          <span style="font-size:20px;">🐻</span>
          <span style="font-size:16px;font-weight:800;color:#ffffff;margin-left:10px;">Scare Bear — Road Safety Alerts</span>
          <span style="float:right;background:#f97316;color:#ffffff;font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;line-height:20px;">Reply 4</span>
        </div>
        <div style="padding:18px 20px;">
          <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.65;">
            See something suspicious? Warn the whole eblockwatch network in under a minute — anonymously. Works with a voice note, a text, or a dropped WhatsApp pin.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:7px 0;border-bottom:1px solid #f3f4f6;">
                <span style="font-size:14px;color:#374151;">🚨 Suspicious vehicle, illegal roadblock, accident, smash-and-grab</span>
              </td>
            </tr>
            <tr>
              <td style="padding:7px 0;border-bottom:1px solid #f3f4f6;">
                <span style="font-size:14px;color:#374151;">🎤 Send a voice note — we transcribe and locate it automatically</span>
              </td>
            </tr>
            <tr>
              <td style="padding:7px 0;border-bottom:1px solid #f3f4f6;">
                <span style="font-size:14px;color:#374151;">📍 Drop a WhatsApp pin or describe in plain language — "near the Clay Oven, Bryanston"</span>
              </td>
            </tr>
            <tr>
              <td style="padding:7px 0;">
                <span style="font-size:14px;color:#374151;">🗺️ We confirm the exact spot and alert the network. Your name is never shared.</span>
              </td>
            </tr>
          </table>
        </div>
      </div>


      <!-- ── 5. EBLOCKSHOP ── -->
      <div style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:20px;">
        <div style="background:#1a1f2e;padding:14px 20px;">
          <span style="font-size:20px;">🛒</span>
          <span style="font-size:16px;font-weight:800;color:#ffffff;margin-left:10px;">eblockShop</span>
          <span style="float:right;background:#3b82f6;color:#ffffff;font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;line-height:20px;">Reply 5</span>
        </div>
        <div style="padding:18px 20px;">
          <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.65;">
            The eblockwatch member shop — accessible directly from WhatsApp. Browse and order safety products, eblockwatch merchandise, and member-exclusive offers without leaving the app you already use.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:7px 0;border-bottom:1px solid #f3f4f6;">
                <span style="font-size:14px;color:#374151;">🦺 Safety gear and personal security products</span>
              </td>
            </tr>
            <tr>
              <td style="padding:7px 0;border-bottom:1px solid #f3f4f6;">
                <span style="font-size:14px;color:#374151;">👕 eblockwatch branded merchandise</span>
              </td>
            </tr>
            <tr>
              <td style="padding:7px 0;border-bottom:1px solid #f3f4f6;">
                <span style="font-size:14px;color:#374151;">🎁 Member-exclusive deals and partner discounts</span>
              </td>
            </tr>
            <tr>
              <td style="padding:7px 0;">
                <span style="font-size:14px;color:#374151;">💳 Secure checkout — pay via EFT, card, or Capitec Pay</span>
              </td>
            </tr>
          </table>
          <div style="background:#eff6ff;border-left:3px solid #3b82f6;border-radius:0 8px 8px 0;padding:10px 14px;margin-top:14px;">
            <p style="margin:0;font-size:13px;color:#1e40af;font-weight:600;">🔜 eblockShop is launching soon — you'll be notified the moment it opens.</p>
          </div>
        </div>
      </div>


      <!-- ── 6. EMERGENCY ── -->
      <div style="border:2px solid #ef4444;border-radius:12px;overflow:hidden;margin-bottom:32px;">
        <div style="background:#dc2626;padding:14px 20px;">
          <span style="font-size:20px;">🆘</span>
          <span style="font-size:16px;font-weight:800;color:#ffffff;margin-left:10px;">Emergency — anytime, any screen</span>
          <span style="float:right;background:#ffffff;color:#dc2626;font-size:12px;font-weight:700;padding:3px 10px;border-radius:20px;line-height:20px;">Reply 6 OR type HELP</span>
        </div>
        <div style="padding:18px 20px;">
          <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.65;">
            You never need to be in a specific menu. From anywhere, at any time, these words trigger an immediate emergency response:
          </p>
          <div style="background:#fef2f2;border:2px dashed #fca5a5;border-radius:10px;padding:14px 20px;margin-bottom:14px;text-align:center;">
            <p style="margin:0;font-size:20px;font-weight:800;color:#dc2626;font-family:monospace;letter-spacing:3px;">
              HELP &nbsp;·&nbsp; SOS &nbsp;·&nbsp; EMERGENCY &nbsp;·&nbsp; 911
            </p>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:5px 0;border-bottom:1px solid #fee2e2;">
                <span style="font-size:14px;color:#374151;">✅ Your ICE contact WhatsApped with your name &amp; GPS location — immediately</span>
              </td>
            </tr>
            <tr>
              <td style="padding:5px 0;border-bottom:1px solid #fee2e2;">
                <span style="font-size:14px;color:#374151;">✅ André alerted in parallel via WhatsApp</span>
              </td>
            </tr>
            <tr>
              <td style="padding:5px 0;">
                <span style="font-size:14px;color:#374151;">✅ Your trip status turns RED in the Situation Room</span>
              </td>
            </tr>
          </table>
        </div>
      </div>


      <!-- DIVIDER -->
      <div style="border-top:2px solid #f0fdf4;margin:0 0 32px;"></div>


      <!-- COMPLETE QUICK REFERENCE -->
      <div style="background:#1a1f2e;border-radius:14px;padding:28px 32px;margin-bottom:36px;">
        <h2 style="margin:0 0 18px;font-size:17px;font-weight:800;color:#86efac;text-transform:uppercase;letter-spacing:0.5px;">🗂️ Complete Menu — Quick Reference</h2>
        <p style="margin:0 0 16px;font-size:13px;color:#9ca3af;">Send "Hi" to open. Send "0" or "Menu" to return here from anywhere.</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #2d3748;">
              <span style="font-size:14px;color:#22c55e;font-weight:700;font-family:monospace;">1</span>
              <span style="font-size:14px;color:#e2e8f0;margin-left:12px;">My Profile &amp; Registration</span>
              <span style="font-size:13px;color:#6b7280;float:right;">Update details, ICE contact, membership</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #2d3748;">
              <span style="font-size:14px;color:#22c55e;font-weight:700;font-family:monospace;">2</span>
              <span style="font-size:14px;color:#e2e8f0;margin-left:12px;">Cyber Chaperone — Start a trip</span>
              <span style="font-size:13px;color:#6b7280;float:right;">Monitored travel safety</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #2d3748;">
              <span style="font-size:14px;color:#22c55e;font-weight:700;font-family:monospace;">3</span>
              <span style="font-size:14px;color:#e2e8f0;margin-left:12px;">Going Out Tonight</span>
              <span style="font-size:13px;color:#6b7280;float:right;">Evening check-in mode</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #2d3748;">
              <span style="font-size:14px;color:#f97316;font-weight:700;font-family:monospace;">4</span>
              <span style="font-size:14px;color:#e2e8f0;margin-left:12px;">Scare Bear — Road Alert</span>
              <span style="font-size:13px;color:#6b7280;float:right;">Warn the community anonymously</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #2d3748;">
              <span style="font-size:14px;color:#3b82f6;font-weight:700;font-family:monospace;">5</span>
              <span style="font-size:14px;color:#e2e8f0;margin-left:12px;">eblockShop</span>
              <span style="font-size:13px;color:#6b7280;float:right;">Safety gear &amp; member deals</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid #2d3748;">
              <span style="font-size:14px;color:#ef4444;font-weight:700;font-family:monospace;">6</span>
              <span style="font-size:14px;color:#e2e8f0;margin-left:12px;">Emergency / SOS</span>
              <span style="font-size:13px;color:#ef4444;float:right;font-weight:700;">ICE contacted immediately</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;">
              <span style="font-size:14px;color:#9ca3af;font-weight:700;font-family:monospace;">HELP · SOS</span>
              <span style="font-size:14px;color:#e2e8f0;margin-left:12px;">Emergency shortcut</span>
              <span style="font-size:13px;color:#ef4444;float:right;font-weight:700;">Works from any screen, any time</span>
            </td>
          </tr>
        </table>
      </div>


      <!-- THE BIG PICTURE -->
      <div style="background:#f0fdf4;border:2px solid #22c55e;border-radius:12px;padding:24px 28px;margin-bottom:36px;">
        <h2 style="margin:0 0 14px;font-size:17px;font-weight:800;color:#1a1f2e;">Why WhatsApp? Why not an app?</h2>
        <p style="margin:0 0 14px;font-size:15px;color:#374151;line-height:1.7;">
          eblockwatch has over <strong>200,000 members</strong> across South Africa. We know exactly how our communities communicate — and it's WhatsApp. Not an app store download. Not a PIN you forget. Not a platform you have to learn.
        </p>
        <p style="margin:0;font-size:15px;color:#374151;line-height:1.7;">
          The eblockwatch BackApp puts your full membership — safety, community alerts, your profile, and the shop — into the one tool you already trust. Send a message. Get protected. That's it.
        </p>
      </div>


      <!-- MEMBER PORTAL -->
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px 24px;margin-bottom:36px;">
        <p style="margin:0 0 8px;font-size:15px;font-weight:800;color:#1a1f2e;">💻 Also available: the eblockwatch Member Portal</p>
        <p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.65;">
          For those who prefer a screen: log into your member portal to view your full profile, upgrade your membership, update your ICE contact, and see your Scare Bear reports on the map.
        </p>
        <a href="https://cyber-chaperone-r--ryfsny.replit.app/website/"
           style="display:inline-block;background:#1a1f2e;color:#22c55e;text-decoration:none;font-size:14px;font-weight:700;padding:10px 24px;border-radius:8px;">
          Open Member Portal →
        </a>
      </div>


      <!-- CTA -->
      <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.7;text-align:center;">
        Ready? Open WhatsApp right now and send us <strong>Hi</strong>.<br>
        Your full membership is one message away.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
        <tr>
          <td align="center">
            <a href="https://wa.me/27825611065?text=Hi"
               style="display:inline-block;background:#22c55e;color:#ffffff;text-decoration:none;font-size:17px;font-weight:800;padding:18px 48px;border-radius:12px;box-shadow:0 4px 14px rgba(34,197,94,0.35);">
              📱 &nbsp;Open eblockwatch on WhatsApp
            </a>
          </td>
        </tr>
      </table>


      <!-- DIVIDER -->
      <div style="border-top:2px solid #f0fdf4;margin:0 0 32px;"></div>

      <!-- SIGNATURE -->
      <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.7;">
        Welcome to the BackApp. Welcome to eblockwatch.
      </p>
      <div style="border-top:2px solid #f0fdf4;padding-top:28px;margin-top:8px;">
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

Welcome to eblockwatch. You've just unlocked the eblockwatch BackApp — the complete member platform, built inside WhatsApp.

Save this number as "eblockwatch":  +27 82 561 1065
Then send:  Hi

The full menu opens immediately.


COMPLETE MENU
──────────────────────────────────────

1 — MY PROFILE & REGISTRATION
  • Register as a new member via WhatsApp
  • Update your name, address, contact details
  • Set or change your ICE emergency contact
  • Update your email
  • Check your membership tier

2 — CYBER CHAPERONE — TRAVEL SAFETY
  • Start a monitored trip (tell us your destination & ETA)
  • We watch your route from the Situation Room — live
  • Running late? We check in before raising any alarm
  • SOS from the road: your ICE contact WhatsApped immediately
  • Arrive safely: close your trip, board goes green

3 — GOING OUT TONIGHT
  • Tell us where you're going and when you'll be home
  • We check in when your time is up
  • No response = automatic escalation to your ICE contact

4 — SCARE BEAR — ROAD SAFETY ALERTS
  • Report suspicious vehicles, illegal roadblocks, accidents
  • Send a voice note, type a description, or drop a WhatsApp pin
  • We locate the exact spot and alert the network
  • Anonymous — your name is never shared

5 — EBLOCKSHOP (coming soon)
  • Safety gear and personal security products
  • eblockwatch branded merchandise
  • Member-exclusive deals and partner discounts
  • Secure checkout — EFT, card, or Capitec Pay

6 — EMERGENCY / SOS
  • Type HELP, SOS, EMERGENCY or 911 from ANY screen at ANY time
  • Your ICE contact WhatsApped with your GPS location immediately
  • André alerted in parallel
  • Trip turns RED in the Situation Room


ALSO: eblockwatch Member Portal
  Log in at: https://cyber-chaperone-r--ryfsny.replit.app/website/
  Update profile, upgrade membership, see your Scare Bear reports on the map.


WHY WHATSAPP?
eblockwatch has over 200,000 members across South Africa. We know how our communities communicate — it's WhatsApp. The BackApp puts your full membership into the one tool you already trust. No app download. No PIN to remember. Just send "Hi".

──────────────────────────────────────
Welcome to the BackApp. Welcome to eblockwatch.

André Snyman
Founder & Director, eblockwatch
WhatsApp: +27 82 561 1065

🛡️ eblockwatch — Keeping South Africa Safe for Over 20 Years
© 2026 eblockwatch (Pty) Ltd. All rights reserved.`;

try {
  const info = await transporter.sendMail({
    from:    `"eblockwatch" <${GMAIL_USER}>`,
    to:      GMAIL_USER,
    subject: SUBJECT,
    text:    PLAIN,
    html:    HTML,
  });
  console.log("✅ Full BackApp onboarding email sent to", GMAIL_USER);
  console.log("Message ID:", info.messageId);
  console.log("Response:", info.response);
} catch (err) {
  console.error("❌ Failed:", err.message);
  process.exit(1);
}
