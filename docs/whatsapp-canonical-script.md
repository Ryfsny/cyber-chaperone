# eblockwatch WhatsApp Canonical Script
## AI Arnie / Cyber Chaperone — Authorised Message Reference

**Version:** May 2026  
**Status:** Canonical reference — do not override without operator sign-off  
**Owner:** Andre Snyman / eblockwatch  
**Source:** Ruka/SmartChat build spec + current Replit evolved system + operator correction  

---

## RULE ZERO

Every WhatsApp screen must have a next action.  
No dead ends.  
Every message that ends a flow must include **Reply 0 for Main Menu** — except where listed in Section 11.

---

## 1. Main Menu

**Trigger:** `Hi` / `Hello` / `Menu` / `Main Menu` / `Start` / `0` / `Join`  
**Handler:** GLOBAL_MENU_OVERRIDE — runs before all other handlers.

```
Hi [Name], I'm AI Arnie, Andre Snyman's digital wingman.

[membership status line]

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

**Membership status line logic:**
- If `membershipTier` is set: `You're on a [tier].`
- If `memberStatus` is `pending`: `Your eblockwatch membership is being confirmed.`
- Otherwise: `Your eblockwatch membership status is not confirmed yet.`

**Correction note:** Use **URGENT**, not EMERGENCY.  
eblockwatch is not an emergency service.

---

## 2. What is eblockwatch?

**Trigger:** `1` from main menu

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

---

## 3. Membership Options

**Trigger:** `2` from main menu

```
[Name], here are your eblockwatch membership options.

1. Entry Level — your starting point in eblockwatch
2. Single Membership — R150/month
3. Family Membership — R250/month

The stronger your membership, the stronger your support layer.

Reply 3 to activate your membership.
Reply 0 for Main Menu.
```

---

## 4. Activate Membership

**Trigger:** `3` from main menu

```
[Name], let's get your membership activated.

1. Entry Level — free
2. Single Membership — R150/month
3. Family Membership — R250/month

Reply with the number of your choice.
Reply 0 for Main Menu.
```

### 4a. Single Membership selected

```
[Name], to finalise your Single Membership, please use this secure link:

https://paystack.shop/pay/cyber-chaperone

Once complete, reply:

1. I have finalised my membership
2. I need help

Reply 0 for Main Menu.
```

### 4b. Family Membership selected

```
[Name], to finalise your Family Membership, please use this secure link:

https://paystack.shop/pay/family-cyber-chaperone

Once complete, reply:

1. I have finalised my membership
2. I need help

Reply 0 for Main Menu.
```

### 4c. Already finalised

```
Thank you, [Name]. We will check your membership confirmation and update your profile.

Reply 0 for Main Menu.
```

### 4d. Needs human help

```
A human from eblockwatch will contact you shortly.

If this is urgent, reply 10.

Reply 0 for Main Menu.
```

**Word rule:** Use **finalise** or **confirm** — not "pay" as the action word.

---

## 5. Update Profile

**Trigger:** `4` from main menu

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

### 5a. ICE contact prompt

```
[Name], please send your ICE contact like this:

ICE: Full Name, 0821234567

Your ICE contact is only contacted when escalation rules are met.

Reply 0 for Main Menu.
```

---

## 6. Cyber Chaperone Menu

**Trigger:** `5` from main menu / `cyber chaperone` / `travel` / `start trip` keywords

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

### 6a. Start Trip — ask for location

```
[Name], let's start your trip.

Please send your current location pin 📍.

Reply 0 for Main Menu.
```

### 6b. Location pin received — ask for destination

```
Got it — I have your starting location.

Where are you heading to?

Reply 0 for Main Menu.
```

### 6c. Destination received — ask for ETA

```
Got it — your destination is [destination].

Please send your ETA.

Example:
ETA 23:30

Reply 0 for Main Menu.
```

### 6d. Trip started (ETA received)

```
[Name], your Cyber Chaperone trip is active.

Route: [start] → [destination]
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

### 6e. Ambiguous destination (active trip conflict)

```
[Name], I need to confirm what you mean.

You already have an active trip:

[current trip route]

Your message says you are going to:

[new destination]

What must I do?

1. Start a new trip
2. Change my current destination
3. Add this as a note only
4. Ignore this message

Reply 0 for Main Menu.
```

### 6f. Arrived

```
[Name], confirmed.

Your trip has been closed as arrived safely.

Status: COMPLETED

Reply 0 for Main Menu.
```

---

## 7. Check-in / ETA Drift Messages

### 7a. Routine check-in prompt

```
[Name], Cyber Chaperone check-in.

Are you still okay on your route to [destination]?

1. I am okay
2. I am delayed
3. My ETA changed
4. I have stopped
5. I need help
6. I will send my location pin

Reply 0 for Main Menu.
```

### 7b. ETA drift prompt

```
[Name], Cyber Chaperone check-in.

Your ETA appears to have shifted.

According to our route calculation, you should be near:
[checkpoint / area]

Please reply:

1. I am okay
2. I am delayed
3. My ETA changed
4. I have stopped
5. I need help
6. I will send my location pin

Reply 0 for Main Menu.
```

### 7c. ETA updated

```
✅ ETA updated to [new ETA]. We will continue monitoring your trip.

Reply 0 for Main Menu.
```

### 7d. Check-in confirmed okay

```
✅ Check-in confirmed. We are still monitoring your trip.

Reply 0 for Main Menu.
```

### 7e. Member stopped (AMBER)

```
Understood. We have noted that you have stopped and will monitor closely.

If you move again, send your location pin 📍 or a message.

Reply 0 for Main Menu.
```

---

## 8. Help / RED Messages

**Trigger:** `5` from Cyber Chaperone menu / `help` / `sos` / `emergency` / `danger` / `hijack` / `accident` / `urgent` / `call me` / `10` from main menu

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

---

## 9. eblockshop

**Trigger:** `6` from main menu

*(Placeholder — full eblockshop flow to be built.)*

```
[Name], eblockshop is where you find safer products to make you safer.

Coming soon — we will notify you when it is ready.

Reply 0 for Main Menu.
```

---

## 10. Request human contact

**Trigger:** `7` from main menu

```
[Name], a human from eblockwatch will contact you.

If this is urgent, reply 10.

Reply 0 for Main Menu.
```

---

## 11. Situation Room Mirror Messages

These are sent to the operator WhatsApp number. Not sent to members.

### 11a. New Trip

```
CYBER CHAPERONE — NEW TRIP

Member: [Name]
Known member: YES / NO
Trip: [origin] → [destination]
ETA: [time]
Status: GREEN

Location layers:
1. Situation Room trip monitor: ACTIVE
2. WhatsApp live location backup: PENDING
3. Waze / Google Maps route link: PENDING

ETA bullseye: [time]
Next action: Monitor route and checkpoint behaviour.
```

### 11b. Amber

```
CYBER CHAPERONE — AMBER

Member: [Name]
Trip: [origin] → [destination]
Reason: ETA drift / missed check-in / unclear movement
Original ETA: [time]
Current concern: [detail]
Status: AMBER

Next action: Ask member to confirm status.
```

### 11c. RED

```
CYBER CHAPERONE — RED

Member: [Name]
Trip: [origin] → [destination]
Reason: Member requested help / distress / no response after escalation
Status: RED

Next action: Immediate human review required.
```

### 11d. Check-in confirmed

```
CYBER CHAPERONE — CHECK-IN CONFIRMED

Member: [Name]
Trip: [title] (ID: [id])
Status: GREEN
Member: I am okay.
```

### 11e. Member stopped

```
CYBER CHAPERONE — AMBER (MEMBER STOPPED)

Member: [Name]
Trip: [title] (ID: [id])
Status: ⚠️ AMBER
Member: I have stopped.
Next action: Monitor. Await next update.
```

### 11f. ETA updated

```
CYBER CHAPERONE — ETA UPDATED

Member: [Name]
Trip: [title] (ID: [id])
New ETA: [time]
Status: GREEN
```

### 11g. Local Conduit Update

```
CYBER CHAPERONE — LOCAL CONDUIT UPDATE

Trip: [trip title]
Case: [case ID]
Conduit: [conduit name]
Reply: [reply meaning]
Status: [AMBER / RED]

Next action: [operator action required]
```

### 11h. Membership help request

```
CYBER CHAPERONE — MEMBERSHIP HELP REQUEST

Member: [Name]
Known member: YES / NO
Next action: Member needs help with membership activation.
```

---

## 12. ICE Contact Message

**Rule:** ICE contacts do NOT receive all normal trip communications.  
ICE is only contacted when escalation rules are met.

```
Hi [ICE Name], this is Cyber Chaperone from eblockwatch.

You are listed as [Member Name]'s ICE contact.

We are monitoring their trip:
[origin] → [destination].

We have not received the expected check-in.

Please try to contact [Member Name] and reply:

1. I reached them — they are okay
2. I reached them — they need help
3. I could not reach them
4. Please ask the Situation Room to call me
```

---

## 13. Local Conduit Dispatch Message

**Rule:** Must be sent by the Situation Room operator only. Not automatic.

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

**Do NOT include in dispatch message:**
- Member phone number
- Direct WhatsApp link to member
- Full trip history
- Evidence notes
- Private notes
- Exact home address
- Dashboard links

---

## 14. Messages that MUST include "Reply 0 for Main Menu"

Every message in the following flows must end with `Reply 0 for Main Menu.`:

- Main menu itself
- What is eblockwatch?
- Membership options
- Activate membership (all sub-states)
- Update profile (all sub-states)
- Cyber Chaperone menu
- Start trip — all steps (location, destination, ETA)
- Trip active confirmation
- Check-in prompts (routine and ETA drift)
- Check-in responses (okay, delayed, stopped, ETA update)
- Help / RED response
- Arrived confirmation
- eblockshop placeholder
- Human contact request
- ICE contact prompt

---

## 15. Messages that must NOT include "Reply 0 for Main Menu"

- Situation Room mirror messages (operator-only, not member-facing)
- ICE contact escalation messages (ICE is not a member)
- Local conduit dispatch messages (conduit is not a member in this flow)
- Internal system notes / evidence log entries

---

## 16. Privacy Rules

1. The Situation Room is private and operator-controlled only.
2. Members do not access the Situation Room.
3. Responders and local conduits do not access the Situation Room.
4. ICE contacts do not access the Situation Room.
5. No direct member-to-responder communication lane by default.
6. All communication is mediated through the Situation Room unless the operator approves otherwise.
7. Member data (name, number, ICE, home, vehicle, route) must not be exposed in dispatch or conduit messages without operator decision.
8. Local conduit dispatch messages contain location/area only — not member identity or private details.

---

## 17. MOU Alignment Notes

### What eblockwatch owns
- eblockwatch brand
- AI Arnie concept and wording
- Cyber Chaperone concept and operating model
- Situation Room model
- Member relationships and member data
- WhatsApp scripts and menu logic (this document)
- eblockshop positioning
- Commercial funnel
- Local conduit network concept
- Bliksim positioning and confidential capabilities

### What Ruka / SmartChat provides
- WhatsApp communication platform support
- SmartChat / WhatsApp automation where used
- Technical implementation support
- Message routing support
- Ongoing platform assistance where agreed

### Current architecture reality
The current evolved system uses Replit, Twilio, PostgreSQL, OpenStreetMap/OSRM, and other tools in addition to or instead of Ruka / SmartChat.  
Ruka is **not** the exclusive technical backbone of the system unless separately agreed in writing.

### Commercial model
| Tier | Price |
|---|---|
| Entry Level | Free |
| Single Membership | R150/month |
| Family Membership | R250/month |
| Bliksim sales / service | TBC |
| eblockshop products | TBC |

### Confidentiality
The following are confidential:
- Bliksim capabilities
- Situation Room methods and logic
- Member data
- Trip logic
- Local conduit logic
- Commercial flows
- Technical implementation details
- This WhatsApp canonical script

### Build order reference (from alignment report)
- A — Member directory + SA phone normalisation *(members page done)*
- B — Profile completion flow
- C — Paystack webhook confirmation
- D — eblockshop flow
- E — Conduit info-level escalation
- F — Case member visibility controls
- G — Digital Twin / AI Arnie personalisation
- Phase 2 — Member approval screen (pending)
