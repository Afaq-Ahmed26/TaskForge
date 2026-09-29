import mongoose from "mongoose";
import { Issue } from "../models/issue.model.js";
import { Project } from "../models/project.model.js";
import { getProjectAnalytics } from "../services/analytics.service.js";

export async function getProjectAnalyticsResult(request, response) {
  const { projectId } = request.params;

  if (!mongoose.isValidObjectId(projectId)) {
    return response.status(404).json({
      success: false,
      message: "Project not found"
    });
  }

  const project = await Project.findOne({
    _id: projectId,
    $or: [{ owner: request.user._id }, { members: request.user._id }]
  }).select("_id");

  if (!project) {
    return response.status(404).json({
      success: false,
      message: "Project not found"
    });
  }

  const issues = await Issue.find({ project: project._id }).select(
    "status priority dueDate createdAt completedAt"
  );
  const analytics = await getProjectAnalytics(issues, project._id);

  return response.status(200).json({
    success: true,
    data: { analytics }
  });
}
