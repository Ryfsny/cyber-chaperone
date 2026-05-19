import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";

/**
 * Scare Bear Sightings — community road safety alerts.
 *
 * Privacy rules (enforced here and in the API):
 * - Reporter identity stored internally but NEVER returned in API responses
 * - Descriptions are privacy-filtered before storage (no plates, no names)
 * - All data is operators-only — never shown to public or other members
 * - Sightings expire after 4 hours (expiresAt) and disappear from the live map
 */
export const scareBearSightingsTable = pgTable("scare_bear_sightings", {
  id: serial("id").primaryKey(),

  // Internal only — never returned by the API
  reporterPhone: text("reporter_phone").notNull(),

  // Location — lat/lon from WhatsApp pin, or null if text-only
  lat: text("lat"),
  lon: text("lon"),
  areaName: text("area_name"), // reverse-geocoded neighbourhood/suburb name

  // Type of sighting
  type: text("type").notNull().default("scary_character"),
  // Values: traffic_officer_bribe | scary_character | suspicious_vehicle | roadblock | other

  // Description — privacy-filtered (plates and names stripped before storage)
  description: text("description"),

  // Media — Twilio media URL for video or voice message
  mediaUrl: text("media_url"),
  mediaType: text("media_type"), // "video" | "voice" | "image"

  // Expiry — sightings shown on live map only until expiresAt
  expiresAt: timestamp("expires_at").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ScareBeaSighting = typeof scareBearSightingsTable.$inferSelect;
export type InsertScareBeaSighting = typeof scareBearSightingsTable.$inferInsert;
