const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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
