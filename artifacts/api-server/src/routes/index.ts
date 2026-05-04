import { Router, type IRouter } from "express";
import healthRouter from "./health";
import webhookRouter from "./webhook";
import tripsRouter from "./trips";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(webhookRouter);
router.use(tripsRouter);
router.use(aiRouter);

export default router;
