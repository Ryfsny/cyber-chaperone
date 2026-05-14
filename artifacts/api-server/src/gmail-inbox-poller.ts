import { ImapFlow } from "imapflow";
import { db, messagesTable, membersTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import type { Logger } from "pino";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes
const MAX_PER_CYCLE    = 50;             // never process more than 50 per poll
const LOOKBACK_DAYS    = 7;             // only look at messages from the last 7 days

// ── Public starter ────────────────────────────────────────────────────────────

export function startGmailInboxPoller(logger: Logger): void {
  const user = process.env["GMAIL_USER"] ?? "";
  const pass = process.env["GMAIL_APP_PASSWORD"] ?? "";

  if (!user || !pass) {
    logger.warn("Gmail inbox poller disabled — GMAIL_USER or GMAIL_APP_PASSWORD not set");
    return;
  }

  logger.info({ intervalMinutes: 5, inbox: user, lookbackDays: LOOKBACK_DAYS }, "Gmail inbox poller started");

  void pollInbox(user, pass, logger);
  setInterval(() => void pollInbox(user, pass, logger), POLL_INTERVAL_MS);
}

// ── Poll loop ─────────────────────────────────────────────────────────────────

async function pollInbox(user: string, pass: string, logger: Logger): Promise<void> {
  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  try {
    await client.connect();
    const mailbox = await client.mailboxOpen("INBOX");

    if (mailbox.exists === 0) {
      await client.logout();
      return;
    }

    // Only search within the recent window — avoids processing thousands of old unread messages
    const since = new Date();
    since.setDate(since.getDate() - LOOKBACK_DAYS);

    const result = await client.search({ seen: false, since }, { uid: true });
    const allUids: number[] = Array.isArray(result) ? result : [];

    if (allUids.length === 0) {
      await client.logout();
      return;
    }

    // Cap the batch — process newest first (highest UIDs last in array, slice from end)
    const uids = allUids.slice(-MAX_PER_CYCLE);

    logger.info({ found: allUids.length, processing: uids.length }, "Gmail inbox: polling recent unread");

    let captured = 0;
    for (const uid of uids) {
      const ok = await processMessage(client, uid, user, logger);
      if (ok) captured++;
    }

    if (captured > 0) {
      logger.info({ captured }, "Gmail inbox: member replies logged");
    }

    await client.logout();
  } catch (err) {
    logger.warn({ err }, "Gmail inbox poll failed");
    try { await client.logout(); } catch { /* already disconnected */ }
  }
}

// ── Per-message processing ────────────────────────────────────────────────────
// Returns true if a member reply was captured, false otherwise.

async function processMessage(
  client: ImapFlow,
  uid: number,
  inboxAddress: string,
  logger: Logger,
): Promise<boolean> {
  try {
    const msgResult = await client.fetchOne(String(uid), { envelope: true }, { uid: true });
    if (!msgResult || typeof msgResult === "boolean") return false;

    const envelope = msgResult.envelope;
    if (!envelope) return false;

    const fromAddr = envelope.from?.[0]?.address?.toLowerCase().trim() ?? "";
    const subject  = envelope.subject ?? "(no subject)";

    if (!fromAddr) return false;

    // Never process emails the system sent to itself (outbound briefings, digests, etc.)
    if (fromAddr === inboxAddress.toLowerCase()) return false;

    // Skip system-generated subjects so operator briefings don't loop back
    const SYSTEM_SUBJECTS = ["cyber chaperone", "hourly briefing", "weekly digest", "ice escalation", "trip alert"];
    if (SYSTEM_SUBJECTS.some((s) => subject.toLowerCase().includes(s))) {
      // Mark as read silently so they don't pile up
      await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
      return false;
    }

    // Look up the member whose email matches the sender
    const [member] = await db
      .select({ id: membersTable.id, email: membersTable.email })
      .from(membersTable)
      .where(sql`lower(${membersTable.email}) = ${fromAddr}`)
      .limit(1);

    if (!member) {
      // Unknown sender — leave unread so operator can see it in Gmail
      return false;
    }

    // Download text body
    let bodyText = "";
    try {
      const dl = await client.download(String(uid), "TEXT", { uid: true });
      if (dl && dl.content) {
        const chunks: Buffer[] = [];
        for await (const chunk of dl.content) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
        }
        bodyText = Buffer.concat(chunks).toString("utf-8").trim();
      }
    } catch {
      // Body download failed — subject alone is sufficient
    }

    // Strip quoted lines (starting with ">") to keep only the fresh reply
    const replyOnly = bodyText
      .split("\n")
      .filter((line) => !line.startsWith(">") && line.trim() !== "")
      .join("\n")
      .trim();

    const body = replyOnly
      ? `[Re: ${subject}]\n\n${replyOnly}`.slice(0, 4000)
      : `[Re: ${subject}]`;

    // Log as inbound email in the member's communication log
    await db.insert(messagesTable).values({
      fromNumber: member.email!,
      toNumber:   inboxAddress,
      body,
      direction:  "inbound",
      channel:    "email",
      status:     "received",
    });

    // Mark as read so we don't process it again next poll
    await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });

    logger.info({ memberId: member.id, fromAddr, subject }, "Gmail reply captured from member");
    return true;
  } catch (err) {
    logger.warn({ err, uid }, "Gmail inbox: failed to process message");
    return false;
  }
}
