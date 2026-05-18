import { Router } from "express";
import nodemailer from "nodemailer";
import { db, messagesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

const GMAIL_USER = process.env.GMAIL_USER ?? "";
const GMAIL_PASS = process.env.GMAIL_APP_PASSWORD ?? "";

router.post("/api/agent-report", async (req, res) => {
  const { message, category, pageUrl } = req.body as {
    message?: string;
    category?: string;
    pageUrl?: string;
  };

  if (!message?.trim()) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  const cat = category ?? "OBSERVATION";
  const ts = new Date().toISOString();
  const body = `[${cat}] ${message.trim()}\n\nPage: ${pageUrl ?? "unknown"}\nSubmitted: ${ts}`;
  const sid = `report-${Date.now()}`;

  try {
    await db.insert(messagesTable).values({
      fromNumber: "situation-room",
      toNumber: "agent",
      body,
      messageSid: sid,
      tripId: null,
      direction: "agent_report",
      receivedAt: new Date(),
    });
  } catch {
    // best-effort — DB store is not critical
  }

  if (GMAIL_USER && GMAIL_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: GMAIL_USER, pass: GMAIL_PASS },
      });
      await transporter.sendMail({
        from: `"Situation Room Reporter" <${GMAIL_USER}>`,
        to: GMAIL_USER,
        subject: `🛠️ Agent Report [${cat}] — ${message.trim().slice(0, 60)}`,
        text: body,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
            <div style="background:#1a1f2e;color:#fff;padding:16px 20px;border-radius:8px 8px 0 0">
              <strong style="color:#22c55e">🛠️ Agent Report</strong>
              <span style="margin-left:12px;background:#22c55e;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px">${cat}</span>
            </div>
            <div style="background:#f8f9fa;padding:20px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0;border-top:none">
              <p style="font-size:16px;margin:0 0 16px">${message.trim()}</p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0"/>
              <p style="color:#6b7280;font-size:12px;margin:0">Page: ${pageUrl ?? "unknown"}<br/>Time: ${ts}</p>
            </div>
          </div>
        `,
      });
    } catch {
      // best-effort — email is not critical
    }
  }

  res.json({ ok: true, sid });
});

router.get("/api/agent-report", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.direction, "agent_report"))
      .orderBy(desc(messagesTable.receivedAt))
      .limit(20);
    res.json(rows);
  } catch {
    res.json([]);
  }
});

export default router;
