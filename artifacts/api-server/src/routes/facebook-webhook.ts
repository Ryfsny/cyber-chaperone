import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import { db, messagesTable, membersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sendFacebookMessage, getFacebookUserName } from "../facebook-service.js";
import { handleMenuRouter, type MenuContext, type MemberInfo } from "../menu-router.js";
import { logMessageToGmail } from "../email-service.js";

const router: Router = Router();

const APP_SECRET = process.env["FACEBOOK_APP_SECRET"] ?? "";
const PAGE_ID    = process.env["FACEBOOK_PAGE_ID"] ?? "page";

// ── Member lookup by fb:psid ──────────────────────────────────────────────────

async function lookupFacebookMember(psid: string, displayName: string | null): Promise<MemberInfo | null> {
  const fbKey = `fb:${psid}`;
  try {
    const [member] = await db
      .select()
      .from(membersTable)
      .where(eq(membersTable.whatsappNumber, fbKey))
      .limit(1);
    if (member) {
      return {
        displayName: member.displayName,
        role: member.role,
        memberStatus: member.memberStatus,
        membershipTier: member.membershipTier ?? null,
        isKnown: member.memberStatus === "verified" || member.memberStatus === "active",
      };
    }
  } catch {
    // DB may not have table yet — fall through
  }
  // Not in DB — return a guest-level context using their FB display name
  if (displayName) {
    return {
      displayName,
      role: null,
      memberStatus: "unverified",
      membershipTier: null,
      isKnown: false,
    };
  }
  return null;
}

// ── Auto-create member record for first-time Facebook contacts ────────────────

async function ensureFacebookMemberRecord(psid: string, displayName: string | null): Promise<void> {
  const fbKey = `fb:${psid}`;
  try {
    const [existing] = await db
      .select({ id: membersTable.id })
      .from(membersTable)
      .where(eq(membersTable.whatsappNumber, fbKey))
      .limit(1);
    if (existing) return;

    const name = displayName ?? "Facebook User";
    const parts = name.split(" ");
    const firstName = parts[0] ?? name;
    const lastName  = parts.slice(1).join(" ") || null;

    await db.insert(membersTable).values({
      firstName,
      lastName:      lastName ?? firstName,
      displayName:   name,
      whatsappNumber: fbKey,
      memberStatus:  "unverified",
      membershipTier: null,
      role:          null,
      sourceBatch:   "facebook",
      importStatus:  "auto",
    });
  } catch {
    // Non-critical — member card is nice-to-have
  }
}

// ── GET /api/webhook/facebook ─────────────────────────────────────────────────
// Meta sends a GET to verify the webhook endpoint during setup.

const VERIFY_TOKEN = process.env["FACEBOOK_VERIFY_TOKEN"] ?? "";

router.get("/webhook/facebook", (req: Request, res: Response): void => {
  const mode      = req.query["hub.mode"] as string | undefined;
  const token     = req.query["hub.verify_token"] as string | undefined;
  const challenge = req.query["hub.challenge"] as string | undefined;

  if (mode === "subscribe" && token && VERIFY_TOKEN && token === VERIFY_TOKEN) {
    req.log.info("Facebook webhook verified");
    res.status(200).send(challenge);
    return;
  }

  req.log.warn({ mode, tokenMatch: token === VERIFY_TOKEN }, "Facebook webhook verification failed");
  res.sendStatus(403);
});

// ── POST /api/webhook/facebook ────────────────────────────────────────────────

router.post("/webhook/facebook", async (req: Request, res: Response): Promise<void> => {
  // ── Signature verification ────────────────────────────────────────────────
  if (APP_SECRET) {
    const sig = req.headers["x-hub-signature-256"] as string | undefined;
    if (!sig) {
      req.log.warn("Facebook webhook: missing x-hub-signature-256");
      res.sendStatus(403);
      return;
    }
    const bodyStr  = JSON.stringify(req.body);
    const expected = "sha256=" + crypto
      .createHmac("sha256", APP_SECRET)
      .update(bodyStr)
      .digest("hex");

    let valid = false;
    try { valid = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)); }
    catch { valid = false; }

    if (!valid) {
      req.log.warn("Facebook webhook: invalid signature");
      res.sendStatus(403);
      return;
    }
  }

  // Respond 200 immediately — Meta requires a fast response
  res.sendStatus(200);

  if (req.body?.object !== "page") return;

  for (const entry of (req.body.entry ?? []) as Array<{ messaging?: unknown[] }>) {
    for (const rawEvent of (entry.messaging ?? []) as Array<{
      sender:   { id: string };
      message?: { text?: string; mid?: string; is_echo?: boolean };
    }>) {
      // Skip echo events (messages sent by the page itself)
      if (rawEvent.message?.is_echo) continue;
      if (!rawEvent.message) continue;

      const psid        = rawEvent.sender.id;
      const text        = (rawEvent.message.text ?? "").trim();
      const mid         = rawEvent.message.mid ?? null;
      const fromNumber  = `fb:${psid}`;
      const toNumber    = `fb:${PAGE_ID}`;

      // Fetch sender's display name from Meta
      const senderName = await getFacebookUserName(psid);

      req.log.info({ psid, senderName, hasText: !!text }, "Facebook Messenger message received");

      // Store inbound message (the menu-router will also store the reply)
      try {
        await db.insert(messagesTable).values({
          fromNumber,
          toNumber,
          body:       text || "[non-text message]",
          messageSid: mid,
          direction:  "inbound",
        });
      } catch (err) {
        req.log.error({ err }, "Facebook: failed to store inbound message");
      }

      // Gmail communication ledger — log every inbound Facebook message
      void logMessageToGmail(
        fromNumber,
        senderName || `fb:${psid}`,
        "inbound",
        text || "[non-text message]",
        "facebook",
      );

      // Non-text messages (stickers, images, etc.) — acknowledge and return
      if (!text) {
        await sendFacebookMessage(psid, "👋 Got your message. To use Cyber Chaperone, please send text. Reply *Hi* or *Menu* to get started.");
        continue;
      }

      // Auto-create a member record so first-time contacts appear in the Members list
      await ensureFacebookMemberRecord(psid, senderName);

      // Look up member record (by fb:psid)
      const member = await lookupFacebookMember(psid, senderName);

      // For first-time Facebook contacts (unverified = auto-created, never interacted before),
      // prepend a sales-funnel intro to the very first reply Arnie sends them.
      const isFirstContact = member?.memberStatus === "unverified";
      let salesIntroSent = false;

      // Build a platform-aware outbound sender so the menu router replies to Messenger
      const sendReply = async (body: string): Promise<void> => {
        let messageToSend = body;

        if (isFirstContact && !salesIntroSent) {
          salesIntroSent = true;
          const displayName = senderName ? senderName.split(" ")[0] : "there";
          messageToSend = [
            `🛡️🏘️ Hey ${displayName}! Welcome to eblockwatch.`,
            ``,
            `We protect South Africans with a real human safety network — not just an app.`,
            `250 000 members trust André Snyman and the eblockwatch community.`,
            ``,
            `✅ Joining is free and takes 2 minutes.`,
            `✅ Full safety features work on WhatsApp — live trip tracking, ICE escalation, and more.`,
            ``,
            `━━━━━━━━━━━━━━━━━━━━`,
            `📱 *Get the full experience on WhatsApp:*`,
            `Just send "Hi" to wa.me/27825611065`,
            `Arnie (André's digital assistant) will guide you through everything — step by step.`,
            `━━━━━━━━━━━━━━━━━━━━`,
            ``,
            messageToSend,
          ].join("\n");
        }

        // Store the outbound reply in the messages table
        try {
          await db.insert(messagesTable).values({
            fromNumber: toNumber,
            toNumber:   fromNumber,
            body:       messageToSend,
            messageSid: null,
            direction:  "outbound",
          });
        } catch { /* non-critical */ }
        await sendFacebookMessage(psid, messageToSend);
      };

      // Build context and hand off to the full menu router
      const ctx: MenuContext = {
        body:       text,
        from:       fromNumber,
        to:         toNumber,
        member,
        latitude:   "",
        longitude:  "",
        address:    "",
        label:      "",
        messageSid: mid,
        log:        req.log,
        sendReply,
      };

      await handleMenuRouter(ctx);

      // If the member just entered Cyber Chaperone / trip flow from Messenger,
      // bridge them to WhatsApp — location pins and live tracking don't work here.
      const trimmed = text.trim();
      const isCCRequest = trimmed === "5" || /\b(cyber.?chap|chaperone|travel|trip|escort)\b/i.test(trimmed);
      if (isCCRequest) {
        await sendFacebookMessage(psid, [
          `⚠️ *For full Cyber Chaperone protection, use WhatsApp.*`,
          ``,
          `Live location tracking and ICE escalation require WhatsApp — they do not work on Messenger.`,
          ``,
          `👉 Send "Hi" to: wa.me/27825611065`,
          `Arnie will pick up exactly where we left off and activate your trip monitoring.`,
        ].join("\n"));
      }
    }
  }
});

export default router;
