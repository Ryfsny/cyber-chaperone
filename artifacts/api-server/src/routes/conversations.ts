import { Router, type IRouter, type Request, type Response } from "express";
import { db, messagesTable, membersTable } from "@workspace/db";
import { or, eq, desc, asc } from "drizzle-orm";
import twilio from "twilio";

const router: IRouter = Router();

const OPERATOR_NUMBER = process.env["TWILIO_WHATSAPP_NUMBER"] ?? "whatsapp:+14155238886";

// ── GET /api/conversations
// Returns one row per unique contact (member phone), with last message + member name.
router.get("/conversations", async (_req: Request, res: Response): Promise<void> => {
  // Pull all messages ordered newest-first
  const all = await db
    .select()
    .from(messagesTable)
    .orderBy(desc(messagesTable.receivedAt));

  // Build a map: contactNumber → { lastMessage, direction }
  const seen = new Map<string, (typeof all)[0]>();
  for (const msg of all) {
    const contact = msg.direction === "inbound" ? msg.fromNumber : msg.toNumber;
    if (!seen.has(contact)) seen.set(contact, msg);
  }

  // Look up member names for known contacts
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
    const last = seen.get(number)!;
    const member = memberByNumber.get(number);
    return {
      number,
      displayName: member?.displayName ?? number.replace("whatsapp:", ""),
      memberStatus: member?.memberStatus ?? null,
      memberId: member?.id ?? null,
      lastMessage: last.body,
      lastDirection: last.direction,
      lastAt: last.receivedAt,
    };
  });

  // Sort by lastAt descending
  conversations.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());

  res.json(conversations);
});

// ── GET /api/conversations/:number
// Returns all messages (both directions) for a contact number, oldest-first.
router.get("/conversations/:number", async (req: Request, res: Response): Promise<void> => {
  const raw = req.params["number"] as string;
  // Accept with or without "whatsapp:" prefix
  const number = raw.startsWith("whatsapp:") ? raw : `whatsapp:${raw}`;

  const messages = await db
    .select()
    .from(messagesTable)
    .where(or(eq(messagesTable.fromNumber, number), eq(messagesTable.toNumber, number)))
    .orderBy(asc(messagesTable.receivedAt));

  // Look up member
  const members = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.whatsappNumber, number));

  res.json({ messages, member: members[0] ?? null });
});

// ── POST /api/conversations/reply
// Body: { to: string, body: string }
// Sends a WhatsApp message and stores it as an outbound message.
router.post("/conversations/reply", async (req: Request, res: Response): Promise<void> => {
  const { to, body } = req.body as { to?: string; body?: string };

  if (!to || !body?.trim()) {
    res.status(400).json({ error: "to and body are required." });
    return;
  }

  const sid = process.env["TWILIO_ACCOUNT_SID"];
  const token = process.env["TWILIO_AUTH_TOKEN"];
  if (!sid || !token) {
    res.status(500).json({ error: "Twilio not configured." });
    return;
  }

  const toNumber = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  const client = twilio(sid, token);

  let messageSid: string | undefined;
  try {
    const sent = await client.messages.create({ from: OPERATOR_NUMBER, to: toNumber, body: body.trim() });
    messageSid = sent.sid;
  } catch (err) {
    res.status(500).json({ error: `Twilio error: ${String(err)}` });
    return;
  }

  // Persist as outbound
  const [saved] = await db
    .insert(messagesTable)
    .values({
      fromNumber: OPERATOR_NUMBER,
      toNumber: toNumber,
      body: body.trim(),
      messageSid,
      direction: "outbound",
    })
    .returning();

  res.json({ ok: true, message: saved });
});

export default router;
