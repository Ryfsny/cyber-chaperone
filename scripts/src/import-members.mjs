/**
 * Plain ESM script — no TypeScript compilation needed.
 * Usage: START_OFFSET=14300 node scripts/src/import-members.mjs
 */

import pg from "pg";
const { Pool } = pg;

const PROD_URL = process.env.PROD_URL ?? "https://cyber-chaperone-r--ryfsny.replit.app";
const ENDPOINT = `${PROD_URL}/api/admin/import-members`;
const BATCH_SIZE = 50;

const OPERATOR_PASSWORD = process.env.OPERATOR_PASSWORD;
if (!OPERATOR_PASSWORD) { console.error("ERROR: OPERATOR_PASSWORD not set"); process.exit(1); }

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error("ERROR: DATABASE_URL not set"); process.exit(1); }

const pool = new Pool({ connectionString: DATABASE_URL });

const client = await pool.connect();
const countRes = await client.query("SELECT COUNT(*) AS total FROM members");
const total = parseInt(countRes.rows[0].total, 10);
console.log(`Dev DB total: ${total.toLocaleString()}`);

let offset = parseInt(process.env.START_OFFSET ?? "0", 10);
console.log(`Starting from offset ${offset.toLocaleString()}`);

let batchNum = Math.floor(offset / BATCH_SIZE);

while (offset < total) {
  batchNum++;
  const rows = await client.query(
    `SELECT
      first_name         AS "firstName",
      last_name          AS "lastName",
      display_name       AS "displayName",
      whatsapp_number    AS "whatsappNumber",
      member_status      AS "memberStatus",
      membership_tier    AS "membershipTier",
      role, notes,
      ice_contact_name   AS "iceContactName",
      ice_contact_phone  AS "iceContactPhone",
      family_group_id    AS "familyGroupId",
      home_lat           AS "homeLat",
      home_lon           AS "homeLon",
      home_address       AS "homeAddress",
      email, mobile, industry, suburb, city, province,
      postal_code        AS "postalCode",
      country, source_batch AS "sourceBatch",
      import_status      AS "importStatus",
      paystack_customer_id        AS "paystackCustomerId",
      paystack_subscription_code  AS "paystackSubscriptionCode",
      paystack_status             AS "paystackStatus",
      paystack_plan_code          AS "paystackPlanCode",
      paystack_paid_at            AS "paystackPaidAt",
      facebook_url       AS "facebookUrl"
     FROM members ORDER BY id LIMIT $1 OFFSET $2`,
    [BATCH_SIZE, offset]
  );

  if (rows.rows.length === 0) break;

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: OPERATOR_PASSWORD, members: rows.rows }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Batch ${batchNum} FAILED (HTTP ${res.status}): ${text.slice(0, 200)}`);
    client.release();
    await pool.end();
    process.exit(1);
  }

  const json = await res.json();
  offset += rows.rows.length;
  const pct = ((offset / total) * 100).toFixed(1);
  console.log(`Batch ${batchNum}: offset ${offset.toLocaleString()}/${total.toLocaleString()} (${pct}%) | prod total: ${json.totalInDb.toLocaleString()}`);

  await new Promise(r => setTimeout(r, 100));
}

client.release();
await pool.end();
console.log(`\nDone. Offset reached: ${offset.toLocaleString()}`);
