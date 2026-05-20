import { db } from "@workspace/db";
import { tipsTable } from "@workspace/db";
import { eq, and, ne } from "drizzle-orm";

export type TipTrigger =
  | "trip_started"
  | "trip_closed"
  | "checkin"
  | "main_menu"
  | "getting_started"
  | "membership_info";

/**
 * Returns a formatted tip string for appending to a WhatsApp message.
 * Returns empty string if no tips available or on any error.
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
    return `\n\n━━━━━━━━━━━━━\n${tip!.tipText}`;
  } catch {
    return "";
  }
}
