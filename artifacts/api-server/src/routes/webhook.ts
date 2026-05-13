import { Router, type IRouter } from "express";
import { db, messagesTable, tripsTable, membersTable, caseParticipantsTable, caseLogsTable } from "@workspace/db";
import { and, eq, ne, desc, count } from "drizzle-orm";
import twilio from "twilio";
import { assessRisk } from "./ai.js";
import { handleMenuRouter } from "../menu-router.js";
import { withMenu } from "../message-utils.js";
import { sendOperatorEmail, type EmailCategory } from "../email-service.js";
import { reverseGeocodeStreetAddress } from "../route-service.js";
import { isVoiceNote, downloadTwilioMedia, transcribeVoiceNote } from "../voice-service.js";
import { callOperatorClaude } from "../operator-ai-service.js";

const router: IRouter = Router();

// ── Keyword lists ────────────────────────────────────────────────────────────

const DISTRESS_WORDS = [
  "help", "sos", "emergency", "danger", "accident",
  "hijack", "hijacked", "crash", "police", "ambulance", "urgent",
];

const ARRIVAL_WORDS = [
  "arrived", "arrived safely", "safe", "at destination", "reached", "home safe",
];

const DELAY_WORDS = [
  "delayed", "running late", "traffic", "stopped", "stop", "stuck", "waiting",
];

const ETA_PATTERN = /(?:new\s+)?eta\s+(?:changed\s+to\s+)?(\d{1,2}:\d{2}(?:\s*[aApP][mM])?)/i;

const LOCATION_GUIDANCE_PATTERN =
  /what should i do|send.{0,20}location|send.{0,20}pin|\blocation\b|\bpin\b|where am i|current location/i;

const GOOGLE_MAPS_PATTERN = /maps\.google\.com|google\.com\/maps/i;

type MessageClass = "distress" | "arrival" | "delay" | "eta" | "unknown";

function classifyMessage(text: string): MessageClass {
  const lower = text.toLowerCase();
  if (DISTRESS_WORDS.some((w) => lower.includes(w))) return "distress";
  if (ARRIVAL_WORDS.some((w) => lower.includes(w))) return "arrival";
  if (DELAY_WORDS.some((w) => lower.includes(w))) return "delay";
  if (ETA_PATTERN.test(text)) return "eta";
  return "unknown";
}

// ── Text normalisation ────────────────────────────────────────────────────────

function normaliseBody(raw: string): string {
  return raw
    .replace(/[\u2012\u2013\u2014\u2015]/g, "-")
    .replace(/[\u2018\u2019\u0060\u00b4]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalise a Twilio WhatsApp number to canonical format: whatsapp:+XXXXXXXXXXX
 * Twilio sometimes sends "whatsapp: 27825611065" (space, no +) instead of "whatsapp:+27825611065".
 */
function normaliseFrom(raw: string): string {
  // Remove any spaces around the colon
  let n = raw.replace(/^whatsapp:\s+/i, "whatsapp:");
  // Ensure the digits part starts with +
  n = n.replace(/^(whatsapp:)(\d)/, "$1+$2");
  return n;
}

// ── Trip-start parser ────────────────────────────────────────────────────────

interface ParsedTripStart {
  startLocation: string;
  destination: string;
  eta: string | null;
}

function parseTripStart(body: string): ParsedTripStart | null {
  const norm = normaliseBody(body);

  const withEta = norm.match(
    /\bleaving\s+(?:from\s+)?(.+?)\s+(?:now\s+)?(?:heading|going)\s+to\s+([^.,]+?)[.,]?\s+eta\s+(\d{1,2}:\d{2}(?:\s*[aApP][mM])?)[.,]?\s*$/i,
  );
  if (withEta) {
    return {
      startLocation: withEta[1].trim(),
      destination: withEta[2].trim(),
      eta: withEta[3].trim(),
    };
  }

  const withoutEta = norm.match(
    /\bleaving\s+(?:from\s+)?(.+?)\s+(?:now\s+)?(?:heading|going)\s+to\s+([^.,\n]+?)[.,]?\s*$/i,
  );
  if (withoutEta) {
    return {
      startLocation: withoutEta[1].trim(),
      destination: withoutEta[2].trim(),
      eta: null,
    };
  }

  return null;
}

// ── Parser self-test ─────────────────────────────────────────────────────────

interface ParserTestCase {
  input: string;
  expectStart: string;
  expectDest: string;
  expectEta: string | null;
}

const PARSER_TEST_CASES: ParserTestCase[] = [
  {
    input: "TEST LIVE — Leaving Fourways now heading to Rosebank Mall. ETA 14:40.",
    expectStart: "Fourways", expectDest: "Rosebank Mall", expectEta: "14:40",
  },
  {
    input: "TEST RED — Leaving Fourways now heading to Sandton City. ETA 15:30.",
    expectStart: "Fourways", expectDest: "Sandton City", expectEta: "15:30",
  },
  {
    input: "Andre test: Leaving Fourways heading to Rosebank Mall ETA 14:40",
    expectStart: "Fourways", expectDest: "Rosebank Mall", expectEta: "14:40",
  },
  {
    input: "Leaving from Fourways going to Rosebank Mall. ETA 14:40.",
    expectStart: "Fourways", expectDest: "Rosebank Mall", expectEta: "14:40",
  },
  {
    input: "Morning Andre, leaving Bryanston now heading to The Oyster Box. ETA 18:10.",
    expectStart: "Bryanston", expectDest: "The Oyster Box", expectEta: "18:10",
  },
];

function runParserSelfTest(): void {
  let passed = 0;
  let failed = 0;
  for (const tc of PARSER_TEST_CASES) {
    const result = parseTripStart(tc.input);
    const ok =
      result !== null &&
      result.startLocation === tc.expectStart &&
      result.destination === tc.expectDest &&
      result.eta === tc.expectEta;
    if (ok) {
      passed++;
    } else {
      failed++;
      console.error(
        `[parser-selftest] FAIL: "${tc.input.slice(0, 60)}" → got ${JSON.stringify(result)} expected start=${tc.expectStart} dest=${tc.expectDest} eta=${tc.expectEta}`,
      );
    }
  }
  console.info(`[parser-selftest] ${passed}/${PARSER_TEST_CASES.length} passed, ${failed} failed`);
}

runParserSelfTest();

// ── Member lookup ─────────────────────────────────────────────────────────────

interface MemberInfo {
  displayName: string;
  role: string | null;
  memberStatus: string;
  membershipTier: string | null;
  isKnown: boolean;
}

/**
 * Pilot-phase hardcoded member list.
 * Used as a fallback when the members table does not yet exist in production.
 * Database lookup always runs first and takes priority.
 * Remove entries here once the members table is populated in production.
 */
const PILOT_MEMBERS: Record<string, MemberInfo> = {
  "whatsapp:+27825611065": {
    displayName: "Andre Snyman",
    role: "Founder / test operator",
    memberStatus: "verified",
    membershipTier: null,
    isKnown: true,
  },
};

async function lookupMember(whatsappNumber: string): Promise<MemberInfo | null> {
  try {
    const [member] = await db
      .select()
      .from(membersTable)
      .where(eq(membersTable.whatsappNumber, whatsappNumber))
      .limit(1);
    if (member) {
      return {
        displayName: member.displayName,
        role: member.role,
        memberStatus: member.memberStatus,
        membershipTier: member.membershipTier ?? null,
        isKnown: member.memberStatus === "verified" || member.memberStatus === "active",
      };
    }
  } catch {
    // Members table may not exist yet in production — fall through to pilot list
  }
  // Fallback: pilot hardcoded list (active until members table is in production)
  return PILOT_MEMBERS[whatsappNumber] ?? null;
}

interface MemberHistory {
  totalMessages: number;
  totalTrips: number;
  lastTripStatus: string | null;
}

async function getMemberHistory(whatsappNumber: string): Promise<MemberHistory> {
  try {
    const [msgRow] = await db
      .select({ total: count() })
      .from(messagesTable)
      .where(eq(messagesTable.fromNumber, whatsappNumber));

    const [tripRow] = await db
      .select({ total: count() })
      .from(tripsTable)
      .where(eq(tripsTable.travelerPhone, whatsappNumber));

    const [lastTrip] = await db
      .select({ status: tripsTable.status })
      .from(tripsTable)
      .where(eq(tripsTable.travelerPhone, whatsappNumber))
      .orderBy(desc(tripsTable.id))
      .limit(1);

    return {
      totalMessages: Number(msgRow?.total ?? 0),
      totalTrips: Number(tripRow?.total ?? 0),
      lastTripStatus: lastTrip?.status ?? null,
    };
  } catch {
    return { totalMessages: 0, totalTrips: 0, lastTripStatus: null };
  }
}

// ── Active trip lookup ────────────────────────────────────────────────────────

async function findActiveTrip(phone: string) {
  const [trip] = await db
    .select()
    .from(tripsTable)
    .where(and(eq(tripsTable.travelerPhone, phone), ne(tripsTable.status, "completed")))
    .orderBy(desc(tripsTable.id))
    .limit(1);
  return trip ?? null;
}

// ── Outbound WhatsApp reply ───────────────────────────────────────────────────

async function sendReply(from: string, to: string, replyBody: string): Promise<void> {
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({ from: to, to: from, body: replyBody });
  } catch (err) {
    // Reply failure must never break the webhook response
  }
}

// ── Operator mirror ───────────────────────────────────────────────────────────

type MirrorKind = "trip-start" | "amber" | "red" | "arrival" | "eta" | "location" | "unknown";

function mirrorEnabled(kind: MirrorKind): boolean {
  const operatorNumber = process.env.OPERATOR_WHATSAPP_NUMBER;
  const mode = (process.env.OPERATOR_MIRROR_MODE ?? "off").toLowerCase();
  if (!operatorNumber || mode === "off") return false;
  if (mode === "all") return true;
  if (mode === "critical") return kind === "amber" || kind === "red" || kind === "location" || kind === "unknown";
  return false;
}

async function sendOperatorMirror(
  twilioNumber: string,
  mirrorBody: string,
  kind: MirrorKind,
  emailCategory?: EmailCategory,
): Promise<void> {
  // Email — always fire if category provided, regardless of WhatsApp mirror mode
  if (emailCategory) {
    const firstLine = mirrorBody.split("\n")[0] ?? "Update";
    void sendOperatorEmail(emailCategory, firstLine, mirrorBody);
  }

  const operatorNumber = process.env.OPERATOR_WHATSAPP_NUMBER;
  if (!operatorNumber || !mirrorEnabled(kind)) return;
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({ from: twilioNumber, to: operatorNumber, body: mirrorBody });
  } catch (err) {
    console.error("[operator-mirror] Failed to send mirror notification:", err);
  }
}

// ── Structured evidence note helpers ─────────────────────────────────────────

function nowUtc(): string {
  return new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

function excerpt(body: string, maxLen = 80): string {
  const clean = body.replace(/\s+/g, " ").trim();
  return clean.length > maxLen ? clean.slice(0, maxLen) + "…" : clean;
}

function appendNote(existing: string | null | undefined, entry: string): string {
  return existing ? `${existing}\n${entry}` : entry;
}

// ── Member identity line for evidence notes ───────────────────────────────────

function memberNoteLine(member: MemberInfo | null, phone: string): string {
  if (member?.isKnown) {
    return `Member: ${member.displayName} (${phone}) — verified`;
  }
  return `Member: Unknown (${phone})`;
}

// ── Webhook handler ───────────────────────────────────────────────────────────

router.post("/webhook/twilio", async (req, res): Promise<void> => {
  // ── Ignore Twilio status callbacks (outbound delivery notifications) ────────
  // Status callbacks POST MessageStatus / SmsStatus fields. They are NOT
  // inbound messages — processing them as such causes false distress alerts.
  const messageStatus: string = req.body?.MessageStatus ?? "";
  if (messageStatus) {
    const callbackSid: string = req.body?.MessageSid ?? req.body?.SmsSid ?? "unknown";
    req.log.info(`Ignored Twilio status callback: ${messageStatus} ${callbackSid}`);
    res.sendStatus(200);
    return;
  }

  // ── Twilio signature verification ────────────────────────────────────────────
  // Enabled when TWILIO_WEBHOOK_URL is set to the full production webhook URL,
  // e.g. https://cyber-chaperone-r--ryfsny.replit.app/api/webhook/twilio
  const _twilioWebhookUrl = process.env.TWILIO_WEBHOOK_URL ?? "";
  const _twilioAuthToken = process.env.TWILIO_AUTH_TOKEN ?? "";
  if (_twilioWebhookUrl && _twilioAuthToken) {
    const _sig = (req.headers["x-twilio-signature"] as string) ?? "";
    const _valid = twilio.validateRequest(
      _twilioAuthToken,
      _sig,
      _twilioWebhookUrl,
      req.body as Record<string, string>,
    );
    if (!_valid) {
      req.log.warn({ sig: _sig.slice(0, 8) }, "Twilio signature check FAILED — request rejected");
      res.status(403).send("Forbidden");
      return;
    }
  }

  let body = req.body?.Body ?? "";
  const from = normaliseFrom(req.body?.From ?? "");
  const to = req.body?.To ?? "";
  const messageSid = req.body?.MessageSid ?? null;

  const latitude: string = req.body?.Latitude ?? "";
  const longitude: string = req.body?.Longitude ?? "";
  const address: string = req.body?.Address ?? "";
  const label: string = req.body?.Label ?? "";

  // ── Voice note transcription ──────────────────────────────────────────────
  const numMedia = Number(req.body?.NumMedia ?? "0");
  const mediaUrl: string = req.body?.MediaUrl0 ?? "";
  const mediaContentType: string = req.body?.MediaContentType0 ?? "";
  let voiceTranscribed = false;

  if (body === "" && isVoiceNote(numMedia, mediaContentType) && mediaUrl) {
    try {
      const { buffer, contentType } = await downloadTwilioMedia(mediaUrl);
      const transcription = await transcribeVoiceNote(buffer, contentType);
      if (transcription) {
        body = transcription;
        voiceTranscribed = true;
        req.log.info({ from, transcription: transcription.slice(0, 200) }, "Voice note transcribed");
      }
    } catch (err) {
      req.log.error({ err }, "Voice note transcription failed — continuing with empty body");
    }
  }

  req.log.info(
    { from, messageSid: messageSid ? "[redacted]" : null, voiceTranscribed },
    "Incoming WhatsApp message",
  );

  try {
    // ── Member lookup — runs on every inbound message ───────────────────────
    const member = await lookupMember(from);
    const memberLabel = member?.isKnown ? member.displayName : from;
    req.log.info(
      { from, isKnownMember: member?.isKnown ?? false, displayName: member?.displayName ?? null },
      "member-lookup",
    );

    // ── Diagnostic ──────────────────────────────────────────────────────────
    const normalisedForLog = normaliseBody(body);
    const hasLeaving = /\bleaving\b/i.test(normalisedForLog);
    const hasHeadingTo = /\b(?:heading|going)\s+to\b/i.test(normalisedForLog);
    const hasEta = /\beta\s+\d{1,2}:\d{2}/i.test(normalisedForLog);
    req.log.info(
      {
        normalisedBody: normalisedForLog.slice(0, 200),
        hasLeaving,
        hasHeadingTo,
        hasEta,
        hasLatLon: latitude !== "" && longitude !== "",
      },
      "parser-diagnostics",
    );

    const parsed = parseTripStart(body);

    if (!parsed) {
      req.log.info(
        {
          normalisedBody: normalisedForLog.slice(0, 200),
          hasLeaving,
          hasHeadingTo,
          hasEta,
          verdict: !hasLeaving
            ? "missing leaving keyword"
            : !hasHeadingTo
              ? "missing heading/going to keyword"
              : "regex did not match — check destination / ETA format",
        },
        "parser-no-match",
      );
    }

    // ── Unknown member with no active trip and no trip-start ─────────────────
    // Check this BEFORE trip-start / follow-up branching so the unknown-member
    // mirror fires even when the message is unrecognised.
    if (!member?.isKnown && !parsed) {
      // We still process the message normally below — this block only fires the
      // unknown-member mirror when there is no trip-start. For trip-start from
      // an unknown member we handle the mirror inside the trip-start block.
      const activeTrip = await findActiveTrip(from);
      if (!activeTrip) {
        // No trip at all — fire unknown-member mirror and prompt
        await db.insert(messagesTable).values({
          fromNumber: from,
          toNumber: to,
          body,
          messageSid,
          tripId: null,
        });

        await sendReply(
          from,
          to,
          "Hi! To use Cyber Chaperone, please register first. Reply 3 to activate your membership or visit cyber-chaperone-r--ryfsny.replit.app/website",
        );

        await sendOperatorMirror(
          to,
          [
            `CYBER CHAPERONE — UNKNOWN MEMBER`,
            `WhatsApp: ${from}`,
            `Known member: NO`,
            `Message: "${excerpt(body || "(empty)", 120)}"`,
            `Next action: Ask member for name, surname, and registered eblockwatch cellphone number.`,
          ].join("\n"),
          "unknown",
        );

        req.log.info({ from }, "Unknown member — no active trip — unknown-member mirror sent");
        res.set("Content-Type", "text/xml");
        res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
        return;
      }
    }

    // ── Conduit reply handler ─────────────────────────────────────────────────
    // Detects numbered replies (1-5) from known case participants (conduits).
    // Runs BEFORE the menu router so conduit messages are never misrouted.
    // Does NOT forward conduit identity to the travelling member.
    const conduitReplyCode = body.trim();
    if (/^[1-5]$/.test(conduitReplyCode)) {
      // Look for an active/invited conduit participant with this WhatsApp number
      const [conduitParticipant] = await db
        .select()
        .from(caseParticipantsTable)
        .where(
          and(
            eq(caseParticipantsTable.whatsappNumber, from),
            eq(caseParticipantsTable.role, "conduit"),
          )
        )
        .orderBy(desc(caseParticipantsTable.invitedAt))
        .limit(1);

      if (conduitParticipant) {
        const REPLY_MEANINGS: Record<string, string> = {
          "1": "I can assist directly",
          "2": "I can alert my local safety network",
          "3": "I can contact a trusted responder",
          "4": "I cannot assist now",
          "5": "Please ask the Situation Room to call me",
        };
        const REPLY_OUTCOMES: Record<string, string> = {
          "1": "assisting",
          "2": "mobilising",
          "3": "mobilising",
          "4": "declined",
          "5": "callback_requested",
        };
        const replyKey = conduitReplyCode as keyof typeof REPLY_MEANINGS;
        const replyMeaning = REPLY_MEANINGS[replyKey] ?? "Unknown reply";
        const replyOutcome = REPLY_OUTCOMES[replyKey] ?? "replied";
        void replyOutcome;

        // Update participant status
        await db
          .update(caseParticipantsTable)
          .set({ accessStatus: ["4"].includes(conduitReplyCode) ? "declined" : "active" })
          .where(eq(caseParticipantsTable.id, conduitParticipant.id));

        // Fetch trip for context
        const [conduitTrip] = await db
          .select()
          .from(tripsTable)
          .where(eq(tripsTable.id, conduitParticipant.tripId));

        // Write case log
        await db.insert(caseLogsTable).values({
          tripId: conduitParticipant.tripId,
          participantId: conduitParticipant.id,
          actionType: "conduit_reply",
          participantName: conduitParticipant.participantName,
          participantWhatsapp: from,
          replyReceived: conduitReplyCode,
          replyCode: conduitReplyCode,
          tripStatusAtTime: conduitTrip?.status ?? null,
          outcome: replyMeaning,
        });

        // Acknowledge to conduit — Situation Room branded
        await sendReply(
          from,
          to,
          `Cyber Chaperone Situation Room — reply recorded.\n\n"${replyMeaning}"\n\nThank you. The Situation Room operator will follow up if needed.`,
        );

        // Operator mirror — LOCAL CONDUIT UPDATE
        const NEXT_ACTIONS: Record<string, string> = {
          "1": "Conduit is assisting directly. Monitor and close case if resolved.",
          "2": "Conduit is alerting local safety network. Monitor for updates.",
          "3": "Conduit is contacting a trusted responder. Monitor.",
          "4": "Conduit cannot assist. Dispatch to next available conduit or escalate.",
          "5": "Conduit requests Situation Room callback. Call conduit now.",
        };
        const nextAction = NEXT_ACTIONS[conduitReplyCode] ?? "Review conduit reply.";

        await sendOperatorMirror(
          to,
          [
            `CYBER CHAPERONE — LOCAL CONDUIT UPDATE`,
            ``,
            `Trip: ${conduitTrip?.title ?? `#${conduitParticipant.tripId}`}`,
            `Case: Trip #${conduitParticipant.tripId}`,
            `Conduit: ${conduitParticipant.participantName}`,
            `Reply: ${replyMeaning}`,
            `Status: ${(conduitTrip?.status ?? "unknown").toUpperCase()}`,
            `Next action: ${nextAction}`,
          ].join("\n"),
          "unknown",
        );

        req.log.info(
          { conduitParticipantId: conduitParticipant.id, tripId: conduitParticipant.tripId, replyCode: conduitReplyCode, replyMeaning },
          "Conduit reply handled",
        );

        // Save message to DB
        await db.insert(messagesTable).values({
          fromNumber: from,
          toNumber: to,
          body,
          messageSid,
          tripId: conduitParticipant.tripId,
        });

        res.set("Content-Type", "text/xml");
        res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
        return;
      }
    }

    // ── Operator AI channel — +27825611065 bypass ────────────────────────────
    // When Andre's number messages the bot, route directly to Claude (Anthropic)
    // instead of the regular AI Arnie member flow.
    // This block runs FIRST — before any member logic.
    const OPERATOR_DIRECT = "whatsapp:+27825611065";
    if (from === OPERATOR_DIRECT) {
      req.log.info({ from, body: body.slice(0, 80) }, "operator-ai: routing to Claude");

      // 1. Persist operator's incoming message
      await db.insert(messagesTable).values({
        fromNumber: from,
        toNumber: to,
        body,
        messageSid,
        tripId: null,
        direction: "operator",
      }).catch(() => {});

      // 2. Call Claude
      const claudeReply = await callOperatorClaude(body, from);

      // 3. Send Claude's reply back to Andre via Twilio
      await sendReply(from, to, claudeReply);

      // 4. Persist Claude's reply so it becomes part of future conversation history
      await db.insert(messagesTable).values({
        fromNumber: to,
        toNumber: from,
        body: claudeReply,
        messageSid: null,
        tripId: null,
        direction: "operator-reply",
      }).catch(() => {});

      req.log.info({ from, replyLength: claudeReply.length }, "operator-ai: Claude reply sent");

      res.set("Content-Type", "text/xml");
      res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
      return;
    }

    // ── Menu router — stateful conversation flows ─────────────────────────────
    // Runs before the trip-start parser. If it handles the message it returns
    // early so the existing trip-start / follow-up branch is skipped entirely.
    // The menu router saves the message to the DB when it handles it.
    const menuResult = await handleMenuRouter({
      body,
      from,
      to,
      member,
      latitude,
      longitude,
      address,
      label,
      messageSid,
      log: req.log,
    });

    if (menuResult.handled) {
      req.log.info({ from }, "Menu router handled message — skipping trip parser");
      res.set("Content-Type", "text/xml");
      res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
      return;
    }

    if (parsed) {
      // ── Trip-start message ──────────────────────────────────────────────────
      const title = `${parsed.startLocation} → ${parsed.destination}`;
      const etaNote = parsed.eta ? ` ETA ${parsed.eta}.` : "";
      const ts = nowUtc();

      const closedTrips = await db
        .update(tripsTable)
        .set({ status: "completed" })
        .where(
          and(
            eq(tripsTable.travelerPhone, from),
            ne(tripsTable.status, "completed"),
          ),
        )
        .returning({ id: tripsTable.id });

      if (closedTrips.length > 0) {
        req.log.info({ closedTripIds: closedTrips.map((t) => t.id) }, "Closed previous active trips for traveler");
      }

      const initialNote = [
        `[${ts}] Trip-start message received from WhatsApp.`,
        `[${ts}] ${memberNoteLine(member, from)}`,
        `[${ts}] Route: ${parsed.startLocation} → ${parsed.destination}${etaNote}`,
      ].join("\n");

      const [newTrip] = await db
        .insert(tripsTable)
        .values({
          title,
          travelerName: member?.isKnown ? member.displayName : from,
          travelerPhone: from,
          status: "green",
          evidenceNotes: initialNote,
          inferenceNotes: `Freeform WhatsApp trip-start message detected.${etaNote}`,
        })
        .returning();

      await db.insert(messagesTable).values({
        fromNumber: from,
        toNumber: to,
        body,
        messageSid,
        tripId: newTrip.id,
      });

      await sendReply(
        from,
        to,
        `Trip started. We are monitoring: ${parsed.startLocation} → ${parsed.destination}.${etaNote}\n\nPlease send your current WhatsApp location pin now so we can confirm your start point and route.\n\nReply 0 for Main Menu.`,
      );

      if (member?.isKnown) {
        const history = await getMemberHistory(from);
        await sendOperatorMirror(
          to,
          [
            `CYBER CHAPERONE — NEW TRIP`,
            `Member: ${member.displayName}`,
            `WhatsApp: ${from}`,
            `Known member: YES`,
            `Role: ${member.role ?? "—"}`,
            `Trip: ${parsed.startLocation} → ${parsed.destination}${etaNote}`,
            `Trip ID: ${newTrip.id}`,
            `Status: GREEN`,
            `History: ${history.totalTrips} trip(s) | ${history.totalMessages} message(s) | Last status: ${history.lastTripStatus ?? "none"}`,
            `Next action: Monitoring — awaiting updates.`,
            `---`,
            excerpt(body, 120),
          ].join("\n"),
          "trip-start",
          "trip-started",
        );
      } else {
        await sendOperatorMirror(
          to,
          [
            `CYBER CHAPERONE — NEW TRIP (UNKNOWN MEMBER)`,
            `WhatsApp: ${from}`,
            `Known member: NO`,
            `Trip: ${parsed.startLocation} → ${parsed.destination}${etaNote}`,
            `Trip ID: ${newTrip.id}`,
            `Status: GREEN`,
            `Next action: Trip created. Identify member — ask for name, surname, registered eblockwatch cellphone number.`,
            `---`,
            excerpt(body, 120),
          ].join("\n"),
          "trip-start",
          "trip-started",
        );
      }

      req.log.info(
        { tripId: newTrip.id, title, startLocation: parsed.startLocation, destination: parsed.destination, eta: parsed.eta, isKnownMember: member?.isKnown ?? false },
        "New trip created from WhatsApp message",
      );
    } else {
      // ── Follow-up message ───────────────────────────────────────────────────
      const activeTrip = await findActiveTrip(from);

      await db.insert(messagesTable).values({
        fromNumber: from,
        toNumber: to,
        body,
        messageSid,
        tripId: activeTrip?.id ?? null,
      });

      if (!activeTrip) {
        req.log.info({ from }, "Follow-up received but no active trip found");
        await sendReply(
          from,
          to,
          "Message received, but there is no active trip open. Please start a new trip with: Leaving [start] heading to [destination]. ETA [time].\n\nReply 0 for Main Menu.",
        );
      } else {
        const ts = nowUtc();

        // ── Location pin (native WhatsApp location) ─────────────────────────
        const hasNativeLocation = latitude !== "" && longitude !== "";
        const isGoogleMapsLink = GOOGLE_MAPS_PATTERN.test(body);

        if (hasNativeLocation) {
          const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;
          const twilioAddress = [label, address].filter(Boolean).join(", ");
          const humanAddress = twilioAddress || await reverseGeocodeStreetAddress(latitude, longitude) || "Address unavailable — use map link";
          const noteEntry = `[${ts}] LOCATION received: ${humanAddress} (${latitude},${longitude})`;
          const note = appendNote(activeTrip.evidenceNotes, noteEntry);
          const routeNote = "Location received. Route calculation unavailable. Quiet monitor using member ETA.";

          await db
            .update(tripsTable)
            .set({ evidenceNotes: note, nextAction: routeNote })
            .where(eq(tripsTable.id, activeTrip.id));

          await sendReply(
            from,
            to,
            "Location received. We have added it to your active trip and will use it to confirm your route.\n\nReply 0 for Main Menu.",
          );

          req.log.info(
            { tripId: activeTrip.id, latitude, longitude, humanAddress },
            "Native location pin received and recorded",
          );

          await sendOperatorMirror(
            to,
            member?.isKnown
              ? [
                  `CYBER CHAPERONE — LOCATION UPDATE`,
                  `Member: ${member.displayName}`,
                  `WhatsApp: ${from}`,
                  `Known member: YES`,
                  `Role: ${member.role ?? "—"}`,
                  `Trip: ${activeTrip.title} (ID: ${activeTrip.id})`,
                  `Current location: ${humanAddress}`,
                  `Coordinates: ${latitude}, ${longitude}`,
                  `Map: ${mapsLink}`,
                  `Status: ${activeTrip.status.toUpperCase()}`,
                  `Next action: Confirm route and monitor.`,
                ].join("\n")
              : [
                  `CYBER CHAPERONE — LOCATION UPDATE (UNKNOWN MEMBER)`,
                  `WhatsApp: ${from}`,
                  `Known member: NO`,
                  `Trip: ${activeTrip.title} (ID: ${activeTrip.id})`,
                  `Current location: ${humanAddress}`,
                  `Coordinates: ${latitude}, ${longitude}`,
                  `Map: ${mapsLink}`,
                  `Status: ${activeTrip.status.toUpperCase()}`,
                  `Next action: Confirm route and monitor. Identify member.`,
                ].join("\n"),
            "location",
          );

        } else if (isGoogleMapsLink) {
          const linkExcerpt = excerpt(body, 200);
          const note = appendNote(
            activeTrip.evidenceNotes,
            `[${ts}] LOCATION LINK received: "${linkExcerpt}"`,
          );
          await db
            .update(tripsTable)
            .set({ evidenceNotes: note })
            .where(eq(tripsTable.id, activeTrip.id));

          await sendReply(from, to, "Location link received. We have added it to your active trip.\n\nReply 0 for Main Menu.");

          req.log.info({ tripId: activeTrip.id }, "Google Maps location link received and recorded");

          await sendOperatorMirror(
            to,
            [
              `CYBER CHAPERONE — LOCATION LINK`,
              `Member: ${memberLabel}`,
              `Known member: ${member?.isKnown ? "YES" : "NO"}`,
              `Trip: ${activeTrip.title} (ID: ${activeTrip.id})`,
              `Link: ${linkExcerpt}`,
              `Status: ${activeTrip.status.toUpperCase()}`,
            ].join("\n"),
            "location",
          );

        } else if (body.trim() === "") {
          req.log.info({ tripId: activeTrip.id }, "Empty message received — no body, no location fields");

          await sendOperatorMirror(
            to,
            [
              `CYBER CHAPERONE — UPDATE`,
              `Member: ${memberLabel}`,
              `Known member: ${member?.isKnown ? "YES" : "NO"}`,
              `Trip: ${activeTrip.title} (ID: ${activeTrip.id})`,
              `Message: (empty — possible unsupported media type)`,
              `Status: ${activeTrip.status.toUpperCase()}`,
            ].join("\n"),
            "unknown",
          );

        } else {
          // ── Normal text follow-up — classify ──────────────────────────────
          const kind = classifyMessage(body);
          req.log.info({ tripId: activeTrip.id, kind }, "Follow-up message classified");

          if (kind === "distress") {
            const note = appendNote(
              activeTrip.evidenceNotes,
              `[${ts}] DISTRESS received: "${excerpt(body)}"`,
            );
            await db
              .update(tripsTable)
              .set({ status: "red", evidenceNotes: note, nextAction: "Immediate human review required." })
              .where(eq(tripsTable.id, activeTrip.id));

            await sendReply(
              from,
              to,
              withMenu("Help message received. Stay as safe as possible. Your trip has been marked RED for immediate human review."),
            );
            req.log.info({ tripId: activeTrip.id }, "Trip escalated to RED — distress keyword");

            await sendOperatorMirror(
              to,
              [
                `CYBER CHAPERONE — RED`,
                `Member: ${memberLabel}`,
                `Known member: ${member?.isKnown ? "YES" : "NO"}`,
                `Trip: ${activeTrip.title} (ID: ${activeTrip.id})`,
                `Distress message: "${excerpt(body, 100)}"`,
                `Status: RED`,
                `Next action: Immediate human review required.`,
              ].join("\n"),
              "red",
              "red-alert",
            );

          } else if (kind === "arrival") {
            const note = appendNote(
              activeTrip.evidenceNotes,
              `[${ts}] ARRIVAL confirmed: "${excerpt(body)}"`,
            );
            await db
              .update(tripsTable)
              .set({ status: "completed", evidenceNotes: note })
              .where(eq(tripsTable.id, activeTrip.id));

            await sendReply(from, to, withMenu("Arrival recorded. Your trip is now closed. Travel safe! 🟢"));
            req.log.info({ tripId: activeTrip.id }, "Trip closed — arrival keyword");

            await sendOperatorMirror(
              to,
              [
                `CYBER CHAPERONE — TRIP CLOSED`,
                `Member: ${memberLabel}`,
                `Known member: ${member?.isKnown ? "YES" : "NO"}`,
                `Trip: ${activeTrip.title} (ID: ${activeTrip.id})`,
                `Status: COMPLETED`,
                `Arrival: "${excerpt(body, 100)}"`,
              ].join("\n"),
              "arrival",
              "arrived",
            );

          } else if (kind === "delay") {
            const note = appendNote(
              activeTrip.evidenceNotes,
              `[${ts}] DELAY reported: "${excerpt(body)}"`,
            );
            await db
              .update(tripsTable)
              .set({ status: "amber", evidenceNotes: note, nextAction: "Quiet monitor — await next update from traveler." })
              .where(eq(tripsTable.id, activeTrip.id));

            await sendReply(
              from,
              to,
              "Update received. We have marked the trip Amber for monitoring. Please send another update when you move again or arrive.\n\nReply 0 for Main Menu.",
            );
            req.log.info({ tripId: activeTrip.id }, "Trip set to AMBER — delay keyword");

            await sendOperatorMirror(
              to,
              [
                `CYBER CHAPERONE — AMBER`,
                `Member: ${memberLabel}`,
                `Known member: ${member?.isKnown ? "YES" : "NO"}`,
                `Trip: ${activeTrip.title} (ID: ${activeTrip.id})`,
                `Reason: delay / traffic`,
                `Status: AMBER`,
                `Next action: Quiet monitor — await next update from traveler.`,
                `---`,
                excerpt(body, 120),
              ].join("\n"),
              "amber",
            );

          } else if (kind === "eta") {
            const etaMatch = body.match(ETA_PATTERN);
            const newEta = etaMatch?.[1] ?? "unknown";
            const note = appendNote(
              activeTrip.evidenceNotes,
              `[${ts}] ETA update: "${excerpt(body)}"`,
            );
            await db
              .update(tripsTable)
              .set({ evidenceNotes: note, inferenceNotes: `ETA updated to ${newEta}.` })
              .where(eq(tripsTable.id, activeTrip.id));

            await sendReply(from, to, "ETA update received. We are still monitoring the trip.\n\nReply 0 for Main Menu.");
            req.log.info({ tripId: activeTrip.id, newEta }, "Trip ETA updated — ETA keyword");

            await sendOperatorMirror(
              to,
              [
                `CYBER CHAPERONE — ETA UPDATE`,
                `Member: ${memberLabel}`,
                `Known member: ${member?.isKnown ? "YES" : "NO"}`,
                `Trip: ${activeTrip.title} (ID: ${activeTrip.id})`,
                `New ETA: ${newEta}`,
                `Status: ${activeTrip.status.toUpperCase()}`,
                `---`,
                excerpt(body, 120),
              ].join("\n"),
              "eta",
            );

          } else {
            // ── Unknown classification — AI risk assessment ────────────────
            const aiRisk = await assessRisk(body, activeTrip.title, activeTrip.evidenceNotes);
            req.log.info({ tripId: activeTrip.id, aiRiskLevel: aiRisk.riskLevel, aiReason: aiRisk.reason }, "AI risk assessment for unknown message");

            const noteEntry = `[${ts}] Update received: "${excerpt(body)}" [AI: ${aiRisk.riskLevel.toUpperCase()} — ${aiRisk.reason}]`;
            const note = appendNote(activeTrip.evidenceNotes, noteEntry);

            const updates: Record<string, string | null> = { evidenceNotes: note };
            let mirrorKind: "amber" | "red" | "unknown" = "unknown";

            if (aiRisk.riskLevel === "red" && activeTrip.status !== "red") {
              updates.status = "red";
              updates.nextAction = "AI flagged RED — immediate human review required.";
              mirrorKind = "red";
            } else if (aiRisk.riskLevel === "amber" && activeTrip.status === "green") {
              updates.status = "amber";
              updates.nextAction = "AI flagged AMBER — monitor closely.";
              mirrorKind = "amber";
            }

            await db
              .update(tripsTable)
              .set(updates)
              .where(eq(tripsTable.id, activeTrip.id));

            const isLocationGuidance = LOCATION_GUIDANCE_PATTERN.test(body);
            const memberReply = isLocationGuidance
              ? "Yes. Please send your current WhatsApp location pin or Google Maps location link. We will add it to your active trip.\n\nReply 0 for Main Menu."
              : "Update received. Your trip is still being monitored. Please send ETA changes, delays, arrival, or help if needed.\n\nReply 0 for Main Menu.";

            await sendReply(from, to, memberReply);

            const effectiveStatus = updates.status ?? activeTrip.status;
            await sendOperatorMirror(
              to,
              [
                `CYBER CHAPERONE — UPDATE${aiRisk.riskLevel !== "green" ? ` [AI: ${aiRisk.riskLevel.toUpperCase()}]` : ""}`,
                `Member: ${memberLabel}`,
                `Known member: ${member?.isKnown ? "YES" : "NO"}`,
                `Trip: ${activeTrip.title} (ID: ${activeTrip.id})`,
                `Message: "${excerpt(body, 120)}"`,
                `Status: ${String(effectiveStatus).toUpperCase()}`,
                `AI Assessment: ${aiRisk.riskLevel.toUpperCase()} — ${aiRisk.reason}`,
              ].join("\n"),
              mirrorKind,
            );
          }
        }
      }
    }
  } catch (err) {
    req.log.error({ err }, "Failed to process incoming message");
  }

  res.set("Content-Type", "text/xml");
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
});

export default router;
