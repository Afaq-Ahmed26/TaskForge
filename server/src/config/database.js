import mongoose from "mongoose";

export async function connectDatabase(mongoUri) {
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB");
}

