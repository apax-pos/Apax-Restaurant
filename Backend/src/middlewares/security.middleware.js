const isProd = process.env.NODE_ENV === "production";

/** Security headers (helmet-lite, no extra dependency). */
function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );
  if (isProd) {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }
  next();
}

/** Do not leak stack traces in production API responses. */
function safeErrorHandler(err, req, res, next) {
  console.error("GLOBAL ERROR HANDLER:", err);
  const status = err.status || err.statusCode || 500;
  const message = isProd
    ? status < 500
      ? err.message || "Request failed"
      : "Internal Server Error"
    : err.message || "Internal Server Error";
  res.status(status).json({
    success: false,
    error: message,
  });
}

module.exports = { securityHeaders, safeErrorHandler };
