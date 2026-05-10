import { Router, type IRouter } from "express";
import path from "path";
import { fileURLToPath } from "url";
import healthRouter from "./health";
import webhookRouter from "./webhook";
import tripsRouter from "./trips";
import aiRouter from "./ai";
import membersRouter from "./members";
import respondersRouter from "./responders";
import caseRouter from "./case";
import authRouter from "./auth";
import registerRouter from "./register";
import broadcastRouter from "./broadcast";
import arnieChatRouter from "./arnie-chat";
import memberPortalRouter from "./member-portal";
import { requireAuth } from "../middleware/require-auth";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router: IRouter = Router();

router.use(healthRouter);
router.use(webhookRouter);
router.use(authRouter);
router.use(registerRouter);
router.use(arnieChatRouter);
router.use(memberPortalRouter);

router.get("/flow-diagram", (_req, res) => {
  res.sendFile(path.resolve(__dirname, "flow-diagram.html"));
});

router.use(requireAuth);

router.use(tripsRouter);
router.use(aiRouter);
router.use(membersRouter);
router.use(respondersRouter);
router.use(caseRouter);
router.use(broadcastRouter);

export default router;
