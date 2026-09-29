import mongoose from "mongoose";
import { User } from "../models/user.model.js";

export async function listUsers(_request, response) {
  const users = await User.find({})
    .select("_id name email")
    .sort({ name: 1 });

  return response.status(200).json({
    success: true,
    data: { users }
  });
}

export async function getUser(request, response) {
  if (!mongoose.isValidObjectId(request.params.id)) {
    return response.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  const user = await User.findById(request.params.id).select("_id name email");

  if (!user) {
    return response.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  return response.status(200).json({
    success: true,
    data: { user }
  });
}

