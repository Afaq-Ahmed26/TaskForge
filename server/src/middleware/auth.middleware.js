import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { User } from "../models/user.model.js";

export async function requireAuth(request, response, next) {
  const authorization = request.get("authorization");
  const [scheme, token] = authorization?.split(" ") ?? [];

  if (scheme !== "Bearer" || !token) {
    return response.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  let payload;

  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    return response.status(401).json({
      success: false,
      message: "Invalid or expired authentication token"
    });
  }

  if (typeof payload !== "object" || !payload.sub) {
    return response.status(401).json({
      success: false,
      message: "Invalid authentication token"
    });
  }

  const user = await User.findById(payload.sub).select("_id name email");

  if (!user) {
    return response.status(401).json({
      success: false,
      message: "User no longer exists"
    });
  }

  request.user = user;
  return next();
}
