# Threat Model

## Project Overview

Cyber Chaperone is a WhatsApp-first personal safety platform for eblockwatch. A single Express 5 API serves two production frontends: the operator-facing Situation Room and the public eblockwatch website. The system stores sensitive member, trip, responder, and conversation data in PostgreSQL via Drizzle ORM, accepts public webhook traffic from Twilio, Facebook Messenger, and Paystack, and uses OpenAI-backed features for operator assistance and public chat.

Production scope for security scanning is `artifacts/api-server`, `artifacts/situation-room`, `artifacts/eblockwatch-website`, and shared runtime libraries under `lib/`. `artifacts/mockup-sandbox` is treated as dev-only and out of scope unless production reachability is demonstrated.

## Assets

- **Operator accounts and sessions** — operator sessions can view and act on live safety incidents, member records, responder data, and payment/admin workflows. Compromise enables operational impersonation and broad data access.
- **Member portal sessions** — member sessions allow access to personal profile data and updates to contact, address, and ICE information. Compromise exposes PII and can corrupt emergency-contact data.
- **Member and responder PII** — names, phone numbers, email addresses, home addresses, home coordinates, ICE contacts, and location-linked responder records are all safety-sensitive personal data.
- **Trip and case data** — live trip status, route context, evidence notes, inference notes, and case participant records can reveal a traveller’s movements and emergency posture.
- **Webhook trust credentials and application secrets** — Twilio, Facebook, Paystack, session, email, and AI secrets protect trusted integrations and authenticated server behavior.
- **Outbound messaging capability** — Twilio/Messenger/email channels can reach real users and operators. Abuse can create phishing, spam, false distress escalation, or operational disruption.

## Trust Boundaries

- **Browser / mobile client to API** — both production frontends are untrusted clients. All authorization must be enforced server-side.
- **Public internet to webhook endpoints** — Twilio, Facebook, and Paystack routes are intentionally exposed but must only trust correctly verified provider requests.
- **Public user to member-auth boundary** — OTP issuance and verification for `/api/member-portal/*` crosses from anonymous users to authenticated member sessions.
- **Operator session to privileged data/actions** — `requireAuth` distinguishes anonymous users from operators, but role/scope boundaries also exist between national and sub-national operators and must be enforced per route.
- **API to PostgreSQL** — the API has broad read/write access to member, trip, case, and message tables; route-level authorization failures can become full data exposure.
- **API to third-party services** — Paystack, Twilio, Meta, OpenAI, Gmail, and map providers are external trust boundaries; outbound requests and inbound callbacks must be authenticated and bounded.
- **Internal / production boundary** — mockup artifacts and local-only utilities should not influence production threat conclusions unless reachable from deployed routes.

## Scan Anchors

- **Production entry points:** `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/index.ts`, public frontends under `artifacts/situation-room/src` and `artifacts/eblockwatch-website/src`.
- **Highest-risk code areas:** `artifacts/api-server/src/routes/` (especially `auth.ts`, `member-portal.ts`, `webhook.ts`, `facebook-webhook.ts`, `paystack*.ts`, `members.ts`, `trips.ts`, `case.ts`, `conversations.ts`, `ai.ts`), plus `artifacts/api-server/src/middleware/require-auth.ts`.
- **Public vs authenticated vs admin surfaces:** public auth/registration/webhooks/member portal vs operator routes behind `requireAuth`; additional role boundary exists between national and scoped operators.
- **Usually ignore unless production reachability changes:** `artifacts/mockup-sandbox`, presentation/deck artifacts, local docs/scripts.

## Threat Categories

### Spoofing

This system trusts inbound webhook traffic to create or update safety-relevant state. Twilio, Facebook, and Paystack requests must be authenticated on every call, and verification must fail closed when required secrets or canonical request inputs are missing. Operator and member sessions must only be created after strong credential or OTP validation, with secrets and session identifiers remaining unpredictable.

### Tampering

Attackers must not be able to alter trip records, member profiles, payment-derived status, or case participation outside their assigned role and scope. Server-side authorization must be applied per route and per object, not just at login time or on list pages. Public-facing endpoints must validate request bodies and prevent attackers from forcing state changes through brute force or spoofed callbacks.

### Information Disclosure

The application stores sensitive contact, address, ICE, route, and conversation data. API responses must only return records the caller is entitled to see, with special attention to sub-national operator scoping and member self-service boundaries. Logs and error responses must avoid leaking secrets, raw credentials, or internal stack traces.

### Denial of Service

Public OTP, chat, and webhook endpoints can trigger messaging, AI usage, and database work. These endpoints require throttling and bounded processing so attackers cannot spam members with OTPs, exhaust AI quota, or tie up operational channels. External calls should also avoid turning public traffic into expensive uncontrolled fan-out.

### Elevation of Privilege

The main privilege boundary is not only anonymous-versus-authenticated, but also national operator versus provincial/city/suburb/street operators and member versus operator access. Every route that reads or mutates members, trips, messages, cases, broadcasts, or payment state must enforce the relevant scope restrictions server-side. Any endpoint that allows a lower-privileged operator to reach global data is an elevation-of-privilege risk in this project.
