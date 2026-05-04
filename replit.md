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

- `artifacts/api-server` — Express API server (routes: webhook, trips, messages, health)
- `artifacts/situation-room` — React dashboard (Situation Room, Trip Detail, Message Inbox, New Trip)

## Key Features

1. **Twilio WhatsApp webhook** — `POST /api/webhook/twilio` receives incoming messages and stores them
2. **Trip records** — Green/Amber/Red status with evidence, inference, next-action, and operator notes
3. **Situation Room dashboard** — Command-center view of all active trips sorted by urgency
4. **Trip detail** — Full editable record + message feed for each traveler
5. **Message inbox** — All raw WhatsApp messages, assignable to trips
6. **New trip form** — Create a trip record with traveler info

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

- `trips` — traveler trip records (id, title, traveler_name, traveler_phone, status, evidence_notes, inference_notes, next_action, operator_notes, created_at, updated_at)
- `messages` — raw WhatsApp messages (id, from_number, to_number, body, message_sid, trip_id, received_at)

## Secrets Required

- `TWILIO_ACCOUNT_SID` — Twilio Account SID (starts with AC...)
- `TWILIO_AUTH_TOKEN` — Twilio Auth Token

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

Production URL: `https://cyber-chaperone-r--ryfsny.replit.app`
Twilio webhook: `POST /api/webhook/twilio`

## Important Notes

- `lib/api-zod/src/index.ts` only exports from `./generated/api` (not `./generated/types`) to avoid duplicate export conflicts — orval config has `indexFiles: false` for the zod output
- Secrets are never logged — pino serializers strip sensitive headers
