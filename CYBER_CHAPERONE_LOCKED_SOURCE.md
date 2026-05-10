# CYBER CHAPERONE — LOCKED SOURCE RECORD
**Generated:** 2026-05-10
**Status:** PRE-LAUNCH STABILISATION

---

## 1. PRODUCTION URL
```
https://cyber-chaperone-r--ryfsny.replit.app
```

## 2. TWILIO WEBHOOK URL
```
POST https://861f57c8-8edb-426d-bcdf-9ec68d1de62b-00-1wbyvfmtwel27.kirk.replit.dev/api/webhook/twilio
```
Set in Twilio Sandbox → "WHEN A MESSAGE COMES IN"
Method: POST

**WEBHOOK GUARD RULE (LOCKED — DO NOT CHANGE):**
Ignore ONLY when `req.body.MessageStatus` is present and truthy.
Never block on `SmsStatus="received"` — that is a genuine inbound message.

---

## 3. DATABASE TABLES
Host: Replit PostgreSQL (managed)

| Table | Purpose |
|---|---|
| `members` | Known member registry (91,097 records as of 2026-05-10) |
| `trips` | Traveler trip records with status green/amber/red |
| `messages` | Raw inbound WhatsApp messages |
| `conversation_states` | Per-member SmartChat menu state |
| `responders` | eblockwatch responder network |
| `case_logs` | Case audit log entries |
| `case_participants` | Participants linked to cases |

### members table columns
`id, first_name, last_name, display_name, whatsapp_number (UNIQUE), member_status, role, notes,`
`ice_contact_name, ice_contact_phone, membership_tier, home_lat, home_lon, home_address,`
`email, mobile, industry, suburb, city, province, postal_code, country,`
`source_batch, import_status, created_at, updated_at`

---

## 4. MEMBER IMPORT METHOD
- Bulk imports done via `scripts/src/import-members.ts` using XLSX batches
- Each batch tagged with `source_batch` (e.g. `xlsx_batch_015`)
- Unique constraint on `whatsapp_number` — duplicates rejected automatically
- Reversible: `DELETE FROM members WHERE source_batch = 'batch_name'`
- Members added via `POST /api/members` default to `memberStatus: "active"`
- Public registration endpoint: `POST /api/register` (requires X-API-Key header)

### Current batch inventory (as of 2026-05-10)
| Batch | Count |
|---|---|
| xlsx_batch_015 | 41,936 |
| xlsx_batch_016 | 41,492 |
| xlsx_batch_007–012 | ~6,000 |
| xlsx_batch_001–005 | ~1,386 |
| launch_test_30_members | 20 |
| (no batch / pilot) | 14 |
| **TOTAL** | **91,097** |

---

## 5. WHATSAPP MAIN MENU

**Trigger words:** `Hi`, `Hello`, `Menu`, `Start`, `0`, `Join`

### Member menu (AI Arnie)
```
Hi {name} 👋 I'm AI Arnie — Andre's digital safety sidekick at eblockwatch.

{membership status line}
We are here to keep you and your family safer. What can I help you with today?

1. What is eblockwatch?
2. Membership options
3. Activate my membership
4. Update my profile
5. Travel with Cyber Chaperone 🛡️
6. eblockshop — safer products for you
7. Speak to a human

🚨 URGENT? Reply 10 — we will get a human on it right away.

Reply with a number to choose.
```

### Operator menu (Andre)
```
Hi {name} 👋 Welcome back, operator.

You're logged in as the eblockwatch Situation Room operator.

1. What is eblockwatch?
2. Membership options
3. Activate my membership
4. Update my profile
5. Travel with Cyber Chaperone 🛡️
6. eblockshop — safer products for you
7. Speak to a human

🚨 URGENT? Reply 10 — we will get a human on it right away.
```

---

## 6. MEMBERSHIP PAYMENT LINKS

| Tier | Price | Paystack Link |
|---|---|---|
| Single Membership | R150/month | https://paystack.shop/pay/cyber-chaperone |
| Family Membership | R250/month | https://paystack.shop/pay/family-cyber-chaperone |
| Entry Level | Free | No payment required |

---

## 7. KNOWN ISSUES (as of 2026-05-10)

| # | Issue | Severity | File | Status |
|---|---|---|---|---|
| 1 | `voice-service.ts` TS2322 Buffer type error | Low | `artifacts/api-server/src/voice-service.ts:37` | Pre-existing, does not break build or runtime |
| 2 | `/api/health` requires auth (returns 401) | Low | `artifacts/api-server/src/routes/index.ts` | Health check behind auth guard — minor |
| 3 | Members map view loads all GPS members in one query (no pagination) | Low | `GET /api/members/map` | Acceptable for current GPS-bearing member count |

---

## 8. LAUNCH CHECKLIST

- [ ] Twilio Sandbox webhook URL set correctly
- [ ] OPERATOR_PASSWORD secret set in Replit
- [ ] SESSION_SECRET set in Replit
- [ ] TWILIO_ACCOUNT_SID set in Replit
- [ ] TWILIO_AUTH_TOKEN set in Replit
- [ ] GMAIL_USER set in Replit
- [ ] GMAIL_APP_PASSWORD set in Replit
- [ ] REGISTER_API_KEY set in Replit (for website→DB sync)
- [ ] Main Menu opens on "Hi"
- [ ] "0" returns to Main Menu
- [ ] Single Membership Paystack link resolves
- [ ] Family Membership Paystack link resolves
- [ ] eblockshop menu option visible
- [ ] Cyber Chaperone trip flow (option 5) works end-to-end
- [ ] Imported launch_test_10_members not shown as active trips
- [ ] Situation Room dashboard accessible at production URL
- [ ] Webhook guard: MessageStatus delivery callbacks silently ignored
- [ ] Pilot members (Andre +27825611065, Kieren +27833263751) confirmed in DB

---

## 9. PILOT MEMBERS (PRODUCTION)

| Name | WhatsApp | Role | DB id |
|---|---|---|---|
| Andre Snyman | whatsapp:+27825611065 | operator | 1 |
| Kieren Snyman | whatsapp:+27833263751 | member | 4 |

---

## 10. ACTIVE TRIPS AT RECORD TIME
- 18 trips with status NOT IN ('completed', 'cancelled') as of 2026-05-10

---

## LOCKED — DO NOT CHANGE WITHOUT EXPLICIT APPROVAL
- Webhook URL
- Webhook guard rule (MessageStatus check)
- Pilot member phone numbers
- Trip status logic (green/amber/red)
- Twilio credentials
