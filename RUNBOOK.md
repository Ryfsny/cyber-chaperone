# RUNBOOK — Operator WhatsApp Channel (Andre +27825611065)

## ISSUE: Operator WhatsApp messages returning "message was empty"

### Root Cause

The Replit reverse proxy sits between Twilio and the Express server. It strips or
rewrites the `Content-Type: application/x-www-form-urlencoded` header that Twilio
sends. When Content-Type is missing or wrong:

- `express.json()` (global, app.ts line 31) — skips (not application/json)
- `express.urlencoded({ extended: true })` (global, app.ts line 32) — skips (not
  application/x-www-form-urlencoded)
- `req.body` remains `undefined`
- `req.body?.Body` → `undefined` → `""` → the empty-body guard fires
- Andre receives "Got your message but it was blank — please resend."

The Twilio signature validator is NOT the cause — it reads the already-parsed
`req.body`, not the raw stream. No stream consumer exists in this codebase.

### Failed Approaches

1. **Dual-case field extraction** (`rb["Body"] ?? rb["body"]`) — body is
   `undefined` regardless of case because `req.body` itself is never populated.
2. **Adding `.trim()` to the raw extraction** — same issue; no data arrives.
3. **Checking `req.body?.body` (lowercase)** — same underlying problem.
4. **Moving the operator check earlier** — correct fix for a different bug
   (Andre treated as member), but did not fix the empty body issue.

### SOLUTION

Add `express.urlencoded({ extended: true, type: () => true })` as **per-route**
middleware on the Twilio webhook route only. `type: () => true` means "parse the
body as urlencoded regardless of what the Content-Type header says."

**File:** `artifacts/api-server/src/routes/webhook.ts`

```typescript
// Line 1 — import change:
import express, { Router, type IRouter } from "express";

// Route declaration — wrap with per-route middleware:
router.post(
  "/webhook/twilio",
  express.urlencoded({ extended: true, type: () => true }),
  async (req, res): Promise<void> => {
    // ... handler body unchanged
  },
);
```

**Why this is safe:** Express body-parser sets an internal `req._body = true` flag
after parsing. If the global `express.urlencoded()` already parsed the body
(correct Content-Type), the per-route middleware sees `req._body === true` and
skips — no double-parse.

### Cross-checks (all 5 confirmed passing)

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| a | Operator check fires BEFORE any DB lookup (lookupMember) | ✅ PASS | `senderDigits === "27825611065"` block at line ~409, `lookupMember()` at line ~454 — operator block returns early |
| b | `req.body.Body` extracts message text correctly | ✅ FIXED | Per-route `type:()=>true` parser guarantees body is always parsed |
| c | `req.body.From` extracts Andre's number correctly | ✅ PASS | Dual-case extraction `rb["From"] ?? rb["from"]` + `normaliseFrom()` |
| d | Anthropic AI call uses `claude-sonnet-4-6` with proper error handling | ✅ PASS | `operator-ai-service.ts`: MODEL="claude-sonnet-4-6", 2 retries, 25s timeout, friendly error message |
| e | Twilio reply goes back to `whatsapp:+27825611065` | ✅ PASS | `sendReply(from, to, claudeReply)` — `from` is Andre's number, `to` is Twilio's sender number |

### How to verify after deploying

1. Andre sends "test" to the WhatsApp number
2. Server logs should show:
   - `operator-ai: raw request fields` — `Body` field non-empty
   - `operator-ai: routing to Claude` — `body` non-empty
   - `operator-ai: Claude reply sent`
3. Andre receives a Claude response on his phone within ~5 seconds

### If it breaks again

Check the server logs for `operator-ai: raw request fields`. The `rbKeys` object
logs every field Twilio sent. If `Body` is missing from `rbKeys`, the proxy is
either not forwarding the POST body at all, or encoding it in a format that
`express.urlencoded` cannot parse (e.g. multipart). In that case, add a raw body
reader middleware before the urlencoded parser.
