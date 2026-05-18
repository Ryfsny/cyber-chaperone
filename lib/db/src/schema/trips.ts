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
  startLat: text("start_lat"),
  startLon: text("start_lon"),
  destLat: text("dest_lat"),
  destLon: text("dest_lon"),
  routePolyline: text("route_polyline"),
  routeEtaMinutes: integer("route_eta_minutes"),
  routeEtaTime: text("route_eta_time"),
  checkpointList: text("checkpoint_list"),
  mediaPhotos: text("media_photos"),
  lastKnownLat: text("last_known_lat"),
  lastKnownLon: text("last_known_lon"),
  lastKnownAt: timestamp("last_known_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTripSchema = createInsertSchema(tripsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Trip = typeof tripsTable.$inferSelect;
