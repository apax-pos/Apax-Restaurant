/** Read a cookie value from a raw Cookie request header. */
function parseCookieHeader(header, name) {
  if (!header || !name) return null;
  const parts = String(header).split(";");
  for (const part of parts) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) {
      try {
        return decodeURIComponent(rest.join("="));
      } catch {
        return rest.join("=");
      }
    }
  }
  return null;
}

module.exports = { parseCookieHeader };
