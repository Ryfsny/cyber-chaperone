# eblockwatch WhatsApp Flow Map
## The Mapping Story — CC + Membership Journey
**Version:** May 2026
**Owner:** Andre Snyman / eblockwatch
**Purpose:** Complete question-to-answer mapping for every WhatsApp interaction. This is the soul of the system and the commercial spine. Every message is a relationship moment.

---

## HOW TO READ THIS MAP

Each section shows:
- **Trigger** — what the member sends
- **Member receives** — exact message text
- **Operator receives** — Situation Room mirror (if any)
- **State set** — what the system remembers after this step
- **Next step** — where this leads
- **Money moment** — commercial significance (where applicable)

---

## LAYER 1 — FIRST CONTACT

```
Member sends:  Hi / Hello / Menu / Start / 0 / Join
```

**Member receives:**
```
Hi [Name], I'm AI Arnie, Andre Snyman's digital wingman.

You're on a [tier]. / Your eblockwatch membership is being confirmed. / Your eblockwatch membership status is not confirmed yet.

We are here to make you safer.

1. What is eblockwatch?
2. Membership Options
3. Activate my membership
4. Update my profile
5. Travel with Cyber Chaperone
6. eblockshop — safer products to make you safer
7. Request contact from a human

URGENT? Reply 10 for immediate human review.

Reply with the number of your choice. Reply 0 for Main Menu.
```

**Operator receives:** Nothing (main menu is silent)
**State set:** FLOW_MAIN_MENU
**Next step:** Member replies 1–7 or 10

> **Relationship note:** Every first message to the system lands here. This is the front door. The membership status line is the personalisation hook — it tells the member exactly where they stand.

---

## LAYER 2 — WHAT IS EBLOCKWATCH

```
Member replies:  1  (from Main Menu)
```

**Member receives:**
```
[Name], eblockwatch is a trusted human support network built around real people, real relationships, and looking after people properly.

For more than 25 years, Andre Snyman has built trusted relationships with members across South Africa. That is what gives eblockwatch its strength.

When something goes wrong, eblockwatch uses those relationships and networks to connect the right people, in the right place, at the right time, with the right solutions to your predicament.

This is not just a page or a group. It is a real network.

When you register, the relationship starts, and each member makes the spine of eblockwatch stronger.

1. Membership Options
2. Update my profile
3. Travel with Cyber Chaperone
4. eblockshop — safer products to make you safer

Reply 0 for Main Menu.
```

**Operator receives:** Nothing
**State set:** FLOW_EBLOCKWATCH_INFO
**Next steps from this screen:**

| Reply | Goes to |
|---|---|
| 1 | Membership Options info screen |
| 2 | Update Profile menu |
| 3 | Cyber Chaperone menu |
| 4 | eblockshop (coming soon) |
| 0 | Main Menu |

> **Relationship note:** This is Andre's story told in his voice. It is not a product pitch. It is a trust transfer. Every word earns permission for the next step.

---

## LAYER 3 — MEMBERSHIP OPTIONS (INFO)

```
Member replies:  2  (from Main Menu)
  OR
Member replies:  1  (from What is eblockwatch? sub-menu)
```

**Member receives:**
```
[Name], here are your eblockwatch membership options.

1. Entry Level — your starting point in eblockwatch
2. Single Membership — R150/month
3. Family Membership — R250/month

The stronger your membership, the stronger your support layer.

Reply 3 to activate your membership.
Reply 0 for Main Menu.
```

**Operator receives:** Nothing
**State set:** FLOW_MAIN_MENU (unchanged — this is informational only)
**Next step:** Member replies 3 to activate, or 0 for Main Menu

> **Money moment:** This is the commercial display. Entry Level gets them in the door. Single and Family are the revenue tiers. The line "The stronger your membership, the stronger your support layer" is the value proposition in one sentence.

---

## LAYER 4 — ACTIVATE MEMBERSHIP

```
Member replies:  3  (from Main Menu)
```

**Member receives:**
```
[Name], let's get your membership activated.

1. Entry Level — free
2. Single Membership — R150/month
3. Family Membership — R250/month

Reply with the number of your choice.
Reply 0 for Main Menu.
```

**Operator receives:** Nothing
**State set:** FLOW_MEMBERSHIP

---

### 4A — Entry Level Selected

```
Member replies:  1  (from Activate Membership)
```

**Member receives:**
```
[Name], you are registered at Entry Level — your starting point in eblockwatch.

Your profile is active. When you are ready to upgrade, reply 3 from the Main Menu.

Reply 0 for Main Menu.
```

**Operator receives:**
```
CYBER CHAPERONE — ENTRY LEVEL SELECTED
Member: [Name]
Known member: YES / NO
Next action: Confirm entry level registration in member profile.
```

**State set:** FLOW_MAIN_MENU (flow closes)

> **Money moment:** Entry Level is the acquisition step. No payment required. The member is now inside the network. The upgrade path is immediately planted: "reply 3 when you are ready."

---

### 4B — Single Membership Selected

```
Member replies:  2  (from Activate Membership)
```

**Member receives:**
```
[Name], to finalise your Single Membership, please use this secure link:

https://paystack.shop/pay/cyber-chaperone

Once complete, reply:

1. I have finalised my membership
2. I need help

Reply 0 for Main Menu.
```

**Operator receives:** Nothing at this point (mirror fires on confirmation)
**State set:** FLOW_MEMBERSHIP + STEP_WAITING_FOR_PAYMENT_CONFIRMATION + pendingTripData.reason = "Single Membership"

> **Money moment:** R150/month. The Paystack link is the transaction. The follow-up "reply 1 / reply 2" closes the loop — the system knows when the payment is done.

---

### 4C — Family Membership Selected

```
Member replies:  3  (from Activate Membership)
```

**Member receives:**
```
[Name], to finalise your Family Membership, please use this secure link:

https://paystack.shop/pay/family-cyber-chaperone

Once complete, reply:

1. I have finalised my membership
2. I need help

Reply 0 for Main Menu.
```

**State set:** FLOW_MEMBERSHIP + STEP_WAITING_FOR_PAYMENT_CONFIRMATION + pendingTripData.reason = "Family Membership"

> **Money moment:** R250/month. Covers the whole family. Highest-value standard tier.

---

### 4D — Payment Finalised (reply 1)

```
Member replies:  1  (after payment link — STEP_WAITING_FOR_PAYMENT_CONFIRMATION)
```

**Member receives:**
```
Thank you, [Name]. We will check your membership confirmation and update your profile.

Reply 0 for Main Menu.
```

**Operator receives:**
```
CYBER CHAPERONE — MEMBERSHIP PAYMENT CLAIMED
Member: [Name]
Known member: YES / NO
Tier: [Single / Family Membership]
Next action: Verify Paystack payment and update membershipTier in database.
```

**State set:** FLOW_MAIN_MENU (flow closes)

> **Operator action required:** Verify the Paystack payment manually and update the member's `membershipTier` field in the database. This triggers the "You're on a [tier]" status line on the member's next Main Menu.

---

### 4E — Needs Help with Payment (reply 2)

```
Member replies:  2  (after payment link — STEP_WAITING_FOR_PAYMENT_CONFIRMATION)
```

**Member receives:**
```
A human from eblockwatch will contact you shortly.

If this is urgent, reply 10.

Reply 0 for Main Menu.
```

**Operator receives:**
```
CYBER CHAPERONE — MEMBERSHIP HELP REQUEST
Member: [Name]
Known member: YES / NO
Tier attempted: [Single / Family Membership]
Next action: Member needs help with membership activation.
```

**State set:** FLOW_MAIN_MENU (flow closes)

---

## LAYER 5 — UPDATE PROFILE

```
Member replies:  4  (from Main Menu)
  OR
Member replies:  2  (from What is eblockwatch? sub-menu)
```

**Member receives:**
```
[Name], your profile helps the Situation Room support you properly.

What would you like to update?

1. My personal details
2. My home location
3. My vehicle details
4. My ICE contact
5. My family members
6. My local network / conduit details

Reply 0 for Main Menu.
```

**Operator receives:** Nothing
**State set:** FLOW_PROFILE_UPDATE

---

### 5A — ICE Contact (option 4)

```
Member replies:  4  (from Update Profile)
```

**Member receives:**
```
[Name], please send your ICE contact like this:

ICE: Full Name, 0821234567

Your ICE contact is only contacted when escalation rules are met.

Reply 0 for Main Menu.
```

**State set:** FLOW_PROFILE_UPDATE + STEP_WAITING_FOR_ICE

---

### 5B — ICE Contact Received

```
Member sends:  ICE: Jane Smith, 0821234567
```

**Member receives:**
```
[Name], your ICE contact has been updated.

Name: Jane Smith
Number: 0821234567

Your ICE contact is only contacted when escalation rules are met.

Reply 0 for Main Menu.
```

**Operator receives:**
```
PROFILE UPDATE — ICE CONTACT
Member: [Name]
Known member: YES / NO
ICE name: Jane Smith
ICE phone: 0821234567
```

**State set:** FLOW_MAIN_MENU (flow closes)

> **Safety moment:** The ICE contact is the human escalation anchor. When the member cannot be reached, this person is contacted. The system tells them clearly: only when escalation rules are met. Not on every trip.

---

## LAYER 6 — CYBER CHAPERONE MENU

```
Member replies:  5  (from Main Menu)
  OR sends:  cyber chaperone / travel / start trip
  OR replies:  3  (from What is eblockwatch? sub-menu)
```

**Member receives:**
```
[Name], Cyber Chaperone is your travel support link into eblockwatch.

What do you want to do?

1. Start a new trip
2. Update my current trip
3. Change my destination
4. I have arrived
5. I need help
6. How Cyber Chaperone works
7. Speak to Andre

Reply 0 for Main Menu.
```

**Operator receives:** Nothing
**State set:** FLOW_CYBER_CHAPERONE

> **Soul of the system:** Cyber Chaperone is the active safety layer. Every option on this menu is a real action with a real consequence in the Situation Room.

---

## LAYER 7 — TRIP FLOW (the operational core)

### 7A — Start New Trip

```
Member replies:  1  (from CC menu)
```

**Member receives:**
```
[Name], let's start your trip.

Please send your current location pin 📍.

Reply 0 for Main Menu.
```

**State set:** FLOW_TRIP_FLOW + STEP_WAITING_FOR_START_LOCATION

---

### 7B — Location Pin Received

```
Member sends:  Location pin (or text address)
```

**Member receives:**
```
Got it — I have your starting location.

Where are you heading to?

Reply 0 for Main Menu.
```

**State set:** FLOW_TRIP_FLOW + STEP_WAITING_FOR_DESTINATION + pendingTripData.startLocation saved

---

### 7C — Destination Received

```
Member sends:  Durban / Oyster Box / Home / [any destination text]
```

**Member receives:**
```
Got it — your destination is [Destination].

Please send your ETA.

Example:
ETA 23:30

Reply 0 for Main Menu.
```

**State set:** FLOW_TRIP_FLOW + STEP_WAITING_FOR_ETA + pendingTripData.destination saved

---

### 7D — ETA Received — TRIP CREATED ⭐

```
Member sends:  ETA 23:30  (or any time format)
```

**Member receives:**
```
[Name], your Cyber Chaperone trip is active.

Route: [Start] → [Destination]
ETA: [time]
Status: GREEN

For stronger backup, you can also share:

1. Your WhatsApp live location to the Situation Room
2. Your Waze / Google Maps route link
3. Updates if your ETA changes

We are monitoring your journey.

Reply 4 when you arrive.
Reply 5 if you need help.
Reply 0 for Main Menu.
```

**Operator receives:**
```
CYBER CHAPERONE — NEW TRIP

Member: [Name]
Known member: YES / NO
Trip: [Start] → [Destination] ETA [time]
Trip ID: [id]
Status: GREEN

Location layers:
1. Situation Room trip monitor: ACTIVE
2. WhatsApp live location backup: PENDING
3. Waze / Google Maps route link: PENDING

ETA bullseye: [time]
Next action: Monitor route and checkpoint behaviour.
```

**State set:** FLOW reset — trip record created in database
**DB record created:** `trips` table — status GREEN, ETA stored, member name and phone linked

> **Soul moment:** This is where the relationship becomes operational. The Situation Room is now watching. Andre's network is now active. This is what the member paid for.

---

### 7E — Ambiguous Destination (active trip conflict)

```
Member sends:  "I'm going to Umhlanga" while a trip is already open
```

**Member receives:**
```
[Name], I need to confirm what you mean.

You already have an active trip:

[Current Trip Route]

Your message says you are going to:

[Detected Destination]

What must I do?

1. Start a new trip
2. Change my current destination
3. Add this as a note only
4. Ignore this message

Reply 0 for Main Menu.
```

**Operator receives:**
```
CYBER CHAPERONE — CLARIFICATION NEEDED
Member: [Name]
Known member: YES / NO
Current trip: [title] (ID: [id])
Message: "[excerpt]"
Reason: possible new destination or trip change
Status: AMBER
Next action: wait for member clarification
```

**State set:** FLOW_CLARIFICATION + trip status set to AMBER
**DB update:** Trip status → AMBER

---

## LAYER 8 — IN-TRIP MONITORING (the watch)

### 8A — ETA Drift Check-in (automated — sent by the system)

```
System detects:  ETA has passed, or checkpoint reached, and no update received
```

**Member receives:**
```
[Name], Cyber Chaperone check-in.

Your ETA appears to have shifted — [X] minutes past expected arrival.
 — OR —
Route checkpoint — [location].

Trip: [Start] → [Destination]

Please reply:

1. I am okay
2. I am delayed
3. My ETA changed
4. I have stopped
5. I need help
6. I will send my location pin

Reply 0 for Main Menu.
```

**Operator receives:** Nothing at check-in prompt send time
**State set:** FLOW_CHECKIN + pendingTripData.clarificationActiveTripId

> **Watch moment:** The system is now actively looking for the member. If they do not reply, escalation follows.

---

### 8B — Member okay (reply 1)

```
Member replies:  1  (from check-in)
```

**Member receives:**
```
✅ Check-in confirmed. We are still monitoring your trip.

Reply 0 for Main Menu.
```

**Operator receives:**
```
CYBER CHAPERONE — CHECK-IN CONFIRMED
Member: [Name]
Trip: [title] (ID: [id])
Status: GREEN
Member: I am okay.
```

**DB update:** Trip status → GREEN, lastMemberCheckinTime updated

---

### 8C — Member delayed or ETA changed (reply 2 or 3)

```
Member replies:  2  or  3  (from check-in)
```

**Member receives:**
```
Understood — you are delayed / your ETA has changed.

Please send your new ETA.

Example:
ETA 23:30

Reply 0 for Main Menu.
```

**State set:** FLOW_CHECKIN + STEP_WAITING_FOR_NEW_ETA

---

### 8D — New ETA received

```
Member sends:  ETA 00:15  (or any time)
```

**Member receives:**
```
✅ ETA updated to [new ETA]. We will continue monitoring your trip.

Reply 0 for Main Menu.
```

**Operator receives:**
```
CYBER CHAPERONE — ETA UPDATED
Member: [Name]
Trip: [title] (ID: [id])
New ETA: [time]
Status: GREEN
```

**DB update:** originalMemberEta updated, status → GREEN, etaDriftMinutes → 0

---

### 8E — Member stopped (reply 4)

```
Member replies:  4  (from check-in)
```

**Member receives:**
```
Understood. We have noted that you have stopped and will monitor closely.

If you move again, send your location pin 📍 or a message.

Reply 0 for Main Menu.
```

**Operator receives:**
```
CYBER CHAPERONE — AMBER (MEMBER STOPPED)
Member: [Name]
Trip: [title] (ID: [id])
Status: ⚠️ AMBER
Member: I have stopped.
Next action: Monitor. Await next update.
```

**DB update:** Trip status → AMBER

---

## LAYER 9 — ARRIVAL

```
Member replies:  4  (from CC menu)
  OR sends:  arrived / arrived safely / home safe / I have arrived / reached / at destination
```

**Member receives:**
```
[Name], confirmed.

Your trip has been closed as arrived safely.

Status: COMPLETED

Reply 0 for Main Menu.
```

**Operator receives:**
```
CYBER CHAPERONE — TRIP CLOSED
Member: [Name]
Known member: YES / NO
Trip: [title] (ID: [id])
Status: COMPLETED
Arrival: "[member's message]"
```

**DB update:** Trip status → COMPLETED
**State set:** FLOW reset

> **Completion moment:** The loop closes. The member is safe. The relationship is reinforced — they were watched over, and they arrived.

---

## LAYER 10 — HELP / RED (the critical layer)

```
Member sends:  help / sos / danger / hijack / accident / emergency / urgent / call me
  OR replies:  5  (from CC menu)
  OR replies:  5  (from check-in)
  OR replies:  10  (from anywhere)
```

**Member receives:**
```
[Name], I have marked this for immediate human review.

The Situation Room has been notified.

Please reply with one number:

1. I am in danger
2. I have broken down
3. I am lost
4. Medical issue
5. Call me

Reply 0 for Main Menu.
```

**Operator receives:**
```
🚨 CYBER CHAPERONE — RED

Member: [Name]
Known member: YES / NO
Trip: [title] (ID: [id]) / No active trip
Distress message: "[excerpt]"
Status: RED
Next action: Immediate human review required.
```

**DB update:** Trip status → RED (if trip exists)
**State set:** FLOW reset — distress takes priority over all other state

> **Critical moment:** Everything stops. The Situation Room is notified immediately. Andre's network is activated. This is the moment the member trusted the system for.

---

## LAYER 11 — ICE CONTACT ESCALATION (not yet automated)

**Trigger:** Operator decides escalation rules are met

**ICE contact receives:**
```
Hi [ICE Name], this is Cyber Chaperone from eblockwatch.

You are listed as [Member Name]'s ICE contact.

We are monitoring their trip:
[Origin] → [Destination].

We have not received the expected check-in.

Please try to contact [Member Name] and reply:

1. I reached them — they are okay
2. I reached them — they need help
3. I could not reach them
4. Please ask the Situation Room to call me
```

**Rules:**
- No "Reply 0 for Main Menu" — ICE is not in the member menu flow
- ICE is not told the member's phone number — contact is mediated
- ICE is not given the full trip history — need-to-know only
- ICE is not given dashboard access

> **Escalation moment:** The human network is activated. This is what eblockwatch is — real people looking after real people.

---

## LAYER 12 — LOCAL CONDUIT DISPATCH (manual — operator action only)

**Trigger:** Operator sends manually when a local responder is needed

**Conduit receives:**
```
Cyber Chaperone request from the eblockwatch Situation Room.

A member may need assistance near [area/location].

Status: [AMBER / RED]

Are you able to assist or help mobilise trusted local support?

Reply:
1. I can assist directly
2. I can alert my local safety network
3. I can contact a trusted responder
4. I cannot assist now
5. Please ask the Situation Room to call me
```

**Rules:**
- No "Reply 0 for Main Menu"
- No member name, phone number, or private details
- No exact home address
- No dashboard link
- Location / area only

> **Network moment:** Andre's 25-year network becomes operational. A trusted local person is activated. This is the ground layer of eblockwatch that no app can replicate.

---

## COMMERCIAL FLOW SUMMARY

```
First contact
    ↓
Main Menu
    ↓
What is eblockwatch? (trust transfer — Andre's story)
    ↓
Membership Options (commercial display)
    ↓
Activate Membership
    ├── Entry Level (free — acquisition)   → profile active → upgrade path planted
    ├── Single R150/month (revenue)         → Paystack → confirmation → tier updated
    └── Family R250/month (revenue)         → Paystack → confirmation → tier updated
    ↓
Update Profile
    └── ICE contact (safety anchor)
    ↓
Cyber Chaperone (safety service — the reason they stay)
    ├── Trip active → monitored → arrived (loop closes safely)
    └── Trip active → distress → RED → operator → ICE → conduit (escalation chain)
```

---

## STATE MACHINE SUMMARY

| Flow constant | What it means | Handler |
|---|---|---|
| FLOW_MAIN_MENU | Member is at / returning to main menu | handleMainMenuChoice |
| FLOW_EBLOCKWATCH_INFO | Member read the eblockwatch story | handleEblockwatchInfoChoice |
| FLOW_MEMBERSHIP | Member is activating membership | handleMembershipChoice |
| FLOW_PROFILE_UPDATE | Member is updating their profile | handleProfileUpdateChoice |
| FLOW_CYBER_CHAPERONE | Member is on the CC menu | handleCCChoice |
| FLOW_TRIP_FLOW | Member is creating a new trip | handleTripFlowStep |
| FLOW_CLARIFICATION | Ambiguous destination — waiting for answer | handleClarificationChoice |
| FLOW_CHECKIN | Member is responding to a check-in | handleCheckinChoice |

| Step constant | What it means |
|---|---|
| STEP_WAITING_FOR_START_LOCATION | Trip flow — need location pin |
| STEP_WAITING_FOR_DESTINATION | Trip flow — need destination |
| STEP_WAITING_FOR_ETA | Trip flow — need ETA |
| STEP_WAITING_FOR_NEW_ETA | Check-in — member said delayed/changed |
| STEP_WAITING_FOR_PAYMENT_CONFIRMATION | Membership — payment link sent |
| STEP_WAITING_FOR_ICE | Profile update — need ICE: Name, Number |

---

## PRIVACY RULES (summary)

| What | Rule |
|---|---|
| Member phone number | Never in operator mirrors or conduit messages |
| Member home address | Never in conduit dispatch |
| Full trip history | Never in conduit dispatch or ICE message |
| Evidence notes | Operator-only — never shown to member, ICE, or conduit |
| Situation Room | Operator-only — no member access |
| ICE contact details | Stored in member profile — only used when escalation rules met |
| "Reply 0 for Main Menu" | Member-facing only — never on operator, ICE, or conduit messages |
