const KEY = "apaxpos_access_token";
const LEGACY_KEY = "restroprosaas_access_token";

export function setAccessToken(token) {
  if (token) {
    sessionStorage.setItem(KEY, token);
    sessionStorage.removeItem(LEGACY_KEY);
  } else {
    sessionStorage.removeItem(KEY);
    sessionStorage.removeItem(LEGACY_KEY);
  }
}

export function getAccessToken() {
  return sessionStorage.getItem(KEY) || sessionStorage.getItem(LEGACY_KEY);
}

export function clearAccessToken() {
  sessionStorage.removeItem(KEY);
  sessionStorage.removeItem(LEGACY_KEY);
}
