import { Router } from "express";
import {
  changeIssuePriority,
  changeIssueStatus,
  createIssue,
  deleteIssue,
  getIssue,
  listProjectIssues,
  updateIssue
} from "../controllers/issue.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.get("/:projectId/issues", listProjectIssues);
router.post("/:projectId/issues", createIssue);
router.get("/:id", getIssue);
router.put("/:id", updateIssue);
router.patch("/:id/status", changeIssueStatus);
router.patch("/:id/priority", changeIssuePriority);
router.delete("/:id", deleteIssue);

export default router;
