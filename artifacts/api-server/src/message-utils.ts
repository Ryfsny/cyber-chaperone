const MAIN_MENU_FOOTER = "\n\nReply 0 for Main Menu.";

/**
 * Appends "Reply 0 for Main Menu." to any member-facing WhatsApp message.
 *
 * - Idempotent: never duplicates the footer.
 * - Do NOT use for: operator mirror alerts, conduit dispatch messages,
 *   ICE contact escalation messages, or internal logs.
 */
export function withMenu(text: string): string {
  if (text.includes("Reply 0 for Main Menu.")) return text;
  return text + MAIN_MENU_FOOTER;
}
