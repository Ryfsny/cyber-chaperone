import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export const broadcastQueueTable = pgTable("broadcast_queue", {
  id:            serial("id").primaryKey(),
  submittedBy:   integer("submitted_by").notNull(),   // operatorAdmins.id
  submitterName: text("submitter_name").notNull(),
  scope:         text("scope").notNull(),              // e.g. "Western Cape > Cape Town > Claremont"
  province:      text("province"),
  city:          text("city"),
  suburb:        text("suburb"),
  subject:       text("subject").notNull(),
  message:       text("message").notNull(),
  channels:      jsonb("channels").notNull(),          // string[] e.g. ["email","sms","whatsapp"]
  recipientCount: integer("recipient_count"),
  status:        text("status").notNull().default("pending"), // pending | approved | rejected | sent
  approvedBy:    integer("approved_by"),               // operatorAdmins.id of national admin
  approvedAt:    timestamp("approved_at", { withTimezone: true }),
  rejectedReason: text("rejected_reason"),
  sentAt:        timestamp("sent_at", { withTimezone: true }),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BroadcastQueueItem = typeof broadcastQueueTable.$inferSelect;
export type InsertBroadcastQueueItem = typeof broadcastQueueTable.$inferInsert;
