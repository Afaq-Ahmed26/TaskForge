import mongoose from "mongoose";
import { Issue } from "../models/issue.model.js";
import { Project } from "../models/project.model.js";

export async function getProjectDashboard(request, response) {
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

  const projectFilter = { project: project._id };
  const now = new Date();

  const [
    totalIssues,
    todoIssues,
    inProgressIssues,
    completedIssues,
    highPriorityIssues,
    urgentIssues,
    overdueIssues,
    priorityDistribution
  ] = await Promise.all([
    Issue.countDocuments(projectFilter),
    Issue.countDocuments({ ...projectFilter, status: "TODO" }),
    Issue.countDocuments({ ...projectFilter, status: "IN_PROGRESS" }),
    Issue.countDocuments({ ...projectFilter, status: "DONE" }),
    Issue.countDocuments({ ...projectFilter, priority: "HIGH" }),
    Issue.countDocuments({ ...projectFilter, priority: "URGENT" }),
    Issue.countDocuments({
      ...projectFilter,
      status: { $ne: "DONE" },
      dueDate: { $ne: null, $lt: now }
    }),
    Issue.aggregate([
      { $match: projectFilter },
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])
  ]);

  const completionRate =
    totalIssues === 0 ? 0 : Number(((completedIssues / totalIssues) * 100).toFixed(2));

  return response.status(200).json({
    success: true,
    data: {
      totalIssues,
      todoIssues,
      inProgressIssues,
      completedIssues,
      highPriorityIssues,
      urgentIssues,
      overdueIssues,
      completionRate,
      priorityDistribution: priorityDistribution.map(({ _id, count }) => ({
        priority: _id,
        count
      }))
    }
  });
}

