import "express-session";

declare module "express-session" {
  interface SessionData {
    authenticated?: boolean;
    memberId?: number;
    // Admin role info (set on login for operator_admins table users)
    adminId?: number;
    adminRole?: "national" | "provincial" | "city" | "suburb" | "street";
    adminDisplayName?: string;
    adminProvince?: string | null;
    adminCity?: string | null;
    adminSuburb?: string | null;
    adminStreet?: string | null;
  }
}
