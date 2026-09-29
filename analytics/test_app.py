import unittest
from datetime import datetime, timedelta, timezone

from pydantic import ValidationError

from app import ProjectAnalyticsRequest, project_analytics


class AnalyticsTests(unittest.TestCase):
    def test_calculates_completion_and_average_time(self):
        result = project_analytics(
            ProjectAnalyticsRequest(
                projectId="project-id",
                issues=[
                    {
                        "status": "DONE",
                        "priority": "HIGH",
                        "createdAt": datetime(2026, 9, 30, 0, 0),
                        "completedAt": datetime(2026, 9, 30, 2, 0),
                    },
                    {"status": "TODO", "priority": "MEDIUM"},
                ],
            )
        )

        data = result["data"]
        self.assertEqual(data["source"], "fastapi")
        self.assertEqual(data["completionRate"], 50)
        self.assertEqual(data["completedIssues"], 1)
        self.assertEqual(data["averageCompletionTime"], 0.08)
        self.assertEqual(data["priorityDistribution"], {"HIGH": 1, "MEDIUM": 1})

    def test_counts_only_incomplete_overdue_issues(self):
        result = project_analytics(
            ProjectAnalyticsRequest(
                projectId="project-id",
                issues=[
                    {
                        "status": "TODO",
                        "priority": "LOW",
                        "dueDate": datetime.now(timezone.utc) - timedelta(days=1),
                    },
                    {
                        "status": "DONE",
                        "priority": "LOW",
                        "dueDate": datetime.now(timezone.utc) - timedelta(days=1),
                    },
                ],
            )
        )

        self.assertEqual(result["data"]["overdueIssues"], 1)

    def test_empty_project_returns_zero_metrics(self):
        result = project_analytics(ProjectAnalyticsRequest(projectId="project-id"))

        self.assertEqual(result["data"]["totalIssues"], 0)
        self.assertEqual(result["data"]["completionRate"], 0)
        self.assertIsNone(result["data"]["averageCompletionTime"])

    def test_project_id_is_required(self):
        with self.assertRaises(ValidationError):
            ProjectAnalyticsRequest(projectId="")


if __name__ == "__main__":
    unittest.main()
