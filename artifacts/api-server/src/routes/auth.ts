import { Router, type IRouter } from "express";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import { db, operatorAdminsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const gmailUser = process.env["GMAIL_USER"] ?? "";
  const gmailPass = process.env["GMAIL_APP_PASSWORD"] ?? "";
  const operatorPassword = process.env["OPERATOR_PASSWORD"] ?? "";

  if (!gmailUser || !gmailPass) {
    res.status(500).json({ error: "Email not configured." });
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
    });

    await transporter.sendMail({
      from: gmailUser,
      to: gmailUser,
      subject: "eblockwatch Situation Room — Your Operator Password",
      text: `Your Situation Room operator password is:\n\n  ${operatorPassword}\n\nGo to: https://cyber-chaperone-r--ryfsny.replit.app/\n`,
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to send email." });
  }
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { username, password } = req.body as { username?: string; password?: string };
  const operatorPassword = process.env["OPERATOR_PASSWORD"];

  if (!operatorPassword) {
    res.status(500).json({ error: "Server misconfiguration: OPERATOR_PASSWORD not set." });
    return;
  }

  if (!password) {
    res.status(401).json({ error: "Password required." });
    return;
  }

  // ── Case 1: Legacy national operator (no username, matches OPERATOR_PASSWORD) ──
  if (!username && password === operatorPassword) {
    req.session.authenticated = true;
    req.session.adminRole = "national";
    req.session.adminDisplayName = "National Admin";
    req.session.save((err) => {
      if (err) { res.status(500).json({ error: "Session error." }); return; }
      res.json({ ok: true, role: "national", displayName: "National Admin" });
    });
    return;
  }

  // ── Case 2: Named admin from operator_admins table ────────────────────────────
  if (username) {
    const [admin] = await db
      .select()
      .from(operatorAdminsTable)
      .where(eq(operatorAdminsTable.username, username.trim().toLowerCase()));

    if (!admin) {
      res.status(401).json({ error: "Invalid username or password." });
      return;
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid username or password." });
      return;
    }

    req.session.authenticated = true;
    req.session.adminId = admin.id;
    req.session.adminRole = admin.role as "national" | "provincial" | "city" | "suburb" | "street";
    req.session.adminDisplayName = admin.displayName;
    req.session.adminProvince = admin.province;
    req.session.adminCity = admin.city;
    req.session.adminSuburb = admin.suburb;
    req.session.adminStreet = admin.street;

    req.session.save((err) => {
      if (err) { res.status(500).json({ error: "Session error." }); return; }
      res.json({
        ok: true,
        role: admin.role,
        displayName: admin.displayName,
        scope: {
          province: admin.province,
          city: admin.city,
          suburb: admin.suburb,
          street: admin.street,
        },
      });
    });
    return;
  }

  // ── Fallback: password-only but doesn't match OPERATOR_PASSWORD ───────────────
  res.status(401).json({ error: "Invalid password." });
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: "Logout failed." });
      return;
    }
    res.clearCookie("sr.sid");
    res.json({ ok: true });
  });
});

router.get("/auth/me", (req, res): void => {
  if (req.session.authenticated) {
    res.json({
      authenticated: true,
      role: req.session.adminRole ?? "national",
      displayName: req.session.adminDisplayName ?? "Operator",
      scope: {
        province: req.session.adminProvince ?? null,
        city: req.session.adminCity ?? null,
        suburb: req.session.adminSuburb ?? null,
        street: req.session.adminStreet ?? null,
      },
    });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

export default router;
