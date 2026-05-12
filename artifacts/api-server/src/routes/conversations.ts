import { Router, type IRouter, type Request, type Response } from "express";
import { db, messagesTable, membersTable } from "@workspace/db";
import { or, eq, desc, asc } from "drizzle-orm";
import twilio from "twilio";
import { sendFacebookMessage } from "../facebook-service.js";

const router: IRouter = Router();

const OPERATOR_NUMBER = process.env["TWILIO_WHATSAPP_NUMBER"] ?? "whatsapp:+14155238886";

/** Normalise a raw contact identifier to its canonical stored form. */
function canonicalNumber(raw: string): string {
  if (raw.startsWith("fb:") || raw.startsWith("whatsapp:")) return raw;
  return `whatsapp:${raw}`;
}

/** Produce a human-readable display name for a contact number. */
function contactDisplayName(number: string): string {
  if (number.startsWith("fb:")) {
    const psid = number.slice(3);
    return `Facebook · ${psid.slice(0, 6)}…`;
  }
  return number.replace("whatsapp:", "");
}

// ── GET /api/conversations ────────────────────────────────────────────────────
// Returns one row per unique contact, with last message + member name.
router.get("/conversations", async (_req: Request, res: Response): Promise<void> => {
  const all = await db
    .select()
    .from(messagesTable)
    .orderBy(desc(messagesTable.receivedAt));

  const seen = new Map<string, (typeof all)[0]>();
  for (const msg of all) {
    const contact = msg.direction === "inbound" ? msg.fromNumber : msg.toNumber;
    if (!seen.has(contact)) seen.set(contact, msg);
  }

  const contactNumbers = Array.from(seen.keys());
  const members =
    contactNumbers.length > 0
      ? await db
          .select({
            id: membersTable.id,
            displayName: membersTable.displayName,
            whatsappNumber: membersTable.whatsappNumber,
            memberStatus: membersTable.memberStatus,
          })
          .from(membersTable)
      : [];

  const memberByNumber = new Map(members.map((m) => [m.whatsappNumber, m]));

  const conversations = contactNumbers.map((number) => {
    const last   = seen.get(number)!;
    const member = memberByNumber.get(number);
    return {
      number,
      displayName:  member?.displayName ?? contactDisplayName(number),
      memberStatus: member?.memberStatus ?? null,
      memberId:     member?.id ?? null,
      channel:      number.startsWith("fb:") ? "facebook" : "whatsapp",
      lastMessage:  last.body,
      lastDirection: last.direction,
      lastAt:       last.receivedAt,
    };
  });

  conversations.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
  res.json(conversations);
});

// ── GET /api/conversations/:number ───────────────────────────────────────────
// Returns all messages (both directions) for a contact, oldest-first.
router.get("/conversations/:number", async (req: Request, res: Response): Promise<void> => {
  const raw    = decodeURIComponent(req.params["number"] as string);
  const number = canonicalNumber(raw);

  const messages = await db
    .select()
    .from(messagesTable)
    .where(or(eq(messagesTable.fromNumber, number), eq(messagesTable.toNumber, number)))
    .orderBy(asc(messagesTable.receivedAt));

  // Member lookup — only WhatsApp numbers can be matched to members
  let member = null;
  if (number.startsWith("whatsapp:")) {
    const members = await db
      .select()
      .from(membersTable)
      .where(eq(membersTable.whatsappNumber, number));
    member = members[0] ?? null;
  }

  res.json({ messages, member });
});

// ── POST /api/conversations/reply ─────────────────────────────────────────────
// Body: { to: string, body: string }
// Routes to WhatsApp (Twilio) or Facebook Messenger depending on the prefix.
router.post("/conversations/reply", async (req: Request, res: Response): Promise<void> => {
  const { to, body } = req.body as { to?: string; body?: string };

  if (!to || !body?.trim()) {
    res.status(400).json({ error: "to and body are required." });
    return;
  }

  // ── Facebook Messenger reply ─────────────────────────────────────────────
  if (to.startsWith("fb:")) {
    const psid = to.slice(3);
    try {
      await sendFacebookMessage(psid, body.trim());
    } catch (err) {
      res.status(500).json({ error: `Facebook error: ${String(err)}` });
      return;
    }

    const [saved] = await db
      .insert(messagesTable)
      .values({
        fromNumber: `fb:page`,
        toNumber:   to,
        body:       body.trim(),
        messageSid: null,
        direction:  "outbound",
      })
      .returning();

    res.json({ ok: true, message: saved });
    return;
  }

  // ── WhatsApp reply (Twilio) ──────────────────────────────────────────────
  const sid   = process.env["TWILIO_ACCOUNT_SID"];
  const token = process.env["TWILIO_AUTH_TOKEN"];
  if (!sid || !token) {
    res.status(500).json({ error: "Twilio not configured." });
    return;
  }

  const toNumber = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  const client   = twilio(sid, token);

  let messageSid: string | undefined;
  try {
    const sent = await client.messages.create({ from: OPERATOR_NUMBER, to: toNumber, body: body.trim() });
    messageSid = sent.sid;
  } catch (err) {
    res.status(500).json({ error: `Twilio error: ${String(err)}` });
    return;
  }

  const [saved] = await db
    .insert(messagesTable)
    .values({
      fromNumber: OPERATOR_NUMBER,
      toNumber:   toNumber,
      body:       body.trim(),
      messageSid,
      direction:  "outbound",
    })
    .returning();

  res.json({ ok: true, message: saved });
});

export default router;
