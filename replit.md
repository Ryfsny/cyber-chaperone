# Cyber Chaperone Situation Room

## Overview

A WhatsApp-first operator dashboard that turns messy WhatsApp trip messages into structured Situation Room records. Andre uses this to monitor travelers in real time via a command-center UI.

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

- `artifacts/api-server` — Express API server (routes: webhook, trips, messages, health, members)
- `artifacts/situation-room` — React dashboard (Situation Room, Trip Detail, Message Inbox, New Trip)

## Key Features

1. **Twilio WhatsApp webhook** — `POST /api/webhook/twilio` receives incoming messages and stores them
2. **Menu router** — Stateful SmartChat menu flows (main menu, Cyber Chaperone sub-menu, step-by-step trip creation)
3. **Trip records** — Green/Amber/Red status with evidence, inference, next-action, and operator notes
4. **Situation Room dashboard** — Command-center view of all active trips sorted by urgency
5. **Trip detail** — Full editable record + message feed for each traveler
6. **Message inbox** — All raw WhatsApp messages, assignable to trips
7. **Member registry** — Known members with `isKnown` for both `"active"` and `"verified"` status

## Webhook URL

```
https://861f57c8-8edb-426d-bcdf-9ec68d1de62b-00-1wbyvfmtwel27.kirk.replit.dev/api/webhook/twilio
```
Method: **POST** — paste this into Twilio Sandbox "WHEN A MESSAGE COMES IN"

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Database Schema

- `trips` — traveler trip records (id, title, traveler_name, traveler_phone, status, evidence_notes, inference_notes, next_action, operator_notes, original_member_eta, current_route_confidence, last_member_checkin_time, eta_drift_minutes, ice_escalation_status, created_at, updated_at)
- `messages` — raw WhatsApp messages (id, from_number, to_number, body, message_sid, trip_id, received_at)
- `members` — known member registry (id, first_name, last_name, display_name, whatsapp_number, member_status, role, notes, ice_contact_name, ice_contact_phone, created_at, updated_at)
- `conversation_states` — per-member menu state (id, whatsapp_number, current_flow, current_step, pending_trip_data, updated_at)

## Secrets Required

- `TWILIO_ACCOUNT_SID` — Twilio Account SID (starts with AC...)
- `TWILIO_AUTH_TOKEN` — Twilio Auth Token

## Webhook Guard Rule (LOCKED — do not change)

Ignore ONLY when `req.body.MessageStatus` is present and truthy. Never block on `SmsStatus="received"` — that is a genuine inbound message.

## Menu Router Architecture

**File:** `artifacts/api-server/src/menu-router.ts`

**Integration point in webhook.ts:** runs after the unknown-member check (line ~420), before `if (parsed)`. Returns `{handled: boolean}`. If `handled: true`, the webhook returns immediately — the menu router owns message save, Twilio reply, and operator mirror.

**Conversation flows (stored in `conversation_states` table):**
- `MAIN_MENU` — waiting for a main menu choice (1–10)
- `CYBER_CHAPERONE` — waiting for a CC menu choice (1–7)
- `TRIP_FLOW` — collecting trip data step-by-step (start → destination → ETA → create trip)
- `CLARIFICATION` — waiting for member response on ambiguous destination
- `CHECKIN` — ETA drift check-in flow (choices 1–6: okay / delayed / ETA changed / stopped / help / send pin)

**Trigger words:**
- Main menu: `Hi`, `Hello`, `Menu`, `Start`, `0`
- Cyber Chaperone: `5` from main menu, or keywords: `cyber chaperone`, `travel`, `trip`, `start trip`

**Priority order (highest to lowest):**
0. ICE contact detection — if `from` matches any member's `ice_contact_phone` → ICE reply handler (choices 1–4)
1. Distress (`help`, `sos`, `emergency`, `danger`, `call me`, …) → RED + auto-escalate to ICE if not yet escalated
2. Arrival (`arrived`, `i have arrived`, …) → close trip, always
3. Menu reset trigger (`Hi`/`0`/…) → main menu
4. Conversation state routing (TRIP_FLOW → CLARIFICATION → CHECKIN → CYBER_CHAPERONE → MAIN_MENU)
5. `START [from] to [dest] ETA [time]` structured parser → create GREEN trip
6. ETA drift monitoring — if drift ≥15 min and no recent check-in → CHECKIN flow; if drift ≥45 min → auto-ICE escalation + AMBER
7. Ambiguous destination guard (has active trip + movement language but not a full trip-start) → AMBER + clarification menu + operator mirror
8. Pass-through to existing freeform trip-start parser (`Leaving X heading to Y ETA Z`) and follow-up classifier

**Unsafe fallback rule:** unclear movement/destination messages with an active trip → CLARIFICATION NEEDED / AMBER, never silent GREEN.

## `isKnown` Rule

`isKnown: memberStatus === "verified" || memberStatus === "active"`

Members added via `POST /api/members` default to `memberStatus: "active"` and are treated as known members.

## Pilot Members (production)

| Name | WhatsApp | Role | DB id | ICE Contact |
|------|----------|------|-------|-------------|
| Andre Snyman | whatsapp:+27825611065 | operator | 1 | — |
| Kieren Snyman | whatsapp:+27833263751 | member | 4 | Andre Snyman (+27825611065) |

PILOT_MEMBERS hardcoded fallback in webhook.ts still covers Andre if the DB lookup ever fails.

## ETA Bullseye + ICE Escalation Architecture (2026-05-04)

### ETA bullseye
- When a trip is created (step-by-step or START format), `original_member_eta` is stored normalised (e.g. "23:30").
- On every message from a known member with an active trip, `calculateEtaDrift` computes minutes past ETA using current local time (midnight-crossing safe).
- `eta_drift_minutes` is updated on the trip record on every message.

### Check-in flow
- Drift ≥15 min + no check-in in last 25 min → `CHECKIN` flow entered, check-in prompt sent with 6 choices.
- Choice 1 (okay) → GREEN, `lastMemberCheckinTime` updated.
- Choice 2/3 (delayed/ETA changed) → AMBER, collect new ETA.
- Choice 4 (stopped) → AMBER + operator mirror.
- Choice 5 (need help) → RED (caught by distress handler).
- Choice 6 (send pin) → wait for location pin.

### ICE escalation
- `ice_contact_name` + `ice_contact_phone` stored on `members` table (WhatsApp format: `whatsapp:+XXXXXXXXXXX`).
- Auto-escalation: drift ≥45 min → `escalateToIce` → AMBER + ICE message sent + operator mirror.
- Distress RED → if ICE not yet contacted (`iceEscalationStatus=null`) → auto-escalate to ICE.
- ICE escalation status: `null` → `SENT` → `REPLIED`.

### ICE reply detection
- On every inbound message, `detectIceContact(from)` queries `members WHERE ice_contact_phone = from`.
- If match: routes to `handleIceReply` (choices 1–4) before any other handler.
- ICE reply "1" (okay) → GREEN + operator mirror.
- ICE reply "2" (needs help) → RED + operator mirror.
- ICE reply "3" (could not reach) → AMBER + operator mirror.
- ICE reply "4" (call me) → operator mirror with ICE phone.

### Google Maps stubs
- `routePolyline`, `calculatedGoogleEta`, `checkpointList` are currently NULL — requires `GOOGLE_MAPS_API_KEY` env var + Directions API enabled. Add key as secret to activate route geofence and checkpoint logic.

## MVP Production Proof — 2026-05-04

**Cyber Chaperone Situation Room MVP — Production proof passed.**

Live WhatsApp number +27825611065 successfully tested end-to-end:

1. Messy trip-start message created a GREEN trip.
2. Traffic update changed the trip to AMBER.
3. Arrival message completed the trip.
4. TEST RED trip-start created a new GREEN trip correctly.
5. "I need help" escalated the active trip to RED.
6. Twilio replies were sent for every message.
7. Evidence notes remained clean (structured timestamps only, no raw chat contamination).
8. No message was linked to an old completed trip.

Parser fix summary: replaced single fragile optional-group regex with a two-pass normalise-then-match approach. Em/en dashes, smart quotes, and whitespace are normalised before matching. A 5-case self-test runs at every server startup (5/5 passed). Per-message diagnostic logging added for all future failures.

## Menu Router Test Proof — 2026-05-04

All 8 required test scenarios pass (verified against dev DB and logs):

| # | Input | Expected | Result |
|---|-------|----------|--------|
| T1 | "Hi" | Main Menu | ✅ currentFlow=MAIN_MENU |
| T2 | "5" | CC Menu | ✅ currentFlow=CYBER_CHAPERONE |
| T3 | "1" (from CC) | Ask for location pin | ✅ TRIP_FLOW/WAITING_FOR_START_LOCATION |
| T4 | "START Fourways to Rosebank Mall ETA 19:40" | GREEN trip | ✅ trip status=green |
| T5 | "I am going to Oyster Box in Durban" (with active trip) | Clarification + AMBER | ✅ CLARIFICATION + amber |
| T6 | "1" (to clarification) | Start new trip flow | ✅ TRIP_FLOW/WAITING_FOR_START_LOCATION |
| T7 | "I have arrived" | Trip closed | ✅ status=completed |
| T8 | "I need help" | RED alert | ✅ status=red |

Production URL: `https://cyber-chaperone-r--ryfsny.replit.app`
Twilio webhook: `POST /api/webhook/twilio`

## Important Notes

- `lib/api-zod/src/index.ts` only exports from `./generated/api` (not `./generated/types`) to avoid duplicate export conflicts — orval config has `indexFiles: false` for the zod output
- Secrets are never logged — pino serializers strip sensitive headers
- Production schema is managed by Replit's Publish flow — when publishing, Replit diffs dev schema against production and applies changes automatically
