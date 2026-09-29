import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import mongoose from "mongoose";
import app from "../src/app.js";
import { config } from "../src/config/env.js";
import { Activity } from "../src/models/activity.model.js";
import { Comment } from "../src/models/comment.model.js";
import { Issue } from "../src/models/issue.model.js";
import { Project } from "../src/models/project.model.js";
import { User } from "../src/models/user.model.js";

let server;
let token;
let projectId;
let issueId;
let userId;
const testEmail = `api-test-${Date.now()}@example.com`;

async function request(path, options = {}) {
  const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const body = await response.json();
  return { response, body };
}

before(async () => {
  await mongoose.connect(config.mongoUri);
  server = app.listen(0);
});

after(async () => {
  await Activity.deleteMany({ actor: userId });
  await Comment.deleteMany({ author: userId });
  await Issue.deleteMany({ creator: userId });
  await Project.deleteMany({ owner: userId });
  await User.deleteOne({ _id: userId });
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
  await mongoose.disconnect();
});

test("health endpoint is public", async () => {
  const { response, body } = await request("/api/health");

  assert.equal(response.status, 200);
  assert.equal(body.data.status, "ok");
});

test("registers a user and returns a token", async () => {
  const { response, body } = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: "API Test User",
      email: testEmail,
      password: "ApiTest123!"
    })
  });

  assert.equal(response.status, 201);
  assert.ok(body.data.token);
  assert.equal(body.data.user.email, testEmail);
  token = body.data.token;
  userId = body.data.user.id;
});

test("creates a project and issue", async () => {
  const projectResult = await request("/api/projects", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: "API Test Project" })
  });
  assert.equal(projectResult.response.status, 201);
  projectId = projectResult.body.data.project._id;

  const issueResult = await request(`/api/projects/${projectId}/issues`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      title: "API test issue",
      priority: "HIGH"
    })
  });
  assert.equal(issueResult.response.status, 201);
  issueId = issueResult.body.data.issue._id;
});

test("updates issue status and returns dashboard statistics", async () => {
  const statusResult = await request(`/api/issues/${issueId}/status`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status: "DONE" })
  });
  assert.equal(statusResult.response.status, 200);

  const dashboardResult = await request(`/api/projects/${projectId}/dashboard`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(dashboardResult.response.status, 200);
  assert.equal(dashboardResult.body.data.completedIssues, 1);
  assert.equal(dashboardResult.body.data.completionRate, 100);
});

test("creates a comment and records activity", async () => {
  const commentResult = await request(`/api/issues/${issueId}/comments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ text: "API test comment" })
  });
  assert.equal(commentResult.response.status, 201);

  const activityResult = await request(`/api/issues/${issueId}/activity`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  assert.equal(activityResult.response.status, 200);
  assert.ok(
    activityResult.body.data.activities.some(
      (activity) => activity.type === "COMMENT_ADDED"
    )
  );
});
