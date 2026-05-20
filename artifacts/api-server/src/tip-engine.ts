import { db } from "@workspace/db";
import { tipsTable } from "@workspace/db";
import { eq, and, ne } from "drizzle-orm";

export type TipTrigger =
  | "trip_started"
  | "trip_closed"
  | "checkin"
  | "main_menu"
  | "getting_started"
  | "my_account"
  | "membership_info"
  | "clock_in"
  | "scare_bear"
  | "invite_sent";

/**
 * Returns a random active tip text for the given trigger, or empty string.
 * Optionally pass excludeId to avoid repeating the last shown tip.
 */
export async function getNextTip(
  trigger: TipTrigger,
  excludeId?: number,
): Promise<string> {
  try {
    const rows = await db
      .select()
      .from(tipsTable)
      .where(
        excludeId
          ? and(eq(tipsTable.trigger, trigger), eq(tipsTable.active, true), ne(tipsTable.id, excludeId))
          : and(eq(tipsTable.trigger, trigger), eq(tipsTable.active, true)),
      );

    if (rows.length === 0) return "";
    const tip = rows[Math.floor(Math.random() * rows.length)];
    return tip!.tipText;
  } catch {
    return "";
  }
}

/**
 * Sends a tip as a separate WhatsApp message after the main reply.
 * Fire-and-forget — never crashes the main flow.
 */
export function sendTip(
  from: string,
  to: string,
  trigger: TipTrigger,
  sendFn: (from: string, to: string, body: string) => Promise<unknown>,
): void {
  void (async () => {
    try {
      const tipText = await getNextTip(trigger);
      if (!tipText) return;
      await sendFn(from, to, tipText);
    } catch {
      // best-effort — never crashes
    }
  })();
}
