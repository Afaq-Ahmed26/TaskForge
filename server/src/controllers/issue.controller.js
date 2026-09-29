import mongoose from "mongoose";
import { Issue } from "../models/issue.model.js";
import { Project } from "../models/project.model.js";
import { recordActivity } from "../services/activity.service.js";

const statuses = new Set(["TODO", "IN_PROGRESS", "DONE"]);
const priorities = new Set(["LOW", "MEDIUM", "HIGH", "URGENT"]);

function isValidId(value) {
  return mongoose.isValidObjectId(value);
}

function hasProjectAccess(project, userId) {
  return (
    project.owner.toString() === userId.toString() ||
    project.members.some((memberId) => memberId.toString() === userId.toString())
  );
}

function isProjectMember(project, userId) {
  return (
    project.owner.toString() === userId.toString() ||
    project.members.some((memberId) => memberId.toString() === userId.toString())
  );
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isAllowedAssignee(project, assignee) {
  return assignee === null || isProjectMember(project, assignee);
}

async function findAccessibleProject(projectId, userId) {
  if (!isValidId(projectId)) {
    return null;
  }

  const project = await Project.findById(projectId).select("owner members");
  return project && hasProjectAccess(project, userId) ? project : null;
}

async function findAccessibleIssue(issueId, userId) {
  if (!isValidId(issueId)) {
    return null;
  }

  const issue = await Issue.findById(issueId);

  if (!issue) {
    return null;
  }

  const project = await findAccessibleProject(issue.project, userId);
  return project ? issue : null;
}

function validateOptionalIssueFields(body) {
  const { title, description, status, priority, labels, dueDate, assignee } = body;

  if (title !== undefined && (typeof title !== "string" || title.trim().length < 2)) {
    return "Issue title must be at least 2 characters long";
  }

  if (description !== undefined && typeof description !== "string") {
    return "Issue description must be a string";
  }

  if (status !== undefined && !statuses.has(status)) {
    return "Invalid issue status";
  }

  if (priority !== undefined && !priorities.has(priority)) {
    return "Invalid issue priority";
  }

  if (labels !== undefined && (!Array.isArray(labels) || labels.some((label) => typeof label !== "string"))) {
    return "Labels must be an array of strings";
  }

  if (dueDate !== undefined && dueDate !== null && Number.isNaN(Date.parse(dueDate))) {
    return "Due date must be a valid date";
  }

  if (assignee !== undefined && assignee !== null && !isValidId(assignee)) {
    return "Assignee must be a valid user ID";
  }

  return null;
}

function applyIssueFields(issue, body) {
  const { title, description, status, priority, labels, dueDate, assignee } = body;

  if (title !== undefined) issue.title = title.trim();
  if (description !== undefined) issue.description = description.trim();
  if (status !== undefined) issue.status = status;
  if (priority !== undefined) issue.priority = priority;
  if (labels !== undefined) issue.labels = labels.map((label) => label.trim()).filter(Boolean);
  if (dueDate !== undefined) issue.dueDate = dueDate;
  if (assignee !== undefined) issue.assignee = assignee;
}

function updateCompletedAt(issue, previousStatus = issue.status) {
  if (issue.status === "DONE" && previousStatus !== "DONE") {
    issue.completedAt = new Date();
  } else if (issue.status !== "DONE" && previousStatus === "DONE") {
    issue.completedAt = null;
  } else if (issue.status === "DONE" && !issue.completedAt) {
    issue.completedAt = new Date();
  }
}

async function populateIssue(issue) {
  await issue.populate([
    { path: "project", select: "name owner members" },
    { path: "creator", select: "_id name email" },
    { path: "assignee", select: "_id name email" }
  ]);

  return issue;
}

export async function listProjectIssues(request, response) {
  const project = await findAccessibleProject(
    request.params.projectId,
    request.user._id
  );

  if (!project) {
    return response.status(404).json({
      success: false,
      message: "Project not found"
    });
  }

  const { search, status, priority, assignee, label } = request.query;
  const query = { project: project._id };

  if (search) {
    query.$or = [
      { title: { $regex: escapeRegex(search), $options: "i" } },
      { description: { $regex: escapeRegex(search), $options: "i" } }
    ];
  }

  if (status) {
    if (!statuses.has(status)) {
      return response.status(400).json({
        success: false,
        message: "Invalid issue status"
      });
    }
    query.status = status;
  }

  if (priority) {
    if (!priorities.has(priority)) {
      return response.status(400).json({
        success: false,
        message: "Invalid issue priority"
      });
    }
    query.priority = priority;
  }

  if (assignee) {
    if (!isValidId(assignee)) {
      return response.status(400).json({
        success: false,
        message: "Assignee must be a valid user ID"
      });
    }
    query.assignee = assignee;
  }

  if (label) {
    query.labels = label;
  }

  const issues = await Issue.find(query)
    .populate("creator", "_id name email")
    .populate("assignee", "_id name email")
    .sort({ updatedAt: -1 });

  return response.status(200).json({
    success: true,
    data: { issues }
  });
}

export async function createIssue(request, response) {
  const project = await findAccessibleProject(
    request.params.projectId,
    request.user._id
  );

  if (!project) {
    return response.status(404).json({
      success: false,
      message: "Project not found"
    });
  }

  const validationMessage = validateOptionalIssueFields(request.body);
  if (validationMessage) {
    return response.status(400).json({
      success: false,
      message: validationMessage
    });
  }

  if (!isAllowedAssignee(project, request.body.assignee ?? null)) {
    return response.status(400).json({
      success: false,
      message: "Assignee must be a member of the project"
    });
  }

  const { title, description = "", status = "TODO", priority = "MEDIUM", labels = [], dueDate = null, assignee = null } = request.body;

  if (typeof title !== "string" || title.trim().length < 2) {
    return response.status(400).json({
      success: false,
      message: "Issue title must be at least 2 characters long"
    });
  }

  const issue = await Issue.create({
    title: title.trim(),
    description: description.trim(),
    status,
    priority,
    project: project._id,
    creator: request.user._id,
    assignee,
    labels: labels.map((label) => label.trim()).filter(Boolean),
    dueDate,
    completedAt: status === "DONE" ? new Date() : null
  });

  await recordActivity({
    issue: issue._id,
    actor: request.user._id,
    type: "ISSUE_CREATED"
  });
  await populateIssue(issue);

  return response.status(201).json({
    success: true,
    data: { issue }
  });
}

export async function getIssue(request, response) {
  const issue = await findAccessibleIssue(request.params.id, request.user._id);

  if (!issue) {
    return response.status(404).json({
      success: false,
      message: "Issue not found"
    });
  }

  await populateIssue(issue);

  return response.status(200).json({
    success: true,
    data: { issue }
  });
}

export async function updateIssue(request, response) {
  const issue = await findAccessibleIssue(request.params.id, request.user._id);

  if (!issue) {
    return response.status(404).json({
      success: false,
      message: "Issue not found"
    });
  }

  const validationMessage = validateOptionalIssueFields(request.body);
  if (validationMessage) {
    return response.status(400).json({
      success: false,
      message: validationMessage
    });
  }

  const project = await findAccessibleProject(issue.project, request.user._id);
  if (
    request.body.assignee !== undefined &&
    !isAllowedAssignee(project, request.body.assignee)
  ) {
    return response.status(400).json({
      success: false,
      message: "Assignee must be a member of the project"
    });
  }

  const previousStatus = issue.status;
  const previousPriority = issue.priority;
  const previousAssignee = issue.assignee?.toString() ?? null;
  applyIssueFields(issue, request.body);
  updateCompletedAt(issue, previousStatus);
  await issue.save();

  if (request.body.status !== undefined && previousStatus !== issue.status) {
    await recordActivity({
      issue: issue._id,
      actor: request.user._id,
      type: "STATUS_CHANGED",
      details: { from: previousStatus, to: issue.status }
    });
  }

  if (request.body.priority !== undefined && previousPriority !== issue.priority) {
    await recordActivity({
      issue: issue._id,
      actor: request.user._id,
      type: "PRIORITY_CHANGED",
      details: { from: previousPriority, to: issue.priority }
    });
  }

  if (
    request.body.assignee !== undefined &&
    previousAssignee !== (issue.assignee?.toString() ?? null)
  ) {
    await recordActivity({
      issue: issue._id,
      actor: request.user._id,
      type: "ASSIGNED",
      details: { from: previousAssignee, to: issue.assignee }
    });
  }

  await populateIssue(issue);

  return response.status(200).json({
    success: true,
    data: { issue }
  });
}

export async function deleteIssue(request, response) {
  const issue = await findAccessibleIssue(request.params.id, request.user._id);

  if (!issue) {
    return response.status(404).json({
      success: false,
      message: "Issue not found"
    });
  }

  await issue.deleteOne();

  return response.status(200).json({
    success: true,
    message: "Issue deleted"
  });
}

export async function changeIssueStatus(request, response) {
  return updateSingleIssueField(request, response, "status", statuses, "status");
}

export async function changeIssuePriority(request, response) {
  return updateSingleIssueField(request, response, "priority", priorities, "priority");
}

async function updateSingleIssueField(request, response, field, allowedValues, label) {
  const issue = await findAccessibleIssue(request.params.id, request.user._id);

  if (!issue) {
    return response.status(404).json({
      success: false,
      message: "Issue not found"
    });
  }

  const value = request.body[field];
  if (!allowedValues.has(value)) {
    return response.status(400).json({
      success: false,
      message: `Invalid issue ${label}`
    });
  }

  const previousValue = issue[field];
  issue[field] = value;
  if (field === "status") {
    updateCompletedAt(issue, previousValue);
  }
  await issue.save();

  if (previousValue !== value) {
    await recordActivity({
      issue: issue._id,
      actor: request.user._id,
      type: field === "status" ? "STATUS_CHANGED" : "PRIORITY_CHANGED",
      details: { from: previousValue, to: value }
    });
  }

  await populateIssue(issue);

  return response.status(200).json({
    success: true,
    data: { issue }
  });
}
