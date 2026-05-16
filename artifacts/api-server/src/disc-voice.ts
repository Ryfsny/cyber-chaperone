import type { DiscDimension } from "./disc-profiler";

// ── DISC Voice Adaptation ─────────────────────────────────────────────────────
//
// Each DISC type gets its own communication style.
// We never rewrite core safety content — we adapt the wrapper:
// opening warmth, pacing, level of detail, closing CTA style.
//
// D — Dominant:     Direct, no fluff, action-first, results language
// I — Influential:  Warm, enthusiastic, social proof, story hooks
// S — Steady:       Personal, family framing, patient, reassuring
// C — Conscientious: Factual, step-by-step, confirmation-heavy, process trust

export type DiscVoiceKey =
  | "GREETING"         // opening line on main menu
  | "TRIP_CONFIRM"     // trip start confirmation suffix
  | "TRIP_ARRIVAL"     // arrival message suffix
  | "CHECKIN_OPENER"   // checkpoint opening line
  | "DISTRESS_OPENER"  // distress response opening
  | "SHOP_PITCH"       // shop intro line
  | "EMERGENCY_LABEL"; // how we label the emergency option

interface VoiceVariants {
  D: string;
  I: string;
  S: string;
  C: string;
  default: string;
}

const VOICE_MAP: Record<DiscVoiceKey, VoiceVariants> = {
  GREETING: {
    D:       "Here's your menu. Pick one and let's go.",
    I:       "Great to connect with you today! Here's everything at your fingertips:",
    S:       "Welcome back. The whole eblockwatch family is here for you — as always.",
    C:       "Your account is active. Here are your available options:",
    default: "We have one job: get you there safely, every time.",
  },
  TRIP_CONFIRM: {
    D:       "You're covered. We'll stay out of your way unless you need us.",
    I:       "You're not travelling alone — we've got an eye on you all the way! 🙌",
    S:       "Your family can rest easy. We'll watch over you every kilometre.",
    C:       "Your trip has been logged with ETA and route. We monitor every checkpoint.",
    default: "From this moment we are watching. You will not face anything alone.",
  },
  TRIP_ARRIVAL: {
    D:       "Trip closed. Well done. See you next time.",
    I:       "You made it! 🎉 Give us a shout when you're heading out again.",
    S:       "Home safe. That's all we ever wanted for you and your family. ❤️",
    C:       "Trip closed and logged. All checkpoints accounted for.",
    default: "We start the journey together and we end it together.",
  },
  CHECKIN_OPENER: {
    D:       "Quick one —",
    I:       "Hey, just checking you're all good out there! 👋",
    S:       "Just thinking of you on the road —",
    C:       "Scheduled checkpoint reached —",
    default: "Quick check-in — one reply is all we need.",
  },
  DISTRESS_OPENER: {
    D:       "On it. Tell us exactly what's happening.",
    I:       "We're here — you're not alone in this, we promise.",
    S:       "André has been called. Your whole support network is being activated right now.",
    C:       "Alert received and logged. André has been notified. Please confirm your situation:",
    default: "André has been woken up. The Situation Room is on alert right now.",
  },
  SHOP_PITCH: {
    D:       "Fast, effective safety products — everything you need in one place.",
    I:       "Join the thousands of South Africans who've levelled up their safety this year! 🛡️",
    S:       "Everything here is designed to protect the people you love most.",
    C:       "Each product is selected for quality, reliability and real-world South African conditions.",
    default: "Everything in eblockshop is designed to make you and your family safer.",
  },
  EMERGENCY_LABEL: {
    D:       "🚨 EMERGENCY? Reply 10 — immediate response.",
    I:       "🚨 Need us RIGHT NOW? Reply 10 — we jump.",
    S:       "🚨 Anything wrong? Reply 10 — we will come to you.",
    C:       "🚨 EMERGENCY? Reply 10 — escalates immediately to André.",
    default: "🚨 *EMERGENCY? Reply 10* — we will get the world to save you.",
  },
};

export function discVoice(
  key: DiscVoiceKey,
  discType: DiscDimension | null | undefined,
): string {
  const variants = VOICE_MAP[key];
  if (!discType || !(discType in variants)) return variants.default;
  return variants[discType];
}

// ── Per-type context injections ───────────────────────────────────────────────
// Short phrases that can be injected into messages to reinforce the relationship.

export const DISC_CONTEXT: Record<DiscDimension, {
  memberLabel: string;    // how we think of this member
  trustPhrase: string;    // what builds trust with them
  urgencyStyle: string;   // how urgency is framed for them
}> = {
  D: {
    memberLabel: "results-driven member",
    trustPhrase: "It works. We deliver.",
    urgencyStyle: "Act now.",
  },
  I: {
    memberLabel: "community champion",
    trustPhrase: "250 000 South Africans have your back.",
    urgencyStyle: "We're all in this together — right now.",
  },
  S: {
    memberLabel: "family guardian",
    trustPhrase: "We treat your family like our own.",
    urgencyStyle: "Your family is counting on us — we won't let them down.",
  },
  C: {
    memberLabel: "safety-first member",
    trustPhrase: "Every step is logged. Every alert is verified.",
    urgencyStyle: "Alert confirmed and being processed systematically.",
  },
};
