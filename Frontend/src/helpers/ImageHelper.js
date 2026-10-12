import { API, API_IMAGES_BASE_URL } from "../config/config";

function getImagesBaseUrl() {
  const configured = (API_IMAGES_BASE_URL || "").trim().replace(/\/$/, "");
  if (configured) {
    return configured;
  }
  const api = (API || "").trim().replace(/\/$/, "");
  if (api) {
    return api.replace(/\/api\/v1$/i, "");
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}

/**
 * Build a full URL for menu/store images stored as `/public/{tenantId}/...` in the DB.
 */
export function getImageURL(path) {
  if (path == null || path === "") {
    return "";
  }

  let p = String(path).trim();
  if (!p) {
    return "";
  }

  if (/^https?:\/\//i.test(p)) {
    return p;
  }

  const base = getImagesBaseUrl();
  if (!base) {
    return p;
  }

  if (!p.startsWith("/")) {
    p = p.startsWith("public/") ? `/${p}` : `/public/${p}`;
  }

  return `${base}${p}`;
}
