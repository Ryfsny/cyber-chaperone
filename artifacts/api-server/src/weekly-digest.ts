import { db, membersTable, tripsTable, messagesTable } from "@workspace/db";
import { sql, gte } from "drizzle-orm";
import { sendOperatorEmail } from "./email-service.js";
import type { Logger } from "pino";

// Sends a weekly system digest every Sunday at 08:00 SAST (06:00 UTC)
export function startWeeklyDigest(log: Logger): void {
  scheduleNextDigest(log);
  log.info("Weekly digest scheduler started");
}

function scheduleNextDigest(log: Logger): void {
  const now = new Date();
  const next = nextSundayAt6UTC(now);
  const msUntil = next.getTime() - now.getTime();

  log.info(
    { nextDigestAt: next.toISOString(), hoursUntil: Math.round(msUntil / 3600000) },
    "Weekly digest scheduled"
  );

  setTimeout(async () => {
    await sendDigest(log);
    scheduleNextDigest(log); // schedule the next one
  }, msUntil);
}

function nextSundayAt6UTC(from: Date): Date {
  const d = new Date(from);
  // Advance to next Sunday
  const daysUntilSunday = (7 - d.getUTCDay()) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + daysUntilSunday);
  d.setUTCHours(6, 0, 0, 0); // 06:00 UTC = 08:00 SAST
  // If that time is already past, add 7 days
  if (d <= from) d.setUTCDate(d.getUTCDate() + 7);
  return d;
}

async function sendDigest(log: Logger): Promise<void> {
  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [memberCount, activeTrips, completedTrips, weekMessages, membersByStatus] =
      await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(membersTable),
        db
          .select({ count: sql<number>`count(*)` })
          .from(tripsTable)
          .where(sql`status NOT IN ('completed','cancelled')`),
        db
          .select({ count: sql<number>`count(*)` })
          .from(tripsTable)
          .where(sql`status = 'completed' AND updated_at >= ${oneWeekAgo}`),
        db
          .select({ count: sql<number>`count(*)` })
          .from(messagesTable)
          .where(gte(messagesTable.receivedAt, oneWeekAgo)),
        db
          .select({ status: membersTable.memberStatus, count: sql<number>`count(*)` })
          .from(membersTable)
          .groupBy(membersTable.memberStatus),
      ]);

    const total = Number(memberCount[0]?.count ?? 0);
    const active = Number(activeTrips[0]?.count ?? 0);
    const completed = Number(completedTrips[0]?.count ?? 0);
    const msgs = Number(weekMessages[0]?.count ?? 0);

    const statusLines = membersByStatus
      .sort((a, b) => Number(b.count) - Number(a.count))
      .map((r) => `  ${r.status.padEnd(12)} ${Number(r.count).toLocaleString()}`)
      .join("\n");

    const dateStr = new Date().toLocaleDateString("en-ZA", {
      weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Johannesburg",
    });

    const body = [
      `eblockwatch Cyber Chaperone — Weekly System Digest`,
      `${dateStr}`,
      `${"─".repeat(52)}`,
      ``,
      `MEMBERS`,
      `  Total in database   ${total.toLocaleString()}`,
      ``,
      `  By status:`,
      statusLines,
      ``,
      `TRIPS THIS WEEK`,
      `  Active right now    ${active}`,
      `  Completed           ${completed}`,
      ``,
      `WHATSAPP ACTIVITY`,
      `  Messages received   ${msgs} (last 7 days)`,
      ``,
      `${"─".repeat(52)}`,
      `SYSTEM STATUS`,
      `  API server          RUNNING`,
      `  Database            CONNECTED`,
      `  Twilio webhook      https://cyber-chaperone-r--ryfsny.replit.app/api/webhook/twilio`,
      `  Dashboard           https://cyber-chaperone-r--ryfsny.replit.app`,
      ``,
      `This digest is sent automatically every Sunday at 08:00 SAST.`,
      `Reply to this email or WhatsApp Andre on +27825611065 for support.`,
    ].join("\n");

    await sendOperatorEmail("operator-mirror", "Weekly System Digest", body);
    log.info({ members: total, activeTrips: active, messages: msgs }, "Weekly digest sent");
  } catch (err) {
    log.error({ err }, "Weekly digest failed");
  }
}
