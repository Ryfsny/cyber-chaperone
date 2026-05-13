import { Router, type IRouter } from "express";
import path from "path";
import { fileURLToPath } from "url";
import healthRouter from "./health";
import webhookRouter from "./webhook";
import facebookWebhookRouter from "./facebook-webhook";
import tripsRouter from "./trips";
import aiRouter from "./ai";
import membersRouter from "./members";
import respondersRouter from "./responders";
import caseRouter from "./case";
import authRouter from "./auth";
import registerRouter from "./register";
import broadcastRouter from "./broadcast";
import conversationsRouter from "./conversations";
import arnieChatRouter from "./arnie-chat";
import memberPortalRouter from "./member-portal";
import paystackRouter from "./paystack";
import paystackAdminRouter from "./paystack-admin";
import adminImportRouter from "./admin-import";
import { requireAuth } from "../middleware/require-auth";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router: IRouter = Router();

// ── Public routes (no auth required) ─────────────────────────────────────────
router.use(healthRouter);
router.use(webhookRouter);            // Twilio WhatsApp webhook
router.use(facebookWebhookRouter);    // Facebook Messenger webhook
router.use(authRouter);
router.use(registerRouter);      // Member self-registration
router.use(arnieChatRouter);
router.use(memberPortalRouter);  // Member portal (JWT-based, self-auth)
router.use(paystackRouter);      // Paystack webhook + payment-link only
router.use(adminImportRouter);   // TEMPORARY — prod data migration (remove after use)

router.get("/flow-diagram", (_req, res) => {
  res.sendFile(path.resolve(__dirname, "flow-diagram.html"));
});

// ── Protected routes (operator session required) ──────────────────────────────
router.use(requireAuth);

router.use(tripsRouter);
router.use(aiRouter);
router.use(membersRouter);
router.use(respondersRouter);
router.use(caseRouter);
router.use(broadcastRouter);
router.use(conversationsRouter);
router.use(paystackAdminRouter);  // Paystack sync + status (operator only)

export default router;
