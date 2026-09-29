import "dotenv/config";

const port = Number(process.env.PORT) || 5000;
const mongoUri = process.env.MONGODB_URI;
const jwtSecret = process.env.JWT_SECRET;

if (!mongoUri) {
  throw new Error("MONGODB_URI is required");
}

if (!jwtSecret) {
  throw new Error("JWT_SECRET is required");
}

export const config = {
  mongoUri,
  port,
  jwtSecret
};
