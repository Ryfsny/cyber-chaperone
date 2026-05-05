# Ruka vs Current Build — Alignment Report
**eblockwatch Cyber Chaperone / Situation Room**
Date: 5 May 2026

---

## 1. Ruka Features Already Implemented

These items from the original Ruka / SmartChat AI Arnie brief are live in the current Replit build.

| Feature | Implementation |
|---|---|
| Main menu | `mainMenuText()` in `menu-router.ts` — 7 options + URGENT reply 10 |
| No dead ends | `withMenu()` helper appended to every member-facing WhatsApp reply |
| Reply 0 for Main Menu | Idempotent `withMenu()` utility in `message-utils.ts`, applied across all flows |
| Cyber Chaperone sub-menu | `ccMenuText()` — 7 options including start trip, arrival, help, human handoff |
| Step-by-step trip setup | `FLOW_TRIP_FLOW` — start location → destination → ETA, with location pin support |
| Human handoff | CC option 7 and main menu option 7 → operator mirror + member acknowledgement |
| eblockshop menu | Main menu option 6 → eblockwatch.com/shop redirect + "Reply 0 for Main Menu" |

---

## 2. Ruka Features Improved by the Current Build

These areas existed as concepts in the Ruka brief but have been built with significantly greater depth in Replit.

### Conversation State
- **Ruka**: stateful flows managed by Ruka's internal engine
- **Current**: `conversationStatesTable` in PostgreSQL — persistent, multi-step flows survive server restarts and are queryable from the Situation Room

### Situation Room Dashboard
- **Ruka**: no operator interface — all monitoring was manual WhatsApp
- **Current**: full React dashboard — trip list with status colour coding (GREEN / AMBER / RED), trip detail view with evidence notes, inference notes, next action field, messages panel, route map, and radar

### ETA Bullseye
- **Ruka**: ETA was noted in text; no automated tracking
- **Current**: `originalMemberEta` stored on trip creation; `etaDriftMinutes` computed on every inbound message; automated check-in prompt triggers at 15 min drift; ICE escalation triggers at 45 min drift

### ICE Escalation
- **Ruka**: ICE contact was stored but not automatically contacted
- **Current**: full ICE escalation flow — member's ICE contact receives a structured WhatsApp request; ICE replies 1–4 are handled, logged, and mirrored to operator; trip status updates automatically on ICE reply

### Radar Map
- **Ruka**: no geographic visualisation
- **Current**: live radar map at `/radar` — active trips plotted by coordinates, responders plotted by home lat/lon, dispatch modal available directly from map

### Responder / Local Conduit Foundation
- **Ruka**: "community captain" concept, no implementation
- **Current**: `respondersTable` with 15+ fields (conduit type, trust level, availability status, suburb, support radius, linked network type/name); case participant table; case log audit trail; privacy-safe dispatch with 3 info levels; conduit 1–5 reply handling

### Route Intelligence
- **Ruka**: route was stored as freeform text
- **Current**: route enrichment service — detects start/destination lat/lon via geocoding, builds checkpoint list, calculates route confidence, stores polyline for map rendering

### Audit Trail Direction
- **Ruka**: no audit trail
- **Current**: `case_logs` table records every dispatch, conduit reply, and participant status change with timestamp, info level, participant name, trip status at time, and full message sent

---

## 3. Ruka Features Still Missing

These items from the Ruka brief are not yet built in the current system.

### A. Full Profile Completion by Tier
- Ruka envisioned a tiered profile — entry-level (name, phone) through full verified member (ID, ICE contact, home address, vehicle, medical)
- Current: members table has most fields but no guided completion flow; no tier-gating of features
- Impact: no way to surface incomplete profiles; no gamification of safety readiness

### B. Paystack Membership Flow
- Ruka included payment tier selection and Paystack integration
- Current: no payment integration exists; membership activation requires a manual human step (option 7)
- Impact: acquisition funnel has no self-service close

### C. eblockshop Product Flow
- Ruka envisioned a product discovery and handoff flow inside WhatsApp (browse → express interest → Kriszti/admin follow-up)
- Current: option 6 sends a URL redirect only; no product catalogue, no interest capture, no handoff

### D. Kriszti Admin Handoff
- Ruka had a named Kriszti persona for non-safety admin queries (billing, membership, shop)
- Current: all human handoff routes to the generic operator mirror; no persona differentiation

### E. Ruka Recognition / Partner Screen
- Ruka planned a screen/reply acknowledging known vs unknown members by name and membership tier
- Current: member recognition happens internally (PILOT_MEMBERS + DB lookup) but is not surfaced to the member beyond personalised name use

### F. Safe Cell / Situation Room Case
- Ruka envisioned a "Safe Cell" concept — a closed group of trusted local contacts around a member's trip
- Current: the `case_participants` and `case_logs` tables provide the data model, and the Case tab in trip detail is built — but the member has no WhatsApp-side visibility of their case or who is involved

### G. Digital Twin Future Layer
- Ruka referenced a "digital twin" — a live behavioural and safety profile that learns from trip history, ETA patterns, route deviations, and community density
- Current: evidence notes, inference notes, and ETA drift exist as data seeds but no twin model or ML layer is built

### H. Profile Completeness Scoring
- Ruka envisioned a safety readiness score (e.g. 60% complete — add ICE contact to reach 80%)
- Current: no scoring, no prompts for incomplete fields

### I. Member Directory / Search
- Ruka planned a searchable member directory for the Situation Room operator
- Current: no member directory exists in the dashboard; members are only visible when a message arrives

### J. South African Phone Normalisation
- Ruka noted that members text from various formats: 082xxxxxxx, +2782xxxxxxx, 082 xxx xxxx
- Current: phone numbers are stored as received from Twilio (whatsapp:+27...) with no normalisation layer; freeform inputs from forms are not normalised
- Impact: a member registered as +27821234567 and one who texts as +27821234567 may not match if entry was manual

### K. Local Conduit Privacy-Safe Dispatch (Dashboard UX completion)
- The dispatch API and conduit reply handler are built and privacy-correct
- The Nearby Conduits panel and privacy level selector exist in the Trip Detail Case tab
- Still missing: the operator cannot yet update a conduit's info level after initial dispatch; there is no "escalate info level" action in the Case tab

---

## 4. Features We Must Not Bring Back

These existed in earlier iterations and must not be reintroduced.

| Feature | Reason to exclude |
|---|---|
| Forced reason-for-trip question | Adds friction; members abandon the flow; reason is already inferred from route |
| Open-ended AI guessing | Creates unpredictable responses; current AI use is scoped to risk classification only |
| Direct member-to-responder communication | Breaks privacy model; member identity must remain Situation Room-controlled |
| Full private notes sent to responders / conduits | Evidence notes contain sensitive trip data; only privacy-levelled excerpts may be dispatched |
| Automatic WhatsApp group blasting | No consent model; uncontrolled broadcast breaks POPIA and trust |
| Emergency-service wording ("call police", "ambulance dispatch") | Liability; system is a chaperone, not an emergency service |

---

## 5. Commercial Funnel Recommendations

### Membership Tiers

| Tier | Price | Features |
|---|---|---|
| Free / Entry | R0 | Main menu, Cyber Chaperone (limited), eblockshop browse |
| Single Membership | R150/month | Full Cyber Chaperone, ICE escalation, ETA monitoring, Safe Cell access |
| Family Membership | R250/month | Single + up to 4 family members, shared ICE contacts, family radar view |
| Bliksim (ad-hoc) | Per trip | Pay-per-trip Cyber Chaperone for unregistered users |

### Product / Revenue Lines

**eblockshop**
- Safety products curated by eblockwatch (dash cams, trackers, personal alarms)
- WhatsApp browse → interest capture → Kriszti handoff → Paystack or EFT
- Affiliate and own-label potential

**Cyber Chaperone**
- Core retention driver — daily-use safety feature
- Upgrade trigger: "Your ICE contact was not reached — upgrade to Family for automatic backup escalation"

**Local Conduit Network**
- Community captain model — verifiable social proof
- Conduit membership as a status product (verified badge, area captain title)
- Upsell path: conduit → Situation Room operator access tier

### Profile Completion as Safety Readiness

- Present profile completeness as a safety score, not an admin task
- "You are 60% protected — add your ICE contact to reach 80%"
- Completion milestones unlock features (e.g. radar access at 70%, Local Conduit dispatch at 90%)

### Tunnel Marketing Path

```
Social media ad (safety story)
  → WhatsApp opt-in link (wa.me/...)
    → AI Arnie main menu (instant engagement)
      → Cyber Chaperone trial trip (value experience)
        → Profile completion prompt (data capture)
          → Paystack membership offer (conversion)
            → Family / Bliksim / eblockshop (expansion)
```

---

## 6. Recommended Next Build Order

Prioritised by member value, safety criticality, and commercial impact.

### A — Situation Room Directory + SA Phone Normalisation
- Build a searchable member directory in the dashboard (search by name, phone, area)
- Normalise all phone inputs to E.164 (+27...) at ingestion: strip spaces, dashes, leading 0 → replace with +27
- Prerequisite for everything that follows — dirty phone data breaks all lookups

### B — Profile Completion by Tier
- Add a guided WhatsApp flow triggered after first trip: "You are 50% protected — reply 1 to add your ICE contact"
- Store completion score on members table
- Gate Cyber Chaperone ICE escalation behind ICE contact being set
- Surface incompleteness in Situation Room member directory

### C — Paystack Membership Flow
- Integrate Paystack (card / EFT / instant EFT) inside the WhatsApp membership flow
- Tiers: Free, Single R150/month, Family R250/month
- Webhook from Paystack → update member tier → unlock features → confirmation to member
- Manual override in Situation Room for offline payments

### D — eblockshop / Kriszti Handoff
- Build a product browse flow (3–5 featured products with price)
- Interest capture: "Reply 1 to get more info on [product]" → operator mirror to Kriszti queue
- Kriszti persona: separate operator mirror channel / tag for shop queries

### E — Local Conduit Network — Info Level Escalation in Case Tab
- Add "Upgrade info level" action in the Case tab (operator can move conduit from Level 1 → Level 2 → Level 3 after conversation)
- Persist updated info level to `case_participants`; log to `case_logs`
- Show current info level badge per participant in the Case panel

### F — Situation Room Case — Member Visibility
- Allow operator to send a member a sanitised case status update: "Your Cyber Chaperone case is active. A local conduit has been notified."
- Member receives no conduit identity or phone — only status
- Member can reply 1 (acknowledge) or 5 (request callback)

### G — Digital Twin (later)
- Build a behavioural profile from trip history: usual routes, ETA accuracy, frequency, risk patterns
- Flag anomalies: "This member never travels after 22:00 — unscheduled trip detected"
- Surface twin insights on the trip detail dashboard panel
- No external ML dependency required initially — rule-based pattern matching on existing trip data is sufficient to start

---

*End of report. No code changes. No schema changes. No deploy.*
