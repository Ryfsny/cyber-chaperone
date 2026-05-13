import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const operatorAdminsTable = pgTable("operator_admins", {
  id:           serial("id").primaryKey(),
  username:     text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName:  text("display_name").notNull(),
  role:         text("role").notNull(), // national | provincial | city | suburb | street
  province:     text("province"),      // required for provincial and below
  city:         text("city"),          // required for city and below
  suburb:       text("suburb"),        // required for suburb and below
  street:       text("street"),        // required for street level
  email:        text("email"),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type OperatorAdmin = typeof operatorAdminsTable.$inferSelect;
export type InsertOperatorAdmin = typeof operatorAdminsTable.$inferInsert;
