const { CONFIG } = require("../config");

const WEAK_SECRETS = new Set([
  "restro_jwt_secret",
  "apax_jwt_secret",
  "change_me",
  "secret",
  "jwt_secret",
]);

function validateSecurityConfig() {
  const isProd = process.env.NODE_ENV === "production";
  const errors = [];

  if (!CONFIG.JWT_SECRET || CONFIG.JWT_SECRET.length < 32) {
    errors.push("JWT_SECRET must be at least 32 characters.");
  } else if (WEAK_SECRETS.has(String(CONFIG.JWT_SECRET).toLowerCase())) {
    errors.push("JWT_SECRET is a known weak default — generate a random secret.");
  }

  if (!CONFIG.ENCRYPTION_KEY || String(CONFIG.ENCRYPTION_KEY).length < 16) {
    errors.push("ENCRYPTION_KEY must be set (min 16 characters).");
  }

  if (isProd && !CONFIG.FRONTEND_DOMAIN) {
    errors.push("FRONTEND_DOMAIN is required in production.");
  }

  if (errors.length) {
    for (const msg of errors) {
      console.error(`[security] ${msg}`);
    }
    // Hard-fail only when explicitly enabled (avoids taking down IIS after deploy)
    if (isProd && process.env.SECURITY_STRICT_STARTUP === "1") {
      throw new Error(
        "Security configuration invalid. Fix .env or unset SECURITY_STRICT_STARTUP."
      );
    }
    console.warn(
      "[security] Server will start anyway — set strong JWT_SECRET/ENCRYPTION_KEY and SECURITY_STRICT_STARTUP=1 when ready."
    );
  }
}

module.exports = { validateSecurityConfig };
