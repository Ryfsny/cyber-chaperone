# Cyber Chaperone Main Project

## Overview

WhatsApp-first safety platform for eblockwatch (Andre Snyman). Two live apps in one monorepo:
1. **Situation Room** — operator command centre (`/`) — monitors traveler trips in real time via Green/Amber/Red status board
2. **eblockwatch Website** — public member portal (`/website/`) — registration, login, dashboard, and membership upgrade funnel

This is the single source of truth. Everything happens here.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui
- **WhatsApp**: Twilio webhook
- **Facebook Messenger**: Meta Webhooks — full Cyber Chaperone menu on Messenger

## Artifacts

- `artifacts/api-server` — Express API server (all routes)
- `artifacts/situation-room` — Operator dashboard React app
- `artifacts/eblockwatch-website` — Public member website React app
- `artifacts/backapp` — BackApp "Cyber Shepherd" Expo mobile app (member GPS tracking)

## Production URLs

- **Live app**: `https://cyber-chaperone-r--ryfsny.replit.app`
- **Situation Room**: `https://cyber-chaperone-r--ryfsny.replit.app/`
- **Website**: `https://cyber-chaperone-r--ryfsny.replit.app/website/`
- **Twilio webhook**: `POST https://cyber-chaperone-r--ryfsny.replit.app/api/webhook/twilio`
- **Facebook webhook**: `POST https://cyber-chaperone-r--ryfsny.replit.app/api/webhook/facebook`

## BackApp — Cyber Shepherd (live 2026-05-20)

Member installs BackApp → enters their WhatsApp number → app silently tracks location.

**Modes:**
| Mode | Ping interval | Who sets it |
|---|---|---|
| IDLE | Every 2 hours | Default |
| TRIP | Every 60 seconds | Member taps Start Trip |
| EMERGENCY | Every 30 seconds | Operator pushes command |

**API routes (public, phone-identified):**
| Route | Purpose |
|---|---|
| `POST /api/backapp/ping` | App sends GPS coordinates → returns current mode + interval |
| `POST /api/backapp/start` | Member starts trip → switches to 60s pings |
| `POST /api/backapp/stop` | Member ends trip → switches back to idle |
| `GET /api/backapp/mode?phone=xxx` | App polls for operator mode override |
| `POST /api/backapp/command` | Operator pushes mode change (emergency=30s) |
| `GET /api/backapp/pings/:phone` | Operator reads recent ping history |

**DB tables added:**
- `location_pings` — memberPhone, lat, lon, accuracy, mode, pingedAt
- `members.backapp_mode` — idle/trip/emergency
- `members.backapp_interval_seconds` — current ping interval

**Install (no app store needed):** Scan QR code from Replit preview → opens in Expo Go on phone.

## Route Security Map

### Public (no auth)
| Route | Purpose |
|---|---|
| `GET /api/healthz` | Health check (used by Replit startup probe) |
| `POST /api/webhook/twilio` | Twilio WhatsApp inbound messages |
| `GET /api/webhook/facebook` | Meta webhook verification |
| `POST /api/webhook/facebook` | Facebook Messenger — full Cyber Chaperone menu |
| `POST /api/auth/login` | Operator login |
| `GET /api/auth/me` | Session check |
| `POST /api/register` | Member self-registration |
| `POST /api/paystack/webhook` | Paystack payment events (HMAC-SHA512 verified — hard reject without sig) |
| `POST /api/paystack/payment-link` | Generate personalised Paystack checkout URL (members use from website) |
| `/api/member-portal/*` | Member portal (JWT-based, members self-auth) |
| `/api/arnie-chat` | AI Command WhatsApp-style chat |

### Operator-protected (requireAuth session)
| Route | Purpose |
|---|---|
| `GET/POST /api/trips` | Trip management |
| `GET/PATCH /api/members` | Member registry |
| `GET /api/conversations` | WhatsApp conversation inbox |
| `POST /api/conversations/reply` | Send WhatsApp reply from dashboard |
| `GET /api/responders` | Responder network |
| `GET /api/paystack/status` | Paystack subscription count |
| `POST /api/paystack/sync` | Bulk sync all Paystack subscribers → member records |
| `GET/POST /api/ai` | AI analysis |
| `GET/POST /api/broadcast` | Bulk WhatsApp broadcast |
| `GET/POST /api/case` | Case management |

## Database Schema (dev — fully up to date)

- `messages` — raw WhatsApp messages (id, from_number, to_number, body, message_sid, trip_id, **direction**, received_at)
- `members` — member registry (id, first_name, last_name, display_name, whatsapp_number, member_status, membership_tier, role, notes, ice_contact_name, ice_contact_phone, family_group_id, home_lat/lon, home_address, email, mobile, industry, suburb, city, province, postal_code, country, source_batch, import_status, **paystack_customer_id**, **paystack_subscription_code**, **paystack_status**, **paystack_plan_code**, **paystack_paid_at**, **facebook_url**, created_at, updated_at)
- `trips` — traveler trip records (id, title, traveler_name, traveler_phone, status, evidence_notes, inference_notes, next_action, operator_notes, original_member_eta, current_route_confidence, last_member_checkin_time, eta_drift_minutes, ice_escalation_status, start_lat/lon, dest_lat/lon, route_polyline, route_eta_minutes, route_eta_time, checkpoint_list, created_at, updated_at)
- `responders` — eblockwatch responder network (id, name, whatsapp_number, area_name, suburb, street, province, home_lat/lon, conduit_type, support_radius_km, availability_status, trust_level, linked_network_type, linked_network_name, notes, active, created_at, updated_at)
- `conversation_states` — per-member menu state (id, whatsapp_number, current_flow, current_step, pending_trip_data, updated_at)

## Paystack Integration

- **Plans**: Individual = `PLN_rnn4nj61oh0zy0c` (R150/mo), Family = `PLN_wopagttz7e5quyw` (R250/mo)
- **Webhook URL** (register in Paystack dashboard → Settings → API Keys & Webhooks):
  `https://cyber-chaperone-r--ryfsny.replit.app/api/paystack/webhook`
- **Flow**: Member visits `/website/upgrade` → picks plan → personalised checkout generated → pays → webhook fires → member auto-upgraded to `verified` + correct tier
- **Sync**: Operator logs in → `POST /api/paystack/sync` → 60 subscribers synced on last run

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## WhatsApp Number Cutover (when Twilio issues a dedicated business number)

Two permanent roles — never confuse them:

| Role | Env var | Current value | Changes? |
|---|---|---|---|
| **Business number** (members message this, AI Command replies from this) | `TWILIO_WHATSAPP_NUMBER` | `whatsapp:+27825611065` | YES — update when Twilio number arrives |
| **Founder's personal phone** (operator mirrors, ICE CC, WingWoman CC, emergencies) | hardcoded `FOUNDER_WHATSAPP` | `whatsapp:+27825611065` | NO — always André's personal phone |

**When the Twilio number arrives, do exactly this:**
1. Update `TWILIO_WHATSAPP_NUMBER` secret → `whatsapp:+{new number}` (e.g. `whatsapp:+27xxxxxxxxx`)
2. Update `VITE_WHATSAPP_NUMBER` env var on the eblockwatch-website → `{new number digits only}` (e.g. `27xxxxxxxxx`)
3. Restart both workflows
4. Update Twilio webhook URL to: `https://cyber-chaperone-r--ryfsny.replit.app/api/webhook/twilio`
5. Done — all emails, WhatsApp links, OTPs, and menus switch automatically

**What does NOT need to change:** `FOUNDER_WHATSAPP` (André's personal mirrors), the webhook route itself, Paystack, Facebook, or any other config.

## Secrets Required

- `TWILIO_ACCOUNT_SID` — Twilio Account SID
- `TWILIO_AUTH_TOKEN` — Twilio Auth Token
- `PAYSTACK_SECRET_KEY` — Paystack live secret key
- `OPERATOR_PASSWORD` — Situation Room login password
- `SESSION_SECRET` — Express session signing key
- `GMAIL_USER` + `GMAIL_APP_PASSWORD` — digest/alert emails

## Webhook Guard Rule (LOCKED — do not change)

Ignore ONLY when `req.body.MessageStatus` is present and truthy. Never block on `SmsStatus="received"` — that is a genuine inbound message.

## Menu Router Architecture

**File:** `artifacts/api-server/src/menu-router.ts`

**Priority order (highest to lowest):**
0. ICE contact detection → ICE reply handler (choices 1–4)
1. Distress keywords → RED + auto-ICE escalation
2. Arrival keywords → trip closed
3. Menu reset trigger (Hi/0/Menu) → main menu
4. Conversation state routing (TRIP_FLOW → CLARIFICATION → CHECKIN → CYBER_CHAPERONE → MAIN_MENU)
5. `START [from] to [dest] ETA [time]` structured parser → GREEN trip
6. ETA drift ≥15 min → CHECKIN flow; ≥45 min → auto-ICE + AMBER
7. Ambiguous destination guard → AMBER + clarification
8. Freeform trip-start parser fallback

## `isKnown` Rule

`isKnown: memberStatus === "verified" || memberStatus === "active"`

## Pilot Members (production)

| Name | WhatsApp | Role | DB id | ICE Contact |
|------|----------|------|-------|-------------|
| Andre Snyman | whatsapp:+27825611065 | operator | 1 | — |
| Kieren Snyman | whatsapp:+27833263751 | member | 4 | Andre Snyman (+27825611065) |

## ETA + ICE Escalation

- Drift ≥15 min + no check-in in 25 min → CHECKIN flow (6 choices)
- Drift ≥45 min → auto ICE escalation + AMBER
- Distress → RED + auto ICE if not yet contacted
- ICE escalation status: `null` → `SENT` → `REPLIED`

## ICE Contact Direct WhatsApp Alert (live — 2026-05-17)

When any RED escalation fires, the system now directly WhatsApps the member's registered ICE contact — no human relay needed. Three trigger points:

1. **Distress keyword** (`handleDistress`) — member sends HELP / SOS / etc.
2. **Emergency "10"** (global handler) — member replies 10 at any time
3. **Check-in choice "5"** (`handleCheckinChoice`) — member selects SOS from check-in menu

Each ICE alert includes:
- Member's name and exact situation description
- Route name (trip title)
- **Google Maps deep-link** to last known coordinates (`destLat/destLon` → fallback `startLat/startLon`)
- Direct wa.me link to contact the member
- André's name as the monitoring operator

ICE phone normalisation handles both `0XX` and `+27XX` SA formats. Fully best-effort — never crashes the main flow. André's emergency mirror fires in parallel.

Operator mirror message now confirms `ICE contact alerted: Name (number)` or `ICE contact: not set` on every RED event.

## Route Enrichment (OpenStreetMap — no API key)

- Geocoding: Nominatim (`nominatim.openstreetmap.org`) with `countrycodes=za`
- Routing: OSRM (`router.project-osrm.org`)
- Stores: `routePolyline`, `routeEtaMinutes`, `routeEtaTime`, `checkpointList`
- Dashboard: `TripRouteMap` (react-leaflet) renders on every trip detail page

## Brand Alignment — 2026-05-12 (complete)

**eblockwatch brand tokens applied across all touchpoints:**
- Dark navy: `#1a1f2e` (header/footer backgrounds)
- eblockwatch green: `#22c55e` / `hsl(142 76% 36%)` (all CTAs, active states, accents)
- Darker green border: `#16a34a`
- Light green signature bg: `#f0fdf4`

**Changes applied:**
1. **Situation Room** — primary colour changed from near-black to eblockwatch green. All buttons, nav active states, input rings, focus rings now match the brand.
2. **Broadcast emails** (`buildEmailHtml` in broadcast.ts) — header changed from black/gold to dark navy + eblockwatch logo image + green bar. Signature uses green border and light-green background. Footer has proper social links including Instagram.
3. **Operator emails** (`email-service.ts`) — upgraded from plain monospace HTML to full branded template with dark navy header, category-specific alert bars (green/blue/amber/red), and green accent line.
4. **Broadcast preview panel** (broadcast.tsx) — preview now shows the actual navy/green email layout with logo, green bar, and correct social icons.
5. **eblockwatch Website** — already correctly branded with green primary ✅

**Facebook Messenger / Instagram DMs** — not yet integrated. Requires Meta Business API (separate from Twilio). See below if planning.

## Welcome Home Campaign — Standard Process (locked 2026-05-16)

**Philosophy: when email fails, immediately follow up on the next best channel.**

### Per-batch workflow (run from Situation Room → Broadcast → Welcome Home Campaign)
1. Click **Launch Campaign** — sends the next 50 unsent members automatically (system skips anyone already contacted in a prior batch)
2. André is CC'd on email #1 and #50 of every batch — confirms start and finish
3. Wait 24 hours for bounce notifications to arrive in Gmail

### Post-batch bounce recovery
4. Check Gmail for bounce notifications (look for MAILER-DAEMON, "Delivery failed", "Undeliverable")
5. For each bounced address: run the individual SMS route from Situation Room → SMS Broadcast, asking the member for their current email address
6. When a member replies with a new address: update the `email` field in the Members registry
7. NULL out the old dead address immediately (already done for batch 1)

### Batch 1 summary (2026-05-16)
- 50 emails attempted · ~34 delivered · 16 hard bounced (dead ISP domains: iafrica, mweb, telkomsa, iburst, xsinet etc) · 3 delayed
- All 16 bounced members individually SMS'd asking for current email address
- All 16 dead email addresses cleared from DB ✓
- Next batch: members 51–100 (by join order) — launch tomorrow from Situation Room

### Technical notes
- Sends tracked in `messages` table (`direction='broadcast'`, `channel='email'`, `body LIKE '%Welcome campaign%'`)
- Re-running the route automatically picks up the next 50 unsent — no manual offset needed
- If the server restarts mid-batch, already-sent members are safe (awaited DB write before next send)

## System Audit — 2026-05-11 (41/41 green)

All 41 moving parts verified green. One publish blocker (frozen prod DB — see above). Last successful production build: 2026-05-10. Code staged and ready to deploy the moment the DB is unfrozen.

## MVP Production Proof — 2026-05-04

All 8 menu router scenarios and full end-to-end WhatsApp → Situation Room flow verified live on +27825611065.

## Important Notes

- `lib/api-zod/src/index.ts` only exports from `./generated/api` — orval config has `indexFiles: false`
- Secrets are never logged — pino serializers strip sensitive headers
- Production schema managed by Replit Publish flow — diffs dev vs prod and applies automatically
- Pre-existing typecheck errors in `voice-service.ts`, `register.ts`, `broadcast.ts` — do not fix these
