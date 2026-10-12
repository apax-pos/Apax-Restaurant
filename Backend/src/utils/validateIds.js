/** Coerce request body order id lists to safe positive integers for SQL IN (...). */
function toSafeIdList(ids) {
  if (!Array.isArray(ids)) return null;
  const out = [];
  for (const raw of ids) {
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 1) return null;
    out.push(n);
  }
  return out.length ? out : null;
}

module.exports = { toSafeIdList };
