import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * case_logs — Full audit trail for every Situation Room Case action.
 *
 * Action types:
 *   dispatch_sent       — operator sent dispatch to conduit
 *   participant_invited — operator invited participant
 *   participant_removed — operator removed participant
 *   participant_declined— participant declined invitation
 *   conduit_reply       — conduit replied with 1-5 option
 *   status_changed      — participant status changed
 *   info_shared         — operator approved sharing additional info
 *   operator_note       — freeform note added to log
 */
export const caseLogsTable = pgTable("case_logs", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  participantId: integer("participant_id"),
  actionType: text("action_type").notNull(),
  operator: text("operator"),
  participantName: text("participant_name"),
  participantWhatsapp: text("participant_whatsapp"),
  messageSent: text("message_sent"),
  replyReceived: text("reply_received"),
  replyCode: text("reply_code"),
  infoLevelAtTime: integer("info_level_at_time").default(1),
  tripStatusAtTime: text("trip_status_at_time"),
  outcome: text("outcome"),
  operatorNote: text("operator_note"),
  twilioMessageSid: text("twilio_message_sid"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCaseLogSchema = createInsertSchema(caseLogsTable).omit({ id: true, createdAt: true });
export type InsertCaseLog = z.infer<typeof insertCaseLogSchema>;
export type CaseLog = typeof caseLogsTable.$inferSelect;
