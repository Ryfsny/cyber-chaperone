import { Router, type IRouter, type Request, type Response } from "express";
import { db, membersTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import twilio from "twilio";

const router: IRouter = Router();

// POST /api/broadcast
// Body: { memberIds: number[], message: string }
// Sends a WhatsApp message to all listed members who have a whatsappNumber.
// Protected by requireAuth (mounted after auth middleware in routes/index.ts).
router.post("/broadcast", async (req: Request, res: Response): Promise<void> => {
  const { memberIds, message } = req.body as { memberIds?: number[]; message?: string };

  if (!Array.isArray(memberIds) || memberIds.length === 0) {
    res.status(400).json({ error: "memberIds must be a non-empty array." });
    return;
  }
  if (!message || message.trim().length === 0) {
    res.status(400).json({ error: "message is required." });
    return;
  }
  if (memberIds.length > 500) {
    res.status(400).json({ error: "Maximum 500 recipients per broadcast." });
    return;
  }

  const sid = process.env["TWILIO_ACCOUNT_SID"];
  const token = process.env["TWILIO_AUTH_TOKEN"];
  const from = process.env["TWILIO_WHATSAPP_NUMBER"] ?? "whatsapp:+14155238886";

  if (!sid || !token) {
    res.status(500).json({ error: "Twilio not configured." });
    return;
  }

  const members = await db
    .select({
      id: membersTable.id,
      firstName: membersTable.firstName,
      displayName: membersTable.displayName,
      whatsappNumber: membersTable.whatsappNumber,
    })
    .from(membersTable)
    .where(inArray(membersTable.id, memberIds));

  const client = twilio(sid, token);
  const results: { id: number; name: string; status: "sent" | "failed"; error?: string }[] = [];

  for (const member of members) {
    if (!member.whatsappNumber) {
      results.push({ id: member.id, name: member.displayName, status: "failed", error: "No WhatsApp number." });
      continue;
    }
    try {
      const personalised = message.trim().replace(/\{name\}/gi, member.firstName ?? member.displayName);
      await client.messages.create({ from, to: member.whatsappNumber, body: personalised });
      results.push({ id: member.id, name: member.displayName, status: "sent" });
    } catch (err) {
      results.push({ id: member.id, name: member.displayName, status: "failed", error: String(err) });
    }
    // Small delay to avoid Twilio rate limits
    await new Promise((r) => setTimeout(r, 80));
  }

  const sent = results.filter((r) => r.status === "sent").length;
  const failed = results.filter((r) => r.status === "failed").length;

  res.json({ ok: true, sent, failed, total: results.length, results });
});

export default router;
