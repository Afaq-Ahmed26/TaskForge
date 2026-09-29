const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export async function getHealth() {
  const response = await fetch(`${apiUrl}/health`);

  if (!response.ok) {
    throw new Error("TaskForge API is unavailable");
  }

  return response.json();
}

