import twilio from "twilio";
import { db, respondersTable, messagesTable, conversationStatesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import type { Logger } from "pino";

export const FLOW_FIELD_007 = "FIELD_007";
const STEP_AWAIT_BROADCAST_LOC = "AWAIT_BROADCAST_LOC";
const STEP_AWAIT_BROADCAST_MSG = "AWAIT_BROADCAST_MSG";
const STEP_AWAIT_RESPONDER_LOC = "AWAIT_RESPONDER_LOC";
const STEP_AWAIT_VOICE         = "AWAIT_VOICE";
const STEP_AWAIT_TODO          = "AWAIT_TODO";

const SITUATION_ROOM_URL = "https://cyber-chaperone-r--ryfsny.replit.app/";

const OPERATOR_WA_NUMBERS = ["whatsapp:+27825611065", "whatsapp:+27716845443"];

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface NearbyResponder {
  name: string;
  whatsappNumber: string | null;
  areaName: string | null;
  distKm: number;
}

async function findNearbyResponders(lat: number, lon: number, radiusKm = 30): Promise<NearbyResponder[]> {
  const all = await db
    .select({
      name: respondersTable.name,
      whatsappNumber: respondersTable.whatsappNumber,
      areaName: respondersTable.areaName,
      homeLat: respondersTable.homeLat,
      homeLon: respondersTable.homeLon,
    })
    .from(respondersTable)
    .where(eq(respondersTable.active, true));

  return all
    .map((r) => {
      const rLat = parseFloat(r.homeLat ?? "");
      const rLon = parseFloat(r.homeLon ?? "");
      if (isNaN(rLat) || isNaN(rLon)) return null;
      const distKm = haversineKm(lat, lon, rLat, rLon);
      return distKm <= radiusKm
        ? { name: r.name, whatsappNumber: r.whatsappNumber, areaName: r.areaName, distKm }
        : null;
    })
    .filter((r): r is NearbyResponder => r !== null)
    .sort((a, b) => a.distKm - b.distKm);
}

export function fieldMenuText(operatorName: string): string {
  return [
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🛡️ *007 — FIELD COMMAND*`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `${operatorName}, you are in Field Command mode.`,
    ``,
    `─── 🖥️ Situation Room ───`,
    `1️⃣  Open Situation Room dashboard`,
    ``,
    `─── 📡 Field operations ───`,
    `2️⃣  Broadcast to nearby responders`,
    `     (drop your pin next)`,
    `3️⃣  Log voice note to Situation Room`,
    `4️⃣  Responder list within 30km`,
    `     (drop your pin next)`,
    `5️⃣  🚨 Declare field emergency`,
    ``,
    `─── ✅ To-do list ───`,
    `6️⃣  Add a to-do item (type or voice note)`,
    `7️⃣  View my to-do list`,
    ``,
    `Reply *007* to exit field mode.`,
  ].join("\n");
}

export async function setFieldMenuState(
  whatsappNumber: string,
  step: string | null,
  pending: Record<string, unknown> | null = null,
): Promise<void> {
  await db
    .insert(conversationStatesTable)
    .values({ whatsappNumber, currentFlow: FLOW_FIELD_007, currentStep: step, pendingTripData: pending })
    .onConflictDoUpdate({
      target: conversationStatesTable.whatsappNumber,
      set: { currentFlow: FLOW_FIELD_007, currentStep: step, pendingTripData: pending, updatedAt: new Date() },
    });
}

export async function clearFieldMenuState(whatsappNumber: string): Promise<void> {
  await db
    .delete(conversationStatesTable)
    .where(eq(conversationStatesTable.whatsappNumber, whatsappNumber))
    .catch(() => {});
}

type SendReply = (from: string, to: string, body: string) => Promise<void>;

export async function handleFieldState(
  from: string,
  to: string,
  body: string,
  step: string | null,
  pending: Record<string, unknown> | null,
  numMedia: number,
  mediaUrl: string,
  mediaContentType: string,
  latitude: string,
  longitude: string,
  operatorName: string,
  sendReply: SendReply,
  log: Logger,
): Promise<void> {
  const choice = body.trim();
  const hasLocation = latitude !== "" && longitude !== "";
  const hasMedia = numMedia > 0 && mediaUrl !== "";
  const isAudio =
    mediaContentType.startsWith("audio/") ||
    mediaContentType.startsWith("video/ogg");

  // 007 from within field mode → exit back to Claude
  if (/^007$/.test(choice)) {
    await clearFieldMenuState(from);
    await sendReply(from, to, "🔒 Field mode exited. Back to operator mode — you're talking to Claude again. 🛡️");
    return;
  }

  // ── Location pin handler ─────────────────────────────────────────────────
  if (hasLocation) {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (step === STEP_AWAIT_BROADCAST_LOC) {
      const nearby = await findNearbyResponders(lat, lon, 30);
      await setFieldMenuState(from, STEP_AWAIT_BROADCAST_MSG, {
        broadcastLat: lat,
        broadcastLon: lon,
        broadcastCount: nearby.length,
      });
      await sendReply(from, to, [
        `📡 Got your pin. *${nearby.length} active responder${nearby.length === 1 ? "" : "s"}* within 30km.`,
        ``,
        `Type your broadcast message now and I will send it to all of them.`,
        ``,
        `Reply 007 to cancel.`,
      ].join("\n"));
      return;
    }

    if (step === STEP_AWAIT_RESPONDER_LOC) {
      const nearby = await findNearbyResponders(lat, lon, 30);
      await clearFieldMenuState(from);
      if (nearby.length === 0) {
        await sendReply(from, to, `👥 No active responders found within 30km of your location.\n\nReply 007 for Field Command.`);
        return;
      }
      const lines = [
        `👥 *${nearby.length} Responder${nearby.length === 1 ? "" : "s"} within 30km*`,
        ``,
        ...nearby.map((r, i) => {
          const num = r.whatsappNumber?.replace("whatsapp:", "") ?? "—";
          const area = r.areaName ? ` — ${r.areaName}` : "";
          return `${i + 1}. *${r.name}*${area}\n   📱 ${num} (${r.distKm.toFixed(1)}km)`;
        }),
        ``,
        `Reply 007 for Field Command.`,
      ];
      await sendReply(from, to, lines.join("\n"));
      return;
    }
  }

  // ── AWAIT_BROADCAST_MSG — operator typed the message to broadcast ────────
  if (step === STEP_AWAIT_BROADCAST_MSG && !hasLocation) {
    const lat = Number(pending?.broadcastLat ?? NaN);
    const lon = Number(pending?.broadcastLon ?? NaN);
    if (isNaN(lat) || isNaN(lon)) {
      await clearFieldMenuState(from);
      await sendReply(from, to, `⚠️ Location lost. Please start again.\n\nReply 007 for Field Command.`);
      return;
    }
    const nearby = await findNearbyResponders(lat, lon, 30);
    await clearFieldMenuState(from);
    if (nearby.length === 0) {
      await sendReply(from, to, `📡 No active responders found within 30km. Broadcast cancelled.\n\nReply 007 for Field Command.`);
      return;
    }
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    let sent = 0;
    for (const r of nearby.slice(0, 25)) {
      if (!r.whatsappNumber) continue;
      try {
        await client.messages.create({
          from: to,
          to: r.whatsappNumber,
          body: [
            `📡 *eblockwatch Field Broadcast*`,
            ``,
            choice,
            ``,
            `— eblockwatch Cyber Chaperone`,
          ].join("\n"),
        });
        sent++;
      } catch {
        // best-effort
      }
    }
    log.info({ from, sent, total: nearby.length }, "field-007: broadcast sent");
    await sendReply(from, to, `✅ Broadcast sent to *${sent} of ${nearby.length}* responders within 30km.\n\nReply 007 for Field Command.`);
    return;
  }

  // ── AWAIT_TODO — save a to-do item (text or transcribed voice) ──────────
  if (step === STEP_AWAIT_TODO) {
    const todoText = choice.trim();
    if (!todoText) {
      await sendReply(from, to, `Please type your task or send a voice note.\n\nReply 007 to cancel.`);
      return;
    }
    await db.insert(messagesTable).values({
      fromNumber: from,
      toNumber: "internal",
      body: todoText,
      messageSid: null,
      tripId: null,
      direction: "operator-todo",
    }).catch(() => {});
    await clearFieldMenuState(from);
    await sendReply(from, to, [
      `✅ *To-do saved:*`,
      ``,
      `"${todoText}"`,
      ``,
      `Reply *7* from the 007 menu to view your full list.`,
      `Reply *007* for Field Command.`,
    ].join("\n"));
    log.info({ from, todoText: todoText.slice(0, 80) }, "field-007: to-do item saved");
    return;
  }

  // ── AWAIT_VOICE — capture voice note ────────────────────────────────────
  if (step === STEP_AWAIT_VOICE) {
    if (hasMedia && (isAudio || choice)) {
      const ts = new Date().toISOString();
      const transcription = !isAudio && choice ? `"${choice}"` : null;
      const logBody = [
        `[FIELD VOICE NOTE] ${ts} — ${operatorName}`,
        transcription ? `Transcription: ${transcription}` : null,
        `Audio: ${mediaUrl}`,
      ].filter(Boolean).join(" | ");
      await db.insert(messagesTable).values({
        fromNumber: from,
        toNumber: to,
        body: logBody,
        messageSid: null,
        tripId: null,
        direction: "operator",
      }).catch(() => {});
      await clearFieldMenuState(from);
      await sendReply(from, to, [
        `🎤 Voice note logged to Situation Room.`,
        transcription ? `\nTranscription: ${transcription}` : "",
        `\nTimestamp: ${ts}`,
        `\nReply 007 for Field Command.`,
      ].filter(Boolean).join("\n"));
      return;
    }
    await sendReply(from, to, `Please send a voice note now.\n\nReply 007 to cancel.`);
    return;
  }

  // ── Main field menu choices (step null) ─────────────────────────────────
  if (choice === "1") {
    await clearFieldMenuState(from);
    await sendReply(from, to, [
      `🔗 *Situation Room*`,
      ``,
      SITUATION_ROOM_URL,
      ``,
      `Reply 007 for Field Command.`,
    ].join("\n"));
    return;
  }

  if (choice === "2") {
    await setFieldMenuState(from, STEP_AWAIT_BROADCAST_LOC);
    await sendReply(from, to, `📡 *Broadcast to nearby*\n\nDrop your WhatsApp location pin and I will find all active responders within 30km.\n\nReply 007 to cancel.`);
    return;
  }

  if (choice === "3") {
    await setFieldMenuState(from, STEP_AWAIT_VOICE);
    await sendReply(from, to, `🎤 *Log voice note*\n\nSend your voice note now — I will log it to the Situation Room with a timestamp.\n\nReply 007 to cancel.`);
    return;
  }

  if (choice === "4") {
    await setFieldMenuState(from, STEP_AWAIT_RESPONDER_LOC);
    await sendReply(from, to, `👥 *Responder list*\n\nDrop your WhatsApp location pin and I will return all active responders within 30km.\n\nReply 007 to cancel.`);
    return;
  }

  if (choice === "5") {
    const ts = new Date().toISOString();
    const emergencyMsg = [
      `🚨 *FIELD EMERGENCY DECLARED*`,
      ``,
      `Operator: ${operatorName}`,
      `Time: ${ts}`,
      ``,
      `All available operators: please acknowledge immediately and contact ${operatorName}.`,
      ``,
      `— eblockwatch Cyber Chaperone`,
    ].join("\n");
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    for (const opNum of OPERATOR_WA_NUMBERS) {
      if (opNum === from) continue;
      try {
        await client.messages.create({ from: to, to: opNum, body: emergencyMsg });
      } catch {
        // best-effort
      }
    }
    await clearFieldMenuState(from);
    log.info({ from, operatorName }, "field-007: emergency declared");
    await sendReply(from, to, `🚨 Field emergency declared. All operators have been alerted.\n\nReply 007 for Field Command.`);
    return;
  }

  if (choice === "6") {
    await setFieldMenuState(from, STEP_AWAIT_TODO);
    await sendReply(from, to, [
      `✅ *Add a to-do item*`,
      ``,
      `Type your task now, or send a voice note — I will save it.`,
      ``,
      `Reply 007 to cancel.`,
    ].join("\n"));
    return;
  }

  if (choice === "7") {
    const todos = await db
      .select({ body: messagesTable.body, receivedAt: messagesTable.receivedAt })
      .from(messagesTable)
      .where(and(eq(messagesTable.fromNumber, from), eq(messagesTable.direction, "operator-todo")))
      .orderBy(desc(messagesTable.receivedAt))
      .limit(15)
      .catch(() => [] as { body: string; receivedAt: Date | null }[]);
    await clearFieldMenuState(from);
    if (todos.length === 0) {
      await sendReply(from, to, [
        `📋 *TO-DO LIST — ${operatorName}*`,
        ``,
        `No items yet. Reply 6 to add your first task.`,
        ``,
        `Reply 007 for Field Command.`,
      ].join("\n"));
      return;
    }
    const lines = [
      `📋 *TO-DO LIST — ${operatorName}*`,
      ``,
      ...todos.map((t, i) => {
        const when = t.receivedAt
          ? new Date(t.receivedAt).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Johannesburg" })
          : "";
        return `${i + 1}. ${t.body}${when ? `\n   _${when}_` : ""}`;
      }),
      ``,
      `🔗 Situation Room: ${SITUATION_ROOM_URL}`,
      ``,
      `Reply *007* for Field Command.`,
    ];
    await sendReply(from, to, lines.join("\n"));
    log.info({ from, count: todos.length }, "field-007: to-do list viewed");
    return;
  }

  // Unrecognised input — re-show the menu
  await sendReply(from, to, fieldMenuText(operatorName));
}
