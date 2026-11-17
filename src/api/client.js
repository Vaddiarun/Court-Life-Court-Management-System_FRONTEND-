// Thin fetch wrapper around the Court Life FastAPI backend.
// - attaches the access token
// - transparently refreshes it once on 401
// - turns FastAPI error payloads into readable messages

// Same-origin "/api/v1" in development (Vite proxy). When the frontend is deployed
// separately from the backend, set VITE_API_URL at build time, e.g.
//   VITE_API_URL=https://api.courtlife.in npm run build
const API_ORIGIN = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const API = `${API_ORIGIN}/api/v1`;
const STORE_KEY = "courtlife.tokens";

export class ApiError extends Error {
  constructor(status, message, detail) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

export const tokens = {
  get() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || null;
    } catch {
      return null;
    }
  },
  set(t) {
    localStorage.setItem(STORE_KEY, JSON.stringify(t));
  },
  clear() {
    localStorage.removeItem(STORE_KEY);
  },
};

function messageFrom(detail, fallback) {
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        const field = (d.loc || []).filter((p) => p !== "body" && p !== "query").join(".");
        return field ? `${field}: ${d.msg}` : d.msg;
      })
      .join("; ");
  }
  if (typeof detail === "object") return detail.message || JSON.stringify(detail);
  return fallback;
}

let refreshing = null;

async function refreshAccess() {
  const t = tokens.get();
  if (!t?.refresh_token) return false;
  refreshing ||= fetch(`${API}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: t.refresh_token }),
  })
    .then(async (r) => {
      if (!r.ok) return false;
      const data = await r.json();
      tokens.set({ access_token: data.access_token, refresh_token: data.refresh_token });
      return true;
    })
    .catch(() => false)
    .finally(() => setTimeout(() => (refreshing = null), 0));
  return refreshing;
}

function buildUrl(path, params) {
  const url = new URL(API + path, window.location.origin);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
  });
  return API_ORIGIN ? url.toString() : url.pathname + url.search;
}

export async function request(method, path, { body, params, form, raw, auth = true, retry = true } = {}) {
  const headers = {};
  const t = tokens.get();
  if (auth && t?.access_token) headers.Authorization = `Bearer ${t.access_token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(buildUrl(path, params), { method, headers, body: payload });

  if (res.status === 401 && auth && retry && t?.refresh_token) {
    if (await refreshAccess()) return request(method, path, { body, params, form, raw, auth, retry: false });
    tokens.clear();
    window.dispatchEvent(new Event("courtlife:logout"));
  }
  if (raw && res.ok) return res;
  if (res.status === 204) return null;
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const detail = data?.detail ?? data;
    throw new ApiError(res.status, messageFrom(detail, `Request failed (${res.status})`), detail);
  }
  return data;
}

export const get = (p, params) => request("GET", p, { params });
export const post = (p, body, params) => request("POST", p, { body, params });
export const patch = (p, body) => request("PATCH", p, { body });
export const del = (p) => request("DELETE", p);

export async function download(path, filename) {
  const res = await request("GET", path, { raw: true });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
