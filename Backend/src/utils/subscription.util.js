/** Normalize datetime from DB or API for storage/comparison. */
function normalizeSubscriptionDatetime(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 19).replace("T", " ");
  }
  let s = String(value).trim();
  if (!s) return null;
  if (s.includes("T") || s.includes("Z")) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString().slice(0, 19).replace("T", " ");
    }
  }
  s = s.replace("T", " ").slice(0, 19);
  if (s.length === 16) {
    s += ":00";
  }
  return s;
}

function parseSubscriptionEnd(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  if (raw.includes("Z") || /[+-]\d{2}:?\d{2}$/.test(raw)) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const norm = normalizeSubscriptionDatetime(value);
  if (!norm) return null;
  const d = new Date(norm.replace(" ", "T"));
  if (!Number.isNaN(d.getTime())) {
    return d;
  }
  const day = norm.slice(0, 10);
  const parts = day.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
    return null;
  }
  return new Date(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999);
}

/** True if license end is now or in the future (wall-clock / stored instant). */
function isSubscriptionEndValid(value) {
  const d = parseSubscriptionEnd(value);
  if (!d) return false;
  return d.getTime() >= Date.now();
}

/** Format API datetime-local for SQLite TEXT (wall-clock, no UTC shift). */
function normDateForStorage(v) {
  if (v === undefined || v === null || v === "") return null;
  if (v instanceof Date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())} ${pad(
      v.getHours()
    )}:${pad(v.getMinutes())}:${pad(v.getSeconds())}`;
  }
  let s = String(v).trim();
  if (!s) return null;
  s = s.replace("T", " ").slice(0, 19);
  if (s.length === 16) {
    s += ":00";
  }
  return s;
}

/** SQLite uses UTC for date('now'); use localtime for calendar-day checks. */
const SQL_TODAY = "date('now', 'localtime')";

module.exports = {
  normalizeSubscriptionDatetime,
  parseSubscriptionEnd,
  isSubscriptionEndValid,
  normDateForStorage,
  SQL_TODAY,
};
