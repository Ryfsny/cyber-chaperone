import { Router, type IRouter, type Request, type Response } from "express";
import { db, membersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import twilio from "twilio";

const router: IRouter = Router();

const SYSTEM_WA = "whatsapp:+27825611065";

function toWaNumber(mobile: string): string | null {
  const m = String(mobile).replace(/\s+/g, "").replace(/[^0-9+]/g, "");
  if (!m || m.length < 9) return null;
  if (m.startsWith("+27")) return `whatsapp:${m}`;
  if (m.startsWith("27")) return `whatsapp:+${m}`;
  if (m.startsWith("0")) return `whatsapp:+27${m.slice(1)}`;
  return null;
}

async function sendWelcomeWhatsApp(toWa: string, firstName: string, plan: string): Promise<void> {
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const isFamilyPlan = plan.toLowerCase().includes("family");
    const planLine = isFamilyPlan
      ? "🏠 *Family Plan* — your whole family is now being watched over."
      : plan
      ? `📋 *Plan selected:* ${plan}`
      : "";

    const body = [
      `🛡️ *Welcome to Cyber Chaperone, ${firstName}!*`,
      "",
      "You've just joined a trusted safety network that's been protecting South Africans since 2001. We're genuinely glad you're here.",
      "",
      planLine,
      "",
      "*Your next step is simple:*",
      `Reply *"Hi"* to this message to open your safety menu and get set up in under 2 minutes.`,
      "",
      "Once you're in, Cyber Chaperone works like this:",
      "✅ Tell us when you're travelling",
      "✅ We track your ETA in real time",
      "✅ If something goes wrong, we escalate — fast",
      "",
      "🔐 *Your Member Portal:* Log in at eblockwatch.co.za with your WhatsApp number to update your details, add your ICE contact, and manage your membership.",
      "",
      "Any questions — just reply here. We're always watching. 🇿🇦",
      "",
      "— *Andre Snyman* | eblockwatch",
      "_Safety is a people business_",
    ].filter((l) => l !== undefined).join("\n");

    await client.messages.create({ from: SYSTEM_WA, to: toWa, body });
  } catch {
    // Non-blocking — don't fail registration if WhatsApp delivery fails
  }
}

// ── Public registration endpoint ─────────────────────────────────────────────
router.post("/register", async (req: Request, res: Response): Promise<void> => {
  const apiKey = process.env["REGISTER_API_KEY"];
  const provided =
    (req.headers["x-api-key"] as string | undefined) ??
    (req.query["api_key"] as string | undefined);

  if (apiKey && provided !== apiKey) {
    res.status(401).json({ error: "Invalid API key." });
    return;
  }

  const {
    first_name,
    last_name,
    email,
    mobile,
    whatsapp_number,
    industry,
    suburb,
    city,
    province,
    postal_code,
    country,
    source,
    source_batch,
    membership_type,
    security_provider,
    fire_reaction_service,
    car_track_provider,
    ice_contact_name,
    ice_contact_phone,
    family_members,
  } = req.body as Record<string, string | undefined> & { family_members?: Array<{ first_name: string; last_name?: string; mobile: string }> };

  const mobileRaw = mobile ?? whatsapp_number;

  if (!mobileRaw) {
    res.status(400).json({ error: "mobile is required." });
    return;
  }

  const wa = toWaNumber(mobileRaw);
  if (!wa) {
    res.status(400).json({ error: "Invalid mobile number — cannot convert to WhatsApp format." });
    return;
  }

  const firstName = (first_name ?? "").trim() || "Unknown";
  const lastName = (last_name ?? "").trim();
  const displayName = [firstName, lastName].filter(Boolean).join(" ");
  const isFamilyPlan = (membership_type ?? "").toLowerCase().includes("family");

  const extraNotes = [
    membership_type ? `Plan: ${membership_type}` : null,
    security_provider ? `Security: ${security_provider}` : null,
    fire_reaction_service ? `Fire: ${fire_reaction_service}` : null,
    car_track_provider ? `Tracker: ${car_track_provider}` : null,
  ].filter(Boolean).join(" | ");

  try {
    // ── Register primary member ──────────────────────────────────────────────
    // Use onConflictDoNothing so existing member records are never overwritten
    // by a public registration submission.
    const inserted = await db
      .insert(membersTable)
      .values({
        firstName,
        lastName,
        displayName,
        whatsappNumber: wa,
        memberStatus: "active",
        role: "member",
        email: email ?? null,
        mobile: mobileRaw ?? null,
        industry: industry ?? null,
        suburb: suburb ?? null,
        city: city ?? null,
        province: province ?? null,
        postalCode: postal_code ?? null,
        country: country ?? "South Africa",
        sourceBatch: source_batch ?? source ?? "website_registration",
        membershipTier: membership_type ?? null,
        notes: extraNotes || null,
        importStatus: "registered",
        // ICE contact — only for single membership (family members are each other's ICE)
        iceContactName: !isFamilyPlan && ice_contact_name ? ice_contact_name : null,
        iceContactPhone: !isFamilyPlan && ice_contact_phone ? toWaNumber(ice_contact_phone) ?? ice_contact_phone : null,
      })
      .onConflictDoNothing()
      .returning();

    // If the number already existed, look up the existing record (read-only)
    let primaryMember = inserted[0];
    if (!primaryMember) {
      const [existing] = await db
        .select()
        .from(membersTable)
        .where(eq(membersTable.whatsappNumber, wa))
        .limit(1);
      if (!existing) {
        res.status(500).json({ error: "Registration failed." });
        return;
      }
      primaryMember = existing;
    }

    // ── Handle family members ────────────────────────────────────────────────
    const allMembers = [primaryMember];

    if (isFamilyPlan && Array.isArray(family_members) && family_members.length > 0) {
      const familyGroupId = primaryMember.id;

      // Set primary member's family group only if they were just inserted
      if (inserted[0]) {
        await db
          .update(membersTable)
          .set({ familyGroupId })
          .where(eq(membersTable.id, primaryMember.id));
      }

      for (const fm of family_members.slice(0, 4)) {
        const fmWa = toWaNumber(fm.mobile ?? "");
        if (!fmWa) continue;
        const fmFirst = (fm.first_name ?? "").trim() || "Unknown";
        const fmLast = (fm.last_name ?? "").trim();
        const fmDisplay = [fmFirst, fmLast].filter(Boolean).join(" ");

        // Use onConflictDoNothing — never overwrite an existing member's data
        // (including their family group linkage and ICE contact).
        const fmInserted = await db
          .insert(membersTable)
          .values({
            firstName: fmFirst,
            lastName: fmLast,
            displayName: fmDisplay,
            whatsappNumber: fmWa,
            memberStatus: "active",
            role: "member",
            membershipTier: membership_type ?? null,
            sourceBatch: source_batch ?? source ?? "website_registration",
            country: "South Africa",
            importStatus: "registered",
            familyGroupId,
            // Primary member is the ICE contact for all family members initially
            iceContactName: displayName,
            iceContactPhone: wa,
          })
          .onConflictDoNothing()
          .returning();

        if (fmInserted[0]) {
          allMembers.push(fmInserted[0]);
        } else {
          // Number already registered — read existing record but do not modify it
          const [existingFm] = await db
            .select()
            .from(membersTable)
            .where(eq(membersTable.whatsappNumber, fmWa))
            .limit(1);
          if (existingFm) allMembers.push(existingFm);
        }
      }

      // Set primary member's ICE contact to first family member (reciprocal)
      // Only do this if the primary member was freshly inserted.
      if (inserted[0] && allMembers.length > 1) {
        const firstFamilyMember = allMembers[1]!;
        await db
          .update(membersTable)
          .set({
            familyGroupId,
            iceContactName: firstFamilyMember.displayName,
            iceContactPhone: firstFamilyMember.whatsappNumber,
          })
          .where(eq(membersTable.id, primaryMember.id));
      }
    }

    // ── Send WhatsApp welcome messages (only for newly inserted members) ──────
    if (inserted[0]) {
      void sendWelcomeWhatsApp(wa, firstName, membership_type ?? "");
    }
    if (isFamilyPlan && allMembers.length > 1) {
      for (const fm of allMembers.slice(1)) {
        void sendWelcomeWhatsApp(fm.whatsappNumber, fm.firstName, membership_type ?? "");
      }
    }

    res.status(201).json({
      ok: true,
      id: primaryMember.id,
      displayName: primaryMember.displayName,
      whatsappNumber: primaryMember.whatsappNumber,
      memberStatus: primaryMember.memberStatus,
      familyMembersRegistered: allMembers.length - 1,
      message: "Member registered and synced to Situation Room.",
    });
  } catch (err) {
    res.status(500).json({ error: "Registration failed.", detail: String(err) });
  }
});

export default router;
