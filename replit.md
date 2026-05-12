# Cyber Shepherd Main Project

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

## Artifacts

- `artifacts/api-server` — Express API server (all routes)
- `artifacts/situation-room` — Operator dashboard React app
- `artifacts/eblockwatch-website` — Public member website React app

## Production URLs

- **Live app**: `https://cyber-chaperone-r--ryfsny.replit.app`
- **Situation Room**: `https://cyber-chaperone-r--ryfsny.replit.app/`
- **Website**: `https://cyber-chaperone-r--ryfsny.replit.app/website/`
- **Twilio webhook**: `POST https://cyber-chaperone-r--ryfsny.replit.app/api/webhook/twilio`

## ⚠️ PUBLISH BLOCKER (as of 2026-05-11 night)

**Production database is frozen.** The Replit schema migration cannot run against it, so every publish attempt silently cancels before a build starts. All code is ready and waiting.

**Fix:** Replit support must unfreeze the production DB for repl `861f57c8-8edb-426d-bcdf-9ec68d1de62b`. Support email drafted — see bottom of this file. Once unfrozen: click Publish → approve schema screen → done in 2 minutes.

## Route Security Map

### Public (no auth)
| Route | Purpose |
|---|---|
| `GET /api/healthz` | Health check (used by Replit startup probe) |
| `POST /api/webhook/twilio` | Twilio WhatsApp inbound messages |
| `POST /api/auth/login` | Operator login |
| `GET /api/auth/me` | Session check |
| `POST /api/register` | Member self-registration |
| `POST /api/paystack/webhook` | Paystack payment events (HMAC-SHA512 verified — hard reject without sig) |
| `POST /api/paystack/payment-link` | Generate personalised Paystack checkout URL (members use from website) |
| `/api/member-portal/*` | Member portal (JWT-based, members self-auth) |
| `/api/arnie-chat` | AI Arnie WhatsApp-style chat |

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
- `members` — member registry (id, first_name, last_name, display_name, whatsapp_number, member_status, membership_tier, role, notes, ice_contact_name, ice_contact_phone, family_group_id, home_lat/lon, home_address, email, mobile, industry, suburb, city, province, postal_code, country, source_batch, import_status, **paystack_customer_id**, **paystack_subscription_code**, **paystack_status**, **paystack_plan_code**, **paystack_paid_at**, created_at, updated_at)
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

## Route Enrichment (OpenStreetMap — no API key)

- Geocoding: Nominatim (`nominatim.openstreetmap.org`) with `countrycodes=za`
- Routing: OSRM (`router.project-osrm.org`)
- Stores: `routePolyline`, `routeEtaMinutes`, `routeEtaTime`, `checkpointList`
- Dashboard: `TripRouteMap` (react-leaflet) renders on every trip detail page

## System Audit — 2026-05-11 (41/41 green)

All 41 moving parts verified green. One publish blocker (frozen prod DB — see above). Last successful production build: 2026-05-10. Code staged and ready to deploy the moment the DB is unfrozen.

## MVP Production Proof — 2026-05-04

All 8 menu router scenarios and full end-to-end WhatsApp → Situation Room flow verified live on +27825611065.

## Important Notes

- `lib/api-zod/src/index.ts` only exports from `./generated/api` — orval config has `indexFiles: false`
- Secrets are never logged — pino serializers strip sensitive headers
- Production schema managed by Replit Publish flow — diffs dev vs prod and applies automatically (pending DB unfreeze)
- Pre-existing typecheck errors in `voice-service.ts`, `register.ts`, `broadcast.ts` — do not fix these

---

## Support Email Draft (send to get publish unblocked)

**To:** support@replit.com
**Subject:** Production database frozen — blocking publish for repl 861f57c8-8edb-426d-bcdf-9ec68d1de62b

Hi Replit Support,

My production database is frozen and blocking every publish attempt. The publish cancels silently before a build even starts — no new build is created in the build history.

**Account:** ryfsny
**Repl ID:** 861f57c8-8edb-426d-bcdf-9ec68d1de62b
**Production URL:** https://cyber-chaperone-r--ryfsny.replit.app
**Project:** Cyber Shepherd Main Project

**What happens:** I click Publish, a schema changes screen appears (new columns being added), I approve it — but no build is ever triggered and the publish silently fails every time.

**Error from agent tool when querying production DB:**
"The production database for repl 861f57c8-8edb-426d-bcdf-9ec68d1de62b is frozen. Unfreeze it first."

**New columns waiting to be applied to production:**
- `messages.direction` (text, default 'inbound')
- `members.paystack_customer_id`, `paystack_subscription_code`, `paystack_status`, `paystack_plan_code`, `paystack_paid_at`

Please unfreeze the production database so the schema migration can run during the next publish.

Thank you,
Andre Snyman
eblockwatch / Cyber Shepherd
