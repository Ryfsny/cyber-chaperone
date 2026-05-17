import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const memberIncidentsTable = pgTable("member_incidents", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  location: text("location"),
  // Geocoded coordinates (Nominatim) for the admin incident map
  lat: text("lat"),
  lon: text("lon"),
  status: text("status").notNull().default("received"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertIncidentSchema = createInsertSchema(memberIncidentsTable).omit({
  id: true,
  createdAt: true,
  adminNotes: true,
  status: true,
  lat: true,
  lon: true,
});
export type InsertIncident = z.infer<typeof insertIncidentSchema>;
export type MemberIncident = typeof memberIncidentsTable.$inferSelect;
