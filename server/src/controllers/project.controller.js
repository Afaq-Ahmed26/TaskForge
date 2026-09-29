import mongoose from "mongoose";
import { Project } from "../models/project.model.js";
import { User } from "../models/user.model.js";

function isValidId(value) {
  return mongoose.isValidObjectId(value);
}

function projectQueryForUser(userId) {
  return {
    $or: [{ owner: userId }, { members: userId }]
  };
}

async function findAccessibleProject(projectId, userId) {
  if (!isValidId(projectId)) {
    return null;
  }

  return Project.findOne({
    _id: projectId,
    ...projectQueryForUser(userId)
  });
}

export async function listProjects(request, response) {
  const projects = await Project.find(projectQueryForUser(request.user._id))
    .populate("owner", "_id name email")
    .populate("members", "_id name email")
    .sort({ updatedAt: -1 });

  return response.status(200).json({
    success: true,
    data: { projects }
  });
}

export async function createProject(request, response) {
  const { name, description = "" } = request.body;

  if (typeof name !== "string" || name.trim().length < 2) {
    return response.status(400).json({
      success: false,
      message: "Project name must be at least 2 characters long"
    });
  }

  if (typeof description !== "string") {
    return response.status(400).json({
      success: false,
      message: "Project description must be a string"
    });
  }

  const project = await Project.create({
    name: name.trim(),
    description: description.trim(),
    owner: request.user._id,
    members: [request.user._id]
  });

  return response.status(201).json({
    success: true,
    data: { project }
  });
}

export async function getProject(request, response) {
  const project = await findAccessibleProject(
    request.params.id,
    request.user._id
  );

  if (!project) {
    return response.status(404).json({
      success: false,
      message: "Project not found"
    });
  }

  await project.populate("owner", "_id name email");
  await project.populate("members", "_id name email");

  return response.status(200).json({
    success: true,
    data: { project }
  });
}

export async function updateProject(request, response) {
  const { name, description } = request.body;
  const project = await findAccessibleProject(
    request.params.id,
    request.user._id
  );

  if (!project) {
    return response.status(404).json({
      success: false,
      message: "Project not found"
    });
  }

  if (project.owner.toString() !== request.user._id.toString()) {
    return response.status(403).json({
      success: false,
      message: "Only the project owner can update this project"
    });
  }

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length < 2) {
      return response.status(400).json({
        success: false,
        message: "Project name must be at least 2 characters long"
      });
    }

    project.name = name.trim();
  }

  if (description !== undefined) {
    if (typeof description !== "string") {
      return response.status(400).json({
        success: false,
        message: "Project description must be a string"
      });
    }

    project.description = description.trim();
  }

  await project.save();

  return response.status(200).json({
    success: true,
    data: { project }
  });
}

export async function deleteProject(request, response) {
  const project = await findAccessibleProject(
    request.params.id,
    request.user._id
  );

  if (!project) {
    return response.status(404).json({
      success: false,
      message: "Project not found"
    });
  }

  if (project.owner.toString() !== request.user._id.toString()) {
    return response.status(403).json({
      success: false,
      message: "Only the project owner can delete this project"
    });
  }

  await project.deleteOne();

  return response.status(200).json({
    success: true,
    message: "Project deleted"
  });
}

export async function addMember(request, response) {
  const project = await findAccessibleProject(
    request.params.projectId,
    request.user._id
  );
  const { userId } = request.body;

  if (!project) {
    return response.status(404).json({
      success: false,
      message: "Project not found"
    });
  }

  if (project.owner.toString() !== request.user._id.toString()) {
    return response.status(403).json({
      success: false,
      message: "Only the project owner can manage members"
    });
  }

  if (!isValidId(userId)) {
    return response.status(400).json({
      success: false,
      message: "A valid userId is required"
    });
  }

  const user = await User.findById(userId).select("_id name email");

  if (!user) {
    return response.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  if (!project.members.some((memberId) => memberId.toString() === userId)) {
    project.members.push(user._id);
    await project.save();
  }

  await project.populate("members", "_id name email");

  return response.status(200).json({
    success: true,
    data: { project }
  });
}

export async function removeMember(request, response) {
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

  if (project.owner._id.toString() !== request.user._id.toString()) {
    return response.status(403).json({
      success: false,
      message: "Only the project owner can manage members"
    });
  }

  if (!isValidId(request.params.userId)) {
    return response.status(400).json({
      success: false,
      message: "A valid userId is required"
    });
  }

  if (request.params.userId === request.user._id.toString()) {
    return response.status(400).json({
      success: false,
      message: "The project owner cannot remove themselves"
    });
  }

  project.members = project.members.filter(
    (memberId) => memberId.toString() !== request.params.userId
  );
  await project.save();

  return response.status(200).json({
    success: true,
    data: { project }
  });
}
