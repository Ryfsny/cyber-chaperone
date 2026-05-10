# eblockwatch.co.za — Website Developer Brief
**From:** Andre Snyman, eblockwatch  
**Date:** May 2026  
**Website platform:** Webflow  
**Priority:** Pre-launch — please complete before end of May 2026

---

## OUR PHILOSOPHY (please read before making any changes)

> *"We are not selling fear. We are selling safety.*  
> *We are not a panic button. We are a community of people who care.*  
> *Every word on this website must reflect empowerment, confidence, and belonging — not alarm."*

Every copy change below is guided by this. When in doubt, choose the warmer, more empowering word.

---

## CHANGE 1 — Wire the registration form to our backend system (CRITICAL)

**The problem:** The registration form currently collects member details but sends them nowhere. People register and disappear — we never see them in our system.

**The fix:** When the form is submitted successfully, POST the data to our API:

```
URL:    https://cyber-chaperone-r--ryfsny.replit.app/api/register
Method: POST
Header: X-API-Key: [Andre will supply this key separately]
Content-Type: application/json
```

**Field mapping (website form field → API field name):**

| Webflow form field | API field name |
|--------------------|----------------|
| First Name | `first_name` |
| Last Name | `last_name` |
| Mobile Number | `whatsapp_number` |
| Email Address | `email` |
| Street Address | `home_address` |
| Suburb | `suburb` |
| City | `city` |
| Province | `province` |
| membership_type | `membership_tier` |
| Select your Industry | `industry` |

**Implementation note:** This can be done via a Webflow form webhook (Settings → Integrations → Webhooks) or a small JavaScript fetch on form submit. Please confirm which approach you prefer.

**On success:** The existing "Thank You" message and Paystack payment links should still display as they do today.

---

## CHANGE 2 — Update membership plan names

Please update the dropdown options in the registration form to match our payment pages exactly:

| Current name | New name |
|---|---|
| Free Plan | Entry Level — Free |
| Individual Premium Plan | Single Membership — R150/month |
| Family Premium Plan | Family Membership — R250/month |

---

## CHANGE 3 — Copy changes (tone corrections)

### Hero section

**Current sub-headline:**  
*"Cyber Chaperone provides real-time crisis management and monitoring."*

**Replace with:**  
*"Cyber Chaperone gives you real-time safety monitoring and a trusted network — so someone always knows you're okay."*

---

### Red callout box ("Who you gonna call")

**Current:**  
*"Who you gonna call…Call us! Because when you're in trouble, the right people need to know fast."*

**Replace with:**  
*"Who's watching over you? We are. The right people, always in the loop — before trouble finds you."*

*(Keep the same red/orange background and bold styling — just update the text.)*

---

### "Your Personal Travel Safety Companion" section

**Current body copy:**  
*"Traveling entails risks like kidnapping, delays, breakdowns, and accidents, while many current solutions are unreliable, invasive, or overly complex. Cyber Chaperone has solved this problem."*

**Replace with:**  
*"Whether it's an unexpected detour, a breakdown, or simply running late — someone who cares should always know where you are. Cyber Chaperone is that someone. Simple, private, and always on your side."*

---

### Any other instances of "crisis management"

**Replace with:** "safety monitoring"

### Any other instances of "when you're in trouble" or fear-first language

**Replace with:** empowerment language — "stay connected", "travel with confidence", "someone always knows you're safe"

---

## CHANGE 4 — Add a WhatsApp CTA button

Add a WhatsApp button in the hero section, below the existing "Register for Free" button:

```
Button text:  Chat to AI Arnie on WhatsApp
Button link:  https://wa.me/27825611065
Button style: Match the green "Register for Free" button styling
```

This is the direct entry point into our WhatsApp safety system.

---

## CHANGE 5 — Update footer contact email

**Current:** `ryfsny@yebo.co.za`  
**Replace with:** `info@eblockwatch.co.za`  
*(Andre will confirm exact address once the mailbox is live — please hold this change until confirmed.)*

---

## CHANGE 6 — Meta/SEO description update

**Current:**  
*"Cyber Chaperone provides real-time crisis management and monitoring for free to all eblockwatch members."*

**Replace with:**  
*"eblockwatch Cyber Chaperone gives you real-time travel safety monitoring and a trusted community network. Free for all members. South Africa's safety companion since 2001."*

Update in: Page Settings → SEO title/description, and in the Open Graph fields.

---

## DO NOT CHANGE

- The logo, colours, or overall layout
- The Paystack payment links (they are already correct)
- The ElevenLabs AI chat widget (bottom right corner)
- The Facebook social link
- The "Advocate for Community Safety Since 2001" badge
- The Terms and Conditions link

---

## QUESTIONS / DELIVERY

Please reply with:
1. Estimated completion date
2. Confirmation of which form webhook method you'll use (Webflow native webhook or JS fetch)
3. Any sections of the site not covered above that you think need a tone review

**Contact:** Andre Snyman — 082 561 1065 — `info@eblockwatch.co.za`
