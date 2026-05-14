/**
 * One-off Gmail inbox labeller.
 * Run: pnpm --filter @workspace/scripts run label-gmail
 *
 * Connects via IMAP, scans ALL messages (including old unread),
 * and applies Gmail labels based on content rules.
 * Safe to run multiple times — skips already-labelled messages.
 */

import { ImapFlow } from "imapflow";

// ── Config ────────────────────────────────────────────────────────────────────

const GMAIL_USER = process.env["GMAIL_USER"];
const GMAIL_PASS = process.env["GMAIL_APP_PASSWORD"];

if (!GMAIL_USER || !GMAIL_PASS) {
  console.error("Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.");
  process.exit(1);
}

const BATCH_SIZE = 100;  // messages per IMAP fetch batch

// ── Label rules (applied in order — first match wins) ─────────────────────────
// Each rule maps to an IMAP mailbox / Gmail label path.

interface Rule {
  label: string;    // Gmail label name (must exist in Gmail already, or use + to create)
  test: (from: string, subject: string) => boolean;
}

const RULES: Rule[] = [
  // Court / legal
  {
    label: "⚖️ Legal",
    test: (from, subj) =>
      /transco|court|magistrate|attorney|lawyer|subpoena|discovery|legal notice|summons|litis|judgement|ruling|exhibit/i.test(from + " " + subj),
  },
  // eblockwatch system emails (briefings, digests, alerts)
  {
    label: "eblockwatch",
    test: (from, subj) =>
      /eblockwatch|cyber chaperone|block.?watch/i.test(from + " " + subj) ||
      /hourly briefing|weekly digest|ice escalation|trip alert|situation room/i.test(subj),
  },
  // eblockwatch members
  {
    label: "eblockwatch/👥 Members",
    test: (_from, subj) =>
      /new member|member update|member reply|member registration|re:.*eblockwatch/i.test(subj),
  },
  // Revenue / payments
  {
    label: "eblockwatch/💰 Revenue",
    test: (from, subj) =>
      /paystack|payment|invoice|subscription|receipt|debit order|billing/i.test(from + " " + subj),
  },
  // Newsletters / marketing (bulk senders)
  {
    label: "🗄️ Reference",
    test: (from, subj) =>
      /newsletter|unsubscribe|opt.?out|list-unsubscribe|no-?reply|noreply|mailchimp|sendgrid|campaign|weekly update|digest/i.test(from + " " + subj),
  },
  // Social notifications
  {
    label: "🗄️ Reference",
    test: (from, _subj) =>
      /facebook|instagram|twitter|linkedin|whatsapp|notifications@|noreply@|no-reply@/i.test(from),
  },
  // Waiting / to-action (starred important)
  {
    label: "📋 To Action",
    test: (from, subj) =>
      /urgent|action required|please respond|follow up|follow-up|reminder/i.test(subj) &&
      !/newsletter|unsubscribe|promotion/i.test(subj),
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n📬  Gmail Inbox Labeller — ${GMAIL_USER}`);
  console.log("Connecting via IMAP...\n");

  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user: GMAIL_USER!, pass: GMAIL_PASS! },
    logger: false,
  });

  await client.connect();
  const mailbox = await client.mailboxOpen("INBOX");
  const total = mailbox.exists;
  console.log(`Total messages in INBOX: ${total}\n`);

  if (total === 0) {
    console.log("Nothing to process.");
    await client.logout();
    return;
  }

  const counts: Record<string, number> = {};
  let processed = 0;
  let labelled = 0;

  // Process in batches of BATCH_SIZE to avoid memory issues
  for (let start = 1; start <= total; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE - 1, total);
    const range = `${start}:${end}`;

    for await (const msg of client.fetch(range, { envelope: true })) {
      processed++;

      const from    = msg.envelope?.from?.[0]?.address?.toLowerCase() ?? "";
      const subject = msg.envelope?.subject ?? "";
      const uid     = msg.uid;

      const matchedRule = RULES.find((r) => r.test(from, subject));

      if (matchedRule) {
        // Move to label (in Gmail IMAP, labels are folders — copy + remove from INBOX)
        try {
          await client.messageMove(String(uid), matchedRule.label, { uid: true });
          counts[matchedRule.label] = (counts[matchedRule.label] ?? 0) + 1;
          labelled++;
        } catch {
          // Label might not exist yet — try marking as read at minimum
          try {
            await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
          } catch { /* ignore */ }
        }
      }

      if (processed % 500 === 0) {
        const pct = Math.round((processed / total) * 100);
        process.stdout.write(`\r  Progress: ${processed}/${total} (${pct}%) — labelled: ${labelled}`);
      }
    }
  }

  console.log(`\n\n✅  Done. Processed ${processed} messages, labelled ${labelled}.\n`);
  console.log("Label breakdown:");
  for (const [label, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${label.padEnd(35)} ${n}`);
  }

  await client.logout();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
