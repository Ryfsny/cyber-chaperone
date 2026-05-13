/**
 * One-shot script: copies all members from the dev database to production.
 * Run AFTER the admin-import endpoint is deployed to production.
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run import-members
 *
 * Env required:
 *   DATABASE_URL       — dev DB (already set in dev environment)
 *   OPERATOR_PASSWORD  — used to authenticate the import endpoint
 *   PROD_URL           — production base URL (or default below)
 */

import pg from "pg";

const PROD_URL = process.env["PROD_URL"] ?? "https://cyber-chaperone-r--ryfsny.replit.app";
const ENDPOINT = `${PROD_URL}/api/admin/import-members`;
const BATCH_SIZE = 200;

const OPERATOR_PASSWORD = process.env["OPERATOR_PASSWORD"];
if (!OPERATOR_PASSWORD) {
  console.error("ERROR: OPERATOR_PASSWORD env var is not set");
  process.exit(1);
}

const DATABASE_URL = process.env["DATABASE_URL"];
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL env var is not set");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL });

async function main() {
  console.log("Connecting to dev DB…");
  const client = await pool.connect();

  console.log("Counting members in dev DB…");
  const countRes = await client.query<{ total: string }>("SELECT COUNT(*) AS total FROM members");
  const total = parseInt(countRes.rows[0].total, 10);
  console.log(`Total members in dev: ${total.toLocaleString()}`);

  let offset = 0;
  let totalInserted = 0;
  let batchNum = 0;

  while (offset < total) {
    batchNum++;
    const rows = await client.query<Record<string, unknown>>(
      `SELECT
        first_name         AS "firstName",
        last_name          AS "lastName",
        display_name       AS "displayName",
        whatsapp_number    AS "whatsappNumber",
        member_status      AS "memberStatus",
        membership_tier    AS "membershipTier",
        role,
        notes,
        ice_contact_name   AS "iceContactName",
        ice_contact_phone  AS "iceContactPhone",
        family_group_id    AS "familyGroupId",
        home_lat           AS "homeLat",
        home_lon           AS "homeLon",
        home_address       AS "homeAddress",
        email,
        mobile,
        industry,
        suburb,
        city,
        province,
        postal_code        AS "postalCode",
        country,
        source_batch       AS "sourceBatch",
        import_status      AS "importStatus",
        paystack_customer_id        AS "paystackCustomerId",
        paystack_subscription_code  AS "paystackSubscriptionCode",
        paystack_status             AS "paystackStatus",
        paystack_plan_code          AS "paystackPlanCode",
        paystack_paid_at            AS "paystackPaidAt",
        facebook_url       AS "facebookUrl"
       FROM members
       ORDER BY id
       LIMIT $1 OFFSET $2`,
      [BATCH_SIZE, offset],
    );

    if (rows.rows.length === 0) break;

    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: OPERATOR_PASSWORD, members: rows.rows }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`Batch ${batchNum} FAILED (HTTP ${res.status}): ${text}`);
      client.release();
      await pool.end();
      process.exit(1);
    }

    const json = await res.json() as { ok: boolean; batchSize: number; totalInDb: number };
    totalInserted += rows.rows.length;
    const pct = ((totalInserted / total) * 100).toFixed(1);
    console.log(
      `Batch ${batchNum}: sent ${rows.rows.length} rows | ${totalInserted.toLocaleString()}/${total.toLocaleString()} (${pct}%) | prod total: ${json.totalInDb.toLocaleString()}`
    );

    offset += BATCH_SIZE;

    // Small delay to avoid hammering the production server
    await new Promise((r) => setTimeout(r, 150));
  }

  client.release();
  await pool.end();

  console.log(`\nDone. ${totalInserted.toLocaleString()} rows sent to production.`);
  console.log("Verify with: SELECT COUNT(*) FROM members; on production.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
