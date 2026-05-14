import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session.authenticated) {
    next();
    return;
  }
  res.status(401).json({ error: "Unauthorized." });
}

export function requireNationalAdmin(req: Request, res: Response, next: NextFunction): void {
  if (isNationalAdmin(req)) {
    next();
    return;
  }
  res.status(403).json({ error: "Forbidden. National admin access required." });
}

/**
 * Returns true if the current session belongs to a national admin
 * (either the legacy OPERATOR_PASSWORD login or a named admin with role "national").
 */
export function isNationalAdmin(req: Request): boolean {
  if (!req.session.authenticated) return false;
  const role = req.session.adminRole;
  return !role || role === "national";
}

/**
 * Builds a geo-scope WHERE filter string for use with raw SQL,
 * based on the admin's assigned scope.
 * Returns null if the admin is national (no restriction).
 */
export interface AdminScope {
  role: string;
  province: string | null | undefined;
  city: string | null | undefined;
  suburb: string | null | undefined;
  street: string | null | undefined;
}

export function getAdminScope(req: Request): AdminScope | null {
  if (!req.session.authenticated) return null;
  const role = req.session.adminRole;
  if (!role || role === "national") return null;
  return {
    role,
    province: req.session.adminProvince,
    city: req.session.adminCity,
    suburb: req.session.adminSuburb,
    street: req.session.adminStreet,
  };
}
