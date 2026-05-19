/**
 * Session backup email — full summary of everything built and decided
 * in this Replit session. Sent to André's Gmail for safekeeping.
 *
 * Run: node scripts/send-session-backup.mjs
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

const NOW     = new Date().toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" });
const SUBJECT = `🗄️ SESSION BACKUP — eblockwatch / Cyber Chaperone — ${NOW}`;

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Session Backup</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 16px;">
<tr><td align="center">
<table width="660" cellpadding="0" cellspacing="0" style="max-width:660px;width:100%;">

  <!-- HEADER -->
  <tr>
    <td style="background:#1a1f2e;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
      <img src="https://cyber-chaperone-r--ryfsny.replit.app/website/eblockwatch-logo.png"
           alt="eblockwatch" height="44" style="display:block;margin:0 auto 16px;">
      <div style="background:#22c55e;height:3px;width:56px;margin:0 auto 20px;border-radius:2px;"></div>
      <h1 style="margin:0 0 6px;color:#ffffff;font-size:22px;font-weight:800;">Session Backup</h1>
      <p style="margin:0;font-size:14px;color:#86efac;">eblockwatch / Cyber Chaperone — Replit Workspace</p>
      <p style="margin:8px 0 0;font-size:13px;color:#64748b;">${NOW}</p>
    </td>
  </tr>

  <!-- BODY -->
  <tr>
    <td style="background:#ffffff;padding:40px;">

      <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.7;">
        This is a full backup of what was built, decided, and created in this Replit session.
        The code is committed and saved. This email is your human-readable record.
      </p>

      <!-- ──────────────────────────────────────── -->
      <!-- SECTION 1: TECHNICAL WORK -->
      <!-- ──────────────────────────────────────── -->
      <div style="background:#1a1f2e;border-radius:10px;padding:14px 20px;margin-bottom:16px;">
        <h2 style="margin:0;font-size:16px;font-weight:800;color:#86efac;">1. Technical Work Completed</h2>
      </div>

      <!-- 1a: Scare Bear -->
      <div style="border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;margin-bottom:14px;">
        <p style="margin:0 0 10px;font-size:15px;font-weight:800;color:#f97316;">🐻 Scare Bear — Community Road Safety Alert (COMPLETE)</p>
        <p style="margin:0 0 10px;font-size:14px;color:#374151;line-height:1.65;">
          Full feature built end-to-end. Members can report suspicious situations on the road via WhatsApp.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">✅ Database table: <code style="background:#f3f4f6;padding:1px 5px;border-radius:3px;">scare_bear_sightings</code></td></tr>
          <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">✅ REST API route: <code style="background:#f3f4f6;padding:1px 5px;border-radius:3px;">GET/POST /api/scare-bears</code></td></tr>
          <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">✅ Situation Room page: interactive map at <code style="background:#f3f4f6;padding:1px 5px;border-radius:3px;">/scare-bears</code> with Leaflet pins</td></tr>
          <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">✅ WhatsApp flow: TYPE → DESCRIPTION → LOCATION → LOCATION_CONFIRM → save</td></tr>
          <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">✅ AI operator tool: <code style="background:#f3f4f6;padding:1px 5px;border-radius:3px;">get_scare_bears</code> added to AI service</td></tr>
          <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">✅ Nav item added to Situation Room sidebar</td></tr>
        </table>
      </div>

      <!-- 1b: Voice-to-Location Pin -->
      <div style="border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;margin-bottom:24px;">
        <p style="margin:0 0 10px;font-size:15px;font-weight:800;color:#3b82f6;">📍 Voice-to-Location Pin (COMPLETE)</p>
        <p style="margin:0 0 10px;font-size:14px;color:#374151;line-height:1.65;">
          Members can describe a location in plain language or by voice note and receive a real tappable WhatsApp map pin back for confirmation.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">✅ <code style="background:#f3f4f6;padding:1px 5px;border-radius:3px;">geocodeLandmark(query)</code> — Google Maps Places Text Search API with OSM/Nominatim fallback</td></tr>
          <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">✅ <code style="background:#f3f4f6;padding:1px 5px;border-radius:3px;">sendWhatsAppLocationPin()</code> — drops a live tappable map pin in WhatsApp via Twilio persistentAction</td></tr>
          <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">✅ <code style="background:#f3f4f6;padding:1px 5px;border-radius:3px;">LOCATION_CONFIRM</code> step — member confirms or retries geocoded location before saving</td></tr>
          <tr><td style="padding:4px 0;font-size:13px;color:#6b7280;">✅ Three-path logic: WhatsApp pin (save directly) / voice-text (geocode → confirm) / skip (save without location)</td></tr>
        </table>

        <div style="background:#f0fdf4;border-radius:8px;padding:12px 16px;margin-top:12px;">
          <p style="margin:0 0 4px;font-size:13px;color:#15803d;font-weight:700;">How it works (member experience):</p>
          <p style="margin:0;font-size:13px;color:#374151;line-height:1.7;font-family:monospace;">
            Member: "near the Clay Oven, Bryanston"<br>
            System: [sends a live WhatsApp map pin] "Is this the right spot?"<br>
            Member: "1" (Yes)<br>
            System: Saved ✅
          </p>
        </div>
      </div>

      <!-- KEY FILES -->
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
        <p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#1a1f2e;">Key files changed this session:</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:3px 0;font-size:13px;color:#6b7280;font-family:monospace;">artifacts/api-server/src/menu-router.ts</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6b7280;font-family:monospace;">artifacts/api-server/src/google-maps-service.ts</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6b7280;font-family:monospace;">artifacts/api-server/src/routes/scare-bears.ts</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6b7280;font-family:monospace;">lib/db/src/schema/scare-bear-sightings.ts</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6b7280;font-family:monospace;">lib/db/src/schema/index.published.ts</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6b7280;font-family:monospace;">artifacts/situation-room/src/pages/scare-bears.tsx</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6b7280;font-family:monospace;">artifacts/api-server/src/operator-ai-service.ts</td></tr>
          <tr><td style="padding:3px 0;font-size:13px;color:#6b7280;font-family:monospace;">artifacts/situation-room/src/App.tsx</td></tr>
        </table>
      </div>


      <!-- ──────────────────────────────────────── -->
      <!-- SECTION 2: EMAIL DRAFTS -->
      <!-- ──────────────────────────────────────── -->
      <div style="background:#1a1f2e;border-radius:10px;padding:14px 20px;margin-bottom:16px;">
        <h2 style="margin:0;font-size:16px;font-weight:800;color:#86efac;">2. Email Drafts Sent to ryfsny@gmail.com</h2>
      </div>

      <p style="margin:0 0 14px;font-size:14px;color:#374151;">Three email drafts are waiting in your Gmail inbox. Search for <strong>DRAFT</strong> to find all three.</p>

      <!-- Email 1 -->
      <div style="border-left:4px solid #22c55e;background:#f0fdf4;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:12px;">
        <p style="margin:0 0 4px;font-size:14px;font-weight:800;color:#1a1f2e;">📧 Email 1 — Sales / Marketing</p>
        <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">Subject: <em>"You Are Never Alone on the Road. Meet Cyber Chaperone. 🛡️"</em></p>
        <p style="margin:0;font-size:13px;color:#374151;line-height:1.6;">
          Sells Cyber Chaperone to existing eblockwatch members. Opens with the emotional fear of driving alone in South Africa. Covers all 5 features with icons. Dark navy "Why we built this" block. Testimonial. Single CTA: send "Hi" on WhatsApp.
        </p>
      </div>

      <!-- Email 2 -->
      <div style="border-left:4px solid #3b82f6;background:#eff6ff;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:12px;">
        <p style="margin:0 0 4px;font-size:14px;font-weight:800;color:#1a1f2e;">📧 Email 2 — Basic Onboarding (How to use it)</p>
        <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">Subject: <em>"Welcome to Cyber Chaperone — here's how to use it"</em></p>
        <p style="margin:0;font-size:13px;color:#374151;line-height:1.6;">
          Step-by-step guide for new members. Numbered steps with icons. Shows the WhatsApp menu exactly as it appears. Covers: saving the number, starting a trip, check-ins, SOS trigger words, Scare Bear, ICE contact setup. Quick reference card at the bottom.
        </p>
      </div>

      <!-- Email 3 -->
      <div style="border-left:4px solid #f97316;background:#fff7ed;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:14px;font-weight:800;color:#1a1f2e;">📧 Email 3 — Full BackApp Onboarding (Complete menu)</p>
        <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">Subject: <em>"eblockwatch BackApp: Full onboarding (complete WhatsApp menu)"</em></p>
        <p style="margin:0;font-size:13px;color:#374151;line-height:1.6;">
          The comprehensive version. Covers all 6 menu items: Profile &amp; Registration, Cyber Chaperone travel safety, Going Out mode, Scare Bear, eblockShop (coming soon badge), Emergency SOS. Includes the 200,000 member "Why WhatsApp?" section. Full quick-reference card. Member Portal link.
        </p>
      </div>


      <!-- ──────────────────────────────────────── -->
      <!-- SECTION 3: STRATEGIC DECISIONS -->
      <!-- ──────────────────────────────────────── -->
      <div style="background:#1a1f2e;border-radius:10px;padding:14px 20px;margin-bottom:16px;">
        <h2 style="margin:0;font-size:16px;font-weight:800;color:#86efac;">3. Strategic Decisions &amp; Ideas Captured</h2>
      </div>

      <!-- Naming -->
      <div style="border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;margin-bottom:14px;">
        <p style="margin:0 0 10px;font-size:15px;font-weight:800;color:#1a1f2e;">🏷️ Naming: eblockwatch BackApp vs Cyber Chaperone</p>
        <p style="margin:0 0 10px;font-size:14px;color:#374151;line-height:1.65;">
          André raised the idea of renaming Cyber Chaperone to <strong>"eblockwatch BackApp"</strong>.
          The recommended approach (to be confirmed by André):
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
          <tr style="background:#f9fafb;">
            <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#1a1f2e;border-bottom:1px solid #e5e7eb;">eblockwatch BackApp</td>
            <td style="padding:10px 14px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;">The overall product name — the complete WhatsApp platform for all eblockwatch members</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#1a1f2e;">Cyber Chaperone</td>
            <td style="padding:10px 14px;font-size:13px;color:#374151;">The travel safety feature inside the BackApp — monitored trips, SOS, Going Out mode</td>
          </tr>
        </table>
        <p style="margin:12px 0 0;font-size:13px;color:#6b7280;">
          ⏳ <strong>Pending:</strong> André to confirm final naming decision. No code changes made yet.
        </p>
      </div>

      <!-- BackApp original project -->
      <div style="border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;margin-bottom:14px;">
        <p style="margin:0 0 10px;font-size:15px;font-weight:800;color:#1a1f2e;">🔍 Original "backApp" Project — Research Needed</p>
        <p style="margin:0 0 10px;font-size:14px;color:#374151;line-height:1.65;">
          André mentioned a project called "backApp" that he started years ago — this may be the conceptual origin of what is now being built. A search was attempted but could not be completed:
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:4px 0;font-size:13px;color:#ef4444;">❌ Replit workspace — no historical files found (only today's emails)</td></tr>
          <tr><td style="padding:4px 0;font-size:13px;color:#ef4444;">❌ Gmail search — OAuth token has send-only scope, cannot read/search inbox</td></tr>
          <tr><td style="padding:4px 0;font-size:13px;color:#ef4444;">❌ Local computer — no access from Replit</td></tr>
        </table>
        <div style="background:#fef9c3;border-radius:8px;padding:12px 16px;margin-top:12px;">
          <p style="margin:0 0 6px;font-size:13px;color:#854d0e;font-weight:700;">To find the original backApp materials:</p>
          <p style="margin:0;font-size:13px;color:#374151;line-height:1.8;">
            📧 Gmail → search: <strong>backapp</strong><br>
            💻 Local computer → search Documents, Downloads, Desktop<br>
            ☁️ Google Drive / Dropbox / OneDrive → search "backapp"<br>
            🐙 GitHub → check <a href="https://github.com/Ryfsny" style="color:#22c55e;">github.com/Ryfsny</a> for old repos<br>
            📱 Phone → Notes app, WhatsApp messages to self, voice memos
          </p>
        </div>
      </div>

      <!-- Membership funnel -->
      <div style="border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;margin-bottom:24px;">
        <p style="margin:0 0 10px;font-size:15px;font-weight:800;color:#1a1f2e;">📊 Membership Funnel — Key Numbers</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
          <tr style="background:#f9fafb;">
            <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#1a1f2e;border-bottom:1px solid #e5e7eb;">eblockwatch total membership base</td>
            <td style="padding:10px 14px;font-size:13px;font-weight:800;color:#22c55e;border-bottom:1px solid #e5e7eb;">200,000+</td>
          </tr>
          <tr style="background:#ffffff;">
            <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#1a1f2e;border-bottom:1px solid #e5e7eb;">Paystack paying subscribers (last sync)</td>
            <td style="padding:10px 14px;font-size:13px;font-weight:800;color:#22c55e;border-bottom:1px solid #e5e7eb;">60</td>
          </tr>
          <tr style="background:#f9fafb;">
            <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#1a1f2e;border-bottom:1px solid #e5e7eb;">Welcome campaign: Batch 1 (sent)</td>
            <td style="padding:10px 14px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;">50 emails · ~34 delivered · 16 bounced · 3 delayed</td>
          </tr>
          <tr>
            <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#1a1f2e;">Communication channel</td>
            <td style="padding:10px 14px;font-size:13px;color:#374151;">WhatsApp (primary) + Email (onboarding)</td>
          </tr>
        </table>
      </div>


      <!-- ──────────────────────────────────────── -->
      <!-- SECTION 4: WHAT'S LIVE NOW -->
      <!-- ──────────────────────────────────────── -->
      <div style="background:#1a1f2e;border-radius:10px;padding:14px 20px;margin-bottom:16px;">
        <h2 style="margin:0;font-size:16px;font-weight:800;color:#86efac;">4. Current System State — What's Live</h2>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:24px;">
        <tr style="background:#f9fafb;">
          <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#6b7280;border-bottom:1px solid #e5e7eb;">System</td>
          <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#6b7280;border-bottom:1px solid #e5e7eb;">Status</td>
          <td style="padding:10px 14px;font-size:13px;font-weight:700;color:#6b7280;border-bottom:1px solid #e5e7eb;">URL</td>
        </tr>
        <tr>
          <td style="padding:9px 14px;font-size:13px;color:#1a1f2e;font-weight:600;border-bottom:1px solid #f3f4f6;">API Server</td>
          <td style="padding:9px 14px;font-size:13px;border-bottom:1px solid #f3f4f6;"><span style="background:#dcfce7;color:#15803d;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;">RUNNING</span></td>
          <td style="padding:9px 14px;font-size:12px;color:#6b7280;font-family:monospace;border-bottom:1px solid #f3f4f6;">/api/*</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:9px 14px;font-size:13px;color:#1a1f2e;font-weight:600;border-bottom:1px solid #f3f4f6;">Situation Room</td>
          <td style="padding:9px 14px;font-size:13px;border-bottom:1px solid #f3f4f6;"><span style="background:#dcfce7;color:#15803d;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;">RUNNING</span></td>
          <td style="padding:9px 14px;font-size:12px;color:#6b7280;font-family:monospace;border-bottom:1px solid #f3f4f6;">/</td>
        </tr>
        <tr>
          <td style="padding:9px 14px;font-size:13px;color:#1a1f2e;font-weight:600;border-bottom:1px solid #f3f4f6;">eblockwatch Website</td>
          <td style="padding:9px 14px;font-size:13px;border-bottom:1px solid #f3f4f6;"><span style="background:#dcfce7;color:#15803d;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;">RUNNING</span></td>
          <td style="padding:9px 14px;font-size:12px;color:#6b7280;font-family:monospace;border-bottom:1px solid #f3f4f6;">/website/</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:9px 14px;font-size:13px;color:#1a1f2e;font-weight:600;border-bottom:1px solid #f3f4f6;">Twilio WhatsApp Webhook</td>
          <td style="padding:9px 14px;font-size:13px;border-bottom:1px solid #f3f4f6;"><span style="background:#dcfce7;color:#15803d;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;">LIVE</span></td>
          <td style="padding:9px 14px;font-size:12px;color:#6b7280;font-family:monospace;border-bottom:1px solid #f3f4f6;">/api/webhook/twilio</td>
        </tr>
        <tr>
          <td style="padding:9px 14px;font-size:13px;color:#1a1f2e;font-weight:600;border-bottom:1px solid #f3f4f6;">Facebook Messenger Webhook</td>
          <td style="padding:9px 14px;font-size:13px;border-bottom:1px solid #f3f4f6;"><span style="background:#dcfce7;color:#15803d;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;">LIVE</span></td>
          <td style="padding:9px 14px;font-size:12px;color:#6b7280;font-family:monospace;border-bottom:1px solid #f3f4f6;">/api/webhook/facebook</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:9px 14px;font-size:13px;color:#1a1f2e;font-weight:600;">Paystack Payments</td>
          <td style="padding:9px 14px;font-size:13px;"><span style="background:#dcfce7;color:#15803d;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;">LIVE</span></td>
          <td style="padding:9px 14px;font-size:12px;color:#6b7280;font-family:monospace;">/api/paystack/webhook</td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:24px;">
        <tr style="background:#f9fafb;">
          <td colspan="2" style="padding:10px 14px;font-size:13px;font-weight:700;color:#6b7280;border-bottom:1px solid #e5e7eb;">WhatsApp Number</td>
        </tr>
        <tr>
          <td style="padding:9px 14px;font-size:13px;color:#1a1f2e;font-weight:600;border-bottom:1px solid #f3f4f6;">Business number (members message this)</td>
          <td style="padding:9px 14px;font-size:13px;font-family:monospace;color:#374151;border-bottom:1px solid #f3f4f6;">+27 82 561 1065 (current — update when Twilio number arrives)</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:9px 14px;font-size:13px;color:#1a1f2e;font-weight:600;">Founder personal (never changes)</td>
          <td style="padding:9px 14px;font-size:13px;font-family:monospace;color:#374151;">+27 82 561 1065 (André's personal — stays forever)</td>
        </tr>
      </table>


      <!-- ──────────────────────────────────────── -->
      <!-- SECTION 5: NEXT STEPS -->
      <!-- ──────────────────────────────────────── -->
      <div style="background:#1a1f2e;border-radius:10px;padding:14px 20px;margin-bottom:16px;">
        <h2 style="margin:0;font-size:16px;font-weight:800;color:#86efac;">5. Suggested Next Steps</h2>
      </div>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0f4f8;vertical-align:top;width:24px;">
            <span style="font-size:14px;">📧</span>
          </td>
          <td style="padding:8px 0 8px 10px;border-bottom:1px solid #f0f4f8;">
            <strong style="font-size:14px;color:#1a1f2e;">Review the 3 email drafts in Gmail</strong>
            <span style="display:block;font-size:13px;color:#6b7280;margin-top:2px;">Search "DRAFT" in inbox. Edit, personalise with [First Name], and schedule for the next batch.</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0f4f8;vertical-align:top;width:24px;">
            <span style="font-size:14px;">🏷️</span>
          </td>
          <td style="padding:8px 0 8px 10px;border-bottom:1px solid #f0f4f8;">
            <strong style="font-size:14px;color:#1a1f2e;">Confirm the naming: eblockwatch BackApp vs Cyber Chaperone</strong>
            <span style="display:block;font-size:13px;color:#6b7280;margin-top:2px;">Decision will drive branding across WhatsApp menus, website, and all emails.</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0f4f8;vertical-align:top;width:24px;">
            <span style="font-size:14px;">🔍</span>
          </td>
          <td style="padding:8px 0 8px 10px;border-bottom:1px solid #f0f4f8;">
            <strong style="font-size:14px;color:#1a1f2e;">Find the original backApp project files</strong>
            <span style="display:block;font-size:13px;color:#6b7280;margin-top:2px;">Search Gmail, local computer, Google Drive, GitHub for "backapp". Share anything found — happy to read through and map old ideas to the current build.</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0f4f8;vertical-align:top;width:24px;">
            <span style="font-size:14px;">🛒</span>
          </td>
          <td style="padding:8px 0 8px 10px;border-bottom:1px solid #f0f4f8;">
            <strong style="font-size:14px;color:#1a1f2e;">Build eblockShop</strong>
            <span style="display:block;font-size:13px;color:#6b7280;margin-top:2px;">Listed in the menu and email as "coming soon". Define what products go in — safety gear, merch, partner deals — and the WhatsApp purchase flow can be built.</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f0f4f8;vertical-align:top;width:24px;">
            <span style="font-size:14px;">🚀</span>
          </td>
          <td style="padding:8px 0 8px 10px;border-bottom:1px solid #f0f4f8;">
            <strong style="font-size:14px;color:#1a1f2e;">Welcome campaign Batch 2 (members 51–100)</strong>
            <span style="display:block;font-size:13px;color:#6b7280;margin-top:2px;">Launch from Situation Room → Broadcast → Welcome Home Campaign. System picks up the next 50 automatically.</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;vertical-align:top;width:24px;">
            <span style="font-size:14px;">🐙</span>
          </td>
          <td style="padding:8px 0 8px 10px;">
            <strong style="font-size:14px;color:#1a1f2e;">Push code to GitHub</strong>
            <span style="display:block;font-size:13px;color:#6b7280;margin-top:2px;">All commits are in Replit. A GitHub push is queued as a follow-up task for off-site backup.</span>
          </td>
        </tr>
      </table>


      <!-- PRODUCTION LINK -->
      <div style="background:#f0fdf4;border:2px solid #22c55e;border-radius:10px;padding:16px 20px;margin-bottom:28px;text-align:center;">
        <p style="margin:0 0 6px;font-size:13px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Live Production App</p>
        <a href="https://cyber-chaperone-r--ryfsny.replit.app"
           style="font-size:15px;font-weight:800;color:#15803d;text-decoration:none;font-family:monospace;">
          https://cyber-chaperone-r--ryfsny.replit.app
        </a>
      </div>

      <!-- FOOTER NOTE -->
      <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;line-height:1.6;">
        Session backed up: ${NOW}<br>
        Generated automatically from the Replit workspace.<br>
        All code commits are saved in Replit version history.
      </p>

    </td>
  </tr>

  <!-- EMAIL FOOTER -->
  <tr>
    <td style="background:#1a1f2e;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
      <p style="margin:0 0 4px;font-size:12px;color:#6b7280;">🛡️ eblockwatch / Cyber Chaperone — Replit Workspace Backup</p>
      <p style="margin:0;font-size:12px;color:#6b7280;">© 2026 eblockwatch (Pty) Ltd.</p>
    </td>
  </tr>

</table>
</td></tr>
</table>

</body>
</html>`;

try {
  const info = await transporter.sendMail({
    from:    `"eblockwatch Session Backup" <${GMAIL_USER}>`,
    to:      GMAIL_USER,
    subject: SUBJECT,
    html:    HTML,
  });
  console.log("✅ Session backup sent to", GMAIL_USER);
  console.log("Message ID:", info.messageId);
  console.log("Timestamp:", new Date().toISOString());
} catch (err) {
  console.error("❌ Failed:", err.message);
  process.exit(1);
}
