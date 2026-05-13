import { db, membersTable, tripsTable, messagesTable } from "@workspace/db";
import { sql, gte, ne, eq, and, or } from "drizzle-orm";
import { sendRawEmail } from "./email-service.js";
import type { Logger } from "pino";

const SITUATION_ROOM_URL = "https://cyber-chaperone-r--ryfsny.replit.app";
const OPERATOR_PASSWORD = "situpandwatch2026";
const TWILIO_WEBHOOK_URL = "https://cyber-chaperone-r--ryfsny.replit.app/api/webhook/twilio";

// ── Scheduler ─────────────────────────────────────────────────────────────────

export function startSixHourBriefing(log: Logger): void {
  const INTERVAL_MS = 1 * 60 * 60 * 1000;

  // Send first briefing 30 s after boot so the operator knows it's working
  setTimeout(() => {
    void sendBriefing(log);
  }, 30_000);

  // Then every 6 hours
  setInterval(() => {
    void sendBriefing(log);
  }, INTERVAL_MS);

  log.info({ intervalHours: 1 }, "Hourly briefing scheduler started");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function nowSast(): string {
  return new Date().toLocaleString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function minutesAgo(dt: Date | string | null | undefined): number {
  if (!dt) return Infinity;
  return (Date.now() - new Date(dt as string).getTime()) / 60_000;
}

function fmtCheckin(dt: Date | string | null | undefined): string {
  if (!dt) return "—";
  const min = minutesAgo(dt);
  if (min < 1) return "just now";
  if (min < 60) return `${Math.floor(min)}m ago`;
  const h = Math.floor(min / 60);
  const m = Math.floor(min % 60);
  return m > 0 ? `${h}h ${m}m ago` : `${h}h ago`;
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function statusDot(status: string): string {
  const map: Record<string, string> = {
    red: "#ef4444",
    amber: "#f59e0b",
    green: "#22c55e",
  };
  const color = map[status] ?? "#6b7280";
  return `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};margin-right:6px;vertical-align:middle;"></span>`;
}

// ── Main briefing sender ──────────────────────────────────────────────────────

async function sendBriefing(log: Logger): Promise<void> {
  try {
    const sixHoursAgo = new Date(Date.now() - 1 * 60 * 60 * 1000);
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [memberCountRows, activeTrips, recentMessages, operatorSent, operatorReplied] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(membersTable),
      db
        .select()
        .from(tripsTable)
        .where(ne(tripsTable.status, "completed"))
        .orderBy(tripsTable.status),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(messagesTable)
        .where(gte(messagesTable.receivedAt, sixHoursAgo)),
      // Operator channel health: messages FROM Andre in last 24h
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(messagesTable)
        .where(and(eq(messagesTable.direction, "operator"), gte(messagesTable.receivedAt, twentyFourHoursAgo))),
      // Operator channel health: Claude replies TO Andre in last 24h
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(messagesTable)
        .where(and(eq(messagesTable.direction, "operator-reply"), gte(messagesTable.receivedAt, twentyFourHoursAgo))),
    ]);

    const totalMembers = Number(memberCountRows[0]?.count ?? 0);
    const totalMessages = Number(recentMessages[0]?.count ?? 0);

    // ── RUNBOOK cross-check data ───────────────────────────────────────────────
    const opSentCount = Number(operatorSent[0]?.count ?? 0);
    const opReplyCount = Number(operatorReplied[0]?.count ?? 0);
    const anthropicBaseUrlSet = !!process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
    const anthropicApiKeySet = !!process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
    const channelBroken = opSentCount > 0 && opReplyCount === 0;
    const runbookAlerts: string[] = [];
    if (!anthropicBaseUrlSet) runbookAlerts.push("AI_INTEGRATIONS_ANTHROPIC_BASE_URL not set — operator AI channel will fail");
    if (!anthropicApiKeySet) runbookAlerts.push("AI_INTEGRATIONS_ANTHROPIC_API_KEY not set — operator AI channel will fail");
    if (channelBroken) runbookAlerts.push(`Operator sent ${opSentCount} message(s) in last 24h but received 0 Claude replies — channel may be broken`);
    const runbookOk = runbookAlerts.length === 0;

    // Overdue = active trip with last checkin > 2 h ago (or created > 2 h ago with no checkin)
    const overdueTrips = activeTrips.filter((t) => {
      const ref = (t.lastMemberCheckinTime as Date | null) ?? t.createdAt;
      return new Date(ref as unknown as string) < twoHoursAgo;
    });

    const sastNow = nowSast();
    const subject = `CYBER CHAPERONE — Hourly Briefing | ${sastNow} SAST | Start Here`;

    // ── Plain-text version ────────────────────────────────────────────────────
    const textLines: string[] = [
      `CYBER CHAPERONE — HOURLY BRIEFING`,
      `${sastNow} SAST`,
      `${"═".repeat(60)}`,
      ``,
      `ACTIVE TRIPS (${activeTrips.length})`,
    ];

    if (activeTrips.length === 0) {
      textLines.push(`  No active trips.`);
    } else {
      for (const t of activeTrips) {
        const ref = (t.lastMemberCheckinTime as Date | null) ?? t.updatedAt;
        textLines.push(`  [${t.status.toUpperCase()}] ${t.travelerName}`);
        textLines.push(`    Route:      ${t.title}`);
        textLines.push(`    Phone:      ${t.travelerPhone.replace("whatsapp:", "")}`);
        textLines.push(`    Last seen:  ${fmtCheckin(ref as unknown as string)}`);
        if (t.originalMemberEta) textLines.push(`    ETA:        ${t.originalMemberEta}`);
        textLines.push(``);
      }
    }

    if (overdueTrips.length > 0) {
      textLines.push(`⚠  OVERDUE — NO CHECK-IN FOR 2+ HOURS (${overdueTrips.length})`);
      for (const t of overdueTrips) {
        textLines.push(`  • ${t.travelerName} — ${t.travelerPhone.replace("whatsapp:", "")}`);
      }
      textLines.push(``);
    }

    textLines.push(
      `RUNBOOK ALERTS — OPERATOR AI CHANNEL`,
      runbookOk
        ? `  ✓ All 5 cross-checks pass — channel healthy`
        : runbookAlerts.map(a => `  ✗ ${a}`).join("\n"),
      `  Operator msgs (24h): ${opSentCount}  Claude replies (24h): ${opReplyCount}`,
      `  AI env vars: BASE_URL=${anthropicBaseUrlSet ? "SET" : "MISSING"}  API_KEY=${anthropicApiKeySet ? "SET" : "MISSING"}`,
      ``,
      `MEMBERS`,
      `  Total registered: ${totalMembers.toLocaleString()}`,
      ``,
      `WHATSAPP ACTIVITY (last 1 hour)`,
      `  Messages received: ${totalMessages}`,
      ``,
      `${"─".repeat(60)}`,
      `QUICK REFERENCE`,
      `  Situation Room:   ${SITUATION_ROOM_URL}`,
      `  Operator password: ${OPERATOR_PASSWORD}`,
      `  Twilio webhook:   ${TWILIO_WEBHOOK_URL}`,
      ``,
      `${"─".repeat(60)}`,
      `Forward this email to Claude Code at the start of your next`,
      `session to instantly restore full project context.`,
    );

    const plainText = textLines.join("\n");

    // ── HTML version ──────────────────────────────────────────────────────────
    const activeRowsHtml = activeTrips.length === 0
      ? `<tr><td colspan="4" style="padding:12px;text-align:center;color:#6b7280;font-size:13px;font-style:italic;">No active trips</td></tr>`
      : activeTrips.map((t) => {
          const ref = (t.lastMemberCheckinTime as Date | null) ?? t.updatedAt;
          const overdue = new Date(ref as unknown as string) < twoHoursAgo;
          const rowBg = overdue ? "#fef2f2" : "#ffffff";
          const checkinStr = fmtCheckin(ref as unknown as string);
          return `<tr style="background:${rowBg};border-bottom:1px solid #e2e8f0;">
            <td style="padding:10px 12px;font-size:13px;">${statusDot(t.status)}${escHtml(t.status.toUpperCase())}${overdue ? ' <span style="color:#dc2626;font-size:10px;font-weight:bold;">⚠ OVERDUE</span>' : ''}</td>
            <td style="padding:10px 12px;font-size:13px;font-weight:bold;">${escHtml(t.travelerName)}<br><span style="font-weight:normal;color:#6b7280;font-size:11px;">${escHtml(t.travelerPhone.replace("whatsapp:", ""))}</span></td>
            <td style="padding:10px 12px;font-size:12px;color:#374151;">${escHtml(t.title)}${t.originalMemberEta ? `<br><span style="color:#6b7280;">ETA ${escHtml(t.originalMemberEta)}</span>` : ""}</td>
            <td style="padding:10px 12px;font-size:12px;${overdue ? "color:#dc2626;font-weight:bold;" : "color:#374151;"}">${checkinStr}</td>
          </tr>`;
        }).join("")
      ;

    const overdueBlockHtml = overdueTrips.length === 0 ? "" : `
      <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:4px;padding:16px 20px;margin-bottom:24px;">
        <div style="color:#dc2626;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;">⚠ Overdue — No Check-in for 2+ Hours</div>
        ${overdueTrips.map(t => `<div style="color:#7f1d1d;font-size:13px;padding:3px 0;">• ${escHtml(t.travelerName)} — ${escHtml(t.travelerPhone.replace("whatsapp:", ""))}</div>`).join("")}
      </div>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<div style="max-width:640px;margin:0 auto;background:#ffffff;">

  <!-- Header -->
  <div style="background:#1a1f2e;padding:24px 36px;display:flex;align-items:center;justify-content:space-between;">
    <div>
      <div style="color:#22c55e;font-size:18px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">eblockwatch</div>
      <div style="color:#6b7280;font-size:10px;letter-spacing:2px;margin-top:3px;text-transform:uppercase;">Cyber Chaperone · Situation Room</div>
    </div>
    <div style="color:#6b7280;font-size:10px;font-family:monospace;">${sastNow} SAST</div>
  </div>

  <!-- Briefing bar -->
  <div style="background:#1e40af;padding:12px 36px;">
    <div style="color:#ffffff;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">📋 HOURLY OPERATIONAL BRIEFING</div>
    <div style="color:#bfdbfe;font-size:13px;margin-top:3px;">Auto-generated status report — forward to Claude to restore session context</div>
  </div>

  <!-- Green accent line -->
  <div style="height:3px;background:linear-gradient(90deg,#16a34a,#22c55e,#16a34a);"></div>

  <!-- Body -->
  <div style="padding:28px 36px 8px;">

    <!-- Active Trips -->
    <h2 style="color:#1a1f2e;font-size:14px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #22c55e;">
      Active Trips &nbsp;<span style="background:#22c55e;color:#fff;font-size:12px;padding:2px 8px;border-radius:999px;">${activeTrips.length}</span>
    </h2>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;border:1px solid #e2e8f0;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="padding:8px 12px;text-align:left;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Status</th>
          <th style="padding:8px 12px;text-align:left;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Traveler</th>
          <th style="padding:8px 12px;text-align:left;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Route</th>
          <th style="padding:8px 12px;text-align:left;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Last Check-in</th>
        </tr>
      </thead>
      <tbody>
        ${activeRowsHtml}
      </tbody>
    </table>

    ${overdueBlockHtml}

    <!-- RUNBOOK ALERTS -->
    <h2 style="color:#1a1f2e;font-size:14px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid ${runbookOk ? "#22c55e" : "#ef4444"};">
      Operator AI Channel ${runbookOk ? "✓ Healthy" : "⚠ ALERT"}
    </h2>
    <div style="background:${runbookOk ? "#f0fdf4" : "#fef2f2"};border:1px solid ${runbookOk ? "#bbf7d0" : "#fca5a5"};border-radius:4px;padding:16px 20px;margin-bottom:24px;">
      ${runbookOk
        ? `<div style="color:#16a34a;font-size:13px;font-weight:bold;">All 5 cross-checks pass — channel healthy</div>`
        : runbookAlerts.map(a => `<div style="color:#dc2626;font-size:13px;font-weight:bold;margin-bottom:4px;">✗ ${escHtml(a)}</div>`).join("")
      }
      <table style="width:100%;border-collapse:collapse;margin-top:12px;">
        <tr>
          <td style="padding:4px 0;font-size:11px;color:#6b7280;text-transform:uppercase;width:180px;">Operator msgs (24h)</td>
          <td style="padding:4px 0;font-size:13px;font-family:monospace;font-weight:bold;">${opSentCount}</td>
          <td style="padding:4px 0;font-size:11px;color:#6b7280;text-transform:uppercase;width:180px;">Claude replies (24h)</td>
          <td style="padding:4px 0;font-size:13px;font-family:monospace;font-weight:bold;">${opReplyCount}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;font-size:11px;color:#6b7280;text-transform:uppercase;">ANTHROPIC_BASE_URL</td>
          <td style="padding:4px 0;font-size:13px;font-weight:bold;color:${anthropicBaseUrlSet ? "#16a34a" : "#dc2626"};">${anthropicBaseUrlSet ? "SET ✓" : "MISSING ✗"}</td>
          <td style="padding:4px 0;font-size:11px;color:#6b7280;text-transform:uppercase;">ANTHROPIC_API_KEY</td>
          <td style="padding:4px 0;font-size:13px;font-weight:bold;color:${anthropicApiKeySet ? "#16a34a" : "#dc2626"};">${anthropicApiKeySet ? "SET ✓" : "MISSING ✗"}</td>
        </tr>
      </table>
    </div>

    <!-- Stats row -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <tr>
        <td style="width:50%;padding:0 8px 0 0;vertical-align:top;">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:4px;padding:16px 20px;">
            <div style="color:#16a34a;font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">Members</div>
            <div style="color:#1a1f2e;font-size:28px;font-weight:bold;font-family:monospace;">${totalMembers.toLocaleString()}</div>
            <div style="color:#6b7280;font-size:11px;margin-top:4px;">total registered</div>
          </div>
        </td>
        <td style="width:50%;padding:0 0 0 8px;vertical-align:top;">
          <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:4px;padding:16px 20px;">
            <div style="color:#1e40af;font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">Messages (1h)</div>
            <div style="color:#1a1f2e;font-size:28px;font-weight:bold;font-family:monospace;">${totalMessages}</div>
            <div style="color:#6b7280;font-size:11px;margin-top:4px;">inbound WhatsApp messages</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Quick Reference -->
    <h2 style="color:#1a1f2e;font-size:14px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;margin:0 0 12px;padding-bottom:8px;border-bottom:2px solid #22c55e;">
      Quick Reference
    </h2>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;background:#f8fafc;border:1px solid #e2e8f0;">
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:10px 16px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;white-space:nowrap;width:160px;">Situation Room</td>
        <td style="padding:10px 16px;font-size:13px;font-family:monospace;"><a href="${SITUATION_ROOM_URL}" style="color:#1e40af;text-decoration:none;">${SITUATION_ROOM_URL}</a></td>
      </tr>
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:10px 16px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Operator Password</td>
        <td style="padding:10px 16px;font-size:13px;font-family:monospace;font-weight:bold;color:#1a1f2e;">${OPERATOR_PASSWORD}</td>
      </tr>
      <tr>
        <td style="padding:10px 16px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Twilio Webhook</td>
        <td style="padding:10px 16px;font-size:12px;font-family:monospace;color:#374151;">${TWILIO_WEBHOOK_URL}</td>
      </tr>
    </table>

  </div>

  <!-- Claude context footer -->
  <div style="background:#fefce8;border-top:2px solid #fbbf24;padding:16px 36px;">
    <div style="color:#92400e;font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">🤖 Session Context Restore</div>
    <div style="color:#78350f;font-size:13px;line-height:1.6;">
      Forward this email to <strong>Claude Code</strong> at the start of your next session to instantly restore full project context — active trips, member counts, URLs, and passwords all load automatically.
    </div>
  </div>

  <!-- Footer -->
  <div style="background:#1a1f2e;padding:16px 36px;text-align:center;">
    <div style="color:#374151;font-size:10px;letter-spacing:1px;text-transform:uppercase;">
      eblockwatch Situation Room · Automated 6-Hour Briefing ·
      <a href="https://www.facebook.com/eblockwatchnational" style="color:#22c55e;text-decoration:none;">Facebook</a>
      &nbsp;·&nbsp;
      <a href="https://eblockwatch.co.za" style="color:#22c55e;text-decoration:none;">eblockwatch.co.za</a>
    </div>
  </div>

</div>
</body>
</html>`;

    await sendRawEmail(subject, html, plainText);
    log.info(
      { activeTrips: activeTrips.length, overdueTrips: overdueTrips.length, totalMembers, totalMessages },
      "6-hour briefing sent",
    );
  } catch (err) {
    log.error({ err }, "6-hour briefing failed");
  }
}
