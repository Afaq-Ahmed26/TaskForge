const apiUrl =
  import.meta.env?.VITE_API_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.message || "Request failed");
  }

  return body;
}

export async function getHealth() {
  return request("/health");
}

export async function registerUser(data) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function loginUser(data) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify(data)
  });
}

export async function getCurrentUser(token) {
  return request("/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function logoutUser(token) {
  return request("/auth/logout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function getProjects(token) {
  return request("/projects", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function createProject(token, data) {
  return request("/projects", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
}

export async function getProjectIssues(token, projectId, filters = {}) {
  const query = new URLSearchParams(
    Object.entries(filters).filter(([, value]) => value)
  );
  const suffix = query.toString() ? `?${query.toString()}` : "";

  return request(`/projects/${projectId}/issues${suffix}`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function createIssue(token, projectId, data) {
  return request(`/projects/${projectId}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
}

export async function updateIssueStatus(token, issueId, status) {
  return request(`/issues/${issueId}/status`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ status })
  });
}

export async function updateIssuePriority(token, issueId, priority) {
  return request(`/issues/${issueId}/priority`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ priority })
  });
}

export async function deleteIssue(token, issueId) {
  return request(`/issues/${issueId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function getIssueComments(token, issueId) {
  return request(`/issues/${issueId}/comments`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function addIssueComment(token, issueId, text) {
  return request(`/issues/${issueId}/comments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ text })
  });
}

export async function getIssueActivity(token, issueId) {
  return request(`/issues/${issueId}/activity`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function getProjectDashboard(token, projectId) {
  return request(`/projects/${projectId}/dashboard`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function getUsers(token) {
  return request("/users", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function addProjectMember(token, projectId, userId) {
  return request(`/projects/${projectId}/members`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ userId })
  });
}

export async function removeProjectMember(token, projectId, userId) {
  return request(`/projects/${projectId}/members/${userId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}
