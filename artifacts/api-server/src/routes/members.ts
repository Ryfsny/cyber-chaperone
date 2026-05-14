import { Router, type IRouter } from "express";
import { db, membersTable, tripsTable, messagesTable } from "@workspace/db";
import { insertMemberSchema } from "@workspace/db";
import { ilike, or, sql, asc, eq, desc, gte, lte } from "drizzle-orm";
import { isNationalAdmin, getAdminScope, type AdminScope } from "../middleware/require-auth.js";
import twilio from "twilio";
import nodemailer from "nodemailer";
import { sendFacebookMessage } from "../facebook-service.js";

const OPERATOR_WA = process.env["TWILIO_WHATSAPP_NUMBER"] ?? "whatsapp:+14155238886";
const GMAIL_USER  = process.env["GMAIL_USER"] ?? "";
const GMAIL_PASS  = process.env["GMAIL_APP_PASSWORD"] ?? "";

const router: IRouter = Router();

/** Returns true if a member's geo fields fall within the operator's assigned scope. */
function memberMatchesScope(
  member: { province: string | null; city: string | null; suburb: string | null },
  scope: AdminScope
): boolean {
  if (scope.province && !member.province?.toLowerCase().includes(scope.province.toLowerCase())) return false;
  if (scope.city     && !member.city?.toLowerCase().includes(scope.city.toLowerCase()))         return false;
  if (scope.suburb   && !member.suburb?.toLowerCase().includes(scope.suburb.toLowerCase()))     return false;
  return true;
}

// ── GET /api/members — paginated + searchable ─────────────────────────────────
router.get("/members", async (req, res): Promise<void> => {
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
  const limit = Math.min(1000, Math.max(1, parseInt(String(req.query.limit ?? "50"), 10)));
  const offset = (page - 1) * limit;
  const search = String(req.query.search ?? "").trim();
  const province = String(req.query.province ?? "").trim();
  const city = String(req.query.city ?? "").trim();
  const suburb = String(req.query.suburb ?? "").trim();
  const source = String(req.query.source ?? "").trim();
  const status = String(req.query.status ?? "").trim();
  const tier = String(req.query.tier ?? "").trim();
  const dateFrom = String(req.query.dateFrom ?? "").trim();
  const dateTo = String(req.query.dateTo ?? "").trim();

  const nationalAdmin = isNationalAdmin(req);
  const scope = getAdminScope(req);

  type WhereClause = ReturnType<typeof ilike> | ReturnType<typeof or> | ReturnType<typeof eq>;
  const conditions: WhereClause[] = [];

  // ── Geo-scope enforcement: non-national admins can only see their area ────────
  if (scope) {
    if (scope.province) conditions.push(ilike(membersTable.province, scope.province));
    if (scope.city)     conditions.push(ilike(membersTable.city, `%${scope.city}%`));
    if (scope.suburb)   conditions.push(ilike(membersTable.suburb, `%${scope.suburb}%`));
  }

  if (search) {
    const like = `%${search}%`;
    conditions.push(
      or(
        ilike(membersTable.displayName, like),
        ilike(membersTable.firstName, like),
        ilike(membersTable.lastName, like),
        ilike(membersTable.suburb, like),
        ilike(membersTable.city, like),
        ilike(membersTable.homeAddress, like),
        ilike(membersTable.whatsappNumber, like),
        // Only include email/mobile in search for national admins
        ...(nationalAdmin ? [
          ilike(membersTable.mobile, like),
          ilike(membersTable.email, like),
        ] : []),
      )!
    );
  }
  // Query filters — only allow province/city/suburb override for national admins
  // (sub-national admins are already locked to their scope above)
  if (nationalAdmin) {
    if (province) conditions.push(ilike(membersTable.province, province));
    if (city)     conditions.push(ilike(membersTable.city, `%${city}%`));
    if (suburb)   conditions.push(ilike(membersTable.suburb, `%${suburb}%`));
  }
  if (source === "none") {
    conditions.push(sql`source_batch IS NULL` as unknown as ReturnType<typeof eq>);
  } else if (source) {
    conditions.push(ilike(membersTable.sourceBatch, source));
  }
  if (status) conditions.push(eq(membersTable.memberStatus, status));
  if (dateFrom) {
    const d = new Date(dateFrom);
    if (!isNaN(d.getTime())) conditions.push(gte(membersTable.createdAt, d));
  }
  if (dateTo) {
    const d = new Date(dateTo);
    if (!isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      conditions.push(lte(membersTable.createdAt, d));
    }
  }
  if (tier === "family") {
    conditions.push(sql`family_group_id IS NOT NULL` as unknown as ReturnType<typeof eq>);
  } else if (tier) {
    conditions.push(ilike(membersTable.membershipTier, tier));
  }

  const where = conditions.length === 1
    ? conditions[0]
    : conditions.length > 1
      ? conditions.reduce((a, b) => sql`${a} AND ${b}`)
      : undefined;

  const [members, countResult] = await Promise.all([
    where
      ? db.select().from(membersTable).where(where).orderBy(asc(membersTable.id)).limit(limit).offset(offset)
      : db.select().from(membersTable).orderBy(asc(membersTable.id)).limit(limit).offset(offset),
    where
      ? db.select({ count: sql<number>`count(*)` }).from(membersTable).where(where)
      : db.select({ count: sql<number>`count(*)` }).from(membersTable),
  ]);

  const total = Number(countResult[0]?.count ?? 0);

  // ── Strip sensitive fields for sub-national admins ────────────────────────────
  const safeMembers = nationalAdmin
    ? members
    : members.map(({ email: _e, mobile: _m, ...rest }) => rest);

  res.json({
    data: safeMembers,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// ── GET /api/members/sources — national admin only ────────────────────────────
router.get("/members/sources", async (req, res): Promise<void> => {
  if (!isNationalAdmin(req)) {
    res.status(403).json({ error: "Forbidden. National admin access required." });
    return;
  }
  const rows = await db
    .select({ source: membersTable.sourceBatch, count: sql<number>`count(*)` })
    .from(membersTable)
    .groupBy(membersTable.sourceBatch)
    .orderBy(sql`count(*) desc`);
  res.json(rows);
});

// ── GET /api/members/duplicates — national admin only ─────────────────────────
router.get("/members/duplicates", async (req, res): Promise<void> => {
  if (!isNationalAdmin(req)) {
    res.status(403).json({ error: "Forbidden. National admin access required." });
    return;
  }
  const [dupePhones, dupeNames] = await Promise.all([
    db.execute(sql`
      SELECT whatsapp_number, count(*) as cnt
      FROM members GROUP BY whatsapp_number HAVING count(*) > 1 ORDER BY cnt DESC
    `),
    db.execute(sql`
      SELECT lower(display_name) as name_key, count(*) as cnt, array_agg(id ORDER BY id) as ids
      FROM members GROUP BY lower(display_name) HAVING count(*) > 1 ORDER BY cnt DESC LIMIT 100
    `),
  ]);
  res.json({
    byPhone: dupePhones.rows,
    byName: dupeNames.rows,
    summary: { duplicatePhones: dupePhones.rows.length, duplicateNames: dupeNames.rows.length },
  });
});

// ── GET /api/members/map — GPS-only list for maps ─────────────────────────────
router.get("/members/map", async (req, res): Promise<void> => {
  const nationalAdmin = isNationalAdmin(req);
  const scope = getAdminScope(req);

  type MapWhere = ReturnType<typeof ilike> | ReturnType<typeof eq>;
  const conditions: MapWhere[] = [
    sql`home_lat IS NOT NULL AND home_lon IS NOT NULL` as unknown as MapWhere,
  ];

  if (scope) {
    if (scope.province) conditions.push(ilike(membersTable.province, scope.province));
    if (scope.city)     conditions.push(ilike(membersTable.city, `%${scope.city}%`));
    if (scope.suburb)   conditions.push(ilike(membersTable.suburb, `%${scope.suburb}%`));
  }

  const where = conditions.length === 1
    ? conditions[0]
    : conditions.reduce((a, b) => sql`${a} AND ${b}` as unknown as MapWhere);

  const members = await db
    .select({
      id: membersTable.id,
      displayName: membersTable.displayName,
      whatsappNumber: membersTable.whatsappNumber,
      memberStatus: membersTable.memberStatus,
      homeLat: membersTable.homeLat,
      homeLon: membersTable.homeLon,
      homeAddress: membersTable.homeAddress,
      suburb: membersTable.suburb,
      city: membersTable.city,
      province: membersTable.province,
      ...(nationalAdmin ? {
        email: membersTable.email,
        mobile: membersTable.mobile,
      } : {}),
      industry: membersTable.industry,
    })
    .from(membersTable)
    .where(where);
  res.json(members);
});

// ── GET /api/members/:id — full member profile ────────────────────────────────
router.get("/members/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [member] = await db.select().from(membersTable).where(eq(membersTable.id, id));
  if (!member) { res.status(404).json({ error: "Not found" }); return; }

  const scope = getAdminScope(req);
  if (scope && !memberMatchesScope(member, scope)) {
    res.status(403).json({ error: "Forbidden. This member is outside your assigned area." });
    return;
  }

  if (!isNationalAdmin(req)) {
    const { email: _e, mobile: _m, ...safe } = member;
    res.json(safe);
    return;
  }
  res.json(member);
});

// ── GET /api/members/:id/trips — all trips for this member ────────────────────
router.get("/members/:id/trips", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [member] = await db.select({ whatsappNumber: membersTable.whatsappNumber, mobile: membersTable.mobile, province: membersTable.province, city: membersTable.city, suburb: membersTable.suburb })
    .from(membersTable).where(eq(membersTable.id, id));
  if (!member) { res.status(404).json({ error: "Not found" }); return; }

  const scope = getAdminScope(req);
  if (scope && !memberMatchesScope(member, scope)) {
    res.status(403).json({ error: "Forbidden. This member is outside your assigned area." });
    return;
  }

  // trips are linked by traveler_phone = member's whatsapp_number
  const trips = await db.select().from(tripsTable)
    .where(eq(tripsTable.travelerPhone, member.whatsappNumber))
    .orderBy(desc(tripsTable.createdAt));
  res.json(trips);
});

// ── GET /api/members/:id/messages — WhatsApp message history ─────────────────
router.get("/members/:id/messages", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [member] = await db.select({ whatsappNumber: membersTable.whatsappNumber, province: membersTable.province, city: membersTable.city, suburb: membersTable.suburb })
    .from(membersTable).where(eq(membersTable.id, id));
  if (!member) { res.status(404).json({ error: "Not found" }); return; }

  const scope = getAdminScope(req);
  if (scope && !memberMatchesScope(member, scope)) {
    res.status(403).json({ error: "Forbidden. This member is outside your assigned area." });
    return;
  }

  const messages = await db.select().from(messagesTable)
    .where(
      or(
        eq(messagesTable.fromNumber, member.whatsappNumber),
        eq(messagesTable.toNumber, member.whatsappNumber),
      )!
    )
    .orderBy(asc(messagesTable.receivedAt))
    .limit(300);
  res.json(messages);
});

// ── PATCH /api/members/:id — update member fields ────────────────────────────
router.patch("/members/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [existing] = await db.select({ province: membersTable.province, city: membersTable.city, suburb: membersTable.suburb })
    .from(membersTable).where(eq(membersTable.id, id));
  if (!existing) { res.status(404).json({ error: "Member not found." }); return; }

  const scope = getAdminScope(req);
  if (scope && !memberMatchesScope(existing, scope)) {
    res.status(403).json({ error: "Forbidden. This member is outside your assigned area." });
    return;
  }

  const nationalAdmin = isNationalAdmin(req);

  // Sub-national admins may not modify sensitive fields
  const allowedBase = [
    "firstName", "lastName", "displayName",
    "notes", "iceContactName", "iceContactPhone",
    "homeAddress", "suburb", "city", "province", "postalCode", "country",
    "facebookUrl",
  ] as const;
  const allowedNational = [
    ...allowedBase,
    "memberStatus", "membershipTier", "role", "email", "mobile",
  ] as const;
  const allowed: readonly string[] = nationalAdmin ? allowedNational : allowedBase;

  const setValues: Record<string, string | null | Date> = { updatedAt: new Date() };

  let fieldCount = 0;
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
      const val = req.body[key];
      setValues[key] = typeof val === "string" ? val.trim() || null : null;
      fieldCount++;
    }
  }

  if (fieldCount === 0) {
    res.status(400).json({ error: "No valid fields provided." }); return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [updated] = await db
    .update(membersTable)
    .set(setValues as any)
    .where(eq(membersTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Member not found." }); return; }

  if (!nationalAdmin) {
    const { email: _e, mobile: _m, ...safe } = updated;
    res.json(safe);
    return;
  }
  res.json(updated);
});

// ── POST /api/members/:id/contact — send WhatsApp/Messenger/email to a member ─
router.post("/members/:id/contact", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { channel, message } = req.body as { channel?: string; message?: string };
  if (!channel || !message?.trim()) {
    res.status(400).json({ error: "channel and message are required" });
    return;
  }

  const [member] = await db.select().from(membersTable).where(eq(membersTable.id, id));
  if (!member) { res.status(404).json({ error: "Member not found" }); return; }

  const scope = getAdminScope(req);
  if (scope && !memberMatchesScope(member, scope)) {
    res.status(403).json({ error: "Forbidden. This member is outside your assigned area." });
    return;
  }

  const body = message.trim();

  // ── Facebook Messenger ─────────────────────────────────────────────────────
  if (channel === "messenger") {
    if (!member.whatsappNumber.startsWith("fb:")) {
      res.status(400).json({ error: "This member is not a Messenger contact" });
      return;
    }
    const psid = member.whatsappNumber.slice(3);
    await sendFacebookMessage(psid, body);
    await db.insert(messagesTable).values({
      fromNumber: "fb:page",
      toNumber: member.whatsappNumber,
      body,
      messageSid: null,
      direction: "outbound",
    });
    res.json({ ok: true, channel: "messenger" });
    return;
  }

  // ── WhatsApp (Twilio) ──────────────────────────────────────────────────────
  if (channel === "whatsapp") {
    const sid   = process.env["TWILIO_ACCOUNT_SID"];
    const token = process.env["TWILIO_AUTH_TOKEN"];
    if (!sid || !token) { res.status(500).json({ error: "Twilio not configured" }); return; }

    const toNumber = member.whatsappNumber.startsWith("whatsapp:")
      ? member.whatsappNumber
      : `whatsapp:${member.whatsappNumber}`;

    const client = twilio(sid, token);
    let messageSid: string | undefined;
    try {
      const sent = await client.messages.create({ from: OPERATOR_WA, to: toNumber, body });
      messageSid = sent.sid;
    } catch (err) {
      res.status(500).json({ error: `WhatsApp failed: ${String(err)}` });
      return;
    }
    await db.insert(messagesTable).values({
      fromNumber: OPERATOR_WA,
      toNumber,
      body,
      messageSid: messageSid ?? null,
      direction: "outbound",
      channel: "whatsapp",
      status: "sent",
    });
    res.json({ ok: true, channel: "whatsapp" });
    return;
  }

  // ── Email ──────────────────────────────────────────────────────────────────
  if (channel === "email") {
    if (!member.email) { res.status(400).json({ error: "No email address on file for this member" }); return; }
    if (!GMAIL_USER || !GMAIL_PASS) { res.status(500).json({ error: "Email not configured" }); return; }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });

    const paragraphs = body.split("\n\n")
      .map((p) => `<p style="margin:0 0 14px;color:#1e293b;font-size:14px;line-height:1.7;font-family:Arial,sans-serif;">${p.replace(/\n/g, "<br>")}</p>`)
      .join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#ffffff;">
  <div style="background:#1a1f2e;padding:24px 36px;display:flex;align-items:center;justify-content:space-between;">
    <div>
      <div style="color:#22c55e;font-size:18px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">eblockwatch</div>
      <div style="color:#6b7280;font-size:10px;letter-spacing:2px;margin-top:3px;text-transform:uppercase;">Cyber Chaperone · Safety Platform</div>
    </div>
    <img src="https://eblockwatch.co.za/wp-content/uploads/2021/01/eblockwatch-logo.png" alt="eblockwatch" style="height:36px;opacity:0.9;" />
  </div>
  <div style="height:3px;background:linear-gradient(90deg,#16a34a,#22c55e,#16a34a);"></div>
  <div style="padding:28px 36px 20px;">${paragraphs}</div>
  <div style="margin:0 36px 28px;background:#f0fdf4;border-left:4px solid #22c55e;padding:14px 18px;">
    <div style="color:#166534;font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">eblockwatch Cyber Chaperone</div>
    <div style="color:#4ade80;font-size:12px;margin-top:3px;">Get hold of the right person, at the right place, at the right time.</div>
  </div>
  <div style="background:#1a1f2e;padding:16px 36px;text-align:center;">
    <div style="margin-bottom:6px;">
      <a href="https://www.facebook.com/eblockwatchnational" style="color:#22c55e;text-decoration:none;font-size:11px;margin:0 8px;">Facebook</a>
      <span style="color:#374151;font-size:11px;">·</span>
      <a href="https://eblockwatch.co.za" style="color:#22c55e;text-decoration:none;font-size:11px;margin:0 8px;">eblockwatch.co.za</a>
      <span style="color:#374151;font-size:11px;">·</span>
      <a href="https://www.instagram.com/eblockwatch" style="color:#22c55e;text-decoration:none;font-size:11px;margin:0 8px;">Instagram</a>
    </div>
    <div style="color:#374151;font-size:10px;letter-spacing:1px;text-transform:uppercase;">eblockwatch · Cyber Chaperone · South Africa</div>
  </div>
</div>
</body>
</html>`;

    try {
      await transporter.sendMail({
        from: `"eblockwatch Cyber Chaperone" <${GMAIL_USER}>`,
        replyTo: "info@eblockwatch.co.za",
        to: member.email,
        subject: `Message from eblockwatch Cyber Chaperone`,
        text: body,
        html,
      });
    } catch (err) {
      res.status(500).json({ error: `Email failed: ${String(err)}` });
      return;
    }
    await db.insert(messagesTable).values({
      fromNumber: GMAIL_USER || "operator",
      toNumber: member.email,
      body,
      direction: "outbound",
      channel: "email",
      status: "sent",
    });
    res.json({ ok: true, channel: "email", to: member.email });
    return;
  }

  // ── SMS (Twilio) ───────────────────────────────────────────────────────────
  if (channel === "sms") {
    if (!member.mobile) { res.status(400).json({ error: "No mobile number on file for this member" }); return; }
    const sid   = process.env["TWILIO_ACCOUNT_SID"];
    const token = process.env["TWILIO_AUTH_TOKEN"];
    if (!sid || !token) { res.status(500).json({ error: "Twilio not configured" }); return; }

    const smsFrom = process.env["TWILIO_SMS_NUMBER"] ?? process.env["TWILIO_WHATSAPP_NUMBER"]?.replace("whatsapp:", "") ?? "";
    if (!smsFrom) { res.status(500).json({ error: "No SMS sender number configured" }); return; }

    const toMobile = member.mobile.startsWith("+") ? member.mobile : `+${member.mobile}`;
    const client = twilio(sid, token);
    let messageSid: string | undefined;
    try {
      const sent = await client.messages.create({ from: smsFrom, to: toMobile, body });
      messageSid = sent.sid;
    } catch (err) {
      res.status(500).json({ error: `SMS failed: ${String(err)}` });
      return;
    }
    await db.insert(messagesTable).values({
      fromNumber: smsFrom,
      toNumber: toMobile,
      body,
      messageSid: messageSid ?? null,
      direction: "outbound",
      channel: "sms",
      status: "sent",
    });
    res.json({ ok: true, channel: "sms", to: toMobile });
    return;
  }

  res.status(400).json({ error: "Unknown channel. Use whatsapp, messenger, email, or sms." });
});

// ── POST /api/members — create / upsert member (national admin only) ──────────
router.post("/members", async (req, res): Promise<void> => {
  if (!isNationalAdmin(req)) {
    res.status(403).json({ error: "Forbidden. National admin access required." });
    return;
  }
  const parsed = insertMemberSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const [member] = await db
    .insert(membersTable)
    .values(parsed.data)
    .onConflictDoUpdate({
      target: membersTable.whatsappNumber,
      set: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        displayName: parsed.data.displayName,
        memberStatus: parsed.data.memberStatus ?? "active",
        role: parsed.data.role,
        notes: parsed.data.notes,
        iceContactName: parsed.data.iceContactName ?? null,
        iceContactPhone: parsed.data.iceContactPhone ?? null,
        sourceBatch: parsed.data.sourceBatch ?? undefined,
        province: parsed.data.province ?? undefined,
        city: parsed.data.city ?? undefined,
        suburb: parsed.data.suburb ?? undefined,
        industry: parsed.data.industry ?? undefined,
        membershipTier: parsed.data.membershipTier ?? undefined,
        email: parsed.data.email ?? undefined,
        mobile: parsed.data.mobile ?? undefined,
      },
    })
    .returning();
  res.status(201).json(member);
});

export default router;
