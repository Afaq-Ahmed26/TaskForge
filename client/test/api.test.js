import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  createIssue,
  getProjectIssues,
  loginUser
} from "../src/services/api.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("loginUser sends credentials to the login endpoint", async () => {
  let capturedRequest;

  globalThis.fetch = async (url, options) => {
    capturedRequest = { url, options };
    return new Response(
      JSON.stringify({
        success: true,
        data: { token: "test-token", user: { id: "user-id" } }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  const result = await loginUser({
    email: "test@example.com",
    password: "Password123!"
  });

  assert.equal(capturedRequest.url, "http://localhost:5000/api/auth/login");
  assert.equal(capturedRequest.options.method, "POST");
  assert.equal(capturedRequest.options.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(capturedRequest.options.body), {
    email: "test@example.com",
    password: "Password123!"
  });
  assert.equal(result.data.token, "test-token");
});

test("getProjectIssues includes filters and bearer authentication", async () => {
  let capturedRequest;

  globalThis.fetch = async (url, options) => {
    capturedRequest = { url, options };
    return new Response(
      JSON.stringify({ success: true, data: { issues: [] } }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  await getProjectIssues("token-value", "project-id", {
    search: "login UI",
    status: "TODO"
  });

  assert.equal(
    capturedRequest.url,
    "http://localhost:5000/api/projects/project-id/issues?search=login+UI&status=TODO"
  );
  assert.equal(
    capturedRequest.options.headers.Authorization,
    "Bearer token-value"
  );
});

test("createIssue exposes API error messages", async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        success: false,
        message: "Issue title is required"
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );

  await assert.rejects(
    createIssue("token-value", "project-id", { title: "" }),
    { message: "Issue title is required" }
  );
});

