import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { config } from "../src/config/env.js";
import {
  AnalyticsServiceError,
  getProjectAnalytics
} from "../src/services/analytics.service.js";

const originalFetch = globalThis.fetch;
const originalTimeout = config.analyticsTimeoutMs;

afterEach(() => {
  globalThis.fetch = originalFetch;
  config.analyticsTimeoutMs = originalTimeout;
});

function issue(overrides = {}) {
  return {
    status: "DONE",
    priority: "HIGH",
    dueDate: null,
    createdAt: new Date("2026-09-30T00:00:00.000Z"),
    completedAt: new Date("2026-09-30T02:00:00.000Z"),
    ...overrides
  };
}

test("sends normalized issue data and returns FastAPI analytics", async () => {
  let requestBody;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return Response.json({
      success: true,
      data: {
        source: "fastapi",
        projectId: "project-id",
        completionRate: 100,
        totalIssues: 1,
        completedIssues: 1,
        overdueIssues: 0,
        averageCompletionTime: 0.08,
        priorityDistribution: { HIGH: 1 }
      }
    });
  };

  const result = await getProjectAnalytics([issue()], "project-id");

  assert.deepEqual(requestBody, {
    projectId: "project-id",
    issues: [
      {
        status: "DONE",
        priority: "HIGH",
        dueDate: null,
        createdAt: "2026-09-30T00:00:00.000Z",
        completedAt: "2026-09-30T02:00:00.000Z"
      }
    ]
  });
  assert.equal(result.source, "fastapi");
  assert.equal(result.completionRate, 100);
});

test("maps unavailable FastAPI responses to 502", async () => {
  globalThis.fetch = async () => {
    throw new Error("connection refused");
  };

  await assert.rejects(
    getProjectAnalytics([issue()], "project-id"),
    (error) =>
      error instanceof AnalyticsServiceError &&
      error.statusCode === 502 &&
      error.message === "Analytics service unavailable"
  );
});

test("maps FastAPI timeouts to 504", async () => {
  config.analyticsTimeoutMs = 10;
  globalThis.fetch = (_url, options) =>
    new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      });
    });

  await assert.rejects(
    getProjectAnalytics([issue()], "project-id"),
    (error) =>
      error instanceof AnalyticsServiceError &&
      error.statusCode === 504 &&
      error.message === "Analytics service timed out"
  );
});

test("rejects malformed FastAPI data with 502", async () => {
  globalThis.fetch = async () =>
    Response.json({ success: true, data: { projectId: "project-id" } });

  await assert.rejects(
    getProjectAnalytics([issue()], "project-id"),
    (error) =>
      error instanceof AnalyticsServiceError &&
      error.statusCode === 502 &&
      error.message === "Analytics service returned invalid data"
  );
});
