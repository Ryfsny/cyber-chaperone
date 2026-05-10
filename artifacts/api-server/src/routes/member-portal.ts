import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import twilio from "twilio";
import { db, membersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";

const router: IRouter = Router();

// ── In-memory OTP store (10-minute TTL) ───────────────────────────────────────
interface OtpEntry { code: string; expiresAt: number }
const otpStore = new Map<string, OtpEntry>();

function cleanExpired() {
  const now = Date.now();
  for (const [k, v] of otpStore) {
    if (v.expiresAt < now) otpStore.delete(k);
  }
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Normalize SA WhatsApp number → +27XXXXXXXXX */
function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("27") && digits.length === 11) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+27${digits.slice(1)}`;
  if (digits.length === 9) return `+27${digits}`;
  return `+${digits}`;
}

// ── Member auth guard middleware ───────────────────────────────────────────────
function requireMemberAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session.memberId) {
    next();
    return;
  }
  res.status(401).json({ error: "Not authenticated as a member." });
}

async function sendOtpWhatsApp(phone: string, code: string): Promise<void> {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  await client.messages.create({
    from: "whatsapp:+27825611065",
    to: `whatsapp:${phone}`,
    body: `Your eblockwatch login code is: *${code}*\n\nThis code expires in 10 minutes. Do not share it with anyone.\n\n— eblockwatch`,
  });
}

// ── POST /api/member-portal/request-otp ───────────────────────────────────────
router.post("/member-portal/request-otp", async (req, res): Promise<void> => {
  const raw = (req.body?.whatsappNumber ?? "") as string;
  if (!raw) {
    res.status(400).json({ error: "whatsappNumber is required." });
    return;
  }

  const phone = normalisePhone(raw.trim());

  // Check member exists
  const [member] = await db
    .select({ id: membersTable.id, firstName: membersTable.firstName })
    .from(membersTable)
    .where(
      or(
        eq(membersTable.whatsappNumber, `whatsapp:${phone}`),
        eq(membersTable.whatsappNumber, phone),
      ),
    );

  if (!member) {
    // Don't reveal whether the number exists — generic response
    res.json({ ok: true, message: "If that number is registered, you'll receive a WhatsApp OTP." });
    return;
  }

  cleanExpired();
  const code = generateOtp();
  otpStore.set(phone, { code, expiresAt: Date.now() + 10 * 60 * 1000 });

  try {
    await sendOtpWhatsApp(phone, code);
  } catch (err) {
    req.log.error({ err }, "Failed to send OTP via WhatsApp");
    res.status(500).json({ error: "Failed to send WhatsApp OTP. Please try again." });
    return;
  }

  res.json({ ok: true, message: "OTP sent to your WhatsApp number." });
});

// ── POST /api/member-portal/verify-otp ────────────────────────────────────────
router.post("/member-portal/verify-otp", async (req, res): Promise<void> => {
  const raw = (req.body?.whatsappNumber ?? "") as string;
  const code = String(req.body?.code ?? "").trim();

  if (!raw || !code) {
    res.status(400).json({ error: "whatsappNumber and code are required." });
    return;
  }

  const phone = normalisePhone(raw.trim());
  const entry = otpStore.get(phone);

  if (!entry || entry.expiresAt < Date.now()) {
    res.status(401).json({ error: "OTP expired or not found. Please request a new one." });
    return;
  }

  if (entry.code !== code) {
    res.status(401).json({ error: "Incorrect OTP. Please check your WhatsApp and try again." });
    return;
  }

  // Valid — find member
  const [member] = await db
    .select()
    .from(membersTable)
    .where(
      or(
        eq(membersTable.whatsappNumber, `whatsapp:${phone}`),
        eq(membersTable.whatsappNumber, phone),
      ),
    );

  if (!member) {
    res.status(401).json({ error: "Member not found." });
    return;
  }

  otpStore.delete(phone);

  req.session.memberId = member.id;
  req.session.save((err) => {
    if (err) {
      res.status(500).json({ error: "Session error." });
      return;
    }
    res.json({ ok: true, member: { id: member.id, firstName: member.firstName, displayName: member.displayName } });
  });
});

// ── GET /api/member-portal/me ─────────────────────────────────────────────────
router.get("/member-portal/me", requireMemberAuth, async (req, res): Promise<void> => {
  const [member] = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.id, req.session.memberId!));

  if (!member) {
    req.session.destroy(() => {});
    res.status(404).json({ error: "Member not found." });
    return;
  }

  res.json({ member });
});

// ── PATCH /api/member-portal/me ───────────────────────────────────────────────
router.patch("/member-portal/me", requireMemberAuth, async (req, res): Promise<void> => {
  const allowed = ["firstName", "lastName", "displayName", "notes", "iceContactName", "iceContactPhone"] as const;
  type AllowedKey = typeof allowed[number];
  const update: Partial<Record<AllowedKey, string>> = {};

  for (const key of allowed) {
    const val = req.body?.[key];
    if (typeof val === "string") update[key] = val.trim();
  }

  if (Object.keys(update).length === 0) {
    res.status(400).json({ error: "No valid fields provided." });
    return;
  }

  const [updated] = await db
    .update(membersTable)
    .set({ ...update, updatedAt: new Date() })
    .where(eq(membersTable.id, req.session.memberId!))
    .returning();

  res.json({ member: updated });
});

// ── POST /api/member-portal/logout ────────────────────────────────────────────
router.post("/member-portal/logout", (req, res): void => {
  req.session.memberId = undefined;
  req.session.save((err) => {
    if (err) {
      res.status(500).json({ error: "Logout error." });
      return;
    }
    res.json({ ok: true });
  });
});

export default router;
