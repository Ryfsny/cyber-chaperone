import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tripsTable = pgTable("trips", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  travelerName: text("traveler_name").notNull(),
  travelerPhone: text("traveler_phone").notNull(),
  status: text("status").notNull().default("green"),
  evidenceNotes: text("evidence_notes"),
  inferenceNotes: text("inference_notes"),
  nextAction: text("next_action"),
  operatorNotes: text("operator_notes"),
  originalMemberEta: text("original_member_eta"),
  currentRouteConfidence: text("current_route_confidence").default("green"),
  lastMemberCheckinTime: timestamp("last_member_checkin_time", { withTimezone: true }),
  etaDriftMinutes: integer("eta_drift_minutes"),
  iceEscalationStatus: text("ice_escalation_status"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTripSchema = createInsertSchema(tripsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Trip = typeof tripsTable.$inferSelect;
