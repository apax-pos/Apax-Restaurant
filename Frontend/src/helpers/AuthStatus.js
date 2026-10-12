function hasAuthFlagCookie(name) {
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]*)`)
  );
  if (!match) return false;
  const val = decodeURIComponent(match[1].trim()).toLowerCase();
  return val === "true" || val === "1";
}

export function isUserAuthenticated() {
  return (
    hasAuthFlagCookie("apaxpos__authenticated") ||
    hasAuthFlagCookie("restroprosaas__authenticated")
  );
}