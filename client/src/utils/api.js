const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

async function readResponse(response) {
  const result =
    response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      `${result?.message || `Request failed with status ${response.status}.`}`
    );
    error.status = response.status;
    throw error;
  }
  return result;
}

async function csrfToken() {
  const response = await fetch(`${apiBaseUrl}/auth/csrf`, {
    credentials: "include",
  });
  const result = await readResponse(response);
  return result.csrfToken;
}

async function request(path, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = { ...options.headers };
  if (method !== "GET" && method !== "HEAD") {
    headers["X-CSRF-Token"] = await csrfToken();
  }
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    method,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
  });
  if (response.status === 401 && !path.startsWith("/auth/")) {
    window.dispatchEvent(new Event("auth:expired"));
  }
  return readResponse(response);
}

export const api = {
  getCurrentUser: () => request("/auth/me"),
  register: (details) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(details) }),
  login: (details) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(details) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  sendFeedback: (feedback) =>
    request("/feedback", { method: "POST", body: JSON.stringify(feedback) }),
  getCollection: (collection) => request(`/${collection}`),
  create: (collection, record) =>
    request(`/${collection}`, { method: "POST", body: JSON.stringify(record) }),
  update: (collection, id, record) =>
    request(`/${collection}/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(record),
    }),
  remove: (collection, id) =>
    request(`/${collection}/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
