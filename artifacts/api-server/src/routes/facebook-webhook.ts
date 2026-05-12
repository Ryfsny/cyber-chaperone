import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import { db, messagesTable } from "@workspace/db";
import { sendFacebookMessage, getFacebookUserName } from "../facebook-service.js";

const router: Router = Router();

const VERIFY_TOKEN = process.env["FACEBOOK_VERIFY_TOKEN"] ?? "";
const APP_SECRET   = process.env["FACEBOOK_APP_SECRET"] ?? "";
const PAGE_ID      = process.env["FACEBOOK_PAGE_ID"] ?? "page";

// ── GET /api/webhook/facebook ─────────────────────────────────────────────────
// Meta sends a GET to verify the webhook endpoint during setup.
// We must echo back hub.challenge when hub.verify_token matches.
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
// Receives incoming Messenger events from Meta.
router.post("/webhook/facebook", async (req: Request, res: Response): Promise<void> => {
  // ── Signature verification ────────────────────────────────────────────────
  if (APP_SECRET) {
    const sig = req.headers["x-hub-signature-256"] as string | undefined;
    if (!sig) {
      req.log.warn("Facebook webhook: missing x-hub-signature-256");
      res.sendStatus(403);
      return;
    }
    const bodyStr = JSON.stringify(req.body);
    const expected = "sha256=" + crypto
      .createHmac("sha256", APP_SECRET)
      .update(bodyStr)
      .digest("hex");

    let valid = false;
    try {
      valid = crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
    } catch {
      valid = false;
    }

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
      sender: { id: string };
      message?: { text?: string; mid?: string; is_echo?: boolean };
    }>) {
      // Skip echo events (messages sent by the page itself)
      if (rawEvent.message?.is_echo) continue;
      if (!rawEvent.message) continue;

      const psid      = rawEvent.sender.id;
      const text      = rawEvent.message.text ?? "";
      const mid       = rawEvent.message.mid ?? null;
      const fromNumber = `fb:${psid}`;
      const toNumber   = `fb:${PAGE_ID}`;

      // Fetch sender's display name from Meta
      const senderName = await getFacebookUserName(psid);
      const firstName  = senderName?.split(" ")[0] ?? null;

      req.log.info({ psid, senderName, mid: mid ? "[redacted]" : null }, "Facebook Messenger message received");

      // Store inbound message
      try {
        await db.insert(messagesTable).values({
          fromNumber,
          toNumber,
          body:       text || "[non-text message]",
          messageSid: mid,
          direction:  "inbound",
        });
      } catch (err) {
        req.log.error({ err }, "Facebook: failed to store message");
      }

      // Auto-reply — directs them to WhatsApp for trip monitoring
      if (text.trim()) {
        const greeting = firstName ? `Hi ${firstName}` : "Hi there";
        await sendFacebookMessage(psid, [
          `${greeting} 👋 — this is Cyber Chaperone by eblockwatch.`,
          ``,
          `Your message has been received. Andre can see it in the Situation Room and will reply here shortly.`,
          ``,
          `To activate trip monitoring right now, WhatsApp us on +27 82 561 1065 — just send "Hi" to get started.`,
          ``,
          `Stay safe. 🛡️`,
          `— Cyber Chaperone`,
        ].join("\n"));
      }
    }
  }
});

export default router;
