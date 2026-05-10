import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  fromNumber: text("from_number").notNull(),
  toNumber: text("to_number").notNull(),
  body: text("body").notNull(),
  messageSid: text("message_sid"),
  tripId: integer("trip_id"),
  direction: text("direction").notNull().default("inbound"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, receivedAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
