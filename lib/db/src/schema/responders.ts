import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const respondersTable = pgTable("responders", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  whatsappNumber: text("whatsapp_number").notNull(),
  areaName: text("area_name").notNull(),
  homeLat: text("home_lat").notNull(),
  homeLon: text("home_lon").notNull(),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertResponderSchema = createInsertSchema(respondersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertResponder = z.infer<typeof insertResponderSchema>;
export type Responder = typeof respondersTable.$inferSelect;
