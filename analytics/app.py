from collections import Counter
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="TaskForge Analytics")


class Issue(BaseModel):
    status: str
    priority: str
    dueDate: datetime | None = None
    createdAt: datetime | None = None
    completedAt: datetime | None = None


class ProjectAnalyticsRequest(BaseModel):
    projectId: str = Field(min_length=1)
    issues: list[Issue] = Field(default_factory=list)


def as_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value


@app.get("/health")
def health() -> dict[str, Any]:
    return {"success": True, "data": {"service": "taskforge-analytics", "status": "ok"}}


@app.post("/analytics/project")
def project_analytics(payload: ProjectAnalyticsRequest) -> dict[str, Any]:
    issues = payload.issues
    completed_issues = [issue for issue in issues if issue.status == "DONE"]
    now = datetime.now(timezone.utc)
    overdue_issues = [
        issue
        for issue in issues
        if issue.status != "DONE"
        and issue.dueDate
        and as_utc(issue.dueDate) < now
    ]

    completion_rate = (
        round((len(completed_issues) / len(issues)) * 100, 2)
        if issues
        else 0
    )
    completion_times = [
        (
            as_utc(issue.completedAt) - as_utc(issue.createdAt)
        ).total_seconds()
        / 86400
        for issue in completed_issues
        if issue.createdAt and issue.completedAt
    ]
    average_completion_time = (
        round(sum(completion_times) / len(completion_times), 2)
        if completion_times
        else None
    )

    return {
        "success": True,
        "data": {
            "source": "fastapi",
            "projectId": payload.projectId,
            "completionRate": completion_rate,
            "totalIssues": len(issues),
            "completedIssues": len(completed_issues),
            "overdueIssues": len(overdue_issues),
            "averageCompletionTime": average_completion_time,
            "priorityDistribution": dict(Counter(issue.priority for issue in issues)),
        },
    }
