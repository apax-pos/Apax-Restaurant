const { CONFIG } = require("../config");

const isProd = process.env.NODE_ENV === "production";

/** Shared cookie options for auth tokens (cross-subdomain SPA in production). */
function authCookieOptions(maxAgeMs) {
  return {
    expires: new Date(Date.now() + Number(maxAgeMs)),
    httpOnly: true,
    domain: CONFIG.FRONTEND_DOMAIN_COOKIE,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    path: "/",
  };
}

function clearAuthCookieOptions() {
  return {
    expires: new Date(0),
    httpOnly: true,
    domain: CONFIG.FRONTEND_DOMAIN_COOKIE,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    path: "/",
  };
}

/** Non-httpOnly flag cookie for SPA routing only. */
function clientAuthFlagOptions(maxAgeMs) {
  return {
    expires: new Date(Date.now() + Number(maxAgeMs)),
    httpOnly: false,
    domain: CONFIG.FRONTEND_DOMAIN_COOKIE,
    sameSite: isProd ? "none" : "lax",
    secure: isProd,
    path: "/",
  };
}

module.exports = {
  authCookieOptions,
  clearAuthCookieOptions,
  clientAuthFlagOptions,
};
