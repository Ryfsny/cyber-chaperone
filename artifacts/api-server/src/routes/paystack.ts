import { Router, type IRouter, type Request, type Response } from "express";
import { db, membersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import crypto from "crypto";

const router: IRouter = Router();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY ?? "";

// Plan code → tier name mapping
const PLAN_TIER_MAP: Record<string, string> = {
  PLN_xtj41yswdg2wxjc: "individual",
  PLN_rnn4nj61oh0zy0c: "individual",
  PLN_z47ew079dezjlqd: "individual",
  PLN_wopagttz7e5quyw: "family",
  PLN_ewiglwurfbl5l7r: "family",
  PLN_p6zzo6fjbdh3jem: "entry",
};

function planCodeToTier(planCode: string): string {
  return PLAN_TIER_MAP[planCode] ?? "individual";
}

function normalisePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = String(raw).replace(/\s+/g, "").replace(/[^0-9+]/g, "");
  if (!m || m.length < 8) return null;
  if (m.startsWith("+")) return `whatsapp:${m}`;
  if (m.startsWith("27") && m.length >= 11) return `whatsapp:+${m}`;
  if (m.startsWith("0") && m.length === 9) return `whatsapp:+27${m.slice(1)}`;
  if (m.length === 9) return `whatsapp:+27${m}`;
  return null;
}

async function upsertMemberFromPaystack(opts: {
  email: string;
  phone?: string | null;
  customerId?: string | null;
  customerCode?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  planCode: string;
  subscriptionCode: string;
  paystackStatus: "active" | "cancelled" | "attention" | "non-renewing";
  paidAt?: Date | null;
}): Promise<{ action: string; memberId?: number }> {
  const tier = planCodeToTier(opts.planCode);
  const waNumber = normalisePhone(opts.phone);

  // Try to find existing member by email or whatsapp number
  const conditions = [];
  if (opts.email) conditions.push(eq(membersTable.email, opts.email));
  if (waNumber) conditions.push(eq(membersTable.whatsappNumber, waNumber));
  if (opts.customerId) conditions.push(eq(membersTable.paystackCustomerId, opts.customerId));

  let existing = null;
  if (conditions.length > 0) {
    const rows = await db.select().from(membersTable).where(or(...conditions)).limit(1);
    existing = rows[0] ?? null;
  }

  const newStatus = opts.paystackStatus === "active" ? "verified" : "inactive";

  if (existing) {
    await db.update(membersTable).set({
      memberStatus: newStatus,
      membershipTier: tier,
      paystackCustomerId: opts.customerId ?? existing.paystackCustomerId,
      paystackSubscriptionCode: opts.subscriptionCode,
      paystackStatus: opts.paystackStatus,
      paystackPlanCode: opts.planCode,
      paystackPaidAt: opts.paidAt ?? existing.paystackPaidAt,
      email: opts.email || existing.email,
    }).where(eq(membersTable.id, existing.id));
    return { action: "updated", memberId: existing.id };
  }

  // Create new member stub from Paystack data
  const firstName = opts.firstName ?? opts.email.split("@")[0] ?? "Unknown";
  const lastName = opts.lastName ?? "";
  const displayName = [firstName, lastName].filter(Boolean).join(" ");

  const inserted = await db.insert(membersTable).values({
    firstName,
    lastName,
    displayName,
    whatsappNumber: waNumber ?? `paystack:${opts.email}`,
    email: opts.email,
    memberStatus: newStatus,
    membershipTier: tier,
    paystackCustomerId: opts.customerId ?? null,
    paystackSubscriptionCode: opts.subscriptionCode,
    paystackStatus: opts.paystackStatus,
    paystackPlanCode: opts.planCode,
    paystackPaidAt: opts.paidAt ?? null,
    sourceBatch: "paystack_sync",
  }).returning({ id: membersTable.id });

  return { action: "created", memberId: inserted[0]?.id };
}

// ── Paystack webhook ──────────────────────────────────────────────────────────
// POST /api/paystack/webhook
// Paystack signs every request with HMAC-SHA512 of the raw body using your secret key.
router.post("/paystack/webhook", async (req: Request, res: Response) => {
  const sig = req.headers["x-paystack-signature"] as string | undefined;
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;

  if (PAYSTACK_SECRET && sig && rawBody) {
    const expected = crypto
      .createHmac("sha512", PAYSTACK_SECRET)
      .update(rawBody)
      .digest("hex");
    if (sig !== expected) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }
  }

  const event = req.body as {
    event: string;
    data: Record<string, unknown>;
  };

  req.log?.info({ event: event.event }, "paystack webhook received");

  try {
    const d = event.data;

    if (
      event.event === "charge.success" ||
      event.event === "subscription.create" ||
      event.event === "subscription.enable" ||
      event.event === "invoice.payment_failed" ||
      event.event === "subscription.disable"
    ) {
      const customer = (d.customer ?? {}) as Record<string, unknown>;
      const plan = (d.plan ?? {}) as Record<string, unknown>;
      const email = (customer.email ?? d.customer_email ?? "") as string;
      const phone = (customer.phone ?? "") as string;
      const customerId = String(customer.id ?? customer.customer_code ?? "");
      const firstName = (customer.first_name ?? "") as string;
      const lastName = (customer.last_name ?? "") as string;
      const planCode = (plan.plan_code ?? d.plan_code ?? "") as string;
      const subscriptionCode = (d.subscription_code ?? "") as string;
      const paidAt = d.paid_at ? new Date(d.paid_at as string) : null;

      const paystackStatus: "active" | "cancelled" | "attention" | "non-renewing" =
        event.event === "subscription.disable" || event.event === "invoice.payment_failed"
          ? "attention"
          : "active";

      if (email && planCode) {
        const result = await upsertMemberFromPaystack({
          email,
          phone,
          customerId,
          firstName,
          lastName,
          planCode,
          subscriptionCode,
          paystackStatus,
          paidAt,
        });
        req.log?.info({ result, event: event.event }, "paystack member upserted");
      }
    }

    res.json({ received: true });
  } catch (err) {
    req.log?.error({ err }, "paystack webhook error");
    res.status(500).json({ error: "Internal error" });
  }
});

// ── Bulk sync endpoint (operator-protected) ───────────────────────────────────
// POST /api/paystack/sync  — pulls all subscriptions from Paystack and upserts them
router.post("/paystack/sync", async (req: Request, res: Response) => {
  if (!PAYSTACK_SECRET) {
    res.status(503).json({ error: "PAYSTACK_SECRET_KEY not set" });
    return;
  }

  const results: Array<{ email: string; action: string; memberId?: number }> = [];
  const errors: Array<{ email: string; error: string }> = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `https://api.paystack.co/subscription?perPage=100&page=${page}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    });
    const json = await response.json() as {
      status: boolean;
      data: Array<Record<string, unknown>>;
      meta?: { total?: number; page?: number; pageCount?: number };
    };

    if (!json.status || !json.data?.length) { hasMore = false; break; }

    for (const sub of json.data) {
      const customer = (sub.customer ?? {}) as Record<string, unknown>;
      const plan = (sub.plan ?? {}) as Record<string, unknown>;
      const email = (customer.email ?? "") as string;
      const phone = (customer.phone ?? "") as string;
      const customerId = String(customer.id ?? customer.customer_code ?? "");
      const firstName = (customer.first_name ?? "") as string;
      const lastName = (customer.last_name ?? "") as string;
      const planCode = (plan.plan_code ?? "") as string;
      const subscriptionCode = (sub.subscription_code ?? "") as string;
      const rawStatus = (sub.status ?? "active") as string;
      const paystackStatus = (
        ["active", "cancelled", "attention", "non-renewing"].includes(rawStatus)
          ? rawStatus
          : "attention"
      ) as "active" | "cancelled" | "attention" | "non-renewing";

      if (!email || !planCode) continue;

      try {
        const result = await upsertMemberFromPaystack({
          email, phone, customerId, firstName, lastName,
          planCode, subscriptionCode, paystackStatus, paidAt: null,
        });
        results.push({ email, ...result });
      } catch (err) {
        errors.push({ email, error: String(err) });
      }
    }

    const pageCount = json.meta?.pageCount ?? 1;
    hasMore = page < pageCount;
    page++;
  }

  req.log?.info({ synced: results.length, errors: errors.length }, "paystack bulk sync complete");
  res.json({ synced: results.length, errorCount: errors.length, results, errors });
});

// ── Get Paystack sync status (operator) ──────────────────────────────────────
// GET /api/paystack/status
router.get("/paystack/status", async (_req: Request, res: Response) => {
  if (!PAYSTACK_SECRET) {
    res.json({ configured: false });
    return;
  }
  const url = "https://api.paystack.co/subscription?perPage=1";
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
  });
  const json = await response.json() as { status: boolean; meta?: { total?: number } };
  res.json({ configured: true, totalSubscriptions: json.meta?.total ?? 0 });
});

export default router;
