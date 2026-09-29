import express from "express";
import activityRoutes from "./routes/activity.routes.js";
import authRoutes from "./routes/auth.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import issueRoutes from "./routes/issue.routes.js";
import projectRoutes from "./routes/project.routes.js";
import userRoutes from "./routes/user.routes.js";

const app = express();

app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.status(200).json({
    success: true,
    data: {
      service: "taskforge-server",
      status: "ok"
    }
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/projects", issueRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api", commentRoutes);
app.use("/api/issues", activityRoutes);
app.use("/api/users", userRoutes);

app.use((_request, response) => {
  response.status(404).json({
    success: false,
    message: "Route not found"
  });
});

app.use((error, _request, response, _next) => {
  console.error(error);

  response.status(500).json({
    success: false,
    message: "Internal server error"
  });
});

export default app;
