import { pgTable, serial, text, timestamp, real } from "drizzle-orm/pg-core";

export const locationPingsTable = pgTable("location_pings", {
  id: serial("id").primaryKey(),
  memberPhone: text("member_phone").notNull(),
  lat: real("lat").notNull(),
  lon: real("lon").notNull(),
  accuracy: real("accuracy"),
  mode: text("mode").notNull().default("idle"),
  pingedAt: timestamp("pinged_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LocationPing = typeof locationPingsTable.$inferSelect;
