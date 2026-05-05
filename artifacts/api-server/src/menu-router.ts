import { db, membersTable, tripsTable, messagesTable, conversationStatesTable } from "@workspace/db";
import { and, eq, ne, desc } from "drizzle-orm";
import twilio from "twilio";
import { enrichTripWithRoute } from "./route-service.js";
import { withMenu } from "./message-utils.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MemberInfo {
  displayName: string;
  role: string | null;
  memberStatus: string;
  membershipTier: string | null;
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
const FLOW_MEMBERSHIP = "MEMBERSHIP";
const STEP_WAITING_FOR_PAYMENT_CONFIRMATION = "WAITING_FOR_PAYMENT_CONFIRMATION";
const FLOW_PROFILE_UPDATE = "PROFILE_UPDATE";
const STEP_WAITING_FOR_ICE = "WAITING_FOR_ICE";
const FLOW_EBLOCKWATCH_INFO = "EBLOCKWATCH_INFO";

// ── Keyword detectors ─────────────────────────────────────────────────────────

const MAIN_MENU_TRIGGER = /^(hi|hello|menu|main menu|start|0)$/i;
const GLOBAL_MENU_OVERRIDE = /^(hi|hello|menu|main menu|start|0|join)$/i;
const JOIN_PREFIX = /^join\s+/i;
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

  void enrichTripWithRoute(newTrip.id, startLocation, destination, log);

  await saveMessage(from, to, body, messageSid, newTrip.id);

  const name = member?.displayName ?? from;
  await sendWhatsApp(
    from,
    to,
    [
      `${name}, your Cyber Chaperone trip is active.`,
      ``,
      `Route: ${startLocation} → ${destination}`,
      eta ? `ETA: ${normaliseEta(eta)}` : null,
      `Status: GREEN`,
      ``,
      `For stronger backup, you can also share:`,
      ``,
      `1. Your WhatsApp live location to the Situation Room`,
      `2. Your Waze / Google Maps route link`,
      `3. Updates if your ETA changes`,
      ``,
      `We are monitoring your journey.`,
      ``,
      `Reply 4 when you arrive.`,
      `Reply 5 if you need help.`,
      `Reply 0 for Main Menu.`,
    ].filter((l) => l !== null).join("\n"),
  );

  log.info(
    { tripId: newTrip.id, title, startLocation, destination, eta, isKnownMember: member?.isKnown ?? false },
    "New trip created from menu flow",
  );

  await sendOperatorMirror(
    to,
    [
      `CYBER CHAPERONE — NEW TRIP`,
      ``,
      `Member: ${member?.displayName ?? from}`,
      `Known member: ${member?.isKnown ? "YES" : "NO"}`,
      `Trip: ${title}${etaNote}`,
      `Trip ID: ${newTrip.id}`,
      `Status: GREEN`,
      ``,
      `Location layers:`,
      `1. Situation Room trip monitor: ACTIVE`,
      `2. WhatsApp live location backup: PENDING`,
      `3. Waze / Google Maps route link: PENDING`,
      ``,
      `ETA bullseye: ${eta ?? "not set"}`,
      `Next action: Monitor route and checkpoint behaviour.`,
    ].join("\n"),
  );

  await resetConvState(from);
}

// ── Check-in text ─────────────────────────────────────────────────────────────

function checkinText(name: string, driftMin: number, tripTitle: string, checkpointLabel?: string): string {
  const prompt = checkpointLabel
    ? `Route checkpoint — ${checkpointLabel}.`
    : `Your ETA appears to have shifted — ${driftMin} minute${driftMin === 1 ? "" : "s"} past expected arrival.`;
  return [
    `${name}, Cyber Chaperone check-in.`,
    ``,
    prompt,
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
  checkpointLabel?: string,
): Promise<void> {
  const name = ctx.member?.displayName ?? ctx.from;
  await sendWhatsApp(ctx.from, ctx.to, checkinText(name, driftMin, trip.title, checkpointLabel));
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
    await sendWhatsApp(from, to, mainMenuText(name, member));
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
    await sendWhatsApp(from, to, `Understood. We have noted that you have stopped and will monitor closely.\n\nIf you move again, send your location pin 📍 or a message.\n\nReply 0 for Main Menu.`);
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
    await sendWhatsApp(from, to, [
      `${name}, I have marked this for immediate human review.`,
      ``,
      `The Situation Room has been notified.`,
      ``,
      `Please reply with one number:`,
      ``,
      `1. I am in danger`,
      `2. I have broken down`,
      `3. I am lost`,
      `4. Medical issue`,
      `5. Call me`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    if (trip) {
      await sendOperatorMirror(to, [
        `🚨 CYBER CHAPERONE — RED`,
        `Member: ${name}`,
        `Trip: ${trip.title} (ID: ${trip.id})`,
        `Reason: Member requested help from check-in`,
        `Status: RED`,
        `Next action: Immediate human review required.`,
      ].join("\n"));
    }
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

function membershipStatusLine(memberStatus: string, membershipTier: string | null): string {
  if (membershipTier) return `You're on a ${membershipTier}.`;
  if (memberStatus === "pending") return `Your eblockwatch membership is being confirmed.`;
  return `Your eblockwatch membership status is not confirmed yet.`;
}

function mainMenuText(name: string, member: MemberInfo | null): string {
  const statusLine = membershipStatusLine(
    member?.memberStatus ?? "unknown",
    member?.membershipTier ?? null,
  );
  return [
    `Hi ${name}, I'm AI Arnie, Andre Snyman's digital wingman.`,
    ``,
    statusLine,
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

function membershipActivationText(name: string): string {
  return [
    `${name}, let's get your membership activated.`,
    ``,
    `1. Entry Level — free`,
    `2. Single Membership — R150/month`,
    `3. Family Membership — R250/month`,
    ``,
    `Reply with the number of your choice.`,
    `Reply 0 for Main Menu.`,
  ].join("\n");
}

async function handleMembershipChoice(ctx: MenuContext): Promise<void> {
  const { from, to, body, member, messageSid } = ctx;
  const name = member?.displayName ?? from;
  const choice = body.trim();

  await saveMessage(from, to, body, messageSid, null);

  if (choice === "0") {
    await resetConvState(from);
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    await sendWhatsApp(from, to, mainMenuText(name, member));
    return;
  }

  // ── Payment confirmation sub-step ─────────────────────────────────────────
  const state = await getConvState(from);
  if (state.currentStep === STEP_WAITING_FOR_PAYMENT_CONFIRMATION) {
    const tier = state.pendingTripData?.reason ?? "membership";
    if (choice === "1") {
      // Member says they have finalised payment
      await resetConvState(from);
      await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
      await sendWhatsApp(from, to, [
        `Thank you, ${name}. We will check your membership confirmation and update your profile.`,
        ``,
        `Reply 0 for Main Menu.`,
      ].join("\n"));
      await sendOperatorMirror(to, [
        `CYBER CHAPERONE — MEMBERSHIP PAYMENT CLAIMED`,
        `Member: ${name}`,
        `Known member: ${member?.isKnown ? "YES" : "NO"}`,
        `Tier: ${tier}`,
        `Next action: Verify Paystack payment and update membershipTier in database.`,
      ].join("\n"));
      return;
    }
    if (choice === "2") {
      await resetConvState(from);
      await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
      await sendWhatsApp(from, to, `A human from eblockwatch will contact you shortly.\n\nIf this is urgent, reply 10.\n\nReply 0 for Main Menu.`);
      await sendOperatorMirror(to, [
        `CYBER CHAPERONE — MEMBERSHIP HELP REQUEST`,
        `Member: ${name}`,
        `Known member: ${member?.isKnown ? "YES" : "NO"}`,
        `Tier attempted: ${tier}`,
        `Next action: Member needs help with membership activation.`,
      ].join("\n"));
      return;
    }
    // Unknown — repeat
    await sendWhatsApp(from, to, `Please reply:\n\n1. I have finalised my membership\n2. I need help\n\nReply 0 for Main Menu.`);
    return;
  }

  // ── Activation menu choices ───────────────────────────────────────────────
  if (choice === "1") {
    // Entry Level — free
    await resetConvState(from);
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    await sendWhatsApp(from, to, [
      `${name}, you are registered at Entry Level — your starting point in eblockwatch.`,
      ``,
      `Your profile is active. When you are ready to upgrade, reply 3 from the Main Menu.`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    await sendOperatorMirror(to, [
      `CYBER CHAPERONE — ENTRY LEVEL SELECTED`,
      `Member: ${name}`,
      `Known member: ${member?.isKnown ? "YES" : "NO"}`,
      `Next action: Confirm entry level registration in member profile.`,
    ].join("\n"));
    return;
  }

  if (choice === "2") {
    // Single Membership
    await setConvState(from, {
      currentFlow: FLOW_MEMBERSHIP,
      currentStep: STEP_WAITING_FOR_PAYMENT_CONFIRMATION,
      pendingTripData: { reason: "Single Membership" },
    });
    await sendWhatsApp(from, to, [
      `${name}, to finalise your Single Membership, please use this secure link:`,
      ``,
      `https://paystack.shop/pay/cyber-chaperone`,
      ``,
      `Once complete, reply:`,
      ``,
      `1. I have finalised my membership`,
      `2. I need help`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    return;
  }

  if (choice === "3") {
    // Family Membership
    await setConvState(from, {
      currentFlow: FLOW_MEMBERSHIP,
      currentStep: STEP_WAITING_FOR_PAYMENT_CONFIRMATION,
      pendingTripData: { reason: "Family Membership" },
    });
    await sendWhatsApp(from, to, [
      `${name}, to finalise your Family Membership, please use this secure link:`,
      ``,
      `https://paystack.shop/pay/family-cyber-chaperone`,
      ``,
      `Once complete, reply:`,
      ``,
      `1. I have finalised my membership`,
      `2. I need help`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    return;
  }

  // Unknown choice — repeat the membership menu
  await sendWhatsApp(from, to, membershipActivationText(name));
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
    ``,
    `Reply 0 for Main Menu.`,
  ].join("\n");
}

function ccInfoText(name: string): string {
  return [
    `${name}, here's how Cyber Chaperone works:`,
    ``,
    `1. You start a trip by sending your location and destination.`,
    `2. We monitor your journey and the Situation Room watches over you.`,
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

  await sendWhatsApp(from, to, [
    `${memberLabel}, I have marked this for immediate human review.`,
    ``,
    `The Situation Room has been notified.`,
    ``,
    `Please reply with one number:`,
    ``,
    `1. I am in danger`,
    `2. I have broken down`,
    `3. I am lost`,
    `4. Medical issue`,
    `5. Call me`,
    ``,
    `Reply 0 for Main Menu.`,
  ].join("\n"));

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
    await sendWhatsApp(from, to, "Arrival noted, but there is no active trip open.\n\nReply 0 for Main Menu.");
    return;
  }

  const note = appendNote(activeTrip.evidenceNotes, `[${ts}] ARRIVAL confirmed: "${excerpt(body)}"`);
  await db
    .update(tripsTable)
    .set({ status: "completed", evidenceNotes: note })
    .where(eq(tripsTable.id, activeTrip.id));

  await saveMessage(from, to, body, messageSid, activeTrip.id);
  await resetConvState(from);

  await sendWhatsApp(from, to, [
    `${memberLabel}, confirmed.`,
    ``,
    `Your trip has been closed as arrived safely.`,
    ``,
    `Status: COMPLETED`,
    ``,
    `Reply 0 for Main Menu.`,
  ].join("\n"));

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
    await sendWhatsApp(from, to, mainMenuText(name, member));
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
    await sendWhatsApp(from, to, "Noted. Your active trip continues unchanged. 🟢\n\nReply 0 for Main Menu.");
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
    await sendWhatsApp(from, to, "Message ignored. Your active trip continues unchanged. 🟢\n\nReply 0 for Main Menu.");
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
    await sendWhatsApp(from, to, mainMenuText(name, member));
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
      `Got it — I have your starting location.\n\nWhere are you heading to?\n\nReply 0 for Main Menu.`,
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
  await sendWhatsApp(from, to, mainMenuText(name, member));
  await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
}

// ── CC menu choice handler ────────────────────────────────────────────────────

async function handleCCChoice(ctx: MenuContext, state: ConvState): Promise<boolean> {
  const { from, to, body, member, messageSid, log } = ctx;
  const name = member?.displayName ?? from;
  const choice = body.trim();

  if (choice === "0") {
    await resetConvState(from);
    await sendWhatsApp(from, to, mainMenuText(name, member));
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
      await sendWhatsApp(from, to, `What is the new destination?\n\nReply 0 for Main Menu.`);
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
      `${name}, a human from eblockwatch will contact you.\n\nIf this is urgent, reply 10 or send HELP.\n\nReply 0 for Main Menu.`,
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
    if (activeTrip) {
      await db.update(tripsTable).set({ status: "red", nextAction: "Immediate human review." }).where(eq(tripsTable.id, activeTrip.id));
    }
    await resetConvState(from);
    await sendWhatsApp(from, to, [
      `${name}, I have marked this for immediate human review.`,
      ``,
      `The Situation Room has been notified.`,
      ``,
      `Please reply with one number:`,
      ``,
      `1. I am in danger`,
      `2. I have broken down`,
      `3. I am lost`,
      `4. Medical issue`,
      `5. Call me`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    await sendOperatorMirror(to, [
      `🚨 CYBER CHAPERONE — IMMEDIATE HUMAN REVIEW`,
      `Member: ${name}`,
      `Known member: ${member?.isKnown ? "YES" : "NO"}`,
      activeTrip ? `Trip: ${activeTrip.title} (ID: ${activeTrip.id})` : `Trip: None`,
      `Status: RED`,
      `Next action: Call member immediately.`,
    ].join("\n"));
    return true;
  }

  return false;
}

// ── eblockwatch info sub-menu handler ────────────────────────────────────────
// Handles replies from the "What is eblockwatch?" sub-menu (options 1–4)

async function handleEblockwatchInfoChoice(ctx: MenuContext): Promise<void> {
  const { from, to, body, member, messageSid } = ctx;
  const name = member?.displayName ?? from;
  const choice = body.trim();

  await saveMessage(from, to, body, messageSid, null);

  if (choice === "0") {
    await resetConvState(from);
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    await sendWhatsApp(from, to, mainMenuText(name, member));
    return;
  }

  if (choice === "1") {
    // Membership Options — same as main menu option 2
    await resetConvState(from);
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    await sendWhatsApp(from, to, [
      `${name}, here are your eblockwatch membership options.`,
      ``,
      `• Entry Level — your starting point in eblockwatch`,
      `• Single Membership — R150/month`,
      `• Family Membership — R250/month`,
      ``,
      `The stronger your membership, the stronger your support layer.`,
      ``,
      `Reply 3 to activate your membership.`,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    return;
  }

  if (choice === "2") {
    // Update my profile
    await setConvState(from, { currentFlow: FLOW_PROFILE_UPDATE, currentStep: null });
    await sendWhatsApp(from, to, [
      `${name}, your profile helps the Situation Room support you properly.`,
      ``,
      `What would you like to update?`,
      ``,
      `1. My personal details`,
      `2. My home location`,
      `3. My vehicle details`,
      `4. My ICE contact`,
      `5. My family members`,
      `6. My local network / conduit details`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    return;
  }

  if (choice === "3") {
    // Travel with Cyber Chaperone
    await setConvState(from, { currentFlow: FLOW_CYBER_CHAPERONE, currentStep: null, pendingTripData: null });
    await sendWhatsApp(from, to, ccMenuText(name));
    return;
  }

  if (choice === "4") {
    // eblockshop
    await resetConvState(from);
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    await sendWhatsApp(from, to, [
      `${name}, eblockshop is where you find safer products to make you safer.`,
      ``,
      `Coming soon — we will notify you when it is ready.`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    return;
  }

  // Unknown — repeat the sub-menu
  await sendWhatsApp(from, to, [
    `Please reply with a number:`,
    ``,
    `1. Membership Options`,
    `2. Update my profile`,
    `3. Travel with Cyber Chaperone`,
    `4. eblockshop — safer products to make you safer`,
    ``,
    `Reply 0 for Main Menu.`,
  ].join("\n"));
}

// ── Profile update handler ────────────────────────────────────────────────────

async function handleProfileUpdateChoice(ctx: MenuContext, state: ConvState): Promise<void> {
  const { from, to, body, member, messageSid } = ctx;
  const name = member?.displayName ?? from;
  const choice = body.trim();

  await saveMessage(from, to, body, messageSid, null);

  if (choice === "0") {
    await resetConvState(from);
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    await sendWhatsApp(from, to, mainMenuText(name, member));
    return;
  }

  // ICE contact step — waiting for "ICE: Name, Number" message
  if (state.currentStep === STEP_WAITING_FOR_ICE) {
    const icePattern = /^ICE:\s*(.+?),\s*(\+?[\d\s]+)$/i;
    const match = body.trim().match(icePattern);
    if (match) {
      const iceName = match[1].trim();
      const icePhone = match[2].replace(/\s/g, "");
      try {
        await db
          .update(membersTable)
          .set({ iceContactName: iceName, iceContactPhone: icePhone })
          .where(eq(membersTable.whatsappNumber, from));
      } catch {
        // best-effort
      }
      await resetConvState(from);
      await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
      await sendWhatsApp(from, to, [
        `${name}, your ICE contact has been updated.`,
        ``,
        `Name: ${iceName}`,
        `Number: ${icePhone}`,
        ``,
        `Your ICE contact is only contacted when escalation rules are met.`,
        ``,
        `Reply 0 for Main Menu.`,
      ].join("\n"));
      await sendOperatorMirror(to, [
        `PROFILE UPDATE — ICE CONTACT`,
        `Member: ${name}`,
        `Known member: ${member?.isKnown ? "YES" : "NO"}`,
        `ICE name: ${iceName}`,
        `ICE phone: ${icePhone}`,
      ].join("\n"));
      return;
    }
    // Format not matched
    await sendWhatsApp(from, to, [
      `${name}, please send your ICE contact in this format:`,
      ``,
      `ICE: Full Name, 0821234567`,
      ``,
      `Your ICE contact is only contacted when escalation rules are met.`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    return;
  }

  if (choice === "4") {
    // ICE contact
    await setConvState(from, { currentFlow: FLOW_PROFILE_UPDATE, currentStep: STEP_WAITING_FOR_ICE });
    await sendWhatsApp(from, to, [
      `${name}, please send your ICE contact like this:`,
      ``,
      `ICE: Full Name, 0821234567`,
      ``,
      `Your ICE contact is only contacted when escalation rules are met.`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    return;
  }

  // Options 1, 2, 3, 5, 6 — not yet built, direct to human
  const optionLabels: Record<string, string> = {
    "1": "personal details",
    "2": "home location",
    "3": "vehicle details",
    "5": "family members",
    "6": "local network / conduit details",
  };
  if (optionLabels[choice]) {
    await sendWhatsApp(from, to, [
      `${name}, updating your ${optionLabels[choice]} directly is coming soon.`,
      ``,
      `For now, reply 7 from the Main Menu to request a human who can assist you.`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    return;
  }

  // Unknown — repeat profile menu
  await sendWhatsApp(from, to, [
    `${name}, your profile helps the Situation Room support you properly.`,
    ``,
    `What would you like to update?`,
    ``,
    `1. My personal details`,
    `2. My home location`,
    `3. My vehicle details`,
    `4. My ICE contact`,
    `5. My family members`,
    `6. My local network / conduit details`,
    ``,
    `Reply 0 for Main Menu.`,
  ].join("\n"));
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
    await setConvState(from, { currentFlow: FLOW_EBLOCKWATCH_INFO, currentStep: null });
    await sendWhatsApp(from, to, [
      `${name}, eblockwatch is a trusted human support network built around real people, real relationships, and looking after people properly.`,
      ``,
      `For more than 25 years, Andre Snyman has built trusted relationships with members across South Africa. That is what gives eblockwatch its strength.`,
      ``,
      `When something goes wrong, eblockwatch uses those relationships and networks to connect the right people, in the right place, at the right time, with the right solutions to your predicament.`,
      ``,
      `This is not just a page or a group. It is a real network.`,
      ``,
      `When you register, the relationship starts, and each member makes the spine of eblockwatch stronger.`,
      ``,
      `1. Membership Options`,
      `2. Update my profile`,
      `3. Travel with Cyber Chaperone`,
      `4. eblockshop — safer products to make you safer`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    return true;
  }

  if (choice === "2") {
    await saveMessage(from, to, body, messageSid, null);
    await sendWhatsApp(from, to, [
      `${name}, here are your eblockwatch membership options.`,
      ``,
      `1. Entry Level — your starting point in eblockwatch`,
      `2. Single Membership — R150/month`,
      `3. Family Membership — R250/month`,
      ``,
      `The stronger your membership, the stronger your support layer.`,
      ``,
      `Reply 3 to activate your membership.`,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    return true;
  }

  if (choice === "3") {
    await saveMessage(from, to, body, messageSid, null);
    await setConvState(from, { currentFlow: FLOW_MEMBERSHIP, currentStep: null });
    await sendWhatsApp(from, to, membershipActivationText(name));
    return true;
  }

  if (choice === "4") {
    await saveMessage(from, to, body, messageSid, null);
    await setConvState(from, { currentFlow: FLOW_PROFILE_UPDATE, currentStep: null });
    await sendWhatsApp(from, to, [
      `${name}, your profile helps the Situation Room support you properly.`,
      ``,
      `What would you like to update?`,
      ``,
      `1. My personal details`,
      `2. My home location`,
      `3. My vehicle details`,
      `4. My ICE contact`,
      `5. My family members`,
      `6. My local network / conduit details`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    return true;
  }

  if (choice === "6") {
    await saveMessage(from, to, body, messageSid, null);
    await sendWhatsApp(from, to, [
      `${name}, eblockshop is where you find safer products to make you safer.`,
      ``,
      `Coming soon — we will notify you when it is ready.`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    return true;
  }

  if (choice === "7") {
    await saveMessage(from, to, body, messageSid, null);
    await sendWhatsApp(from, to, `${name}, a human from eblockwatch will contact you.\n\nIf this is urgent, reply 10.\n\nReply 0 for Main Menu.`);
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
    if (activeTrip) {
      await db.update(tripsTable).set({ status: "red", nextAction: "Immediate human review." }).where(eq(tripsTable.id, activeTrip.id));
    }
    await resetConvState(from);
    await sendWhatsApp(from, to, [
      `${name}, I have marked this for immediate human review.`,
      ``,
      `The Situation Room has been notified.`,
      ``,
      `Please reply with one number:`,
      ``,
      `1. I am in danger`,
      `2. I have broken down`,
      `3. I am lost`,
      `4. Medical issue`,
      `5. Call me`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    await sendOperatorMirror(to, [
      `🚨 CYBER CHAPERONE — IMMEDIATE HUMAN REVIEW`,
      `Member: ${name}`,
      `Known member: ${member?.isKnown ? "YES" : "NO"}`,
      activeTrip ? `Trip: ${activeTrip.title} (ID: ${activeTrip.id})` : `Trip: None`,
      `Status: RED`,
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

  // ── DIAGNOSTIC LOGGING ────────────────────────────────────────────────────
  log.info(
    {
      from,
      body: trimmed.slice(0, 120),
      menuOverrideMatch: GLOBAL_MENU_OVERRIDE.test(trimmed) || JOIN_PREFIX.test(trimmed),
    },
    "menu-router: inbound",
  );

  // ── GLOBAL MENU OVERRIDE ──────────────────────────────────────────────────
  // Runs BEFORE ICE detection, conversation state, trip logic, and all other
  // handlers. Any message that is a menu trigger word or begins with "join "
  // always returns the main menu — no other routing applies.
  const isMenuOverride = GLOBAL_MENU_OVERRIDE.test(trimmed) || JOIN_PREFIX.test(trimmed);
  if (isMenuOverride) {
    await resetConvState(from);
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    await sendWhatsApp(from, to, mainMenuText(name, member));
    await saveMessage(from, to, body, messageSid, null);
    log.info({ from, body: trimmed, handler: "GLOBAL_MENU_OVERRIDE" }, "menu-router: MENU_OVERRIDE triggered");
    return { handled: true };
  }

  // 1. PRIORITY: Distress — always handled first
  if (isDistress(trimmed)) {
    const activeTrip = await findActiveTrip(from);
    await handleDistress(ctx, activeTrip);
    log.info({ from, handler: "DISTRESS" }, "menu-router: distress priority handler");
    return { handled: true };
  }

  // 2. PRIORITY: Arrival — always handled second
  if (isArrival(trimmed)) {
    const activeTrip = await findActiveTrip(from);
    await handleArrival(ctx, activeTrip);
    log.info({ from, handler: "ARRIVAL" }, "menu-router: arrival priority handler");
    return { handled: true };
  }

  // 3. Main menu reset trigger (belt-and-suspenders after GLOBAL_MENU_OVERRIDE)
  if (MAIN_MENU_TRIGGER.test(trimmed)) {
    await resetConvState(from);
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    await sendWhatsApp(from, to, mainMenuText(name, member));
    await saveMessage(from, to, body, messageSid, null);
    log.info({ from, handler: "MAIN_MENU_TRIGGER" }, "menu-router: main menu trigger");
    return { handled: true };
  }

  // 4. Conversation state routing
  const state = await getConvState(from);
  log.info({ from, currentFlow: state.currentFlow, currentStep: state.currentStep }, "Menu router: conv state");

  if (state.currentFlow === FLOW_MEMBERSHIP) {
    await handleMembershipChoice(ctx);
    return { handled: true };
  }

  if (state.currentFlow === FLOW_EBLOCKWATCH_INFO) {
    await handleEblockwatchInfoChoice(ctx);
    return { handled: true };
  }

  if (state.currentFlow === FLOW_PROFILE_UPDATE) {
    await handleProfileUpdateChoice(ctx, state);
    return { handled: true };
  }

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

  // 7a. Route checkpoint check-in — time-based intermediate checks
  if (
    member?.isKnown &&
    activeTrip?.checkpointList &&
    activeTrip.status !== "completed" &&
    activeTrip.status !== "red" &&
    state.currentFlow !== FLOW_CHECKIN
  ) {
    try {
      const checkpoints = JSON.parse(activeTrip.checkpointList) as Array<{
        label: string;
        minutesFromStart: number;
        fraction: number;
      }>;
      const tripStart = new Date(activeTrip.createdAt).getTime();
      const now = Date.now();
      const lastCheckin = activeTrip.lastMemberCheckinTime
        ? new Date(activeTrip.lastMemberCheckinTime).getTime()
        : 0;
      for (const cp of checkpoints) {
        const cpDue = tripStart + cp.minutesFromStart * 60000;
        if (now > cpDue && lastCheckin < cpDue && shouldSendCheckin(activeTrip)) {
          await sendCheckinPrompt(ctx, activeTrip, 0, cp.label);
          await setConvState(from, {
            currentFlow: FLOW_CHECKIN,
            currentStep: null,
            pendingTripData: { clarificationActiveTripId: activeTrip.id },
          });
          await saveMessage(from, to, body, messageSid, activeTrip.id);
          log.info({ from, checkpoint: cp.label, tripId: activeTrip.id }, "Route checkpoint check-in sent");
          return { handled: true };
        }
      }
    } catch {
      // best-effort
    }
  }

  // 7. ETA drift monitoring — reactive check on every unhandled message
  if (member?.isKnown && activeTrip?.originalMemberEta && activeTrip.status !== "completed" && activeTrip.status !== "red") {
    const drift = calculateEtaDrift(activeTrip.originalMemberEta, activeTrip.createdAt);
    if (drift !== null && drift > 0) {
      await db.update(tripsTable).set({ etaDriftMinutes: drift }).where(eq(tripsTable.id, activeTrip.id)).catch(() => {});
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
