import { db } from "@workspace/db";
import { membersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// ── DISC types ────────────────────────────────────────────────────────────────

export type DiscDimension = "D" | "I" | "S" | "C";

export interface DiscScores {
  D: number;
  I: number;
  S: number;
  C: number;
}

export interface DiscProfile {
  type: DiscDimension | null;
  blend: DiscDimension | null;
  confidence: number;
  scores: DiscScores;
  label: string;
}

// ── Signal catalogue ──────────────────────────────────────────────────────────
// Every observable behaviour maps to weighted DISC scores.

export type DiscSignal =
  | "MENU_TRIP"           // chose Trip / Cyber Chaperone
  | "MENU_SHOP"           // chose eblockshop
  | "MENU_SPEAK_PERSON"   // chose Speak to a person
  | "MENU_INVITE"         // chose Invite a Friend
  | "MENU_WHAT_IS"        // chose What is eblockwatch?
  | "MENU_PROFILE"        // chose Update my profile
  | "MENU_GETTING_STARTED" // chose Getting Started Guide
  | "MENU_MEMBERSHIP"     // chose Membership options
  | "MSG_SHORT"           // message ≤ 10 chars
  | "MSG_MEDIUM"          // message 11–60 chars
  | "MSG_LONG"            // message > 60 chars
  | "RESPONSE_FAST"       // replied within 60 seconds of our message
  | "RESPONSE_SLOW"       // took > 10 minutes to reply
  | "PROFILE_COMPLETE"    // completed safety questionnaire fully
  | "PROFILE_SKIP"        // skipped a profile field
  | "EMERGENCY_10"        // typed 10 (emergency)
  | "DISTRESS_NATURAL"    // used natural language distress (not 10)
  | "CHECKIN_FAST"        // answered check-in within 2 minutes
  | "CHECKIN_SLOW"        // answered check-in after 30+ minutes
  | "ICE_PROVIDED"        // provided ICE contact details
  | "VEHICLE_PROVIDED"    // provided vehicle details
  | "TRIP_FREQUENT"       // started 3+ trips (lifetime)
  | "SHOP_PURCHASE";      // completed a shop enquiry

const WEIGHTS: Record<DiscSignal, Partial<DiscScores>> = {
  MENU_TRIP:            { D: 3 },
  MENU_SHOP:            { D: 2, I: 1 },
  MENU_SPEAK_PERSON:    { S: 3, C: 1 },
  MENU_INVITE:          { I: 5 },
  MENU_WHAT_IS:         { C: 2, S: 1 },
  MENU_PROFILE:         { C: 3 },
  MENU_GETTING_STARTED: { C: 2 },
  MENU_MEMBERSHIP:      { S: 2, C: 1 },
  MSG_SHORT:            { D: 2 },
  MSG_MEDIUM:           { I: 1, S: 1 },
  MSG_LONG:             { C: 2, S: 1 },
  RESPONSE_FAST:        { D: 2, I: 1 },
  RESPONSE_SLOW:        { S: 2, C: 1 },
  PROFILE_COMPLETE:     { C: 5, S: 1 },
  PROFILE_SKIP:         { D: 2, I: 1 },
  EMERGENCY_10:         { D: 4 },
  DISTRESS_NATURAL:     { I: 2, S: 2 },
  CHECKIN_FAST:         { D: 3 },
  CHECKIN_SLOW:         { S: 2 },
  ICE_PROVIDED:         { S: 3, C: 2 },
  VEHICLE_PROVIDED:     { C: 3 },
  TRIP_FREQUENT:        { D: 2, I: 1 },
  SHOP_PURCHASE:        { D: 1, I: 2 },
};

// Minimum total score points before we assign a type
const CONFIDENCE_THRESHOLD = 12;

// ── Blend labels (primary/secondary) ─────────────────────────────────────────

const BLEND_LABELS: Record<string, string> = {
  "D/I": "Driving Influencer — decisive yet persuasive",
  "D/C": "Driving Analyst — results through precision",
  "D/S": "Driving Supporter — leads with empathy",
  "D/D": "Pure Driver — direct, fast, results-only",
  "I/D": "Influential Driver — inspiring with urgency",
  "I/S": "Influential Supporter — warm and inspiring",
  "I/C": "Influential Analyst — creative and thorough",
  "I/I": "Pure Influencer — expressive, social, enthusiastic",
  "S/D": "Steady Driver — calm under pressure, goal-oriented",
  "S/I": "Steady Influencer — warm community-builder",
  "S/C": "Steady Analyst — careful, loyal, methodical",
  "S/S": "Pure Steady — patient, loyal, family-first",
  "C/D": "Conscientious Driver — precision with urgency",
  "C/I": "Conscientious Influencer — detailed and personable",
  "C/S": "Conscientious Supporter — thorough and empathetic",
  "C/C": "Pure Conscientious — systematic, high standards",
};

function blendKey(type: DiscDimension, blend: DiscDimension): string {
  return `${type}/${blend}`;
}

function computeProfile(scores: DiscScores): DiscProfile {
  const total = scores.D + scores.I + scores.S + scores.C;
  if (total < CONFIDENCE_THRESHOLD) {
    return { type: null, blend: null, confidence: 0, scores, label: "Profiling in progress" };
  }

  const sorted = (["D", "I", "S", "C"] as DiscDimension[]).sort(
    (a, b) => scores[b] - scores[a],
  );
  const primary = sorted[0];
  const secondary = sorted[1];

  const confidence = Math.min(
    Math.round(((scores[primary] - scores[secondary]) / total) * 100 + 50),
    95,
  );

  const blend = scores[secondary] / scores[primary] > 0.55 ? secondary : primary;
  const key = blendKey(primary, blend);
  const label = BLEND_LABELS[key] ?? `${primary}/${blend}`;

  return { type: primary, blend: blend === primary ? null : blend, confidence, scores, label };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function recordDiscSignal(
  memberId: number,
  signal: DiscSignal,
): Promise<void> {
  try {
    const [row] = await db
      .select({ discSignals: membersTable.discSignals })
      .from(membersTable)
      .where(eq(membersTable.id, memberId));

    if (!row) return;

    const existing: DiscScores = row.discSignals
      ? (JSON.parse(row.discSignals) as DiscScores)
      : { D: 0, I: 0, S: 0, C: 0 };

    const delta = WEIGHTS[signal] ?? {};
    const updated: DiscScores = {
      D: existing.D + (delta.D ?? 0),
      I: existing.I + (delta.I ?? 0),
      S: existing.S + (delta.S ?? 0),
      C: existing.C + (delta.C ?? 0),
    };

    const profile = computeProfile(updated);

    await db
      .update(membersTable)
      .set({
        discSignals: JSON.stringify(updated),
        discType: profile.type ?? undefined,
        discBlend: profile.blend ?? undefined,
        discConfidence: profile.confidence,
      })
      .where(eq(membersTable.id, memberId));
  } catch {
    // Never crash the menu router over profiling
  }
}

export function getDiscProfileFromScores(scoresJson: string | null): DiscProfile {
  if (!scoresJson) {
    return { type: null, blend: null, confidence: 0, scores: { D: 0, I: 0, S: 0, C: 0 }, label: "Profiling in progress" };
  }
  try {
    const scores = JSON.parse(scoresJson) as DiscScores;
    return computeProfile(scores);
  } catch {
    return { type: null, blend: null, confidence: 0, scores: { D: 0, I: 0, S: 0, C: 0 }, label: "Profiling in progress" };
  }
}
