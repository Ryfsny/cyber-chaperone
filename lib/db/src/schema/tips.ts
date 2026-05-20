import { pgTable, text, serial, boolean, timestamp } from "drizzle-orm/pg-core";

export const tipsTable = pgTable("tips", {
  id: serial("id").primaryKey(),
  trigger: text("trigger").notNull(),
  tipText: text("tip_text").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Tip = typeof tipsTable.$inferSelect;
