import { Router, type IRouter } from "express";
import healthRouter from "./health";
import webhookRouter from "./webhook";
import tripsRouter from "./trips";
import aiRouter from "./ai";
import membersRouter from "./members";
import respondersRouter from "./responders";

const router: IRouter = Router();

router.use(healthRouter);
router.use(webhookRouter);
router.use(tripsRouter);
router.use(aiRouter);
router.use(membersRouter);
router.use(respondersRouter);

export default router;
