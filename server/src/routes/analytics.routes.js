import { Router } from "express";
import { getProjectAnalyticsResult } from "../controllers/analytics.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.get("/:projectId/analytics", getProjectAnalyticsResult);

export default router;
