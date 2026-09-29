import mongoose from "mongoose";
import { Activity } from "../models/activity.model.js";
import { Issue } from "../models/issue.model.js";
import { Project } from "../models/project.model.js";

export async function listIssueActivity(request, response) {
  if (!mongoose.isValidObjectId(request.params.issueId)) {
    return response.status(404).json({
      success: false,
      message: "Issue not found"
    });
  }

  const issue = await Issue.findById(request.params.issueId).select("project");
  if (!issue) {
    return response.status(404).json({
      success: false,
      message: "Issue not found"
    });
  }

  const project = await Project.findOne({
    _id: issue.project,
    $or: [{ owner: request.user._id }, { members: request.user._id }]
  }).select("_id");

  if (!project) {
    return response.status(404).json({
      success: false,
      message: "Issue not found"
    });
  }

  const activities = await Activity.find({ issue: issue._id })
    .populate("actor", "_id name email")
    .sort({ createdAt: 1 });

  return response.status(200).json({
    success: true,
    data: { activities }
  });
}

