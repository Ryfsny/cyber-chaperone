import { db, membersTable, tripsTable, messagesTable, conversationStatesTable } from "@workspace/db";
import { and, eq, ne, desc } from "drizzle-orm";
import twilio from "twilio";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MemberInfo {
  displayName: string;
  role: string | null;
  memberStatus: string;
  isKnown: boolean;
}

interface PendingTripData {
  startLocation?: string;
  startLat?: string;
  startLon?: string;
  destination?: string;
  reason?: string;
  eta?: string;
  clarificationActiveTrip?: string;
  clarificationActiveTripId?: number;
  clarificationNewDestination?: string;
  clarificationOriginalMessage?: string;
}

interface ConvState {
  currentFlow: string | null;
  currentStep: string | null;
  pendingTripData: PendingTripData | null;
}

export interface MenuContext {
  body: string;
  from: string;
  to: string;
  member: MemberInfo | null;
  latitude: string;
  longitude: string;
  address: string;
  label: string;
  messageSid: string | null;
  log: { info: (obj: unknown, msg?: string) => void; error: (obj: unknown, msg?: string) => void };
}

export interface MenuResult {
  handled: boolean;
}

// ── Flows and steps ───────────────────────────────────────────────────────────

const FLOW_MAIN_MENU = "MAIN_MENU";
const FLOW_CYBER_CHAPERONE = "CYBER_CHAPERONE";
const FLOW_TRIP_FLOW = "TRIP_FLOW";
const FLOW_CLARIFICATION = "CLARIFICATION";

const STEP_WAITING_FOR_START_LOCATION = "WAITING_FOR_START_LOCATION";
const STEP_WAITING_FOR_DESTINATION = "WAITING_FOR_DESTINATION";
const STEP_WAITING_FOR_ETA = "WAITING_FOR_ETA";

const FLOW_CHECKIN = "CHECKIN";
const STEP_WAITING_FOR_NEW_ETA = "WAITING_FOR_NEW_ETA";

// ── Keyword detectors ─────────────────────────────────────────────────────────

const MAIN_MENU_TRIGGER = /^(hi|hello|menu|start|0)$/i;
const CC_KEYWORDS = /\b(cyber chaperone|travel|trip|start trip)\b/i;
const AMBIGUOUS_DEST_PATTERN =
  /\b(i'?m? (?:am )?going to|on my way to|heading to|going to)\s+(.+)/i;
const START_FORMAT =
  /^START\s+(.+?)\s+to\s+(.+?)\s+ETA\s+(\d{1,2}:\d{2}(?:\s*[aApP][mM])?)\s*$/i;
const DISTRESS_WORDS = [
  "help", "sos", "emergency", "danger", "accident",
  "hijack", "hijacked", "crash", "police", "ambulance", "urgent", "call me",
];
const ARRIVAL_WORDS = [
  "arrived", "arrived safely", "i have arrived", "safe", "at destination", "reached", "home safe",
];

function isDistress(body: string): boolean {
  const lower = body.toLowerCase();
  return DISTRESS_WORDS.some((w) => lower.includes(w));
}

function isArrival(body: string): boolean {
  const lower = body.toLowerCase();
  return ARRIVAL_WORDS.some((w) => lower.includes(w));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function normaliseEta(raw: string): string {
  return raw.replace(/^ETA\s+/i, "").trim();
}

function calculateEtaDrift(originalMemberEta: string, _tripCreatedAt: Date): number | null {
  const normalised = normaliseEta(originalMemberEta);
  const match = normalised.match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (match[3]) {
    const ampm = match[3].toLowerCase();
    if (ampm === "pm" && h < 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;
  }
  const now = new Date();
  const etaDate = new Date(now);
  etaDate.setHours(h, m, 0, 0);
  // If ETA appears more than 12 hrs in the future it's likely from yesterday (midnight crossover)
  if ((etaDate.getTime() - now.getTime()) / 3600000 > 12) {
    etaDate.setDate(etaDate.getDate() - 1);
  }
  return Math.round((now.getTime() - etaDate.getTime()) / 60000);
}

function shouldSendCheckin(trip: { lastMemberCheckinTime: Date | null | undefined }): boolean {
  if (!trip.lastMemberCheckinTime) return true;
  const mins = (Date.now() - new Date(trip.lastMemberCheckinTime).getTime()) / 60000;
  return mins > 25;
}

// ── Twilio ────────────────────────────────────────────────────────────────────

async function sendWhatsApp(from: string, to: string, body: string): Promise<void> {
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({ from: to, to: from, body });
  } catch {
    // Never break the webhook
  }
}

async function sendOperatorMirror(twilioNumber: string, body: string): Promise<void> {
  const operatorNumber = process.env.OPERATOR_WHATSAPP_NUMBER;
  const mode = (process.env.OPERATOR_MIRROR_MODE ?? "off").toLowerCase();
  if (!operatorNumber || mode === "off") return;
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({ from: twilioNumber, to: operatorNumber, body });
  } catch {
    // Best-effort
  }
}

// ── Conversation state ────────────────────────────────────────────────────────

async function getConvState(whatsappNumber: string): Promise<ConvState> {
  try {
    const [row] = await db
      .select()
      .from(conversationStatesTable)
      .where(eq(conversationStatesTable.whatsappNumber, whatsappNumber))
      .limit(1);
    return {
      currentFlow: row?.currentFlow ?? null,
      currentStep: row?.currentStep ?? null,
      pendingTripData: row?.pendingTripData ? (JSON.parse(row.pendingTripData) as PendingTripData) : null,
    };
  } catch {
    return { currentFlow: null, currentStep: null, pendingTripData: null };
  }
}

async function setConvState(whatsappNumber: string, update: Partial<ConvState>): Promise<void> {
  try {
    const values: Record<string, string | null> = {};
    if ("currentFlow" in update) values.currentFlow = update.currentFlow ?? null;
    if ("currentStep" in update) values.currentStep = update.currentStep ?? null;
    if ("pendingTripData" in update)
      values.pendingTripData = update.pendingTripData ? JSON.stringify(update.pendingTripData) : null;

    await db
      .insert(conversationStatesTable)
      .values({ whatsappNumber, ...values })
      .onConflictDoUpdate({
        target: conversationStatesTable.whatsappNumber,
        set: values,
      });
  } catch {
    // Graceful — state is not critical
  }
}

async function resetConvState(whatsappNumber: string): Promise<void> {
  await setConvState(whatsappNumber, {
    currentFlow: null,
    currentStep: null,
    pendingTripData: null,
  });
}

// ── Active trip ───────────────────────────────────────────────────────────────

async function findActiveTrip(phone: string) {
  const [trip] = await db
    .select()
    .from(tripsTable)
    .where(and(eq(tripsTable.travelerPhone, phone), ne(tripsTable.status, "completed")))
    .orderBy(desc(tripsTable.id))
    .limit(1);
  return trip ?? null;
}

// ── Message save ──────────────────────────────────────────────────────────────

async function saveMessage(
  from: string,
  to: string,
  body: string,
  messageSid: string | null,
  tripId: number | null,
): Promise<void> {
  try {
    await db.insert(messagesTable).values({ fromNumber: from, toNumber: to, body, messageSid, tripId });
  } catch {
    // Never break the webhook
  }
}

// ── Trip creation helper ──────────────────────────────────────────────────────

async function createTrip(
  from: string,
  to: string,
  member: MemberInfo | null,
  startLocation: string,
  destination: string,
  eta: string | null,
  body: string,
  messageSid: string | null,
  log: MenuContext["log"],
): Promise<void> {
  const title = `${startLocation} → ${destination}`;
  const etaNote = eta ? ` ETA ${eta}.` : "";
  const ts = nowUtc();

  const closedTrips = await db
    .update(tripsTable)
    .set({ status: "completed" })
    .where(and(eq(tripsTable.travelerPhone, from), ne(tripsTable.status, "completed")))
    .returning({ id: tripsTable.id });

  if (closedTrips.length > 0) {
    log.info({ closedTripIds: closedTrips.map((t) => t.id) }, "Closed previous active trips for traveler");
  }

  const initialNote = [
    `[${ts}] Trip-start message received via menu flow.`,
    `[${ts}] Member: ${member?.displayName ?? from}`,
    `[${ts}] Route: ${startLocation} → ${destination}${etaNote}`,
  ].join("\n");

  const [newTrip] = await db
    .insert(tripsTable)
    .values({
      title,
      travelerName: member?.displayName ?? from,
      travelerPhone: from,
      status: "green",
      evidenceNotes: initialNote,
      inferenceNotes: `Trip started via menu flow.${etaNote}`,
      originalMemberEta: eta ? normaliseEta(eta) : null,
      currentRouteConfidence: "green",
    })
    .returning();

  await saveMessage(from, to, body, messageSid, newTrip.id);

  await sendWhatsApp(
    from,
    to,
    `✅ Trip started.\n\n${startLocation} → ${destination}${etaNote}\n\nWe are monitoring your journey. Send your location pin 📍, ETA updates, or ARRIVED when you get there.\n\nReply 0 for Main Menu.`,
  );

  log.info(
    { tripId: newTrip.id, title, startLocation, destination, eta, isKnownMember: member?.isKnown ?? false },
    "New trip created from menu flow",
  );

  await sendOperatorMirror(
    to,
    [
      `CYBER CHAPERONE — NEW TRIP`,
      `Member: ${member?.displayName ?? from}`,
      `Known member: ${member?.isKnown ? "YES" : "NO"}`,
      `Trip: ${title}${etaNote}`,
      `Trip ID: ${newTrip.id}`,
      `Status: GREEN`,
      `Next action: Monitoring — awaiting updates.`,
    ].join("\n"),
  );

  await resetConvState(from);
}

// ── Check-in text ─────────────────────────────────────────────────────────────

function checkinText(name: string, driftMin: number, tripTitle: string): string {
  return [
    `${name}, Cyber Chaperone check-in.`,
    ``,
    `Your ETA appears to have shifted — ${driftMin} minute${driftMin === 1 ? "" : "s"} past expected arrival.`,
    ``,
    `Trip: ${tripTitle}`,
    ``,
    `Please reply:`,
    ``,
    `1. I am okay`,
    `2. I am delayed`,
    `3. My ETA changed`,
    `4. I have stopped`,
    `5. I need help`,
    `6. I will send my location pin`,
    ``,
    `Reply 0 for Main Menu.`,
  ].join("\n");
}

async function sendCheckinPrompt(
  ctx: MenuContext,
  trip: typeof tripsTable.$inferSelect,
  driftMin: number,
): Promise<void> {
  const name = ctx.member?.displayName ?? ctx.from;
  await sendWhatsApp(ctx.from, ctx.to, checkinText(name, driftMin, trip.title));
}

// ── ICE escalation ────────────────────────────────────────────────────────────

async function escalateToIce(
  ctx: MenuContext,
  memberRow: typeof membersTable.$inferSelect,
  trip: typeof tripsTable.$inferSelect,
): Promise<void> {
  const { to, log } = ctx;
  if (!memberRow.iceContactPhone) return;
  const icePhone = memberRow.iceContactPhone;
  const iceName = memberRow.iceContactName ?? "Emergency Contact";
  const memberName = memberRow.displayName;
  try {
    await db
      .update(tripsTable)
      .set({ iceEscalationStatus: "SENT" })
      .where(eq(tripsTable.id, trip.id));
    await sendWhatsApp(
      icePhone,
      to,
      [
        `Hi ${iceName}, this is Cyber Chaperone from eblockwatch.`,
        ``,
        `You are listed as ${memberName}'s emergency contact.`,
        ``,
        `We are monitoring their trip:`,
        `${trip.title}.`,
        ``,
        `We have not received the expected check-in.`,
        ``,
        `Please try to contact ${memberName} and reply:`,
        ``,
        `1. I reached them — they are okay`,
        `2. I reached them — they need help`,
        `3. I could not reach them`,
        `4. Please ask the Situation Room to call me`,
      ].join("\n"),
    );
    log.info({ memberName, tripId: trip.id }, "ICE contact escalated");
    await sendOperatorMirror(to, [
      `CYBER CHAPERONE — ICE ESCALATION SENT`,
      `Member: ${memberName}`,
      `Trip: ${trip.title} (ID: ${trip.id})`,
      `ICE Contact: ${iceName}`,
      `Status: ⚠️ AMBER`,
      `Next action: Await ICE response. If no reply in 15 min, call operator.`,
    ].join("\n"));
  } catch (err) {
    log.error({ err }, "Failed to escalate to ICE");
  }
}

// ── ICE contact detection ─────────────────────────────────────────────────────

async function detectIceContact(
  from: string,
): Promise<{ memberRow: typeof membersTable.$inferSelect; activeTrip: Awaited<ReturnType<typeof findActiveTrip>> } | null> {
  try {
    const [memberRow] = await db
      .select()
      .from(membersTable)
      .where(eq(membersTable.iceContactPhone, from))
      .limit(1);
    if (!memberRow) return null;
    const activeTrip = await findActiveTrip(memberRow.whatsappNumber);
    return { memberRow, activeTrip };
  } catch {
    return null;
  }
}

// ── ICE reply handler ─────────────────────────────────────────────────────────

async function handleIceReply(
  ctx: MenuContext,
  memberRow: typeof membersTable.$inferSelect,
  activeTrip: Awaited<ReturnType<typeof findActiveTrip>>,
): Promise<void> {
  const { from, to, body, messageSid, log } = ctx;
  const choice = body.trim();
  const memberName = memberRow.displayName;
  const ts = nowUtc();

  await saveMessage(from, to, body, messageSid, activeTrip?.id ?? null);

  const mirror = (extra: string[]) =>
    [
      `CYBER CHAPERONE — ICE UPDATE`,
      `Member: ${memberName}`,
      activeTrip ? `Trip: ${activeTrip.title} (ID: ${activeTrip.id})` : `Trip: No active trip`,
      ...extra,
    ].join("\n");

  if (choice === "1") {
    if (activeTrip) {
      await db
        .update(tripsTable)
        .set({
          iceEscalationStatus: "REPLIED",
          status: "green",
          currentRouteConfidence: "green",
          evidenceNotes: appendNote(activeTrip.evidenceNotes, `[${ts}] ICE REPLY: Contact confirmed member is okay.`),
          nextAction: "ICE confirmed member is okay. Continue monitoring.",
        })
        .where(eq(tripsTable.id, activeTrip.id));
    }
    await sendWhatsApp(from, to, `Thank you. We have noted that ${memberName} is okay. We will continue monitoring their trip.`);
    log.info({ memberName, tripId: activeTrip?.id }, "ICE reply: member okay");
    await sendOperatorMirror(to, mirror([`ICE response: Reached member — okay`, `Status: GREEN`, `Next action: Monitor. ICE confirmed okay.`]));
    return;
  }

  if (choice === "2") {
    if (activeTrip) {
      await db
        .update(tripsTable)
        .set({
          iceEscalationStatus: "REPLIED",
          status: "red",
          evidenceNotes: appendNote(activeTrip.evidenceNotes, `[${ts}] ICE REPLY: Contact confirmed member needs help.`),
          nextAction: "URGENT: ICE confirmed member needs help. Immediate human review.",
        })
        .where(eq(tripsTable.id, activeTrip.id));
    }
    await sendWhatsApp(from, to, `Thank you for confirming. We have marked this as urgent. The Situation Room has been notified.`);
    log.info({ memberName, tripId: activeTrip?.id }, "ICE reply: member needs help — RED");
    await sendOperatorMirror(to, mirror([`ICE response: Reached member — NEEDS HELP`, `Status: 🚨 RED`, `Next action: IMMEDIATE human review.`]));
    return;
  }

  if (choice === "3") {
    if (activeTrip) {
      await db
        .update(tripsTable)
        .set({
          iceEscalationStatus: "REPLIED",
          status: "amber",
          currentRouteConfidence: "amber",
          evidenceNotes: appendNote(activeTrip.evidenceNotes, `[${ts}] ICE REPLY: Could not reach member.`),
          nextAction: "AMBER: ICE could not reach member. Escalate to human review.",
        })
        .where(eq(tripsTable.id, activeTrip.id));
    }
    await sendWhatsApp(from, to, `Understood. Thank you for trying. We are escalating to human review. The Situation Room will follow up.`);
    log.info({ memberName, tripId: activeTrip?.id }, "ICE reply: could not reach member — AMBER");
    await sendOperatorMirror(to, mirror([`ICE response: Could NOT reach member`, `Status: ⚠️ AMBER`, `Next action: Immediate human review. Call member directly.`]));
    return;
  }

  if (choice === "4") {
    if (activeTrip) {
      await db
        .update(tripsTable)
        .set({
          iceEscalationStatus: "REPLIED",
          evidenceNotes: appendNote(activeTrip.evidenceNotes, `[${ts}] ICE REPLY: Requesting callback from Situation Room.`),
          nextAction: "ICE requesting callback from Situation Room.",
        })
        .where(eq(tripsTable.id, activeTrip.id));
    }
    await sendWhatsApp(from, to, `Noted. The Situation Room will contact you shortly.`);
    log.info({ memberName }, "ICE reply: requesting callback");
    await sendOperatorMirror(to, mirror([`ICE response: Please call me`, `ICE phone: ${from}`, `Next action: Call ICE contact immediately.`]));
    return;
  }

  await sendWhatsApp(from, to, [
    `Hi, this is Cyber Chaperone from eblockwatch.`,
    ``,
    `Please reply:`,
    `1. I reached them — they are okay`,
    `2. I reached them — they need help`,
    `3. I could not reach them`,
    `4. Please ask the Situation Room to call me`,
  ].join("\n"));
}

// ── Check-in flow handler ─────────────────────────────────────────────────────

async function handleCheckinChoice(ctx: MenuContext, state: ConvState): Promise<void> {
  const { from, to, body, member, messageSid, log } = ctx;
  const name = member?.displayName ?? from;
  const pending = state.pendingTripData ?? {};
  const choice = body.trim();
  const ts = nowUtc();

  let trip: typeof tripsTable.$inferSelect | null = null;
  if (pending.clarificationActiveTripId) {
    const [row] = await db.select().from(tripsTable).where(eq(tripsTable.id, pending.clarificationActiveTripId)).limit(1);
    trip = row ?? null;
  }
  if (!trip) trip = await findActiveTrip(from);

  await saveMessage(from, to, body, messageSid, trip?.id ?? null);

  if (choice === "0") {
    await resetConvState(from);
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    await sendWhatsApp(from, to, mainMenuText(name));
    return;
  }

  if (state.currentStep === STEP_WAITING_FOR_NEW_ETA) {
    const newEta = normaliseEta(choice);
    if (trip) {
      await db
        .update(tripsTable)
        .set({
          originalMemberEta: newEta,
          status: "green",
          currentRouteConfidence: "green",
          lastMemberCheckinTime: new Date(),
          etaDriftMinutes: 0,
          evidenceNotes: appendNote(trip.evidenceNotes, `[${ts}] ETA updated to ${newEta} (was ${trip.originalMemberEta ?? "unknown"})`),
          nextAction: "ETA updated. Monitoring continues.",
        })
        .where(eq(tripsTable.id, trip.id));
    }
    await resetConvState(from);
    await sendWhatsApp(from, to, `✅ ETA updated to ${newEta}. We will continue monitoring your trip.\n\nReply 0 for Main Menu.`);
    if (trip) {
      await sendOperatorMirror(to, [
        `CYBER CHAPERONE — ETA UPDATED`,
        `Member: ${name}`,
        `Trip: ${trip.title} (ID: ${trip.id})`,
        `New ETA: ${newEta}`,
        `Status: GREEN`,
      ].join("\n"));
    }
    return;
  }

  if (choice === "1") {
    if (trip) {
      await db
        .update(tripsTable)
        .set({
          status: "green",
          currentRouteConfidence: "green",
          lastMemberCheckinTime: new Date(),
          etaDriftMinutes: 0,
          evidenceNotes: appendNote(trip.evidenceNotes, `[${ts}] CHECK-IN: Member confirmed okay.`),
          nextAction: "Member checked in okay. Continue monitoring.",
        })
        .where(eq(tripsTable.id, trip.id));
    }
    await resetConvState(from);
    await sendWhatsApp(from, to, `✅ Check-in confirmed. We are still monitoring your trip.\n\nReply 0 for Main Menu.`);
    log.info({ from, tripId: trip?.id }, "Check-in: member okay");
    if (trip) {
      await sendOperatorMirror(to, [
        `CYBER CHAPERONE — CHECK-IN CONFIRMED`,
        `Member: ${name}`,
        `Trip: ${trip.title} (ID: ${trip.id})`,
        `Status: GREEN`,
        `Member: I am okay.`,
      ].join("\n"));
    }
    return;
  }

  if (choice === "2" || choice === "3") {
    if (trip) {
      await db
        .update(tripsTable)
        .set({ status: "amber", currentRouteConfidence: "amber" })
        .where(eq(tripsTable.id, trip.id));
    }
    await setConvState(from, { currentFlow: FLOW_CHECKIN, currentStep: STEP_WAITING_FOR_NEW_ETA, pendingTripData: pending });
    const reason = choice === "2" ? "you are delayed" : "your ETA has changed";
    await sendWhatsApp(from, to, `Understood — ${reason}.\n\nPlease send your new ETA.\n\nExample:\nETA 23:30\n\nReply 0 for Main Menu.`);
    return;
  }

  if (choice === "4") {
    if (trip) {
      await db
        .update(tripsTable)
        .set({
          status: "amber",
          currentRouteConfidence: "amber",
          lastMemberCheckinTime: new Date(),
          evidenceNotes: appendNote(trip.evidenceNotes, `[${ts}] CHECK-IN: Member has stopped.`),
          nextAction: "Member has stopped. Monitor closely.",
        })
        .where(eq(tripsTable.id, trip.id));
    }
    await resetConvState(from);
    await sendWhatsApp(from, to, `Understood. We have noted that you have stopped and will monitor closely.\n\nIf you move again, send your location pin 📍 or a message.\nReply 0 for Main Menu.`);
    log.info({ from, tripId: trip?.id }, "Check-in: member stopped — AMBER");
    if (trip) {
      await sendOperatorMirror(to, [
        `CYBER CHAPERONE — AMBER (MEMBER STOPPED)`,
        `Member: ${name}`,
        `Trip: ${trip.title} (ID: ${trip.id})`,
        `Status: ⚠️ AMBER`,
        `Member: I have stopped.`,
        `Next action: Monitor. Await next update.`,
      ].join("\n"));
    }
    return;
  }

  if (choice === "5") {
    if (trip) {
      await db.update(tripsTable).set({ status: "red", nextAction: "Immediate human review." }).where(eq(tripsTable.id, trip.id));
    }
    await resetConvState(from);
    await sendWhatsApp(from, to, `Help message received. Your trip has been flagged for immediate human review.`);
    return;
  }

  if (choice === "6") {
    if (trip) {
      await db.update(tripsTable).set({ lastMemberCheckinTime: new Date() }).where(eq(tripsTable.id, trip.id));
    }
    await resetConvState(from);
    await sendWhatsApp(from, to, `Please send your location pin 📍 and we will update your trip.\n\nReply 0 for Main Menu.`);
    return;
  }

  if (trip) {
    await sendCheckinPrompt(ctx, trip, trip.etaDriftMinutes ?? 15);
  } else {
    await sendWhatsApp(from, to, `Please reply with 1–6 or 0 for Main Menu.`);
  }
}

// ── Menu text builders ────────────────────────────────────────────────────────

function mainMenuText(name: string): string {
  return [
    `Hi ${name}, I'm AI Arnie, ${name}'s digital wingman.`,
    `You're on a Single Membership.`,
    `We are here to make you safer.`,
    ``,
    `1. What is eblockwatch?`,
    `2. Membership Options`,
    `3. Activate my membership`,
    `4. Update my profile`,
    `5. Travel with Cyber Chaperone`,
    `6. eblockshop — safer products to make you safer`,
    `7. Request contact from a human`,
    ``,
    `URGENT? Reply 10 for immediate human review.`,
    ``,
    `Reply with the number of your choice. Reply 0 for Main Menu.`,
  ].join("\n");
}

function ccMenuText(name: string): string {
  return [
    `${name}, Cyber Chaperone is your travel support link into eblockwatch.`,
    ``,
    `What do you want to do?`,
    ``,
    `1. Start a new trip`,
    `2. Update my current trip`,
    `3. Change my destination`,
    `4. I have arrived`,
    `5. I need help`,
    `6. How Cyber Chaperone works`,
    `7. Speak to Andre`,
    ``,
    `Reply 0 for Main Menu.`,
  ].join("\n");
}

function askForLocationText(name: string): string {
  return [
    `${name}, let's start your trip.`,
    ``,
    `Please send your current location pin 📍.`,
    `Reply 0 for Main Menu.`,
  ].join("\n");
}

function ccInfoText(name: string): string {
  return [
    `${name}, here's how Cyber Chaperone works:`,
    ``,
    `1. You start a trip by sending your location and destination.`,
    `2. We monitor your journey and keep your ICE contact informed.`,
    `3. Send updates along the way — delays, ETA changes, or your location pin.`,
    `4. When you arrive, send ARRIVED and we close the trip.`,
    `5. If you need help, send HELP or reply 5 from the Cyber Chaperone menu.`,
    ``,
    `Reply 0 for Main Menu.`,
  ].join("\n");
}

// ── START format parser ───────────────────────────────────────────────────────

function parseStartFormat(body: string): { startLocation: string; destination: string; eta: string } | null {
  const match = body.match(START_FORMAT);
  if (match) {
    return { startLocation: match[1].trim(), destination: match[2].trim(), eta: match[3].trim() };
  }
  return null;
}

// ── Distress handler ──────────────────────────────────────────────────────────

async function handleDistress(ctx: MenuContext, activeTrip: Awaited<ReturnType<typeof findActiveTrip>>): Promise<void> {
  const { from, to, body, member, messageSid, log } = ctx;
  const ts = nowUtc();
  const memberLabel = member?.displayName ?? from;

  if (activeTrip) {
    const note = appendNote(activeTrip.evidenceNotes, `[${ts}] DISTRESS received: "${excerpt(body)}"`);
    await db
      .update(tripsTable)
      .set({ status: "red", evidenceNotes: note, nextAction: "Immediate human review required." })
      .where(eq(tripsTable.id, activeTrip.id));
    await saveMessage(from, to, body, messageSid, activeTrip.id);
    log.info({ tripId: activeTrip.id }, "Trip escalated to RED — distress keyword (menu router)");
  } else {
    await saveMessage(from, to, body, messageSid, null);
    log.info({ from }, "Distress received — no active trip — RED mirror sent");
  }

  await sendWhatsApp(from, to, "Help message received. Stay as safe as possible. Your situation has been flagged RED for immediate human review.");

  await resetConvState(from);

  await sendOperatorMirror(
    to,
    [
      `🚨 CYBER CHAPERONE — RED`,
      `Member: ${memberLabel}`,
      `Known member: ${member?.isKnown ? "YES" : "NO"}`,
      activeTrip ? `Trip: ${activeTrip.title} (ID: ${activeTrip.id})` : `Trip: No active trip`,
      `Distress message: "${excerpt(body, 100)}"`,
      `Status: RED`,
      `Next action: Immediate human review required.`,
    ].join("\n"),
  );
}

// ── Arrival handler ───────────────────────────────────────────────────────────

async function handleArrival(ctx: MenuContext, activeTrip: Awaited<ReturnType<typeof findActiveTrip>>): Promise<void> {
  const { from, to, body, member, messageSid, log } = ctx;
  const ts = nowUtc();
  const memberLabel = member?.displayName ?? from;

  if (!activeTrip) {
    await saveMessage(from, to, body, messageSid, null);
    await sendWhatsApp(from, to, "Arrival noted, but there is no active trip open. Send Hi or 0 to start.");
    return;
  }

  const note = appendNote(activeTrip.evidenceNotes, `[${ts}] ARRIVAL confirmed: "${excerpt(body)}"`);
  await db
    .update(tripsTable)
    .set({ status: "completed", evidenceNotes: note })
    .where(eq(tripsTable.id, activeTrip.id));

  await saveMessage(from, to, body, messageSid, activeTrip.id);
  await resetConvState(from);

  await sendWhatsApp(from, to, "Arrival recorded. Your trip is now closed. Travel safe! 🟢");

  log.info({ tripId: activeTrip.id }, "Trip closed — arrival (menu router)");

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
  );
}

// ── Ambiguous destination handler ─────────────────────────────────────────────

async function handleAmbiguousDestination(
  ctx: MenuContext,
  activeTrip: NonNullable<Awaited<ReturnType<typeof findActiveTrip>>>,
  newDestination: string,
): Promise<void> {
  const { from, to, body, member, messageSid, log } = ctx;
  const memberLabel = member?.displayName ?? from;

  await saveMessage(from, to, body, messageSid, activeTrip.id);

  await setConvState(from, {
    currentFlow: FLOW_CLARIFICATION,
    currentStep: null,
    pendingTripData: {
      clarificationActiveTrip: activeTrip.title,
      clarificationActiveTripId: activeTrip.id,
      clarificationNewDestination: newDestination,
      clarificationOriginalMessage: body,
    },
  });

  await sendWhatsApp(
    from,
    to,
    [
      `${memberLabel}, I need to confirm what you mean.`,
      ``,
      `You already have an active trip:`,
      ``,
      `${activeTrip.title}`,
      ``,
      `Your message says you are going to:`,
      ``,
      `${newDestination}`,
      ``,
      `What must I do?`,
      ``,
      `1. Start a new trip`,
      `2. Change my current destination`,
      `3. Add this as a note only`,
      `4. Ignore this message`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"),
  );

  log.info({ tripId: activeTrip.id, newDestination }, "Ambiguous destination — clarification sent");

  await sendOperatorMirror(
    to,
    [
      `CYBER CHAPERONE — CLARIFICATION NEEDED`,
      `Member: ${memberLabel}`,
      `Known member: ${member?.isKnown ? "YES" : "NO"}`,
      `Current trip: ${activeTrip.title} (ID: ${activeTrip.id})`,
      `Message: "${excerpt(body, 120)}"`,
      `Reason: possible new destination or trip change`,
      `Status: AMBER`,
      `Next action: wait for member clarification`,
    ].join("\n"),
  );

  // Set trip to amber while waiting for clarification
  const ts = nowUtc();
  await db
    .update(tripsTable)
    .set({
      status: "amber",
      evidenceNotes: appendNote(activeTrip.evidenceNotes, `[${ts}] CLARIFICATION NEEDED: "${excerpt(body)}"`),
      nextAction: "Waiting for member clarification on destination.",
    })
    .where(eq(tripsTable.id, activeTrip.id));
}

// ── Clarification choice handler ──────────────────────────────────────────────

async function handleClarificationChoice(ctx: MenuContext, state: ConvState): Promise<void> {
  const { from, to, body, member, messageSid, log } = ctx;
  const name = member?.displayName ?? from;
  const pending = state.pendingTripData ?? {};
  const choice = body.trim();

  await saveMessage(from, to, body, messageSid, pending.clarificationActiveTripId ?? null);

  if (choice === "0") {
    await resetConvState(from);
    await sendWhatsApp(from, to, mainMenuText(name));
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    return;
  }

  if (choice === "1") {
    // Start new trip — ask for location
    await setConvState(from, {
      currentFlow: FLOW_TRIP_FLOW,
      currentStep: STEP_WAITING_FOR_START_LOCATION,
      pendingTripData: {},
    });
    await sendWhatsApp(from, to, askForLocationText(name));
    log.info({ from }, "Clarification: start new trip flow");
    return;
  }

  if (choice === "2") {
    // Change current destination — ask what the new destination is
    await setConvState(from, {
      currentFlow: FLOW_TRIP_FLOW,
      currentStep: "WAITING_FOR_NEW_DESTINATION",
      pendingTripData: { clarificationActiveTripId: pending.clarificationActiveTripId },
    });
    await sendWhatsApp(from, to, `What is the new destination?\nReply 0 for Main Menu.`);
    log.info({ from }, "Clarification: change destination flow");
    return;
  }

  if (choice === "3") {
    // Add as note only
    if (pending.clarificationActiveTripId) {
      const ts = nowUtc();
      const [trip] = await db
        .select()
        .from(tripsTable)
        .where(eq(tripsTable.id, pending.clarificationActiveTripId))
        .limit(1);
      if (trip) {
        await db
          .update(tripsTable)
          .set({
            status: "green",
            evidenceNotes: appendNote(trip.evidenceNotes, `[${ts}] NOTE: "${excerpt(pending.clarificationOriginalMessage ?? "", 120)}"`),
            nextAction: "Member confirmed message is a note only.",
          })
          .where(eq(tripsTable.id, trip.id));
      }
    }
    await resetConvState(from);
    await sendWhatsApp(from, to, "Noted. Your active trip continues unchanged. 🟢");
    log.info({ from }, "Clarification: added as note");
    return;
  }

  if (choice === "4") {
    // Ignore — restore trip to green
    if (pending.clarificationActiveTripId) {
      await db
        .update(tripsTable)
        .set({ status: "green", nextAction: "Member confirmed message should be ignored." })
        .where(eq(tripsTable.id, pending.clarificationActiveTripId));
    }
    await resetConvState(from);
    await sendWhatsApp(from, to, "Message ignored. Your active trip continues unchanged. 🟢");
    log.info({ from }, "Clarification: ignored");
    return;
  }

  // Unknown choice — repeat clarification
  await sendWhatsApp(
    from,
    to,
    [
      `Please reply with a number:`,
      `1. Start a new trip`,
      `2. Change my current destination`,
      `3. Add this as a note only`,
      `4. Ignore this message`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"),
  );
}

// ── Trip flow step handler ────────────────────────────────────────────────────

async function handleTripFlowStep(ctx: MenuContext, state: ConvState): Promise<void> {
  const { from, to, body, member, messageSid, latitude, longitude, address, label, log } = ctx;
  const name = member?.displayName ?? from;
  const pending: PendingTripData = state.pendingTripData ?? {};
  const step = state.currentStep;

  await saveMessage(from, to, body, messageSid, null);

  if (body.trim() === "0") {
    await resetConvState(from);
    await sendWhatsApp(from, to, mainMenuText(name));
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    return;
  }

  // Handle "change destination" sub-flow
  if (step === "WAITING_FOR_NEW_DESTINATION") {
    const tripId = pending.clarificationActiveTripId;
    if (tripId) {
      const [trip] = await db.select().from(tripsTable).where(eq(tripsTable.id, tripId)).limit(1);
      if (trip) {
        const newDest = body.trim();
        const newTitle = `${trip.title.split("→")[0].trim()} → ${newDest}`;
        const ts = nowUtc();
        await db
          .update(tripsTable)
          .set({
            title: newTitle,
            status: "green",
            evidenceNotes: appendNote(trip.evidenceNotes, `[${ts}] DESTINATION CHANGED to: ${newDest}`),
            nextAction: "Destination updated. Monitoring continues.",
          })
          .where(eq(tripsTable.id, tripId));
        await sendWhatsApp(from, to, `Destination updated to ${newDest}. Your trip continues. 🟢\n\nReply 0 for Main Menu.`);
        await sendOperatorMirror(to, [
          `CYBER CHAPERONE — DESTINATION CHANGED`,
          `Member: ${name}`,
          `Trip ID: ${tripId}`,
          `New title: ${newTitle}`,
          `Status: GREEN`,
        ].join("\n"));
        log.info({ tripId, newDest }, "Destination changed via clarification flow");
      }
    }
    await resetConvState(from);
    return;
  }

  if (step === STEP_WAITING_FOR_START_LOCATION) {
    const hasPin = latitude !== "" && longitude !== "";
    const startLocation = hasPin
      ? ([label, address].filter(Boolean).join(", ") || `${latitude},${longitude}`)
      : body.trim();

    const updatedPending: PendingTripData = {
      ...pending,
      startLocation,
      ...(hasPin ? { startLat: latitude, startLon: longitude } : {}),
    };

    await setConvState(from, {
      currentFlow: FLOW_TRIP_FLOW,
      currentStep: STEP_WAITING_FOR_DESTINATION,
      pendingTripData: updatedPending,
    });

    await sendWhatsApp(
      from,
      to,
      `Got it — I have your starting location.\n\nWhere are you heading to?\nReply 0 for Main Menu.`,
    );
    log.info({ from, startLocation }, "Trip flow: start location collected");
    return;
  }

  if (step === STEP_WAITING_FOR_DESTINATION) {
    const destination = body.trim();
    const updatedPending: PendingTripData = { ...pending, destination };
    await setConvState(from, {
      currentFlow: FLOW_TRIP_FLOW,
      currentStep: STEP_WAITING_FOR_ETA,
      pendingTripData: updatedPending,
    });
    await sendWhatsApp(
      from,
      to,
      `Got it — your destination is ${destination}.\n\nPlease send your ETA.\n\nExample:\nETA 23:30\n\nReply 0 for Main Menu.`,
    );
    log.info({ from, destination }, "Trip flow: destination collected");
    return;
  }

  if (step === STEP_WAITING_FOR_ETA) {
    const eta = body.trim();
    const updatedPending: PendingTripData = { ...pending, eta };

    if (!updatedPending.startLocation || !updatedPending.destination) {
      await resetConvState(from);
      await sendWhatsApp(from, to, `Something went wrong collecting your trip details. Please start again.\n\nReply 0 for Main Menu.`);
      return;
    }

    log.info({ from, pendingTripData: updatedPending }, "Trip flow: all fields collected — creating trip");
    await createTrip(
      from, to, member,
      updatedPending.startLocation,
      updatedPending.destination,
      updatedPending.eta ?? null,
      body, messageSid, log,
    );
    return;
  }

  // Unknown step — reset
  await resetConvState(from);
  await sendWhatsApp(from, to, mainMenuText(name));
  await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
}

// ── CC menu choice handler ────────────────────────────────────────────────────

async function handleCCChoice(ctx: MenuContext, state: ConvState): Promise<boolean> {
  const { from, to, body, member, messageSid, log } = ctx;
  const name = member?.displayName ?? from;
  const choice = body.trim();

  if (choice === "0") {
    await resetConvState(from);
    await sendWhatsApp(from, to, mainMenuText(name));
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    await saveMessage(from, to, body, messageSid, null);
    return true;
  }

  if (choice === "1") {
    await setConvState(from, {
      currentFlow: FLOW_TRIP_FLOW,
      currentStep: STEP_WAITING_FOR_START_LOCATION,
      pendingTripData: {},
    });
    await sendWhatsApp(from, to, askForLocationText(name));
    await saveMessage(from, to, body, messageSid, null);
    log.info({ from }, "CC menu: start trip flow");
    return true;
  }

  if (choice === "2") {
    const activeTrip = await findActiveTrip(from);
    await saveMessage(from, to, body, messageSid, activeTrip?.id ?? null);
    if (!activeTrip) {
      await sendWhatsApp(from, to, `You have no active trip. Start one first.\n\n${ccMenuText(name)}`);
    } else {
      await sendWhatsApp(from, to, `Your current trip: ${activeTrip.title} — Status: ${activeTrip.status.toUpperCase()}\n\nSend an update now, or reply 0 for Main Menu.`);
    }
    return true;
  }

  if (choice === "3") {
    const activeTrip = await findActiveTrip(from);
    await saveMessage(from, to, body, messageSid, activeTrip?.id ?? null);
    if (!activeTrip) {
      await sendWhatsApp(from, to, `You have no active trip. Start one first.\n\n${ccMenuText(name)}`);
    } else {
      await setConvState(from, {
        currentFlow: FLOW_TRIP_FLOW,
        currentStep: "WAITING_FOR_NEW_DESTINATION",
        pendingTripData: { clarificationActiveTripId: activeTrip.id },
      });
      await sendWhatsApp(from, to, `What is the new destination?\nReply 0 for Main Menu.`);
    }
    return true;
  }

  if (choice === "4") {
    const activeTrip = await findActiveTrip(from);
    await handleArrival(ctx, activeTrip);
    return true;
  }

  if (choice === "5") {
    const activeTrip = await findActiveTrip(from);
    await handleDistress(ctx, activeTrip);
    return true;
  }

  if (choice === "6") {
    await saveMessage(from, to, body, messageSid, null);
    await sendWhatsApp(from, to, ccInfoText(name));
    return true;
  }

  if (choice === "7") {
    await saveMessage(from, to, body, messageSid, null);
    await sendWhatsApp(
      from,
      to,
      `${name}, a human from eblockwatch will contact you shortly.\n\nIf this is urgent, reply 10 or send HELP.\n\nReply 0 for Main Menu.`,
    );
    await sendOperatorMirror(to, [
      `CYBER CHAPERONE — CONTACT REQUEST`,
      `Member: ${name}`,
      `Known member: ${member?.isKnown ? "YES" : "NO"}`,
      `Next action: Member requests human contact. Call or WhatsApp directly.`,
    ].join("\n"));
    return true;
  }

  if (choice === "10") {
    const activeTrip = await findActiveTrip(from);
    await saveMessage(from, to, body, messageSid, activeTrip?.id ?? null);
    await sendWhatsApp(from, to, `Immediate human review requested. eblockwatch has been notified. Stay safe.`);
    await sendOperatorMirror(to, [
      `🚨 CYBER CHAPERONE — IMMEDIATE HUMAN REVIEW`,
      `Member: ${name}`,
      `Known member: ${member?.isKnown ? "YES" : "NO"}`,
      activeTrip ? `Trip: ${activeTrip.title} (ID: ${activeTrip.id})` : `Trip: None`,
      `Next action: Call member immediately.`,
    ].join("\n"));
    return true;
  }

  return false;
}

// ── Main menu choice handler ──────────────────────────────────────────────────

async function handleMainMenuChoice(ctx: MenuContext, state: ConvState): Promise<boolean> {
  const { from, to, body, member, messageSid, log } = ctx;
  const name = member?.displayName ?? from;
  const choice = body.trim();

  if (choice === "5" || CC_KEYWORDS.test(body)) {
    await setConvState(from, { currentFlow: FLOW_CYBER_CHAPERONE, currentStep: null, pendingTripData: null });
    await sendWhatsApp(from, to, ccMenuText(name));
    await saveMessage(from, to, body, messageSid, null);
    log.info({ from }, "Menu: CC menu shown");
    return true;
  }

  if (choice === "1") {
    await saveMessage(from, to, body, messageSid, null);
    await sendWhatsApp(from, to, [
      `eblockwatch is a private safety and security network.`,
      `We connect you to a community of verified members and rapid response partners.`,
      `Our mission: make you safer at home, at work, and on the road.`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    return true;
  }

  if (choice === "2") {
    await saveMessage(from, to, body, messageSid, null);
    await sendWhatsApp(from, to, [
      `Membership Options:`,
      `• Single Membership`,
      `• Family Membership`,
      `• Business Membership`,
      ``,
      `For full details, visit eblockwatch.com or request a human (reply 7).`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    return true;
  }

  if (choice === "3") {
    await saveMessage(from, to, body, messageSid, null);
    await sendWhatsApp(from, to, `To activate your membership, please contact eblockwatch directly or reply 7 to request a human.\n\nReply 0 for Main Menu.`);
    return true;
  }

  if (choice === "4") {
    await saveMessage(from, to, body, messageSid, null);
    await sendWhatsApp(from, to, `To update your profile, please reply 7 to request a human who will assist you.\n\nReply 0 for Main Menu.`);
    return true;
  }

  if (choice === "6") {
    await saveMessage(from, to, body, messageSid, null);
    await sendWhatsApp(from, to, `eblockshop carries safety products vetted by eblockwatch.\nVisit eblockwatch.com/shop for the full range.\n\nReply 0 for Main Menu.`);
    return true;
  }

  if (choice === "7") {
    await saveMessage(from, to, body, messageSid, null);
    await sendWhatsApp(from, to, `A human from eblockwatch will contact you shortly.\n\nIf this is urgent, reply 10.\n\nReply 0 for Main Menu.`);
    await sendOperatorMirror(to, [
      `CYBER CHAPERONE — CONTACT REQUEST`,
      `Member: ${name}`,
      `Known member: ${member?.isKnown ? "YES" : "NO"}`,
      `Next action: Member requests human contact.`,
    ].join("\n"));
    return true;
  }

  if (choice === "10") {
    const activeTrip = await findActiveTrip(from);
    await saveMessage(from, to, body, messageSid, activeTrip?.id ?? null);
    await sendWhatsApp(from, to, `Immediate human review requested. eblockwatch has been notified. Stay safe.`);
    await sendOperatorMirror(to, [
      `🚨 CYBER CHAPERONE — IMMEDIATE HUMAN REVIEW`,
      `Member: ${name}`,
      `Known member: ${member?.isKnown ? "YES" : "NO"}`,
      activeTrip ? `Trip: ${activeTrip.title} (ID: ${activeTrip.id})` : `Trip: None`,
      `Next action: Call member immediately.`,
    ].join("\n"));
    return true;
  }

  return false;
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function handleMenuRouter(ctx: MenuContext): Promise<MenuResult> {
  const { body, from, to, member, messageSid, log, latitude, longitude } = ctx;
  const name = member?.displayName ?? from;
  const trimmed = body.trim();

  // 0. ICE contact detection — runs before all other handlers
  const iceCtx = await detectIceContact(from);
  if (iceCtx) {
    await handleIceReply(ctx, iceCtx.memberRow, iceCtx.activeTrip);
    log.info({ from }, "Menu router: ICE contact reply handler");
    return { handled: true };
  }

  // 1. PRIORITY: Distress — always handled first
  if (isDistress(trimmed)) {
    const activeTrip = await findActiveTrip(from);
    await handleDistress(ctx, activeTrip);
    if (activeTrip && member?.isKnown) {
      try {
        const [mr] = await db.select().from(membersTable).where(eq(membersTable.whatsappNumber, from)).limit(1);
        if (mr?.iceContactPhone && !activeTrip.iceEscalationStatus) {
          await escalateToIce(ctx, mr, activeTrip);
        }
      } catch { /* best-effort */ }
    }
    log.info({ from }, "Menu router: distress priority handler");
    return { handled: true };
  }

  // 2. PRIORITY: Arrival — always handled second
  if (isArrival(trimmed)) {
    const activeTrip = await findActiveTrip(from);
    await handleArrival(ctx, activeTrip);
    log.info({ from }, "Menu router: arrival priority handler");
    return { handled: true };
  }

  // 3. Main menu reset trigger
  if (MAIN_MENU_TRIGGER.test(trimmed)) {
    await resetConvState(from);
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    await sendWhatsApp(from, to, mainMenuText(name));
    await saveMessage(from, to, body, messageSid, null);
    log.info({ from }, "Menu router: main menu shown");
    return { handled: true };
  }

  // 4. Conversation state routing
  const state = await getConvState(from);
  log.info({ from, currentFlow: state.currentFlow, currentStep: state.currentStep }, "Menu router: conv state");

  if (state.currentFlow === FLOW_TRIP_FLOW) {
    await handleTripFlowStep(ctx, state);
    return { handled: true };
  }

  if (state.currentFlow === FLOW_CLARIFICATION) {
    await handleClarificationChoice(ctx, state);
    return { handled: true };
  }

  if (state.currentFlow === FLOW_CHECKIN) {
    await handleCheckinChoice(ctx, state);
    return { handled: true };
  }

  if (state.currentFlow === FLOW_CYBER_CHAPERONE) {
    const handled = await handleCCChoice(ctx, state);
    if (handled) return { handled: true };
    // Unrecognised input in CC menu — repeat CC menu
    await saveMessage(from, to, body, messageSid, null);
    await sendWhatsApp(from, to, ccMenuText(name));
    return { handled: true };
  }

  // 5. Main menu numeric choices (when in MAIN_MENU flow or no flow)
  if (state.currentFlow === FLOW_MAIN_MENU || state.currentFlow === null) {
    const handled = await handleMainMenuChoice(ctx, state);
    if (handled) return { handled: true };
  }

  // 6. START structured parser
  const startParsed = parseStartFormat(trimmed);
  if (startParsed) {
    await createTrip(
      from, to, member,
      startParsed.startLocation,
      startParsed.destination,
      startParsed.eta,
      body, messageSid, log,
    );
    log.info({ from }, "Menu router: START format trip created");
    return { handled: true };
  }

  // Fetch active trip once for the remaining checks
  const activeTrip = await findActiveTrip(from);

  // 7. ETA drift monitoring — reactive check on every unhandled message
  if (member?.isKnown && activeTrip?.originalMemberEta && activeTrip.status !== "completed" && activeTrip.status !== "red") {
    const drift = calculateEtaDrift(activeTrip.originalMemberEta, activeTrip.createdAt);
    if (drift !== null && drift > 0) {
      await db.update(tripsTable).set({ etaDriftMinutes: drift }).where(eq(tripsTable.id, activeTrip.id)).catch(() => {});
      if (drift >= 45 && !activeTrip.iceEscalationStatus) {
        try {
          const [mr] = await db.select().from(membersTable).where(eq(membersTable.whatsappNumber, from)).limit(1);
          if (mr?.iceContactPhone) {
            await db.update(tripsTable).set({ status: "amber", currentRouteConfidence: "amber" }).where(eq(tripsTable.id, activeTrip.id)).catch(() => {});
            await escalateToIce(ctx, mr, activeTrip);
          }
        } catch { /* best-effort */ }
      }
      if (drift >= 15 && state.currentFlow !== FLOW_CHECKIN && shouldSendCheckin(activeTrip)) {
        await sendCheckinPrompt(ctx, activeTrip, drift);
        await setConvState(from, {
          currentFlow: FLOW_CHECKIN,
          currentStep: null,
          pendingTripData: { clarificationActiveTripId: activeTrip.id },
        });
        await saveMessage(from, to, body, messageSid, activeTrip.id);
        log.info({ from, drift, tripId: activeTrip.id }, "ETA drift check-in sent");
        return { handled: true };
      }
    }
  }

  // 8. Ambiguous destination guard — only when member has an active trip
  if (activeTrip) {
    const ambMatch = trimmed.match(AMBIGUOUS_DEST_PATTERN);
    if (ambMatch) {
      const newDestination = ambMatch[2].trim();
      await handleAmbiguousDestination(ctx, activeTrip, newDestination);
      return { handled: true };
    }
  }

  // 9. Pass through to existing webhook trip-start parser and follow-up classifier
  log.info({ from, currentFlow: state.currentFlow }, "Menu router: passing through to existing handlers");
  return { handled: false };
}
