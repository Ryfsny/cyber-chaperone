# eblockwatch Website — Developer Brief v2
**Project:** eblockwatch Cyber Chaperone  
**Site:** www.eblockwatch.co.za (Webflow)  
**Brief date:** 2026-05-10  
**Contact:** Andre Snyman — 082 561 1065 — info@eblockwatch.co.za  
**Status:** READY TO IMPLEMENT — all changes exact copy-in, copy-out  

---

## OVERVIEW

This brief covers 8 changes to the live Webflow site. All changes are listed as exact **CURRENT → NEW** replacements. Do not paraphrase. Do not interpret. Use the exact text provided.

Items marked **DO NOT TOUCH** must not be changed under any circumstances.

---

## CHANGE 1 — Rename the AI bot to "AI Arnie" (2 locations)

The site has two AI-related elements that must both be renamed.

### 1A — Floating widget button (bottom right corner)

**Current text on button:**
> Call eblockwatch AI

**New text:**
> Chat with AI Arnie

The ElevenLabs widget itself (agent ID `agent_3601k3tpgg6vfr98bwftkga19xyj`) stays connected. Only the label on the floating button changes.

---

### 1B — Inline AI section on the page

**Current heading:**
> Ask Cyber Chaperone

**New heading:**
> Ask AI Arnie

**Current sub-text below heading:**
> Your personal safety guide

**New sub-text:**
> Your eblockwatch safety companion

---

## CHANGE 2 — Hero section sub-headline

**Current:**
> Cyber Chaperone provides real-time crisis management and monitoring.

**New:**
> Cyber Chaperone gives you real-time safety monitoring and a trusted network — so someone always knows you're okay.

---

## CHANGE 3 — Red callout box

**Current heading:**
> Who you gonna call…Call us!

**New heading:**
> Who's watching over you? We are.

**Current body text:**
> Because when you're in trouble, the right people need to know fast.

**New body text:**
> The right people, always in the loop — before trouble finds you.

*(Keep the exact same red/orange background and bold styling. Text only.)*

---

## CHANGE 4 — "Your Personal Travel Safety Companion" section body

**Current:**
> Traveling entails risks like kidnapping, delays, breakdowns, and accidents, while many current solutions are unreliable, invasive, or overly complex. Cyber Chaperone has solved this problem.

**New:**
> Whether it's an unexpected detour, a breakdown, or simply running late — someone who cares should always know where you are. Cyber Chaperone is that someone. Simple, private, and always on your side.

---

## CHANGE 5 — Registration form plan names (dropdown)

The membership dropdown currently shows outdated plan names. Replace all three option labels exactly:

| Current label | New label |
|---|---|
| Free Plan | Entry Level |
| Individual Premium Plan | Single Membership — R150/month |
| Family Premium Plan | Family Membership — R250/month |

The underlying form field `value` attributes should also be updated to match:
- `value="Entry Level"`
- `value="Single Membership"`
- `value="Family Membership"`

---

## CHANGE 6 — Add WhatsApp CTA button in hero section

Add a second button directly below the existing "Register for Free" green button in the hero section.

**Button text:**
> Chat to AI Arnie on WhatsApp

**Button link:**
> https://wa.me/27825611065

**Button style:** Match the existing green "Register for Free" button exactly (same colour, same font, same padding). Place it directly below, not beside.

---

## CHANGE 7 — Footer copy and contact email

### 7A — Footer description text

**Current:**
> Cyber Chaperone provides real-time crisis management and monitoring for free to all eblockwatch members.

**New:**
> eblockwatch Cyber Chaperone gives you real-time travel safety monitoring and a trusted community network. Free for all members. South Africa's safety companion since 2001.

### 7B — Footer contact email

**Current:**
> ryfsny@yebo.co.za

**New:**
> info@eblockwatch.co.za

---

## CHANGE 8 — Meta / SEO / Open Graph fields

Update in: Page Settings → SEO Title, Meta Description, and Open Graph fields.

**SEO Title — Current:**
> eBlockwatch - Cyber Chaperone

**SEO Title — New:**
> eblockwatch Cyber Chaperone — Travel Safety Monitoring. Free for All Members.

**Meta Description — Current:**
> Cyber Chaperone provides real-time crisis management and monitoring for free to all eblockwatch members.

**Meta Description — New:**
> eblockwatch Cyber Chaperone gives you real-time travel safety monitoring and a trusted community network. Free for all members. South Africa's safety companion since 2001.

**Open Graph Title — Current:**
> eBlockwatch - Cyber Chaperone

**Open Graph Title — New:**
> eblockwatch Cyber Chaperone — Travel Safety Monitoring

**Open Graph Description:** same as Meta Description above.

---

## CHANGE 9 — Connect registration form to Situation Room backend (webhook)

When a visitor submits the registration form (`eblock-Register-Form`), the data must be sent to the Cyber Chaperone Situation Room API so the member is immediately added to the member database.

**Method:** Add a JavaScript `fetch` call on form submit (Webflow custom code or form submission event).

**Endpoint:**
```
POST https://cyber-chaperone-r--ryfsny.replit.app/api/register
```

**Headers:**
```
Content-Type: application/json
X-Register-Key: [Andre will provide this key — ask before publishing]
```

**Payload — map form fields as follows:**

| Form field name | JSON key |
|---|---|
| First-Name | first_name |
| Last-Name | last_name |
| Mobile-Number | whatsapp_number |
| Email-Address | email |
| membership_type | membership_type |
| Security-Provider | security_provider |
| Fire-Reaction-Service | fire_reaction_service |
| Car-Tracker-Provider | car_track_provider |
| Province | province |
| Select-your-Industry | industry |

**Additional fixed fields to include in every submission:**
```json
{
  "source": "website_registration",
  "source_batch": "website_live"
}
```

**On success (HTTP 200/201):** Do nothing additional — the existing "THANK YOU" confirmation message already displays.

**On error:** Log to console only. Do not show an error to the user — the form submission already succeeded on the Webflow side.

**Important:** The mobile number field currently has `Maxlength="10"` — remove this cap so +27 international numbers (12 digits) are accepted.

---

## DO NOT CHANGE

The following must not be touched:

- The eblockwatch logo
- Site colours and overall layout
- Paystack payment links:
  - https://paystack.shop/pay/cyber-chaperone
  - https://paystack.shop/pay/family-cyber-chaperone
- The ElevenLabs AI widget itself (agent ID `agent_3601k3tpgg6vfr98bwftkga19xyj`) — only rename the label
- The Facebook link: https://www.facebook.com/eblockwatchnational/reviews
- "Advocate for Community Safety Since 2001" badge
- Andre Snyman's phone number: 082 561 1065
- All testimonials and customer quotes
- Terms and Conditions link
- Copyright notice
- FAQ content

---

## DELIVERY REQUEST

Please reply with:

1. Estimated completion date
2. Confirmation of which method you will use for the form webhook (Webflow native webhook or custom JS fetch on submit)
3. Confirmation that the `X-Register-Key` API key has been received from Andre before go-live

**Contact:** Andre Snyman — 082 561 1065 — info@eblockwatch.co.za
