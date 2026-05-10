import { Router, type IRouter } from "express";
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
import { requireAuth } from "../middleware/require-auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(webhookRouter);
router.use(authRouter);
router.use(registerRouter);

router.use(requireAuth);

router.use(tripsRouter);
router.use(aiRouter);
router.use(membersRouter);
router.use(respondersRouter);
router.use(caseRouter);
router.use(broadcastRouter);

export default router;
