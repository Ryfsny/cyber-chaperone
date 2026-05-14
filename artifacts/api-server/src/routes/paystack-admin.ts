import { Router, type IRouter, type Request, type Response } from "express";
import { upsertMemberFromPaystack } from "./paystack";
import { isNationalAdmin } from "../middleware/require-auth.js";

const router: IRouter = Router();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY ?? "";

// ── POST /api/paystack/sync  (national admin only — behind requireAuth)
// Pulls all subscriptions from Paystack and upserts them into the member registry
router.post("/paystack/sync", async (req: Request, res: Response) => {
  if (!isNationalAdmin(req)) {
    res.status(403).json({ error: "Forbidden. National admin access required." });
    return;
  }
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

// ── GET /api/paystack/status  (national admin only — behind requireAuth)
router.get("/paystack/status", async (req: Request, res: Response) => {
  if (!isNationalAdmin(req)) {
    res.status(403).json({ error: "Forbidden. National admin access required." });
    return;
  }
  if (!PAYSTACK_SECRET) {
    res.json({ configured: false });
    return;
  }
  try {
    const url = "https://api.paystack.co/subscription?perPage=1";
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
    });
    const json = await response.json() as { status: boolean; meta?: { total?: number } };
    res.json({ configured: true, totalSubscriptions: json.meta?.total ?? 0 });
  } catch (err) {
    req.log?.error({ err }, "paystack status error");
    res.status(500).json({ error: "Failed to reach Paystack" });
  }
});

export default router;
