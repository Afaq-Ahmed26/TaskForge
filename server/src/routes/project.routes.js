import { Router } from "express";
import { getProjectDashboard } from "../controllers/dashboard.controller.js";
import {
  addMember,
  createProject,
  deleteProject,
  getProject,
  listProjects,
  removeMember,
  updateProject
} from "../controllers/project.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.get("/", listProjects);
router.post("/", createProject);
router.get("/:projectId/dashboard", getProjectDashboard);
router.get("/:id", getProject);
router.put("/:id", updateProject);
router.delete("/:id", deleteProject);
router.post("/:projectId/members", addMember);
router.delete("/:projectId/members/:userId", removeMember);

export default router;
