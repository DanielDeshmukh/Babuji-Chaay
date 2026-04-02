const FALLBACK_SITE_URL = (import.meta.env.VITE_SITE_URL || "").replace(/\/$/, "");
const DEFAULT_REDIRECT_PATH = import.meta.env.VITE_AUTH_REDIRECT_PATH || "/splashscreen";

const WEB_PROTOCOLS = new Set(["http:", "https:"]);

const normalizeBaseUrl = (value) => value.replace(/\/$/, "");

const isUsableBrowserOrigin = (origin) => {
  if (!origin || origin === "null" || origin.startsWith("chrome-error://")) {
    return false;
  }

  try {
    const parsed = new URL(origin);
    return WEB_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
};

export const getBrowserSafeOrigin = () => {
  if (typeof window !== "undefined" && isUsableBrowserOrigin(window.location.origin)) {
    return normalizeBaseUrl(window.location.origin);
  }

  if (FALLBACK_SITE_URL) {
    return normalizeBaseUrl(FALLBACK_SITE_URL);
  }

  return "";
};

export const getAuthRedirectUrl = (path = DEFAULT_REDIRECT_PATH) => {
  const origin = getBrowserSafeOrigin();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return origin ? `${origin}${normalizedPath}` : normalizedPath;
};
