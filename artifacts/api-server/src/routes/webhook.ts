import { Router, type IRouter } from "express";
import { db, messagesTable, tripsTable } from "@workspace/db";
import { and, eq, ne, desc } from "drizzle-orm";
import twilio from "twilio";

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

/**
 * Normalise WhatsApp message text before parsing:
 *  - em/en dashes → hyphen-minus
 *  - smart quotes → straight quotes
 *  - collapse runs of whitespace to single space
 *  - strip trailing punctuation / whitespace
 */
function normaliseBody(raw: string): string {
  return raw
    .replace(/[\u2012\u2013\u2014\u2015]/g, "-") // en/em/figure dash → -
    .replace(/[\u2018\u2019\u0060\u00b4]/g, "'")  // smart single quotes
    .replace(/[\u201c\u201d]/g, '"')               // smart double quotes
    .replace(/\s+/g, " ")                          // collapse whitespace
    .trim();
}

// ── Trip-start parser ────────────────────────────────────────────────────────

interface ParsedTripStart {
  startLocation: string;
  destination: string;
  eta: string | null;
}

/**
 * Two-pass approach — keeps each regex simpler and avoids optional-group
 * backtracking failures that silently break the single-regex version.
 *
 * Pass 1 (ETA present): "leaving [from] START [now] heading/going to DEST [.,] ETA HH:MM[.]"
 * Pass 2 (no ETA):      "leaving [from] START [now] heading/going to DEST[.,]"
 *
 * Works anywhere inside the message — no ^ anchor — so prefixes such as
 * "TEST LIVE — ", "TEST RED — ", "Morning Andre," are transparently ignored.
 */
function parseTripStart(body: string): ParsedTripStart | null {
  const norm = normaliseBody(body);

  // ── Pass 1: message contains an explicit ETA ─────────────────────────────
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

  // ── Pass 2: no ETA — plain trip-start ────────────────────────────────────
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

// ── Parser self-test (runs once at startup, logs results) ─────────────────────

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

// ── Active trip lookup (safe query) ──────────────────────────────────────────

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

type MirrorKind = "trip-start" | "amber" | "red" | "arrival" | "eta" | "unknown";

function mirrorEnabled(kind: MirrorKind): boolean {
  const operatorNumber = process.env.OPERATOR_WHATSAPP_NUMBER;
  const mode = (process.env.OPERATOR_MIRROR_MODE ?? "off").toLowerCase();
  if (!operatorNumber || mode === "off") return false;
  if (mode === "all") return true;
  if (mode === "critical") return kind === "amber" || kind === "red" || kind === "unknown";
  return false;
}

/**
 * Send an operator mirror notification to Andre.
 * Errors are logged but never bubble up — member flow is unaffected.
 * `twilioNumber` is the Twilio sandbox number (the inbound `To` field).
 */
async function sendOperatorMirror(
  twilioNumber: string,
  mirrorBody: string,
  kind: MirrorKind,
): Promise<void> {
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

// ── Webhook handler ───────────────────────────────────────────────────────────

router.post("/webhook/twilio", async (req, res): Promise<void> => {
  const body = req.body?.Body ?? "";
  const from = req.body?.From ?? "";
  const to = req.body?.To ?? "";
  const messageSid = req.body?.MessageSid ?? null;

  req.log.info({ from, messageSid: messageSid ? "[redacted]" : null }, "Incoming WhatsApp message");

  try {
    // ── Diagnostic: log normalised body and parser outcome ──────────────────
    const normalisedForLog = normaliseBody(body);
    const hasLeaving = /\bleaving\b/i.test(normalisedForLog);
    const hasHeadingTo = /\b(?:heading|going)\s+to\b/i.test(normalisedForLog);
    const hasEta = /\beta\s+\d{1,2}:\d{2}/i.test(normalisedForLog);
    req.log.info(
      { normalisedBody: normalisedForLog.slice(0, 200), hasLeaving, hasHeadingTo, hasEta },
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
        `[${ts}] Route: ${parsed.startLocation} → ${parsed.destination}${etaNote}`,
      ].join("\n");

      const [newTrip] = await db
        .insert(tripsTable)
        .values({
          title,
          travelerName: from,
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
        `Trip started. We are monitoring: ${parsed.startLocation} → ${parsed.destination}.${etaNote} Reply with updates along the way.`,
      );

      await sendOperatorMirror(
        to,
        [
          `CYBER CHAPERONE — NEW TRIP`,
          `Member: ${from}`,
          `Route: ${parsed.startLocation} → ${parsed.destination}${etaNote}`,
          `Status: GREEN`,
          `Trip ID: ${newTrip.id}`,
          `Next action: Monitoring — awaiting updates.`,
          `---`,
          excerpt(body, 120),
        ].join("\n"),
        "trip-start",
      );

      req.log.info(
        { tripId: newTrip.id, title, startLocation: parsed.startLocation, destination: parsed.destination, eta: parsed.eta },
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
          "Message received, but there is no active trip open. Please start a new trip with: Leaving [start] heading to [destination]. ETA [time].",
        );
      } else {
        const kind = classifyMessage(body);
        const ts = nowUtc();
        req.log.info({ tripId: activeTrip.id, kind }, "Follow-up message classified");

        if (kind === "distress") {
          const note = appendNote(
            activeTrip.evidenceNotes,
            `[${ts}] DISTRESS received: "${excerpt(body)}"`,
          );
          await db
            .update(tripsTable)
            .set({
              status: "red",
              evidenceNotes: note,
              nextAction: "Immediate human review required.",
            })
            .where(eq(tripsTable.id, activeTrip.id));

          await sendReply(
            from,
            to,
            "Help message received. Stay as safe as possible. Your trip has been marked RED for immediate human review.",
          );
          req.log.info({ tripId: activeTrip.id }, "Trip escalated to RED — distress keyword");

          await sendOperatorMirror(
            to,
            [
              `CYBER CHAPERONE — RED`,
              `Member: ${from}`,
              `Trip: ${activeTrip.title} (ID: ${activeTrip.id})`,
              `Distress message: "${excerpt(body, 100)}"`,
              `Status: RED`,
              `Next action: Immediate human review required.`,
            ].join("\n"),
            "red",
          );

        } else if (kind === "arrival") {
          const note = appendNote(
            activeTrip.evidenceNotes,
            `[${ts}] ARRIVAL confirmed: "${excerpt(body)}"`,
          );
          await db
            .update(tripsTable)
            .set({
              status: "completed",
              evidenceNotes: note,
            })
            .where(eq(tripsTable.id, activeTrip.id));

          await sendReply(
            from,
            to,
            "Received. Your arrival has been recorded and the trip is closed.",
          );
          req.log.info({ tripId: activeTrip.id }, "Trip closed — arrival keyword");

          await sendOperatorMirror(
            to,
            [
              `CYBER CHAPERONE — TRIP CLOSED`,
              `Member: ${from}`,
              `Trip: ${activeTrip.title} (ID: ${activeTrip.id})`,
              `Status: COMPLETED`,
              `Arrival: "${excerpt(body, 100)}"`,
            ].join("\n"),
            "arrival",
          );

        } else if (kind === "delay") {
          const note = appendNote(
            activeTrip.evidenceNotes,
            `[${ts}] DELAY reported: "${excerpt(body)}"`,
          );
          await db
            .update(tripsTable)
            .set({
              status: "amber",
              evidenceNotes: note,
              nextAction: "Quiet monitor — await next update from traveler.",
            })
            .where(eq(tripsTable.id, activeTrip.id));

          await sendReply(
            from,
            to,
            "Update received. We have marked the trip Amber for monitoring. Please send another update when you move again or arrive.",
          );
          req.log.info({ tripId: activeTrip.id }, "Trip set to AMBER — delay keyword");

          await sendOperatorMirror(
            to,
            [
              `CYBER CHAPERONE — AMBER`,
              `Member: ${from}`,
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
            .set({
              evidenceNotes: note,
              inferenceNotes: `ETA updated to ${newEta}.`,
            })
            .where(eq(tripsTable.id, activeTrip.id));

          await sendReply(
            from,
            to,
            "ETA update received. We are still monitoring the trip.",
          );
          req.log.info({ tripId: activeTrip.id, newEta }, "Trip ETA updated — ETA keyword");

          await sendOperatorMirror(
            to,
            [
              `CYBER CHAPERONE — ETA UPDATE`,
              `Member: ${from}`,
              `Trip: ${activeTrip.title} (ID: ${activeTrip.id})`,
              `New ETA: ${newEta}`,
              `Status: ${activeTrip.status.toUpperCase()}`,
              `---`,
              excerpt(body, 120),
            ].join("\n"),
            "eta",
          );

        } else {
          const note = appendNote(
            activeTrip.evidenceNotes,
            `[${ts}] Update received: "${excerpt(body)}"`,
          );
          await db
            .update(tripsTable)
            .set({ evidenceNotes: note })
            .where(eq(tripsTable.id, activeTrip.id));

          req.log.info({ tripId: activeTrip.id }, "General update appended to evidence notes");

          await sendOperatorMirror(
            to,
            [
              `CYBER CHAPERONE — UPDATE`,
              `Member: ${from}`,
              `Trip: ${activeTrip.title} (ID: ${activeTrip.id})`,
              `Message: "${excerpt(body, 120)}"`,
              `Status: ${activeTrip.status.toUpperCase()}`,
            ].join("\n"),
            "unknown",
          );
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
