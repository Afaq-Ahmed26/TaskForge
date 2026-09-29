import { config } from "../config/env.js";

export class AnalyticsServiceError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = "AnalyticsServiceError";
    this.statusCode = statusCode;
  }
}

function isValidAnalyticsResponse(body) {
  const data = body?.data;
  return (
    body?.success === true &&
    data?.source === "fastapi" &&
    typeof data?.projectId === "string" &&
    typeof data?.completionRate === "number" &&
    typeof data?.totalIssues === "number" &&
    typeof data?.completedIssues === "number" &&
    typeof data?.overdueIssues === "number" &&
    (data.averageCompletionTime === null ||
      typeof data.averageCompletionTime === "number") &&
    data.priorityDistribution &&
    typeof data.priorityDistribution === "object"
  );
}

function serializeIssue(issue) {
  return {
    status: issue.status,
    priority: issue.priority,
    dueDate: issue.dueDate?.toISOString() ?? null,
    createdAt: issue.createdAt?.toISOString() ?? null,
    completedAt: issue.completedAt?.toISOString() ?? null
  };
}

export async function getProjectAnalytics(issues, projectId) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    config.analyticsTimeoutMs
  );

  try {
    let response;

    try {
      response = await fetch(`${config.analyticsServiceUrl}/analytics/project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: projectId.toString(),
          issues: issues.map(serializeIssue)
        }),
        signal: controller.signal
      });
    } catch (error) {
      if (error.name === "AbortError") {
        throw new AnalyticsServiceError(
          "Analytics service timed out",
          504
        );
      }

      throw new AnalyticsServiceError("Analytics service unavailable", 502);
    }

    if (!response.ok) {
      throw new AnalyticsServiceError("Analytics service returned an error", 502);
    }

    let body;
    try {
      body = await response.json();
    } catch {
      throw new AnalyticsServiceError(
        "Analytics service returned invalid data",
        502
      );
    }

    if (!isValidAnalyticsResponse(body)) {
      throw new AnalyticsServiceError(
        "Analytics service returned invalid data",
        502
      );
    }

    return body.data;
  } finally {
    clearTimeout(timeout);
  }
}
