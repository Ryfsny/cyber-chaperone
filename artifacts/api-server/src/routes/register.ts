import { Router, type IRouter, type Request, type Response } from "express";
import { db, membersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function toWaNumber(mobile: string): string | null {
  const m = String(mobile).replace(/\s+/g, "").replace(/[^0-9+]/g, "");
  if (!m || m.length < 9) return null;
  if (m.startsWith("+27")) return `whatsapp:${m}`;
  if (m.startsWith("27")) return `whatsapp:+${m}`;
  if (m.startsWith("0")) return `whatsapp:+27${m.slice(1)}`;
  return null;
}

// ── Public registration endpoint ─────────────────────────────────────────────
// Used by eblockwatch.co.za registration form.
// Secured by API key in X-API-Key header or ?api_key= query param.
// No session required — this is a machine-to-machine call from the website.
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
  } = req.body as Record<string, string | undefined>;

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

  const extraNotes = [
    membership_type ? `Plan: ${membership_type}` : null,
    security_provider ? `Security: ${security_provider}` : null,
    fire_reaction_service ? `Fire: ${fire_reaction_service}` : null,
    car_track_provider ? `Tracker: ${car_track_provider}` : null,
  ].filter(Boolean).join(" | ");

  try {
    const [member] = await db
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
      })
      .onConflictDoUpdate({
        target: membersTable.whatsappNumber,
        set: {
          firstName,
          lastName,
          displayName,
          email: email ?? null,
          mobile: mobileRaw ?? null,
          industry: industry ?? null,
          suburb: suburb ?? null,
          city: city ?? null,
          province: province ?? null,
          postalCode: postal_code ?? null,
          country: country ?? "South Africa",
          membershipTier: membership_type ?? null,
          notes: extraNotes || null,
          importStatus: "registered",
        },
      })
      .returning();

    res.status(201).json({
      ok: true,
      id: member.id,
      displayName: member.displayName,
      whatsappNumber: member.whatsappNumber,
      memberStatus: member.memberStatus,
      message: "Member registered and synced to Situation Room.",
    });
  } catch (err) {
    res.status(500).json({ error: "Registration failed.", detail: String(err) });
  }
});

// ── GET /api/members/:id — single member lookup (for website sync checks) ───
// Only handles numeric IDs — non-numeric paths (e.g. /sources, /duplicates) fall through to next router
router.get("/members/:id", async (req: Request, res: Response, next): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId ?? "", 10);
  if (isNaN(id)) {
    next();
    return;
  }
  const apiKey = process.env["REGISTER_API_KEY"];
  const provided =
    (req.headers["x-api-key"] as string | undefined) ??
    (req.query["api_key"] as string | undefined);
  if (apiKey && provided !== apiKey) {
    res.status(401).json({ error: "Invalid API key." });
    return;
  }
  const [member] = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.id, id))
    .limit(1);
  if (!member) {
    res.status(404).json({ error: "Not found." });
    return;
  }
  res.json(member);
});

export default router;
