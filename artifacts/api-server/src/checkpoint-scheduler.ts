import twilio from "twilio";
import { db, tripsTable, conversationStatesTable, membersTable } from "@workspace/db";
import { ne, eq } from "drizzle-orm";
import type { Logger } from "pino";

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID ?? "";
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886";
const FOUNDER_WHATSAPP = "whatsapp:+27825611065";

interface Checkpoint {
  label: string;
  minutesFromStart: number;
  fraction: number;
}

async function sendWhatsApp(to: string, body: string): Promise<void> {
  if (!TWILIO_SID || !TWILIO_TOKEN) return;
  try {
    const client = twilio(TWILIO_SID, TWILIO_TOKEN);
    await client.messages.create({ from: TWILIO_WHATSAPP_FROM, to, body });
  } catch {
    // best-effort, never crash the scheduler
  }
}

// Look up a member's ICE contact by their WhatsApp number
async function getMemberIce(
  whatsappNumber: string,
): Promise<{ iceContactName: string; iceContactPhone: string } | null> {
  try {
    const [row] = await db
      .select({ iceContactName: membersTable.iceContactName, iceContactPhone: membersTable.iceContactPhone })
      .from(membersTable)
      .where(eq(membersTable.whatsappNumber, whatsappNumber))
      .limit(1);
    if (row?.iceContactName && row?.iceContactPhone) {
      return { iceContactName: row.iceContactName, iceContactPhone: row.iceContactPhone };
    }
  } catch {
    // best-effort
  }
  return null;
}

// Send ICE contact alert when a trip goes RED (replicates menu-router pattern)
async function sendIceContactAlert(
  memberName: string,
  memberPhone: string,
  iceContactName: string,
  iceContactPhone: string,
  trip: { title: string; startLat: string | null; startLon: string | null; destLat: string | null; destLon: string | null },
  minsOverdue: number,
): Promise<void> {
  try {
    let raw = iceContactPhone.replace(/[\s\-().]/g, "");
    if (raw.startsWith("0")) raw = "+27" + raw.slice(1);
    if (!raw.startsWith("+")) raw = "+" + raw;
    const iceWa = `whatsapp:${raw}`;

    const lat = trip.destLat ?? trip.startLat;
    const lon = trip.destLon ?? trip.startLon;
    const mapsLink = lat && lon ? `https://maps.google.com/?q=${lat},${lon}` : null;
    const memberE164 = memberPhone.replace(/^whatsapp:\+?/, "");

    const body = [
      `🆘 *eblockwatch Cyber Chaperone — URGENT*`,
      ``,
      `Hi ${iceContactName},`,
      ``,
      `You are the emergency contact for *${memberName}*.`,
      ``,
      `Situation: ${memberName} was due to arrive at their destination ${minsOverdue} minutes ago and has not confirmed arrival or responded to safety check-ins.`,
      `Route: ${trip.title}`,
      mapsLink ? `\n📍 Last known location:\n${mapsLink}` : null,
      ``,
      `Please contact ${memberName} immediately:`,
      `👉 wa.me/${memberE164}`,
      ``,
      `André at eblockwatch is monitoring. Reply with any update.`,
      ``,
      `— eblockwatch Cyber Chaperone`,
    ].filter(Boolean).join("\n");

    const client = twilio(TWILIO_SID, TWILIO_TOKEN);
    await client.messages.create({ from: TWILIO_WHATSAPP_FROM, to: iceWa, body });
  } catch {
    // best-effort — never crash the scheduler
  }
}

// ── Overdue ping messages ──────────────────────────────────────────────────────

function buildOverduePing(name: string, destination: string, minsOverdue: number): string {
  const overdueLine = minsOverdue <= 1
    ? `You should be arriving at *${destination}* right about now.`
    : `You are *${minsOverdue} minutes* past your arrival time at *${destination}*.`;
  return [
    `${name} 👋 Cyber Chaperone — quick safety check.`,
    ``,
    overdueLine,
    ``,
    `1. ✅ I have arrived safely`,
    `2. 🕐 Running late — still on the way`,
    `3. 🛑 Stopped — give me more time`,
    `4. 🆘 I need help right now`,
    ``,
    `Reply 0 for Main Menu.`,
  ].join("\n");
}

function buildRedEscalationPing(name: string, destination: string, minsOverdue: number): string {
  return [
    `🚨 *URGENT — Cyber Chaperone safety check*`,
    ``,
    `${name}, you are *${minsOverdue} minutes* overdue at *${destination}* and have not responded.`,
    ``,
    `We are escalating this now.`,
    ``,
    `Reply *1* if you are safe.`,
    `Reply *10* or *HELP* if you need immediate assistance.`,
    ``,
    `Your emergency contact is being notified.`,
  ].join("\n");
}

// ── Checkpoint prompt messages ─────────────────────────────────────────────────

function buildStopPingPrompt(name: string, destination: string): string {
  return [
    `${name} 👋 This is Cyber Chaperone — André's Situation Room.`,
    ``,
    `You stopped about 30 minutes ago on your way to *${destination}*.`,
    `We are still watching. Are you safe?`,
    ``,
    `1. ✅ I'm good — back on the road`,
    `2. 🛑 Still stopped — give me more time`,
    `3. 🆘 I need help right now`,
    ``,
    `Reply 0 for Main Menu.`,
  ].join("\n");
}

function buildCheckpointPrompt(name: string, label: string, destination: string, isPreArrival: boolean): string {
  if (isPreArrival) {
    return [
      `${name} 👋 Cyber Chaperone — you should be close to *${destination}* now.`,
      ``,
      `We haven't stopped watching. Just confirm you're okay.`,
      ``,
      `1. ✅ I have arrived safely`,
      `2. 🕐 Running a little late`,
      `3. 🆘 I need help`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n");
  }
  return [
    `${name} 👋 Cyber Chaperone — *${label}* checkpoint.`,
    ``,
    `You should be at or near *${label}* on your way to *${destination}*.`,
    ``,
    `1. ✅ Yes — passing through now`,
    `2. 🕐 Not yet — running behind`,
    `3. 📍 Somewhere else — tell us where`,
    `4. 🆘 I need help`,
    ``,
    `Reply 0 for Main Menu.`,
  ].join("\n");
}

// Set member's conversation state to CHECKIN flow so their reply is handled correctly
async function setCheckinState(
  whatsappNumber: string,
  tripId: number,
  label: string,
  fraction: number,
  isPreArrival: boolean,
): Promise<void> {
  try {
    const pendingData = JSON.stringify({ clarificationActiveTripId: tripId, checkpointLabel: label, checkpointFraction: fraction, isPreArrival });
    await db
      .insert(conversationStatesTable)
      .values({ whatsappNumber, currentFlow: "CHECKIN", currentStep: null, pendingTripData: pendingData })
      .onConflictDoUpdate({
        target: conversationStatesTable.whatsappNumber,
        set: { currentFlow: "CHECKIN", currentStep: null, pendingTripData: pendingData },
      });
  } catch {
    // best-effort
  }
}

async function tick(log: Logger): Promise<void> {
  try {
    const activeTrips = await db
      .select()
      .from(tripsTable)
      .where(ne(tripsTable.status, "completed"));

    const now = Date.now();

    for (const trip of activeTrips) {
      const evidenceNotes = trip.evidenceNotes ?? "";
      const name = trip.travelerName ?? trip.travelerPhone;
      const destination = trip.title.includes(" → ")
        ? trip.title.split(" → ").pop()!
        : trip.title;

      // ── Planned stop safety ping — fires 30 min after member declared a stop ──
      const stopPingMatch = evidenceNotes.match(/\[STOP-PING-DUE:\s*(\d+)\]/);
      if (stopPingMatch && !evidenceNotes.includes("[STOP-PING-SENT]")) {
        const dueMs = parseInt(stopPingMatch[1], 10);
        if (!isNaN(dueMs) && now >= dueMs) {
          await sendWhatsApp(trip.travelerPhone, buildStopPingPrompt(name, destination));
          const ts = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
          await db
            .update(tripsTable)
            .set({
              evidenceNotes: [evidenceNotes, `[STOP-PING-SENT] Sent at ${ts}`].join("\n"),
              nextAction: "30-min stop safety ping sent. Awaiting member response.",
            })
            .where(eq(tripsTable.id, trip.id));
          log.info({ tripId: trip.id }, "Stop safety ping sent after 30-min planned stop");
        }
      }

      // ── ETA overdue escalation ─────────────────────────────────────────────────
      // Fires when the route ETA has passed and the member hasn't confirmed arrival.
      // Works on ALL active trips (with or without a checkpoint list).
      // Primary: routeEtaMinutes (route calculation). Fallback: SAST time string from routeEtaTime or originalMemberEta.
      const resolvedExpectedArrivalMs = (() => {
        const tripStartMs = new Date(trip.createdAt).getTime();
        if (trip.routeEtaMinutes && trip.routeEtaMinutes > 0) {
          return tripStartMs + trip.routeEtaMinutes * 60_000;
        }
        // Fallback: parse "HH:MM" SAST time (UTC+2)
        const etaStr = trip.routeEtaTime ?? trip.originalMemberEta ?? null;
        if (etaStr) {
          const m = etaStr.match(/(\d{1,2}):(\d{2})/);
          if (m) {
            const hSast = parseInt(m[1], 10);
            const min = parseInt(m[2], 10);
            // Convert SAST → UTC by subtracting 2 hours
            const hUtc = hSast - 2;
            const tripDate = new Date(trip.createdAt);
            const candidate = new Date(tripDate);
            candidate.setUTCHours(hUtc, min, 0, 0);
            // If computed ETA is before trip start, advance by one day
            if (candidate.getTime() < tripStartMs) candidate.setUTCDate(candidate.getUTCDate() + 1);
            return candidate.getTime();
          }
        }
        return null;
      })();

      if (resolvedExpectedArrivalMs !== null) {
        const minsOverdue = Math.floor((now - resolvedExpectedArrivalMs) / 60_000);

        // Phase 1 — Overdue ping: ETA passed but within 45 min, not yet sent
        if (
          minsOverdue >= 0 &&
          minsOverdue < 45 &&
          !evidenceNotes.includes("[OVERDUE-PING-SENT]")
        ) {
          await sendWhatsApp(trip.travelerPhone, buildOverduePing(name, destination, minsOverdue));
          const ts = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
          const updatedNotes = [evidenceNotes, `[OVERDUE-PING-SENT] Sent at ${ts} — ${minsOverdue}min past ETA`]
            .filter(Boolean).join("\n");
          await db.update(tripsTable).set({
            status: "amber",
            evidenceNotes: updatedNotes,
            nextAction: "ETA passed, no arrival confirmed. Overdue safety ping sent. Awaiting member response.",
          }).where(eq(tripsTable.id, trip.id));
          await setCheckinState(trip.travelerPhone, trip.id, "OVERDUE", 1.0, true);
          // Mirror to operator
          if (FOUNDER_WHATSAPP !== trip.travelerPhone) {
            await sendWhatsApp(
              FOUNDER_WHATSAPP,
              `⚠️ CYBER CHAPERONE — OVERDUE\n\n${name} is ${minsOverdue}min past ETA for ${trip.title}.\n\nOverdue ping sent. Trip #${trip.id} → AMBER.`,
            );
          }
          log.info({ tripId: trip.id, minsOverdue }, "Overdue ping sent — ETA passed");
        }

        // Phase 2 — RED escalation: 45+ min overdue, ping was sent but no arrival reply
        if (
          minsOverdue >= 45 &&
          evidenceNotes.includes("[OVERDUE-PING-SENT]") &&
          !evidenceNotes.includes("[OVERDUE-ESCALATED]")
        ) {
          await sendWhatsApp(trip.travelerPhone, buildRedEscalationPing(name, destination, minsOverdue));
          const ts = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
          const updatedNotes = [evidenceNotes, `[OVERDUE-ESCALATED] ${ts} — ${minsOverdue}min past ETA — escalated to RED`]
            .filter(Boolean).join("\n");
          await db.update(tripsTable).set({
            status: "red",
            evidenceNotes: updatedNotes,
            nextAction: `URGENT: ${minsOverdue}min overdue, no response. Trip RED. ICE contact notified.`,
            iceEscalationStatus: "SENT",
          }).where(eq(tripsTable.id, trip.id));

          // Send ICE contact alert
          const ice = await getMemberIce(trip.travelerPhone);
          if (ice) {
            await sendIceContactAlert(name, trip.travelerPhone, ice.iceContactName, ice.iceContactPhone, trip, minsOverdue);
          }
          // Mirror to operator
          const iceNote = ice ? `ICE contact alerted: ${ice.iceContactName}` : "ICE contact: not set";
          if (FOUNDER_WHATSAPP !== trip.travelerPhone) {
            await sendWhatsApp(
              FOUNDER_WHATSAPP,
              `🚨 CYBER CHAPERONE — RED ALERT\n\n${name} is ${minsOverdue}min overdue on ${trip.title}.\n\nTrip #${trip.id} → RED.\n${iceNote}.`,
            );
          }
          log.info({ tripId: trip.id, minsOverdue }, "Trip escalated RED — ETA overdue, no response");
        }
      }

      // ── Checkpoint pings along the route ─────────────────────────────────────
      if (!trip.checkpointList) continue;

      let checkpoints: Checkpoint[];
      try {
        checkpoints = JSON.parse(trip.checkpointList) as Checkpoint[];
      } catch {
        continue;
      }

      if (!checkpoints.length) continue;

      const tripStartMs = new Date(trip.createdAt).getTime();

      for (const cp of checkpoints) {
        const scheduledMs = tripStartMs + cp.minutesFromStart * 60_000;
        const isPreArrival = cp.label === "PRE_ARRIVAL";
        const label = isPreArrival ? "Pre-arrival check" : cp.label;
        const sentMarker = `[CHECKPOINT-PROMPT: ${cp.label}]`;

        if (evidenceNotes.includes(sentMarker)) continue;   // already sent
        if (now < scheduledMs - 2 * 60_000) continue;       // not yet due
        // Extended stale window: 60 min (was 30) so server-restart gaps don't drop pings
        // PRE_ARRIVAL gets a 90-min window because it's the most important checkpoint
        const staleWindowMs = isPreArrival ? 90 * 60_000 : 60 * 60_000;
        if (now > scheduledMs + staleWindowMs) continue;

        await sendWhatsApp(trip.travelerPhone, buildCheckpointPrompt(name, label, destination, isPreArrival));

        const ts = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
        const updatedNotes = [evidenceNotes, `${sentMarker} Sent at ${ts}`]
          .filter(Boolean)
          .join("\n");

        await db
          .update(tripsTable)
          .set({ evidenceNotes: updatedNotes })
          .where(eq(tripsTable.id, trip.id));

        await setCheckinState(trip.travelerPhone, trip.id, cp.label, cp.fraction, isPreArrival);

        log.info({ tripId: trip.id, checkpoint: cp.label }, "Proactive checkpoint prompt sent");
      }
    }
  } catch (err) {
    log.error({ err }, "Checkpoint scheduler error");
  }
}

export function startCheckpointScheduler(log: Logger): void {
  const INTERVAL_MS = 3 * 60 * 1000; // every 3 minutes
  void tick(log);
  setInterval(() => void tick(log), INTERVAL_MS);
  log.info("Checkpoint scheduler started — 3 min interval");
}
