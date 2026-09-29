import { Router } from "express";
import {
  createComment,
  deleteComment,
  listComments,
  updateComment
} from "../controllers/comment.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.get("/issues/:issueId/comments", listComments);
router.post("/issues/:issueId/comments", createComment);
router.put("/comments/:id", updateComment);
router.delete("/comments/:id", deleteComment);

export default router;
