const API_BASE_URL = "http://YOUR_BACKEND_IP:PORT/api";

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.json();
}

export const api = {
  post: (path, body) => apiRequest(path, { method: "POST", body: JSON.stringify(body) }),
  get: (path) => apiRequest(path),
  patch: (path, body) => apiRequest(path, { method: "PATCH", body: JSON.stringify(body) }),
};
