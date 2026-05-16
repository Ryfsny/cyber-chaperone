import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import twilio from "twilio";
import bcrypt from "bcryptjs";
import { db, membersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import nodemailer from "nodemailer";
import {
  otpStore, otpCooldown, cleanExpired, generateOtp, normalisePhone, issueOtp,
  OTP_TTL_MS, OTP_COOLDOWN_MS, OTP_MAX_ATTEMPTS,
} from "../otp-store.js";

const router: IRouter = Router();

const BCRYPT_ROUNDS = 12;

function requireMemberAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session.memberId) { next(); return; }
  res.status(401).json({ error: "Not authenticated as a member." });
}

async function sendOtpWhatsApp(phone: string, code: string): Promise<void> {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  await client.messages.create({
    from: process.env["TWILIO_WHATSAPP_NUMBER"] ?? "whatsapp:+27825611065",
    to: `whatsapp:${phone}`,
    body: `Your eblockwatch login code is: *${code}*\n\nThis code expires in 10 minutes. Do not share it with anyone.\n\n— eblockwatch`,
  });
}

async function sendOtpEmail(email: string, code: string): Promise<void> {
  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });
  await transport.sendMail({
    from: `"eblockwatch" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Your eblockwatch login code",
    html: `<p>Your eblockwatch login code is: <strong style="font-size:24px;letter-spacing:4px">${code}</strong></p><p>This code expires in 10 minutes. Do not share it with anyone.</p><p>— eblockwatch</p>`,
  });
}

// ── POST /api/member-portal/request-otp ───────────────────────────────────────
// Accepts whatsappNumber (phone) OR email — sends code via WhatsApp or email
router.post("/member-portal/request-otp", async (req, res): Promise<void> => {
  const rawPhone = (req.body?.whatsappNumber ?? "") as string;
  const rawEmail = (req.body?.email ?? "") as string;

  if (!rawPhone && !rawEmail) {
    res.status(400).json({ error: "Cell phone number or email is required." });
    return;
  }

  cleanExpired();
  const generic = { ok: true, message: "If that account exists, a code has been sent." };

  if (rawPhone) {
    const phone = normalisePhone(rawPhone.trim());

    // If a valid unexpired code already exists, re-send it (don't overwrite the WhatsApp profile code)
    const existing = otpStore.get(phone);
    if (existing && existing.expiresAt > Date.now()) {
      res.json(generic);
      sendOtpWhatsApp(phone, existing.code).catch((err: unknown) => req.log.error({ err }, "Failed to resend OTP via WhatsApp"));
      return;
    }

    const cooldown = otpCooldown.get(phone);
    if (cooldown && Date.now() - cooldown.lastRequestAt < OTP_COOLDOWN_MS) { res.json(generic); return; }
    otpCooldown.set(phone, { lastRequestAt: Date.now() });

    const [member] = await db
      .select({ id: membersTable.id })
      .from(membersTable)
      .where(or(eq(membersTable.whatsappNumber, `whatsapp:${phone}`), eq(membersTable.whatsappNumber, phone)));

    if (!member) { res.json(generic); return; }

    const code = generateOtp();
    otpStore.set(phone, { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });
    res.json(generic);
    sendOtpWhatsApp(phone, code).catch((err: unknown) => req.log.error({ err }, "Failed to send OTP via WhatsApp"));
    return;
  }

  // Email path
  const email = rawEmail.trim().toLowerCase();

  // Reuse existing valid code for email too
  const existingEmail = otpStore.get(email);
  if (existingEmail && existingEmail.expiresAt > Date.now()) {
    res.json(generic);
    sendOtpEmail(email, existingEmail.code).catch((err: unknown) => req.log.error({ err }, "Failed to resend OTP via email"));
    return;
  }

  const cooldown = otpCooldown.get(email);
  if (cooldown && Date.now() - cooldown.lastRequestAt < OTP_COOLDOWN_MS) { res.json(generic); return; }
  otpCooldown.set(email, { lastRequestAt: Date.now() });

  const [member] = await db
    .select({ id: membersTable.id, email: membersTable.email })
    .from(membersTable)
    .where(eq(membersTable.email, email));

  if (!member?.email) { res.json(generic); return; }

  const code = generateOtp();
  otpStore.set(email, { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });
  res.json(generic);
  sendOtpEmail(email, code).catch((err: unknown) => req.log.error({ err }, "Failed to send OTP via email"));
});

// ── POST /api/member-portal/verify-otp ────────────────────────────────────────
// Accepts whatsappNumber (phone) OR email to match the request-otp call
router.post("/member-portal/verify-otp", async (req, res): Promise<void> => {
  const rawPhone = (req.body?.whatsappNumber ?? "") as string;
  const rawEmail = (req.body?.email ?? "") as string;
  const code = String(req.body?.code ?? "").trim();

  if ((!rawPhone && !rawEmail) || !code) {
    res.status(400).json({ error: "Phone or email, and code are required." });
    return;
  }

  const key = rawPhone ? normalisePhone(rawPhone.trim()) : rawEmail.trim().toLowerCase();
  const entry = otpStore.get(key);

  if (!entry || entry.expiresAt < Date.now()) {
    res.status(401).json({ error: "Code expired or not found. Please request a new one." });
    return;
  }

  if (entry.code !== code) {
    entry.attempts += 1;
    if (entry.attempts >= OTP_MAX_ATTEMPTS) {
      otpStore.delete(key);
      res.status(401).json({ error: "Too many incorrect attempts. Please request a new code." });
      return;
    }
    res.status(401).json({ error: "Incorrect code. Please try again." });
    return;
  }

  otpStore.delete(key);

  // Look up member by phone or email
  const [member] = rawPhone
    ? await db.select().from(membersTable).where(or(eq(membersTable.whatsappNumber, `whatsapp:${key}`), eq(membersTable.whatsappNumber, key)))
    : await db.select().from(membersTable).where(eq(membersTable.email, key));

  if (!member) { res.status(401).json({ error: "Member not found." }); return; }

  req.session.memberId = member.id;
  req.session.save((err) => {
    if (err) { res.status(500).json({ error: "Session error." }); return; }
    res.json({ ok: true, member: { id: member.id, firstName: member.firstName, displayName: member.displayName } });
  });
});

// ── POST /api/member-portal/login ─────────────────────────────────────────────
// Password-based login — alternative to OTP
router.post("/member-portal/login", async (req, res): Promise<void> => {
  const rawPhone = (req.body?.whatsappNumber ?? req.body?.phone ?? "") as string;
  const password = (req.body?.password ?? "") as string;

  if (!rawPhone || !password) {
    res.status(400).json({ error: "Phone number and password are required." });
    return;
  }

  const rawEmail = (req.body?.email ?? "") as string;

  // Look up by phone or email
  let member: typeof membersTable.$inferSelect | undefined;
  if (rawPhone) {
    const phone = normalisePhone(rawPhone.trim());
    [member] = await db
      .select()
      .from(membersTable)
      .where(or(eq(membersTable.whatsappNumber, `whatsapp:${phone}`), eq(membersTable.whatsappNumber, phone)));
  } else if (rawEmail) {
    const email = rawEmail.trim().toLowerCase();
    [member] = await db.select().from(membersTable).where(eq(membersTable.email, email));
  }

  if (!member) {
    // Generic delay to prevent timing oracle
    await bcrypt.hash("dummy_delay", BCRYPT_ROUNDS);
    res.status(401).json({ error: "Invalid phone number or password." });
    return;
  }

  // Operator shortcut — OPERATOR_PASSWORD works for any member with role=operator
  const operatorPassword = process.env.OPERATOR_PASSWORD ?? "";
  const isOperatorLogin = member.role === "operator" && operatorPassword && password === operatorPassword;

  if (!isOperatorLogin) {
    if (!member.passwordHash) {
      await bcrypt.hash("dummy_delay", BCRYPT_ROUNDS);
      res.status(401).json({ error: "Invalid phone number or password." });
      return;
    }
    const valid = await bcrypt.compare(password, member.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid phone number or password." });
      return;
    }
  }

  req.session.memberId = member.id;
  req.session.save((err) => {
    if (err) { res.status(500).json({ error: "Session error." }); return; }
    res.json({ ok: true, member: { id: member.id, firstName: member.firstName, displayName: member.displayName } });
  });
});

// ── POST /api/member-portal/set-password ─────────────────────────────────────
// Authenticated — set or change password
router.post("/member-portal/set-password", requireMemberAuth, async (req, res): Promise<void> => {
  const newPassword = (req.body?.password ?? "") as string;
  const currentPassword = (req.body?.currentPassword ?? "") as string;

  if (!newPassword || newPassword.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters." });
    return;
  }

  const [member] = await db
    .select({ id: membersTable.id, passwordHash: membersTable.passwordHash })
    .from(membersTable)
    .where(eq(membersTable.id, req.session.memberId!));

  if (!member) { res.status(404).json({ error: "Member not found." }); return; }

  // If a password already exists, require the current password
  if (member.passwordHash) {
    if (!currentPassword) {
      res.status(400).json({ error: "Current password is required to set a new one." });
      return;
    }
    const valid = await bcrypt.compare(currentPassword, member.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Current password is incorrect." });
      return;
    }
  }

  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await db.update(membersTable).set({ passwordHash: hash, updatedAt: new Date() }).where(eq(membersTable.id, member.id));
  res.json({ ok: true, message: "Password updated successfully." });
});

// ── POST /api/member-portal/forgot-password ───────────────────────────────────
// Sends OTP to WhatsApp or email for password reset — same verify-otp flow
router.post("/member-portal/forgot-password", async (req, res): Promise<void> => {
  const rawPhone = (req.body?.whatsappNumber ?? "") as string;
  const rawEmail = (req.body?.email ?? "") as string;

  if (!rawPhone && !rawEmail) {
    res.status(400).json({ error: "Provide whatsappNumber or email." });
    return;
  }

  cleanExpired();
  const generic = { ok: true, message: "If that account exists, a reset code has been sent." };

  if (rawPhone) {
    // WhatsApp OTP path (reuse same OTP flow)
    const phone = normalisePhone(rawPhone.trim());

    const cooldown = otpCooldown.get(phone);
    if (cooldown && Date.now() - cooldown.lastRequestAt < OTP_COOLDOWN_MS) {
      res.json(generic); return;
    }
    otpCooldown.set(phone, { lastRequestAt: Date.now() });

    const [member] = await db
      .select({ id: membersTable.id })
      .from(membersTable)
      .where(or(eq(membersTable.whatsappNumber, `whatsapp:${phone}`), eq(membersTable.whatsappNumber, phone)));

    if (!member) { res.json(generic); return; }

    const code = generateOtp();
    otpStore.set(phone, { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });
    res.json(generic);
    sendOtpWhatsApp(phone, code).catch((err: unknown) => req.log.error({ err }, "Failed to send reset OTP via WhatsApp"));
    return;
  }

  // Email OTP path
  const email = rawEmail.trim().toLowerCase();
  const [member] = await db
    .select({ id: membersTable.id, email: membersTable.email })
    .from(membersTable)
    .where(eq(membersTable.email, email));

  if (!member?.email) { res.json(generic); return; }

  const cooldown = otpCooldown.get(email);
  if (cooldown && Date.now() - cooldown.lastRequestAt < OTP_COOLDOWN_MS) {
    res.json(generic); return;
  }
  otpCooldown.set(email, { lastRequestAt: Date.now() });

  const code = generateOtp();
  otpStore.set(email, { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });
  res.json(generic);
  sendOtpEmail(member.email, code).catch((err: unknown) => req.log.error({ err }, "Failed to send reset OTP via email"));
});

// ── POST /api/member-portal/verify-reset-otp ─────────────────────────────────
// Verifies a reset OTP (from email or WhatsApp) and logs the member in
router.post("/member-portal/verify-reset-otp", async (req, res): Promise<void> => {
  const rawPhone = (req.body?.whatsappNumber ?? "") as string;
  const rawEmail = (req.body?.email ?? "") as string;
  const code = String(req.body?.code ?? "").trim();

  const key = rawPhone ? normalisePhone(rawPhone.trim()) : rawEmail.trim().toLowerCase();
  if (!key || !code) { res.status(400).json({ error: "Identifier and code are required." }); return; }

  const entry = otpStore.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    res.status(401).json({ error: "Code expired or not found. Request a new one." });
    return;
  }

  if (entry.code !== code) {
    entry.attempts += 1;
    if (entry.attempts >= OTP_MAX_ATTEMPTS) {
      otpStore.delete(key);
      res.status(401).json({ error: "Too many incorrect attempts. Please request a new code." });
      return;
    }
    res.status(401).json({ error: "Incorrect code." });
    return;
  }

  otpStore.delete(key);

  let member: { id: number; firstName: string | null; displayName: string } | undefined;
  if (rawPhone) {
    const phone = normalisePhone(rawPhone.trim());
    [member] = await db
      .select({ id: membersTable.id, firstName: membersTable.firstName, displayName: membersTable.displayName })
      .from(membersTable)
      .where(or(eq(membersTable.whatsappNumber, `whatsapp:${phone}`), eq(membersTable.whatsappNumber, phone)));
  } else {
    const email = rawEmail.trim().toLowerCase();
    [member] = await db
      .select({ id: membersTable.id, firstName: membersTable.firstName, displayName: membersTable.displayName })
      .from(membersTable)
      .where(eq(membersTable.email, email));
  }

  if (!member) { res.status(401).json({ error: "Member not found." }); return; }

  req.session.memberId = member.id;
  req.session.save((err) => {
    if (err) { res.status(500).json({ error: "Session error." }); return; }
    res.json({ ok: true, member: { id: member!.id, firstName: member!.firstName, displayName: member!.displayName } });
  });
});

// ── GET /api/member-portal/me ─────────────────────────────────────────────────
router.get("/member-portal/me", requireMemberAuth, async (req, res): Promise<void> => {
  const [member] = await db.select().from(membersTable).where(eq(membersTable.id, req.session.memberId!));
  if (!member) { req.session.destroy(() => {}); res.status(404).json({ error: "Member not found." }); return; }
  // Strip sensitive server-only field before returning
  const { passwordHash: _ph, ...safe } = member;
  res.json({ member: safe });
});

// ── PATCH /api/member-portal/me ───────────────────────────────────────────────
router.patch("/member-portal/me", requireMemberAuth, async (req, res): Promise<void> => {
  const allowed = [
    "firstName", "lastName", "displayName", "notes",
    "iceContactName", "iceContactPhone",
    "email", "mobile", "homeAddress", "suburb", "city", "province", "postalCode", "country",
    "industry",
  ] as const;
  type AllowedKey = typeof allowed[number];
  const update: Partial<Record<AllowedKey, string>> = {};
  for (const key of allowed) {
    const val = req.body?.[key];
    if (typeof val === "string") update[key] = val.trim();
  }
  if (Object.keys(update).length === 0) {
    res.status(400).json({ error: "No valid fields provided." }); return;
  }
  const [updated] = await db
    .update(membersTable).set({ ...update, updatedAt: new Date() })
    .where(eq(membersTable.id, req.session.memberId!)).returning();
  const { passwordHash: _ph, ...safe } = updated;
  res.json({ member: safe });
});

// ── POST /api/member-portal/cancel-subscription ───────────────────────────────
router.post("/member-portal/cancel-subscription", requireMemberAuth, async (req, res): Promise<void> => {
  const [member] = await db
    .select({ id: membersTable.id, paystackSubscriptionCode: membersTable.paystackSubscriptionCode })
    .from(membersTable)
    .where(eq(membersTable.id, req.session.memberId!));

  if (!member) { res.status(404).json({ error: "Member not found." }); return; }
  if (!member.paystackSubscriptionCode) {
    res.status(400).json({ error: "No active subscription found." }); return;
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) { res.status(500).json({ error: "Payment system not configured." }); return; }

  // Fetch subscription to get email_token required by Paystack disable API
  const subRes = await fetch(`https://api.paystack.co/subscription/${member.paystackSubscriptionCode}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  if (!subRes.ok) {
    res.status(502).json({ error: "Could not retrieve subscription details from Paystack." }); return;
  }
  const subData = await subRes.json() as { data?: { email_token?: string } };
  const emailToken = subData?.data?.email_token;
  if (!emailToken) {
    res.status(502).json({ error: "Subscription token not available. Contact support." }); return;
  }

  const disableRes = await fetch("https://api.paystack.co/subscription/disable", {
    method: "POST",
    headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ code: member.paystackSubscriptionCode, token: emailToken }),
  });
  if (!disableRes.ok) {
    res.status(502).json({ error: "Failed to cancel subscription. Please try again or contact support." }); return;
  }

  // Mark member as inactive
  await db.update(membersTable)
    .set({ paystackStatus: "cancelled", memberStatus: "inactive", updatedAt: new Date() })
    .where(eq(membersTable.id, member.id));

  res.json({ ok: true, message: "Subscription cancelled. You will retain access until the end of the billing period." });
});

// ── POST /api/member-portal/logout ────────────────────────────────────────────
router.post("/member-portal/logout", (req, res): void => {
  req.session.memberId = undefined;
  req.session.save((err) => {
    if (err) { res.status(500).json({ error: "Logout error." }); return; }
    res.json({ ok: true });
  });
});

export default router;
