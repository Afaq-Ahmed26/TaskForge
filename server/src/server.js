import app from "./app.js";
import { connectDatabase } from "./config/database.js";
import { config } from "./config/env.js";

async function startServer() {
  try {
    await connectDatabase(config.mongoUri);

    app.listen(config.port, () => {
      console.log(`TaskForge server listening on port ${config.port}`);
    });
  } catch (error) {
    console.error("Failed to start TaskForge server", error);
    process.exitCode = 1;
  }
}

startServer();
