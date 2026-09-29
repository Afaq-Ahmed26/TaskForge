import "dotenv/config";

const port = Number(process.env.PORT) || 5000;
const mongoUri = process.env.MONGODB_URI;
const jwtSecret = process.env.JWT_SECRET;
const analyticsServiceUrl =
  process.env.ANALYTICS_SERVICE_URL || "http://127.0.0.1:8000";
const analyticsTimeoutMs = Number(process.env.ANALYTICS_TIMEOUT_MS) || 3000;

if (!mongoUri) {
  throw new Error("MONGODB_URI is required");
}

if (!jwtSecret) {
  throw new Error("JWT_SECRET is required");
}

export const config = {
  mongoUri,
  port,
  jwtSecret,
  analyticsServiceUrl,
  analyticsTimeoutMs
};
