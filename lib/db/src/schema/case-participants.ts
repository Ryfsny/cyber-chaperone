import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * case_participants — Situation Room Case participant control layer.
 *
 * Each active trip can have a Situation Room Case with multiple participants.
 * The operator controls who is invited, active, removed, or declined.
 *
 * Roles: operator | member | ice_contact | conduit | area_coordinator | observer
 * Access statuses: invited | active | declined | removed
 *
 * Privacy gating:
 *   infoLevel 1 = approximate area only (default for conduit dispatch)
 *   infoLevel 2 = route/destination context
 *   infoLevel 3 = member name
 *   infoLevel 4 = member phone / direct contact
 */
export const caseParticipantsTable = pgTable("case_participants", {
  id: serial("id").primaryKey(),
  tripId: integer("trip_id").notNull(),
  participantName: text("participant_name").notNull(),
  whatsappNumber: text("whatsapp_number").notNull(),
  role: text("role").notNull(),
  accessStatus: text("access_status").notNull().default("invited"),
  infoLevel: integer("info_level").notNull().default(1),
  permissions: text("permissions"),
  notes: text("notes"),
  invitedBy: text("invited_by"),
  invitedAt: timestamp("invited_at", { withTimezone: true }).notNull().defaultNow(),
  removedBy: text("removed_by"),
  removedAt: timestamp("removed_at", { withTimezone: true }),
  responderId: integer("responder_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCaseParticipantSchema = createInsertSchema(caseParticipantsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCaseParticipant = z.infer<typeof insertCaseParticipantSchema>;
export type CaseParticipant = typeof caseParticipantsTable.$inferSelect;
