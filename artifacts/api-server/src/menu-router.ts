import { db, membersTable, tripsTable, messagesTable, conversationStatesTable, respondersTable, memberIncidentsTable } from "@workspace/db";
import { and, eq, ne, desc, or, sql } from "drizzle-orm";
import twilio from "twilio";
import { enrichTripWithRoute, calculateRouteInfo, reverseGeocodeCoords, reverseGeocodeStreetAddress, minutesToSastTime, type RouteInfo } from "./route-service.js";
import { calculateGoogleMapsRoute } from "./google-maps-service.js";
import { withMenu } from "./message-utils.js";
import { sendOperatorEmail, sendMemberWelcomeEmail, type EmailCategory } from "./email-service.js";
import { issueOtp, normalisePhone } from "./otp-store.js";
import { recordDiscSignal, type DiscSignal } from "./disc-profiler.js";
import { discVoice } from "./disc-voice.js";
import type { DiscDimension } from "./disc-profiler.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MemberInfo {
  displayName: string;
  role: string | null;
  memberStatus: string;
  membershipTier: string | null;
  loyaltyTier?: string | null;
  isKnown: boolean;
  discType?: DiscDimension | null;
  memberId?: number | null;
  email?: string | null;
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
  isPreArrival?: boolean;
  checkpointFraction?: number;
  checkpointLabel?: string;
  // Registration-specific fields
  regSuburb?: string;
  regCity?: string;
  regProvince?: string;
  regHomeAddress?: string;
  // Safety profile fields
  safetyMotherName?: string;
  safetyMotherPhone?: string;
  safetyVehiclePhotos?: string[];
  // Profile wizard accumulated changes
  wizardChanges?: Record<string, string | null>;
  // Which profile field is being updated in the A-E lettered menu
  profileField?: string;
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
  /** Platform override: when set, all outbound replies go through this instead of Twilio */
  sendReply?: (body: string) => Promise<void>;
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
const STEP_WAITING_FOR_HOME_OVERRIDE = "WAITING_FOR_HOME_OVERRIDE";
const STEP_WAITING_FOR_DESTINATION = "WAITING_FOR_DESTINATION";
const STEP_WAITING_FOR_ETA = "WAITING_FOR_ETA"; // kept for backward compat with in-flight conversations
const STEP_WAITING_FOR_DEPARTURE = "WAITING_FOR_DEPARTURE";
const STEP_WAITING_FOR_DEPARTURE_TIME = "WAITING_FOR_DEPARTURE_TIME";

const FLOW_CHECKIN = "CHECKIN";
const STEP_WAITING_FOR_NEW_ETA = "WAITING_FOR_NEW_ETA";
const STEP_WAITING_FOR_LOCATION = "WAITING_FOR_LOCATION";
const FLOW_MEMBERSHIP = "MEMBERSHIP";
const STEP_WAITING_FOR_PAYMENT_CONFIRMATION = "WAITING_FOR_PAYMENT_CONFIRMATION";
const FLOW_PROFILE_UPDATE = "PROFILE_UPDATE";
const STEP_WAITING_FOR_ICE = "WAITING_FOR_ICE";
const STEP_WAITING_FOR_PERSONAL_DETAILS = "WAITING_FOR_PERSONAL_DETAILS";
const STEP_WAITING_FOR_HOME_ADDRESS = "WAITING_FOR_HOME_ADDRESS";
const STEP_WAITING_FOR_PROFILE_FIELD = "WAITING_FOR_PROFILE_FIELD";
const STEP_PROFILE_MENU = "PROFILE_MENU";
const STEP_PROFILE_VALUE = "PROFILE_VALUE";
const FLOW_PROFILE_WIZARD = "PROFILE_WIZARD";
const STEP_WIZARD_NAME = "WIZARD_NAME";
const STEP_WIZARD_EMAIL = "WIZARD_EMAIL";
const STEP_WIZARD_MOBILE = "WIZARD_MOBILE";
const STEP_WIZARD_ADDRESS = "WIZARD_ADDRESS";
const STEP_WIZARD_SUBURB = "WIZARD_SUBURB";
const STEP_WIZARD_CITY = "WIZARD_CITY";
const STEP_WIZARD_PROVINCE = "WIZARD_PROVINCE";
const STEP_WIZARD_ICE = "WIZARD_ICE";
const WIZARD_STEP_ORDER = [
  STEP_WIZARD_NAME,
  STEP_WIZARD_EMAIL,
  STEP_WIZARD_MOBILE,
  STEP_WIZARD_ADDRESS,
  STEP_WIZARD_SUBURB,
  STEP_WIZARD_CITY,
  STEP_WIZARD_PROVINCE,
  STEP_WIZARD_ICE,
] as const;
const FLOW_EBLOCKWATCH_INFO = "EBLOCKWATCH_INFO";
const FLOW_REGISTRATION = "REGISTRATION";
const STEP_REG_FIRST_NAME = "REG_FIRST_NAME";
const STEP_REG_LAST_NAME = "REG_LAST_NAME";
const STEP_REG_EMAIL = "REG_EMAIL";
const STEP_REG_SUBURB = "REG_SUBURB";
const STEP_REG_CITY = "REG_CITY";
const STEP_REG_PROVINCE = "REG_PROVINCE";
const STEP_REG_HOME_ADDRESS = "REG_HOME_ADDRESS";
const STEP_REG_ICE = "REG_ICE";
const FLOW_SAFETY_PROFILE = "SAFETY_PROFILE";
const FLOW_SHOP = "SHOP";
const FLOW_MY_ACCOUNT = "MY_ACCOUNT";
const FLOW_REPORT_INCIDENT = "REPORT_INCIDENT";
const FLOW_PROFILE_CONFIRM = "PROFILE_CONFIRM";
const FLOW_SPEAK_TO_PERSON = "SPEAK_TO_PERSON";
const STEP_SAFETY_MOTHER_NAME = "SAFETY_MOTHER_NAME";
const STEP_SAFETY_MOTHER_PHONE = "SAFETY_MOTHER_PHONE";
const STEP_SAFETY_VEHICLE_PHOTO = "SAFETY_VEHICLE_PHOTO";
const STEP_SAFETY_VEHICLE_DESC = "SAFETY_VEHICLE_DESC";

// ── Keyword detectors ─────────────────────────────────────────────────────────

const MAIN_MENU_TRIGGER = /^(hi|hello|menu|main menu|start|0)$/i;
const GLOBAL_MENU_OVERRIDE = /^(hi|hello|hey|hallo|menu|main menu|start|0|join|activate|activate my eblockwatch account|activate my eblockwatch)$/i;
const JOIN_PREFIX = /^join\s+/i;
const CC_KEYWORDS = /\b(cyber chaperone|travel|trip|start trip)\b/i;
// Planned stop — member voluntarily pausing for fuel, food, coffee, rest, etc.
// Must NOT match bare "stop" (that is trip-end) — requires context words
const PLANNED_STOP_PATTERN =
  /\b(stopping\s+(?:at|in|for)|pulling\s+over|taking\s+a\s+break|grabbing\s+(?:some\s+)?(?:coffee|food|lunch|dinner|bite|petrol|fuel)|going\s+(?:in\s+)?(?:for|to\s+get)\s+(?:coffee|food|fuel|petrol)|(?:getting|buying)\s+(?:fuel|petrol|coffee|food)|wimpy|steers|nando|kfc|mcdonalds|mcdonald'?s|ocean\s*basket|spur|engen|sasol|bp\s+garage|shell\s+garage|caltex|total\s+garage|filling\s+station|petrol\s+station|service\s+station|fuel\s+stop|rest\s+stop|pit\s+stop|comfort\s+stop|toilet\s+stop)\b/i;
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

function etaMinusOneHour(etaTime: string): string | null {
  const match = etaTime.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const h = ((parseInt(match[1], 10) - 1) + 24) % 24;
  const m = parseInt(match[2], 10);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
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

function shouldSendCheckin(trip: { lastMemberCheckinTime: Date | null | undefined; routeEtaMinutes?: number | null }): boolean {
  if (!trip.lastMemberCheckinTime) return true;
  const mins = (Date.now() - new Date(trip.lastMemberCheckinTime).getTime()) / 60000;
  // Scale check-in interval based on planned trip duration so long-haul trips
  // are not nagged every 25 minutes — short trip: 25 min, medium: 45 min, long: 90 min
  const duration = trip.routeEtaMinutes ?? 60;
  const interval = duration <= 60 ? 25 : duration <= 180 ? 45 : 90;
  return mins > interval;
}

function recalcEtaFromFraction(routeEtaMinutes: number, fraction: number): { newEtaTime: string; remainingMinutes: number } {
  const remainingMinutes = Math.max(1, Math.round(routeEtaMinutes * (1 - fraction)));
  const newEtaMs = Date.now() + remainingMinutes * 60_000;
  const newEtaTime = new Date(newEtaMs).toLocaleTimeString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return { newEtaTime, remainingMinutes };
}

function formatTimeLeft(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

// ── Nearby responder count (haversine) ────────────────────────────────────────

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function countNearbyResponders(lat: string, lon: string, radiusKm = 50): Promise<number> {
  try {
    const all = await db
      .select({ homeLat: respondersTable.homeLat, homeLon: respondersTable.homeLon })
      .from(respondersTable)
      .where(eq(respondersTable.active, true));

    const memberLat = parseFloat(lat);
    const memberLon = parseFloat(lon);
    if (isNaN(memberLat) || isNaN(memberLon)) return 0;

    return all.filter((r) => {
      const rLat = parseFloat(r.homeLat);
      const rLon = parseFloat(r.homeLon);
      if (isNaN(rLat) || isNaN(rLon)) return false;
      return haversineKm(memberLat, memberLon, rLat, rLon) <= radiusKm;
    }).length;
  } catch {
    return 0;
  }
}

// ── Member-database nearby count — the real marketing number ─────────────────
// Queries the full 92,000-member database (not just the responders table).
// Uses a SQL bounding box first for efficiency, then JS haversine to trim corners.
async function countNearbyMembers(lat: string, lon: string, radiusKm: number): Promise<number> {
  try {
    const mLat = parseFloat(lat), mLon = parseFloat(lon);
    if (isNaN(mLat) || isNaN(mLon)) return 0;
    const delta = radiusKm / 111.0;
    const rows = await db
      .select({ homeLat: membersTable.homeLat, homeLon: membersTable.homeLon })
      .from(membersTable)
      .where(and(
        or(eq(membersTable.memberStatus, "verified"), eq(membersTable.memberStatus, "active")),
        sql`home_lat IS NOT NULL AND home_lat != '' AND home_lon IS NOT NULL AND home_lon != ''`,
        sql`CAST(home_lat AS DOUBLE PRECISION) BETWEEN ${mLat - delta} AND ${mLat + delta}`,
        sql`CAST(home_lon AS DOUBLE PRECISION) BETWEEN ${mLon - delta} AND ${mLon + delta}`,
      ));
    return rows.filter(r => {
      const rLat = parseFloat(r.homeLat ?? ""), rLon = parseFloat(r.homeLon ?? "");
      return !isNaN(rLat) && !isNaN(rLon) && haversineKm(mLat, mLon, rLat, rLon) <= radiusKm;
    }).length;
  } catch {
    return 0;
  }
}

// Smart radius: tries 5km first (dense suburb), then 10km (town), then 25km (rural).
// Single bounding-box DB call at 25km, JS-filtered for each threshold.
async function pickRadiusAndCount(lat: string, lon: string): Promise<{ count: number; radiusKm: number }> {
  try {
    const mLat = parseFloat(lat), mLon = parseFloat(lon);
    if (isNaN(mLat) || isNaN(mLon)) return { count: 0, radiusKm: 25 };
    const delta25 = 25 / 111.0;
    const rows = await db
      .select({ homeLat: membersTable.homeLat, homeLon: membersTable.homeLon })
      .from(membersTable)
      .where(and(
        or(eq(membersTable.memberStatus, "verified"), eq(membersTable.memberStatus, "active")),
        sql`home_lat IS NOT NULL AND home_lat != '' AND home_lon IS NOT NULL AND home_lon != ''`,
        sql`CAST(home_lat AS DOUBLE PRECISION) BETWEEN ${mLat - delta25} AND ${mLat + delta25}`,
        sql`CAST(home_lon AS DOUBLE PRECISION) BETWEEN ${mLon - delta25} AND ${mLon + delta25}`,
      ));
    const dists = rows.map(r => {
      const rLat = parseFloat(r.homeLat ?? ""), rLon = parseFloat(r.homeLon ?? "");
      return isNaN(rLat) || isNaN(rLon) ? null : haversineKm(mLat, mLon, rLat, rLon);
    }).filter((d): d is number => d !== null);
    const c5  = dists.filter(d => d <= 5).length;
    if (c5 >= 10) return { count: c5, radiusKm: 5 };
    const c10 = dists.filter(d => d <= 10).length;
    if (c10 >= 10) return { count: c10, radiusKm: 10 };
    return { count: dists.filter(d => d <= 25).length, radiusKm: 25 };
  } catch {
    return { count: 0, radiusKm: 25 };
  }
}

// Looks up a member's registered home coordinates by their WhatsApp number.
async function getMemberHomeCoords(whatsappNumber: string): Promise<{ lat: string; lon: string } | null> {
  try {
    const [row] = await db
      .select({ homeLat: membersTable.homeLat, homeLon: membersTable.homeLon })
      .from(membersTable)
      .where(eq(membersTable.whatsappNumber, whatsappNumber))
      .limit(1);
    if (row?.homeLat && row?.homeLon) return { lat: row.homeLat, lon: row.homeLon };
  } catch {}
  return null;
}

// 👥 Nearby coverage line — honest, area-aware, never overstated.
function nearbyCoverageText(count: number, radiusKm = 25): string {
  const icon = "👥";
  if (count === 0) return `${icon} eblockwatch members are active across South Africa — you are never alone.`;
  const area = radiusKm <= 5
    ? "in your immediate area"
    : radiusKm <= 10
      ? `within ${radiusKm}km of you`
      : "in your region";
  if (count < 5)    return `${icon} ${count} eblockwatch members are active ${area}.`;
  if (count < 20)   return `${icon} ${count} eblockwatch members are standing by ${area}.`;
  if (count < 100)  return `${icon} Over ${Math.floor(count / 10) * 10} eblockwatch members have your back ${area}.`;
  if (count < 1000) return `${icon} ${Math.floor(count / 50) * 50}+ eblockwatch members are active ${area}.`;
  return `${icon} ${(Math.floor(count / 100) * 100).toLocaleString()}+ eblockwatch members have your back ${area}.`;
}

// ── Platform-agnostic reply registry ─────────────────────────────────────────
// Maps a `from` identifier to a platform-specific send function for the duration
// of one handleMenuRouter call. Allows Facebook Messenger (or any future channel)
// to receive all outbound messages without touching the 90+ sendWhatsApp call sites.

const _replyOverrides = new Map<string, (body: string) => Promise<void>>();

// ── Twilio ────────────────────────────────────────────────────────────────────


async function sendWhatsApp(from: string, to: string, body: string): Promise<void> {
  // Check for platform override (e.g. Facebook Messenger) registered for this sender
  const override = _replyOverrides.get(from);
  if (override) {
    try { await override(body); } catch { /* never block */ }
    return;
  }
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({ from: to, to: from, body });
    // Persist outbound message so member-profile shows full 2-way conversation
    void db.insert(messagesTable).values({
      fromNumber: to,   // Twilio / system number
      toNumber:   from, // member's WhatsApp number
      body,
      messageSid: null,
      direction:  "outbound",
    }).catch(() => { /* best-effort */ });
  } catch {
    // Never break the webhook
  }
}

// Logo URL served from the public website artifact
const EBLOCKWATCH_LOGO_URL = "https://cyber-chaperone-r--ryfsny.replit.app/website/eblockwatch-logo.png";

// Send the eblockwatch logo as a standalone image message (WhatsApp only — skips Facebook)
async function sendWhatsAppLogo(from: string, to: string): Promise<void> {
  if (from.startsWith("fb:")) return;
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({ from: to, to: from, mediaUrl: [EBLOCKWATCH_LOGO_URL] });
  } catch {
    // Non-critical — never block the menu
  }
}

// Send a soft contact-request notification directly to André (+27825611065)
async function sendContactRequestToFounder(
  twilioNumber: string,
  memberName: string,
  memberPhone: string,
): Promise<void> {
  const e164 = memberPhone.replace(/^whatsapp:\+?/, "");
  const msg = [
    `📬 CONTACT REQUEST — ${memberName}`,
    `📞 ${memberPhone.replace("whatsapp:", "")}`,
    ``,
    `Reply or WhatsApp them directly:`,
    `👉 wa.me/${e164}`,
  ].join("\n");

  if (memberPhone !== FOUNDER_WHATSAPP) {
    try {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({ from: twilioNumber, to: FOUNDER_WHATSAPP, body: msg });
    } catch {
      // Best-effort
    }
  }
}

async function sendOperatorMirror(twilioNumber: string, body: string, emailCategory?: EmailCategory): Promise<void> {
  const operatorNumber = process.env.OPERATOR_WHATSAPP_NUMBER;
  const mode = (process.env.OPERATOR_MIRROR_MODE ?? "off").toLowerCase();

  // Email — always fire if configured, regardless of WhatsApp mirror mode
  if (emailCategory) {
    const firstLine = body.split("\n")[0] ?? "Update";
    void sendOperatorEmail(emailCategory, firstLine, body);
  }

  if (!operatorNumber || mode === "off") return;
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({ from: twilioNumber, to: operatorNumber, body });
  } catch {
    // Best-effort
  }
}

// ── Emergency alert — always fires directly to founder ────────────────────────
// Unlike sendOperatorMirror (gated by OPERATOR_MIRROR_MODE), this always sends
// to +27825611065 regardless of environment configuration.
const FOUNDER_WHATSAPP = "whatsapp:+27825611065";

// Public-facing WhatsApp number members message — switches to the dedicated
// Twilio business number the moment TWILIO_WHATSAPP_NUMBER env var is updated.
const BUSINESS_WA_NUM = (process.env["TWILIO_WHATSAPP_NUMBER"] ?? "whatsapp:+27825611065").replace("whatsapp:+", "");

async function sendEmergencyAlert(
  twilioNumber: string,
  memberName: string,
  memberPhone: string,
): Promise<void> {
  const e164 = memberPhone.replace("whatsapp:+", "");
  const msg = [
    `🚨 EMERGENCY — ${memberName}`,
    `📞 ${memberPhone.replace("whatsapp:", "")}`,
    `RESPOND NOW`,
    `👉 wa.me/${e164}`,
  ].join("\n");

  // Always direct-send to founder (skip if the member IS the founder)
  if (memberPhone !== FOUNDER_WHATSAPP) {
    try {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({ from: twilioNumber, to: FOUNDER_WHATSAPP, body: msg });
    } catch {
      // Best-effort
    }
  }

  // Also fire the standard operator mirror (sends email + conditional WhatsApp to OPERATOR_WHATSAPP_NUMBER)
  await sendOperatorMirror(twilioNumber, msg, "red-alert");
}

// ── ICE contact alert — sends location-linked WhatsApp to emergency contact ───
// Fires on any RED escalation if the member has an ICE contact registered.
// Best-effort: never throws — the safety of the primary flow is always paramount.
async function sendIceContactAlert(
  twilioNumber: string,
  memberName: string,
  memberPhone: string,
  iceContactName: string,
  iceContactPhone: string,
  trip: { title: string; startLat: string | null; startLon: string | null; destLat: string | null; destLon: string | null } | null,
  situation: string,
): Promise<void> {
  try {
    // Normalise ICE phone → WhatsApp E.164 (handles SA 0XX and +27XX formats)
    let raw = iceContactPhone.replace(/[\s\-().]/g, "");
    if (raw.startsWith("0")) raw = "+27" + raw.slice(1);
    if (!raw.startsWith("+")) raw = "+" + raw;
    const iceWa = `whatsapp:${raw}`;

    // Build Google Maps deep-link from best available trip coordinates
    const mapsLink = (() => {
      const lat = trip?.destLat ?? trip?.startLat;
      const lon = trip?.destLon ?? trip?.startLon;
      if (lat && lon) return `https://maps.google.com/?q=${lat},${lon}`;
      return null;
    })();

    const memberE164 = memberPhone.replace(/^whatsapp:\+?/, "");

    const lines = [
      `🆘 *eblockwatch Cyber Chaperone — URGENT*`,
      ``,
      `Hi ${iceContactName},`,
      ``,
      `You are the emergency contact for *${memberName}*.`,
      ``,
      `Situation: ${situation}`,
      trip ? `Route: ${trip.title}` : null,
      mapsLink ? `\n📍 Last known location:\n${mapsLink}` : null,
      ``,
      `Please contact ${memberName} immediately:`,
      `👉 wa.me/${memberE164}`,
      ``,
      `André at eblockwatch is monitoring. Reply to this message with any update.`,
      ``,
      `— eblockwatch Cyber Chaperone`,
    ].filter(Boolean).join("\n");

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({ from: twilioNumber, to: iceWa, body: lines });
  } catch {
    // Best-effort — never crash the main flow
  }
}

// Looks up a member's ICE contact details by their WhatsApp number.
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
    // Best-effort
  }
  return null;
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
  routeInfo?: RouteInfo | null,
  checkpointTowns?: string[],
): Promise<void> {
  const title = `${startLocation} → ${destination}`;
  const effectiveEta = eta ?? routeInfo?.etaTime ?? null;
  const etaNote = effectiveEta ? ` ETA ${effectiveEta}.` : "";
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
      originalMemberEta: effectiveEta ? normaliseEta(effectiveEta) : null,
      currentRouteConfidence: "green",
      ...(routeInfo
        ? {
            startLat: routeInfo.startCoords.lat,
            startLon: routeInfo.startCoords.lon,
            destLat: routeInfo.destCoords.lat,
            destLon: routeInfo.destCoords.lon,
            routePolyline: routeInfo.polylineGeoJson,
            routeEtaMinutes: routeInfo.durationMinutes,
            routeEtaTime: routeInfo.etaTime,
            checkpointList: JSON.stringify(routeInfo.checkpoints),
          }
        : {}),
    })
    .returning();

  // Only run async enrichment if we didn't already calculate the route
  if (!routeInfo) {
    void enrichTripWithRoute(newTrip.id, startLocation, destination, log);
  }

  await saveMessage(from, to, body, messageSid, newTrip.id);

  const name = member?.displayName ?? from;

  // Build checkpoint line: prefer Google Maps towns, fall back to OSRM labels
  const effectiveTowns =
    (checkpointTowns && checkpointTowns.length > 0)
      ? checkpointTowns
      : (routeInfo?.checkpoints ?? [])
          .filter((cp) => cp.label !== "PRE_ARRIVAL" && cp.label !== "First checkpoint" && cp.label !== "Second checkpoint")
          .map((cp) => cp.label);

  const cpLine =
    effectiveTowns.length > 0
      ? `\n\nWe will check in with you at ${effectiveTowns.join(", ")}.`
      : "";

  // Add nearby member count to trip start confirmation
  const nearbyLine = await (async () => {
    if (routeInfo?.startCoords?.lat && routeInfo?.startCoords?.lon) {
      const { count, radiusKm } = await pickRadiusAndCount(routeInfo.startCoords.lat, routeInfo.startCoords.lon);
      return count > 0 ? `\n\n${nearbyCoverageText(count, radiusKm)}` : "";
    }
    return "";
  })();

  await sendWhatsApp(
    from,
    to,
    (() => {
      const etaLine = routeInfo
        ? `Your drive is about ${Math.floor(routeInfo.durationMinutes / 60)}h ${routeInfo.durationMinutes % 60}min. Expected arrival: *${routeInfo.etaTime}*.`
        : effectiveEta
          ? `Expected arrival: *${normaliseEta(effectiveEta)}*.`
          : `No arrival time set yet — we are calculating your route now.`;

      const checkInLine = cpLine
        ? cpLine.trim()
        : `We will check in with you along the way.`;

      const encStart = encodeURIComponent(startLocation);
      const encDest = encodeURIComponent(destination);
      const gmLink = routeInfo
        ? `https://www.google.com/maps/dir/?api=1&origin=${routeInfo.startCoords.lat},${routeInfo.startCoords.lon}&destination=${routeInfo.destCoords.lat},${routeInfo.destCoords.lon}`
        : `https://www.google.com/maps/dir/?api=1&origin=${encStart}&destination=${encDest}`;
      const wazeLink = routeInfo
        ? `https://waze.com/ul?ll=${routeInfo.destCoords.lat},${routeInfo.destCoords.lon}&navigate=yes`
        : `https://waze.com/ul?q=${encDest}&navigate=yes`;

      return [
        `✅ *Trip registered — we're watching, ${name}.* 🛡️`,
        ``,
        `*Route:* ${startLocation} → ${destination}`,
        etaLine,
        nearbyLine ? nearbyLine.trim() : null,
        ``,
        `🗺️ *Open your route now:*`,
        `Google Maps: ${gmLink}`,
        `Waze: ${wazeLink}`,
        ``,
        checkInLine,
        ``,
        `We will contact you automatically if you go silent past your ETA.`,
        `Your emergency contact is on standby if needed.`,
        ``,
        `When you arrive: reply *ARRIVED* ✅`,
        `Need help any time: reply *10* 🆘`,
      ].filter((l) => l !== null).join("\n");
    })(),
  );

  log.info(
    { tripId: newTrip.id, title, startLocation, destination, eta: effectiveEta, isKnownMember: member?.isKnown ?? false },
    "New trip created from menu flow",
  );

  const etaStatus = effectiveEta
    ? `ETA: ${effectiveEta}`
    : `⚠️ No ETA set — route calculating. Overdue check armed once ETA is confirmed.`;

  const checkpointStatus = routeInfo && routeInfo.checkpoints.length > 0
    ? `${routeInfo.checkpoints.length} waypoint pings scheduled`
    : `Waypoints: calculating in background`;

  await sendOperatorMirror(
    to,
    [
      `🟢 NEW TRIP`,
      ``,
      `${member?.displayName ?? from} is travelling to *${destination}*`,
      `Trip #${newTrip.id}`,
      routeInfo
        ? `Drive time: ${Math.floor(routeInfo.durationMinutes / 60)}h ${routeInfo.durationMinutes % 60}min`
        : null,
      etaStatus,
      ``,
      `Monitoring active:`,
      `• Situation Room: tracking`,
      `• ${checkpointStatus}`,
      `• Overdue escalation: ${effectiveEta ? `armed — fires if no reply by ${effectiveEta}` : "pending ETA calculation"}`,
      `• ICE escalation: automatic if RED`,
    ].filter((l) => l !== null).join("\n"),
    "trip-started",
  );

  await resetConvState(from);
}

// ── Check-in text ─────────────────────────────────────────────────────────────

function checkinText(
  name: string,
  driftMin: number,
  tripTitle: string,
  destination: string,
  checkpointLabel?: string,
): string {
  const isPreArrival = checkpointLabel === "PRE_ARRIVAL";
  const isEtaDrift = !checkpointLabel;

  if (isPreArrival) {
    return [
      `${name} 👋 Cyber Chaperone here.`,
      ``,
      `You should be getting close to ${destination} now. You've done great — almost there!`,
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

  if (isEtaDrift) {
    return [
      `${name} 👋 Cyber Chaperone check-in.`,
      ``,
      `You are ${driftMin} minute${driftMin === 1 ? "" : "s"} past your ETA for ${destination}.`,
      `No stress — just tap what applies:`,
      ``,
      `🚔 1 — Pulled over`,
      `⛽ 2 — Fuel / rest stop`,
      `🚧 3 — Roadblock`,
      `🚑 4 — Accident / breakdown`,
      `✅ 5 — All good, still moving`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n");
  }

  // Named checkpoint — confirm presence and recalculate ETA
  return [
    `${name} 👋 Cyber Chaperone — *${checkpointLabel}* checkpoint.`,
    ``,
    `You should be at or near *${checkpointLabel}* on your way to *${destination}*.`,
    ``,
    `1. ✅ Yes — passing through now`,
    `2. 🕐 Not yet — running behind`,
    `3. 📍 Somewhere else — tell us where`,
    `4. 🆘 I need help`,
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
  const destination = trip.title.includes(" → ") ? trip.title.split(" → ").pop()! : trip.title;
  const lat = trip.startLat ?? trip.destLat;
  const lon = trip.startLon ?? trip.destLon;
  let nearbyLine = "";
  if (lat && lon) {
    const { count, radiusKm } = await pickRadiusAndCount(lat, lon);
    if (count > 0) nearbyLine = `\n\n${nearbyCoverageText(count, radiusKm)}`;
  }
  await sendWhatsApp(ctx.from, ctx.to, checkinText(name, driftMin, trip.title, destination, checkpointLabel) + nearbyLine);
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
    await sendMainMenuWithNearby(from, to, name, member);
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

  // STEP_WAITING_FOR_LOCATION: member texted where they are
  if (state.currentStep === STEP_WAITING_FOR_LOCATION) {
    const reportedLocation = body.trim();
    const destination = trip?.title.includes(" → ") ? trip.title.split(" → ").pop()! : trip?.title ?? "your destination";
    let matchedFraction: number | null = null;
    let matchedLabel: string | null = null;
    if (trip?.checkpointList) {
      try {
        const cps = JSON.parse(trip.checkpointList) as Array<{ label: string; minutesFromStart: number; fraction: number }>;
        const matched = cps.find(
          (cp) =>
            cp.label.toLowerCase().includes(reportedLocation.toLowerCase()) ||
            reportedLocation.toLowerCase().includes(cp.label.toLowerCase()),
        );
        if (matched) { matchedFraction = matched.fraction; matchedLabel = matched.label; }
      } catch { /* ignore */ }
    }
    // Fall back to the checkpoint that triggered this conversation
    if (matchedFraction === null && pending.checkpointFraction != null) {
      matchedFraction = pending.checkpointFraction;
      matchedLabel = pending.checkpointLabel ?? null;
    }
    if (trip && matchedFraction !== null && trip.routeEtaMinutes) {
      const { newEtaTime, remainingMinutes } = recalcEtaFromFraction(trip.routeEtaMinutes, matchedFraction);
      const timeStr = formatTimeLeft(remainingMinutes);
      await db.update(tripsTable).set({
        originalMemberEta: newEtaTime,
        lastMemberCheckinTime: new Date(),
        etaDriftMinutes: 0,
        status: "green",
        currentRouteConfidence: "green",
        evidenceNotes: appendNote(trip.evidenceNotes, `[${ts}] LOCATION: Member at "${reportedLocation}". ETA recalculated → ${newEtaTime}`),
        nextAction: `Location confirmed: ${reportedLocation}. Updated ETA: ${newEtaTime}`,
      }).where(eq(tripsTable.id, trip.id));
      await resetConvState(from);
      await sendWhatsApp(from, to, `📍 *${reportedLocation}* noted — ETA updated.\n\nEstimated arrival at *${destination}*: *${newEtaTime}* (${timeStr} to go).\n\nWe're still watching. Safe travels! 🛡️`);
      await sendOperatorMirror(to, [
        `CYBER CHAPERONE — LOCATION UPDATE`,
        `Member: ${name}`,
        `Trip: ${trip.title} (ID: ${trip.id})`,
        `Location reported: ${reportedLocation}${matchedLabel ? ` (matched checkpoint: ${matchedLabel})` : ""}`,
        `Updated ETA: ${newEtaTime} (${timeStr} remaining)`,
        `Status: GREEN`,
      ].join("\n"), "checkpoint");
    } else {
      // Can't match location — accept as note, ask for ETA
      if (trip) {
        await db.update(tripsTable).set({
          lastMemberCheckinTime: new Date(),
          evidenceNotes: appendNote(trip.evidenceNotes, `[${ts}] LOCATION NOTE: "${reportedLocation.slice(0, 80)}"`),
        }).where(eq(tripsTable.id, trip.id));
      }
      await setConvState(from, { currentFlow: FLOW_CHECKIN, currentStep: STEP_WAITING_FOR_NEW_ETA, pendingTripData: pending });
      await sendWhatsApp(from, to, `📍 *${reportedLocation}* noted.\n\nWhat is your updated ETA? (e.g. 18:30)\n\nReply 0 for Main Menu.`);
    }
    return;
  }

  // Pre-arrival checkpoint: 1 = arrived, 2 = delayed, 3 = help
  if (pending.isPreArrival) {
    if (choice === "1") {
      // Member arrived — close trip
      if (trip) {
        await db
          .update(tripsTable)
          .set({
            status: "completed",
            currentRouteConfidence: "green",
            lastMemberCheckinTime: new Date(),
            evidenceNotes: appendNote(trip.evidenceNotes, `[${ts}] ARRIVED: Member confirmed arrival at destination.`),
            nextAction: "Trip completed.",
          })
          .where(eq(tripsTable.id, trip.id));
      }
      await resetConvState(from);
      await sendWhatsApp(from, to, `${name}, you have arrived safely. Your Cyber Chaperone trip is now closed.\n\nThank you for travelling with us. Stay safe.`);
      log.info({ from, tripId: trip?.id }, "Pre-arrival: member confirmed arrived — trip closed");
      if (trip) {
        await sendOperatorMirror(to, [
          `CYBER CHAPERONE — TRIP COMPLETED`,
          `Member: ${name}`,
          `Trip: ${trip.title} (ID: ${trip.id})`,
          `Status: COMPLETED`,
          `Member confirmed: arrived at destination.`,
        ].join("\n"), "arrived");
      }
      return;
    }
    if (choice === "2") {
      if (trip) {
        await db.update(tripsTable).set({ status: "amber", currentRouteConfidence: "amber" }).where(eq(tripsTable.id, trip.id));
      }
      await setConvState(from, { currentFlow: FLOW_CHECKIN, currentStep: STEP_WAITING_FOR_NEW_ETA, pendingTripData: pending });
      await sendWhatsApp(from, to, `Understood — you are delayed.\n\nPlease send your new ETA (e.g. 18:30).\n\nReply 0 for Main Menu.`);
      return;
    }
    if (choice === "3") {
      if (trip) {
        await db.update(tripsTable).set({ status: "red", nextAction: "Immediate human review." }).where(eq(tripsTable.id, trip.id));
      }
      await resetConvState(from);
      await sendWhatsApp(from, to, `${name}, I have alerted the Situation Room. Help is on the way.\n\nReply 0 for Main Menu.`);
      if (trip) {
        await sendOperatorMirror(to, [
          `🚨 CYBER CHAPERONE — RED (PRE-ARRIVAL HELP)`,
          `Member: ${name}`,
          `Trip: ${trip.title} (ID: ${trip.id})`,
          `Status: RED`,
          `Triggered: Member pressed help at pre-arrival checkpoint.`,
          `Next action: Immediate human review required.`,
        ].join("\n"), "red-alert");
      }
      return;
    }
    // Unrecognised — re-send pre-arrival menu
    if (trip) await sendCheckinPrompt(ctx, trip, 0, "PRE_ARRIVAL");
    return;
  }

  // ── Named checkpoint confirmation (set by scheduler or in-flow prompt) ────────
  if (pending.checkpointLabel && !pending.isPreArrival) {
    const fraction = pending.checkpointFraction ?? 0.5;
    const label = pending.checkpointLabel;
    const destination = trip?.title.includes(" → ") ? trip.title.split(" → ").pop()! : trip?.title ?? "your destination";

    if (choice === "1") {
      // Passing through — recalculate ETA from this checkpoint fraction
      if (trip && trip.routeEtaMinutes) {
        const { newEtaTime, remainingMinutes } = recalcEtaFromFraction(trip.routeEtaMinutes, fraction);
        const timeStr = formatTimeLeft(remainingMinutes);
        await db.update(tripsTable).set({
          originalMemberEta: newEtaTime,
          lastMemberCheckinTime: new Date(),
          etaDriftMinutes: 0,
          status: "green",
          currentRouteConfidence: "green",
          evidenceNotes: appendNote(trip.evidenceNotes, `[${ts}] CHECKPOINT ✅: ${label} confirmed. ETA recalculated → ${newEtaTime}`),
          nextAction: `${label} confirmed. Updated ETA: ${newEtaTime}`,
        }).where(eq(tripsTable.id, trip.id));
        await resetConvState(from);
        await sendWhatsApp(from, to, `✅ *${label}* — confirmed, you're on track!\n\nUpdated ETA to *${destination}*: *${newEtaTime}* (${timeStr} to go).\n\nWe're still with you. Safe travels! 🛡️`);
        await sendOperatorMirror(to, [
          `CYBER CHAPERONE — CHECKPOINT CONFIRMED ✅`,
          `Member: ${name}`,
          `Trip: ${trip.title} (ID: ${trip.id})`,
          `Checkpoint: ${label}`,
          `Updated ETA: ${newEtaTime} (${timeStr} remaining)`,
          `Status: GREEN`,
        ].join("\n"), "checkpoint");
      } else {
        if (trip) {
          await db.update(tripsTable).set({
            lastMemberCheckinTime: new Date(),
            etaDriftMinutes: 0,
            status: "green",
            evidenceNotes: appendNote(trip.evidenceNotes, `[${ts}] CHECKPOINT ✅: ${label} confirmed.`),
            nextAction: `${label} confirmed. Monitoring continues.`,
          }).where(eq(tripsTable.id, trip.id));
        }
        await resetConvState(from);
        await sendWhatsApp(from, to, `✅ *${label}* confirmed. We're still with you — safe travels! 🛡️`);
      }
      log.info({ from, tripId: trip?.id, checkpoint: label }, "Named checkpoint confirmed — ETA recalculated");
      return;
    }

    if (choice === "2") {
      // Running behind — ask for new ETA
      if (trip) {
        await db.update(tripsTable).set({
          status: "amber",
          currentRouteConfidence: "amber",
          lastMemberCheckinTime: new Date(),
          evidenceNotes: appendNote(trip.evidenceNotes, `[${ts}] DELAYED: Not yet at ${label}.`),
          nextAction: `Member delayed at ${label} checkpoint.`,
        }).where(eq(tripsTable.id, trip.id));
      }
      await setConvState(from, { currentFlow: FLOW_CHECKIN, currentStep: STEP_WAITING_FOR_NEW_ETA, pendingTripData: pending });
      await sendWhatsApp(from, to, `Understood — no rush.\n\nWhat is your new ETA to *${destination}*? (e.g. 18:30)\n\nReply 0 for Main Menu.`);
      if (trip) {
        await sendOperatorMirror(to, [
          `CYBER CHAPERONE — DELAYED AT CHECKPOINT`,
          `Member: ${name}`,
          `Trip: ${trip.title} (ID: ${trip.id})`,
          `Checkpoint: ${label}`,
          `Status: ⚠️ AMBER — awaiting new ETA`,
        ].join("\n"));
      }
      return;
    }

    if (choice === "3") {
      // Somewhere else — ask them to text their location
      await setConvState(from, { currentFlow: FLOW_CHECKIN, currentStep: STEP_WAITING_FOR_LOCATION, pendingTripData: pending });
      await sendWhatsApp(from, to, `No problem — just tell us where you are right now (e.g. *Vrede* or *just passed Standerton*) and we will update your ETA.\n\nReply 0 for Main Menu.`);
      return;
    }

    if (choice === "4") {
      // Need help — RED + full ICE alert
      if (trip) {
        await db.update(tripsTable).set({
          status: "red",
          nextAction: `Member needs help at ${label} checkpoint — immediate review.`,
          evidenceNotes: appendNote(trip.evidenceNotes, `[${ts}] 🆘 HELP requested at checkpoint ${label}.`),
        }).where(eq(tripsTable.id, trip.id));
      }
      await resetConvState(from);
      await sendWhatsApp(from, to, `${name}, we are on it. 🆘\n\nAndré has been notified and the Situation Room is on alert. You are not alone.\n\nReply 0 for Main Menu.`);
      await sendEmergencyAlert(to, name, from);
      const iceHelp = await getMemberIce(from);
      if (iceHelp) {
        await sendIceContactAlert(to, name, from, iceHelp.iceContactName, iceHelp.iceContactPhone, trip ?? null,
          `${name} has signalled they need help at the *${label}* checkpoint during a trip.`);
      }
      if (trip) {
        await sendOperatorMirror(to, [
          `🚨 CYBER CHAPERONE — RED (CHECKPOINT HELP REQUEST)`,
          `Member: ${name}`,
          `Trip: ${trip.title} (ID: ${trip.id})`,
          `Checkpoint: ${label}`,
          `Status: RED`,
          iceHelp ? `ICE alerted: ${iceHelp.iceContactName} (${iceHelp.iceContactPhone})` : `ICE: not set`,
          `Next action: Immediate human review required.`,
        ].join("\n"), "red-alert");
      }
      log.info({ from, tripId: trip?.id, checkpoint: label }, "Named checkpoint: member needs help — RED");
      return;
    }

    // Unrecognised — re-send checkpoint menu
    if (trip) await sendCheckinPrompt(ctx, trip, 0, label);
    return;
  }

  // Stop-reason menu (ETA drift check-in): 1=pulled over, 2=fuel/rest, 3=roadblock, 4=accident, 5=all good
  if (choice === "5") {
    // All good — still moving: reset drift, stay GREEN
    if (trip) {
      await db
        .update(tripsTable)
        .set({
          status: "green",
          currentRouteConfidence: "green",
          lastMemberCheckinTime: new Date(),
          etaDriftMinutes: 0,
          evidenceNotes: appendNote(trip.evidenceNotes, `[${ts}] CHECK-IN: Member confirmed okay and still moving.`),
          nextAction: "Member checked in okay. Continue monitoring.",
        })
        .where(eq(tripsTable.id, trip.id));
    }
    await resetConvState(from);
    await sendWhatsApp(from, to, `✅ All good — we are still watching over your journey.\n\nSafe travels.\n\nReply 0 for Main Menu.`);
    log.info({ from, tripId: trip?.id }, "Check-in: member okay and moving");
    if (trip) {
      await sendOperatorMirror(to, [
        `CYBER CHAPERONE — CHECK-IN CONFIRMED`,
        `Member: ${name}`,
        `Trip: ${trip.title} (ID: ${trip.id})`,
        `Status: ✅ GREEN`,
        `Member confirmed: all good, still moving.`,
      ].join("\n"), "checkpoint");
    }
    return;
  }

  if (choice === "2") {
    // Fuel / rest stop — GREEN, ~25 min natural pause before next prompt
    if (trip) {
      await db
        .update(tripsTable)
        .set({
          status: "green",
          currentRouteConfidence: "green",
          lastMemberCheckinTime: new Date(),
          evidenceNotes: appendNote(trip.evidenceNotes, `[${ts}] STOP: Fuel/rest stop.`),
          nextAction: "Member on a fuel/rest stop. Continue monitoring.",
        })
        .where(eq(tripsTable.id, trip.id));
    }
    await resetConvState(from);
    await sendWhatsApp(from, to, `⛽ Fuel/rest stop noted. Take your time — we will pick up your trip when you are back on the road.\n\nReply 0 for Main Menu.`);
    log.info({ from, tripId: trip?.id }, "Check-in: fuel/rest stop");
    if (trip) {
      await sendOperatorMirror(to, [
        `CYBER CHAPERONE — FUEL/REST STOP`,
        `Member: ${name}`,
        `Trip: ${trip.title} (ID: ${trip.id})`,
        `Status: ✅ GREEN`,
        `Member: Fuel/rest stop. Back on road shortly.`,
      ].join("\n"), "checkpoint");
    }
    return;
  }

  if (choice === "3") {
    // Roadblock — AMBER, ~25 min natural pause before next prompt
    if (trip) {
      await db
        .update(tripsTable)
        .set({
          status: "amber",
          currentRouteConfidence: "amber",
          lastMemberCheckinTime: new Date(),
          evidenceNotes: appendNote(trip.evidenceNotes, `[${ts}] STOP: Roadblock encountered.`),
          nextAction: "Member at roadblock. Monitor for update.",
        })
        .where(eq(tripsTable.id, trip.id));
    }
    await resetConvState(from);
    await sendWhatsApp(from, to, `🚧 Roadblock noted. We are watching over you.\n\nWhen you are through, just keep going — we will follow your journey from here.\n\nReply 0 for Main Menu.`);
    log.info({ from, tripId: trip?.id }, "Check-in: roadblock — AMBER");
    if (trip) {
      await sendOperatorMirror(to, [
        `CYBER CHAPERONE — ROADBLOCK`,
        `Member: ${name}`,
        `Trip: ${trip.title} (ID: ${trip.id})`,
        `Status: ⚠️ AMBER`,
        `Member: Encountered a roadblock.`,
        `Next action: Monitor. Await clearance.`,
      ].join("\n"));
    }
    return;
  }

  if (choice === "1") {
    // Pulled over by police — AMBER, calm ICE heads-up (NOT RED, NOT emergency)
    if (trip) {
      await db
        .update(tripsTable)
        .set({
          status: "amber",
          currentRouteConfidence: "amber",
          lastMemberCheckinTime: new Date(),
          evidenceNotes: appendNote(trip.evidenceNotes, `[${ts}] STOP: Pulled over by police.`),
          nextAction: "Member pulled over by police. AMBER — not RED. ICE notified (calm).",
        })
        .where(eq(tripsTable.id, trip.id));
    }
    await resetConvState(from);
    await sendWhatsApp(from, to, `🚔 Understood — we have noted you have been pulled over. Stay calm.\n\nWe have quietly let your emergency contact know you are safe.\n\nWhen you are released and back on the road, just continue your trip — we are right here.\n\nReply 0 for Main Menu.`);
    log.info({ from, tripId: trip?.id }, "Check-in: pulled over — AMBER (calm ICE)");
    const icePulled = await getMemberIce(from);
    if (icePulled) {
      await sendIceContactAlert(
        to,
        name,
        from,
        icePulled.iceContactName,
        icePulled.iceContactPhone,
        trip ?? null,
        `${name} has been pulled over by police during a trip. They are *safe and unharmed* — this is a precautionary notification only. No immediate action required.`,
      );
    }
    if (trip) {
      await sendOperatorMirror(to, [
        `CYBER CHAPERONE — POLICE STOP (AMBER)`,
        `Member: ${name}`,
        `Trip: ${trip.title} (ID: ${trip.id})`,
        `Status: ⚠️ AMBER — NOT RED`,
        `Member: Pulled over by police. Safe.`,
        icePulled ? `ICE notified (calm): ${icePulled.iceContactName} (${icePulled.iceContactPhone})` : `ICE contact: not set`,
        `Next action: Monitor. Do NOT escalate unless new info arrives.`,
      ].join("\n"));
    }
    return;
  }

  if (choice === "4") {
    // Accident / breakdown — RED, full ICE alert
    if (trip) {
      await db.update(tripsTable).set({ status: "red", nextAction: "Accident/breakdown — immediate human review." }).where(eq(tripsTable.id, trip.id));
    }
    await resetConvState(from);
    await sendWhatsApp(from, to, [
      `${name}, we are on it. 🆘`,
      ``,
      `André has been notified and the Situation Room is on alert. You are not alone.`,
      ``,
      `Please reply with one number:`,
      ``,
      `1. 🚨 I am in danger`,
      `2. 🚗 I have broken down`,
      `3. I am lost`,
      `4. Medical issue`,
      `5. Call me`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    await sendEmergencyAlert(to, name, from);
    const iceAccident = await getMemberIce(from);
    if (iceAccident) {
      await sendIceContactAlert(
        to,
        name,
        from,
        iceAccident.iceContactName,
        iceAccident.iceContactPhone,
        trip ?? null,
        `${name} has reported an accident or breakdown during a trip and needs urgent assistance.`,
      );
    }
    if (trip) {
      await sendOperatorMirror(to, [
        `🚨 CYBER CHAPERONE — RED (ACCIDENT/BREAKDOWN)`,
        `Member: ${name}`,
        `Trip: ${trip.title} (ID: ${trip.id})`,
        `Status: RED`,
        iceAccident ? `ICE contact alerted: ${iceAccident.iceContactName} (${iceAccident.iceContactPhone})` : `ICE contact: not set`,
        `Next action: Immediate human review required.`,
      ].join("\n"), "red-alert");
    }
    return;
  }

  if (trip) {
    await sendCheckinPrompt(ctx, trip, trip.etaDriftMinutes ?? 15);
  } else {
    await sendWhatsApp(from, to, `Please reply with 1–5 or 0 for Main Menu.`);
  }
}

// ── Menu text builders ────────────────────────────────────────────────────────

function trustTierEmoji(loyaltyTier: string | null | undefined): string {
  if (loyaltyTier === "founder") return "⭐";
  if (loyaltyTier === "silver")  return "🥈";
  return "🥉";
}

function membershipStatusLine(memberStatus: string, membershipTier: string | null, loyaltyTier?: string | null): string {
  const tierEmoji = trustTierEmoji(loyaltyTier);
  const isPaying   = membershipTier === "individual" || membershipTier === "family";
  const purpleStar = isPaying ? " 💜" : "";
  const tierName   = loyaltyTier === "founder" ? "Founder Member"
    : loyaltyTier === "silver" ? "Silver Member"
    : "Bronze Member";
  const planName   = membershipTier === "family"     ? "Family Plan"
    : membershipTier === "individual" ? "Individual Plan"
    : memberStatus === "pending"      ? "Membership pending"
    : "Entry Level";
  return `${tierEmoji}${purpleStar} *${tierName}* · ${planName}`;
}

async function sendProfileConfirmation(from: string, to: string, name: string): Promise<void> {
  const [row] = await db.select({
    displayName: membersTable.displayName,
    email: membersTable.email,
    memberStatus: membersTable.memberStatus,
    membershipTier: membersTable.membershipTier,
    iceContactName: membersTable.iceContactName,
    iceContactPhone: membersTable.iceContactPhone,
    suburb: membersTable.suburb,
    city: membersTable.city,
  }).from(membersTable).where(eq(membersTable.whatsappNumber, from)).limit(1);

  const tierLabel = row?.membershipTier === "individual" ? "Individual (R150/mo)"
    : row?.membershipTier === "family" ? "Family (R250/mo)"
    : "Free";
  const ice = row?.iceContactName && row?.iceContactPhone
    ? `${row.iceContactName} — ${row.iceContactPhone}`
    : "Not set";
  const location = [row?.suburb, row?.city].filter(Boolean).join(", ") || "Not set";

  await sendWhatsApp(from, to, [
    `👋 Welcome back, ${name}!`,
    ``,
    `Here is what we have on file for you:`,
    ``,
    `📛 Name: ${row?.displayName ?? name}`,
    `📧 Email: ${row?.email ?? "Not set"}`,
    `📍 Location: ${location}`,
    `🛡️ Membership: ${tierLabel}`,
    `🆘 ICE contact: ${ice}`,
    ``,
    `Is this correct?`,
    ``,
    `1 ✅ Yes, all correct`,
    `2 ✏️ I need to update something`,
    `0 Skip — go to Main Menu`,
  ].join("\n"));
}

function mainMenuText(name: string, member: MemberInfo | null): string {
  const isOperator = member?.role === "operator";

  if (isOperator) {
    return [
      `${name} 👋 Situation Room — you're in.`,
      ``,
      `1️⃣  Travel with Cyber Chaperone 🛡️`,
      `2️⃣  What is eblockwatch?`,
      `3️⃣  Membership options`,
      `4️⃣  Activate my membership`,
      `5️⃣  👤 My Account`,
      `6️⃣  eblockshop`,
      `7️⃣  Speak to a person`,
      `8️⃣  📣 Invite a Friend`,
      `9️⃣  📖 Getting Started Guide`,
      ``,
      `🚨 URGENT? Reply 10 — a real person will be on it immediately.`,
      ``,
      `Reply with a number to choose.`,
    ].join("\n");
  }

  const statusLine = membershipStatusLine(
    member?.memberStatus ?? "unknown",
    member?.membershipTier ?? null,
    member?.loyaltyTier,
  );
  const isUnknown = !member || member.memberStatus === "unverified";
  return [
    `🛡️ *eblockwatch — Cyber Chaperone*`,
    ``,
    `Hi ${name}. I'm Arnie — André Snyman's digital safety companion.`,
    `We have one job: get you there safely, every time.`,
    ``,
    statusLine,
    ``,
    isUnknown ? `0️⃣  Join eblockwatch — register now (it's free)` : null,
    `1️⃣  Travel with Cyber Chaperone 🛡️`,
    `2️⃣  What is eblockwatch?`,
    `3️⃣  Membership options`,
    `4️⃣  Activate my membership`,
    `5️⃣  👤 My Account`,
    `6️⃣  eblockshop`,
    `7️⃣  Speak to a person`,
    `8️⃣  📣 Invite a Friend`,
    `9️⃣  📖 Getting Started Guide`,
    ``,
    `🚨 *EMERGENCY? Reply 10* — we will get the world to save you.`,
    isUnknown ? null : `Reply 0 to come back to this menu any time.`,
    ``,
    `📺 New here? See what we do:`,
    `https://www.facebook.com/share/v/1ACByM44QZ/?mibextid=wwXIfr`,
  ].filter((l) => l !== null).join("\n");
}

// Sends the main menu with a 👥 nearby member count appended — the marketing footer.
// Uses the member's registered home coordinates. Falls back silently if no coords.
async function sendMainMenuWithNearby(from: string, to: string, name: string, member: MemberInfo | null): Promise<void> {
  const coords = await getMemberHomeCoords(from);
  let nearbyLine = "";
  if (coords) {
    const { count, radiusKm } = await pickRadiusAndCount(coords.lat, coords.lon);
    if (count > 0) nearbyLine = `\n\n${nearbyCoverageText(count, radiusKm)}`;
  }
  await sendWhatsApp(from, to, mainMenuText(name, member) + nearbyLine);
}

// ── Shared membership tier text ───────────────────────────────────────────────
// Used across all menu paths: info screen, activation flow, and upgrade prompts.
// Each tier has a one-line payoff line + what it ADDS over the tier below.

function membershipOptionsText(name: string, currentTier?: string | null): string {
  const isPaying = currentTier === "individual" || currentTier === "family";
  const isFamily = currentTier === "family";

  const statusLine = isFamily
    ? `You are on the Family plan — full household protection active.`
    : isPaying
      ? `You are on the Individual plan — your route is being watched.`
      : `You are on Entry Level (free). Upgrading adds real layers of protection.`;

  return [
    `${name}, here are your eblockwatch membership options.`,
    ``,
    `──────────────────`,
    `🆓  ENTRY LEVEL  |  Free`,
    `Your first step into the eblockwatch family.`,
    ``,
    `✔ Community safety alerts`,
    `✔ Basic trip monitoring`,
    `✔ WhatsApp network access`,
    ``,
    `──────────────────`,
    `🛡️  INDIVIDUAL  |  R150/month`,
    `A dedicated layer of protection — just for you.`,
    ``,
    `Everything in Entry, plus:`,
    `✔ Live route & ETA tracking`,
    `✔ Operator watches your journey`,
    `✔ Auto-escalation to your ICE contact`,
    `✔ Red Alert if distress is detected`,
    ``,
    `→ paystack.shop/pay/cyber-chaperone`,
    ``,
    `──────────────────`,
    `👨‍👩‍👧  FAMILY  |  R250/month`,
    `The same protection for your whole household.`,
    ``,
    `Everything in Individual, plus:`,
    `✔ Up to 5 family members covered`,
    `✔ Separate ICE contacts per member`,
    ``,
    `→ paystack.shop/pay/family-cyber-chaperone`,
    ``,
    `──────────────────`,
    statusLine,
    ``,
    `Reply 3 to activate or upgrade.`,
    `Reply 0 for Main Menu.`,
  ].join("\n");
}

function membershipActivationText(name: string): string {
  return [
    `${name}, choose your plan.`,
    ``,
    `──────────────────`,
    `1️⃣  ENTRY LEVEL  |  Free`,
    `   Your first step into the eblockwatch family.`,
    ``,
    `──────────────────`,
    `2️⃣  INDIVIDUAL  |  R150/month`,
    `   A dedicated layer of protection — just for you.`,
    `   + Live route & ETA tracking`,
    `   + Operator watches your journey`,
    `   + Auto-escalation to your ICE contact`,
    `   + Red Alert if distress is detected`,
    ``,
    `──────────────────`,
    `3️⃣  FAMILY  |  R250/month`,
    `   Full protection for your whole household (up to 5).`,
    `   + Everything in Individual`,
    `   + Separate ICE contacts per member`,
    ``,
    `──────────────────`,
    `Reply 1, 2, or 3 to choose your plan.`,
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
    await sendMainMenuWithNearby(from, to, name, member);
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
    `🛡️ *Cyber Chaperone — ${name}*`,
    ``,
    `Choose an option:`,
    ``,
    `1. Start a trip — get route, navigation links & live monitoring`,
    `2. Update my current trip`,
    `3. Change my destination`,
    `4. I have arrived safely ✅`,
    `5. I need help 🆘`,
    `6. How Cyber Chaperone works`,
    `7. Speak to Andre`,
    ``,
    `Reply 0 for Main Menu.`,
  ].join("\n");
}

function askForLocationText(name: string): string {
  return [
    `${name}, let's get you covered. 🛡️`,
    ``,
    `Please send your current location pin 📍`,
    ``,
    `(Tap the 📎 clip → Location → Send Your Current Location)`,
    ``,
    `Reply 0 for Main Menu.`,
  ].join("\n");
}

async function sendStartLocationPrompt(from: string, to: string, name: string): Promise<void> {
  const [memberRow] = await db
    .select({ homeAddress: membersTable.homeAddress })
    .from(membersTable)
    .where(eq(membersTable.whatsappNumber, from))
    .limit(1);

  if (memberRow?.homeAddress) {
    await sendWhatsApp(from, to, [
      `${name}, are you starting from Home 🏠?`,
      ``,
      `1. Yes — start from Home 🏠`,
      `2. No — I am somewhere else`,
      ``,
      `Or share your location pin 📍 to start from a different place.`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
  } else {
    await sendWhatsApp(from, to, askForLocationText(name));
  }
}

function ccInfoText(name: string): string {
  return [
    `${name}, here is how Cyber Chaperone works:`,
    ``,
    `🟢 Start — drop your pin and tell us where you are heading.`,
    `🔵 Monitor — we watch your route. No news is good news.`,
    `📍 Check-ins — we send gentle check-ins along the way.`,
    `✅ Arrive — send ARRIVED or STOP and your trip is closed.`,
    `🆘 Emergency — send HELP and we escalate immediately.`,
    ``,
    `Andre is watching. You are not alone on the road.`,
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

  const nearbyDistress = await (async () => {
    const lat = activeTrip?.startLat ?? activeTrip?.destLat;
    const lon = activeTrip?.startLon ?? activeTrip?.destLon;
    if (lat && lon) {
      const { count, radiusKm } = await pickRadiusAndCount(lat, lon);
      if (count > 0) return `\n\n${nearbyCoverageText(count, radiusKm)}`;
    }
    return "";
  })();

  await sendWhatsApp(from, to, [
    `🆘 *${memberLabel} — we are on it.*`,
    ``,
    `André has been woken up. The Situation Room is on alert right now.`,
    `You are not alone. We will get the world to you.`,
    ``,
    `Tell us what's happening:`,
    ``,
    `1. 🚨 I am in danger`,
    `2. 🚗 I have broken down`,
    `3. 🗺️ I am lost`,
    `4. 🏥 Medical emergency`,
    `5. 📞 Call me now`,
    ``,
    `Reply 0 for Main Menu.`,
  ].join("\n") + nearbyDistress);

  await resetConvState(from);

  // Alert ICE contact directly if the member has one registered
  const iceDistress = await getMemberIce(from);
  if (iceDistress) {
    await sendIceContactAlert(
      to,
      memberLabel,
      from,
      iceDistress.iceContactName,
      iceDistress.iceContactPhone,
      activeTrip ?? null,
      `${memberLabel} has sent a distress signal via Cyber Chaperone.`,
    );
  }

  await sendEmergencyAlert(to, memberLabel, from);

  await sendOperatorMirror(
    to,
    [
      `🚨 CYBER CHAPERONE — RED`,
      `Member: ${memberLabel}`,
      `Known member: ${member?.isKnown ? "YES" : "NO"}`,
      activeTrip ? `Trip: ${activeTrip.title} (ID: ${activeTrip.id})` : `Trip: No active trip`,
      `Distress message: "${excerpt(body, 100)}"`,
      iceDistress ? `ICE contact alerted: ${iceDistress.iceContactName} (${iceDistress.iceContactPhone})` : `ICE contact: not set`,
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

  const nearbyArrival = await (async () => {
    const lat = activeTrip.destLat ?? activeTrip.startLat;
    const lon = activeTrip.destLon ?? activeTrip.startLon;
    if (lat && lon) {
      const { count, radiusKm } = await pickRadiusAndCount(lat, lon);
      if (count > 0) return `\n\n${nearbyCoverageText(count, radiusKm)}`;
    }
    return "";
  })();

  await sendWhatsApp(from, to, [
    `🏡 *${memberLabel} — welcome home.*`,
    ``,
    `Trip closed. You made it safely.`,
    `André and the team are glad you're home.`,
    ``,
    `This is what eblockwatch is for — we start the journey together and we end it together.`,
    ``,
    `Reply 0 for Main Menu.`,
  ].join("\n") + nearbyArrival);

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
      `${memberLabel}, just a quick check. 🛡️`,
      ``,
      `You have an active trip already:`,
      ``,
      `${activeTrip.title}`,
      ``,
      `Your message mentions:`,
      ``,
      `${newDestination}`,
      ``,
      `What would you like to do?`,
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
    await sendMainMenuWithNearby(from, to, name, member);
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    return;
  }

  if (choice === "1") {
    // Start new trip — ask for location (home-aware)
    await setConvState(from, {
      currentFlow: FLOW_TRIP_FLOW,
      currentStep: STEP_WAITING_FOR_START_LOCATION,
      pendingTripData: {},
    });
    await sendStartLocationPrompt(from, to, name);
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
    await sendMainMenuWithNearby(from, to, name, member);
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
    const choice = body.trim();

    const [memberRow] = await db
      .select({ homeLat: membersTable.homeLat, homeLon: membersTable.homeLon, homeAddress: membersTable.homeAddress })
      .from(membersTable)
      .where(eq(membersTable.whatsappNumber, from))
      .limit(1);
    const savedHome = memberRow?.homeAddress ? memberRow : null;

    // ── Has saved home — numbered choice ──────────────────────────────────────
    if (savedHome && !hasPin) {
      if (choice === "1") {
        const updatedPending: PendingTripData = {
          ...pending,
          startLocation: "Home 🏠",
          startLat: savedHome.homeLat ?? undefined,
          startLon: savedHome.homeLon ?? undefined,
        };
        await setConvState(from, { currentFlow: FLOW_TRIP_FLOW, currentStep: STEP_WAITING_FOR_DESTINATION, pendingTripData: updatedPending });
        await sendWhatsApp(from, to, `Got it — starting from Home 🏠.\n\nWhere are you heading today?\n\nReply 0 for Main Menu.`);
        log.info({ from }, "Trip flow: using saved home address");
        return;
      }
      if (choice === "2") {
        await setConvState(from, { currentFlow: FLOW_TRIP_FLOW, currentStep: STEP_WAITING_FOR_HOME_OVERRIDE, pendingTripData: pending });
        await sendWhatsApp(from, to, [
          `No problem — please share your current location pin 📍`,
          ``,
          `(Tap the 📎 clip → Location → Send Your Current Location)`,
          ``,
          `Reply 0 for Main Menu.`,
        ].join("\n"));
        return;
      }
      // Unrecognised text — re-show the home menu
      await sendWhatsApp(from, to, [
        `${name}, are you starting from Home 🏠?`,
        ``,
        `1. Yes — start from Home 🏠`,
        `2. No — I am somewhere else`,
        ``,
        `Or share your location pin 📍 to start from a different place.`,
        ``,
        `Reply 0 for Main Menu.`,
      ].join("\n"));
      return;
    }

    // ── Has saved home — sent a pin (override) ────────────────────────────────
    if (savedHome && hasPin) {
      const geocoded = await reverseGeocodeStreetAddress(latitude, longitude);
      const twilioName = [label, address].filter(Boolean).join(", ");
      const startLocation = (geocoded ?? twilioName) || `${latitude},${longitude}`;
      const updatedPending: PendingTripData = { ...pending, startLocation, startLat: latitude, startLon: longitude };
      await setConvState(from, { currentFlow: FLOW_TRIP_FLOW, currentStep: STEP_WAITING_FOR_DESTINATION, pendingTripData: updatedPending });
      await sendWhatsApp(from, to, `Got it — starting from ${startLocation}. 📍\n\nWhere are you heading today?\n\nReply 0 for Main Menu.`);
      log.info({ from, startLocation }, "Trip flow: pin override (home exists)");
      return;
    }

    // ── No home saved — first pin becomes home ────────────────────────────────
    if (!savedHome && hasPin) {
      const geocoded = await reverseGeocodeStreetAddress(latitude, longitude);
      const twilioName = [label, address].filter(Boolean).join(", ");
      const startLocation = (geocoded ?? twilioName) || `${latitude},${longitude}`;
      await db
        .update(membersTable)
        .set({ homeLat: latitude, homeLon: longitude, homeAddress: startLocation })
        .where(eq(membersTable.whatsappNumber, from));
      const updatedPending: PendingTripData = { ...pending, startLocation: "Home 🏠", startLat: latitude, startLon: longitude };
      await setConvState(from, { currentFlow: FLOW_TRIP_FLOW, currentStep: STEP_WAITING_FOR_DESTINATION, pendingTripData: updatedPending });
      await sendWhatsApp(from, to, `Got it — I've saved this as your Home 🏠.\n\nWhere are you heading today?\n\nReply 0 for Main Menu.`);
      log.info({ from, startLocation }, "Trip flow: home saved from first pin");
      return;
    }

    // ── No home, no pin — ask for location pin ────────────────────────────────
    await sendWhatsApp(from, to, askForLocationText(name));
    return;
  }

  if (step === STEP_WAITING_FOR_HOME_OVERRIDE) {
    const hasPin = latitude !== "" && longitude !== "";

    if (!hasPin) {
      await sendWhatsApp(from, to, [
        `Please share your current location pin 📍`,
        ``,
        `(Tap the 📎 clip → Location → Send Your Current Location)`,
        ``,
        `Reply 0 for Main Menu.`,
      ].join("\n"));
      return;
    }

    const geocoded = await reverseGeocodeStreetAddress(latitude, longitude);
    const twilioName = [label, address].filter(Boolean).join(", ");
    const startLocation = (geocoded ?? twilioName) || `${latitude},${longitude}`;
    const updatedPending: PendingTripData = { ...pending, startLocation, startLat: latitude, startLon: longitude };
    await setConvState(from, { currentFlow: FLOW_TRIP_FLOW, currentStep: STEP_WAITING_FOR_DESTINATION, pendingTripData: updatedPending });
    await sendWhatsApp(from, to, `Got it — starting from ${startLocation}. 📍\n\nWhere are you heading today?\n\nReply 0 for Main Menu.`);
    log.info({ from, startLocation }, "Trip flow: home override pin received");
    return;
  }

  if (step === STEP_WAITING_FOR_DESTINATION) {
    const destination = body.trim();
    const updatedPending: PendingTripData = { ...pending, destination };
    await setConvState(from, {
      currentFlow: FLOW_TRIP_FLOW,
      currentStep: STEP_WAITING_FOR_DEPARTURE,
      pendingTripData: updatedPending,
    });
    await sendWhatsApp(
      from,
      to,
      `Perfect — heading to ${destination}. 🗺️\n\nAre you leaving now?\n\n1. Leave now\n2. Set a departure time\n\nReply 0 for Main Menu.`,
    );
    log.info({ from, destination }, "Trip flow: destination collected");
    return;
  }

  if (step === STEP_WAITING_FOR_DEPARTURE) {
    const trimmed = body.trim();
    const isLeavingNow = trimmed === "1" || /^(yes|y|ja|ok|okay|now|leaving|leaving now)$/i.test(trimmed);
    const isSettingTime = trimmed === "2";

    if (isSettingTime) {
      await setConvState(from, {
        currentFlow: FLOW_TRIP_FLOW,
        currentStep: STEP_WAITING_FOR_DEPARTURE_TIME,
        pendingTripData: pending,
      });
      await sendWhatsApp(from, to, `What time are you planning to leave? (e.g. 14:30)\n\nReply 0 for Main Menu.`);
      return;
    }

    if (!isLeavingNow) {
      await sendWhatsApp(
        from,
        to,
        `Please choose:\n\n1. Leave now\n2. Set a departure time\n\nReply 0 for Main Menu.`,
      );
      return;
    }

    const { startLocation, destination, startLat, startLon } = pending;
    if (!startLocation || !destination) {
      await resetConvState(from);
      await sendWhatsApp(from, to, `Something went wrong collecting your trip details. Please start again.\n\nReply 0 for Main Menu.`);
      return;
    }

    // Fetch Google Maps checkpoints + OSRM route in parallel
    const [gmapResult, routeInfo] = await Promise.all([
      calculateGoogleMapsRoute(startLocation, destination),
      calculateRouteInfo(
        startLocation,
        destination,
        startLat && startLon ? { lat: startLat, lon: startLon } : undefined,
      ),
    ]);

    const eta = gmapResult?.etaTime ?? routeInfo?.etaTime ?? null;
    log.info({ from, pendingData: pending, eta, routeAvailable: !!routeInfo, gmapCheckpoints: gmapResult?.checkpointTowns.length ?? 0 }, "Trip flow: departure confirmed (leaving now) — creating trip");
    await createTrip(from, to, member, startLocation, destination, eta, body, messageSid, log, routeInfo, gmapResult?.checkpointTowns);
    return;
  }

  if (step === STEP_WAITING_FOR_DEPARTURE_TIME) {
    const trimmed = body.trim();
    const timeMatch = trimmed.match(/^(?:ETA\s+)?(\d{1,2}:\d{2}(?:\s*[aApP][mM])?)$/i);

    if (!timeMatch) {
      await sendWhatsApp(from, to, `Please send your departure time in HH:MM format (e.g. 14:30).\n\nReply 0 for Main Menu.`);
      return;
    }

    const statedEta = timeMatch[1];
    const { startLocation, destination, startLat, startLon } = pending;
    if (!startLocation || !destination) {
      await resetConvState(from);
      await sendWhatsApp(from, to, `Something went wrong collecting your trip details. Please start again.\n\nReply 0 for Main Menu.`);
      return;
    }

    const [gmapResult2, routeInfo] = await Promise.all([
      calculateGoogleMapsRoute(startLocation, destination),
      calculateRouteInfo(
        startLocation,
        destination,
        startLat && startLon ? { lat: startLat, lon: startLon } : undefined,
      ),
    ]);

    log.info({ from, pendingData: pending, statedEta, routeAvailable: !!routeInfo, gmapCheckpoints: gmapResult2?.checkpointTowns.length ?? 0 }, "Trip flow: departure time set — creating trip");
    await createTrip(from, to, member, startLocation, destination, statedEta, body, messageSid, log, routeInfo, gmapResult2?.checkpointTowns);
    return;
  }

  // STEP_WAITING_FOR_ETA — legacy fallback for in-flight conversations
  if (step === STEP_WAITING_FOR_ETA) {
    const eta = body.trim();
    const updatedPending: PendingTripData = { ...pending, eta };

    if (!updatedPending.startLocation || !updatedPending.destination) {
      await resetConvState(from);
      await sendWhatsApp(from, to, `Something went wrong collecting your trip details. Please start again.\n\nReply 0 for Main Menu.`);
      return;
    }

    log.info({ from, pendingTripData: updatedPending }, "Trip flow: all fields collected (legacy ETA step) — creating trip");
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
    await sendMainMenuWithNearby(from, to, name, member);
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
    await sendStartLocationPrompt(from, to, name);
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
    await sendWhatsApp(from, to, `We have flagged this as urgent. A human support response is being escalated now. If you can, send your location pin 📍 and a short message telling us what is wrong.`);
    await sendEmergencyAlert(to, name, from);
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
    await sendMainMenuWithNearby(from, to, name, member);
    return;
  }

  if (choice === "1") {
    // Membership Options — same as main menu option 2
    await resetConvState(from);
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    await sendWhatsApp(from, to, membershipOptionsText(name, member?.membershipTier));
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
    // eblockshop — real product menu
    await resetConvState(from);
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    const isPaying = member?.membershipTier === "individual" || member?.membershipTier === "family";
    await sendWhatsApp(from, to, [
      `🛒 Welcome to eblockshop, ${name}!`,
      ``,
      `Your one-stop shop for safer living.`,
      ``,
      `1. 🛡️ Cyber Chaperone Individual — R150/month`,
      `   Full route tracking, ICE escalation, priority response.`,
      `   → https://paystack.shop/pay/cyber-chaperone`,
      ``,
      `2. 👨‍👩‍👧 Cyber Chaperone Family — R250/month`,
      `   Cover your whole family (up to 5 members).`,
      `   → https://paystack.shop/pay/family-cyber-chaperone`,
      ``,
      isPaying
        ? [
            `3. 📡 Bliksim Location Unit`,
            `   Compact GPS tracker for your vehicle or bag.`,
            `   Available to paying members — reply 3 and Andre will be in touch.`,
          ].join("\n")
        : [
            `3. 📡 Bliksim Location Unit`,
            `   Compact GPS tracker — available to Individual and Family members.`,
            `   Upgrade your membership first to unlock this.`,
          ].join("\n"),
      ``,
      `Reply 1, 2, or 3 to choose.`,
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

// ── Profile wizard ────────────────────────────────────────────────────────────

async function fetchMemberProfile(whatsappNumber: string) {
  const rows = await db.select({
    displayName: membersTable.displayName,
    email: membersTable.email,
    mobile: membersTable.mobile,
    homeAddress: membersTable.homeAddress,
    suburb: membersTable.suburb,
    city: membersTable.city,
    province: membersTable.province,
    iceContactName: membersTable.iceContactName,
    iceContactPhone: membersTable.iceContactPhone,
  }).from(membersTable).where(eq(membersTable.whatsappNumber, whatsappNumber)).limit(1);
  return rows[0] ?? null;
}

function formatMemberDetailsGreeting(
  phone: string,
  profile: Awaited<ReturnType<typeof fetchMemberProfile>>,
  membershipTier: string | null,
): string {
  if (!profile) return "";
  const displayPhone = phone.replace(/^whatsapp:/, "").replace(/^(\+27|27)(\d{2})(\d{3})(\d{4})$/, "+27 $2 $3 $4");
  const tier = membershipTier
    ? membershipTier.charAt(0).toUpperCase() + membershipTier.slice(1)
    : "Entry Level";
  const location = [profile.suburb, profile.city].filter(Boolean).join(", ") || null;
  return [
    `👋 Welcome back, *${profile.displayName}*!`,
    ``,
    `Here's what we have on file for you:`,
    ``,
    `📱 *WhatsApp:* ${displayPhone}`,
    profile.email ? `📧 *Email:* ${profile.email}` : `📧 *Email:* not set`,
    location ? `🏠 *Area:* ${location}` : null,
    profile.iceContactName ? `🆘 *ICE Contact:* ${profile.iceContactName}` : null,
    `🛡️ *Membership:* ${tier}`,
    ``,
    `Are these details correct? Reply *4* (My Account) to update anything.`,
    ``,
    `──────────────────`,
  ].filter((l) => l !== null).join("\n");
}

const WIZARD_LABELS: Record<string, string> = {
  [STEP_WIZARD_NAME]:     "Full name",
  [STEP_WIZARD_EMAIL]:    "Email address",
  [STEP_WIZARD_MOBILE]:   "Mobile number",
  [STEP_WIZARD_ADDRESS]:  "Street address",
  [STEP_WIZARD_SUBURB]:   "Suburb",
  [STEP_WIZARD_CITY]:     "City",
  [STEP_WIZARD_PROVINCE]: "Province",
  [STEP_WIZARD_ICE]:      "ICE emergency contact",
};

function wizardStepMessage(step: string, current: string | null | undefined, stepNum: number): string {
  const total = WIZARD_STEP_ORDER.length;
  const val = current?.trim() ? current.trim() : "(not set)";
  const hint = step === STEP_WIZARD_ICE ? `\nFormat: ICE: Andre Snyman, 0825611065` : "";
  return [
    `Step ${stepNum} of ${total} — ${WIZARD_LABELS[step] ?? step}`,
    ``,
    `Current: ${val}`,
    hint,
    ``,
    `Type a new value, or send NEXT to keep it.`,
    `Reply 0 to cancel.`,
  ].join("\n");
}

function wizardCurrentValue(step: string, profile: Awaited<ReturnType<typeof fetchMemberProfile>>): string | null {
  if (!profile) return null;
  const map: Record<string, string | null | undefined> = {
    [STEP_WIZARD_NAME]:     profile.displayName,
    [STEP_WIZARD_EMAIL]:    profile.email,
    [STEP_WIZARD_MOBILE]:   profile.mobile,
    [STEP_WIZARD_ADDRESS]:  profile.homeAddress,
    [STEP_WIZARD_SUBURB]:   profile.suburb,
    [STEP_WIZARD_CITY]:     profile.city,
    [STEP_WIZARD_PROVINCE]: profile.province,
    [STEP_WIZARD_ICE]:      profile.iceContactName
      ? `${profile.iceContactName}, ${profile.iceContactPhone ?? ""}`
      : null,
  };
  return map[step] ?? null;
}

async function startSmartProfileUpdate(from: string, to: string, name: string): Promise<void> {
  const p = await fetchMemberProfile(from);

  // Auto-populate mobile from WhatsApp number if not yet saved
  const waNumber = from.replace(/^whatsapp:/, "");
  if (!p?.mobile && waNumber) {
    try {
      await db.update(membersTable).set({ mobile: waNumber }).where(eq(membersTable.whatsappNumber, from));
    } catch { /* best-effort */ }
  }
  const mobile = p?.mobile ?? waNumber;

  const none = "(not set)";
  const ice = p?.iceContactName
    ? `${p.iceContactName}${p.iceContactPhone ? ` (${p.iceContactPhone})` : ""}`
    : none;
  const address = [p?.homeAddress, p?.suburb, p?.city].filter(Boolean).join(", ") || none;

  // Issue an OTP so the member can also log into the website
  const phone = normalisePhone(from.replace(/^whatsapp:/, ""));
  const otpCode = issueOtp(phone);
  const websiteUrl = "https://cyber-chaperone-r--ryfsny.replit.app/website/";

  const lines = [
    `${name}, here's what we have for you:`,
    ``,
    `A. Name:    ${p?.displayName ?? none}`,
    `B. Email:   ${p?.email ?? none}`,
    `C. Mobile:  ${mobile}`,
    `D. Address: ${address}`,
    `E. ICE:     ${ice}`,
    ``,
    `Type A, B, C, D or E to update a field.`,
    ``,
    `── Or update everything on the website ──`,
    websiteUrl,
    `Login code: *${otpCode}* (valid 10 min)`,
    ``,
    `Reply 0 for Main Menu.`,
  ];
  await setConvState(from, { currentFlow: FLOW_PROFILE_UPDATE, currentStep: STEP_PROFILE_MENU });
  await sendWhatsApp(from, to, lines.join("\n"));
}

async function handleProfileWizardStep(ctx: MenuContext, state: ConvState): Promise<void> {
  const { from, to, body, member, messageSid } = ctx;
  const name = member?.displayName ?? from;
  const trimmed = body.trim();

  await saveMessage(from, to, body, messageSid, null);

  if (trimmed === "0") {
    await resetConvState(from);
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    await sendMainMenuWithNearby(from, to, name, member);
    return;
  }

  const step = state.currentStep ?? STEP_WIZARD_NAME;
  const stepNum = WIZARD_STEP_ORDER.indexOf(step as typeof WIZARD_STEP_ORDER[number]) + 1;
  const changes: Record<string, string | null> = {
    ...(state.pendingTripData?.wizardChanges ?? {}),
  };
  const isSkip = /^(next|skip|keep|ok|yes|-)$/i.test(trimmed);
  let valid = true;

  if (!isSkip) {
    switch (step) {
      case STEP_WIZARD_NAME: {
        if (trimmed.length >= 2 && /[a-z]/i.test(trimmed)) {
          const parts = trimmed.split(/\s+/);
          changes.displayName = trimmed;
          changes.firstName = parts[0];
          changes.lastName = parts.slice(1).join(" ") || null;
        } else { valid = false; }
        break;
      }
      case STEP_WIZARD_EMAIL: {
        const email = trimmed.match(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i)?.[0]?.toLowerCase() ?? null;
        if (email) { changes.email = email; } else { valid = false; }
        break;
      }
      case STEP_WIZARD_MOBILE: {
        const digits = trimmed.replace(/\D/g, "");
        if (digits.length >= 9) { changes.mobile = digits; } else { valid = false; }
        break;
      }
      case STEP_WIZARD_ADDRESS: {
        if (trimmed.length >= 3) { changes.homeAddress = trimmed; } else { valid = false; }
        break;
      }
      case STEP_WIZARD_SUBURB:
        if (trimmed.length >= 2) { changes.suburb = trimmed; } else { valid = false; }
        break;
      case STEP_WIZARD_CITY:
        if (trimmed.length >= 2) { changes.city = trimmed; } else { valid = false; }
        break;
      case STEP_WIZARD_PROVINCE:
        if (trimmed.length >= 2) { changes.province = trimmed; } else { valid = false; }
        break;
      case STEP_WIZARD_ICE: {
        const m = /^(?:ICE:\s*)?(.+?),\s*(\+?[\d\s]{9,})$/i.exec(trimmed);
        if (m) {
          changes.iceContactName = m[1].trim();
          changes.iceContactPhone = m[2].replace(/\s/g, "");
        } else { valid = false; }
        break;
      }
    }
  }

  if (!valid) {
    const profile = await fetchMemberProfile(from);
    await sendWhatsApp(from, to,
      `Please try again — could not read that.\n\n` +
      wizardStepMessage(step, wizardCurrentValue(step, profile), stepNum)
    );
    return;
  }

  // Store changes so far
  await setConvState(from, {
    pendingTripData: { wizardChanges: changes },
  });

  const nextStep = WIZARD_STEP_ORDER[stepNum] ?? null; // stepNum is 1-based, array is 0-based so stepNum = next index

  if (nextStep) {
    const profile = await fetchMemberProfile(from);
    await setConvState(from, { currentStep: nextStep });
    await sendWhatsApp(from, to, wizardStepMessage(nextStep, wizardCurrentValue(nextStep, profile), stepNum + 1));
  } else {
    // All steps done — save everything at once
    const set: {
      displayName?: string; firstName?: string; lastName?: string;
      email?: string | null; mobile?: string | null;
      homeAddress?: string | null; suburb?: string | null;
      city?: string | null; province?: string | null;
      iceContactName?: string | null; iceContactPhone?: string | null;
    } = {};
    if (changes.displayName != null) { set.displayName = changes.displayName; set.firstName = changes.firstName ?? changes.displayName; set.lastName = changes.lastName ?? ""; }
    if ("email"          in changes) set.email          = changes.email;
    if ("mobile"         in changes) set.mobile         = changes.mobile;
    if ("homeAddress"    in changes) set.homeAddress    = changes.homeAddress;
    if ("suburb"         in changes) set.suburb         = changes.suburb;
    if ("city"           in changes) set.city           = changes.city;
    if ("province"       in changes) set.province       = changes.province;
    if ("iceContactName" in changes) { set.iceContactName = changes.iceContactName; set.iceContactPhone = changes.iceContactPhone; }

    if (Object.keys(set).length > 0) {
      try {
        await db.update(membersTable).set(set).where(eq(membersTable.whatsappNumber, from));
      } catch { /* best-effort */ }
    }

    const displayLabels: Record<string, string> = {
      displayName: "Name", email: "Email", mobile: "Mobile",
      homeAddress: "Address", suburb: "Suburb", city: "City",
      province: "Province", iceContactName: "ICE contact",
    };
    const summaryLines = Object.entries(changes)
      .filter(([k]) => displayLabels[k])
      .map(([k, v]) => `• ${displayLabels[k]}: ${v ?? "(cleared)"}`);

    await resetConvState(from);
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });

    const finalName = changes.displayName ?? name;
    if (summaryLines.length > 0) {
      await sendWhatsApp(from, to, [
        `✅ All done, ${finalName}!`,
        ``,
        `Here is what was updated:`,
        ...summaryLines,
        ``,
        `Reply 0 for Main Menu.`,
      ].join("\n"));
      await sendOperatorMirror(to, [`PROFILE WIZARD COMPLETE`, `Member: ${name}`, ...summaryLines].join("\n"));
    } else {
      await sendWhatsApp(from, to, `${name}, nothing was changed.\n\nReply 0 for Main Menu.`);
    }
  }
}

function profileUpdatePrompt(name: string): string {
  return [
    `${name}, what needs updating? Just type it:`,
    ``,
    `• Name → Kieren Snyman`,
    `• Email → kierens@tiscali.co.za`,
    `• Home address → 12 Oak Street, Bryanston`,
    `• ICE contact → ICE: Andre Snyman, 0825611065`,
    ``,
    `Reply 0 for Main Menu.`,
  ].join("\n");
}

async function handleProfileUpdateChoice(ctx: MenuContext, state: ConvState): Promise<void> {
  const { from, to, body, member, messageSid } = ctx;
  const name = member?.displayName ?? from;
  const trimmedBody = body.trim();
  const choice = trimmedBody;
  const letter = trimmedBody.toUpperCase();

  await saveMessage(from, to, body, messageSid, null);

  if (trimmedBody === "0") {
    await resetConvState(from);
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    await sendMainMenuWithNearby(from, to, name, member);
    return;
  }

  // ── Step 1: User picked a letter from the A-E profile menu ───────────────────
  if (state.currentStep === STEP_PROFILE_MENU) {
    const prompts: Record<string, { field: string; q: string }> = {
      A: { field: "name",    q: `What is your full name?` },
      B: { field: "email",   q: `What is your email address?` },
      C: { field: "mobile",  q: `What is your mobile number?` },
      D: { field: "address", q: `What is your home address?\n(e.g. 5 College Road, Bryanston)` },
      E: { field: "ice",     q: `Who is your emergency contact?\n\nType their name and number:\nJane Smith, 0821234567` },
    };
    const entry = prompts[letter];
    if (entry) {
      await setConvState(from, {
        currentFlow: FLOW_PROFILE_UPDATE,
        currentStep: STEP_PROFILE_VALUE,
        pendingTripData: { profileField: entry.field },
      });
      await sendWhatsApp(from, to, entry.q);
      return;
    }
    // Unrecognised — re-show the menu
    await startSmartProfileUpdate(from, to, name);
    return;
  }

  // ── Step 2: User typed the new value for the chosen field ────────────────────
  if (state.currentStep === STEP_PROFILE_VALUE) {
    const field = state.pendingTripData?.profileField;

    if (field === "name") {
      const parts = trimmedBody.split(/\s+/);
      await db.update(membersTable).set({
        firstName: parts[0],
        lastName: parts.slice(1).join(" ") || undefined,
        displayName: trimmedBody,
      }).where(eq(membersTable.whatsappNumber, from));
      await sendOperatorMirror(to, `PROFILE — NAME\nMember: ${name} → ${trimmedBody}`);
      await sendWhatsApp(from, to, `✅ Name updated to: *${trimmedBody}*`);
      await startSmartProfileUpdate(from, to, trimmedBody);
      return;
    }

    if (field === "email") {
      const emailRaw = trimmedBody.match(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i)?.[0]?.toLowerCase();
      if (!emailRaw) {
        await sendWhatsApp(from, to, `That doesn't look like a valid email. Please try again, or reply 0 for Main Menu.`);
        return;
      }
      await db.update(membersTable).set({ email: emailRaw }).where(eq(membersTable.whatsappNumber, from));
      await sendOperatorMirror(to, `PROFILE — EMAIL\nMember: ${name}\nEmail: ${emailRaw}`);
      await sendWhatsApp(from, to, `✅ Email updated to: *${emailRaw}*`);
      await startSmartProfileUpdate(from, to, name);
      return;
    }

    if (field === "mobile") {
      const mobile = trimmedBody.replace(/\s/g, "");
      await db.update(membersTable).set({ mobile }).where(eq(membersTable.whatsappNumber, from));
      await sendOperatorMirror(to, `PROFILE — MOBILE\nMember: ${name}\nMobile: ${mobile}`);
      await sendWhatsApp(from, to, `✅ Mobile updated to: *${mobile}*`);
      await startSmartProfileUpdate(from, to, name);
      return;
    }

    if (field === "address") {
      const address = trimmedBody.slice(0, 200);
      const parts = address.split(",").map((s: string) => s.trim());
      await db.update(membersTable).set({
        homeAddress: parts[0] ?? address,
        ...(parts[1] ? { suburb: parts[1] } : {}),
        ...(parts[2] ? { city: parts[2] } : {}),
      }).where(eq(membersTable.whatsappNumber, from));
      await sendOperatorMirror(to, `PROFILE — ADDRESS\nMember: ${name}\nAddress: ${address}`);
      await sendWhatsApp(from, to, `✅ Address updated to: *${address}*`);
      await startSmartProfileUpdate(from, to, name);
      return;
    }

    if (field === "ice") {
      const cleaned = trimmedBody.replace(/^ICE:\s*/i, "");
      const match = cleaned.match(/^(.+?),\s*(\+?[\d\s]+)$/);
      if (match) {
        const iceName = match[1].trim();
        const icePhone = match[2].replace(/\s/g, "");
        await db.update(membersTable).set({ iceContactName: iceName, iceContactPhone: icePhone }).where(eq(membersTable.whatsappNumber, from));
        await sendOperatorMirror(to, `PROFILE — ICE\nMember: ${name}\nICE: ${iceName} ${icePhone}`);
        await sendWhatsApp(from, to, `✅ ICE contact updated:\n*${iceName}* — ${icePhone}\n\nWe only contact them if we genuinely cannot reach you.`);
        await startSmartProfileUpdate(from, to, name);
      } else {
        await sendWhatsApp(from, to, `Please type their name and number like this:\n\nJane Smith, 0821234567\n\nOr reply 0 for Main Menu.`);
      }
      return;
    }

    // Unknown field — restart
    await startSmartProfileUpdate(from, to, name);
    return;
  }

  // ── Legacy steps (kept for in-flight sessions) ────────────────────────────────
  if (state.currentStep === STEP_WAITING_FOR_PROFILE_FIELD) {
    const trimmed = body.trim();
    const emailRaw = trimmed.match(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i)?.[0]?.toLowerCase() ?? null;
    const isIce = /^ICE:/i.test(trimmed);
    // Strip email out to get the name/address portion
    const textOnly = trimmed
      .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i, "")
      .trim();
    const looksLikeName = textOnly.length >= 2 && /^[a-záàäéèêëíìîïóòôöúùûüýñçA-Z\s'-]+$/i.test(textOnly);
    // Address: has digits, or has comma, or has common street words
    const looksLikeAddress = !looksLikeName && !isIce && !emailRaw && (
      /\d/.test(textOnly) || (/,/.test(textOnly) && textOnly.length > 5)
    );

    if (isIce) {
      // Reuse the existing ICE handler by setting the step and re-entering
      await setConvState(from, { currentFlow: FLOW_PROFILE_UPDATE, currentStep: STEP_WAITING_FOR_ICE });
      // Synthetic re-entry — call handler directly with the ICE body
      const icePattern = /^ICE:\s*(.+?),\s*(\+?[\d\s]+)$/i;
      const match = trimmed.match(icePattern);
      if (match) {
        const iceName = match[1].trim();
        const icePhone = match[2].replace(/\s/g, "");
        try {
          await db.update(membersTable).set({ iceContactName: iceName, iceContactPhone: icePhone }).where(eq(membersTable.whatsappNumber, from));
        } catch { /* best-effort */ }
        await resetConvState(from);
        await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
        await sendWhatsApp(from, to, `${name}, ICE contact saved. ✅\n\n${iceName} — ${icePhone}\n\nReply 0 for Main Menu.`);
        await sendOperatorMirror(to, `PROFILE UPDATE — ICE\nMember: ${name}\nICE: ${iceName} ${icePhone}`);
      } else {
        await sendWhatsApp(from, to, `${name}, please use this format:\n\nICE: Full Name, 0821234567\n\nReply 0 for Main Menu.`);
      }
      return;
    }

    if (emailRaw && looksLikeName) {
      // Name + email together
      const fullName = textOnly.replace(/\s+/g, " ");
      const parts = fullName.split(/\s+/);
      try {
        await db.update(membersTable).set({ firstName: parts[0], lastName: parts.slice(1).join(" ") || undefined, displayName: fullName, email: emailRaw }).where(eq(membersTable.whatsappNumber, from));
      } catch { /* best-effort */ }
      await resetConvState(from);
      await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
      await sendWhatsApp(from, to, `${fullName}, saved. ✅\n\nName: ${fullName}\nEmail: ${emailRaw}\n\nReply 0 for Main Menu.`);
      await sendOperatorMirror(to, `PROFILE UPDATE — NAME+EMAIL\nMember: ${name}\nNew name: ${fullName}\nNew email: ${emailRaw}`);
      return;
    }

    if (emailRaw) {
      // Email only
      try {
        await db.update(membersTable).set({ email: emailRaw }).where(eq(membersTable.whatsappNumber, from));
      } catch { /* best-effort */ }
      await resetConvState(from);
      await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
      await sendWhatsApp(from, to, `${name}, email saved. ✅\n\nEmail: ${emailRaw}\n\nReply 0 for Main Menu.`);
      await sendOperatorMirror(to, `PROFILE UPDATE — EMAIL\nMember: ${name}\nNew email: ${emailRaw}`);
      return;
    }

    if (looksLikeName) {
      // Name only
      const fullName = textOnly.replace(/\s+/g, " ");
      const parts = fullName.split(/\s+/);
      try {
        await db.update(membersTable).set({ firstName: parts[0], lastName: parts.slice(1).join(" ") || undefined, displayName: fullName }).where(eq(membersTable.whatsappNumber, from));
      } catch { /* best-effort */ }
      await resetConvState(from);
      await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
      await sendWhatsApp(from, to, `${fullName}, name saved. ✅\n\nReply 0 for Main Menu.`);
      await sendOperatorMirror(to, `PROFILE UPDATE — NAME\nMember: ${name}\nNew name: ${fullName}`);
      return;
    }

    if (looksLikeAddress) {
      // Home address
      const address = trimmed.slice(0, 200);
      try {
        await db.update(membersTable).set({ homeAddress: address }).where(eq(membersTable.whatsappNumber, from));
      } catch { /* best-effort */ }
      await resetConvState(from);
      await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
      await sendWhatsApp(from, to, `${name}, home address saved. ✅\n\n${address}\n\nReply 0 for Main Menu.`);
      await sendOperatorMirror(to, `PROFILE UPDATE — ADDRESS\nMember: ${name}\nNew address: ${address}`);
      return;
    }

    // Cannot figure out what they sent — re-prompt
    await sendWhatsApp(from, to, profileUpdatePrompt(name));
    return;
  }

  // Personal details step — accepts plain text or structured NAME:/EMAIL: format
  if (state.currentStep === STEP_WAITING_FOR_PERSONAL_DETAILS) {
    const trimmed = body.trim();
    // Extract email anywhere in the message (look for @ sign)
    const emailRaw = trimmed.match(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i)?.[0]?.toLowerCase() ?? null;
    // Remove email from the text to get the name portion
    const nameSource = trimmed
      .replace(/EMAIL:\s*\S+/i, "")
      .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i, "")
      .replace(/NAME:\s*/i, "")
      .trim();
    const isLikelyName = nameSource.length >= 2 && /^[a-záàäéèêëíìîïóòôöúùûüýñçA-Z\s'-]+$/i.test(nameSource);
    // Email-only: save email without touching the name
    if (!isLikelyName && emailRaw) {
      try {
        await db
          .update(membersTable)
          .set({ email: emailRaw })
          .where(eq(membersTable.whatsappNumber, from));
      } catch {
        // best-effort
      }
      await resetConvState(from);
      await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
      await sendWhatsApp(from, to, [
        `${name}, your email has been saved. ✅`,
        ``,
        `Email: ${emailRaw}`,
        ``,
        `Reply 0 for Main Menu.`,
      ].join("\n"));
      await sendOperatorMirror(to, [
        `PROFILE UPDATE — EMAIL ONLY`,
        `Member: ${name}`,
        `New email: ${emailRaw}`,
      ].join("\n"));
      return;
    }
    if (isLikelyName) {
      const fullName = nameSource.replace(/\s+/g, " ");
      const parts = fullName.split(/\s+/);
      const firstName = parts[0] ?? fullName;
      const lastName = parts.slice(1).join(" ") || null;
      try {
        await db
          .update(membersTable)
          .set({
            firstName,
            lastName: lastName ?? undefined,
            displayName: fullName,
            ...(emailRaw ? { email: emailRaw } : {}),
          })
          .where(eq(membersTable.whatsappNumber, from));
      } catch {
        // best-effort
      }
      await resetConvState(from);
      await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
      await sendWhatsApp(from, to, [
        `${fullName}, your personal details have been saved. ✅`,
        ``,
        `Name: ${fullName}`,
        emailRaw ? `Email: ${emailRaw}` : null,
        ``,
        `Reply 0 for Main Menu.`,
      ].filter((l) => l !== null).join("\n"));
      await sendOperatorMirror(to, [
        `PROFILE UPDATE — PERSONAL DETAILS`,
        `Member: ${name}`,
        `New name: ${fullName}`,
        emailRaw ? `New email: ${emailRaw}` : `Email: not provided`,
      ].join("\n"));
      return;
    }
    // Cannot parse — ask again simply
    await sendWhatsApp(from, to, [
      `${name}, just type your full name and we will save it.`,
      ``,
      `Example: Kieren Snyman`,
      ``,
      `If you also want to update your email, add it on the same line:`,
      `Kieren Snyman kierens@tiscali.co.za`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    return;
  }

  // Home address step — waiting for a plain-text address
  if (state.currentStep === STEP_WAITING_FOR_HOME_ADDRESS) {
    const address = body.trim().slice(0, 200);
    try {
      await db
        .update(membersTable)
        .set({ homeAddress: address })
        .where(eq(membersTable.whatsappNumber, from));
    } catch {
      // best-effort
    }
    await resetConvState(from);
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    await sendWhatsApp(from, to, [
      `${name}, your home address has been saved. ✅`,
      ``,
      `Address: ${address}`,
      ``,
      `The Situation Room will use this as your starting point when you begin a trip.`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    await sendOperatorMirror(to, [
      `PROFILE UPDATE — HOME ADDRESS`,
      `Member: ${name}`,
      `New address: ${address}`,
    ].join("\n"));
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
        `${name}, your emergency contact has been saved. ✅`,
        ``,
        `Name: ${iceName}`,
        `Number: ${icePhone}`,
        ``,
        `We will only contact them if we genuinely cannot reach you.`,
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
      `${name}, please send your emergency contact in this format:`,
      ``,
      `ICE: Full Name, 0821234567`,
      ``,
      `Example: ICE: Jane Snyman, 0825611065`,
      ``,
      `We only contact them if we genuinely cannot reach you.`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    return;
  }

  if (choice === "4") {
    // ICE contact
    await setConvState(from, { currentFlow: FLOW_PROFILE_UPDATE, currentStep: STEP_WAITING_FOR_ICE });
    await sendWhatsApp(from, to, [
      `${name}, who should we contact if we cannot reach you?`,
      ``,
      `Please send your emergency contact in this format:`,
      ``,
      `ICE: Full Name, 0821234567`,
      ``,
      `Example: ICE: Jane Snyman, 0825611065`,
      ``,
      `We only contact them if we genuinely cannot reach you.`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    return;
  }

  if (choice === "8") {
    // Safety questionnaire
    await setConvState(from, {
      currentFlow: FLOW_SAFETY_PROFILE,
      currentStep: STEP_SAFETY_MOTHER_NAME,
      pendingTripData: {},
    });
    await sendWhatsApp(from, to, [
      `🛡️ Let's build your safety profile, ${name}.`,
      ``,
      `André uses this to look after you properly on the road. Takes about 2 minutes.`,
      ``,
      `*Question 1 of 3:* What is your mother's full name?`,
      ``,
      `Reply 0 to cancel.`,
    ].join("\n"));
    return;
  }

  if (choice === "1") {
    // Personal details
    await setConvState(from, { currentFlow: FLOW_PROFILE_UPDATE, currentStep: STEP_WAITING_FOR_PERSONAL_DETAILS });
    await sendWhatsApp(from, to, [
      `${name}, let's update your personal details.`,
      ``,
      `Please send your name (and email if you want to update it) like this:`,
      ``,
      `NAME: Kieren Snyman`,
      `EMAIL: kierens@example.com`,
      ``,
      `You can leave out the EMAIL line if you only want to update your name.`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    return;
  }

  if (choice === "2") {
    // Home location
    await setConvState(from, { currentFlow: FLOW_PROFILE_UPDATE, currentStep: STEP_WAITING_FOR_HOME_ADDRESS });
    await sendWhatsApp(from, to, [
      `${name}, what is your home address?`,
      ``,
      `Please send your full home address, for example:`,
      ``,
      `12 Oak Street, Bryanston, Sandton, 2021`,
      ``,
      `The Situation Room will use this as your starting point when you begin a trip.`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    return;
  }

  // Options 3, 5, 6 — connect to a human
  const humanHandoffOptions: Record<string, string> = {
    "3": "vehicle details",
    "5": "family members",
    "6": "local network / conduit details",
  };
  if (humanHandoffOptions[choice]) {
    await sendWhatsApp(from, to, [
      `${name}, to update your ${humanHandoffOptions[choice]}, reply 7 from the Main Menu and a person will assist you directly.`,
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
    `8. 🛡️ Safety questionnaire (mother + vehicle + location)`,
    ``,
    `Reply 0 for Main Menu.`,
  ].join("\n"));
}

// ── Safety Profile Flow ───────────────────────────────────────────────────────

// Called from webhook.ts when an image arrives during STEP_SAFETY_VEHICLE_PHOTO.
// Returns true if it handled the image, false if not in that step.
export async function handleSafetyVehiclePhoto(
  from: string,
  to: string,
  photoUrl: string,
  sendReplyFn: (from: string, to: string, body: string) => Promise<void>,
): Promise<boolean> {
  const state = await getConvState(from);
  if (state.currentFlow !== FLOW_SAFETY_PROFILE || state.currentStep !== STEP_SAFETY_VEHICLE_PHOTO) {
    return false;
  }
  const pending = state.pendingTripData ?? {};
  const photos: string[] = Array.isArray(pending.safetyVehiclePhotos) ? (pending.safetyVehiclePhotos as string[]) : [];
  photos.push(photoUrl);
  await setConvState(from, {
    currentFlow: FLOW_SAFETY_PROFILE,
    currentStep: STEP_SAFETY_VEHICLE_DESC,
    pendingTripData: { ...pending, safetyVehiclePhotos: photos },
  });
  await sendReplyFn(from, to, [
    `📸 Car photo received! Perfect.`,
    ``,
    `Now please describe your vehicle:`,
    `Colour, make, model and registration plate.`,
    ``,
    `Example: Silver Suzuki Ignis, HR 44 YK GP`,
    ``,
    `Reply SKIP to skip the description.`,
    `Reply 0 to cancel.`,
  ].join("\n"));
  return true;
}

async function completeSafetyProfile(
  from: string,
  to: string,
  name: string,
  member: MemberInfo | null,
  pending: PendingTripData,
  vehicleDesc: string | null,
  vehiclePhotoUrls: string | null,
): Promise<void> {
  const motherName = pending.safetyMotherName ?? null;
  const motherPhone = pending.safetyMotherPhone ?? null;
  try {
    await db
      .update(membersTable)
      .set({
        motherName: motherName || null,
        motherPhone: motherPhone || null,
        vehicleDescription: vehicleDesc || null,
        vehiclePhotoUrls: vehiclePhotoUrls || null,
      })
      .where(eq(membersTable.whatsappNumber, from));
  } catch { /* best-effort */ }
  await resetConvState(from);
  await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
  await sendWhatsApp(from, to, [
    `✅ Safety profile saved, ${name}!`,
    ``,
    `André now has what he needs to look after you properly on the road. 🛡️`,
    ``,
    `*When you leave home:*`,
    `Share your live WhatsApp location with André for 8 hours.`,
    `👉 Tap the 📎 attachment icon → Location → Share Live Location → 8 hours.`,
    ``,
    `This is how Cyber Chaperone tracks you in real time.`,
    ``,
    `Reply 0️⃣ for Main Menu.`,
  ].join("\n"));
  const photoCount = vehiclePhotoUrls ? (JSON.parse(vehiclePhotoUrls) as unknown[]).length : 0;
  await sendOperatorMirror(to, [
    `🛡️ SAFETY PROFILE COMPLETE — ${name}`,
    ``,
    motherName ? `Mother: ${motherName}${motherPhone ? `, ${motherPhone}` : ""}` : `Mother: not provided`,
    vehicleDesc ? `Vehicle: ${vehicleDesc}` : `Vehicle: not provided`,
    photoCount > 0 ? `Car photos: ${photoCount} saved` : `Car photos: none`,
    ``,
    `Next action: Confirm profile in Member Directory.`,
  ].join("\n"));
}

async function handleSafetyProfileStep(ctx: MenuContext, state: ConvState): Promise<void> {
  const { from, to, body, member, messageSid } = ctx;
  const name = member?.displayName ?? from;
  const trimmed = body.trim();
  const pending = state.pendingTripData ?? {};

  await saveMessage(from, to, body, messageSid, null);

  if (trimmed === "0") {
    await resetConvState(from);
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    await sendMainMenuWithNearby(from, to, name, member);
    return;
  }

  if (state.currentStep === STEP_SAFETY_MOTHER_NAME) {
    const motherName = trimmed.slice(0, 80);
    await setConvState(from, {
      currentFlow: FLOW_SAFETY_PROFILE,
      currentStep: STEP_SAFETY_MOTHER_PHONE,
      pendingTripData: { ...pending, safetyMotherName: motherName },
    });
    await sendWhatsApp(from, to, [
      `Got it. What is your mother's cell phone number?`,
      ``,
      `If she lives overseas, include the country code (e.g. +44 7911 123456).`,
      ``,
      `Reply SKIP if you'd rather not share.`,
      `Reply 0 to cancel.`,
    ].join("\n"));
    return;
  }

  if (state.currentStep === STEP_SAFETY_MOTHER_PHONE) {
    const motherPhone = /^skip$/i.test(trimmed) ? null : trimmed.slice(0, 30);
    await setConvState(from, {
      currentFlow: FLOW_SAFETY_PROFILE,
      currentStep: STEP_SAFETY_VEHICLE_PHOTO,
      pendingTripData: { ...pending, safetyMotherPhone: motherPhone ?? "" },
    });
    await sendWhatsApp(from, to, [
      `Perfect. Now please send a front-facing photo of your car. 📸`,
      ``,
      `I need to clearly see:`,
      `• Colour, make and model`,
      `• Registration plate`,
      ``,
      `This is how André knows who you are on the road.`,
      ``,
      `Reply SKIP if you don't have a photo right now.`,
      `Reply 0 to cancel.`,
    ].join("\n"));
    return;
  }

  // STEP_SAFETY_VEHICLE_PHOTO — text received (SKIP or typed description instead of photo)
  if (state.currentStep === STEP_SAFETY_VEHICLE_PHOTO) {
    if (/^skip$/i.test(trimmed)) {
      await setConvState(from, {
        currentFlow: FLOW_SAFETY_PROFILE,
        currentStep: STEP_SAFETY_VEHICLE_DESC,
        pendingTripData: { ...pending },
      });
      await sendWhatsApp(from, to, [
        `No worries. Please describe your vehicle:`,
        ``,
        `Colour, make, model and registration plate.`,
        ``,
        `Example: Silver Suzuki Ignis, HR 44 YK GP`,
        ``,
        `Reply SKIP to skip entirely.`,
        `Reply 0 to cancel.`,
      ].join("\n"));
      return;
    }
    // They typed something instead of a photo — treat as vehicle description
    await completeSafetyProfile(from, to, name, member, pending, trimmed.slice(0, 160), null);
    return;
  }

  if (state.currentStep === STEP_SAFETY_VEHICLE_DESC) {
    const vehicleDesc = /^skip$/i.test(trimmed) ? null : trimmed.slice(0, 160);
    const photos = pending.safetyVehiclePhotos ?? [];
    await completeSafetyProfile(
      from, to, name, member, pending,
      vehicleDesc,
      photos.length > 0 ? JSON.stringify(photos) : null,
    );
    return;
  }
}

// ── WhatsApp Registration Flow ────────────────────────────────────────────────

async function handleRegistrationStep(ctx: MenuContext, state: ConvState): Promise<void> {
  const { from, to, body, messageSid } = ctx;
  const trimmed = body.trim();
  const pending = state.pendingTripData ?? {};

  await saveMessage(from, to, body, messageSid, null);

  if (trimmed === "0") {
    await resetConvState(from);
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    const [row] = await db.select().from(membersTable).where(eq(membersTable.whatsappNumber, from)).limit(1);
    const member: MemberInfo | null = row
      ? { displayName: row.displayName, role: row.role, memberStatus: row.memberStatus, membershipTier: row.membershipTier, loyaltyTier: row.loyaltyTier, isKnown: row.memberStatus === "active" || row.memberStatus === "verified", discType: row.discType as DiscDimension | null, memberId: row.id }
      : null;
    await sendMainMenuWithNearby(from, to, row?.displayName ?? from, member);
    return;
  }

  if (state.currentStep === STEP_REG_FIRST_NAME) {
    const firstName = trimmed.slice(0, 60);
    await setConvState(from, {
      currentFlow: FLOW_REGISTRATION,
      currentStep: STEP_REG_LAST_NAME,
      pendingTripData: { ...pending, startLocation: firstName },
    });
    await sendWhatsApp(from, to, `Thanks ${firstName}! What is your surname?\n\nReply 0 to cancel.`);
    return;
  }

  if (state.currentStep === STEP_REG_LAST_NAME) {
    const lastName = trimmed.slice(0, 60);
    await setConvState(from, {
      currentFlow: FLOW_REGISTRATION,
      currentStep: STEP_REG_EMAIL,
      pendingTripData: { ...pending, destination: lastName },
    });
    await sendWhatsApp(from, to, `Got it. What is your email address? (or reply SKIP)\n\nReply 0 to cancel.`);
    return;
  }

  if (state.currentStep === STEP_REG_EMAIL) {
    const email = /^skip$/i.test(trimmed) ? null : trimmed.slice(0, 120);
    await setConvState(from, {
      currentFlow: FLOW_REGISTRATION,
      currentStep: STEP_REG_SUBURB,
      pendingTripData: { ...pending, reason: email ?? "" },
    });
    await sendWhatsApp(from, to, `What suburb do you live in? (e.g. Sandton, Fourways)\n\nReply SKIP to skip.\nReply 0 to cancel.`);
    return;
  }

  if (state.currentStep === STEP_REG_SUBURB) {
    const suburb = /^skip$/i.test(trimmed) ? null : trimmed.slice(0, 80);
    await setConvState(from, {
      currentFlow: FLOW_REGISTRATION,
      currentStep: STEP_REG_CITY,
      pendingTripData: { ...pending, regSuburb: suburb ?? "" },
    });
    await sendWhatsApp(from, to, `What city are you in? (e.g. Johannesburg, Cape Town)\n\nReply SKIP to skip.\nReply 0 to cancel.`);
    return;
  }

  if (state.currentStep === STEP_REG_CITY) {
    const city = /^skip$/i.test(trimmed) ? null : trimmed.slice(0, 80);
    await setConvState(from, {
      currentFlow: FLOW_REGISTRATION,
      currentStep: STEP_REG_PROVINCE,
      pendingTripData: { ...pending, regCity: city ?? "" },
    });
    await sendWhatsApp(from, to, [
      `Which province?`,
      ``,
      `1. Gauteng`,
      `2. Western Cape`,
      `3. KwaZulu-Natal`,
      `4. Eastern Cape`,
      `5. Limpopo`,
      `6. Mpumalanga`,
      `7. North West`,
      `8. Free State`,
      `9. Northern Cape`,
      `0. Cancel`,
    ].join("\n"));
    return;
  }

  if (state.currentStep === STEP_REG_PROVINCE) {
    const PROVINCES: Record<string, string> = {
      "1": "Gauteng", "2": "Western Cape", "3": "KwaZulu-Natal",
      "4": "Eastern Cape", "5": "Limpopo", "6": "Mpumalanga",
      "7": "North West", "8": "Free State", "9": "Northern Cape",
    };
    const province = PROVINCES[trimmed] ?? (/^skip$/i.test(trimmed) ? null : trimmed.slice(0, 60));

    // After province — collect home address
    await setConvState(from, {
      currentFlow: FLOW_REGISTRATION,
      currentStep: STEP_REG_HOME_ADDRESS,
      pendingTripData: {
        ...pending,
        regProvince: PROVINCES[trimmed] ?? (/^skip$/i.test(trimmed) ? "" : trimmed.slice(0, 60)),
      },
    });
    await sendWhatsApp(from, to, [
      `Almost done! What is your home address?`,
      ``,
      `This helps us send the nearest eblockwatch responder to you in an emergency.`,
      ``,
      `Example: 5 College Road, Bryanston, 2191`,
      ``,
      `Reply SKIP to skip.`,
      `Reply 0 to cancel.`,
    ].join("\n"));
    return;
  }

  if (state.currentStep === STEP_REG_HOME_ADDRESS) {
    const homeAddress = /^skip$/i.test(trimmed) ? null : trimmed.slice(0, 160);
    await setConvState(from, {
      currentFlow: FLOW_REGISTRATION,
      currentStep: STEP_REG_ICE,
      pendingTripData: { ...pending, regHomeAddress: homeAddress ?? "" },
    });
    await sendWhatsApp(from, to, [
      `Last one — who is your emergency contact (ICE)?`,
      ``,
      `Reply in this format:`,
      `ICE: Name, +27 number`,
      ``,
      `Example: ICE: Jane Snyman, +27825611065`,
      ``,
      `Reply SKIP to skip.`,
      `Reply 0 to cancel.`,
    ].join("\n"));
    return;
  }

  if (state.currentStep === STEP_REG_ICE) {
    const iceRaw = /^skip$/i.test(trimmed) ? null : trimmed;
    let iceContactName: string | null = null;
    let iceContactPhone: string | null = null;
    if (iceRaw) {
      const iceMatch = iceRaw.match(/^ICE:\s*(.+?),\s*(\+?[\d\s]+)$/i);
      if (iceMatch) {
        iceContactName = iceMatch[1].trim().slice(0, 80);
        iceContactPhone = iceMatch[2].replace(/\s/g, "").slice(0, 20);
      } else {
        // Tolerate plain "Name, Number" without ICE: prefix
        const plainMatch = iceRaw.match(/^(.+?),\s*(\+?[\d\s]+)$/);
        if (plainMatch) {
          iceContactName = plainMatch[1].trim().slice(0, 80);
          iceContactPhone = plainMatch[2].replace(/\s/g, "").slice(0, 20);
        }
      }
    }

    // Pull all collected fields from pendingTripData using clean reg-specific keys
    const firstName = pending.startLocation ?? "Unknown";
    const lastName = pending.destination ?? "";
    const email = pending.reason ?? null;
    const suburb = pending.regSuburb ?? null;
    const city = pending.regCity ?? null;
    const province = pending.regProvince ?? null;
    const homeAddress = pending.regHomeAddress ?? null;
    const displayName = [firstName, lastName].filter(Boolean).join(" ");

    try {
      await db
        .insert(membersTable)
        .values({
          firstName,
          lastName,
          displayName,
          whatsappNumber: from,
          memberStatus: "active",
          role: "member",
          email: email || null,
          mobile: from.replace("whatsapp:+27", "0").replace("whatsapp:+", "+"),
          suburb: suburb || null,
          city: city || null,
          province: province || null,
          country: "South Africa",
          homeAddress: homeAddress || null,
          iceContactName: iceContactName || null,
          iceContactPhone: iceContactPhone || null,
          sourceBatch: "whatsapp_registration",
          importStatus: "registered",
          loyaltyTier: "bronze",
        })
        .onConflictDoUpdate({
          target: membersTable.whatsappNumber,
          set: {
            firstName,
            lastName,
            displayName,
            email: email || null,
            suburb: suburb || null,
            city: city || null,
            province: province || null,
            homeAddress: homeAddress || null,
            iceContactName: iceContactName || null,
            iceContactPhone: iceContactPhone || null,
            importStatus: "registered",
          },
        });
    } catch {
      // best-effort
    }

    await resetConvState(from);
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    await sendWhatsApp(from, to, [
      `✅ Welcome to eblockwatch, ${firstName}!`,
      ``,
      `Your profile is registered. You are now part of a trusted safety network.`,
      ``,
      `👉 *Next step — complete your safety profile:*`,
      `Reply *4* then *8* from the Main Menu to add your mother's details and car photo.`,
      `André uses this to look after you properly on the road. It takes 2 minutes.`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));

    // Send branded welcome email to the member (non-blocking, best-effort)
    if (email) {
      void sendMemberWelcomeEmail(email, firstName, from);
    }

    await sendOperatorMirror(to, [
      `🆕 NEW WHATSAPP REGISTRATION`,
      ``,
      `Name: ${displayName}`,
      `WhatsApp: ${from}`,
      email ? `Email: ${email}` : `Email: not provided`,
      suburb ? `Suburb: ${suburb}` : null,
      city ? `City: ${city}` : null,
      province ? `Province: ${province}` : null,
      homeAddress ? `Home address: ${homeAddress}` : null,
      iceContactName ? `ICE: ${iceContactName}, ${iceContactPhone ?? "no number"}` : `ICE: not provided`,
      `Source: WhatsApp registration flow`,
      ``,
      `Next action: Confirm entry in Member Directory.`,
    ].filter((l) => l !== null).join("\n"));
    return;
  }
}

// ── Main menu choice handler ──────────────────────────────────────────────────

async function handleMainMenuChoice(ctx: MenuContext, state: ConvState): Promise<boolean> {
  const { from, to, body, member, messageSid, log } = ctx;
  const name = member?.displayName ?? from;
  const choice = body.trim();

  if (choice === "1" || CC_KEYWORDS.test(body)) {
    await setConvState(from, { currentFlow: FLOW_CYBER_CHAPERONE, currentStep: null, pendingTripData: null });
    await sendWhatsApp(from, to, ccMenuText(name));
    await saveMessage(from, to, body, messageSid, null);
    log.info({ from }, "Menu: CC menu shown");
    return true;
  }

  // Register — new members (unknown or Facebook auto-created as unverified)
  if (choice === "0" && (!member || member.memberStatus === "unverified")) {
    await saveMessage(from, to, body, messageSid, null);
    await setConvState(from, { currentFlow: FLOW_REGISTRATION, currentStep: STEP_REG_FIRST_NAME, pendingTripData: {} });
    await sendWhatsApp(from, to, [
      `🛡️🏘️ Welcome to eblockwatch! 👋`,
      ``,
      `Let's get you registered so André and the team know who you are.`,
      ``,
      `It takes about 2 minutes and it's completely free.`,
      ``,
      `What is your first name?`,
      ``,
      `Reply 0 to cancel.`,
    ].join("\n"));
    return true;
  }

  if (choice === "2") {
    if (member?.memberId) void recordDiscSignal(member.memberId, "MENU_WHAT_IS");
    await saveMessage(from, to, body, messageSid, null);
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    await sendWhatsApp(from, to, [
      `${name}, eblockwatch is a trusted human support network built around real people, real relationships, and looking after people properly.`,
      ``,
      `For more than 25 years, André Snyman has built trusted relationships with members across South Africa. That is what gives eblockwatch its strength.`,
      ``,
      `When something goes wrong, eblockwatch uses those relationships and networks to connect the right people, in the right place, at the right time, with the right solutions to your predicament.`,
      ``,
      `This is not just a page or a group. It is a real network.`,
      ``,
      `When you register, the relationship starts, and each member makes the spine of eblockwatch stronger.`,
    ].join("\n"));
    await sendMainMenuWithNearby(from, to, name, member);
    return true;
  }

  if (choice === "3") {
    if (member?.memberId) void recordDiscSignal(member.memberId, "MENU_MEMBERSHIP");
    await saveMessage(from, to, body, messageSid, null);
    await sendWhatsApp(from, to, membershipOptionsText(name, member?.membershipTier));
    return true;
  }

  if (choice === "4") {
    if (member?.memberId) void recordDiscSignal(member.memberId, "MENU_MEMBERSHIP");
    await saveMessage(from, to, body, messageSid, null);
    await setConvState(from, { currentFlow: FLOW_MEMBERSHIP, currentStep: null });
    await sendWhatsApp(from, to, membershipActivationText(name));
    return true;
  }

  if (choice === "5") {
    if (member?.memberId) void recordDiscSignal(member.memberId, "MENU_PROFILE");
    await saveMessage(from, to, body, messageSid, null);
    await setConvState(from, { currentFlow: FLOW_MY_ACCOUNT, currentStep: null });
    await sendWhatsApp(from, to, myAccountMenuText(name, member));
    return true;
  }

  if (choice === "6") {
    if (member?.memberId) void recordDiscSignal(member.memberId, "MENU_SHOP");
    await saveMessage(from, to, body, messageSid, null);
    await setConvState(from, { currentFlow: FLOW_SHOP, currentStep: null });
    await sendWhatsApp(from, to, shopMenuText(name, member));
    return true;
  }

  if (choice === "7") {
    if (member?.memberId) void recordDiscSignal(member.memberId, "MENU_SPEAK_PERSON");
    await saveMessage(from, to, body, messageSid, null);
    await setConvState(from, { currentFlow: FLOW_SPEAK_TO_PERSON, currentStep: null });
    await sendWhatsApp(from, to, [
      `${name}, I'll get André's attention right away. 👋`,
      ``,
      `Please type your message or question below and I'll pass it on directly. You can also share a voice note — I'll forward it.`,
      ``,
      `Reply 0 to cancel and go back to the Main Menu.`,
    ].join("\n"));
    return true;
  }

  if (choice === "8") {
    if (member?.memberId) void recordDiscSignal(member.memberId, "MENU_INVITE");
    await saveMessage(from, to, body, messageSid, null);
    const referralMsg = [
      `📣 *Invite a Friend — forward this message!*`,
      ``,
      `─────────────────────────────`,
      `Hey! I'm part of eblockwatch — South Africa's real human safety network with 250 000 members.`,
      ``,
      `André Snyman's team watches over you when you travel 🛡️`,
      ``,
      `✅ FREE to join`,
      `✅ Live trip tracking on WhatsApp`,
      `✅ ICE escalation if you don't arrive safely`,
      `✅ 250 000 members looking out for each other`,
      ``,
      `Join me — just send "Hi" to:`,
      `👉 wa.me/${BUSINESS_WA_NUM}`,
      `─────────────────────────────`,
      ``,
      `Forward this to anyone you want to keep safe.`,
      `The more people in your network, the safer you all are. 💪`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n");
    await sendWhatsApp(from, to, referralMsg);
    return true;
  }

  if (choice === "9") {
    if (member?.memberId) void recordDiscSignal(member.memberId, "MENU_GETTING_STARTED");
    await saveMessage(from, to, body, messageSid, null);
    await sendWhatsApp(from, to, [
      `📖 *Getting Started with eblockwatch*`,
      ``,
      `Watch the 2-minute intro first 👇`,
      `https://www.facebook.com/share/v/1ACByM44QZ/?mibextid=wwXIfr`,
      ``,
      `Then follow your 5-step journey to safer living:`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━`,
      `1️⃣  *Register* — it's free`,
      `   Reply 0 → choose "Join eblockwatch"`,
      ``,
      `2️⃣  *Activate your membership*`,
      `   Reply 3 from the main menu.`,
      `   Individual R150/mo or Family R250/mo.`,
      `   Payment is secure via Paystack — card, bank or EFT.`,
      ``,
      `3️⃣  *Travel with Cyber Chaperone*`,
      `   Reply 1 and tell Arnie where you're going.`,
      `   We watch your route. If you don't arrive — we act.`,
      ``,
      `4️⃣  *Set up your ICE contact*`,
      `   Reply 4 → Update my profile.`,
      `   We only contact them if we genuinely cannot reach you.`,
      ``,
      `5️⃣  *Invite a Friend*`,
      `   Reply 8 to get a message you can forward to anyone.`,
      `   The more people in your network, the safer you all are.`,
      `━━━━━━━━━━━━━━━━━━━━`,
      ``,
      `At any time:`,
      `• Reply 0 → Main Menu`,
      `• Reply 10 → Emergency`,
      `• Reply Hi → Start over`,
      ``,
      `You're in good hands. André and 250 000 members have your back. 🛡️`,
    ].join("\n"));
    await sendMainMenuWithNearby(from, to, name, member);
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    return true;
  }

  if (choice === "10") {
    const activeTrip = await findActiveTrip(from);
    await saveMessage(from, to, body, messageSid, activeTrip?.id ?? null);
    if (activeTrip) {
      await db.update(tripsTable).set({ status: "red", nextAction: "Immediate human review." }).where(eq(tripsTable.id, activeTrip.id));
    }
    await resetConvState(from);
    await sendWhatsApp(from, to, `We have flagged this as urgent. A human support response is being escalated now. If you can, send your location pin 📍 and a short message telling us what is wrong.`);
    await sendEmergencyAlert(to, name, from);
    return true;
  }

  return false;
}

// ── Speak to a person — collect query then escalate ───────────────────────────

async function handleSpeakToPersonFlow(ctx: MenuContext): Promise<void> {
  const { from, to, body, member, messageSid } = ctx;
  const name = member?.displayName ?? from;
  const trimmed = body.trim();

  await saveMessage(from, to, body, messageSid, null);

  if (trimmed === "0") {
    await resetConvState(from);
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    await sendMainMenuWithNearby(from, to, name, member);
    return;
  }

  // Any message is treated as their query — escalate to André
  await resetConvState(from);
  await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
  await sendWhatsApp(from, to, [
    `✅ Got it, ${name}. I'm passing your message to André now.`,
    ``,
    `He'll come back to you directly on WhatsApp as soon as he can.`,
    ``,
    `⚠️ If this is urgent, reply *10* and it will be escalated immediately.`,
  ].join("\n"));
  await sendContactRequestToFounder(to, name, from);
  await sendOperatorMirror(to, [
    `📬 SPEAK TO A PERSON — ${name}`,
    `Known member: ${member?.isKnown ? "YES" : "NO"}`,
    `Message: ${trimmed}`,
    `Next action: André to reply directly on WhatsApp.`,
  ].join("\n"));
}

// ── My Account submenu ────────────────────────────────────────────────────────

function myAccountMenuText(name: string, member: MemberInfo | null): string {
  const tier = member?.loyaltyTier ?? "bronze";
  const tierEmoji = trustTierEmoji(tier);
  const tierName = tier === "founder" ? "Founder Member" : tier === "silver" ? "Silver Member" : "Bronze Member";
  const isPaying = member?.membershipTier === "individual" || member?.membershipTier === "family";
  return [
    `👤 *My Account* — ${name}`,
    ``,
    `${tierEmoji}${isPaying ? " 💜" : ""} ${tierName}`,
    ``,
    `1️⃣  Update my profile`,
    `2️⃣  My loyalty points & trust status`,
    `3️⃣  My family group`,
    `4️⃣  Report confidentially to André 🔒`,
    `5️⃣  My member portal 🌐`,
    ``,
    `Reply 0 for Main Menu.`,
  ].join("\n");
}

async function handleMyAccountFlow(ctx: MenuContext, state: ConvState): Promise<void> {
  const { from, to, body, member, messageSid, log } = ctx;
  const name = member?.displayName ?? from;
  const choice = body.trim();

  if (choice === "0") {
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    await sendMainMenuWithNearby(from, to, name, member);
    return;
  }

  if (choice === "1") {
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    await startSmartProfileUpdate(from, to, name);
    return;
  }

  if (choice === "2") {
    let pts = 0;
    let tier = member?.loyaltyTier ?? "bronze";
    if (member?.memberId) {
      const [row] = await db
        .select({ loyaltyPoints: membersTable.loyaltyPoints, loyaltyTier: membersTable.loyaltyTier })
        .from(membersTable)
        .where(eq(membersTable.id, member.memberId))
        .limit(1);
      pts = row?.loyaltyPoints ?? 0;
      tier = row?.loyaltyTier ?? tier;
    }
    const tierEmoji = trustTierEmoji(tier);
    const tierName = tier === "founder" ? "Founder Member" : tier === "silver" ? "Silver Member" : "Bronze Member";
    const isPaying = member?.membershipTier === "individual" || member?.membershipTier === "family";
    const nextTierName = tier === "bronze" ? "Silver" : tier === "silver" ? "Founder" : null;
    const pointsNeeded = tier === "bronze" ? 50 : tier === "silver" ? 150 : null;
    const progressLine = nextTierName && pointsNeeded
      ? `Progress to ${nextTierName}: ${Math.min(pts, pointsNeeded)}/${pointsNeeded} pts (${Math.round((Math.min(pts, pointsNeeded) / pointsNeeded) * 100)}%)`
      : `You are at the highest trust level — recognised Founder. 🏆`;
    await saveMessage(from, to, body, messageSid, null);
    await sendWhatsApp(from, to, [
      `${tierEmoji}${isPaying ? " 💜" : ""} *${tierName}*`,
      ``,
      `⭐ Loyalty points: *${pts}*`,
      progressLine,
      ``,
      `*Your privileges:*`,
      tier === "founder"
        ? [
            `  ✅ Highest priority in emergency dispatch`,
            `  ✅ Paired first with Founder-level responders`,
            `  ✅ Direct line to André`,
            `  ✅ Community pillar recognition`,
          ].join("\n")
        : tier === "silver"
        ? [
            `  ✅ Priority response activation`,
            `  ✅ Paired with Silver+ community members`,
            `  ✅ Early access to new features`,
          ].join("\n")
        : [
            `  ✅ Cyber Chaperone trip monitoring`,
            `  ✅ Access to eblockshop`,
            `  ✅ Community network membership`,
          ].join("\n"),
      ``,
      `*Earn points:*`,
      `  +5  — Submit a safety report`,
      `  +10 — Complete your full profile`,
      `  +20 — Refer a friend who joins`,
      `  +30 — Refer a friend who upgrades`,
      `  +50 — Upgrade to a paid plan`,
      ``,
      `Higher trust = better pairing when you need us most.`,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    return;
  }

  if (choice === "3") {
    await saveMessage(from, to, body, messageSid, null);
    if (member?.memberId) {
      const [self] = await db
        .select({ familyGroupId: membersTable.familyGroupId })
        .from(membersTable)
        .where(eq(membersTable.id, member.memberId))
        .limit(1);
      if (self?.familyGroupId) {
        const fam = await db
          .select({ displayName: membersTable.displayName, memberStatus: membersTable.memberStatus })
          .from(membersTable)
          .where(eq(membersTable.familyGroupId, self.familyGroupId));
        const list = fam.map((m) => `  • ${m.displayName} — ${m.memberStatus}`).join("\n");
        await sendWhatsApp(from, to, [
          `🏠 *Your Family Group*`,
          ``,
          list,
          ``,
          `Your family members are each other's ICE contacts under our watch.`,
          `To add or remove a member, type your request here — André will action it.`,
          ``,
          `Reply 0 for Main Menu.`,
        ].join("\n"));
        return;
      }
    }
    await sendWhatsApp(from, to, [
      `🏠 *Family Group*`,
      ``,
      `You are not on a Family Plan yet.`,
      ``,
      `The Family Plan covers up to 5 family members for R250/month — full trip monitoring and ICE escalation for everyone.`,
      ``,
      `Reply 3 from the main menu for membership options.`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    return;
  }

  if (choice === "4") {
    await saveMessage(from, to, body, messageSid, null);
    await setConvState(from, { currentFlow: FLOW_REPORT_INCIDENT, currentStep: "CATEGORY", pendingTripData: null });
    await sendWhatsApp(from, to, [
      `🔒 *Confidential Report to André*`,
      ``,
      `${name}, this goes directly and only to André. Never shared with other members.`,
      ``,
      `What category best describes this?`,
      ``,
      `1️⃣  Crime & Security Threat`,
      `2️⃣  Suspicious Activity`,
      `3️⃣  Road & Traffic Hazard`,
      `4️⃣  Personal Safety Concern`,
      `5️⃣  Neighbourhood Watch Alert`,
      `6️⃣  Cyber Safety Concern`,
      `7️⃣  Other`,
      ``,
      `Reply 0 to cancel.`,
    ].join("\n"));
    return;
  }

  if (choice === "5") {
    await saveMessage(from, to, body, messageSid, null);
    await sendWhatsApp(from, to, [
      `🌐 *Your Member Portal*`,
      ``,
      `${name}, your personal dashboard is here:`,
      `👉 https://cyber-chaperone-r--ryfsny.replit.app/website/login`,
      ``,
      `Log in with a WhatsApp OTP — tap the green button.`,
      ``,
      `Your portal includes:`,
      `  ✅ Your trust tier & loyalty points`,
      `  ✅ Update your profile & ICE contact`,
      `  ✅ eblockshop — safer living products`,
      `  ✅ Family group management`,
      `  ✅ Confidential reports`,
      `  ✅ Your full comms history`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    return;
  }

  await sendWhatsApp(from, to, myAccountMenuText(name, member));
}

async function handleReportIncidentFlow(ctx: MenuContext, state: ConvState): Promise<void> {
  const { from, to, body, member, messageSid, log } = ctx;
  const name = member?.displayName ?? from;
  const choice = body.trim();
  const step = state.currentStep;

  if (choice === "0") {
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    await sendMainMenuWithNearby(from, to, name, member);
    return;
  }

  if (step === "CATEGORY") {
    const CATS: Record<string, string> = {
      "1": "Crime & Security Threat",
      "2": "Suspicious Activity",
      "3": "Road & Traffic Hazard",
      "4": "Personal Safety Concern",
      "5": "Neighbourhood Watch Alert",
      "6": "Cyber Safety Concern",
      "7": "Other",
    };
    const category = CATS[choice];
    if (!category) {
      await sendWhatsApp(from, to, `Please reply with a number 1–7.\n\nReply 0 to cancel.`);
      return;
    }
    const pending = { reportCategory: category } as unknown as PendingTripData;
    await setConvState(from, { currentFlow: FLOW_REPORT_INCIDENT, currentStep: "DESCRIPTION", pendingTripData: pending });
    await sendWhatsApp(from, to, [
      `📝 *${category}*`,
      ``,
      `Please describe what happened, when, and any details that will help André act quickly.`,
      ``,
      `(At least 20 characters — more detail helps us respond faster.)`,
      ``,
      `Reply 0 to cancel.`,
    ].join("\n"));
    return;
  }

  if (step === "DESCRIPTION") {
    if (body.trim().length < 20) {
      await sendWhatsApp(from, to, `Please share a bit more detail (at least 20 characters).\n\nReply 0 to cancel.`);
      return;
    }
    const pending = { ...(state.pendingTripData as Record<string, string> ?? {}), reportDescription: body.trim() } as unknown as PendingTripData;
    await setConvState(from, { currentFlow: FLOW_REPORT_INCIDENT, currentStep: "LOCATION", pendingTripData: pending });
    await sendWhatsApp(from, to, [
      `📍 Do you have a location for this incident?`,
      ``,
      `Reply with an address or area (e.g. "Corner of Elm St, Sandton"), or reply *skip* to leave it blank.`,
      ``,
      `Reply 0 to cancel.`,
    ].join("\n"));
    return;
  }

  if (step === "LOCATION") {
    const pending = (state.pendingTripData as Record<string, string> ?? {});
    const locText = (choice.toLowerCase() === "skip") ? null : body.trim();
    const category = pending.reportCategory ?? "Other";
    const description = pending.reportDescription ?? "";

    if (member?.memberId) {
      try {
        await db.insert(memberIncidentsTable).values({
          memberId: member.memberId,
          category,
          description,
          location: locText,
          status: "received",
        });
        await db.update(membersTable)
          .set({ loyaltyPoints: sql`${membersTable.loyaltyPoints} + 5`, updatedAt: new Date() })
          .where(eq(membersTable.id, member.memberId));
        if (locText) {
          void (async () => {
            try {
              const geo = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locText + ", South Africa")}&format=json&limit=1&countrycodes=za`, { headers: { "User-Agent": "eblockwatch-safety/1.0" } });
              const geoData = await geo.json() as Array<{ lat: string; lon: string }>;
              if (geoData[0]) {
                await db.execute(sql`UPDATE member_incidents SET lat = ${geoData[0].lat}, lon = ${geoData[0].lon} WHERE member_id = ${member.memberId!} AND created_at = (SELECT MAX(created_at) FROM member_incidents WHERE member_id = ${member.memberId!})`);
              }
            } catch { /* ignore — geocoding is best-effort */ }
          })();
        }
      } catch (err) {
        log.error({ err }, "Failed to save incident report");
      }
    }

    await setConvState(from, { currentFlow: FLOW_MAIN_MENU, currentStep: null, pendingTripData: null });
    await sendWhatsApp(from, to, [
      `✅ *Report received confidentially.*`,
      ``,
      `Thank you, ${name}. André will review this personally.`,
      ``,
      `You have earned *+5 loyalty points* for contributing to our project's safety.`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    return;
  }

  await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
  await sendMainMenuWithNearby(from, to, name, member);
}

// ── eblockshop ────────────────────────────────────────────────────────────────

const SHOP_PRODUCTS = [
  {
    key: "individual",
    label: "🛡️ Cyber Chaperone Individual — R150/month",
    desc: "Full route tracking, ICE escalation, priority response.",
    planCode: "PLN_rnn4nj61oh0zy0c",
    fallbackUrl: "https://paystack.com/pay/cyber-chaperone",
  },
  {
    key: "family",
    label: "👨‍👩‍👧 Cyber Chaperone Family — R250/month",
    desc: "Up to 5 family members covered. Full suite.",
    planCode: "PLN_wopagttz7e5quyw",
    fallbackUrl: "https://paystack.com/pay/family-cyber-chaperone",
  },
];

function shopMenuText(name: string, member: MemberInfo | null): string {
  const tier = member?.membershipTier ?? null;
  const isPaying = tier === "individual" || tier === "family";
  const isFamily = tier === "family";
  const lines = [
    `🛒 *eblockshop* — Safer Living, Delivered`,
    ``,
    `${name}, everything in eblockshop is designed to make you and your family safer. Every purchase supports the eblockwatch network.`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━`,
    `1️⃣  🛡️ *Cyber Chaperone Individual* — R150/month`,
    `   Live trip monitoring · ICE escalation · Priority response`,
    `   Someone always knows you're okay.`,
    isPaying && !isFamily ? `   ✅ You're already on this plan.` : ``,
    ``,
    `2️⃣  👨‍👩‍👧 *Cyber Chaperone Family* — R250/month`,
    `   Your whole household covered — up to 5 members.`,
    `   Separate ICE contacts per person. Full suite.`,
    isFamily ? `   ✅ You're already on this plan.` : ``,
    ``,
    `3️⃣  📡 *Bliksim Location Unit* — R799 once-off`,
    `   Compact GPS tracker for your vehicle, bag or loved one.`,
    `   Silent panic button + live location feed to the Situation Room.`,
    isPaying ? `   ✅ Unlocked for you — reply 3 to order.` : `   🔒 Available to Individual & Family members.`,
    ``,
    `4️⃣  🎽 *eblockwatch Branded Gear* — from R199`,
    `   Cap, hoodie, reflective vest — wear the network.`,
    `   Every item sold funds community safety patrols.`,
    ``,
    `5️⃣  🧰 *Safety Starter Kit* — R349`,
    `   Reflective triangle · First-aid basics · Whistle · Window breaker`,
    `   Built for South African roads.`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━`,
    `6️⃣  💬 *Questions? Talk to our team*`,
    `   Kriszti handles all orders, admin & purchases.`,
    ``,
    `Reply 1–6 to choose, or 0 for Main Menu.`,
  ].filter((l) => l !== "");
  return lines.join("\n");
}

async function generatePaystackLink(member: MemberInfo | null, planCode: string, fallback: string): Promise<string> {
  const secret = process.env.PAYSTACK_SECRET_KEY ?? "";
  if (!secret) return fallback;
  try {
    const payload: Record<string, unknown> = { plan: planCode, channels: ["card", "bank", "ussd", "mobile_money"] };
    if (member?.email) payload.customer = { email: member.email };
    if (member?.displayName) {
      const [firstName, ...rest] = member.displayName.split(" ");
      payload.metadata = {
        custom_fields: [
          { display_name: "First Name", variable_name: "first_name", value: firstName ?? "" },
          { display_name: "Last Name", variable_name: "last_name", value: rest.join(" ") },
        ],
      };
    }
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json() as { status: boolean; data?: { authorization_url?: string } };
    return data.data?.authorization_url ?? fallback;
  } catch {
    return fallback;
  }
}

async function sendToWingWoman(
  twilioFrom: string,
  member: MemberInfo | null,
  memberPhone: string,
  topic: string,
): Promise<void> {
  const wingwomanNumber = process.env.WINGWOMAN_WHATSAPP_NUMBER ?? "";
  if (!wingwomanNumber) return;

  const name = member?.displayName ?? memberPhone;
  const tier = member?.membershipTier ?? "entry / unknown";

  const alert = [
    `🤝 *WingWoman Alert* — Member needs help`,
    ``,
    `Member: ${name}`,
    `Phone: ${memberPhone}`,
    `Membership: ${tier}`,
    `Topic: ${topic}`,
    ``,
    `WhatsApp them directly: wa.me/${memberPhone.replace(/\D/g, "")}`,
    ``,
    `André is CC'd on this notification.`,
  ].join("\n");

  const mirror = [
    `👀 *WingWoman CC* — Kriszti notified`,
    ``,
    `Member: ${name} (${memberPhone})`,
    `Topic: ${topic}`,
    `Kriszti: +27716845443`,
  ].join("\n");

  const client = (await import("twilio")).default(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
  );

  await Promise.all([
    client.messages.create({
      from: twilioFrom,
      to: `whatsapp:${wingwomanNumber}`,
      body: alert,
    }),
    sendOperatorMirror(twilioFrom, mirror),
  ]);
}

async function handleShopFlow(ctx: MenuContext): Promise<void> {
  const { from, to, body, member, messageSid } = ctx;
  const name = member?.displayName ?? from;
  const choice = body.trim();

  await saveMessage(from, to, body, messageSid, null);

  if (choice === "0") {
    await resetConvState(from);
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    await sendMainMenuWithNearby(from, to, name, member);
    return;
  }

  if (choice === "1" || choice === "2") {
    const product = SHOP_PRODUCTS[parseInt(choice) - 1];
    const url = await generatePaystackLink(member, product.planCode, product.fallbackUrl);
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    await sendWhatsApp(from, to, [
      `✅ Great choice, ${name}!`,
      ``,
      `*${product.label}*`,
      `${product.desc}`,
      ``,
      `Tap the link below to complete your order securely:`,
      `👉 ${url}`,
      ``,
      `Once payment is confirmed you'll get a WhatsApp confirmation within a few minutes.`,
      ``,
      `Questions? Reply *0* for Main Menu or message André directly on 0825611065.`,
    ].join("\n"));
    return;
  }

  if (choice === "3") {
    const isPaying = member?.membershipTier === "individual" || member?.membershipTier === "family";
    if (isPaying) {
      await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
      await sendWhatsApp(from, to, [
        `📡 *Bliksim Location Unit*`,
        ``,
        `Thank you for your interest, ${name}!`,
        ``,
        `André will contact you directly to arrange your unit.`,
        ``,
        `Reply 0 for Main Menu.`,
      ].join("\n"));
      await sendOperatorMirror(to, [
        `🛒 SHOP ORDER — Bliksim Location Unit`,
        `Member: ${name} (${from})`,
        `Tier: ${member?.membershipTier ?? "unknown"}`,
        `Action: Contact member to arrange unit delivery.`,
      ].join("\n"));
    } else {
      await sendWhatsApp(from, to, [
        `📡 *Bliksim Location Unit*`,
        ``,
        `This product is available to Individual and Family members.`,
        ``,
        `Upgrade your membership first to unlock it:`,
        `👉 https://paystack.com/pay/cyber-chaperone`,
        ``,
        `Reply 1 to order Individual, 2 for Family, or 0 for Main Menu.`,
      ].join("\n"));
    }
    return;
  }

  if (choice === "4") {
    // Branded gear — notify operator
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    await sendWhatsApp(from, to, [
      `🎽 *eblockwatch Branded Gear*`,
      ``,
      `Great choice, ${name}! Our team will send you the current gear catalogue and pricing.`,
      ``,
      `Kriszti will be in touch shortly — she'll sort out sizes, colours and delivery.`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    await sendToWingWoman(to, member, from, "Branded gear order interest").catch(() => undefined);
    await sendOperatorMirror(to, [
      `🛒 SHOP — Branded Gear interest`,
      `Member: ${name} (${from})`,
      `Action: Send gear catalogue + arrange order.`,
    ].join("\n"));
    return;
  }

  if (choice === "5") {
    // Safety Starter Kit — notify operator
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    await sendWhatsApp(from, to, [
      `🧰 *Safety Starter Kit — R349*`,
      ``,
      `Good thinking, ${name}! The Safety Starter Kit includes:`,
      ``,
      `✅ Reflective triangle`,
      `✅ Basic first-aid essentials`,
      `✅ Emergency whistle`,
      `✅ Window breaker / seatbelt cutter`,
      ``,
      `Kriszti will contact you to confirm your delivery address and arrange payment.`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    await sendToWingWoman(to, member, from, "Safety Starter Kit order — R349").catch(() => undefined);
    await sendOperatorMirror(to, [
      `🛒 SHOP — Safety Starter Kit order`,
      `Member: ${name} (${from})`,
      `Price: R349`,
      `Action: Confirm delivery address and arrange payment.`,
    ].join("\n"));
    return;
  }

  if (choice === "6") {
    // Talk to the team
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    await sendWhatsApp(from, to, [
      `💬 Connecting you to our team, ${name}!`,
      ``,
      `Kriszti — André's personal assistant — will be in touch shortly to help you.`,
      `She handles all orders, admin, and purchases.`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    await sendToWingWoman(to, member, from, "General shop enquiry").catch(() => undefined);
    return;
  }

  // Unrecognised — repeat menu
  await sendWhatsApp(from, to, shopMenuText(name, member));
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function handleMenuRouter(ctx: MenuContext): Promise<MenuResult> {
  const { body, from, to, member, messageSid, log, latitude, longitude } = ctx;
  const name = member?.displayName ?? from;
  const trimmed = body.trim();

  // ── PLATFORM REPLY OVERRIDE ───────────────────────────────────────────────
  // Register an alternate send function (e.g. Facebook Messenger) so every
  // sendWhatsApp call in any handler is transparently redirected.
  if (ctx.sendReply) {
    _replyOverrides.set(from, ctx.sendReply);
  }

  try {
  // ── DIAGNOSTIC LOGGING ────────────────────────────────────────────────────
  log.info(
    {
      from,
      body: trimmed.slice(0, 120),
      menuOverrideMatch: GLOBAL_MENU_OVERRIDE.test(trimmed) || JOIN_PREFIX.test(trimmed),
    },
    "menu-router: inbound",
  );

  // ── LIVE LOCATION PIN — nearby member count ────────────────────────────────
  // Fires a supplemental coverage message for ANY location pin regardless of
  // conversation state, then lets normal routing continue.
  if (latitude && longitude) {
    const { count: nearbyCount, radiusKm: nearbyRadiusKm } = await pickRadiusAndCount(latitude, longitude);
    const coverageLine = nearbyCoverageText(nearbyCount, nearbyRadiusKm);
    await sendWhatsApp(from, to, [
      `📍 Location received — you are covered.`,
      ``,
      coverageLine,
      ``,
      `They can be mobilised through Andre and Cyber Chaperone when you need support.`,
      `Everything goes through eblockwatch — members never contact them directly.`,
      ``,
      `Type HELP any time and the Situation Room responds immediately. 🛡️`,
    ].join("\n"));
    log.info({ from, latitude, longitude, nearbyCount }, "Nearby member count sent for live location");
  }

  // ── GLOBAL MENU OVERRIDE ──────────────────────────────────────────────────
  // Runs BEFORE ICE detection, conversation state, trip logic, and all other
  // handlers. Any message that is a menu trigger word or begins with "join "
  // always returns the main menu — no other routing applies.
  const isMenuOverride = GLOBAL_MENU_OVERRIDE.test(trimmed) || JOIN_PREFIX.test(trimmed);
  if (isMenuOverride) {
    await resetConvState(from);
    await saveMessage(from, to, body, messageSid, null);
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    // Known members get a "here are your details" card before the main menu
    if (member?.isKnown) {
      const profile = await fetchMemberProfile(from);
      if (profile) {
        const detailsMsg = formatMemberDetailsGreeting(from, profile, member.membershipTier ?? null);
        if (detailsMsg) await sendWhatsApp(from, to, detailsMsg);
      }
    }
    await sendMainMenuWithNearby(from, to, name, member);
    log.info({ from, body: trimmed, handler: "GLOBAL_MENU_OVERRIDE" }, "menu-router: MENU_OVERRIDE triggered");
    return { handled: true };
  }

  // GLOBAL EMERGENCY "10" — fires before distress, flow routing, and all other handlers.
  // Any message that is exactly "10" triggers the FLOW 11 emergency sequence.
  if (/^10$/.test(trimmed)) {
    if (member?.memberId) void recordDiscSignal(member.memberId, "EMERGENCY_10");
    const activeTrip = await findActiveTrip(from);
    await saveMessage(from, to, body, messageSid, activeTrip?.id ?? null);
    if (activeTrip) {
      await db.update(tripsTable).set({ status: "red", nextAction: "Immediate human review." }).where(eq(tripsTable.id, activeTrip.id));
    }
    await resetConvState(from);
    await sendWhatsApp(from, to, `We have flagged this as urgent. A human support response is being escalated now. If you can, send your location pin 📍 and a short message telling us what is wrong.`);
    await sendEmergencyAlert(to, name, from);
    // Also alert ICE contact directly if the member has one registered
    const ice10 = await getMemberIce(from);
    if (ice10) {
      await sendIceContactAlert(
        to,
        name,
        from,
        ice10.iceContactName,
        ice10.iceContactPhone,
        activeTrip ?? null,
        `${name} has triggered an emergency alert via Cyber Chaperone (code 10).`,
      );
    }
    log.info({ from, handler: "GLOBAL_EMERGENCY_10", iceAlerted: !!ice10 }, "menu-router: global emergency 10 triggered");
    return { handled: true };
  }

  // GLOBAL LOGIN CODE — member sends "Login code" (member-initiated, free Twilio window)
  if (/^(login\s+code|my\s+code|get\s+my\s+code|login\s+code\s+please)$/i.test(trimmed)) {
    const phone = from.replace(/^whatsapp:/, "");
    const code = issueOtp(phone);
    const loginUrl = `https://cyber-chaperone-r--ryfsny.replit.app/website/login`;
    await sendWhatsApp(from, to, [
      `Your eblockwatch login code is:`,
      ``,
      `*${code}*`,
      ``,
      `This code expires in 10 minutes.`,
      ``,
      `Go to the member portal and enter this code to sign in:`,
      loginUrl,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    log.info({ from, handler: "LOGIN_CODE_REQUEST" }, "menu-router: login code sent via WhatsApp");
    return { handled: true };
  }

  // 1. PRIORITY: Distress — always handled first
  if (isDistress(trimmed)) {
    const activeTrip = await findActiveTrip(from);
    await handleDistress(ctx, activeTrip);
    log.info({ from, handler: "DISTRESS" }, "menu-router: distress priority handler");
    return { handled: true };
  }

  // 2a. STOP — member ending their trip explicitly
  if (/^stop$/i.test(trimmed)) {
    const activeTrip = await findActiveTrip(from);
    const name = member?.displayName ?? from;
    const ts = nowUtc();
    if (activeTrip) {
      await db
        .update(tripsTable)
        .set({
          status: "completed",
          evidenceNotes: appendNote(activeTrip.evidenceNotes, `[${ts}] TRIP ENDED: Member sent STOP.`),
          nextAction: "Trip closed by member.",
        })
        .where(eq(tripsTable.id, activeTrip.id));
      await sendWhatsApp(from, to, `✅ Trip complete. You have arrived safely. Stay safe, Andre is here if you need anything.`);
      await sendMainMenuWithNearby(from, to, name, member);
      await sendOperatorMirror(to, [
        `🏁 TRIP COMPLETE`,
        `Member: ${name}`,
        `Trip ID: ${activeTrip.id}`,
        `Arrived safely at ${ts}`,
        `Trip: ${activeTrip.title}`,
        `Status: COMPLETED`,
        `Reason: Member sent STOP.`,
      ].join("\n"), "arrived");
    } else {
      await sendWhatsApp(from, to, `No active trip to end.\n\nReply 0 for Main Menu.`);
    }
    await saveMessage(from, to, body, messageSid, activeTrip?.id ?? null);
    await resetConvState(from);
    log.info({ from, handler: "STOP" }, "menu-router: STOP handler");
    return { handled: true };
  }

  // 2b. PRIORITY: Arrival — always handled second
  if (isArrival(trimmed)) {
    const activeTrip = await findActiveTrip(from);
    await handleArrival(ctx, activeTrip);
    log.info({ from, handler: "ARRIVAL" }, "menu-router: arrival priority handler");
    return { handled: true };
  }

  // 3. Main menu reset trigger (belt-and-suspenders after GLOBAL_MENU_OVERRIDE)
  if (MAIN_MENU_TRIGGER.test(trimmed)) {
    await resetConvState(from);
    await saveMessage(from, to, body, messageSid, null);
    await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
    await sendMainMenuWithNearby(from, to, name, member);
    log.info({ from, handler: "MAIN_MENU_TRIGGER" }, "menu-router: main menu trigger");
    return { handled: true };
  }

  // 4. Conversation state routing
  const state = await getConvState(from);
  log.info({ from, currentFlow: state.currentFlow, currentStep: state.currentStep }, "Menu router: conv state");

  if (state.currentFlow === FLOW_PROFILE_CONFIRM) {
    const choice = trimmed;
    await saveMessage(from, to, body, messageSid, null);
    if (choice === "1" || choice === "0") {
      // Confirmed or skip — go to main menu
      await setConvState(from, { currentFlow: FLOW_MAIN_MENU });
      if (choice === "1") {
        await sendMainMenuWithNearby(from, to, name, member);
      } else {
        await sendMainMenuWithNearby(from, to, name, member);
      }
    } else if (choice === "2") {
      // Needs update — show current profile + smart field prompt
      await startSmartProfileUpdate(from, to, name);
    } else {
      // Unrecognised — re-send the confirmation
      await sendProfileConfirmation(from, to, name);
    }
    return { handled: true };
  }

  if (state.currentFlow === FLOW_REGISTRATION) {
    await handleRegistrationStep(ctx, state);
    return { handled: true };
  }

  if (state.currentFlow === FLOW_MEMBERSHIP) {
    await handleMembershipChoice(ctx);
    return { handled: true };
  }

  if (state.currentFlow === FLOW_SHOP) {
    await handleShopFlow(ctx);
    return { handled: true };
  }

  if (state.currentFlow === FLOW_MY_ACCOUNT) {
    await handleMyAccountFlow(ctx, state);
    return { handled: true };
  }

  if (state.currentFlow === FLOW_REPORT_INCIDENT) {
    await handleReportIncidentFlow(ctx, state);
    return { handled: true };
  }

  if (state.currentFlow === FLOW_EBLOCKWATCH_INFO) {
    await handleEblockwatchInfoChoice(ctx);
    return { handled: true };
  }

  if (state.currentFlow === FLOW_SPEAK_TO_PERSON) {
    await handleSpeakToPersonFlow(ctx);
    return { handled: true };
  }

  if (state.currentFlow === FLOW_PROFILE_WIZARD) {
    await handleProfileWizardStep(ctx, state);
    return { handled: true };
  }

  if (state.currentFlow === FLOW_PROFILE_UPDATE) {
    await handleProfileUpdateChoice(ctx, state);
    return { handled: true };
  }

  if (state.currentFlow === FLOW_SAFETY_PROFILE) {
    await handleSafetyProfileStep(ctx, state);
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

  // 6c. Planned stop — member declaring a voluntary pause (fuel, coffee, rest, etc.)
  // Acknowledges the stop, pauses ETA drift monitoring, and waits for member to resume.
  if (
    activeTrip &&
    activeTrip.status !== "completed" &&
    activeTrip.status !== "red" &&
    member?.isKnown &&
    PLANNED_STOP_PATTERN.test(trimmed)
  ) {
    const ts = nowUtc();
    const destination = activeTrip.title.includes(" → ")
      ? activeTrip.title.split(" → ").pop()!
      : activeTrip.title;
    const name = member.displayName;
    const stopPingDueMs = Date.now() + 30 * 60_000;
    await db
      .update(tripsTable)
      .set({
        status: "amber",
        currentRouteConfidence: "amber",
        lastMemberCheckinTime: new Date(),
        etaDriftMinutes: 0,
        evidenceNotes: appendNote(
          activeTrip.evidenceNotes,
          `[${ts}] PLANNED STOP: "${body.slice(0, 120)}"\n[STOP-PING-DUE: ${stopPingDueMs}]`,
        ),
        nextAction: "Member declared a planned stop. 30-min safety ping scheduled.",
      })
      .where(eq(tripsTable.id, activeTrip.id));
    await setConvState(from, {
      currentFlow: FLOW_CHECKIN,
      currentStep: STEP_WAITING_FOR_NEW_ETA,
      pendingTripData: { clarificationActiveTripId: activeTrip.id },
    });
    await sendWhatsApp(from, to, [
      `Got it ${name} — safe stop! 🛑`,
      ``,
      `We've noted your stop and paused monitoring.`,
      ``,
      `When you're back on the road, just send your new ETA to ${destination}`,
      `(e.g. ETA 17:30) and we'll continue watching over you.`,
      ``,
      `Reply 0 for Main Menu.`,
    ].join("\n"));
    await sendOperatorMirror(to, [
      `CYBER CHAPERONE — PLANNED STOP ⚠️`,
      `Member: ${name}`,
      `Trip: ${activeTrip.title} (ID: ${activeTrip.id})`,
      `Status: AMBER (stopped)`,
      `Member message: "${body.slice(0, 120)}"`,
      `Next action: Monitor. Await resume and new ETA from member.`,
    ].join("\n"));
    await saveMessage(from, to, body, messageSid, activeTrip.id);
    log.info({ from, tripId: activeTrip.id }, "menu-router: planned stop detected — monitoring paused");
    return { handled: true };
  }

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
            pendingTripData: {
              clarificationActiveTripId: activeTrip.id,
              isPreArrival: cp.label === "PRE_ARRIVAL",
              checkpointLabel: cp.label,
              checkpointFraction: cp.fraction,
            },
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

  // 7b. Free-text location during active trip ("driving past Warden", "just passed Harrismith")
  if (
    member?.isKnown &&
    activeTrip &&
    activeTrip.status !== "completed" &&
    activeTrip.status !== "red" &&
    activeTrip.checkpointList &&
    activeTrip.routeEtaMinutes
  ) {
    const FREE_TEXT_LOC = /\b(?:driving\s+(?:past|through|by)|just\s+pass(?:ed|ing)|passing\s+(?:through\s+)?|approaching)\s+([A-Za-z][A-Za-z\s\-]{2,30})/i;
    const locMatch = body.match(FREE_TEXT_LOC);
    if (locMatch) {
      const reportedLoc = locMatch[1].replace(/\s+$/, "").trim();
      try {
        const cps = JSON.parse(activeTrip.checkpointList) as Array<{ label: string; minutesFromStart: number; fraction: number }>;
        const matched = cps.find(
          (cp) =>
            cp.label.toLowerCase().includes(reportedLoc.toLowerCase()) ||
            reportedLoc.toLowerCase().includes(cp.label.toLowerCase()),
        );
        if (matched) {
          const { newEtaTime, remainingMinutes } = recalcEtaFromFraction(activeTrip.routeEtaMinutes, matched.fraction);
          const timeStr = formatTimeLeft(remainingMinutes);
          const tripDest = activeTrip.title.includes(" → ") ? activeTrip.title.split(" → ").pop()! : activeTrip.title;
          const locTs = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
          await db.update(tripsTable).set({
            originalMemberEta: newEtaTime,
            lastMemberCheckinTime: new Date(),
            etaDriftMinutes: 0,
            status: "green",
            currentRouteConfidence: "green",
            evidenceNotes: appendNote(activeTrip.evidenceNotes, `[${locTs}] FREE-TEXT: "${reportedLoc}" → ETA recalculated → ${newEtaTime}`),
            nextAction: `Location update: ${reportedLoc}. Updated ETA: ${newEtaTime}`,
          }).where(eq(tripsTable.id, activeTrip.id));
          await resetConvState(from);
          await sendWhatsApp(from, to, `📍 *${reportedLoc}* noted — ETA updated automatically.\n\nEstimated arrival at *${tripDest}*: *${newEtaTime}* (${timeStr} to go).\n\nWe're still with you. Safe travels! 🛡️`);
          await saveMessage(from, to, body, messageSid, activeTrip.id);
          await sendOperatorMirror(to, [
            `CYBER CHAPERONE — FREE-TEXT LOCATION`,
            `Member: ${name}`,
            `Trip: ${activeTrip.title} (ID: ${activeTrip.id})`,
            `Reported: "${reportedLoc}" (matched checkpoint: ${matched.label}, fraction: ${matched.fraction})`,
            `Updated ETA: ${newEtaTime} (${timeStr} remaining)`,
            `Status: GREEN`,
          ].join("\n"), "checkpoint");
          return { handled: true };
        }
      } catch { /* best-effort */ }
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

  } finally {
    // Always clean up the platform override so it never leaks across requests
    _replyOverrides.delete(from);
  }
}
