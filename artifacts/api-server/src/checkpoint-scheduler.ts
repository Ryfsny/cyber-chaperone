import twilio from "twilio";
import { db, tripsTable } from "@workspace/db";
import { ne, eq } from "drizzle-orm";
import type { Logger } from "pino";

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID ?? "";
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN ?? "";
const TWILIO_WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886";

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

function buildPrompt(name: string, label: string, destination: string, isPreArrival: boolean): string {
  if (isPreArrival) {
    return [
      `${name} 👋 Cyber Chaperone here.`,
      ``,
      `You should be close to ${destination} now. We are watching over you.`,
      ``,
      `Please reply:`,
      ``,
      `1. ✅ I have arrived safely`,
      `2. 🕐 I am delayed`,
      `3. 🆘 I need help`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n");
  }
  return [
    `${name} 👋 Cyber Chaperone — ${label}.`,
    ``,
    `You are on your way to ${destination}. We've got your back. Just a quick check-in.`,
    ``,
    `Please reply:`,
    ``,
    `1. ✅ I am okay`,
    `2. 🕐 I am delayed`,
    `3. 📍 Send my location pin`,
    `4. 🆘 I need help`,
    ``,
    `Reply 0 for Main Menu.`,
  ].join("\n");
}

async function tick(log: Logger): Promise<void> {
  try {
    const activeTrips = await db
      .select()
      .from(tripsTable)
      .where(ne(tripsTable.status, "completed"));

    const now = Date.now();

    for (const trip of activeTrips) {
      if (!trip.checkpointList) continue;

      let checkpoints: Checkpoint[];
      try {
        checkpoints = JSON.parse(trip.checkpointList) as Checkpoint[];
      } catch {
        continue;
      }

      if (!checkpoints.length) continue;

      const tripStartMs = new Date(trip.createdAt).getTime();
      const evidenceNotes = trip.evidenceNotes ?? "";

      for (const cp of checkpoints) {
        const scheduledMs = tripStartMs + cp.minutesFromStart * 60_000;
        const isPreArrival = cp.label === "PRE_ARRIVAL";
        const label = isPreArrival ? "Pre-arrival check" : cp.label;
        const sentMarker = `[CHECKPOINT-PROMPT: ${cp.label}]`;

        if (evidenceNotes.includes(sentMarker)) continue;  // already sent
        if (now < scheduledMs - 2 * 60_000) continue;      // not yet due
        if (now > scheduledMs + 30 * 60_000) continue;     // too stale

        const name = trip.travelerName ?? trip.travelerPhone;
        const destination = trip.title.includes(" → ")
          ? trip.title.split(" → ").pop()!
          : trip.title;

        await sendWhatsApp(trip.travelerPhone, buildPrompt(name, label, destination, isPreArrival));

        const ts = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
        const updatedNotes = [evidenceNotes, `${sentMarker} Sent at ${ts}`]
          .filter(Boolean)
          .join("\n");

        await db
          .update(tripsTable)
          .set({ evidenceNotes: updatedNotes })
          .where(eq(tripsTable.id, trip.id));

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
