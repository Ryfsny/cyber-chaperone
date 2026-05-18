import twilio from "twilio";
import { db, tripsTable, conversationStatesTable, membersTable } from "@workspace/db";
import { ne, eq, and, isNull, lte } from "drizzle-orm";
import type { Logger } from "pino";

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID ?? "";
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886";
const FOUNDER_WHATSAPP = "whatsapp:+27825611065";

async function sendWhatsApp(to: string, body: string): Promise<void> {
  if (!TWILIO_SID || !TWILIO_TOKEN) return;
  try {
    const client = twilio(TWILIO_SID, TWILIO_TOKEN);
    await client.messages.create({ from: TWILIO_WHATSAPP_FROM, to, body });
  } catch {
    // best-effort, never crash the scheduler
  }
}

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

// ── Phase 1 — ETA arrival check (sent at ETA, trip stays GREEN) ───────────────
function buildEtaCheckin(name: string, destination: string): string {
  return [
    `${name}, you should be near *${destination}* by now.`,
    ``,
    `Are you there and okay?`,
    ``,
    `1. I have arrived safely`,
    `2. I am delayed`,
    `3. I will send my location pin`,
    `4. I need help`,
    ``,
    `Reply 0 for Main Menu.`,
  ].join("\n");
}

// ── Phase 2 — Grace period expired (AMBER at +10 min) ─────────────────────────
function buildAmberPing(name: string, destination: string): string {
  return [
    `${name}, we have not had your arrival confirmation yet.`,
    ``,
    `You are overdue at *${destination}*.`,
    ``,
    `Please reply:`,
    ``,
    `1. I am okay — I have arrived`,
    `2. I am delayed`,
    `3. Send location pin`,
    `4. I need help`,
  ].join("\n");
}

// ── Phase 3 — Escalation (RED at +25 min) ─────────────────────────────────────
function buildRedEscalationPing(name: string, destination: string, minsOverdue: number): string {
  return [
    `${name}, we have not had a reply after your expected arrival time.`,
    ``,
    `You are *${minsOverdue} minutes* overdue at *${destination}*.`,
    ``,
    `Cyber Chaperone is escalating this for human attention.`,
    ``,
    `Reply:`,
    `1. I am okay`,
    `4. I need help`,
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

interface Checkpoint {
  label: string;
  minutesFromStart: number;
  fraction: number;
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

      // ── ETA overdue monitoring — 3 phases ─────────────────────────────────────
      // Resolve the expected arrival time from routeEtaMinutes or ETA string.
      const resolvedExpectedArrivalMs = (() => {
        const tripStartMs = new Date(trip.createdAt).getTime();
        if (trip.routeEtaMinutes && trip.routeEtaMinutes > 0) {
          return tripStartMs + trip.routeEtaMinutes * 60_000;
        }
        const etaStr = trip.routeEtaTime ?? trip.originalMemberEta ?? null;
        if (etaStr) {
          const m = etaStr.match(/(\d{1,2}):(\d{2})/);
          if (m) {
            const hSast = parseInt(m[1], 10);
            const min = parseInt(m[2], 10);
            const hUtc = hSast - 2;
            const tripDate = new Date(trip.createdAt);
            const candidate = new Date(tripDate);
            candidate.setUTCHours(hUtc, min, 0, 0);
            if (candidate.getTime() < tripDate.getTime()) candidate.setUTCDate(candidate.getUTCDate() + 1);
            return candidate.getTime();
          }
        }
        return null;
      })();

      if (resolvedExpectedArrivalMs !== null) {
        const minsOverdue = Math.floor((now - resolvedExpectedArrivalMs) / 60_000);

        // Backward-compat: treat old [OVERDUE-PING-SENT] as Phase 1 already done
        const phase1Sent = evidenceNotes.includes("[ETA-CHECKIN-SENT]") || evidenceNotes.includes("[OVERDUE-PING-SENT]");
        const phase2Sent = evidenceNotes.includes("[AMBER-PING-SENT]");
        const phase3Sent = evidenceNotes.includes("[OVERDUE-ESCALATED]");

        // ── Phase 1 — ETA reached (0–10 min): send arrival check, keep GREEN ──
        if (minsOverdue >= 0 && minsOverdue < 10 && !phase1Sent) {
          await sendWhatsApp(trip.travelerPhone, buildEtaCheckin(name, destination));
          const ts = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
          const updatedNotes = [
            evidenceNotes,
            `[ETA-CHECKIN-SENT] ${ts} — ETA reached. Arrival check sent.`,
          ].filter(Boolean).join("\n");
          await db.update(tripsTable).set({
            evidenceNotes: updatedNotes,
            inferenceNotes: `ETA reached. Awaiting member confirmation.`,
            nextAction: "ETA reached. Arrival check-in sent. Wait for reply.",
            checkinStage: "ETA_CHECKIN",
            overdueMinutes: minsOverdue,
          }).where(eq(tripsTable.id, trip.id));
          await setCheckinState(trip.travelerPhone, trip.id, "OVERDUE_PING", 1.0, false);
          if (FOUNDER_WHATSAPP !== trip.travelerPhone) {
            await sendWhatsApp(
              FOUNDER_WHATSAPP,
              `⏰ CYBER CHAPERONE — ETA REACHED\n\n${name} should be arriving at ${destination} now.\nTrip #${trip.id} — arrival check sent.\n\nAwaiting confirmation.`,
            );
          }
          log.info({ tripId: trip.id, minsOverdue }, "Phase 1: ETA arrival check sent");
        }

        // ── Phase 2 — Grace period expired (+10 min): AMBER ──────────────────
        if (minsOverdue >= 10 && phase1Sent && !phase2Sent && !phase3Sent) {
          await sendWhatsApp(trip.travelerPhone, buildAmberPing(name, destination));
          const ts = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
          const updatedNotes = [
            evidenceNotes,
            `[AMBER-PING-SENT] ${ts} — ${minsOverdue}min overdue. Grace period expired. AMBER.`,
          ].filter(Boolean).join("\n");
          await db.update(tripsTable).set({
            status: "amber",
            evidenceNotes: updatedNotes,
            inferenceNotes: `ETA passed with no arrival confirmation. Grace period expired.`,
            nextAction: `ETA passed. No arrival confirmation. AMBER — awaiting response.`,
            checkinStage: "AMBER_PING",
            overdueMinutes: minsOverdue,
          }).where(eq(tripsTable.id, trip.id));
          await setCheckinState(trip.travelerPhone, trip.id, "OVERDUE_PING", 1.0, false);
          if (FOUNDER_WHATSAPP !== trip.travelerPhone) {
            await sendWhatsApp(
              FOUNDER_WHATSAPP,
              `⚠️ CYBER CHAPERONE — AMBER\n\n${name} is ${minsOverdue}min past ETA for ${trip.title}.\nTrip #${trip.id} → AMBER.\n\nAmber ping sent. No arrival confirmation yet.`,
            );
          }
          log.info({ tripId: trip.id, minsOverdue }, "Phase 2: AMBER — grace period expired");
        }

        // ── Phase 3 — Escalation (+25 min): RED + ICE + operator alert ───────
        if (minsOverdue >= 25 && phase2Sent && !phase3Sent) {
          await sendWhatsApp(trip.travelerPhone, buildRedEscalationPing(name, destination, minsOverdue));
          const ts = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
          const updatedNotes = [
            evidenceNotes,
            `[OVERDUE-ESCALATED] ${ts} — ${minsOverdue}min overdue — escalated to RED`,
          ].filter(Boolean).join("\n");
          await db.update(tripsTable).set({
            status: "red",
            evidenceNotes: updatedNotes,
            inferenceNotes: `ETA missed. No response after escalation window. Emergency protocol active.`,
            nextAction: `URGENT: ${minsOverdue}min overdue, no response. RED. ICE contact notified. Human review required.`,
            iceEscalationStatus: "SENT",
            checkinStage: "RED_ESCALATION",
            overdueMinutes: minsOverdue,
          }).where(eq(tripsTable.id, trip.id));

          const ice = await getMemberIce(trip.travelerPhone);
          if (ice) {
            await sendIceContactAlert(name, trip.travelerPhone, ice.iceContactName, ice.iceContactPhone, trip, minsOverdue);
          }
          const iceNote = ice ? `ICE contact alerted: ${ice.iceContactName}` : "ICE contact: not set";
          if (FOUNDER_WHATSAPP !== trip.travelerPhone) {
            await sendWhatsApp(
              FOUNDER_WHATSAPP,
              [
                `🚨 RED — No arrival confirmation after ETA.`,
                ``,
                `Member: ${name}`,
                `Trip: ${trip.title}`,
                `Trip #${trip.id}`,
                `Overdue: ${minsOverdue} minutes`,
                `${iceNote}`,
                ``,
                `Next action: Human review required.`,
              ].join("\n"),
            );
          }
          log.info({ tripId: trip.id, minsOverdue }, "Phase 3: RED — escalated, ICE notified");
        }

        // Keep overdueMinutes fresh on every tick for already-escalated trips
        if (minsOverdue > 0 && (phase1Sent || phase2Sent || phase3Sent)) {
          await db.update(tripsTable)
            .set({ overdueMinutes: minsOverdue })
            .where(eq(tripsTable.id, trip.id));
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

        if (evidenceNotes.includes(sentMarker)) continue;
        if (now < scheduledMs - 2 * 60_000) continue;
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

// ── Safe Zone Clock-in scheduler ──────────────────────────────────────────────
// Escalation:
//   T+0   Deadline reached → ping member ("are you home?")
//   T+20  No reply → nudge André (soft awareness)
//   T+40  André didn't resolve → ICE nudged + trip → AMBER

async function clockinTick(log: Logger): Promise<void> {
  try {
    const now = new Date();
    const nowMs = now.getTime();

    const clockinTrips = await db
      .select()
      .from(tripsTable)
      .where(
        and(
          eq(tripsTable.tripType, "clockin"),
          ne(tripsTable.status, "completed"),
        )
      );

    for (const trip of clockinTrips) {
      if (!trip.clockinDeadline) continue;

      const deadlineMs = new Date(trip.clockinDeadline).getTime();
      const name = trip.travelerName;
      const notes = trip.evidenceNotes ?? "";
      const sastTime = trip.originalMemberEta ?? "your set time";

      // ── Phase 1: deadline passed, first ping not sent ─────────────────────
      if (nowMs >= deadlineMs && !notes.includes("[CLOCKIN-PING-SENT]")) {
        await sendWhatsApp(trip.travelerPhone, [
          `${name} 🏠 — it's clock-in time!`,
          ``,
          `Are you safely home?`,
          ``,
          `Reply *SAFE* to confirm you're home.`,
          `Reply *10* if you need help right now.`,
        ].join("\n"));
        const ts = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
        await db.update(tripsTable).set({
          clockinAlertSentAt: now,
          evidenceNotes: [notes, `[CLOCKIN-PING-SENT] ${ts}`].join("\n"),
          nextAction: `Clock-in ping sent at ${ts}. Awaiting reply — André nudge in 20 min.`,
        }).where(eq(tripsTable.id, trip.id));
        log.info({ tripId: trip.id }, "Clockin: deadline ping sent");
        continue;
      }

      const alertSentMs = trip.clockinAlertSentAt
        ? new Date(trip.clockinAlertSentAt).getTime()
        : null;

      // ── Phase 2: +20 min → nudge André ───────────────────────────────────
      if (
        alertSentMs &&
        nowMs >= alertSentMs + 20 * 60_000 &&
        notes.includes("[CLOCKIN-PING-SENT]") &&
        !notes.includes("[CLOCKIN-ANDRE-NUDGE]")
      ) {
        const minsLate = Math.floor((nowMs - deadlineMs) / 60_000);
        if (FOUNDER_WHATSAPP !== trip.travelerPhone) {
          await sendWhatsApp(FOUNDER_WHATSAPP, [
            `🏠 CLOCK-IN OVERDUE — ${name}`,
            ``,
            `${name} was expected home by *${sastTime}* and has not replied.`,
            `Overdue: ${minsLate} minutes`,
            `Trip #${trip.id}`,
            ``,
            `No action needed yet — just be aware.`,
            `If still no reply in 20 minutes, ICE contact will be nudged automatically.`,
          ].join("\n"));
        }
        const ts = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
        await db.update(tripsTable).set({
          evidenceNotes: [notes, `[CLOCKIN-ANDRE-NUDGE] ${ts} — André nudged`].join("\n"),
          nextAction: `André nudged at +20 min. ICE contact auto-notified at +40 min if no reply.`,
        }).where(eq(tripsTable.id, trip.id));
        log.info({ tripId: trip.id }, "Clockin: André nudged at +20 min");
        continue;
      }

      // ── Phase 3: +40 min → ICE nudge + trip → AMBER ──────────────────────
      if (
        alertSentMs &&
        nowMs >= alertSentMs + 40 * 60_000 &&
        notes.includes("[CLOCKIN-ANDRE-NUDGE]") &&
        !notes.includes("[CLOCKIN-ICE-NUDGE]")
      ) {
        const minsLate = Math.floor((nowMs - deadlineMs) / 60_000);
        const ice = await getMemberIce(trip.travelerPhone);
        let iceNote = "ICE contact: not set";

        if (ice) {
          try {
            let raw = ice.iceContactPhone.replace(/[\s\-().]/g, "");
            if (raw.startsWith("0")) raw = "+27" + raw.slice(1);
            if (!raw.startsWith("+")) raw = "+" + raw;
            const iceWa = `whatsapp:${raw}`;
            const memberE164 = trip.travelerPhone.replace(/^whatsapp:\+?/, "");
            const client = twilio(TWILIO_SID, TWILIO_TOKEN);
            await client.messages.create({
              from: TWILIO_WHATSAPP_FROM,
              to: iceWa,
              body: [
                `👋 Hi ${ice.iceContactName} — eblockwatch Cyber Chaperone here.`,
                ``,
                `You are the emergency contact for *${name}*.`,
                ``,
                `${name} was expected home by *${sastTime}* and is ${minsLate} minutes overdue.`,
                `We have not been able to reach them.`,
                ``,
                `Please check on them:`,
                `👉 wa.me/${memberE164}`,
                ``,
                `*Reply here if you need assistance* — we will escalate immediately.`,
                ``,
                `— eblockwatch Cyber Chaperone`,
              ].join("\n"),
            });
            iceNote = `ICE nudged: ${ice.iceContactName} (${ice.iceContactPhone})`;
          } catch {
            iceNote = `ICE contact set but message failed: ${ice.iceContactName}`;
          }
        }

        const ts = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
        await db.update(tripsTable).set({
          status: "amber",
          iceEscalationStatus: "SENT",
          evidenceNotes: [notes, `[CLOCKIN-ICE-NUDGE] ${ts} — ${iceNote} — trip → AMBER`].join("\n"),
          nextAction: `AMBER: ${minsLate} min overdue. ${iceNote}. Human review recommended.`,
        }).where(eq(tripsTable.id, trip.id));

        if (FOUNDER_WHATSAPP !== trip.travelerPhone) {
          await sendWhatsApp(FOUNDER_WHATSAPP, [
            `⚠️ CLOCK-IN — AMBER`,
            ``,
            `Member: ${name}`,
            `Expected home: ${sastTime}`,
            `Overdue: ${minsLate} minutes`,
            `Trip #${trip.id}`,
            ``,
            iceNote,
            ``,
            `Status → AMBER. Human review recommended.`,
          ].join("\n"));
        }

        log.info({ tripId: trip.id }, "Clockin: ICE nudged at +40 min, trip → AMBER");
      }
    }
  } catch (err) {
    log.error({ err }, "Clockin scheduler error");
  }
}

export function startCheckpointScheduler(log: Logger): void {
  const INTERVAL_MS = 3 * 60 * 1000; // every 3 minutes
  void tick(log);
  void clockinTick(log);
  setInterval(() => void tick(log), INTERVAL_MS);
  setInterval(() => void clockinTick(log), INTERVAL_MS);
  log.info("Checkpoint scheduler started — 3 min interval (trip monitor + clock-in)");
}
