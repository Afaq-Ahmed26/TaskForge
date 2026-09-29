import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { User } from "../models/user.model.js";

function createToken(userId) {
  return jwt.sign({}, config.jwtSecret, {
    subject: userId.toString(),
    expiresIn: "1d"
  });
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email
  };
}

export async function register(request, response) {
  const { name, email, password } = request.body;

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    return response.status(400).json({
      success: false,
      message: "Name, email, and password are required"
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return response.status(400).json({
      success: false,
      message: "A valid email is required"
    });
  }

  if (password.length < 8) {
    return response.status(400).json({
      success: false,
      message: "Password must be at least 8 characters long"
    });
  }

  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    return response.status(409).json({
      success: false,
      message: "Email is already registered"
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash
  });

  return response.status(201).json({
    success: true,
    data: {
      token: createToken(user._id),
      user: publicUser(user)
    }
  });
}

export async function login(request, response) {
  const { email, password } = request.body;

  if (typeof email !== "string" || typeof password !== "string") {
    return response.status(400).json({
      success: false,
      message: "Email and password are required"
    });
  }

  const user = await User.findOne({
    email: email.trim().toLowerCase()
  }).select("+passwordHash");

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return response.status(401).json({
      success: false,
      message: "Invalid email or password"
    });
  }

  return response.status(200).json({
    success: true,
    data: {
      token: createToken(user._id),
      user: publicUser(user)
    }
  });
}

export function getCurrentUser(request, response) {
  return response.status(200).json({
    success: true,
    data: {
      user: publicUser(request.user)
    }
  });
}

export function logout(_request, response) {
  return response.status(200).json({
    success: true,
    message: "Logout complete. Remove the token from the client."
  });
}
