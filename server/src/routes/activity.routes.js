import { Router } from "express";
import { listIssueActivity } from "../controllers/activity.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.get("/:issueId/activity", listIssueActivity);

export default router;
