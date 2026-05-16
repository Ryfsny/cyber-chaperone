import { pgTable, text, serial, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const membersTable = pgTable("members", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  displayName: text("display_name").notNull(),
  whatsappNumber: text("whatsapp_number").notNull().unique(),
  memberStatus: text("member_status").notNull().default("unknown"),
  membershipTier: text("membership_tier"),
  role: text("role"),
  notes: text("notes"),
  iceContactName: text("ice_contact_name"),
  iceContactPhone: text("ice_contact_phone"),
  familyGroupId: integer("family_group_id"),
  homeLat: text("home_lat"),
  homeLon: text("home_lon"),
  homeAddress: text("home_address"),
  email: text("email"),
  mobile: text("mobile"),
  industry: text("industry"),
  suburb: text("suburb"),
  city: text("city"),
  province: text("province"),
  postalCode: text("postal_code"),
  country: text("country"),
  sourceBatch: text("source_batch"),
  importStatus: text("import_status"),
  paystackCustomerId: text("paystack_customer_id"),
  paystackSubscriptionCode: text("paystack_subscription_code"),
  paystackStatus: text("paystack_status"),
  paystackPlanCode: text("paystack_plan_code"),
  paystackPaidAt: timestamp("paystack_paid_at", { withTimezone: true }),
  facebookUrl: text("facebook_url"),
  motherName: text("mother_name"),
  motherPhone: text("mother_phone"),
  vehicleDescription: text("vehicle_description"),
  vehiclePhotoUrls: text("vehicle_photo_urls"),
  passwordHash: text("password_hash"),
  memberToken: uuid("member_token").defaultRandom().unique(),
  // ── DISC personality profile ──────────────────────────────────────────────
  discType: text("disc_type"),          // primary: D | I | S | C
  discBlend: text("disc_blend"),        // secondary: D | I | S | C (the blend)
  discSignals: text("disc_signals"),    // JSON: accumulated signal scores
  discConfidence: integer("disc_confidence"), // 0–100 — how confident we are
  // ─────────────────────────────────────────────────────────────────────────
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMemberSchema = createInsertSchema(membersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof membersTable.$inferSelect;
