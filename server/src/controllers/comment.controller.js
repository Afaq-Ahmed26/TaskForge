import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Issue } from "../models/issue.model.js";
import { Project } from "../models/project.model.js";
import { recordActivity } from "../services/activity.service.js";

function isValidId(value) {
  return mongoose.isValidObjectId(value);
}

async function findAccessibleIssue(issueId, userId) {
  if (!isValidId(issueId)) {
    return null;
  }

  const issue = await Issue.findById(issueId).select("project");
  if (!issue) {
    return null;
  }

  const project = await Project.findOne({
    _id: issue.project,
    $or: [{ owner: userId }, { members: userId }]
  }).select("_id");

  return project ? issue : null;
}

async function findOwnedComment(commentId, userId) {
  if (!isValidId(commentId)) {
    return null;
  }

  return Comment.findOne({
    _id: commentId,
    author: userId
  });
}

async function populateComment(comment) {
  await comment.populate([
    { path: "author", select: "_id name email" },
    { path: "issue", select: "_id title project" }
  ]);

  return comment;
}

export async function listComments(request, response) {
  const issue = await findAccessibleIssue(
    request.params.issueId,
    request.user._id
  );

  if (!issue) {
    return response.status(404).json({
      success: false,
      message: "Issue not found"
    });
  }

  const comments = await Comment.find({ issue: issue._id })
    .populate("author", "_id name email")
    .sort({ createdAt: 1 });

  return response.status(200).json({
    success: true,
    data: { comments }
  });
}

export async function createComment(request, response) {
  const issue = await findAccessibleIssue(
    request.params.issueId,
    request.user._id
  );
  const { text } = request.body;

  if (!issue) {
    return response.status(404).json({
      success: false,
      message: "Issue not found"
    });
  }

  if (typeof text !== "string" || text.trim().length === 0) {
    return response.status(400).json({
      success: false,
      message: "Comment text is required"
    });
  }

  const comment = await Comment.create({
    issue: issue._id,
    author: request.user._id,
    text: text.trim()
  });

  await recordActivity({
    issue: issue._id,
    actor: request.user._id,
    type: "COMMENT_ADDED",
    details: { commentId: comment._id }
  });
  await populateComment(comment);

  return response.status(201).json({
    success: true,
    data: { comment }
  });
}

export async function updateComment(request, response) {
  const comment = await findOwnedComment(
    request.params.id,
    request.user._id
  );
  const { text } = request.body;

  if (!comment) {
    return response.status(404).json({
      success: false,
      message: "Comment not found"
    });
  }

  if (typeof text !== "string" || text.trim().length === 0) {
    return response.status(400).json({
      success: false,
      message: "Comment text is required"
    });
  }

  comment.text = text.trim();
  await comment.save();
  await populateComment(comment);

  return response.status(200).json({
    success: true,
    data: { comment }
  });
}

export async function deleteComment(request, response) {
  const comment = await findOwnedComment(
    request.params.id,
    request.user._id
  );

  if (!comment) {
    return response.status(404).json({
      success: false,
      message: "Comment not found"
    });
  }

  await comment.deleteOne();

  return response.status(200).json({
    success: true,
    message: "Comment deleted"
  });
}
