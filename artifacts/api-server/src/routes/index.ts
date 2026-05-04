import { Router, type IRouter } from "express";
import healthRouter from "./health";
import webhookRouter from "./webhook";
import tripsRouter from "./trips";
import aiRouter from "./ai";
import membersRouter from "./members";

const router: IRouter = Router();

router.use(healthRouter);
router.use(webhookRouter);
router.use(tripsRouter);
router.use(aiRouter);
router.use(membersRouter);

export default router;
