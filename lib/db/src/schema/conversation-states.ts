import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const conversationStatesTable = pgTable("conversation_states", {
  id: serial("id").primaryKey(),
  whatsappNumber: text("whatsapp_number").notNull().unique(),
  currentFlow: text("current_flow"),
  currentStep: text("current_step"),
  pendingTripData: text("pending_trip_data"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type ConversationState = typeof conversationStatesTable.$inferSelect;
