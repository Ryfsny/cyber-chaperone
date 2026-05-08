import { Router, type IRouter } from "express";
import nodemailer from "nodemailer";

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

router.post("/auth/login", (req, res): void => {
  const { password } = req.body as { password?: string };
  const operatorPassword = process.env["OPERATOR_PASSWORD"];

  if (!operatorPassword) {
    res.status(500).json({ error: "Server misconfiguration: OPERATOR_PASSWORD not set." });
    return;
  }

  if (!password || password !== operatorPassword) {
    res.status(401).json({ error: "Invalid password." });
    return;
  }

  req.session.authenticated = true;
  req.session.save((err) => {
    if (err) {
      res.status(500).json({ error: "Session error." });
      return;
    }
    res.json({ ok: true });
  });
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
    res.json({ authenticated: true });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

export default router;
