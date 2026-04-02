import supabase from "@/lib/supabaseClient";

const rawApiBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE || "";
const API_BASE_URL = rawApiBase.replace(/\/$/, "");

const buildUrl = (path, params) => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${normalizedPath}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
};

const getAccessToken = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
};

export const apiRequest = async (
  path,
  { method = "GET", params, body, headers = {}, auth = true, responseType = "json" } = {}
) => {
  const token = auth ? await getAccessToken() : null;
  const finalHeaders = { ...headers };

  if (auth && token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  let payload = body;
  if (body && !(body instanceof FormData) && typeof body !== "string") {
    payload = JSON.stringify(body);
    finalHeaders["Content-Type"] = "application/json";
  }

  const response = await fetch(buildUrl(path, params), {
    method,
    credentials: "include",
    headers: finalHeaders,
    body: payload,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const errorJson = await response.json();
      message = errorJson?.message || errorJson?.error || message;
    } catch {
      const text = await response.text();
      if (text) message = text;
    }
    throw new Error(message);
  }

  if (responseType === "blob") return response.blob();
  if (responseType === "text") return response.text();
  if (responseType === "none") return null;
  return response.json();
};

export const syncBackendSession = async () => {
  const token = await getAccessToken();
  if (!token) return;

  await apiRequest("/auth/session", {
    method: "POST",
    auth: false,
    body: { access_token: token },
    headers: { Authorization: `Bearer ${token}` },
    responseType: "none",
  });
};

export const openAuthenticatedUrl = async (pathWithParams) => {
  const token = await getAccessToken();
  if (!token) throw new Error("Session expired. Please log in again.");

  const hasQuery = pathWithParams.includes("?");
  const url = `${buildUrl(pathWithParams)}${hasQuery ? "&" : "?"}token=${encodeURIComponent(token)}`;
  window.open(url, "_blank");
};

export const getTransactions = (params) => apiRequest("/api/transactions", { params });
export const createTransaction = (payload) =>
  apiRequest("/api/transactions", { method: "POST", body: payload });
export const getReports = (params) => apiRequest("/api/reports/generate", { params });
export const downloadSalesExport = (params) =>
  apiRequest("/api/exports/sales", { params, responseType: "blob" });

export { API_BASE_URL };
